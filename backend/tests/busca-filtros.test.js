/*
 * Busca global e filtros por coluna (clientes e O.S.), no servidor.
 * Cobre os comportamentos restaurados na etapa 2 e a regressão da busca mista (texto + dígito).
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { iniciar } = require('./helpers');

let t;
before(async () => { t = await iniciar(); });
after(async () => { await t.encerrar(); });

const unico = () => `tk${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
const ed = () => ({ token: t.tokens.editor });
const lista = (caminho) => t.chamar('GET', caminho, ed());
const ids = (r) => r.dados.data.map((x) => x.id);

describe('Clientes: busca global e filtros por coluna', () => {
  test('busca mista (texto + dígito) não vira OR com telefone/CPF', async () => {
    const tk = unico();
    const a = (await t.criarCliente({ nome: `${t.PREFIXO}${tk} Lista 01` })).dados;
    // muitos telefones contêm "1": antes da correção, a consulta devolvia clientes aleatórios
    await t.criarCliente({ nome: `${t.PREFIXO}${tk} Outro 02` });
    await t.criarCliente({ nome: `${t.PREFIXO}${tk} Outro 03` });

    const r = await lista(`/clientes?q=${encodeURIComponent(`${t.PREFIXO}${tk} Lista 01`)}&limit=50`);
    assert.equal(r.status, 200);
    assert.deepEqual(ids(r), [a.id]);
    assert.equal(r.dados.total, 1);
  });

  test('busca global encontra por e-mail e por observações', async () => {
    const tk = unico();
    const c = (await t.criarCliente({ email: `${tk}@exemplo.com`, informacao_adicional: `anotacao ${tk} especial` })).dados;
    assert.ok(ids(await lista(`/clientes?q=${tk}@exemplo&limit=50`)).includes(c.id), 'e-mail');
    assert.ok(ids(await lista(`/clientes?q=${encodeURIComponent(`anotacao ${tk}`)}&limit=50`)).includes(c.id), 'observações');
    assert.equal((await lista(`/clientes?q=${tk}inexistente`)).dados.total, 0);
  });

  test('busca numérica continua encontrando por telefone formatado e CPF', async () => {
    const telefone = t.novoTelefone();
    const c = (await t.criarCliente({ telefone })).dados;
    const formatado = `(${telefone.slice(0, 2)}) ${telefone.slice(2, 7)}-${telefone.slice(7)}`;
    assert.ok(ids(await lista(`/clientes?q=${encodeURIComponent(formatado)}&limit=20`)).includes(c.id));
  });

  test('filtros por coluna: nome, e-mail, observações e telefone', async () => {
    const tk = unico();
    const telefone = t.novoTelefone();
    const c = (await t.criarCliente({ telefone, nome: `${t.PREFIXO}${tk} Coluna`, email: `${tk}@col.com`, informacao_adicional: `obs ${tk}` })).dados;
    for (const filtro of [`nome=${tk}`, `email=${tk}@col`, `observacoes=obs%20${tk}`, `telefone=${telefone.slice(3)}`]) {
      assert.ok(ids(await lista(`/clientes?${filtro}&limit=20`)).includes(c.id), filtro);
    }
    // filtros combinam em E, não em OU
    assert.equal((await lista(`/clientes?nome=${tk}&email=nao-existe-${tk}`)).dados.total, 0);
  });

  test('caracteres curinga do LIKE são tratados como texto', async () => {
    const r = await lista(`/clientes?q=${encodeURIComponent('%')}&limit=5`);
    assert.equal(r.status, 200);
    const todos = await lista('/clientes?limit=1');
    assert.ok(r.dados.total < todos.dados.total, '"%" não pode casar com tudo');
  });
});

describe('Ordens de serviço: filtros de data, valor e busca global', () => {
  let cliente; let tk; let os;
  const corpoOs = (extra = {}) => ({
    token: t.tokens.editor,
    corpo: {
      cliente_id: cliente.id, data_entrega: '2031-03-15', observacoes: `obs ${tk} especial`,
      itens: [{ tipo_objeto_id: t.tipoId, servico_id: t.servicoId, quantidade: 2, valor_unitario: 30 }],
      ...extra,
    },
  });

  before(async () => {
    tk = unico();
    cliente = (await t.criarCliente({ email: `${tk}@os.com` })).dados;
    os = (await t.chamar('POST', '/ordens', corpoOs())).dados;
  });

  const achou = async (query) => ids(await lista(`/ordens?clienteId=${cliente.id}&limit=100&${query}`)).includes(os.id);

  test('filtra pela data de entrega (intervalo fechado)', async () => {
    assert.equal(await achou('dataInicio=2031-03-15&dataFim=2031-03-15'), true);
    assert.equal(await achou('dataInicio=2031-03-16'), false);
    assert.equal(await achou('dataFim=2031-03-14'), false);
  });

  test('filtra pela data de abertura, incluindo o dia final inteiro', async () => {
    const hoje = new Date().toISOString().slice(0, 10);
    assert.equal(await achou(`criacaoInicio=${hoje}&criacaoFim=${hoje}`), true);
    assert.equal(await achou('criacaoFim=2000-01-01'), false);
  });

  test('filtra por faixa de valor (aceita vírgula decimal)', async () => {
    assert.equal(await achou('valorMin=60&valorMax=60'), true);
    assert.equal(await achou('valorMin=60,01'), false);
    assert.equal(await achou('valorMax=59.99'), false);
  });

  test('datas e valores inválidos retornam 400 e não chegam ao banco', async () => {
    for (const q of ['dataInicio=31/12/2030', 'dataFim=2031-02-30', 'criacaoInicio=abc', 'valorMin=abc', 'valorMax=-5']) {
      const r = await lista(`/ordens?${q}`);
      assert.equal(r.status, 400, q);
      assert.ok(r.dados.message, q);
    }
  });

  test('busca global encontra por observações, e-mail do cliente e data dd/mm/aaaa', async () => {
    assert.equal(await achou(`q=${encodeURIComponent(`obs ${tk}`)}`), true, 'observações');
    assert.equal(await achou(`q=${tk}@os`), true, 'e-mail');
    assert.equal(await achou(`q=${encodeURIComponent('15/03/2031')}`), true, 'data completa');
    assert.equal(await achou(`q=${encodeURIComponent('15/03')}`), true, 'dia/mês');
    assert.equal(await achou(`q=${encodeURIComponent('16/03/2031')}`), false, 'outra data');
  });

  test('busca mista (texto + dígito) na O.S. não vira OR com telefone', async () => {
    const r = await lista(`/ordens?q=${encodeURIComponent(`${t.PREFIXO}zz nao existe 1`)}&limit=5`);
    assert.equal(r.dados.total, 0);
  });

  test('data de entrega inexistente (dia 31 de fevereiro) é ignorada na busca, sem erro', async () => {
    const r = await lista(`/ordens?q=${encodeURIComponent('31/02/2031')}`);
    assert.equal(r.status, 200);
  });

  test('o contrato da resposta é preservado ({ data, total, page, limit })', async () => {
    const r = await lista(`/ordens?clienteId=${cliente.id}&limit=5`);
    assert.deepEqual(Object.keys(r.dados).sort(), ['data', 'limit', 'page', 'total']);
  });
});
