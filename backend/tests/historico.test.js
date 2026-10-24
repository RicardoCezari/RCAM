/*
 * Retenção do histórico: relatório e exportação são somente leitura e nunca apagam registros.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { PassThrough } = require('stream');
const { iniciar } = require('./helpers');
const { relatorio, exportar, celula } = require('../src/services/historicoRetencao');

let t;
let os;
const hoje = () => new Date().toISOString().slice(0, 10);

before(async () => {
  t = await iniciar();
  const c = (await t.criarCliente()).dados;
  const r = await t.chamar('POST', '/ordens', {
    token: t.tokens.editor,
    corpo: { cliente_id: c.id, data_entrega: hoje(), itens: [{ tipo_objeto_id: t.tipoId, servico_id: t.servicoId, quantidade: 1, valor_unitario: 10 }] },
  });
  os = r.dados;
});
after(async () => { await t.encerrar(); });

function coletar() {
  const s = new PassThrough();
  const partes = [];
  s.on('data', (d) => partes.push(d.toString()));
  return { s, texto: () => partes.join('') };
}

const total = async () => (await t.pool.query('SELECT COUNT(*)::int n FROM ordem_historico')).rows[0].n;

test('celula neutraliza fórmulas de planilha e escapa aspas, vírgulas e quebras de linha', () => {
  assert.equal(celula('=HYPERLINK("http://x")'), `"'=HYPERLINK(""http://x"")"`);
  assert.equal(celula('+cmd'), `'+cmd`);
  assert.equal(celula('@x'), `'@x`);
  assert.equal(celula('-5'), '-5');
  assert.equal(celula('a,b'), '"a,b"');
  assert.equal(celula('linha1\nlinha2'), '"linha1\nlinha2"');
  assert.equal(celula(null), '');
  assert.equal(celula(new Date('2025-01-02T03:04:05Z')), '2025-01-02T03:04:05.000Z');
});

test('relatório conta registros e não altera nada', async () => {
  // Garante ao menos um registro antigo (banco vazio no CI) e remove ao final
  const { rows: [h] } = await t.pool.query(
    `INSERT INTO ordem_historico (ordem_id, estado_novo, data_mudanca) VALUES ($1, 'ENTRADA', '2001-01-01 10:00:00') RETURNING id`, [os.id]);
  const antes = await total();
  const r = await relatorio(t.pool);
  assert.equal(r.total, antes);
  assert.ok(r.maisAntigo instanceof Date);
  assert.ok(Number(r.bytesTabelaComIndices) > 0);
  assert.equal(r.porAno.reduce((s, a) => s + a.registros, 0), antes);
  assert.equal(await total(), antes);
  await t.pool.query('DELETE FROM ordem_historico WHERE id = $1', [h.id]);
});

test('exportar escreve só o que é anterior à data, em lotes, sem apagar nada', async () => {
  const { rows: [h] } = await t.pool.query(
    `INSERT INTO ordem_historico (ordem_id, estado_novo, observacao, data_mudanca)
     VALUES ($1, 'ENTRADA', $2, '2001-05-06 10:00:00') RETURNING id`,
    [os.id, '=1+1, "teste"']
  );
  const { rows: [h2] } = await t.pool.query(
    `INSERT INTO ordem_historico (ordem_id, estado_novo, data_mudanca) VALUES ($1, 'ENTRADA', '2001-05-07 10:00:00') RETURNING id`, [os.id]);
  const antes = await total();

  const { s, texto } = coletar();
  const n = await exportar(t.pool, { ate: new Date('2002-01-01T00:00:00Z'), saida: s, lote: 1 });
  assert.ok(n >= 2);
  const linhas = texto().trim().split('\n');
  assert.equal(linhas[0], 'id,ordem_id,item_id,estado_anterior,estado_novo,usuario_id,observacao,data_mudanca');
  assert.equal(linhas.length, n + 1, 'um cabeçalho + uma linha por registro (lote de 1 percorre tudo)');
  assert.ok(linhas.some((l) => l.startsWith(`${h.id},${os.id},,,ENTRADA,,"'=1+1, ""teste""",2001-05-06`)), 'fórmula neutralizada');
  assert.ok(linhas.some((l) => l.startsWith(`${h2.id},`)));
  assert.ok(!texto().includes(new Date().getFullYear() + '-'), 'registros recentes não entram');
  assert.equal(await total(), antes, 'exportar nunca apaga');

  await t.pool.query('DELETE FROM ordem_historico WHERE id = ANY($1)', [[h.id, h2.id]]);
});

test('data limite inválida é recusada', async () => {
  await assert.rejects(exportar(t.pool, { ate: new Date('x'), saida: coletar().s }), /Data limite inválida/);
  await assert.rejects(exportar(t.pool, { ate: '2020-01-01', saida: coletar().s }), /Data limite inválida/);
});
