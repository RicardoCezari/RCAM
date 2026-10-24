/*
 * Teste de carga prolongado (soak) contra a API HTTP real, em banco de TESTE (azteca_test).
 *
 * Uso: node scripts/soak.js [--duracao=300] [--usuarios=50] [--escrita=5]
 *   --duracao   segundos de carga (padrão 300)
 *   --usuarios  usuários virtuais simultâneos (padrão 50)
 *   --escrita   % de operações que criam cliente + O.S. (padrão 5); tudo é removido ao final
 *   --so-limpar apenas remove os dados deixados por uma execução interrompida (clientes 'zz_soak ...')
 *
 * A API sobe em PROCESSO SEPARADO (scripts/e2e-server.js, porta SOAK_PORT, padrão 3200, NODE_ENV=test: rate limit
 * desligado) e o gerador de carga roda neste processo; o RSS reportado é o da API. Ambos rodam na mesma máquina,
 * então a carga do gerador compete por CPU com a API e o PostgreSQL.
 * A cada 10 s amostra: RSS da API, conexões no PostgreSQL (pg_stat_activity), requisições, erros por status e latências.
 * Só imprime valores medidos.
 */
const { spawn, execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');
const { Client } = require('pg');
const { prepararBancoDeTeste, NOME_BANCO_TESTE } = require('./teste-db');
const { montarSsl } = require('../src/config/dbSsl');

const arg = (n, padrao) => Number((process.argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=')[1]) || padrao;
const DURACAO = arg('duracao', 300);
const USUARIOS = arg('usuarios', 50);
const ESCRITA = arg('escrita', 5);
const PORTA = Number(process.env.SOAK_PORT) || 3200;
const BASE = `http://127.0.0.1:${PORTA}`;
const INTERVALO_S = 10;
const PREFIXO = 'zz_soak ';

const pct = (v, p) => (v.length ? v.slice().sort((a, b) => a - b)[Math.min(v.length - 1, Math.floor(v.length * p))] : 0);
const sorteia = (lista) => lista[Math.floor(Math.random() * lista.length)];

/* Memória residente (working set) de um PID, em MB */
function rssMb(pid) {
  try {
    if (process.platform === 'win32') {
      const saida = execFileSync('tasklist', ['/FI', `PID eq ${pid}`, '/FO', 'CSV', '/NH'], { encoding: 'utf8' });
      const kb = Number((saida.trim().split('","').pop() || '').replace(/[^0-9]/g, ''));
      return +(kb / 1024).toFixed(1);
    }
    const linha = fs.readFileSync(`/proc/${pid}/status`, 'utf8').split('\n').find((l) => l.startsWith('VmRSS'));
    return +(Number(linha.replace(/[^0-9]/g, '')) / 1024).toFixed(1);
  } catch { return NaN; }
}

function subirApi() {
  return new Promise((resolve, reject) => {
    const filho = spawn(process.execPath, [path.join(__dirname, 'e2e-server.js')], {
      env: { ...process.env, E2E_API_PORT: String(PORTA), E2E_WEB_ORIGIN: 'http://127.0.0.1:5999' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const limite = setTimeout(() => reject(new Error('API não iniciou em 60 s')), 60000);
    filho.stdout.on('data', (d) => { if (String(d).includes('API de teste em')) { clearTimeout(limite); resolve(filho); } });
    filho.stderr.on('data', (d) => process.stderr.write(`[api] ${d}`));
    filho.on('exit', (c) => reject(new Error(`API encerrou (${c}) antes de iniciar`)));
  });
}

async function chamar(metodo, rota, token, corpo) {
  const r = await fetch(`${BASE}${rota}`, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const texto = await r.text();
  let dados = null;
  try { dados = texto ? JSON.parse(texto) : null; } catch { /* corpo não-JSON */ }
  return { status: r.status, dados };
}

async function main() {
  const pool = await prepararBancoDeTeste(); // usa e valida azteca_test (nome termina em _test)
  const api = await subirApi();
  const sonda = new Client({
    host: process.env.DB_HOST || 'localhost', port: Number(process.env.DB_PORT) || 5432, user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD, ssl: montarSsl(), database: NOME_BANCO_TESTE,
  });
  await sonda.connect();

  let encerrado = false;
  const limpar = async () => {
    if (encerrado) return; encerrado = true;
    // Remoção em massa (cascata em itens/histórico) pode passar do statement_timeout padrão de 30 s
    const c = await pool.connect();
    try {
      await c.query('SET statement_timeout = 0');
      await c.query(`DELETE FROM ordens_servico WHERE cliente_id IN (SELECT id FROM clientes WHERE nome LIKE '${PREFIXO}%')`);
      await c.query(`DELETE FROM clientes WHERE nome LIKE '${PREFIXO}%'`);
    } finally {
      await c.query('RESET statement_timeout').catch(() => {});
      c.release();
    }
  };

  try {
    if (process.argv.includes('--so-limpar')) return;
    const login = await chamar('POST', '/api/auth/login', null, { login: 'zz_e2e_editor', senha: 'e2e-senha-1234' });
    if (login.status !== 200) throw new Error(`Login falhou (${login.status})`);
    const token = login.dados.token;
    const { rows: [tipo] } = await pool.query('SELECT id FROM tipos_objeto ORDER BY id LIMIT 1');
    const { rows: [servico] } = await pool.query('SELECT id FROM servicos ORDER BY id LIMIT 1');
    const idsOs = (await pool.query('SELECT id FROM ordens_servico ORDER BY random() LIMIT 2000')).rows.map((r) => r.id);
    const hoje = new Date().toISOString().slice(0, 10);
    let seq = Date.now() % 1e8;

    const operacoes = [
      [40, 'lista O.S. pendentes', () => chamar('GET', `/api/ordens?situacao=pendentes&page=${1 + Math.floor(Math.random() * 5)}&limit=20`, token)],
      [15, 'detalhe O.S.', () => chamar('GET', `/api/ordens/${sorteia(idsOs)}`, token)],
      [15, 'lista clientes (q)', () => chamar('GET', `/api/clientes?q=${sorteia(['silva', 'ana', 'souza', '0000123'])}&page=1&limit=20`, token)],
      [10, 'busca O.S. (q)', () => chamar('GET', `/api/ordens?q=${encodeURIComponent(sorteia(['silva', 'urgência', '54321', '15/03/2025']))}&page=1&limit=20`, token)],
      [5, 'O.S. com filtros', () => chamar('GET', '/api/ordens?dataInicio=2025-03-01&dataFim=2025-03-31&valorMin=100&valorMax=300&page=1&limit=20', token)],
      [10, 'GET /ready', () => chamar('GET', '/ready')],
      [ESCRITA, 'cria cliente + O.S.', async () => {
        const tel = `99${String(seq++).padStart(9, '0')}`.slice(0, 11);
        const c = await chamar('POST', '/api/clientes', token, { nome: `${PREFIXO}${tel}`, telefone: tel });
        if (c.status !== 201) return c;
        return chamar('POST', '/api/ordens', token, {
          cliente_id: c.dados.id, data_entrega: hoje,
          itens: [{ tipo_objeto_id: tipo.id, servico_id: servico.id, quantidade: 1, valor_unitario: 10 }],
        });
      }],
    ];
    const pesoTotal = operacoes.reduce((s, o) => s + o[0], 0);
    const escolher = () => { let x = Math.random() * pesoTotal; for (const o of operacoes) { x -= o[0]; if (x <= 0) return o; } return operacoes[0]; };

    const porStatus = {};
    const porOp = {};
    const amostras = [];
    let janela = [];
    let todas = [];
    let maxConexoesPg = 0;
    const rssInicial = rssMb(api.pid);
    const inicio = performance.now();
    const fim = inicio + DURACAO * 1000;

    const usuario = async () => {
      while (performance.now() < fim) {
        const [, nome, fn] = escolher();
        const t0 = performance.now();
        let status;
        try { status = (await fn()).status; } catch { status = 'excecao'; }
        const ms = performance.now() - t0;
        porStatus[status] = (porStatus[status] || 0) + 1;
        (porOp[nome] ||= []).push(ms);
        janela.push(ms); todas.push(ms);
      }
    };

    console.log(`Soak: ${USUARIOS} usuários virtuais por ${DURACAO} s (escrita ${ESCRITA}%) | banco ${NOME_BANCO_TESTE} | API em processo separado (pid ${api.pid}, RSS inicial ${rssInicial} MB)`);
    console.log('  t(s)  req/s  p50ms  p95ms  p99ms  RSS-API(MB)  pg-conn  pg-ativas');

    const amostrador = setInterval(async () => {
      try {
        const { rows: [pg] } = await sonda.query(
          `SELECT count(*)::int AS total, count(*) FILTER (WHERE state = 'active')::int AS ativas
             FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid()`);
        const a = { t: Math.round((performance.now() - inicio) / 1000), rps: janela.length / INTERVALO_S, p50: pct(janela, 0.5), p95: pct(janela, 0.95), p99: pct(janela, 0.99), rss: rssMb(api.pid), pgTotal: pg.total, pgAtivas: pg.ativas };
        maxConexoesPg = Math.max(maxConexoesPg, pg.total);
        amostras.push(a);
        console.log(`${String(a.t).padStart(6)} ${a.rps.toFixed(0).padStart(6)} ${a.p50.toFixed(1).padStart(6)} ${a.p95.toFixed(1).padStart(6)} ${a.p99.toFixed(1).padStart(6)} ${String(a.rss).padStart(12)} ${String(a.pgTotal).padStart(8)} ${String(a.pgAtivas).padStart(10)}`);
        janela = [];
      } catch (e) { console.log(`  (falha ao amostrar: ${e.message})`); }
    }, INTERVALO_S * 1000);

    await Promise.all(Array.from({ length: USUARIOS }, usuario));
    clearInterval(amostrador);
    const real = (performance.now() - inicio) / 1000;

    const naoOk = Object.entries(porStatus).filter(([s]) => !/^(200|201)$/.test(s)).reduce((s, [, n]) => s + n, 0);
    console.log(`\n== Resumo (duração real ${real.toFixed(0)} s) ==`);
    console.log(`Requisições: ${todas.length} (${(todas.length / real).toFixed(0)} req/s) | p50 ${pct(todas, 0.5).toFixed(1)} ms | p95 ${pct(todas, 0.95).toFixed(1)} ms | p99 ${pct(todas, 0.99).toFixed(1)} ms | máx ${Math.max(...todas).toFixed(0)} ms`);
    console.log(`Status: ${Object.entries(porStatus).map(([s, n]) => `${s}=${n}`).join(' ')} | respostas não-2xx: ${naoOk}`);
    for (const [nome, v] of Object.entries(porOp)) console.log(`  ${nome.padEnd(22)} n=${String(v.length).padStart(6)}  p50 ${pct(v, 0.5).toFixed(1).padStart(7)}  p95 ${pct(v, 0.95).toFixed(1).padStart(7)}  p99 ${pct(v, 0.99).toFixed(1).padStart(7)} ms`);
    if (amostras.length >= 4) {
      const q = Math.max(1, Math.floor(amostras.length / 4));
      const media = (arr, k) => arr.reduce((s, x) => s + x[k], 0) / arr.length;
      console.log(`RSS da API: inicial ${rssInicial} MB | 1º quarto ${media(amostras.slice(0, q), 'rss').toFixed(1)} MB -> último quarto ${media(amostras.slice(-q), 'rss').toFixed(1)} MB | máx ${Math.max(...amostras.map((x) => x.rss))} MB`);
      console.log(`Vazão: 1º quarto ${media(amostras.slice(0, q), 'rps').toFixed(0)} req/s -> último quarto ${media(amostras.slice(-q), 'rps').toFixed(0)} req/s`);
      console.log(`Latência p95 (janelas de ${INTERVALO_S} s): 1º quarto ${media(amostras.slice(0, q), 'p95').toFixed(1)} ms -> último quarto ${media(amostras.slice(-q), 'p95').toFixed(1)} ms`);
    }
    console.log(`Conexões PostgreSQL no banco de teste (máx amostrado): ${maxConexoesPg}`);
    process.exitCode = naoOk ? 1 : 0;
  } finally {
    await limpar().then(() => console.log('Dados de teste removidos.')).catch((e) => console.error('Falha na limpeza:', e.message));
    await sonda.end().catch(() => {});
    api.removeAllListeners('exit');
    api.kill();
    await pool.end().catch(() => {});
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
