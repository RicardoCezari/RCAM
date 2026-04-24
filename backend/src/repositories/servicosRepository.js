const { pool } = require('../config/database');

async function listar({ ativoFiltro, tipoObjetoId } = {}) {
  const params = [];
  const conditions = [];

  if (ativoFiltro !== undefined) {
    params.push(ativoFiltro);
    conditions.push(`s.ativo = $${params.length}`);
  }

  if (tipoObjetoId !== undefined) {
    params.push(tipoObjetoId);
    conditions.push(`tos_filter.tipo_objeto_id = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const joinFilter = tipoObjetoId !== undefined
    ? 'JOIN tipo_objeto_servicos tos_filter ON tos_filter.servico_id = s.id'
    : '';

  const { rows } = await pool.query(
    `SELECT
       s.id, s.nome, s.valor, s.descricao, s.ativo, s.data_criacao,
       COALESCE(
         json_agg(tos.tipo_objeto_id ORDER BY tos.tipo_objeto_id)
         FILTER (WHERE tos.tipo_objeto_id IS NOT NULL),
         '[]'
       ) AS tipo_ids
     FROM servicos s
     ${joinFilter}
     LEFT JOIN tipo_objeto_servicos tos ON tos.servico_id = s.id
     ${where}
     GROUP BY s.id
     ORDER BY s.nome`,
    params
  );
  return rows;
}

async function buscarPorId(id) {
  const { rows } = await pool.query(
    `SELECT
       s.id, s.nome, s.valor, s.descricao, s.ativo, s.data_criacao,
       COALESCE(
         json_agg(tos.tipo_objeto_id ORDER BY tos.tipo_objeto_id)
         FILTER (WHERE tos.tipo_objeto_id IS NOT NULL),
         '[]'
       ) AS tipo_ids
     FROM servicos s
     LEFT JOIN tipo_objeto_servicos tos ON tos.servico_id = s.id
     WHERE s.id = $1
     GROUP BY s.id`,
    [id]
  );
  return rows[0] || null;
}

async function definirTipos(servicoId, tipoIds) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'DELETE FROM tipo_objeto_servicos WHERE servico_id = $1',
      [servicoId]
    );
    for (const tipoId of tipoIds) {
      await client.query(
        'INSERT INTO tipo_objeto_servicos (tipo_objeto_id, servico_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [tipoId, servicoId]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function possuiItens(id) {
  const { rows } = await pool.query(
    'SELECT id FROM itens_ordem_servico WHERE servico_id = $1 LIMIT 1',
    [id]
  );
  return rows.length > 0;
}

async function criar({ nome, valor, descricao, ativo }) {
  const { rows } = await pool.query(
    'INSERT INTO servicos (nome, valor, descricao, ativo) VALUES ($1, $2, $3, $4) RETURNING *',
    [nome, valor, descricao || null, ativo]
  );
  return rows[0];
}

async function atualizar(id, { nome, valor, descricao, ativo }) {
  const { rows } = await pool.query(
    `UPDATE servicos
     SET nome = COALESCE($1, nome),
         valor = COALESCE($2, valor),
         descricao = $3,
         ativo = COALESCE($4, ativo)
     WHERE id = $5
     RETURNING *`,
    [nome, valor, descricao ?? null, ativo, id]
  );
  return rows[0] || null;
}

async function desativar(id) {
  const { rows } = await pool.query(
    'UPDATE servicos SET ativo = FALSE WHERE id = $1 RETURNING *',
    [id]
  );
  return rows[0] || null;
}

async function deletar(id) {
  await pool.query('DELETE FROM servicos WHERE id = $1', [id]);
}

module.exports = { listar, buscarPorId, definirTipos, possuiItens, criar, atualizar, desativar, deletar };
