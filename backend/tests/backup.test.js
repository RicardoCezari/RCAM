/*
 * Backup: o nome do arquivo segue o nome da empresa cadastrada e a listagem ignora o prefixo na ordenação.
 * Usa uma pasta temporária e não executa o pg_dump.
 */
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'os-backup-'));
process.env.BACKUP_DIR = dir;

const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { iniciar } = require('./helpers');

let t; let backup; let configuracoes; let nomeOriginal;
before(async () => {
  t = await iniciar();
  backup = require('../src/services/backupService');
  configuracoes = require('../src/repositories/configuracoesRepository');
  nomeOriginal = await configuracoes.buscar('empresa_nome');
});
after(async () => {
  if (nomeOriginal) await configuracoes.salvar('empresa_nome', nomeOriginal);
  else await configuracoes.remover('empresa_nome');
  await t.encerrar();
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('prefixo do backup', () => {
  test('slug remove acentos, símbolos e limita o tamanho', () => {
    assert.equal(backup.slug('Ateliê do João & Filhos!'), 'atelie-do-joao-filhos');
    assert.equal(backup.slug('  '), '');
    assert.ok(backup.slug('a'.repeat(100)).length <= 40);
    assert.equal(backup.slug('../../etc/passwd'), 'etc-passwd');
  });

  test('usa o nome da empresa cadastrada', async () => {
    await configuracoes.salvar('empresa_nome', 'Relojoaria Tempo Certo');
    assert.equal(await backup.prefixoDoBackup(), 'relojoaria-tempo-certo');
  });

  test('sem empresa cadastrada, usa o nome do banco', async () => {
    await configuracoes.remover('empresa_nome');
    assert.equal(await backup.prefixoDoBackup(), backup.slug(process.env.DB_NAME));
  });
});

describe('listagem de backups', () => {
  test('ordena pela data mesmo com prefixos diferentes e ignora arquivos estranhos', async () => {
    const pasta = path.join(dir, 'banco');
    fs.mkdirSync(pasta, { recursive: true });
    for (const nome of [
      'zeta_2026-01-01_100000.sql',
      'alfa_2026-03-01_100000.sql',
      'meio_2026-02-01_100000.sql',
      'invalido.sql',
      '..sql',
    ]) fs.writeFileSync(path.join(pasta, nome), 'x');

    const { backups } = await backup.listar();
    assert.deepEqual(
      backups.map((b) => b.nome),
      ['alfa_2026-03-01_100000.sql', 'meio_2026-02-01_100000.sql', 'zeta_2026-01-01_100000.sql']
    );
  });

  test('download só aceita nomes no formato de backup', () => {
    assert.ok(backup.caminhoDoBackup('alfa_2026-03-01_100000.sql').endsWith('alfa_2026-03-01_100000.sql'));
    assert.throws(() => backup.caminhoDoBackup('../.env'), { statusCode: 404 });
    assert.throws(() => backup.caminhoDoBackup('invalido.sql'), { statusCode: 404 });
  });
});
