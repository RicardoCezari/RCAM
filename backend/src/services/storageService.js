/*
 * Armazenamento de arquivos (fotos e logo) com dois drivers que convivem:
 *
 *  - local (STORAGE_DRIVER=local, padrão): grava em UPLOADS_DIR (padrão backend/uploads) e a API serve em /uploads.
 *  - s3 (STORAGE_DRIVER=s3): grava em um bucket S3 PRIVADO (ou compatível: MinIO, R2, Backblaze via S3_ENDPOINT).
 *    A API continua respondendo em /uploads/<pasta>/<arquivo>, mas redireciona (302) para uma URL assinada
 *    de curta duração; o bucket nunca fica público.
 *
 * Em ambos os casos o que vai para o banco é o mesmo valor ("/uploads/<pasta>/<arquivo>"), então trocar de
 * driver não exige alterar registros: basta copiar os arquivos (scripts/migrar-uploads-s3.js).
 *
 * Variáveis S3: S3_BUCKET (obrigatória), S3_REGION (padrão AWS_REGION ou us-east-1), S3_PREFIX (opcional),
 * S3_ENDPOINT e S3_FORCE_PATH_STYLE=true (só para S3 compatível), S3_URL_EXPIRA_SEG (padrão 300),
 * S3_SSE (ex.: AES256 ou aws:kms). Credenciais: cadeia padrão da AWS (função IAM da instância/contêiner;
 * AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY apenas se não houver função).
 */
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const AppError = require('../utils/AppError');
const { detectarTipoImagem } = require('../utils/tipoImagem');

const URL_BASE = '/uploads';
const EXTENSOES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

