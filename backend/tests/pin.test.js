const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { iniciar } = require('./helpers');

let t;
let editorId;
let tokenAparelho;
let aparelhoId;
const PIN = '4821';

const comAparelho = (token = tokenAparelho) => ({ 'X-Dispositivo': token });

before(async () => {
  t = await iniciar();
  const { rows } = await t.pool.query('SELECT id FROM usuarios WHERE login = $1', [`${t.PREFIXO}editor`]);
  editorId = rows[0].id;
  await t.pool.query('UPDATE usuarios SET pin_hash = NULL, pin_tentativas = 0, pin_bloqueado_ate = NULL');
  await t.pool.query(`DELETE FROM dispositivos WHERE nome LIKE '${t.PREFIXO}%'`);
});

after(async () => {
  await t.pool.query('UPDATE usuarios SET pin_hash = NULL, pin_tentativas = 0, pin_bloqueado_ate = NULL');
  await t.pool.query(`DELETE FROM dispositivos WHERE nome LIKE '${t.PREFIXO}%'`);
  await t.encerrar();
});

test('somente administrador autoriza aparelhos', async () => {
  const semToken = await t.chamar('POST', '/dispositivos', { corpo: { nome: `${t.PREFIXO}x` } });
  assert.equal(semToken.status, 401);
  const editor = await t.chamar('POST', '/dispositivos', { token: t.tokens.editor, corpo: { nome: `${t.PREFIXO}x` } });
  assert.equal(editor.status, 403);
  const semNome = await t.chamar('POST', '/dispositivos', { token: t.tokens.admin, corpo: { nome: '  ' } });
  assert.equal(semNome.status, 422);
});

test('administrador autoriza um aparelho e o token só aparece uma vez', async () => {
  const r = await t.chamar('POST', '/dispositivos', { token: t.tokens.admin, corpo: { nome: `${t.PREFIXO}celular` } });
  assert.equal(r.status, 201);
  assert.ok(r.dados.token && r.dados.token.length >= 20);
  tokenAparelho = r.dados.token;
  aparelhoId = r.dados.id;

  const lista = await t.chamar('GET', '/dispositivos', { token: t.tokens.admin });
  assert.equal(lista.status, 200);
  const item = lista.dados.find((d) => d.id === aparelhoId);
  assert.equal(item.nome, `${t.PREFIXO}celular`);
  assert.equal(item.token, undefined);
  assert.equal(item.token_hash, undefined);
});

test('perfis exigem aparelho autorizado', async () => {
  assert.equal((await t.chamar('GET', '/auth/perfis')).status, 401);
  assert.equal((await t.chamar('GET', '/auth/perfis', { headers: comAparelho('x'.repeat(43)) })).status, 401);
  assert.equal((await t.chamar('GET', '/auth/perfis', { headers: comAparelho() })).status, 200);
});

test('usuário só aparece nos perfis depois que o administrador define o PIN', async () => {
  const antes = await t.chamar('GET', '/auth/perfis', { headers: comAparelho() });
  assert.equal(antes.dados.perfis.find((p) => p.id === editorId), undefined);

  const curto = await t.chamar('PUT', `/usuarios/${editorId}/pin`, { token: t.tokens.admin, corpo: { pin: '12' } });
  assert.equal(curto.status, 400);
  const letras = await t.chamar('PUT', `/usuarios/${editorId}/pin`, { token: t.tokens.admin, corpo: { pin: 'abcd' } });
  assert.equal(letras.status, 400);
  const editor = await t.chamar('PUT', `/usuarios/${editorId}/pin`, { token: t.tokens.editor, corpo: { pin: PIN } });
  assert.equal(editor.status, 403);

  const ok = await t.chamar('PUT', `/usuarios/${editorId}/pin`, { token: t.tokens.admin, corpo: { pin: PIN } });
  assert.equal(ok.status, 200);

  const depois = await t.chamar('GET', '/auth/perfis', { headers: comAparelho() });
  assert.equal(depois.dados.pin_tamanho, 4);
  const perfil = depois.dados.perfis.find((p) => p.id === editorId);
  assert.ok(perfil);
  assert.deepEqual(Object.keys(perfil).sort(), ['id', 'nome']);

  const lista = await t.chamar('GET', '/usuarios', { token: t.tokens.admin });
  assert.equal(lista.dados.find((u) => u.id === editorId).tem_pin, true);
  assert.equal(JSON.stringify(lista.dados).includes('pin_hash'), false);
});

test('login por PIN devolve token que funciona', async () => {
  const r = await t.chamar('POST', '/auth/pin', { headers: comAparelho(), corpo: { usuario_id: editorId, pin: PIN } });
  assert.equal(r.status, 200);
  assert.equal(r.dados.usuario.perfil, 'EDITOR');
  assert.equal(r.dados.usuario.senha, undefined);
  const me = await t.chamar('GET', '/auth/me', { token: r.dados.token });
  assert.equal(me.status, 200);
  assert.equal(me.dados.id, editorId);
});

