const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { migrarUploads } = require('../src/services/migrarUploads');

const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(40, 7)]);
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(40, 9)]);

function montar() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'migrup-'));
  fs.mkdirSync(path.join(dir, 'fotos'));
  fs.mkdirSync(path.join(dir, 'logo'));
  fs.writeFileSync(path.join(dir, 'fotos', 'a.jpg'), JPEG);
  fs.writeFileSync(path.join(dir, 'fotos', 'b.png'), PNG);
  fs.writeFileSync(path.join(dir, 'fotos', 'c.jpg'), JPEG);
  fs.writeFileSync(path.join(dir, 'logo', 'falso.png'), '<svg onload=alert(1)>');
  return dir;
}

function driverFalso(existentes = {}) {
  const gravados = [];
  return {
    gravados,
    tamanho: async (chave) => (chave in existentes ? existentes[chave] : null),
    gravar: async (chave, buffer, mimetype) => { gravados.push({ chave, bytes: buffer.length, mimetype }); },
  };
}

test('simulação (padrão) não envia nada e relata o que enviaria', async () => {
  const dir = montar();
  const driver = driverFalso();
  const r = await migrarUploads({ dirOrigem: dir, driver });
  assert.equal(r.aplicou, false);
  assert.equal(driver.gravados.length, 0);
  assert.equal(r.total, 4);
  assert.equal(r.enviados, 3);
  assert.deepEqual(r.invalidos, ['logo/falso.png']);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('aplicar envia só imagens válidas, com o tipo detectado, e não toca nos arquivos locais', async () => {
  const dir = montar();
  const driver = driverFalso();
  const r = await migrarUploads({ dirOrigem: dir, driver, aplicar: true });
  assert.deepEqual(driver.gravados.map((g) => g.chave).sort(), ['fotos/a.jpg', 'fotos/b.png', 'fotos/c.jpg']);
  assert.equal(driver.gravados.find((g) => g.chave === 'fotos/b.png').mimetype, 'image/png');
  assert.equal(r.invalidos.length, 1);
  assert.equal(fs.readdirSync(path.join(dir, 'fotos')).length, 3, 'nada pode ser apagado localmente');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('repetir a migração pula o que já está no bucket com o mesmo tamanho (idempotente)', async () => {
  const dir = montar();
  const driver = driverFalso({ 'fotos/a.jpg': JPEG.length, 'fotos/b.png': PNG.length, 'fotos/c.jpg': 1 /* tamanho diferente */ });
  const r = await migrarUploads({ dirOrigem: dir, driver, aplicar: true });
  assert.equal(r.jaExistiam, 2);
  assert.deepEqual(driver.gravados.map((g) => g.chave), ['fotos/c.jpg']);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('relata URLs do banco sem arquivo local e continua quando um arquivo falha', async () => {
  const dir = montar();
  const driver = driverFalso();
  const original = driver.gravar;
  driver.gravar = async (chave, ...resto) => { if (chave === 'fotos/b.png') throw new Error('sem permissão'); return original(chave, ...resto); };
  const r = await migrarUploads({
    dirOrigem: dir, driver, aplicar: true,
    urlsBanco: ['/uploads/fotos/a.jpg', '/uploads/fotos/sumiu.jpg', 'https://externo/x.jpg', null],
  });
  assert.deepEqual(r.semArquivo, ['/uploads/fotos/sumiu.jpg']);
  assert.deepEqual(r.falhas, [{ chave: 'fotos/b.png', erro: 'sem permissão' }]);
  assert.equal(driver.gravados.length, 2);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('pasta de origem inexistente resulta em zero arquivos, sem erro', async () => {
  const r = await migrarUploads({ dirOrigem: path.join(os.tmpdir(), 'nao-existe-xyz'), driver: driverFalso() });
  assert.equal(r.total, 0);
});
