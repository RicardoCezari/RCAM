/*
 * API para os testes no navegador (Playwright). Usa SEMPRE o banco de teste (azteca_test), nunca o de desenvolvimento.
 * Cria os usuários zz_e2e_admin / zz_e2e_editor e sobe a API na porta E2E_API_PORT (padrão 3100).
 *
 * Uso: node scripts/e2e-server.js
 */
const bcrypt = require('bcryptjs');

const PORTA = Number(process.env.E2E_API_PORT) || 3100;
const ORIGEM_WEB = process.env.E2E_WEB_ORIGIN || 'http://127.0.0.1:5174';

process.env.NODE_ENV = 'test';
process.env.CORS_ORIGINS = ORIGEM_WEB;
process.env.JWT_SECRET = process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32
  ? process.env.JWT_SECRET
  : 'segredo-e2e-com-mais-de-32-caracteres-aleatorios';

const SENHA = 'e2e-senha-1234';

async function main() {
  const { prepararBancoDeTeste, NOME_BANCO_TESTE } = require('./teste-db');
  const pool = await prepararBancoDeTeste();

  const hash = await bcrypt.hash(SENHA, 4);
  for (const [login, perfil] of [['zz_e2e_admin', 'ADMIN'], ['zz_e2e_editor', 'EDITOR']]) {
    await pool.query(
      `INSERT INTO usuarios (nome, login, senha, ativo, perfil) VALUES ($1, $1, $2, TRUE, $3)
       ON CONFLICT (login) DO UPDATE SET senha = EXCLUDED.senha, ativo = TRUE, perfil = EXCLUDED.perfil`,
      [login, hash, perfil]
    );
  }

  const app = require('../src/app');
  const server = app.listen(PORTA, () => {
    console.log(`[E2E] API de teste em http://127.0.0.1:${PORTA} (banco ${NOME_BANCO_TESTE}, origem ${ORIGEM_WEB})`);
  });

  const encerrar = () => server.close(() => pool.end().finally(() => process.exit(0)));
  process.on('SIGINT', encerrar);
  process.on('SIGTERM', encerrar);
}

main().catch((err) => {
  console.error('[E2E] Falha ao iniciar:', err.message);
  process.exit(1);
});
