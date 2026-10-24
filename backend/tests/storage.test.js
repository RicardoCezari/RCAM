/*
 * Armazenamento: driver S3 (com cliente falso, sem rede) e regras de chave/URL.
 * A assinatura de URL é testada com o SDK real, offline (credenciais falsas).
 */
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const express = require('express');

const dirLocal = fs.mkdtempSync(path.join(os.tmpdir(), 'storage-'));
after(() => fs.rmSync(dirLocal, { recursive: true, force: true }));

const { criarStorage, chaveDaUrl } = require('../src/services/storageService');

const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64, 1)]);
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32, 2)]);

class Cmd { constructor(input) { this.input = input; } }
class Put extends Cmd {}
class Get extends Cmd {}
class Del extends Cmd {}

function s3Falso(extraEnv = {}) {
  const enviados = [];
  const cliente = { send: async (c) => { enviados.push(c); return {}; } };
  const assinar = async (_c, cmd, { expiresIn }) => `https://bucket.s3.exemplo/${cmd.input.Key}?X-Amz-Expires=${expiresIn}&X-Amz-Signature=abc`;
  const storage = criarStorage(
    { STORAGE_DRIVER: 's3', S3_BUCKET: 'meu-bucket', ...extraEnv },
    { cliente, assinar, comandos: { Put, Get, Del } }
  );
  return { storage, enviados };
}

async function servir(storage) {
  const app = express();
  app.use('/uploads', storage.middlewareUploads());
  const server = await new Promise((r) => { const s = app.listen(0, () => r(s)); });
  return { base: `http://127.0.0.1:${server.address().port}`, fechar: () => new Promise((r) => server.close(r)) };
}

test('chaveDaUrl aceita só caminhos de /uploads sem traversal nem caracteres especiais', () => {
  assert.equal(chaveDaUrl('/uploads/fotos/abc-123.jpg'), 'fotos/abc-123.jpg');
  assert.equal(chaveDaUrl('/uploads/logo/x.png'), 'logo/x.png');
  assert.equal(chaveDaUrl('/uploads/geral.jpg'), 'geral.jpg');
  for (const ruim of ['/uploads/../segredo.jpg', '/uploads/fotos/../../x.jpg', 'https://evil.com/uploads/a.jpg', '/outra/a.jpg',
    '/uploads/fotos//a.jpg', '/uploads/fotos/a b.jpg', '/uploads/fotos/a.jpg?x=1', '/uploads/fotos/', '', null, undefined, 42]) {
    assert.equal(chaveDaUrl(ruim), null, `deveria recusar ${ruim}`);
  }
});

test('driver inválido ou S3 sem bucket impedem a inicialização', () => {
  assert.throws(() => criarStorage({ STORAGE_DRIVER: 'ftp' }), /inválido/);
  assert.throws(() => criarStorage({ STORAGE_DRIVER: 's3' }), /S3_BUCKET/);
  assert.equal(criarStorage({ STORAGE_DRIVER: 'LOCAL', UPLOADS_DIR: dirLocal }).DRIVER, 'local');
});

test('s3: salvar envia o objeto com tipo detectado, chave com prefixo e devolve a mesma URL do modo local', async () => {
  const { storage, enviados } = s3Falso({ S3_PREFIX: '/azteca/prod/', S3_SSE: 'AES256' });
  const url = await storage.salvar(PNG, 'image/jpeg', 'fotos'); // Content-Type mentiroso: vale o conteúdo
  assert.match(url, /^\/uploads\/fotos\/[0-9a-f-]{36}\.png$/);
  assert.equal(enviados.length, 1);
  const { input } = enviados[0];
  assert.ok(enviados[0] instanceof Put);
  assert.equal(input.Bucket, 'meu-bucket');
  assert.equal(input.Key, `azteca/prod/${url.slice('/uploads/'.length)}`);
  assert.equal(input.ContentType, 'image/png');
  assert.equal(input.ServerSideEncryption, 'AES256');
  assert.ok(input.Body.equals(PNG));
  assert.equal(storage.UPLOAD_DIR, undefined);
});

test('s3: arquivo falso é recusado sem enviar nada ao bucket', async () => {
  const { storage, enviados } = s3Falso();
  await assert.rejects(storage.salvar(Buffer.from('<html><script>alert(1)</script></html>'), 'image/jpeg'), /não é uma imagem/);
  assert.equal(enviados.length, 0);
});

test('s3: remover apaga pela chave e ignora URLs inválidas ou externas', async () => {
  const { storage, enviados } = s3Falso();
  await storage.remover('/uploads/fotos/a1.jpg');
  await storage.remover('/uploads/../x.jpg');
  await storage.remover('https://outro.com/uploads/fotos/a.jpg');
  await storage.remover(null);
  assert.equal(enviados.length, 1);
  assert.ok(enviados[0] instanceof Del);
  assert.equal(enviados[0].input.Key, 'fotos/a1.jpg');
});

test('s3: falha ao apagar no bucket não derruba a operação', async () => {
  const storage = criarStorage({ STORAGE_DRIVER: 's3', S3_BUCKET: 'b' }, {
    cliente: { send: async () => { throw Object.assign(new Error('boom'), { name: 'AccessDenied' }); } },
    assinar: async () => 'x', comandos: { Put, Get, Del },
  });
  await storage.remover('/uploads/fotos/a1.jpg'); // não lança
});

