const AppError = require('../utils/AppError');
const ordensServicoRepository = require('../repositories/ordensServicoRepository');
const storage = require('./storageService');
const imagemService = require('./imagemService');
const { dataIso } = require('../utils/datas');

const ESTADOS_VALIDOS = ['ENTRADA', 'ORCAMENTO', 'AUTORIZADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'ENTREGUE', 'CANCELADO'];
const ESTADOS_ITEM_VALIDOS = ['CADASTRADO', 'ORCAMENTO', 'AUTORIZADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'ENTREGUE', 'CANCELADO'];
const ETAPAS_FOTO = ['ENTRADA', 'ENTREGA'];
const ESTADOS_INICIAIS = ['ENTRADA', 'ORCAMENTO'];

// ──────────────────────────────────────
// Listagem com filtros e paginação
// ──────────────────────────────────────
// [expressão na consulta paginada (os/c/u), coluna equivalente na consulta externa (p)]
const COLUNAS_ORDENAVEIS = {
  numero: ['os.numero', 'p.numero'],
  cliente: ['c.nome', 'p.cliente_nome'],
  telefone: ['c.telefone', 'p.cliente_telefone'],
  cadastro: ['os.data_criacao', 'p.data_criacao'],
  entrega: ['os.data_entrega', 'p.data_entrega'],
  usuario: ['u.nome', 'p.usuario_nome'],
  estado: ['os.estado', 'p.estado'],
  total: ['os.valor_total', 'p.valor_total'],
};

const SITUACOES = {
  pendentes: "(os.estado NOT IN ('ENTREGUE', 'CANCELADO') OR (os.estado = 'CANCELADO' AND os.data_entregue IS NULL))",
  entregues: "(os.estado = 'ENTREGUE' OR (os.estado = 'CANCELADO' AND os.data_entregue IS NOT NULL))",
  canceladas: "os.estado = 'CANCELADO'",
};

const like = (txt) => `%${String(txt).trim().replace(/[\\%_]/g, '\\$&')}%`;

// Valor exibido na lista: total; sem total, o valor de orçamento (mesma regra da tela)
const VALOR_EXIBIDO = '(CASE WHEN os.valor_total > 0 THEN os.valor_total ELSE os.valor_orcamento END)';

// Texto composto apenas por dígitos e pontuação de telefone (ex.: "(11) 99999-0000")
const SOMENTE_NUMERICO = /^[\d\s().+\-/]+$/;

// dd/mm, dd/mm/aa ou dd/mm/aaaa digitado na busca global
const DATA_BR = /^\s*(\d{1,2})\/(\d{1,2})(?:\/(\d{2}|\d{4}))?\s*$/;

function valorNumerico(valor, campo) {
  const n = Number(String(valor).trim().replace(',', '.'));
  if (!Number.isFinite(n) || n < 0 || n > 99_999_999) throw AppError.badRequest(`${campo} inválido`);
  return n;
}

async function listar({
  estado, situacao, clienteId, usuarioId, dataInicio, dataFim, criacaoInicio, criacaoFim, valorMin, valorMax,
  q, numero, cliente, telefone, usuario, objeto, ordenarPor, direcao,
  page = 1, limit = 20,
} = {}) {
  const params = [];
  const conditions = [];
  let i = 1;

  if (estado) {
    const estados = String(estado).split(',').map((e) => e.trim().toUpperCase()).filter(Boolean);
    conditions.push(`os.estado = ANY($${i++}::text[])`);
    params.push(estados);
  }
  if (situacao && SITUACOES[situacao]) {
    conditions.push(SITUACOES[situacao]);
  }
  if (clienteId) {
    conditions.push(`os.cliente_id = $${i++}`);
    params.push(clienteId);
  }
  if (usuarioId) {
    conditions.push(`os.usuario_id = $${i++}`);
    params.push(usuarioId);
  }
  // Data de entrega (coluna DATE) e data de abertura (TIMESTAMP, intervalo fechado no dia final)
  if (dataInicio) {
    conditions.push(`os.data_entrega >= $${i++}::date`);
    params.push(dataIso(dataInicio, 'dataInicio'));
  }
  if (dataFim) {
    conditions.push(`os.data_entrega <= $${i++}::date`);
    params.push(dataIso(dataFim, 'dataFim'));
  }
  if (criacaoInicio) {
    conditions.push(`os.data_criacao >= $${i++}::date`);
    params.push(dataIso(criacaoInicio, 'criacaoInicio'));
  }
  if (criacaoFim) {
    conditions.push(`os.data_criacao < ($${i++}::date + 1)`);
    params.push(dataIso(criacaoFim, 'criacaoFim'));
  }
  if (valorMin !== undefined && valorMin !== '') {
    conditions.push(`${VALOR_EXIBIDO} >= $${i++}`);
    params.push(valorNumerico(valorMin, 'valorMin'));
  }
  if (valorMax !== undefined && valorMax !== '') {
    conditions.push(`${VALOR_EXIBIDO} <= $${i++}`);
    params.push(valorNumerico(valorMax, 'valorMax'));
  }

  // Filtros por coluna (parciais, sem diferenciar maiúsculas)
  if (numero) {
    conditions.push(`os.numero::text LIKE $${i++}`);
    params.push(like(numero));
  }
  if (cliente) {
    conditions.push(`c.nome ILIKE $${i++}`);
    params.push(like(cliente));
  }
  if (telefone) {
    const digitos = String(telefone).replace(/\D/g, '');
    if (digitos) {
      conditions.push(`c.telefone_digitos LIKE $${i++}`);
      params.push(`%${digitos}%`);
    }
  }
  if (usuario) {
    conditions.push(`u.nome ILIKE $${i++}`);
    params.push(like(usuario));
  }
  if (objeto) {
    conditions.push(
      `os.id IN (SELECT i.ordem_id FROM itens_ordem_servico i` +
      ` WHERE i.tipo_objeto_id IN (SELECT id FROM tipos_objeto WHERE nome ILIKE $${i++}))`
    );
    params.push(like(objeto));
  }

  // Busca global. Cliente e responsável são procurados em subconsultas independentes (avaliadas uma vez e
  // apoiadas nos índices trigram), em vez de ILIKE linha a linha sobre o resultado do JOIN.
  // Cobre número, cliente (nome, e-mail, telefone), responsável, tipo de objeto, observações da O.S. e datas dd/mm[/aaaa].
  if (q) {
    const idx = i++;
    params.push(like(q));
    const digitos = String(q).replace(/\D/g, '');
    let telCond = '';
    if (digitos.length >= 3 && SOMENTE_NUMERICO.test(q)) {
      telCond = ` OR telefone_digitos LIKE $${i++}`;
      params.push(`%${digitos}%`);
    }
    // Cada ramo é uma subconsulta própria sobre uma coluna indexada (UNION ALL). Um "OR" entre colunas diferentes
    // obriga o PostgreSQL a varrer a tabela inteira; assim cada ramo usa o seu índice (medido: ~6x mais rápido).
    const ramos = [
      `SELECT id FROM ordens_servico WHERE observacoes ILIKE $${idx}`,
      `SELECT id FROM ordens_servico WHERE cliente_id IN (SELECT id FROM clientes WHERE nome ILIKE $${idx} OR email ILIKE $${idx}${telCond})`,
      `SELECT id FROM ordens_servico WHERE usuario_id IN (SELECT id FROM usuarios WHERE nome ILIKE $${idx})`,
      `SELECT i.ordem_id FROM itens_ordem_servico i` +
        ` WHERE i.tipo_objeto_id IN (SELECT id FROM tipos_objeto WHERE nome ILIKE $${idx})`,
    ];
    // Número da O.S. só tem dígitos: texto com outros caracteres nunca casa e o ramo é dispensado
    if (/^\d+$/.test(String(q).trim())) ramos.push(`SELECT id FROM ordens_servico WHERE numero::text LIKE $${idx}`);

    const data = DATA_BR.exec(q);
    if (data) {
      const dia = Number(data[1]);
      const mes = Number(data[2]);
      if (dia >= 1 && dia <= 31 && mes >= 1 && mes <= 12) {
        if (data[3]) {
          const ano = data[3].length === 2 ? 2000 + Number(data[3]) : Number(data[3]);
          const iso = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
          if (!Number.isNaN(new Date(`${iso}T00:00:00Z`).getTime()) && new Date(`${iso}T00:00:00Z`).getUTCDate() === dia) {
            const p = i++;
            params.push(iso);
            ramos.push(
              `SELECT id FROM ordens_servico WHERE data_entrega = $${p}::date`,
              `SELECT id FROM ordens_servico WHERE data_criacao >= $${p}::date AND data_criacao < $${p}::date + 1`
            );
          }
        } else {
          const pd = i++;
          const pm = i++;
          params.push(dia, mes);
          ramos.push(
            `SELECT id FROM ordens_servico WHERE EXTRACT(DAY FROM data_entrega) = $${pd} AND EXTRACT(MONTH FROM data_entrega) = $${pm}`,
            `SELECT id FROM ordens_servico WHERE EXTRACT(DAY FROM data_criacao) = $${pd} AND EXTRACT(MONTH FROM data_criacao) = $${pm}`
          );
        }
      }
    }

    conditions.push(`os.id IN (${ramos.join(' UNION ALL ')})`);
  }

  const [colunaInterna, colunaExterna] = COLUNAS_ORDENAVEIS[ordenarPor] || COLUNAS_ORDENAVEIS.cadastro;
  const sentido = String(direcao).toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  const orderBy = `${colunaInterna} ${sentido}, os.id DESC`;
  const orderByExterno = `${colunaExterna} ${sentido}, p.id DESC`;

  const offset = (page - 1) * limit;
  const { rows, total } = await ordensServicoRepository.listar({ conditions, params, limit, offset, orderBy, orderByExterno });

  return { data: rows, total, page: Number(page), limit: Number(limit) };
}

// ──────────────────────────────────────
// Busca completa (com itens)
// ──────────────────────────────────────
async function buscarPorId(id) {
  const os = await ordensServicoRepository.buscarPorId(id);
  if (!os) throw AppError.notFound('Ordem de serviço não encontrada');

  const itens = await ordensServicoRepository.buscarItens(id);
  const fotos = await ordensServicoRepository.buscarFotos(id);
  return { ...os, itens, fotos };
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
// O.S. entregue ou cancelada é somente histórico: não aceita mais alterações
// ──────────────────────────────────────
async function garantirEditavel(ordemId, { devolucao = false, fotos = false } = {}) {
  const os = await ordensServicoRepository.buscarPorId(ordemId);
  if (!os) throw AppError.notFound('Ordem de serviço não encontrada');
  // O.S. cancelada ainda não devolvida aceita apenas a devolução ao cliente (e as fotos dela)
  if (devolucao && os.estado === 'CANCELADO' && !os.data_entregue) return os;
  // Foto esquecida pode ser vinculada depois da entrega
  if (fotos && os.estado === 'ENTREGUE') return os;
  if (os.estado === 'ENTREGUE' || os.estado === 'CANCELADO') {
    throw AppError.conflict(
      `Esta O.S. já foi ${os.estado === 'ENTREGUE' ? 'entregue' : 'cancelada'} e não pode mais ser alterada.`
    );
  }
  return os;
}

// ──────────────────────────────────────
// Atualizar dados da OS (sem itens)
// ──────────────────────────────────────
async function atualizar(id, { data_entrega, hora_entrega, observacoes }) {
  await garantirEditavel(id);
  await ordensServicoRepository.atualizar(id, { data_entrega, hora_entrega, observacoes });
  return buscarPorId(id);
}

// ──────────────────────────────────────
// Transição de estado
// ──────────────────────────────────────
async function mudarEstado(id, novoEstado, usuarioId = null) {
  const estadoUpper = novoEstado?.toUpperCase();
  if (!ESTADOS_VALIDOS.includes(estadoUpper)) {
    throw AppError.badRequest(`Estado inválido. Valores aceitos: ${ESTADOS_VALIDOS.join(', ')}`);
  }

  const resultado = await ordensServicoRepository.atualizarEstado(id, estadoUpper, usuarioId);
  if (!resultado) throw AppError.notFound('Ordem de serviço não encontrada');
  return resultado;
}

// Histórico
async function historicoOrdem(id) {
  const os = await ordensServicoRepository.buscarPorId(id);
  if (!os) throw AppError.notFound('Ordem de serviço não encontrada');
  return ordensServicoRepository.buscarHistorico(id);
}

async function historicoCliente(clienteId) {
  return ordensServicoRepository.historicoCliente(clienteId);
}

// ──────────────────────────────────────
// Itens
// ──────────────────────────────────────
async function adicionarItem(ordemId, { tipo_objeto_id, servico_id, quantidade, valor_unitario, eh_orcamento, observacoes, foto_url }) {
  await garantirEditavel(ordemId);
  return ordensServicoRepository.inserirItem({ ordem_id: ordemId, tipo_objeto_id, servico_id, quantidade, valor_unitario, eh_orcamento, observacoes, foto_url });
}

async function atualizarItem(ordemId, itemId, { quantidade, valor_unitario, eh_orcamento, estado, observacoes, foto_url, data_entrega, hora_entrega }, usuarioId = null) {
  await garantirEditavel(ordemId);
  const item = await ordensServicoRepository.buscarItemPorId(itemId, ordemId);
  if (!item) throw AppError.notFound('Item não encontrado nesta ordem');

  const estadoUpper = estado ? estado.toUpperCase() : null;
  if (estadoUpper && !ESTADOS_ITEM_VALIDOS.includes(estadoUpper)) {
    throw AppError.badRequest(`Estado do item inválido. Valores aceitos: ${ESTADOS_ITEM_VALIDOS.join(', ')}`);
  }

  return ordensServicoRepository.atualizarItem(itemId, {
    quantidade, valor_unitario, eh_orcamento,
    estado: estadoUpper,
    observacoes, foto_url, data_entrega, hora_entrega,
  }, usuarioId);
}

async function removerItem(ordemId, itemId) {
  await garantirEditavel(ordemId);
  const removido = await ordensServicoRepository.removerItem(itemId, ordemId);
  if (!removido) throw AppError.notFound('Item não encontrado nesta ordem');
  // Arquivos só são apagados depois do COMMIT; falha ao apagar não desfaz a remoção do item
  await Promise.allSettled(removido.urls.map((u) => storage.remover(u)));
}

// ────────────────────────────────────
// Fotos (da O.S. inteira ou de um item)
// ────────────────────────────────────
async function adicionarFotos(ordemId, arquivos = [], itemId = null, etapa = 'ENTRADA') {
  if (!arquivos.length) throw AppError.badRequest('Nenhuma imagem enviada');

  const etapaUpper = String(etapa || 'ENTRADA').toUpperCase();
  if (!ETAPAS_FOTO.includes(etapaUpper)) {
    throw AppError.badRequest(`Etapa inválida. Use: ${ETAPAS_FOTO.join(', ')}`);
  }

  const os = await garantirEditavel(ordemId, { devolucao: etapaUpper === 'ENTREGA' && !itemId, fotos: true });

  if (itemId) {
    const item = await ordensServicoRepository.buscarItemPorId(itemId, ordemId);
    if (!item) throw AppError.notFound('Item não encontrado nesta ordem');
  }

  const fotos = [];
  const urlsSalvas = [];
  try {
    for (const arquivo of arquivos) {
      const url = await storage.salvar(await imagemService.normalizar(arquivo.buffer), arquivo.mimetype);
      urlsSalvas.push(url);
      fotos.push(await ordensServicoRepository.inserirFoto({ ordem_id: ordemId, item_id: itemId, url, etapa: etapaUpper }));
    }
  } catch (err) {
    // Falhou no meio do lote: remove os arquivos e registros já gravados para não deixar órfãos
    await Promise.allSettled([
      ...fotos.map((f) => ordensServicoRepository.removerFoto(f.id, ordemId)),
      ...urlsSalvas.map((u) => storage.remover(u)),
    ]);
    throw err;
  }
  return fotos;
}

async function removerFoto(ordemId, fotoId) {
  await garantirEditavel(ordemId);
  const removida = await ordensServicoRepository.removerFoto(fotoId, ordemId);
  if (!removida) throw AppError.notFound('Foto não encontrada nesta ordem');
  await storage.remover(removida.url);
}

module.exports = {
  listar,
  buscarPorId,
  criar,
  atualizar,
  mudarEstado,
  historicoOrdem,
  historicoCliente,
  adicionarItem,
  atualizarItem,
  removerItem,
  adicionarFotos,
  removerFoto,
};
