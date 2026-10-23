/*
 * Armazenamento de arquivos (fotos e logo).
 * Driver local: grava em backend/uploads e serve em /uploads.
 * Para usar S3 (ou outra nuvem), basta reimplementar `salvar` e `remover`
 * mantendo a assinatura: `salvar` devolve a URL pública do arquivo.
 */
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const UPLOAD_DIR = path.resolve(__dirname, '../../uploads');
const URL_BASE = '/uploads';

const EXTENSOES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

async function salvar(buffer, mimetype, pasta = 'fotos') {
  const extensao = EXTENSOES[mimetype];
  if (!extensao) throw new Error('Tipo de arquivo não suportado');

  const nome = `${crypto.randomUUID()}${extensao}`;
  const destino = path.join(UPLOAD_DIR, pasta);

  await fs.mkdir(destino, { recursive: true });
  await fs.writeFile(path.join(destino, nome), buffer);

  return `${URL_BASE}/${pasta}/${nome}`;
}

async function remover(url) {
  if (!url || !url.startsWith(`${URL_BASE}/`)) return;

  const caminho = path.resolve(UPLOAD_DIR, url.slice(URL_BASE.length + 1));
  if (!caminho.startsWith(UPLOAD_DIR + path.sep)) return; // impede path traversal

  await fs.unlink(caminho).catch(() => {});
}

module.exports = { UPLOAD_DIR, salvar, remover, EXTENSOES };