test('login por PIN exige aparelho autorizado e formato válido', async () => {
  const corpo = { usuario_id: editorId, pin: PIN };
  assert.equal((await t.chamar('POST', '/auth/pin', { corpo })).status, 401);
  assert.equal((await t.chamar('POST', '/auth/pin', { headers: comAparelho(), corpo: { usuario_id: editorId, pin: '12' } })).status, 400);
  assert.equal((await t.chamar('POST', '/auth/pin', { headers: comAparelho(), corpo: { usuario_id: 'abc', pin: PIN } })).status, 422);
});

test('reconfirmar o PIN de quem est\u00e1 logado (sem aparelho): erra, acerta e exige login', async () => {
  const sem = await t.chamar('POST', '/auth/pin/confirmar', { corpo: { pin: PIN } });
  assert.equal(sem.status, 401);

  const errado = await t.chamar('POST', '/auth/pin/confirmar', { token: t.tokens.editor, corpo: { pin: '0000' } });
  assert.equal(errado.status, 401);
  assert.equal((await t.chamar('POST', '/auth/pin/confirmar', { token: t.tokens.editor, corpo: { pin: '12' } })).status, 400);

  const certo = await t.chamar('POST', '/auth/pin/confirmar', { token: t.tokens.editor, corpo: { pin: PIN } });
  assert.equal(certo.status, 200);
  assert.equal(certo.dados.ok, true);

  // quem n\u00e3o tem PIN n\u00e3o passa; /auth/me informa se tem PIN
  const semPin = await t.chamar('POST', '/auth/pin/confirmar', { token: t.tokens.admin, corpo: { pin: PIN } });
  assert.equal(semPin.status, 401);
  assert.equal((await t.chamar('GET', '/auth/me', { token: t.tokens.admin })).dados.tem_pin, false);
  assert.equal((await t.chamar('GET', '/auth/me', { token: t.tokens.editor })).dados.tem_pin, true);
});

test('esqueci o PIN: reconfirmar a senha de quem est\u00e1 logado', async () => {
  const sem = await t.chamar('POST', '/auth/senha/confirmar', { corpo: { senha: t.SENHA } });
  assert.equal(sem.status, 401);
  assert.equal((await t.chamar('POST', '/auth/senha/confirmar', { token: t.tokens.editor, corpo: {} })).status, 422);

  const errada = await t.chamar('POST', '/auth/senha/confirmar', { token: t.tokens.editor, corpo: { senha: 'errada-123' } });
  assert.equal(errada.status, 401);
  assert.equal(errada.dados.message, 'Senha incorreta');

  const certa = await t.chamar('POST', '/auth/senha/confirmar', { token: t.tokens.editor, corpo: { senha: t.SENHA } });
  assert.equal(certa.status, 200);
  assert.equal(certa.dados.ok, true);
});

test('perfil inexistente ou sem PIN responde como PIN incorreto', async () => {
  const { rows } = await t.pool.query('SELECT id FROM usuarios WHERE login = $1', [`${t.PREFIXO}admin`]);
  const semPin = await t.chamar('POST', '/auth/pin', { headers: comAparelho(), corpo: { usuario_id: rows[0].id, pin: PIN } });
  assert.equal(semPin.status, 401);
  const inexistente = await t.chamar('POST', '/auth/pin', { headers: comAparelho(), corpo: { usuario_id: 2147483000, pin: PIN } });
  assert.equal(inexistente.status, 401);
  assert.equal(semPin.dados.message, inexistente.dados.message);
});

test('PIN incorreto: 401 e bloqueio de 15 min após 5 erros, mesmo com o PIN certo', async () => {
  const errado = { usuario_id: editorId, pin: '0000' };
  for (let i = 0; i < 4; i++) {
    const r = await t.chamar('POST', '/auth/pin', { headers: comAparelho(), corpo: errado });
    assert.equal(r.status, 401);
  }
  const quinta = await t.chamar('POST', '/auth/pin', { headers: comAparelho(), corpo: errado });
  assert.equal(quinta.status, 429);

  const certo = await t.chamar('POST', '/auth/pin', { headers: comAparelho(), corpo: { usuario_id: editorId, pin: PIN } });
  assert.equal(certo.status, 429);

  // o login com senha continua funcionando
  const senha = await t.chamar('POST', '/auth/login', { corpo: { login: `${t.PREFIXO}editor`, senha: t.SENHA } });
  assert.equal(senha.status, 200);

  // redefinir o PIN desbloqueia
  await t.chamar('PUT', `/usuarios/${editorId}/pin`, { token: t.tokens.admin, corpo: { pin: PIN } });
  const liberado = await t.chamar('POST', '/auth/pin', { headers: comAparelho(), corpo: { usuario_id: editorId, pin: PIN } });
  assert.equal(liberado.status, 200);
});

