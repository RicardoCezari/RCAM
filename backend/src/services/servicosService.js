const AppError = require('../utils/AppError');
const servicosRepository = require('../repositories/servicosRepository');

async function listar({ ativo, tipoObjetoId } = {}) {
  const ativoFiltro = ativo === undefined ? undefined : (ativo === 'true' || ativo === true);
  const tipoId = tipoObjetoId ? Number(tipoObjetoId) : undefined;
  return servicosRepository.listar({ ativoFiltro, tipoObjetoId: tipoId });
}

async function buscarPorId(id) {
  const servico = await servicosRepository.buscarPorId(id);
  if (!servico) throw AppError.notFound('Serviço não encontrado');
  return servico;
}

async function criar({ nome, valor, descricao, ativo = true, tipoIds = [] }) {
  const servico = await servicosRepository.criar({ nome, valor, descricao, ativo });
  if (tipoIds.length) await servicosRepository.definirTipos(servico.id, tipoIds);
  return servicosRepository.buscarPorId(servico.id);
}

async function atualizar(id, { nome, valor, descricao, ativo, tipoIds }) {
  await buscarPorId(id);
  const servico = await servicosRepository.atualizar(id, { nome, valor, descricao, ativo });
  if (Array.isArray(tipoIds)) await servicosRepository.definirTipos(id, tipoIds);
  return servicosRepository.buscarPorId(servico.id);
}

async function definirTipos(id, tipoIds) {
  await buscarPorId(id);
  await servicosRepository.definirTipos(id, tipoIds);
  return servicosRepository.buscarPorId(id);
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

module.exports = { listar, buscarPorId, criar, atualizar, definirTipos, deletar };
