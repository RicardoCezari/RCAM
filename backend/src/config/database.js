const { Pool } = require('pg');

if (!process.env.DB_PASSWORD) {
  console.error('[DB] ERRO: DB_PASSWORD não definido. Verifique o arquivo .env');
  process.exit(1);
}

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'azteca_os',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
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
