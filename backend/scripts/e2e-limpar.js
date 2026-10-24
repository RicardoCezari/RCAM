/*
 * Remove do banco de TESTE os dados criados pelos testes no navegador (nomes/observações com prefixo ZZE2E).
 * Recusa-se a rodar em banco cujo nome não termine em _test.
 *
 * Uso: node scripts/e2e-limpar.js
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { Pool } = require('pg');

const BANCO = process.env.TEST_DB_NAME || 'azteca_test';
if (!/_test$/.test(BANCO)) {
  console.error(`[E2E-LIMPAR] Banco inválido: ${BANCO} (deve terminar em _test)`);
  process.exit(1);
}

(async () => {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: BANCO,
  });
  try {
    const os = await pool.query(
      `DELETE FROM ordens_servico
        WHERE observacoes LIKE 'ZZE2E%'
           OR cliente_id IN (SELECT id FROM clientes WHERE nome LIKE 'ZZE2E%')`
    );
    const clientes = await pool.query("DELETE FROM clientes WHERE nome LIKE 'ZZE2E%'");
    const servicos = await pool.query("DELETE FROM servicos WHERE nome LIKE 'ZZE2E%'");
    const tipos = await pool.query("DELETE FROM tipos_objeto WHERE nome LIKE 'ZZE2E%'");
    console.log(`[E2E-LIMPAR] ${BANCO}: ${os.rowCount} O.S., ${clientes.rowCount} clientes, ${servicos.rowCount} serviços, ${tipos.rowCount} tipos removidos.`);
  } finally {
    await pool.end();
  }
})().catch((err) => {
  console.error('[E2E-LIMPAR] Falha:', err.message);
  process.exit(1);
});
