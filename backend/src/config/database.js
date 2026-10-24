const { Pool, types } = require('pg');
const { montarSsl } = require('./dbSsl');

// DATE (oid 1082) como string 'YYYY-MM-DD', evitando deslocamento de fuso
types.setTypeParser(1082, (valor) => valor);

if (!process.env.DB_PASSWORD || !process.env.DB_NAME) {
  console.error('[DB] ERRO: DB_NAME e DB_PASSWORD devem estar definidos. Verifique o arquivo .env');
  process.exit(1);
}

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  ssl: montarSsl(),
  max: Number(process.env.DB_POOL_MAX) || 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  // Consulta que passar do limite é cancelada pelo banco em vez de ocupar uma conexão indefinidamente (0 desativa)
  statement_timeout: Number(process.env.DB_STATEMENT_TIMEOUT_MS ?? 30000) || undefined,
});

pool.on('error', (err) => {
  console.error('[DB] Erro inesperado no pool de conexões:', err.message);
});

async function testConnection() {
  const client = await pool.connect();
  const { rows } = await client.query('SELECT NOW() AS agora');
  client.release();
  console.log(`[DB] Conectado ao PostgreSQL em ${rows[0].agora}`);
}

module.exports = { pool, testConnection };
