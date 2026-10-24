/*
 * Backup do sistema (banco + fotos) em uma pasta do PC.
 *
 * Estrutura dentro de BACKUP_DIR:
 *   banco/<empresa>_AAAA-MM-DD_HHmmss.sql   dump completo do PostgreSQL (um por backup);
 *                                        <empresa> vem do nome da empresa cadastrada (ou do nome do banco)
 *   fotos/...                            espelho das fotos e da logo (copia só o que é novo)
 *   ultimo-backup.json                   resultado do último backup (sucesso ou erro)
 *
 * Variáveis (.env): BACKUP_DIR, BACKUP_RETENCAO, BACKUP_AUTOMATICO, BACKUP_HORARIO, PG_DUMP_PATH.
 * Para enviar ao S3 no futuro, implemente `enviarParaNuvem` (ponto de extensão no fim de `executar`).
 */
const fs = require('fs/promises');
const fsSync = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const AppError = require('../utils/AppError');
const configuracoes = require('../repositories/configuracoesRepository');
const { UPLOAD_DIR } = require('./storageService');

const BACKUP_DIR = process.env.BACKUP_DIR
  ? path.resolve(process.env.BACKUP_DIR)
  : path.resolve(__dirname, '../../backups');
const PASTA_BANCO = path.join(BACKUP_DIR, 'banco');
const PASTA_FOTOS = path.join(BACKUP_DIR, 'fotos');
const ARQUIVO_STATUS = path.join(BACKUP_DIR, 'ultimo-backup.json');
const RETENCAO = Math.max(1, parseInt(process.env.BACKUP_RETENCAO, 10) || 14);
// <prefixo>_AAAA-MM-DD_HHmmss.sql; o prefixo muda se a empresa trocar de nome, então a ordem usa só a data
const NOME_DUMP = /^[a-z0-9][a-z0-9-]*_\d{4}-\d{2}-\d{2}_\d{6}\.sql$/;
const chaveDeOrdem = (nome) => nome.slice(-21, -4);
const maisRecentePrimeiro = (a, b) => chaveDeOrdem(b).localeCompare(chaveDeOrdem(a));

// Nome da empresa (ou do banco) em formato seguro para nome de arquivo: "Ateliê do João" -> "atelie-do-joao"
function slug(texto) {
  return String(texto || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/, '');
}

async function prefixoDoBackup() {
  const empresa = await configuracoes.buscar('empresa_nome').catch(() => null);
  return slug(empresa) || slug(process.env.DB_NAME) || 'backup';
}

let emAndamento = false;

function localizarPgDump() {
  if (process.env.PG_DUMP_PATH) return process.env.PG_DUMP_PATH;
  if (process.platform === 'win32') {
    const base = path.join(process.env.ProgramFiles || 'C:\\Program Files', 'PostgreSQL');
    try {
      const versoes = fsSync.readdirSync(base).sort((a, b) => Number(b) - Number(a));
      for (const v of versoes) {
        const exe = path.join(base, v, 'bin', 'pg_dump.exe');
        if (fsSync.existsSync(exe)) return exe;
      }
    } catch {
      // pasta inexistente: usa o PATH
    }
  }
  return 'pg_dump';
}

