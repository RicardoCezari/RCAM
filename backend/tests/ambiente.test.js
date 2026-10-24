const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validarAmbiente } = require('../src/config/ambiente');

const SEGREDO = 'a'.repeat(40);
const prod = (extra = {}) => ({ NODE_ENV: 'production', JWT_SECRET: SEGREDO, CORS_ORIGINS: 'https://app.exemplo.com', DB_HOST: 'localhost', ...extra });

test('segredo JWT curto ou ausente é erro em qualquer ambiente', () => {
  assert.equal(validarAmbiente({ NODE_ENV: 'development' }).erros.length, 1);
  assert.equal(validarAmbiente({ JWT_SECRET: 'curto' }).erros.length, 1);
  assert.deepEqual(validarAmbiente({ NODE_ENV: 'development', JWT_SECRET: SEGREDO }).erros, []);
});

test('produção exige CORS_ORIGINS e recusa segredo de exemplo', () => {
  assert.match(validarAmbiente(prod({ CORS_ORIGINS: '' })).erros.join(), /CORS_ORIGINS/);
  assert.match(validarAmbiente(prod({ JWT_SECRET: 'troque_por_uma_string_longa_e_aleatoria_aqui' })).erros.join(), /exemplo/);
  assert.deepEqual(validarAmbiente(prod()).erros, []);
});

test('produção com banco remoto exige TLS (DB_SSL=true)', () => {
  assert.match(validarAmbiente(prod({ DB_HOST: 'db.exemplo.com' })).erros.join(), /DB_SSL/);
  assert.match(validarAmbiente(prod({ DB_HOST: 'db.exemplo.com', DB_SSL: 'false' })).erros.join(), /DB_SSL/);
  assert.deepEqual(validarAmbiente(prod({ DB_HOST: 'db.exemplo.com', DB_SSL: 'true' })).erros, []);
});

test('produção emite avisos para proxy e armazenamento local, sem bloquear', () => {
  const { erros, avisos } = validarAmbiente(prod());
  assert.deepEqual(erros, []);
  assert.equal(avisos.length, 2);
  assert.deepEqual(validarAmbiente(prod({ TRUST_PROXY: '1', STORAGE_DRIVER: 's3' })).avisos, []);
});
