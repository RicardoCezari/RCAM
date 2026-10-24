/*
 * Dashboard gerencial: permissões, filtros, validação e conferência dos números contra dados controlados.
 * Os dados de teste ficam em 2001 e usam o serviço de teste, para não se misturar com o restante do banco.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { iniciar } = require('./helpers');

let t; let admin; let editor; let servicoId;
before(async () => {
  t = await iniciar();
  servicoId = t.servicoId;
  const { rows } = await t.pool.query('SELECT id, login FROM usuarios WHERE login = ANY($1)', [[`${t.PREFIXO}admin`, `${t.PREFIXO}editor`]]);
  admin = rows.find((r) => r.login.endsWith('admin')).id;
  editor = rows.find((r) => r.login.endsWith('editor')).id;
  await montarCenario();
});
after(async () => { await t.encerrar(); });

const get = (query, token = t.tokens.admin) => t.chamar('GET', `/dashboard?${query}`, { token });
const base = () => `servicoId=${servicoId}`;
const marco = () => `inicio=2001-03-01&fim=2001-03-31&${base()}`;

async function os(clienteId, usuarioId, criacao, estado) {
  const { rows: [r] } = await t.pool.query(
    `INSERT INTO ordens_servico (cliente_id, usuario_id, data_criacao, data_entrega, estado)
     VALUES ($1, $2, $3, '2001-12-01', $4) RETURNING id`,
    [clienteId, usuarioId, criacao, estado]
  );
  return r.id;
}

async function item(ordemId, quantidade, valor, estado, { executor = null, entreguePor = null } = {}) {
  const { rows: [r] } = await t.pool.query(
    `INSERT INTO itens_ordem_servico (ordem_id, tipo_objeto_id, servico_id, quantidade, valor_unitario, estado, entregue_por)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [ordemId, t.tipoId, servicoId, quantidade, valor, estado, entreguePor]
  );
  if (executor) {
    await t.pool.query(
      `INSERT INTO ordem_historico (ordem_id, item_id, estado_anterior, estado_novo, usuario_id)
       VALUES ($1, $2, 'EM_ANDAMENTO', 'CONCLUIDO', $3)`,
      [ordemId, r.id, executor]
    );
  }
}

/*
 * Março/2001 (4 O.S. no período):
 *  A 10/03 ENTREGUE (aberta pelo editor): 2 x 30 = 60, concluída pelo editor
 *  B 10/03 CONCLUIDO: 1 x 50 (concluída pelo admin) + 1 x 20 entregue sem nenhum registro de quem executou
 *  C 20/03 EM_ANDAMENTO: 1 x 40
 *  D 25/03 CANCELADO: 1 x 10
 *  E 02/04 ENTRADA (fora do período)
 */
async function montarCenario() {
  const { dados: cliente } = await t.criarCliente();
  const a = await os(cliente.id, editor, '2001-03-10 09:00', 'ENTREGUE');
  const b = await os(cliente.id, admin, '2001-03-10 18:30', 'CONCLUIDO');
  const c = await os(cliente.id, admin, '2001-03-20 12:00', 'EM_ANDAMENTO');
  const d = await os(cliente.id, admin, '2001-03-25 23:59', 'CANCELADO');
  const e = await os(cliente.id, admin, '2001-04-02 08:00', 'ENTRADA');
  await item(a, 2, 30, 'ENTREGUE', { executor: editor });
  await item(b, 1, 50, 'CONCLUIDO', { executor: admin });
  await item(b, 1, 20, 'ENTREGUE');
  await item(c, 1, 40, 'EM_ANDAMENTO');
  await item(d, 1, 10, 'CANCELADO');
  await item(e, 1, 15, 'CADASTRADO');
}

describe('Dashboard: acesso', () => {
  test('exige autenticação e perfil administrador', async () => {
    assert.equal((await t.chamar('GET', '/dashboard')).status, 401);
    assert.equal((await get(marco(), t.tokens.editor)).status, 403);
    assert.equal((await get(marco())).status, 200);
  });
});

