const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { iniciar } = require('./helpers');

let t;
let original;

const salvar = (corpo, token = t.tokens.admin) => t.chamar('PUT', '/configuracoes', { token, corpo });

before(async () => {
  t = await iniciar();
  original = (await t.chamar('GET', '/configuracoes')).dados.tema_cor;
});

after(async () => {
  await salvar({ tema_cor: original || '' });
  await t.encerrar();
});

test('tema: administrador salva a cor e ela aparece na leitura pública', async () => {
  const r = await salvar({ tema_cor: '#1E3A8A' });
  assert.equal(r.status, 200);
  assert.equal(r.dados.tema_cor, '#1e3a8a');

  const publico = await t.chamar('GET', '/configuracoes');
  assert.equal(publico.dados.tema_cor, '#1e3a8a');
});

test('tema: cor vazia restaura o padrão e outros campos não afetam a cor', async () => {
  await salvar({ tema_cor: '#166534' });
  const outro = await salvar({ nota_mensagem: (await t.chamar('GET', '/configuracoes')).dados.nota_mensagem });
  assert.equal(outro.dados.tema_cor, '#166534');

  const padrao = await salvar({ tema_cor: '' });
  assert.equal(padrao.status, 200);
  assert.equal(padrao.dados.tema_cor, null);
});

test('tema: formato inválido (422) e cor clara demais (400) são recusados', async () => {
  assert.equal((await salvar({ tema_cor: 'azul' })).status, 422);
  assert.equal((await salvar({ tema_cor: '#12345' })).status, 422);

  const clara = await salvar({ tema_cor: '#ffff00' });
  assert.equal(clara.status, 400);
  assert.match(clara.dados.message, /muito clara/i);
});

test('tema: só administrador altera', async () => {
  assert.equal((await salvar({ tema_cor: '#1e3a8a' }, t.tokens.editor)).status, 403);
  assert.equal((await t.chamar('PUT', '/configuracoes', { corpo: { tema_cor: '#1e3a8a' } })).status, 401);
});
