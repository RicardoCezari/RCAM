/*
 * Configuração de TLS do banco, healthcheck de prontidão e Swagger configurável.
 * Não depende de PostgreSQL com TLS real: valida a configuração que seria entregue ao driver pg.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { iniciar } = require('./helpers');
const { montarSsl } = require('../src/config/dbSsl');

describe('TLS do banco (montarSsl)', () => {
  test('sem DB_SSL: TLS desligado (uso local)', () => {
    assert.equal(montarSsl({}), false);
    assert.equal(montarSsl({ DB_SSL: 'false' }), false);
  });

  test('DB_SSL=true valida o certificado por padrão', () => {
    assert.deepEqual(montarSsl({ DB_SSL: 'true' }), { rejectUnauthorized: true });
  });

  test('aceita CA própria por conteúdo PEM (com \\n escapado) ou por arquivo', () => {
    const pem = '-----BEGIN CERTIFICATE-----\\nABC\\n-----END CERTIFICATE-----';
    const a = montarSsl({ DB_SSL: 'true', DB_SSL_CA: pem });
    assert.equal(a.rejectUnauthorized, true);
    assert.ok(a.ca.includes('\nABC\n'));

    const arquivo = path.resolve(__dirname, 'helpers.js');
    const b = montarSsl({ DB_SSL: 'true', DB_SSL_CA_FILE: arquivo });
    assert.ok(Buffer.isBuffer(b.ca) || typeof b.ca === 'string');
  });

  test('desligar a validação exige pedido explícito e é recusado em produção', () => {
    assert.deepEqual(montarSsl({ DB_SSL: 'true', DB_SSL_REJECT_UNAUTHORIZED: 'false' }), { rejectUnauthorized: false });
    assert.throws(
      () => montarSsl({ DB_SSL: 'true', DB_SSL_REJECT_UNAUTHORIZED: 'false', NODE_ENV: 'production' }),
      /produ/i
    );
  });

  test('arquivo de CA inexistente falha de forma clara', () => {
    assert.throws(() => montarSsl({ DB_SSL: 'true', DB_SSL_CA_FILE: 'C:/nao/existe/ca.pem' }), /DB_SSL_CA_FILE/);
  });
});

describe('Prontidão e documentação', () => {
  let t;
  before(async () => { t = await iniciar(); });
  after(async () => { await t.encerrar(); });

  test('/health responde sem tocar no banco e /ready confirma o banco', async () => {
    const raiz = t.base.replace(/\/api$/, '');
    const h = await fetch(`${raiz}/health`);
    assert.equal(h.status, 200);
    const r = await fetch(`${raiz}/ready`);
    assert.equal(r.status, 200);
    assert.equal((await r.json()).banco, 'ok');
  });

  test('DOCS_ENABLED=false remove /docs e /docs.json; ligado em desenvolvimento', () => {
    const script = `
      const app = require('./src/app');
      const s = app.listen(0, async () => {
        const base = 'http://127.0.0.1:' + s.address().port;
        const r = await Promise.all(['/docs.json', '/docs/', '/health'].map((p) => fetch(base + p).then((x) => x.status)));
        console.log(JSON.stringify(r));
        s.close(); process.exit(0);
      });`;
    const rodar = (env) => {
      const out = spawnSync(process.execPath, ['-e', script], {
        cwd: path.resolve(__dirname, '..'), env: { ...process.env, ...env }, encoding: 'utf8',
      });
      return JSON.parse(out.stdout.trim().split('\n').pop());
    };
    assert.deepEqual(rodar({ NODE_ENV: 'development', DOCS_ENABLED: '' }), [200, 200, 200]);
    assert.deepEqual(rodar({ NODE_ENV: 'development', DOCS_ENABLED: 'false' }), [404, 404, 200]);
    assert.deepEqual(rodar({ NODE_ENV: 'production', DOCS_ENABLED: '' }), [404, 404, 200]);
  });
});