test('acerto zera o contador de erros', async () => {
  const errado = { usuario_id: editorId, pin: '0000' };
  for (let i = 0; i < 3; i++) await t.chamar('POST', '/auth/pin', { headers: comAparelho(), corpo: errado });
  const ok = await t.chamar('POST', '/auth/pin', { headers: comAparelho(), corpo: { usuario_id: editorId, pin: PIN } });
  assert.equal(ok.status, 200);
  for (let i = 0; i < 3; i++) {
    const r = await t.chamar('POST', '/auth/pin', { headers: comAparelho(), corpo: errado });
    assert.equal(r.status, 401);
  }
  await t.chamar('POST', '/auth/pin', { headers: comAparelho(), corpo: { usuario_id: editorId, pin: PIN } });
});

test('usuário inativo não entra por PIN nem aparece nos perfis', async () => {
  await t.pool.query('UPDATE usuarios SET ativo = FALSE WHERE id = $1', [editorId]);
  try {
    const perfis = await t.chamar('GET', '/auth/perfis', { headers: comAparelho() });
    assert.equal(perfis.dados.perfis.find((p) => p.id === editorId), undefined);
    const r = await t.chamar('POST', '/auth/pin', { headers: comAparelho(), corpo: { usuario_id: editorId, pin: PIN } });
    assert.equal(r.status, 401);
  } finally {
    await t.pool.query('UPDATE usuarios SET ativo = TRUE WHERE id = $1', [editorId]);
  }
});

test('remover o PIN tira o usuário dos perfis', async () => {
  const r = await t.chamar('DELETE', `/usuarios/${editorId}/pin`, { token: t.tokens.admin });
  assert.equal(r.status, 200);
  const perfis = await t.chamar('GET', '/auth/perfis', { headers: comAparelho() });
  assert.equal(perfis.dados.perfis.find((p) => p.id === editorId), undefined);
  const inexistente = await t.chamar('PUT', '/usuarios/2147483000/pin', { token: t.tokens.admin, corpo: { pin: PIN } });
  assert.equal(inexistente.status, 404);
});

test('revogar o aparelho bloqueia perfis e PIN', async () => {
  await t.chamar('PUT', `/usuarios/${editorId}/pin`, { token: t.tokens.admin, corpo: { pin: PIN } });

  const editor = await t.chamar('DELETE', `/dispositivos/${aparelhoId}`, { token: t.tokens.editor });
  assert.equal(editor.status, 403);

  const rev = await t.chamar('DELETE', `/dispositivos/${aparelhoId}`, { token: t.tokens.admin });
  assert.equal(rev.status, 200);
  assert.equal((await t.chamar('GET', '/auth/perfis', { headers: comAparelho() })).status, 401);
  const r = await t.chamar('POST', '/auth/pin', { headers: comAparelho(), corpo: { usuario_id: editorId, pin: PIN } });
  assert.equal(r.status, 401);
  assert.equal((await t.chamar('DELETE', `/dispositivos/${aparelhoId}`, { token: t.tokens.admin })).status, 404);
});

test('editor pode ser criado sem senha, só com PIN; administrador não', async () => {
  const login = `${t.PREFIXO}so_pin`;
  await t.pool.query('DELETE FROM usuarios WHERE login = $1', [login]);
  const disp = await t.chamar('POST', '/dispositivos', { token: t.tokens.admin, corpo: { nome: `${t.PREFIXO}celular2` } });
  const headers = comAparelho(disp.dados.token);
  try {
    const semNada = await t.chamar('POST', '/usuarios', { token: t.tokens.admin, corpo: { nome: 'Anne', login } });
    assert.equal(semNada.status, 400);
    const admin = await t.chamar('POST', '/usuarios', { token: t.tokens.admin, corpo: { nome: 'Anne', login, perfil: 'ADMIN', pin: '1357' } });
    assert.equal(admin.status, 400);
    const pinCurto = await t.chamar('POST', '/usuarios', { token: t.tokens.admin, corpo: { nome: 'Anne', login, pin: '13' } });
    assert.equal(pinCurto.status, 400);

    const ok = await t.chamar('POST', '/usuarios', { token: t.tokens.admin, corpo: { nome: 'Anne', login, pin: '1357' } });
    assert.equal(ok.status, 201);
    const id = ok.dados.id;

    const perfis = await t.chamar('GET', '/auth/perfis', { headers });
    assert.ok(perfis.dados.perfis.find((p) => p.id === id));
    const porPin = await t.chamar('POST', '/auth/pin', { headers, corpo: { usuario_id: id, pin: '1357' } });
    assert.equal(porPin.status, 200);
    assert.equal(porPin.dados.usuario.perfil, 'EDITOR');

    // sem senha utilizável: o login com senha falha
    const porSenha = await t.chamar('POST', '/auth/login', { corpo: { login, senha: '1357' } });
    assert.equal(porSenha.status, 401);
  } finally {
    await t.pool.query('DELETE FROM usuarios WHERE login = $1', [login]);
  }
});

test('configurações informam o tamanho do PIN', async () => {
  const r = await t.chamar('GET', '/configuracoes', { token: t.tokens.editor });
  assert.equal(r.status, 200);
  assert.equal(r.dados.pin_tamanho, 4);
});
