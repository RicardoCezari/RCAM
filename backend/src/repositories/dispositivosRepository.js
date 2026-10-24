const { pool } = require('../config/database');

async function criar({ nome, tokenHash, criadoPor }) {
  const { rows } = await pool.query(
    `INSERT INTO dispositivos (nome, token_hash, criado_por) VALUES ($1, $2, $3)
     RETURNING id, nome, data_criacao`,
    [nome, tokenHash, criadoPor]
  );
  return rows[0];
}

async function listar() {
  const { rows } = await pool.query(
    `SELECT d.id, d.nome, d.data_criacao, d.ultimo_uso, u.nome AS criado_por_nome
     FROM dispositivos d LEFT JOIN usuarios u ON u.id = d.criado_por
     ORDER BY d.data_criacao DESC, d.id DESC`
  );
  return rows;
}

// Retorna o aparelho e registra o uso; null se o token não existir (ou tiver sido revogado)
async function buscarPorTokenEAtualizarUso(tokenHash) {
  const { rows } = await pool.query(
    'UPDATE dispositivos SET ultimo_uso = CURRENT_TIMESTAMP WHERE token_hash = $1 RETURNING id, nome',
    [tokenHash]
  );
  return rows[0] || null;
}

async function remover(id) {
  const { rowCount } = await pool.query('DELETE FROM dispositivos WHERE id = $1', [id]);
  return rowCount > 0;
}

module.exports = { criar, listar, buscarPorTokenEAtualizarUso, remover };