// "pasta/arquivo.ext" (um ou mais níveis), sem "..", sem barras duplas, sem caracteres especiais
const CHAVE_VALIDA = /^([A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.[A-Za-z0-9]{2,5}$/;

function chaveDaUrl(url) {
  if (typeof url !== 'string' || !url.startsWith(`${URL_BASE}/`)) return null;
  const chave = url.slice(URL_BASE.length + 1);
  return CHAVE_VALIDA.test(chave) ? chave : null;
}

// ─── Driver local ────────────────────────────────────
function criarDriverLocal(dirUploads) {
  const dir = dirUploads ? path.resolve(dirUploads) : path.resolve(__dirname, '../../uploads');
  return {
    tipo: 'local',
    dir,
    async gravar(chave, buffer) {
      const destino = path.join(dir, path.dirname(chave));
      await fs.mkdir(destino, { recursive: true });
      await fs.writeFile(path.join(dir, chave), buffer);
    },
    async apagar(chave) {
      const caminho = path.resolve(dir, chave);
      if (!caminho.startsWith(dir + path.sep)) return; // defesa extra contra path traversal
      await fs.unlink(caminho).catch(() => {});
    },
    middleware() {
      return express.static(dir, { maxAge: '7d', index: false });
    },
  };
}

// ─── Driver S3 ───────────────────────────────────────
// `cliente` e `assinar` são injetáveis (testes usam um cliente falso; produção usa o SDK da AWS).
function criarDriverS3(env, { cliente, assinar, comandos } = {}) {
  if (!env.S3_BUCKET) throw new Error('STORAGE_DRIVER=s3 exige S3_BUCKET');
  const bucket = env.S3_BUCKET;
  const prefixo = (env.S3_PREFIX || '').replace(/^\/+|\/+$/g, '');
  const expira = Math.min(Math.max(Number(env.S3_URL_EXPIRA_SEG) || 300, 30), 3600);

  let sdk;
  const carregar = () => {
    if (!sdk) {
      const s3 = require('@aws-sdk/client-s3');
      const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
      sdk = {
        PutObjectCommand: s3.PutObjectCommand,
        GetObjectCommand: s3.GetObjectCommand,
        DeleteObjectCommand: s3.DeleteObjectCommand,
        HeadObjectCommand: s3.HeadObjectCommand,
        getSignedUrl,
        cliente: new s3.S3Client({
          region: env.S3_REGION || env.AWS_REGION || 'us-east-1',
          ...(env.S3_ENDPOINT ? { endpoint: env.S3_ENDPOINT, forcePathStyle: env.S3_FORCE_PATH_STYLE === 'true' } : {}),
        }),
      };
    }
    return sdk;
  };
  const usar = () => {
    const s = carregar();
    return {
      c: cliente || s.cliente,
      Put: comandos?.Put || s.PutObjectCommand,
      Get: comandos?.Get || s.GetObjectCommand,
      Del: comandos?.Del || s.DeleteObjectCommand,
      Head: comandos?.Head || s.HeadObjectCommand,
      assinar: assinar || s.getSignedUrl,
    };
  };
  const chaveS3 = (chave) => (prefixo ? `${prefixo}/${chave}` : chave);

  return {
    tipo: 's3',
    bucket,
    prefixo,
    expira,
    async gravar(chave, buffer, mimetype) {
      const { c, Put } = usar();
      await c.send(new Put({
        Bucket: bucket,
        Key: chaveS3(chave),
        Body: buffer,
        ContentType: mimetype,
        CacheControl: 'private, max-age=31536000, immutable',
        ...(env.S3_SSE ? { ServerSideEncryption: env.S3_SSE } : {}),
      }));
    },
    async apagar(chave) {
      const { c, Del } = usar();
      await c.send(new Del({ Bucket: bucket, Key: chaveS3(chave) })).catch((err) => {
        console.error('[STORAGE] Falha ao remover do S3:', err.name || err.message);
      });
    },
    // Tamanho em bytes do objeto, ou null se não existir
    async tamanho(chave) {
      const { c, Head } = usar();
      try {
        const r = await c.send(new Head({ Bucket: bucket, Key: chaveS3(chave) }));
        return Number(r.ContentLength);
      } catch (err) {
        if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) return null;
        throw err;
      }
    },
    async urlAssinada(chave) {
      const { c, Get, assinar: sign } = usar();
      return sign(c, new Get({ Bucket: bucket, Key: chaveS3(chave) }), { expiresIn: expira });
    },
    middleware() {
      const roteador = express.Router();
      roteador.get('/*', async (req, res, next) => {
        const chave = chaveDaUrl(`${URL_BASE}${req.path}`);
        if (!chave) return res.status(404).json({ message: 'Arquivo não encontrado' });
        try {
          const url = await this.urlAssinada(chave);
          // O navegador pode reaproveitar o redirecionamento por um pouco menos que a validade da URL
          res.setHeader('Cache-Control', `private, max-age=${Math.max(0, expira - 60)}`);
          res.redirect(302, url);
        } catch (err) {
          next(err);
        }
      });
      return roteador;
    },
  };
}

function criarStorage(env = process.env, deps = {}) {
  const nome = (env.STORAGE_DRIVER || 'local').toLowerCase();
  if (nome !== 'local' && nome !== 's3') {
    throw new Error(`STORAGE_DRIVER "${nome}" inválido (disponíveis: local, s3)`);
  }
  const driver = nome === 's3' ? criarDriverS3(env, deps) : criarDriverLocal(env.UPLOADS_DIR);

  async function salvar(buffer, _mimetype, pasta = 'fotos') {
    // O conteúdo real decide o tipo e a extensão; o Content-Type enviado pelo cliente não é confiável
    const tipo = detectarTipoImagem(buffer);
    if (!tipo) throw AppError.badRequest('O arquivo não é uma imagem JPG, PNG ou WEBP válida');

    const chave = `${pasta}/${crypto.randomUUID()}${tipo.extensao}`;
    await driver.gravar(chave, buffer, tipo.mimetype);
    return `${URL_BASE}/${chave}`;
  }

  async function remover(url) {
    const chave = chaveDaUrl(url);
    if (chave) await driver.apagar(chave);
  }

  return {
    driver,
    DRIVER: driver.tipo,
    UPLOAD_DIR: driver.dir, // só existe no driver local
    URL_BASE,
    EXTENSOES,
    salvar,
    remover,
    middlewareUploads: () => driver.middleware(),
    criarStorage,
    chaveDaUrl,
  };
}

module.exports = criarStorage(process.env);
