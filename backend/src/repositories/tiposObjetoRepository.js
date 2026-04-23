const { pool } = require('../config/database');

async function listar() {
  const { rows } = await pool.query(
    'SELECT id, nome, descricao, data_criacao FROM tipos_objeto ORDER BY nome'
  );
  return rows;
}

async function buscarPorId(id) {
  const { rows } = await pool.query(
    'SELECT id, nome, descricao, data_criacao FROM tipos_objeto WHERE id = $1',
    [id]
  );
  return rows[0] || null;
}

async function possuiItens(id) {
  const { rows } = await pool.query(
    'SELECT id FROM itens_ordem_servico WHERE tipo_objeto_id = $1 LIMIT 1',
    [id]
  );
  return rows.length > 0;
}

async function criar({ nome, descricao }) {
  const { rows } = await pool.query(
    'INSERT INTO tipos_objeto (nome, descricao) VALUES ($1, $2) RETURNING *',
    [nome, descricao || null]
  );
  return rows[0];
}

async function atualizar(id, { nome, descricao }) {
  const { rows } = await pool.query(
    `UPDATE tipos_objeto
     SET nome = COALESCE($1, nome),
         descricao = $2
     WHERE id = $3
     RETURNING *`,
    [nome, descricao ?? null, id]
  );
  return rows[0] || null;
}

async function deletar(id) {
  await pool.query('DELETE FROM tipos_objeto WHERE id = $1', [id]);
}

module.exports = { listar, buscarPorId, possuiItens, criar, atualizar, deletar };
