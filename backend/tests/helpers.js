/*
 * Infraestrutura dos testes de integração (API + banco PostgreSQL de teste).
 * Sempre usa o banco azteca_test; nunca toca o banco de desenvolvimento.
 */
const bcrypt = require('bcryptjs');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32
  ? process.env.JWT_SECRET
  : 'segredo-de-teste-com-mais-de-32-caracteres!!';

const SENHA = 'teste-1234';
const PREFIXO = 'zz_teste_';

async function iniciar() {
  const { prepararBancoDeTeste } = require('../scripts/teste-db');
  const pool = await prepararBancoDeTeste();
  const app = require('../src/app');

  const hash = await bcrypt.hash(SENHA, 4);
  for (const [login, perfil] of [[`${PREFIXO}admin`, 'ADMIN'], [`${PREFIXO}editor`, 'EDITOR']]) {
    await pool.query(
      `INSERT INTO usuarios (nome, login, senha, ativo, perfil) VALUES ($1, $2, $3, TRUE, $4)
       ON CONFLICT (login) DO UPDATE SET senha = EXCLUDED.senha, ativo = TRUE, perfil = EXCLUDED.perfil`,
      [login, login, hash, perfil]
    );
  }

  await pool.query(`INSERT INTO tipos_objeto (nome) VALUES ('${PREFIXO}tipo') ON CONFLICT DO NOTHING`);
  await pool.query(`INSERT INTO servicos (nome, valor) VALUES ('${PREFIXO}servico', 50) ON CONFLICT DO NOTHING`);
  const { rows: [tipo] } = await pool.query(`SELECT id FROM tipos_objeto WHERE nome = '${PREFIXO}tipo'`);
  const { rows: [servico] } = await pool.query(`SELECT id FROM servicos WHERE nome = '${PREFIXO}servico'`);

  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}/api`;

  async function chamar(metodo, caminho, { token, corpo, headers = {} } = {}) {
    const resp = await fetch(`${base}${caminho}`, {
      method: metodo,
      headers: {
        ...(corpo ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
    const texto = await resp.text();
    let dados = null;
    try { dados = texto ? JSON.parse(texto) : null; } catch { dados = texto; }
    return { status: resp.status, dados };
  }

  async function login(perfil) {
    const r = await chamar('POST', '/auth/login', { corpo: { login: `${PREFIXO}${perfil}`, senha: SENHA } });
    if (r.status !== 200) throw new Error(`Falha no login de teste (${r.status})`);
    return r.dados.token;
  }

  const tokens = { admin: await login('admin'), editor: await login('editor') };
  let seq = Date.now() % 1e8;
  const criados = { clientes: [] };

  /* Telefone único (11 dígitos) para cada cliente criado nos testes */
  const novoTelefone = () => `99${String(seq++).padStart(9, '0')}`.slice(0, 11);

  async function criarCliente(extra = {}) {
    const telefone = extra.telefone ?? novoTelefone();
    const r = await chamar('POST', '/clientes', { token: tokens.editor, corpo: { nome: `${PREFIXO}cliente ${telefone}`, telefone, ...extra } });
    if (r.status === 201) criados.clientes.push(r.dados.id);
    return r;
  }

  async function limpar() {
    if (criados.clientes.length) {
      await pool.query('DELETE FROM ordens_servico WHERE cliente_id = ANY($1::int[])', [criados.clientes]);
      await pool.query('DELETE FROM clientes WHERE id = ANY($1::int[])', [criados.clientes]);
    }
    await pool.query(`DELETE FROM clientes WHERE nome LIKE '${PREFIXO}%'`).catch(() => {});
  }

  async function encerrar() {
    await limpar();
    await new Promise((r) => server.close(r));
    await pool.end();
  }

  return {
    pool, chamar, base, tokens, tipoId: tipo.id, servicoId: servico.id,
    criarCliente, novoTelefone, limpar, encerrar, SENHA, PREFIXO,
  };
}

module.exports = { iniciar };