test('s3: /uploads/* redireciona para URL assinada de curta duração; caminhos inválidos dão 404', async () => {
  const { storage } = s3Falso({ S3_PREFIX: 'p', S3_URL_EXPIRA_SEG: '120' });
  const srv = await servir(storage);
  try {
    const r = await fetch(`${srv.base}/uploads/fotos/a1.jpg`, { redirect: 'manual' });
    assert.equal(r.status, 302);
    assert.equal(r.headers.get('location'), 'https://bucket.s3.exemplo/p/fotos/a1.jpg?X-Amz-Expires=120&X-Amz-Signature=abc');
    assert.equal(r.headers.get('cache-control'), 'private, max-age=60');

    for (const ruim of ['/uploads/fotos/..%2f..%2fsegredo.jpg', '/uploads/fotos/a.jpg%00', '/uploads/fotos/sem-extensao', '/uploads/']) {
      const x = await fetch(`${srv.base}${ruim}`, { redirect: 'manual' });
      assert.equal(x.status, 404, `${ruim} deveria ser 404`);
    }
  } finally {
    await srv.fechar();
  }
});

test('s3: validade da URL assinada fica entre 30 s e 1 h', () => {
  assert.equal(s3Falso({ S3_URL_EXPIRA_SEG: '5' }).storage.driver.expira, 30);
  assert.equal(s3Falso({ S3_URL_EXPIRA_SEG: '999999' }).storage.driver.expira, 3600);
  assert.equal(s3Falso().storage.driver.expira, 300);
});

test('s3: assinatura real do SDK (offline) gera URL privada com expiração', async () => {
  const antes = { id: process.env.AWS_ACCESS_KEY_ID, seg: process.env.AWS_SECRET_ACCESS_KEY };
  process.env.AWS_ACCESS_KEY_ID = 'AKIAFAKEFAKEFAKEFAKE';
  process.env.AWS_SECRET_ACCESS_KEY = 'fake-secret-fake-secret-fake-secret-1234';
  try {
    const storage = criarStorage({ STORAGE_DRIVER: 's3', S3_BUCKET: 'bucket-privado', S3_REGION: 'sa-east-1', S3_URL_EXPIRA_SEG: '300' });
    const url = new URL(await storage.driver.urlAssinada('fotos/a1.jpg'));
    assert.equal(url.protocol, 'https:');
    assert.match(url.hostname, /bucket-privado\.s3\.sa-east-1\.amazonaws\.com/);
    assert.equal(url.pathname, '/fotos/a1.jpg');
    assert.equal(url.searchParams.get('X-Amz-Expires'), '300');
    assert.ok(url.searchParams.get('X-Amz-Signature'));
    assert.match(url.searchParams.get('X-Amz-Credential'), /sa-east-1\/s3\/aws4_request$/);
  } finally {
    for (const [k, v] of [['AWS_ACCESS_KEY_ID', antes.id], ['AWS_SECRET_ACCESS_KEY', antes.seg]]) {
      if (v === undefined) delete process.env[k]; else process.env[k] = v;
    }
  }
});

test('s3: tamanho() lê o ContentLength e devolve null quando o objeto não existe', async () => {
  class Head extends Cmd {}
  const respostas = { 'fotos/ok.jpg': { ContentLength: 123 } };
  const cliente = {
    send: async (c) => {
      const r = respostas[c.input.Key];
      if (r) return r;
      throw Object.assign(new Error('nf'), { name: 'NotFound', $metadata: { httpStatusCode: 404 } });
    },
  };
  const s = criarStorage({ STORAGE_DRIVER: 's3', S3_BUCKET: 'b' }, { cliente, assinar: async () => 'x', comandos: { Put, Get, Del, Head } });
  assert.equal(await s.driver.tamanho('fotos/ok.jpg'), 123);
  assert.equal(await s.driver.tamanho('fotos/nao.jpg'), null);
  const erro = criarStorage({ STORAGE_DRIVER: 's3', S3_BUCKET: 'b' }, {
    cliente: { send: async () => { throw Object.assign(new Error('negado'), { name: 'AccessDenied', $metadata: { httpStatusCode: 403 } }); } },
    assinar: async () => 'x', comandos: { Put, Get, Del, Head },
  });
  await assert.rejects(erro.driver.tamanho('fotos/x.jpg'), /negado/);
});

test('local: mesma URL, arquivo gravado em disco e remoção segura', async () => {
  const storage = criarStorage({ STORAGE_DRIVER: 'local', UPLOADS_DIR: dirLocal });
  const url = await storage.salvar(JPEG, 'image/png', 'fotos');
  assert.match(url, /^\/uploads\/fotos\/[0-9a-f-]{36}\.jpg$/);
  const arquivo = path.join(dirLocal, url.slice('/uploads/'.length));
  assert.ok(fs.existsSync(arquivo));

  const srv = await servir(storage);
  try {
    const r = await fetch(`${srv.base}${url}`);
    assert.equal(r.status, 200);
    assert.equal(r.headers.get('content-type'), 'image/jpeg');
  } finally {
    await srv.fechar();
  }

  const fora = path.join(path.dirname(dirLocal), 'fora-' + path.basename(dirLocal) + '.jpg');
  fs.writeFileSync(fora, 'x');
  await storage.remover(`/uploads/../${path.basename(fora)}`);
  assert.ok(fs.existsSync(fora), 'não pode apagar fora da pasta de uploads');
  fs.unlinkSync(fora);

  await storage.remover(url);
  assert.ok(!fs.existsSync(arquivo));
});
