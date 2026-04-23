const { pool } = require('../config/database');

async function listar() {
  const { rows } = await pool.query(
    'SELECT id, nome, login, ativo, data_criacao FROM usuarios ORDER BY nome'
  );
  return rows;
}

async function buscarPorId(id) {
  const { rows } = await pool.query(
    'SELECT id, nome, login, ativo, data_criacao FROM usuarios WHERE id = $1',
    [id]
  );
  return rows[0] || null;
}

async function buscarSenhaPorId(id) {
  const { rows } = await pool.query(
    'SELECT id, senha FROM usuarios WHERE id = $1',
    [id]
  );
  return rows[0] || null;
}

async function criar({ nome, login, senhaHash, ativo }) {
  const { rows } = await pool.query(
    `INSERT INTO usuarios (nome, login, senha, ativo)
     VALUES ($1, $2, $3, $4)
     RETURNING id, nome, login, ativo, data_criacao`,
    [nome, login, senhaHash, ativo]
  );
  return rows[0];
}

async function atualizar(id, { nome, login, ativo }) {
  const { rows } = await pool.query(
    `UPDATE usuarios
     SET nome = COALESCE($1, nome),
         login = COALESCE($2, login),
         ativo = COALESCE($3, ativo),
         data_atualizacao = CURRENT_TIMESTAMP
     WHERE id = $4
     RETURNING id, nome, login, ativo, data_criacao`,
    [nome, login, ativo, id]
  );
  return rows[0] || null;
}

async function atualizarSenha(id, senhaHash) {
  await pool.query(
    'UPDATE usuarios SET senha = $1, data_atualizacao = CURRENT_TIMESTAMP WHERE id = $2',
    [senhaHash, id]
  );
}

module.exports = { listar, buscarPorId, buscarSenhaPorId, criar, atualizar, atualizarSenha };
