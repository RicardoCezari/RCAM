/*
 * JWT: expiração, adulteração, algoritmo "none", segredo errado, emissor/audiência e revogação por troca de senha.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { iniciar } = require('./helpers');

let t; let usuario;
before(async () => {
  t = await iniciar();
  const hash = await bcrypt.hash(t.SENHA, 4);
  await t.pool.query(
    `INSERT INTO usuarios (nome, login, senha, ativo, perfil) VALUES ($1, $1, $2, TRUE, 'EDITOR')
     ON CONFLICT (login) DO UPDATE SET senha = EXCLUDED.senha, ativo = TRUE`,
    [`${t.PREFIXO}jwt`, hash]
  );
  usuario = (await t.pool.query('SELECT id FROM usuarios WHERE login = $1', [`${t.PREFIXO}jwt`])).rows[0];
});
after(async () => {
  await t.pool.query('DELETE FROM usuarios WHERE login = $1', [`${t.PREFIXO}jwt`]).catch(() => {});
  await t.encerrar();
});

const entrar = async () => (await t.chamar('POST', '/auth/login', { corpo: { login: `${t.PREFIXO}jwt`, senha: t.SENHA } })).dados.token;
const me = (token) => t.chamar('GET', '/auth/me', { token });
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');

describe('Tokens JWT', () => {
  test('token válido é aceito e carrega iss/aud', async () => {
    const token = await entrar();
    assert.equal((await me(token)).status, 200);
    const { iss, aud, exp, iat } = jwt.decode(token);
    assert.ok(iss && aud, 'iss/aud presentes');
    assert.ok(exp - iat <= 8 * 3600, 'expira em no máximo 8h');
  });

  test('token expirado é recusado com mensagem de sessão expirada', async () => {
    const valido = jwt.decode(await entrar());
    const expirado = jwt.sign({ ...valido, iat: valido.iat - 7200, exp: valido.iat - 3600 }, process.env.JWT_SECRET, { algorithm: 'HS256' });
    const r = await me(expirado);
    assert.equal(r.status, 401);
    assert.match(r.dados.message, /expirada/i);
  });

  test('assinatura adulterada é recusada', async () => {
    const token = await entrar();
    const [h, p, s] = token.split('.');
    const adulterado = `${h}.${p}.${s.slice(0, -2)}${s.endsWith('AA') ? 'BB' : 'AA'}`;
    assert.equal((await me(adulterado)).status, 401);
  });

  test('payload alterado (outro usuário) com a assinatura original é recusado', async () => {
    const [h, p, s] = (await entrar()).split('.');
    const payload = JSON.parse(Buffer.from(p, 'base64url').toString());
    payload.sub = 1;
    assert.equal((await me(`${h}.${b64(payload)}.${s}`)).status, 401);
  });

  test('algoritmo "none" é recusado', async () => {
    const payload = jwt.decode(await entrar());
    const semAssinatura = `${b64({ alg: 'none', typ: 'JWT' })}.${b64(payload)}.`;
    assert.equal((await me(semAssinatura)).status, 401);
  });

  test('token assinado com outro segredo é recusado', async () => {
    const payload = jwt.decode(await entrar());
    const falso = jwt.sign(payload, 'outro-segredo-qualquer-com-mais-de-32-caracteres', { algorithm: 'HS256' });
    assert.equal((await me(falso)).status, 401);
  });

  test('token com assinatura correta mas sem emissor/audiência do sistema é recusado', async () => {
    const { sub, nome, login } = jwt.decode(await entrar());
    const semIssAud = jwt.sign({ sub, nome, login }, process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '1h' });
    assert.equal((await me(semIssAud)).status, 401);
  });

  test('troca de senha revoga os tokens anteriores', async () => {
    const antigo = await entrar();
    assert.equal((await me(antigo)).status, 200);
    const novoHash = await bcrypt.hash('outra-senha-9999', 4);
    await t.pool.query('UPDATE usuarios SET senha = $1 WHERE id = $2', [novoHash, usuario.id]);
    assert.equal((await me(antigo)).status, 401);
    // o novo login funciona e emite um token válido
    const r = await t.chamar('POST', '/auth/login', { corpo: { login: `${t.PREFIXO}jwt`, senha: 'outra-senha-9999' } });
    assert.equal(r.status, 200);
    assert.equal((await me(r.dados.token)).status, 200);
  });

  test('usuário desativado perde o acesso mesmo com token válido', async () => {
    const hash = await bcrypt.hash(t.SENHA, 4);
    await t.pool.query('UPDATE usuarios SET senha = $1, ativo = TRUE WHERE id = $2', [hash, usuario.id]);
    const token = await entrar();
    await t.pool.query('UPDATE usuarios SET ativo = FALSE WHERE id = $1', [usuario.id]);
    assert.equal((await me(token)).status, 401);
  });
});
