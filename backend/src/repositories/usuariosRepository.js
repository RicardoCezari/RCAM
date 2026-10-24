const { pool } = require('../config/database');

async function listar() {
  const { rows } = await pool.query(
    'SELECT id, nome, login, ativo, perfil, data_criacao, (pin_hash IS NOT NULL) AS tem_pin FROM usuarios ORDER BY nome'
  );
  return rows;
}

async function buscarPorId(id) {
  const { rows } = await pool.query(
    'SELECT id, nome, login, ativo, perfil, data_criacao FROM usuarios WHERE id = $1',
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

async function criar({ nome, login, senhaHash, ativo, perfil }) {
  const { rows } = await pool.query(
    `INSERT INTO usuarios (nome, login, senha, ativo, perfil)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, nome, login, ativo, perfil, data_criacao`,
    [nome, login, senhaHash, ativo, perfil]
  );
  return rows[0];
}

async function atualizar(id, { nome, login, ativo, perfil }) {
  const { rows } = await pool.query(
    `UPDATE usuarios
     SET nome = COALESCE($1, nome),
         login = COALESCE($2, login),
         ativo = COALESCE($3, ativo),
         perfil = COALESCE($4, perfil),
         data_atualizacao = CURRENT_TIMESTAMP
     WHERE id = $5
     RETURNING id, nome, login, ativo, perfil, data_criacao`,
    [nome, login, ativo, perfil, id]
  );
  return rows[0] || null;
}

async function contarAdminsAtivos(excetoId) {
  const { rows } = await pool.query(
    "SELECT COUNT(*)::int AS total FROM usuarios WHERE perfil = 'ADMIN' AND ativo = true AND id <> $1",
    [excetoId]
  );
  return rows[0].total;
}

async function atualizarSenha(id, senhaHash) {
  await pool.query(
    'UPDATE usuarios SET senha = $1, data_atualizacao = CURRENT_TIMESTAMP WHERE id = $2',
    [senhaHash, id]
  );
}

// pinHash nulo remove o PIN. Definir/remover zera tentativas e desbloqueia o perfil.
async function atualizarPin(id, pinHash) {
  const { rowCount } = await pool.query(
    `UPDATE usuarios SET pin_hash = $1, pin_tentativas = 0, pin_bloqueado_ate = NULL,
            data_atualizacao = CURRENT_TIMESTAMP WHERE id = $2`,
    [pinHash, id]
  );
  return rowCount > 0;
}

module.exports = {
  listar,
  buscarPorId,
  buscarSenhaPorId,
  criar,
  atualizar,
  atualizarSenha,
  atualizarPin,
  contarAdminsAtivos,
};
