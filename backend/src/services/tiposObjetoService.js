const AppError = require('../utils/AppError');
const tiposObjetoRepository = require('../repositories/tiposObjetoRepository');

async function listar() {
  return tiposObjetoRepository.listar();
}

async function buscarPorId(id) {
  const tipo = await tiposObjetoRepository.buscarPorId(id);
  if (!tipo) throw AppError.notFound('Tipo de objeto não encontrado');
  return tipo;
}

async function criar({ nome, descricao }) {
  return tiposObjetoRepository.criar({ nome, descricao });
}

async function atualizar(id, { nome, descricao }) {
  await buscarPorId(id);
  return tiposObjetoRepository.atualizar(id, { nome, descricao });
}

async function deletar(id) {
  await buscarPorId(id);

  const temItens = await tiposObjetoRepository.possuiItens(id);
  if (temItens) {
    throw AppError.conflict('Tipo de objeto está vinculado a itens e não pode ser excluído');
  }

  await tiposObjetoRepository.deletar(id);
}

module.exports = { listar, buscarPorId, criar, atualizar, deletar };
