/*
 * EXPLAIN (ANALYZE, BUFFERS) das consultas REAIS da aplicação (captura o SQL que os serviços executam)
 * contra o banco de TESTE (azteca_test). Mostra tempo de execução e quais índices/varreduras são usados.
 *
 * Uso: node scripts/explain.js [--json=saida.json]
 * Atenção: EXPLAIN ANALYZE executa as consultas de verdade (somente leitura aqui). Roda ANALYZE nas tabelas
 * antes (atualiza só estatísticas do planner) para que os planos reflitam o volume atual.
 */
const fs = require('fs');
const { prepararBancoDeTeste } = require('./teste-db');

const arqJson = (process.argv.find((a) => a.startsWith('--json=')) || '').split('=')[1];

function percorrer(no, acc = []) {
  const rel = no['Relation Name'];
  const idx = no['Index Name'];
  const tipo = no['Node Type'];
  if (rel || idx) acc.push({ tipo, relacao: rel || null, indice: idx || null });
  (no.Plans || []).forEach((p) => percorrer(p, acc));
  return acc;
}

async function main() {
  const pool = await prepararBancoDeTeste();
  const original = pool.query.bind(pool);
  let captura = null;
  pool.query = (sql, params) => {
    if (captura && typeof sql === 'string') captura.push({ sql, params: params || [] });
    return original(sql, params);
  };

  const os = require('../src/services/ordensServicoService');
  const clientes = require('../src/services/clientesService');

  const { rows: [vol] } = await original(`
    SELECT (SELECT COUNT(*) FROM clientes)::int AS clientes,
           (SELECT COUNT(*) FROM ordens_servico)::int AS ordens,
           (SELECT COUNT(*) FROM itens_ordem_servico)::int AS itens,
           (SELECT COUNT(*) FROM ordem_historico)::int AS historico`);
  console.log(`Volume em ${process.env.DB_NAME}: clientes=${vol.clientes} ordens=${vol.ordens} itens=${vol.itens} historico=${vol.historico}`);
  await original('ANALYZE clientes; ANALYZE ordens_servico; ANALYZE itens_ordem_servico; ANALYZE ordem_historico; ANALYZE usuarios; ANALYZE tipos_objeto');

  const cenarios = {
    'O.S. pendentes (pág. 1)':              () => os.listar({ situacao: 'pendentes', page: 1, limit: 20 }),
    'O.S. todas (pág. 1)':                  () => os.listar({ page: 1, limit: 20 }),
    'O.S. paginação profunda (pág. 5000)':  () => os.listar({ page: 5000, limit: 20 }),
    'O.S. período de entrega':              () => os.listar({ dataInicio: '2025-03-01', dataFim: '2025-03-31', page: 1, limit: 20 }),
    'O.S. período de abertura':             () => os.listar({ criacaoInicio: '2025-03-01', criacaoFim: '2025-03-31', page: 1, limit: 20 }),
    'O.S. faixa de valor':                  () => os.listar({ valorMin: 100, valorMax: 300, page: 1, limit: 20 }),
    'O.S. por cliente':                     () => os.listar({ clienteId: 4321, page: 1, limit: 20 }),
    'O.S. busca q="silva"':                 () => os.listar({ q: 'silva', page: 1, limit: 20 }),
    'O.S. busca q por e-mail':              () => os.listar({ q: 'ana.silva@exemplo', page: 1, limit: 20 }),
    'O.S. busca q por observação':          () => os.listar({ q: 'cliente pediu urgência', page: 1, limit: 20 }),
    'O.S. busca q númerica "1190000" (casa em 100%)': () => os.listar({ q: '1190000', page: 1, limit: 20 }),
    'O.S. busca q número seletiva "54321"': () => os.listar({ q: '54321', page: 1, limit: 20 }),
    'O.S. busca q data "15/03/2025"':       () => os.listar({ q: '15/03/2025', page: 1, limit: 20 }),
    'O.S. ordenar por cliente':             () => os.listar({ ordenarPor: 'cliente', direcao: 'asc', page: 1, limit: 20 }),
    'O.S. detalhe':                         () => os.buscarPorId(54321),
    'Clientes pág. 1':                      () => clientes.listar({ page: 1, limit: 20 }),
    'Clientes busca q="silva"':             () => clientes.listar({ q: 'silva', page: 1, limit: 20 }),
    'Clientes busca q por e-mail':          () => clientes.listar({ q: 'ana.silva@exemplo', page: 1, limit: 20 }),
    'Clientes busca q por info adicional':  () => clientes.listar({ q: 'indicação', page: 1, limit: 20 }),
    'Clientes busca q telefone "0000123"':  () => clientes.listar({ q: '0000123', page: 1, limit: 20 }),
  };

  const saida = [];
  for (const [nome, fn] of Object.entries(cenarios)) {
    captura = [];
    try { await fn(); } catch (e) { console.log(`\n## ${nome}\n  ERRO: ${e.message}`); continue; }
    const consultas = captura.filter((c) => /^\s*(SELECT|WITH)/i.test(c.sql));
    captura = null;

    console.log(`\n## ${nome}`);
    for (const [k, c] of consultas.entries()) {
      const { rows } = await original(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${c.sql}`, c.params);
      const plano = rows[0]['QUERY PLAN'][0];
      const nos = percorrer(plano.Plan);
      const seq = nos.filter((n) => n.tipo === 'Seq Scan').map((n) => n.relacao);
      const indices = [...new Set(nos.filter((n) => n.indice).map((n) => n.indice))];
      const buffers = plano.Plan['Shared Hit Blocks'] + plano.Plan['Shared Read Blocks'];
      console.log(`  consulta ${k + 1}: ${plano['Execution Time'].toFixed(1)} ms (planejamento ${plano['Planning Time'].toFixed(1)} ms) | blocos ${buffers}`);
      console.log(`    índices: ${indices.join(', ') || '-'}`);
      console.log(`    Seq Scan em: ${seq.join(', ') || '-'}`);
      saida.push({ cenario: nome, consulta: k + 1, execucaoMs: plano['Execution Time'], planejamentoMs: plano['Planning Time'], blocos: buffers, indices, seqScan: seq });
    }
  }

  if (arqJson) fs.writeFileSync(arqJson, JSON.stringify({ volume: vol, resultados: saida }, null, 2));
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
