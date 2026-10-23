const { pool } = require('../config/database');

async function listar() {
  const { rows } = await pool.query('SELECT chave, valor FROM configuracoes');
  return Object.fromEntries(rows.map((r) => [r.chave, r.valor]));
}

async function buscar(chave) {
  const { rows } = await pool.query('SELECT valor FROM configuracoes WHERE chave = $1', [chave]);
  return rows[0]?.valor ?? null;
}

async function salvar(chave, valor) {
  await pool.query(
    `INSERT INTO configuracoes (chave, valor) VALUES ($1, $2)
     ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor`,
    [chave, valor]
  );
}

async function remover(chave) {
  await pool.query('DELETE FROM configuracoes WHERE chave = $1', [chave]);
}

module.exports = { listar, buscar, salvar, remover };
