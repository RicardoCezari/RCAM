/**
 * Cria um usuário. Nunca altera usuários já existentes, a menos que --redefinir-senha seja informado.
 *
 * Uso:
 *   node scripts/seed-usuario.js <login> "<Nome>" [ADMIN|EDITOR] [--redefinir-senha]
 *
 * A senha vem da variável SEED_SENHA (mínimo 8 caracteres). Se ausente, é gerada uma senha
 * aleatória, exibida uma única vez no terminal.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { pool } = require('../src/config/database');

async function seed() {
  const args = process.argv.slice(2);
  const redefinir = args.includes('--redefinir-senha');
  const [login, nome, perfilArg] = args.filter((a) => !a.startsWith('--'));
  const perfil = (perfilArg || 'EDITOR').toUpperCase();

  if (!login || !nome || !['ADMIN', 'EDITOR'].includes(perfil)) {
    console.error('Uso: node scripts/seed-usuario.js <login> "<Nome>" [ADMIN|EDITOR] [--redefinir-senha]');
    process.exit(1);
  }

  const senhaInformada = process.env.SEED_SENHA;
  if (senhaInformada && senhaInformada.length < 8) {
    console.error('SEED_SENHA deve ter ao menos 8 caracteres.');
    process.exit(1);
  }
  const senha = senhaInformada || crypto.randomBytes(9).toString('base64url');
  const hash = await bcrypt.hash(senha, 12);

  const { rows } = await pool.query('SELECT id FROM usuarios WHERE login = $1', [login]);
  if (rows.length && !redefinir) {
    console.error(`O usuário "${login}" já existe. Use --redefinir-senha para trocar a senha.`);
    process.exit(1);
  }

  if (rows.length) {
    await pool.query('UPDATE usuarios SET senha = $2, ativo = true WHERE login = $1', [login, hash]);
    console.log(`Senha de "${login}" redefinida.`);
  } else {
    await pool.query(
      'INSERT INTO usuarios (nome, login, senha, ativo, perfil) VALUES ($1, $2, $3, true, $4)',
      [nome, login, hash, perfil]
    );
    console.log(`Usuário "${login}" criado com perfil ${perfil}.`);
  }
  if (!senhaInformada) console.log(`Senha gerada (anote agora, não será exibida novamente): ${senha}`);
}

seed()
  .catch((err) => {
    console.error('Erro:', err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
