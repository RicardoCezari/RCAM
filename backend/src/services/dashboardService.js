const AppError = require('../utils/AppError');
const { dataIso, diasEntre, hojeIso } = require('../utils/datas');
const repo = require('../repositories/dashboardRepository');

const ESTADOS = ['ENTRADA', 'ORCAMENTO', 'EM_ANDAMENTO', 'CONCLUIDO', 'ENTREGUE', 'CANCELADO'];
const CONCLUIDAS = ['CONCLUIDO', 'ENTREGUE'];
const PENDENTES = ['ENTRADA', 'ORCAMENTO', 'EM_ANDAMENTO'];

const PERIODO_PADRAO_DIAS = 30;
const PERIODO_MAXIMO_DIAS = 3660;
const TOP_SERVICOS = 10;
const INT_MAX = 2147483647;

function idOpcional(valor, campo) {
  if (valor === undefined || valor === null || valor === '') return null;
  const n = Number(valor);
  if (!/^\d+$/.test(String(valor)) || n < 1 || n > INT_MAX) throw AppError.badRequest(`${campo} inválido`);
  return n;
}

function normalizarFiltros({ inicio, fim, usuarioId, servicoId } = {}) {
  const f = {
    inicio: inicio ? dataIso(inicio, 'inicio') : hojeIso(-(PERIODO_PADRAO_DIAS - 1)),
    fim: fim ? dataIso(fim, 'fim') : hojeIso(),
    usuarioId: idOpcional(usuarioId, 'usuarioId'),
    servicoId: idOpcional(servicoId, 'servicoId'),
  };
  const dias = diasEntre(f.inicio, f.fim);
  if (dias < 1) throw AppError.badRequest('A data final não pode ser anterior à inicial');
  if (dias > PERIODO_MAXIMO_DIAS) throw AppError.badRequest('Período máximo de 10 anos');
  return { ...f, dias };
}

// Até 31 dias: por dia; até ~6 meses: por semana; acima: por mês
function agrupamentoPara(dias) {
  if (dias <= 31) return 'day';
  if (dias <= 183) return 'week';
  return 'month';
}

const arredondar = (n, casas = 1) => Math.round(n * 10 ** casas) / 10 ** casas;
const soma = (porEstado, estados) => estados.reduce((acc, e) => acc + (porEstado[e] || 0), 0);

async function obter(entrada) {
  const { dias, ...filtros } = normalizarFiltros(entrada);
  const agrupamento = agrupamentoPara(dias);

  const [estados, serie, servicos, fin, produtividade] = await Promise.all([
    repo.porEstado(filtros),
    repo.serie(filtros, agrupamento),
    repo.servicosRealizados(filtros),
    repo.financeiro(filtros),
    repo.produtividade(filtros),
  ]);

  const porEstado = Object.fromEntries(estados.map((r) => [r.estado, r.total]));
  const total = soma(porEstado, ESTADOS);
  const concluidas = soma(porEstado, CONCLUIDAS);

  return {
    filtros: { inicio: filtros.inicio, fim: filtros.fim, usuarioId: filtros.usuarioId, servicoId: filtros.servicoId },
    agrupamento,
    resumo: {
      total,
      concluidas,
      percentualConcluidas: total ? arredondar((concluidas / total) * 100) : null,
      pendentes: soma(porEstado, PENDENTES),
      canceladas: porEstado.CANCELADO || 0,
      faturamento: fin.faturamento,
      ordensFaturadas: fin.ordens,
      ticketMedio: fin.ordens ? arredondar(fin.faturamento / fin.ordens, 2) : null,
    },
    serie,
    status: ESTADOS.map((estado) => ({ estado, total: porEstado[estado] || 0 })),
    servicosMaisRealizados: [...servicos]
      .sort((a, b) => b.quantidade - a.quantidade || a.nome.localeCompare(b.nome))
      .slice(0, TOP_SERVICOS),
    servicosMaisRentaveis: [...servicos]
      .sort((a, b) => b.valor - a.valor || a.nome.localeCompare(b.nome))
      .slice(0, TOP_SERVICOS),
    produtividade,
  };
}

module.exports = { obter };
