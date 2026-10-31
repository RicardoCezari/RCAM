const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { iniciar } = require('./helpers');

let t;
let configuracoes;
let layoutOriginal;

const layoutTeste = {
  larguraMm: 58,
  espacamento: 'amplo',
  cliente: ['cliente', 'telefone', 'numeroOs', 'itens', 'total', 'logo', 'mensagem', 'rodape'],
  loja: ['cliente', 'telefone', 'numeroOs', 'itens', 'total', 'observacoes', 'assinatura', 'rodape'],
};

before(async () => {
  t = await iniciar();
  configuracoes = require('../src/repositories/configuracoesRepository');
  layoutOriginal = await configuracoes.buscar('nota_layout');
  await configuracoes.remover('nota_layout');
});

after(async () => {
  if (layoutOriginal) await configuracoes.salvar('nota_layout', layoutOriginal);
  else await configuracoes.remover('nota_layout');
  await t.encerrar();
});

test('layout da nota mantém padrão térmico e permite personalização do administrador', async () => {
  const inicial = await t.chamar('GET', '/configuracoes', { token: t.tokens.admin });
  assert.equal(inicial.dados.nota_layout.larguraMm, 80);
  assert.equal(inicial.dados.nota_layout.espacamento, 'normal');

  const salvo = await t.chamar('PUT', '/configuracoes', { token: t.tokens.admin, corpo: { nota_layout: layoutTeste } });
  assert.equal(salvo.status, 200);
  assert.deepEqual(salvo.dados.nota_layout, layoutTeste);

  const publico = await t.chamar('GET', '/configuracoes');
  assert.deepEqual(publico.dados.nota_layout, layoutTeste);
});

test('layout da nota rejeita dimensões inválidas e blocos internos na via do cliente', async () => {
  const larguraInvalida = await t.chamar('PUT', '/configuracoes', {
    token: t.tokens.admin,
    corpo: { nota_layout: { ...layoutTeste, larguraMm: 120 } },
  });
  assert.equal(larguraInvalida.status, 422);

  const observacaoExposta = await t.chamar('PUT', '/configuracoes', {
    token: t.tokens.admin,
    corpo: { nota_layout: { ...layoutTeste, cliente: [...layoutTeste.cliente, 'observacoes'] } },
  });
  assert.equal(observacaoExposta.status, 422);
});

test('somente administradores podem alterar o layout da nota', async () => {
  const editor = await t.chamar('PUT', '/configuracoes', { token: t.tokens.editor, corpo: { nota_layout: layoutTeste } });
  assert.equal(editor.status, 403);
});
