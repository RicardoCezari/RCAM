const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { iniciar } = require('./helpers');

let t;
let configuracoes;
let configuracaoOriginal;

before(async () => {
  t = await iniciar();
  configuracoes = require('../src/repositories/configuracoesRepository');
  configuracaoOriginal = await configuracoes.buscar('impressora_rede');
  await configuracoes.remover('impressora_rede');
});

after(async () => {
  if (configuracaoOriginal) await configuracoes.salvar('impressora_rede', configuracaoOriginal);
  else await configuracoes.remover('impressora_rede');
  await t.encerrar();
});

test('conexão da impressora usa cabo de rede por padrão e não é pública', async () => {
  const inicial = await t.chamar('GET', '/configuracoes/impressora', { token: t.tokens.admin });
  assert.equal(inicial.status, 200);
  assert.deepEqual(inicial.dados, { tipoConexao: 'ethernet', enderecoIp: '' });

  const publico = await t.chamar('GET', '/configuracoes');
  assert.equal(Object.hasOwn(publico.dados, 'impressora_rede'), false);
  assert.equal((await t.chamar('GET', '/configuracoes/impressora')).status, 401);
  assert.equal((await t.chamar('GET', '/configuracoes/impressora', { token: t.tokens.editor })).status, 403);
});

test('administrador salva e recupera conexão Ethernet ou Wi-Fi com IPv4', async () => {
  const ethernet = { tipoConexao: 'ethernet', enderecoIp: '192.168.1.24' };
  const salvoEthernet = await t.chamar('PUT', '/configuracoes/impressora', { token: t.tokens.admin, corpo: ethernet });
  assert.equal(salvoEthernet.status, 200);
  assert.deepEqual(salvoEthernet.dados, ethernet);

  const wifi = { tipoConexao: 'wifi', enderecoIp: '10.0.0.35' };
  const salvoWifi = await t.chamar('PUT', '/configuracoes/impressora', { token: t.tokens.admin, corpo: wifi });
  assert.equal(salvoWifi.status, 200);
  const recuperado = await t.chamar('GET', '/configuracoes/impressora', { token: t.tokens.admin });
  assert.deepEqual(recuperado.dados, wifi);
});

test('conexão da impressora rejeita modo desconhecido e IP inválido', async () => {
  const modoInvalido = await t.chamar('PUT', '/configuracoes/impressora', {
    token: t.tokens.admin,
    corpo: { tipoConexao: 'bluetooth', enderecoIp: '' },
  });
  const ipInvalido = await t.chamar('PUT', '/configuracoes/impressora', {
    token: t.tokens.admin,
    corpo: { tipoConexao: 'wifi', enderecoIp: '999.168.1.2' },
  });
  assert.equal(modoInvalido.status, 422);
  assert.equal(ipInvalido.status, 422);
});
