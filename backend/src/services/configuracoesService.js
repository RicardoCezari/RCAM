const AppError = require('../utils/AppError');
const repository = require('../repositories/configuracoesRepository');
const storage = require('./storageService');

async function obter() {
  const config = await repository.listar();
  return { empresa_nome: config.empresa_nome || '', logo_url: config.logo_url || null };
}

async function atualizar({ empresa_nome }) {
  const nome = String(empresa_nome ?? '').trim();
  if (nome) await repository.salvar('empresa_nome', nome);
  else await repository.remover('empresa_nome');
  return obter();
}

async function trocarLogo(arquivo) {
  if (!arquivo) throw AppError.badRequest('Envie a imagem da logo');

  const anterior = await repository.buscar('logo_url');
  const url = await storage.salvar(arquivo.buffer, arquivo.mimetype, 'logo');
  await repository.salvar('logo_url', url);
  await storage.remover(anterior);
  return obter();
}

async function removerLogo() {
  const anterior = await repository.buscar('logo_url');
  await repository.remover('logo_url');
  await storage.remover(anterior);
  return obter();
}

module.exports = { obter, atualizar, trocarLogo, removerLogo };
