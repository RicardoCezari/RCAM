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

// Aceita `tipos` ([{ tipo_objeto_id, valor }]) ou, por compatibilidade, `tipoIds` ([id, ...])
function normalizarTipos({ tipos, tipoIds }) {
  if (Array.isArray(tipos)) {
    return tipos.map((t) => ({
      tipo_objeto_id: Number(t.tipo_objeto_id),
      valor: t.valor === null || t.valor === undefined || t.valor === '' ? null : Number(t.valor),
    }));
  }
  if (Array.isArray(tipoIds)) return tipoIds.map((id) => ({ tipo_objeto_id: Number(id), valor: null }));
  return null;
}

async function criar({ nome, valor, descricao, ativo = true, tipos, tipoIds }) {
  const servico = await servicosRepository.criar({ nome, valor, descricao, ativo });
  const lista = normalizarTipos({ tipos, tipoIds });
  if (lista?.length) await servicosRepository.definirTipos(servico.id, lista);
  return servicosRepository.buscarPorId(servico.id);
}

async function atualizar(id, { nome, valor, descricao, ativo, tipos, tipoIds }) {
  await buscarPorId(id);
  const servico = await servicosRepository.atualizar(id, { nome, valor, descricao, ativo });
  const lista = normalizarTipos({ tipos, tipoIds });
  if (lista) await servicosRepository.definirTipos(id, lista);
  return servicosRepository.buscarPorId(servico.id);
}

async function definirTipos(id, tipos) {
  await buscarPorId(id);
  await servicosRepository.definirTipos(id, normalizarTipos({ tipos }) ?? []);
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
