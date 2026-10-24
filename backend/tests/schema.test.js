/*
 * DB/schema.sql é o único arquivo de schema: deve criar tudo em banco vazio e poder rodar de novo sem erro.
 * Usa um banco temporário (azteca_schema_test), removido ao final.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { Client } = require('pg');
const { montarSsl } = require('../src/config/dbSsl');

const BANCO = 'azteca_schema_test';
const SQL = fs.readFileSync(path.resolve(__dirname, '../../DB/schema.sql'), 'utf8');
const cliente = (database) => new Client({
  host: process.env.DB_HOST || 'localhost', port: Number(process.env.DB_PORT) || 5432, user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD, ssl: montarSsl(), database,
});

let adm;
let db;

before(async () => {
  adm = cliente('postgres');
  await adm.connect();
  await adm.query(`DROP DATABASE IF EXISTS ${BANCO}`);
  await adm.query(`CREATE DATABASE ${BANCO}`);
  db = cliente(BANCO);
  await db.connect();
});

after(async () => {
  await db.end();
  await adm.query(`DROP DATABASE IF EXISTS ${BANCO}`);
  await adm.end();
});

test('cria o schema completo em banco vazio e é idempotente', async () => {
  await db.query(SQL);
  await db.query(SQL);

  const tabelas = (await db.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public'")).rows.map((r) => r.tablename);
  for (const t of ['usuarios', 'clientes', 'servicos', 'tipos_objeto', 'tipo_objeto_servicos', 'ordens_servico', 'itens_ordem_servico', 'ordem_fotos', 'ordem_historico', 'configuracoes']) {
    assert.ok(tabelas.includes(t), `tabela ${t}`);
  }
  assert.ok(!tabelas.includes('schema_migrations'), 'não há mais controle de migrações');

  const indices = (await db.query("SELECT indexname FROM pg_indexes WHERE schemaname = 'public'")).rows.map((r) => r.indexname);
  for (const i of ['uq_clientes_telefone_digitos', 'idx_os_criacao', 'idx_clientes_email_trgm', 'idx_clientes_info_trgm',
    'idx_os_observacoes_trgm', 'idx_ordem_historico_item', 'idx_ordem_fotos_item']) {
    assert.ok(indices.includes(i), `índice ${i}`);
  }
  assert.equal((await db.query('SELECT COUNT(*)::int n FROM pg_index WHERE NOT indisvalid')).rows[0].n, 0);
});

test('triggers calculam o total da O.S. a partir dos itens', async () => {
  const { rows: [u] } = await db.query("INSERT INTO usuarios (nome, login, perfil) VALUES ('t', 't', 'ADMIN') RETURNING id");
  const { rows: [c] } = await db.query("INSERT INTO clientes (nome, telefone) VALUES ('c', '11999990000') RETURNING id");
  const { rows: [tipo] } = await db.query("INSERT INTO tipos_objeto (nome) VALUES ('relogio') RETURNING id");
  const { rows: [s] } = await db.query("INSERT INTO servicos (nome, valor) VALUES ('troca de pilha', 25) RETURNING id");
  const { rows: [os] } = await db.query(
    'INSERT INTO ordens_servico (cliente_id, usuario_id, data_entrega) VALUES ($1, $2, CURRENT_DATE) RETURNING id', [c.id, u.id]);
  await db.query('INSERT INTO itens_ordem_servico (ordem_id, tipo_objeto_id, servico_id, quantidade, valor_unitario) VALUES ($1, $2, $3, 2, 0)', [os.id, tipo.id, s.id]);
  const { rows: [r] } = await db.query('SELECT valor_total::float v FROM ordens_servico WHERE id = $1', [os.id]);
  assert.equal(r.v, 50);
});