describe('Dashboard: números', () => {
  test('resumo confere com os dados (período por data de criação, incluindo o último dia)', async () => {
    const { dados } = await get(marco());
    assert.deepEqual(dados.resumo, {
      total: 4, concluidas: 2, percentualConcluidas: 50, pendentes: 1, canceladas: 1,
      faturamento: 130, ordensFaturadas: 2, ticketMedio: 65,
    });
    assert.deepEqual(dados.status.map((s) => [s.estado, s.total]), [
      ['ENTRADA', 0], ['ORCAMENTO', 0], ['EM_ANDAMENTO', 1], ['CONCLUIDO', 1], ['ENTREGUE', 1], ['CANCELADO', 1],
    ]);
  });

  test('série diária preenche os dias sem O.S. com zero', async () => {
    const { dados } = await get(marco());
    assert.equal(dados.agrupamento, 'day');
    assert.equal(dados.serie.length, 31);
    const porDia = Object.fromEntries(dados.serie.map((s) => [s.data, s.total]));
    assert.equal(porDia['2001-03-10'], 2);
    assert.equal(porDia['2001-03-20'], 1);
    assert.equal(porDia['2001-03-25'], 1);
    assert.equal(dados.serie.reduce((acc, s) => acc + s.total, 0), 4);
  });

  test('períodos longos agrupam por mês (e por semana nos intermediários)', async () => {
    const ano = (await get(`inicio=2001-01-01&fim=2001-12-31&${base()}`)).dados;
    assert.equal(ano.agrupamento, 'month');
    assert.equal(ano.serie.length, 12);
    assert.deepEqual(ano.serie.slice(2, 4).map((s) => s.total), [4, 1]);
    assert.equal(ano.resumo.total, 5);

    const semestre = (await get(`inicio=2001-03-01&fim=2001-05-31&${base()}`)).dados;
    assert.equal(semestre.agrupamento, 'week');
    assert.equal(semestre.serie.reduce((acc, s) => acc + s.total, 0), 5);
  });

  test('serviços realizados e rentáveis usam só itens concluídos ou entregues', async () => {
    const { dados } = await get(marco());
    const esperado = [{ id: servicoId, nome: `${t.PREFIXO}servico`, quantidade: 4, ordens: 2, valor: 130 }];
    assert.deepEqual(dados.servicosMaisRealizados, esperado);
    assert.deepEqual(dados.servicosMaisRentaveis, esperado);
  });

  test('produtividade atribui ao último usuário que concluiu o item e separa o que não tem registro', async () => {
    const { dados } = await get(marco());
    assert.deepEqual(dados.produtividade.map((p) => [p.id, p.ordens, p.servicos]), [
      [editor, 1, 2], [admin, 1, 1], [null, 1, 1],
    ]);
  });

  test('filtro por funcionário considera as O.S. abertas por ele', async () => {
    const { dados } = await get(`${marco()}&usuarioId=${editor}`);
    assert.equal(dados.resumo.total, 1);
    assert.equal(dados.resumo.concluidas, 1);
    assert.equal(dados.resumo.percentualConcluidas, 100);
    assert.equal(dados.resumo.faturamento, 60);
    assert.equal(dados.resumo.ticketMedio, 60);
  });

  test('período sem O.S. devolve zeros, sem divisão por zero', async () => {
    const { status, dados } = await get(`inicio=1999-01-01&fim=1999-01-10&${base()}`);
    assert.equal(status, 200);
    assert.equal(dados.resumo.total, 0);
    assert.equal(dados.resumo.percentualConcluidas, null);
    assert.equal(dados.resumo.ticketMedio, null);
    assert.equal(dados.resumo.faturamento, 0);
    assert.equal(dados.serie.length, 10);
    assert.ok(dados.serie.every((s) => s.total === 0));
    assert.deepEqual(dados.servicosMaisRealizados, []);
    assert.deepEqual(dados.produtividade, []);
  });

  test('sem parâmetros usa os últimos 30 dias', async () => {
    const { status, dados } = await get('');
    assert.equal(status, 200);
    assert.equal(dados.serie.length, 30);
  });
});

describe('Dashboard: validação', () => {
  test('rejeita parâmetros inválidos com 400', async () => {
    for (const q of [
      'inicio=2001-02-30', 'inicio=ontem', 'fim=2001-13-01', 'inicio=2001-03-10&fim=2001-03-09',
      'inicio=1900-01-01&fim=2025-01-01', 'usuarioId=abc', 'usuarioId=0', 'servicoId=-1', 'servicoId=99999999999',
    ]) {
      assert.equal((await get(q)).status, 400, q);
    }
  });
});
