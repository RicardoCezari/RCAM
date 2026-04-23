const AppError = require('../utils/AppError');
const ordensServicoRepository = require('../repositories/ordensServicoRepository');

const ESTADOS_VALIDOS = ['ENTRADA', 'ORCAMENTO', 'AUTORIZADO', 'PENDENTE', 'CONCLUIDO', 'CANCELADO'];
const ESTADOS_INICIAIS = ['ENTRADA', 'ORCAMENTO'];

// ──────────────────────────────────────
// Listagem com filtros e paginação
// ──────────────────────────────────────
async function listar({ estado, clienteId, usuarioId, dataInicio, dataFim, page = 1, limit = 20 } = {}) {
  const params = [];
  const conditions = [];
  let i = 1;

  if (estado) {
    conditions.push(`os.estado = $${i++}`);
    params.push(estado.toUpperCase());
  }
  if (clienteId) {
    conditions.push(`os.cliente_id = $${i++}`);
    params.push(clienteId);
  }
  if (usuarioId) {
    conditions.push(`os.usuario_id = $${i++}`);
    params.push(usuarioId);
  }
  if (dataInicio) {
    conditions.push(`os.data_entrega >= $${i++}`);
    params.push(dataInicio);
  }
  if (dataFim) {
    conditions.push(`os.data_entrega <= $${i++}`);
    params.push(dataFim);
  }

  const offset = (page - 1) * limit;
  const { rows, total } = await ordensServicoRepository.listar({ conditions, params, limit, offset });

  return { data: rows, total, page: Number(page), limit: Number(limit) };
}

// ──────────────────────────────────────
// Busca completa (com itens)
// ──────────────────────────────────────
async function buscarPorId(id) {
  const os = await ordensServicoRepository.buscarPorId(id);
  if (!os) throw AppError.notFound('Ordem de serviço não encontrada');

  const itens = await ordensServicoRepository.buscarItens(id);
  return { ...os, itens };
}

// ──────────────────────────────────────
// Criar OS com itens (transação no repository)
// ──────────────────────────────────────
async function criar({ cliente_id, usuario_id, estado = 'ENTRADA', data_entrega, hora_entrega, observacoes, itens = [] }) {
  const estadoUpper = estado.toUpperCase();
  if (!ESTADOS_INICIAIS.includes(estadoUpper)) {
    throw AppError.badRequest(`Estado inicial inválido. Use: ${ESTADOS_INICIAIS.join(', ')}`);
  }
  const os = await ordensServicoRepository.criar({ cliente_id, usuario_id, estado: estadoUpper, data_entrega, hora_entrega, observacoes, itens });
  return buscarPorId(os.id);
}

// ──────────────────────────────────────
// Atualizar dados da OS (sem itens)
// ──────────────────────────────────────
async function atualizar(id, { data_entrega, hora_entrega, observacoes }) {
  await buscarPorId(id);
  await ordensServicoRepository.atualizar(id, { data_entrega, hora_entrega, observacoes });
  return buscarPorId(id);
}

// ──────────────────────────────────────
// Transição de estado
// ──────────────────────────────────────
async function mudarEstado(id, novoEstado) {
  const estadoUpper = novoEstado?.toUpperCase();
  if (!ESTADOS_VALIDOS.includes(estadoUpper)) {
    throw AppError.badRequest(`Estado inválido. Valores aceitos: ${ESTADOS_VALIDOS.join(', ')}`);
  }

  const resultado = await ordensServicoRepository.atualizarEstado(id, estadoUpper);
  if (!resultado) throw AppError.notFound('Ordem de serviço não encontrada');
  return resultado;
}

// ──────────────────────────────────────
// Itens
// ──────────────────────────────────────
async function adicionarItem(ordemId, { tipo_objeto_id, servico_id, quantidade, valor_unitario, eh_orcamento, observacoes, foto_url }) {
  const os = await ordensServicoRepository.buscarPorId(ordemId);
  if (!os) throw AppError.notFound('Ordem de serviço não encontrada');

  return ordensServicoRepository.inserirItem({ ordem_id: ordemId, tipo_objeto_id, servico_id, quantidade, valor_unitario, eh_orcamento, observacoes, foto_url });
}

async function atualizarItem(ordemId, itemId, { quantidade, valor_unitario, eh_orcamento, estado, observacoes, foto_url, data_entrega, hora_entrega }) {
  const item = await ordensServicoRepository.buscarItemPorId(itemId, ordemId);
  if (!item) throw AppError.notFound('Item não encontrado nesta ordem');

  return ordensServicoRepository.atualizarItem(itemId, {
    quantidade, valor_unitario, eh_orcamento,
    estado: estado ? estado.toUpperCase() : null,
    observacoes, foto_url, data_entrega, hora_entrega,
  });
}

async function removerItem(ordemId, itemId) {
  const removido = await ordensServicoRepository.removerItem(itemId, ordemId);
  if (!removido) throw AppError.notFound('Item não encontrado nesta ordem');
}

module.exports = {
  listar,
  buscarPorId,
  criar,
  atualizar,
  mudarEstado,
  adicionarItem,
  atualizarItem,
  removerItem,
};
