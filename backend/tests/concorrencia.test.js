/*
 * Concorrência em O.S.: itens e estado da O.S. alterados ao mesmo tempo não podem gerar deadlock (500),
 * nem permitir alterar uma O.S. que acabou de ser entregue.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { iniciar } = require('./helpers');

let t;
before(async () => { t = await iniciar(); });
after(async () => { await t.encerrar(); });

const hoje = () => new Date().toISOString().slice(0, 10);
const ed = () => ({ token: t.tokens.editor });

async function novaOs(qtdItens = 4) {
  const c = (await t.criarCliente()).dados;
  const r = await t.chamar('POST', '/ordens', {
    ...ed(),
    corpo: {
      cliente_id: c.id, data_entrega: hoje(),
      itens: Array.from({ length: qtdItens }, () => ({ tipo_objeto_id: t.tipoId, servico_id: t.servicoId, quantidade: 1, valor_unitario: 10 })),
    },
  });
  assert.equal(r.status, 201);
  return r.dados;
}

describe('Concorrência entre itens e estado da O.S.', () => {
  test('itens e estado alterados em paralelo: sem erro 500/deadlock e estado final coerente', async () => {
    const rodadas = 15;
    const status = [];
    for (let k = 0; k < rodadas; k++) {
      const os = await novaOs(4);
      const reqs = [];
      os.itens.forEach((it, n) => {
        const estado = ['EM_ANDAMENTO', 'CONCLUIDO', 'AUTORIZADO', 'CONCLUIDO'][n];
        reqs.push(t.chamar('PUT', `/ordens/${os.id}/itens/${it.id}`, { ...ed(), corpo: { estado } }));
      });
      reqs.push(t.chamar('PATCH', `/ordens/${os.id}/estado`, { ...ed(), corpo: { estado: 'CONCLUIDO' } }));
      reqs.push(t.chamar('PATCH', `/ordens/${os.id}/estado`, { ...ed(), corpo: { estado: 'EM_ANDAMENTO' } }));
      reqs.push(t.chamar('POST', `/ordens/${os.id}/itens`, { ...ed(), corpo: { tipo_objeto_id: t.tipoId, servico_id: t.servicoId, quantidade: 1, valor_unitario: 5 } }));
      const resp = await Promise.all(reqs);
      status.push(...resp.map((r) => r.status));

      // coerência: o estado da O.S. é exatamente o derivado dos itens
      const g = (await t.chamar('GET', `/ordens/${os.id}`, ed())).dados;
      const ativos = g.itens.filter((i) => i.estado !== 'CANCELADO').map((i) => i.estado);
      const todosProntos = ativos.every((e) => e === 'CONCLUIDO' || e === 'ENTREGUE');
      if (todosProntos) assert.equal(g.estado, 'CONCLUIDO');
      else assert.notEqual(g.estado, 'CONCLUIDO', `O.S. ${os.id} marcada como pronta com itens pendentes`);
    }
    const ruins = status.filter((s) => s >= 500);
    assert.equal(ruins.length, 0, `respostas 5xx: ${ruins.length} de ${status.length}`);
  });

  test('após a entrega, alterações simultâneas de item são recusadas (nenhuma passa depois da entrega)', async () => {
    for (let k = 0; k < 10; k++) {
      const os = await novaOs(2);
      for (const it of os.itens) {
        await t.chamar('PUT', `/ordens/${os.id}/itens/${it.id}`, { ...ed(), corpo: { estado: 'CONCLUIDO' } });
      }
      const reqs = [
        t.chamar('PATCH', `/ordens/${os.id}/estado`, { ...ed(), corpo: { estado: 'ENTREGUE' } }),
        ...os.itens.map((it) => t.chamar('PUT', `/ordens/${os.id}/itens/${it.id}`, { ...ed(), corpo: { quantidade: 7 } })),
        t.chamar('POST', `/ordens/${os.id}/itens`, { ...ed(), corpo: { tipo_objeto_id: t.tipoId, servico_id: t.servicoId, quantidade: 1, valor_unitario: 1 } }),
      ];
      const resp = await Promise.all(reqs);
      assert.ok(resp.every((r) => r.status < 500), `status: ${resp.map((r) => r.status)}`);

      const { rows: [{ entregue }] } = await t.pool.query(`SELECT estado = 'ENTREGUE' AS entregue FROM ordens_servico WHERE id = $1`, [os.id]);
      if (resp[0].status === 200) {
        assert.equal(entregue, true);
        // nenhum item "novo" pode ter entrado depois: todos os itens existentes estão ENTREGUE
        const { rows: pend } = await t.pool.query(`SELECT id FROM itens_ordem_servico WHERE ordem_id = $1 AND estado <> 'ENTREGUE'`, [os.id]);
        assert.equal(pend.length, 0, `itens fora de ENTREGUE em O.S. entregue: ${pend.length}`);
      } else {
        // o item novo entrou antes e está pendente: a entrega foi recusada
        assert.equal(resp[0].status, 409);
        assert.equal(entregue, false);
      }
    }
  });

  test('remover item apaga também os arquivos de foto do item', async () => {
    const os = await novaOs(2);
    const [a, b] = os.itens;
    const { rows: [f] } = await t.pool.query(
      `INSERT INTO ordem_fotos (ordem_id, item_id, url) VALUES ($1, $2, '/uploads/ordens/zz-teste-orfa.jpg') RETURNING id`, [os.id, a.id]);
    const storage = require('../src/services/storageService');
    const removidos = [];
    const original = storage.remover;
    storage.remover = async (url) => { removidos.push(url); };
    try {
      const r = await t.chamar('DELETE', `/ordens/${os.id}/itens/${a.id}`, ed());
      assert.equal(r.status, 204);
    } finally {
      storage.remover = original;
    }
    assert.deepEqual(removidos, ['/uploads/ordens/zz-teste-orfa.jpg']);
    const { rows } = await t.pool.query('SELECT 1 FROM ordem_fotos WHERE id = $1', [f.id]);
    assert.equal(rows.length, 0);
    assert.ok(b);
  });
});
