/**
 * Script para criar/resetar a senha de um usuário.
 * Uso: node scripts/seed-usuario.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const bcrypt = require('bcryptjs');
const { pool } = require('../src/config/database');

const USUARIOS = [
  { nome: 'Ricardo', login: 'ricardo', senha: '123456' },
  { nome: 'Ariane',  login: 'ariane',  senha: '123456' },
  { nome: 'Guilherme', login: 'guilherme', senha: '123456' },
  { nome: 'Lucas',   login: 'lucas',   senha: '123456' },
];

async function seed() {
  console.log('Criando/atualizando usuários...\n');

  for (const u of USUARIOS) {
    const hash = await bcrypt.hash(u.senha, 12);

    await pool.query(
      `INSERT INTO usuarios (nome, login, senha, ativo)
       VALUES ($1, $2, $3, true)
       ON CONFLICT (login) DO UPDATE SET senha = EXCLUDED.senha, ativo = true`,
      [u.nome, u.login, hash]
    );

    console.log(`  ✓ ${u.login} — senha: ${u.senha}`);
  }

  console.log('\nPronto! Use POST /api/auth/login com login + senha acima.');
  await pool.end();
}

seed().catch((err) => {
  console.error('Erro:', err.message);
  process.exit(1);
});
