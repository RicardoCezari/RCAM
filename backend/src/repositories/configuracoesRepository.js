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

// Várias alterações na mesma transação: [{ chave, valor }] (valor vazio/nulo remove a chave)
async function aplicar(alteracoes) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const { chave, valor } of alteracoes) {
      if (valor) {
        await client.query(
          `INSERT INTO configuracoes (chave, valor) VALUES ($1, $2)
           ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor`,
          [chave, valor]
        );
      } else {
        await client.query('DELETE FROM configuracoes WHERE chave = $1', [chave]);
      }
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { listar, buscar, salvar, remover, aplicar };
