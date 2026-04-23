const { pool } = require('../config/database');

async function buscarPorLogin(login) {
  const { rows } = await pool.query(
    'SELECT id, nome, login, senha, ativo FROM usuarios WHERE login = $1 LIMIT 1',
    [login]
  );
  return rows[0] || null;
}

async function buscarPorId(id) {
  const { rows } = await pool.query(
    'SELECT id, nome, login, ativo, data_criacao FROM usuarios WHERE id = $1 LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

module.exports = { buscarPorLogin, buscarPorId };
