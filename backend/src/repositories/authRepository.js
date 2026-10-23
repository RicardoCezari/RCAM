const { pool } = require('../config/database');

async function buscarPorLogin(login) {
  const { rows } = await pool.query(
    // Prefere o login idêntico; só então ignora maiúsculas/minúsculas (há logins antigos duplicados por caixa)
    `SELECT id, nome, login, senha, ativo, perfil FROM usuarios
     WHERE LOWER(login) = LOWER($1)
     ORDER BY (login = $1) DESC, ativo DESC, id DESC
     LIMIT 1`,
    [login]
  );
  return rows[0] || null;
}

async function buscarPorId(id) {
  const { rows } = await pool.query(
    'SELECT id, nome, login, ativo, perfil, data_criacao FROM usuarios WHERE id = $1 LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

module.exports = { buscarPorLogin, buscarPorId };
