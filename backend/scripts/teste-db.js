/*
 * Prepara o banco de TESTE (nunca o banco de desenvolvimento/produção):
 *   - cria o banco `azteca_test` (ou TEST_DB_NAME) se não existir
 *   - aplica DB/schema.sql (idempotente) nesse banco
 *
 * Uso: node scripts/teste-db.js
 */
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { Client } = require('pg');
const { montarSsl } = require('../src/config/dbSsl');

const ARQUIVO_SCHEMA = path.resolve(__dirname, '../../DB/schema.sql');

const NOME_BANCO_TESTE = process.env.TEST_DB_NAME || 'azteca_test';

if (!/_test$/.test(NOME_BANCO_TESTE)) {
  console.error(`[TESTE-DB] Nome de banco inválido para testes: ${NOME_BANCO_TESTE} (deve terminar em _test)`);
  process.exit(1);
}

function conexao(database) {
  return new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    ssl: montarSsl(),
    database,
  });
}

async function prepararBancoDeTeste() {
  const adm = conexao('postgres');
  await adm.connect();
  try {
    const { rowCount } = await adm.query('SELECT 1 FROM pg_database WHERE datname = $1', [NOME_BANCO_TESTE]);
    if (!rowCount) await adm.query(`CREATE DATABASE "${NOME_BANCO_TESTE}"`);
  } finally {
    await adm.end();
  }

  // A partir daqui todos os módulos da aplicação passam a usar o banco de teste
  process.env.DB_NAME = NOME_BANCO_TESTE;

  const { pool } = require('../src/config/database');
  await pool.query(fs.readFileSync(ARQUIVO_SCHEMA, 'utf8'));
  return pool;
}

module.exports = { prepararBancoDeTeste, NOME_BANCO_TESTE };

if (require.main === module) {
  prepararBancoDeTeste()
    .then(async (pool) => {
      console.log(`[TESTE-DB] Banco ${NOME_BANCO_TESTE} pronto.`);
      await pool.end();
    })
    .catch((err) => {
      console.error('[TESTE-DB] Falha:', err.message);
      process.exit(1);
    });
}
