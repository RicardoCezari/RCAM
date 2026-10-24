/*
 * Benchmark das consultas principais contra o banco de TESTE (azteca_test).
 * Uso: node scripts/benchmark.js [rodadas=15] [--concorrencia=10,50,100]
 * Mede latência (p50/p95) de cada operação e, por fim, throughput sob concorrência.
 */
const { prepararBancoDeTeste } = require('./teste-db');

const RODADAS = Number(process.argv[2]) || 15;
const arg = process.argv.find((a) => a.startsWith('--concorrencia='));
const NIVEIS = (arg ? arg.split('=')[1] : '10,50,100').split(',').map(Number).filter(Boolean);

const pct = (v, p) => v.slice().sort((a, b) => a - b)[Math.min(v.length - 1, Math.floor(v.length * p))];
const ms = (n) => `${n.toFixed(1)} ms`;

async function medir(nome, fn) {
  await fn(0); // aquecimento
  const tempos = [];
  let bytes = 0;
  for (let i = 0; i < RODADAS; i++) {
    const t = process.hrtime.bigint();
    const r = await fn(i);
    tempos.push(Number(process.hrtime.bigint() - t) / 1e6);
    bytes = JSON.stringify(r).length;
  }
  console.log(`${nome.padEnd(46)} p50 ${ms(pct(tempos, 0.5)).padStart(10)}  p95 ${ms(pct(tempos, 0.95)).padStart(10)}  payload ${(bytes / 1024).toFixed(0).padStart(6)} KB`);
}

async function main() {
  const pool = await prepararBancoDeTeste();
  const osInfo = require('os');
  const { rows: [v] } = await pool.query(`SELECT version() AS pg,
    (SELECT COUNT(*) FROM clientes)::int AS clientes, (SELECT COUNT(*) FROM ordens_servico)::int AS ordens,
    (SELECT COUNT(*) FROM itens_ordem_servico)::int AS itens`);
  console.log(`Ambiente: Node ${process.version} | ${osInfo.cpus().length} CPUs (${osInfo.cpus()[0].model.trim()}) | ${(osInfo.totalmem() / 1024 ** 3).toFixed(1)} GB RAM | ${osInfo.platform()}`);
  console.log(`Banco: ${v.pg.split(',')[0]} | pool máx ${process.env.DB_POOL_MAX || 20} | clientes=${v.clientes} ordens=${v.ordens} itens=${v.itens}`);
  console.log('Medição: serviços chamados direto (sem HTTP), cliente e banco na mesma máquina.');
  const os = require('../src/services/ordensServicoService');
  const clientes = require('../src/services/clientesService');
  const rnd = (n) => 1 + Math.floor(Math.random() * n);

  const operacoes = {
    'O.S. pendentes (20)':                 () => os.listar({ situacao: 'pendentes', page: 1, limit: 20 }),
    'O.S. pendentes pág. 10 (20)':         () => os.listar({ situacao: 'pendentes', page: 10, limit: 20 }),
    'O.S. todas (20)':                     () => os.listar({ page: 1, limit: 20 }),
    'O.S. entregues (20)':                 () => os.listar({ situacao: 'entregues', page: 1, limit: 20 }),
    'O.S. todas, limit 1000 (tela atual)': () => os.listar({ page: 1, limit: 1000 }),
    'O.S. busca q="silva"':                () => os.listar({ q: 'silva', page: 1, limit: 20 }),
    'O.S. busca q="1190000" (casa em 100%)': () => os.listar({ q: '1190000', page: 1, limit: 20 }),
    'O.S. busca número seletiva "54321"': () => os.listar({ q: '54321', page: 1, limit: 20 }),
    'O.S. busca q por e-mail':             () => os.listar({ q: 'ana.silva@exemplo', page: 1, limit: 20 }),
    'O.S. busca q por observação':         () => os.listar({ q: 'cliente pediu urgência', page: 1, limit: 20 }),
    'O.S. busca q data "15/03/2025"':      () => os.listar({ q: '15/03/2025', page: 1, limit: 20 }),
    'O.S. período de entrega (1 mês)':     () => os.listar({ dataInicio: '2025-03-01', dataFim: '2025-03-31', page: 1, limit: 20 }),
    'O.S. faixa de valor (100 a 300)':     () => os.listar({ valorMin: 100, valorMax: 300, page: 1, limit: 20 }),
    'O.S. paginação profunda (pág. 5000)': () => os.listar({ page: 5000, limit: 20 }),
    'O.S. filtro cliente="ana silva"':     () => os.listar({ cliente: 'ana silva', page: 1, limit: 20 }),
    'O.S. por cliente':                    () => os.listar({ clienteId: rnd(10000), page: 1, limit: 20 }),
    'O.S. ordenar por cliente':            () => os.listar({ ordenarPor: 'cliente', direcao: 'asc', page: 1, limit: 20 }),
    'O.S. detalhe':                        () => os.buscarPorId(rnd(100000)),
    'Histórico do cliente':                () => os.historicoCliente(rnd(10000)),
    'Clientes limit 1000 (tela atual)':    () => clientes.listar({ page: 1, limit: 1000 }),
    'Clientes pág. 1 (20)':                () => clientes.listar({ page: 1, limit: 20 }),
    'Clientes busca q="silva"':            () => clientes.listar({ q: 'silva', page: 1, limit: 20 }),
    'Clientes busca q="0000123"':          () => clientes.listar({ q: '0000123', page: 1, limit: 20 }),
    'Cliente por telefone':                () => clientes.buscarPorTelefone(`119${String(rnd(10000)).padStart(8, '0')}`),
    'Cliente por CPF':                     () => clientes.buscarPorCpf(String(rnd(10000)).padStart(11, '0')),
  };

  console.log(`\n== Latência (${RODADAS} rodadas, 1 requisição por vez) ==`);
  for (const [nome, fn] of Object.entries(operacoes)) {
    try { await medir(nome, fn); } catch (e) { console.log(`${nome.padEnd(46)} ERRO: ${e.message}`); }
  }

  const mix = [
    operacoes['O.S. pendentes (20)'], operacoes['O.S. pendentes (20)'], operacoes['O.S. detalhe'],
    operacoes['Clientes busca q="silva"'], operacoes['Cliente por telefone'], operacoes['O.S. busca q="silva"'],
  ];
  console.log('\n== Concorrência (mix: listagem, detalhe, busca; 8 s por nível) ==');
  for (const n of NIVEIS) {
    const tempos = [];
    let erros = 0;
    const fim = Date.now() + 8000;
    const worker = async (idx) => {
      let i = idx;
      while (Date.now() < fim) {
        const t = process.hrtime.bigint();
        try { await mix[i++ % mix.length](); } catch { erros++; }
        tempos.push(Number(process.hrtime.bigint() - t) / 1e6);
      }
    };
    await Promise.all(Array.from({ length: n }, (_, i) => worker(i)));
    console.log(`${String(n).padStart(4)} usuários: ${(tempos.length / 8).toFixed(0).padStart(5)} req/s  p50 ${ms(pct(tempos, 0.5)).padStart(10)}  p95 ${ms(pct(tempos, 0.95)).padStart(10)}  erros ${erros}`);
  }
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
