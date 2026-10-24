const { pool } = require('../config/database');

/*
 * Todas as consultas partem do mesmo conjunto de O.S. ("escopo"):
 *   criadas no período ($1..$2, por data_criacao) + funcionário que abriu a O.S. ($3, opcional)
 *   + O.S. que tenha ao menos um item do serviço ($4, opcional).
 * $5 é a unidade de agrupamento da série (day | week | month).
 * Sempre as mesmas cinco posições de parâmetro, para o escopo ser reutilizado sem variações.
 */
const ESCOPO_OS = `
  os.data_criacao >= $1::date AND os.data_criacao < $2::date + 1
  AND ($3::int IS NULL OR os.usuario_id = $3::int)
  AND ($4::int IS NULL OR EXISTS (
        SELECT 1 FROM itens_ordem_servico f WHERE f.ordem_id = os.id AND f.servico_id = $4::int))`;

// Serviço realizado = item concluído ou entregue (mesmo critério de "pronto" usado nas listas)
const ITEM_REALIZADO = `i.estado IN ('CONCLUIDO', 'ENTREGUE') AND ($4::int IS NULL OR i.servico_id = $4::int)`;

// $5 (agrupamento) é passado só pela série
function params({ inicio, fim, usuarioId, servicoId }) {
  return [inicio, fim, usuarioId, servicoId];
}

async function porEstado(filtros) {
  const { rows } = await pool.query(
    `SELECT os.estado, COUNT(*)::int AS total
       FROM ordens_servico os
      WHERE ${ESCOPO_OS}
      GROUP BY os.estado`,
    params(filtros)
  );
  return rows;
}

// Série completa: períodos sem O.S. entram com total 0
async function serie(filtros, agrupamento) {
  const { rows } = await pool.query(
    `SELECT to_char(b.inicio, 'YYYY-MM-DD') AS data, COALESCE(c.total, 0)::int AS total
       FROM generate_series(
              date_trunc($5::text, $1::date::timestamp),
              $2::date::timestamp,
              ('1 ' || $5::text)::interval
            ) AS b(inicio)
       LEFT JOIN (
              SELECT date_trunc($5::text, os.data_criacao) AS inicio, COUNT(*) AS total
                FROM ordens_servico os
               WHERE ${ESCOPO_OS}
               GROUP BY 1
            ) c ON c.inicio = b.inicio
      ORDER BY b.inicio`,
    [...params(filtros), agrupamento]
  );
  return rows;
}

// Por serviço realizado: unidades (quantidade), O.S. distintas e valor
async function servicosRealizados(filtros) {
  const { rows } = await pool.query(
    `SELECT s.id, s.nome,
            SUM(i.quantidade)::int AS quantidade,
            COUNT(DISTINCT i.ordem_id)::int AS ordens,
            ROUND(SUM(i.valor_total), 2)::float8 AS valor
       FROM itens_ordem_servico i
       JOIN ordens_servico os ON os.id = i.ordem_id
       JOIN servicos s ON s.id = i.servico_id
      WHERE ${ESCOPO_OS} AND ${ITEM_REALIZADO}
      GROUP BY s.id, s.nome`,
    params(filtros)
  );
  return rows;
}

async function financeiro(filtros) {
  const { rows: [r] } = await pool.query(
    `SELECT COALESCE(ROUND(SUM(i.valor_total), 2), 0)::float8 AS faturamento,
            COUNT(DISTINCT i.ordem_id)::int AS ordens
       FROM itens_ordem_servico i
       JOIN ordens_servico os ON os.id = i.ordem_id
      WHERE ${ESCOPO_OS} AND ${ITEM_REALIZADO}`,
    params(filtros)
  );
  return r;
}

/*
 * Quem executou: usuário da última mudança do item para CONCLUIDO (ordem_historico); se não houver, quem entregou.
 * O sistema não tem campo "funcionário responsável pela execução": este é o melhor registro disponível.
 */
async function produtividade(filtros) {
  const { rows } = await pool.query(
    `SELECT u.id, u.nome,
            COUNT(DISTINCT i.ordem_id)::int AS ordens,
            SUM(i.quantidade)::int AS servicos
       FROM itens_ordem_servico i
       JOIN ordens_servico os ON os.id = i.ordem_id
       LEFT JOIN LATERAL (
              SELECT h.usuario_id
                FROM ordem_historico h
               WHERE h.item_id = i.id AND h.estado_novo = 'CONCLUIDO' AND h.usuario_id IS NOT NULL
               ORDER BY h.data_mudanca DESC, h.id DESC
               LIMIT 1
            ) ex ON TRUE
       LEFT JOIN usuarios u ON u.id = COALESCE(ex.usuario_id, i.entregue_por)
      WHERE ${ESCOPO_OS} AND ${ITEM_REALIZADO}
      GROUP BY u.id, u.nome
      ORDER BY ordens DESC, servicos DESC, u.nome`,
    params(filtros)
  );
  return rows;
}

module.exports = { porEstado, serie, servicosRealizados, financeiro, produtividade };