function carimbo(data = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${data.getFullYear()}-${p(data.getMonth() + 1)}-${p(data.getDate())}_${p(data.getHours())}${p(data.getMinutes())}${p(data.getSeconds())}`;
}

function gerarDump(destino) {
  return new Promise((resolve, reject) => {
    const args = [
      '-h', process.env.DB_HOST || 'localhost',
      '-p', String(process.env.DB_PORT || 5432),
      '-U', process.env.DB_USER || 'postgres',
      '-d', process.env.DB_NAME,
      '--no-owner', '--no-privileges', '-f', destino,
    ];
    const proc = spawn(localizarPgDump(), args, {
      env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD },
      windowsHide: true,
    });

    let erro = '';
    proc.stderr.on('data', (d) => { erro += d.toString(); });
    proc.on('error', (err) => {
      reject(new Error(
        err.code === 'ENOENT'
          ? 'pg_dump não encontrado. Instale o PostgreSQL client ou defina PG_DUMP_PATH no .env.'
          : err.message
      ));
    });
    proc.on('close', (codigo) => {
      if (codigo === 0) resolve();
      else reject(new Error(`pg_dump falhou (código ${codigo}): ${erro.trim().slice(0, 300)}`));
    });
  });
}

// Copia para `destino` apenas arquivos novos ou alterados
async function espelhar(origem, destino) {
  let copiados = 0;
  let entradas;
  try {
    entradas = await fs.readdir(origem, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT') return 0;
    throw err;
  }

  await fs.mkdir(destino, { recursive: true });
  for (const entrada of entradas) {
    const de = path.join(origem, entrada.name);
    const para = path.join(destino, entrada.name);

    if (entrada.isDirectory()) {
      copiados += await espelhar(de, para);
    } else if (entrada.isFile()) {
      const [a, b] = await Promise.all([fs.stat(de), fs.stat(para).catch(() => null)]);
      if (!b || b.size !== a.size || b.mtimeMs < a.mtimeMs) {
        await fs.copyFile(de, para);
        copiados += 1;
      }
    }
  }
  return copiados;
}

async function aplicarRetencao() {
  const dumps = (await fs.readdir(PASTA_BANCO)).filter((n) => NOME_DUMP.test(n)).sort(maisRecentePrimeiro);
  for (const antigo of dumps.slice(RETENCAO)) {
    await fs.unlink(path.join(PASTA_BANCO, antigo)).catch(() => {});
  }
}

async function lerStatus() {
  try {
    return JSON.parse(await fs.readFile(ARQUIVO_STATUS, 'utf8'));
  } catch {
    return null;
  }
}

async function gravarStatus(status) {
  await fs.mkdir(BACKUP_DIR, { recursive: true });
  await fs.writeFile(ARQUIVO_STATUS, JSON.stringify(status, null, 2));
}

async function executar(origem = 'manual') {
  if (emAndamento) throw new AppError('Já existe um backup em andamento.', 409);
  emAndamento = true;

  const inicio = new Date();
  try {
    await fs.mkdir(PASTA_BANCO, { recursive: true });

    const nome = `${await prefixoDoBackup()}_${carimbo(inicio)}.sql`;
    const arquivo = path.join(PASTA_BANCO, nome);
    try {
      await gerarDump(arquivo);
    } catch (err) {
      await fs.unlink(arquivo).catch(() => {});
      throw err;
    }

    // Com S3 as fotos ficam no bucket (use versionamento/replicação do próprio bucket); aqui só o banco
    const fotosCopiadas = UPLOAD_DIR ? await espelhar(UPLOAD_DIR, PASTA_FOTOS) : 0;
    await aplicarRetencao();
    // Ponto de extensão: enviarParaNuvem(arquivo) quando o S3 for configurado.

    const { size } = await fs.stat(arquivo);
    const status = {
      sucesso: true,
      origem,
      arquivo: nome,
      tamanho: size,
      fotos_copiadas: fotosCopiadas,
      iniciado_em: inicio.toISOString(),
      concluido_em: new Date().toISOString(),
    };
    await gravarStatus(status);
    return status;
  } catch (err) {
    await gravarStatus({
      sucesso: false,
      origem,
      erro: err.message,
      iniciado_em: inicio.toISOString(),
      concluido_em: new Date().toISOString(),
    }).catch(() => {});
    throw err instanceof AppError ? err : new AppError(`Falha no backup: ${err.message}`, 500);
  } finally {
    emAndamento = false;
  }
}

async function listar() {
  let nomes = [];
  try {
    nomes = (await fs.readdir(PASTA_BANCO)).filter((n) => NOME_DUMP.test(n));
  } catch {
    // ainda não há backups
  }

  const backups = await Promise.all(
    nomes.sort(maisRecentePrimeiro).map(async (nome) => {
      const { size, mtime } = await fs.stat(path.join(PASTA_BANCO, nome));
      return { nome, tamanho: size, data: mtime.toISOString() };
    })
  );

  return {
    pasta: BACKUP_DIR,
    retencao: RETENCAO,
    automatico: automatico(),
    horario: horario(),
    em_andamento: emAndamento,
    ultimo: await lerStatus(),
    backups,
  };
}

function caminhoDoBackup(nome) {
  if (!NOME_DUMP.test(nome)) throw new AppError('Backup não encontrado.', 404);
  const caminho = path.join(PASTA_BANCO, nome);
  if (!fsSync.existsSync(caminho)) throw new AppError('Backup não encontrado.', 404);
  return caminho;
}

// ── agendamento automático ───────────────────────────────────────────────
const automatico = () => process.env.BACKUP_AUTOMATICO !== 'false';
const horario = () => (/^\d{1,2}:\d{2}$/.test(process.env.BACKUP_HORARIO || '') ? process.env.BACKUP_HORARIO : '22:00');

function msAteProximaExecucao() {
  const [h, m] = horario().split(':').map(Number);
  const alvo = new Date();
  alvo.setHours(h, m, 0, 0);
  if (alvo <= new Date()) alvo.setDate(alvo.getDate() + 1);
  return alvo - new Date();
}

function agendar() {
  const timer = setTimeout(async () => {
    try {
      await executar('automatico');
      console.log('[BACKUP] Backup automático concluído.');
    } catch (err) {
      console.error('[BACKUP] Falha no backup automático:', err.message);
    }
    agendar();
  }, msAteProximaExecucao());
  timer.unref();
}

async function iniciarAgendador() {
  if (!automatico()) {
    console.log('[BACKUP] Backup automático desativado (BACKUP_AUTOMATICO=false).');
    return;
  }
  agendar();
  console.log(`[BACKUP] Backup automático diário às ${horario()} em ${BACKUP_DIR}`);

  // Se o PC ficou desligado no horário, faz um backup assim que o sistema sobe
  const ultimo = await lerStatus();
  const idade = ultimo?.sucesso ? Date.now() - new Date(ultimo.concluido_em).getTime() : Infinity;
  if (idade > 24 * 60 * 60 * 1000) {
    setTimeout(() => {
      executar('automatico').catch((err) => console.error('[BACKUP] Falha no backup inicial:', err.message));
    }, 60 * 1000).unref();
  }
}

module.exports = { executar, listar, caminhoDoBackup, iniciarAgendador, slug, prefixoDoBackup };
