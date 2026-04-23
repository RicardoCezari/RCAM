const AppError = require('../utils/AppError');
const servicosRepository = require('../repositories/servicosRepository');

async function listar({ ativo } = {}) {
  const ativoFiltro = ativo === undefined ? undefined : (ativo === 'true' || ativo === true);
  return servicosRepository.listar({ ativoFiltro });
}

async function buscarPorId(id) {
  const servico = await servicosRepository.buscarPorId(id);
  if (!servico) throw AppError.notFound('Serviço não encontrado');
  return servico;
}

async function criar({ nome, valor, descricao, ativo = true }) {
  return servicosRepository.criar({ nome, valor, descricao, ativo });
}

async function atualizar(id, { nome, valor, descricao, ativo }) {
  await buscarPorId(id);
  return servicosRepository.atualizar(id, { nome, valor, descricao, ativo });
}

async function deletar(id) {
  await buscarPorId(id);

  const temItens = await servicosRepository.possuiItens(id);
  if (temItens) {
    const servico = await servicosRepository.desativar(id);
    return { ...servico, _softDeleted: true };
  }

  await servicosRepository.deletar(id);
  return null;
}

module.exports = { listar, buscarPorId, criar, atualizar, deletar };
