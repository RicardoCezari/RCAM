/*
 * Uploads: o conteúdo real do arquivo (magic bytes) precisa ser JPEG, PNG ou WEBP, não só o Content-Type informado.
 * Os arquivos de teste vão para uma pasta temporária (nunca para backend/uploads).
 */
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'azteca-uploads-'));
process.env.UPLOADS_DIR = dir;

const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { iniciar } = require('./helpers');

let t; let ordem;
before(async () => {
  t = await iniciar();
  const c = (await t.criarCliente()).dados;
  ordem = (await t.chamar('POST', '/ordens', {
    token: t.tokens.editor,
    corpo: { cliente_id: c.id, data_entrega: new Date().toISOString().slice(0, 10), itens: [{ tipo_objeto_id: t.tipoId, servico_id: t.servicoId, quantidade: 1, valor_unitario: 1 }] },
  })).dados;
});
after(async () => {
  await t.encerrar();
  fs.rmSync(dir, { recursive: true, force: true });
});

const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16]), Buffer.from('JFIF\0'), Buffer.alloc(32)]);
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0x20, 0, 0, 0]), Buffer.from('WEBPVP8 '), Buffer.alloc(24)]);
const HTML = Buffer.from('<html><script>alert(document.cookie)</script></html>');
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
const PHP = Buffer.from('<?php system($_GET["c"]); ?>');

async function enviar(caminho, campo, buffer, tipo, token = t.tokens.editor, nome = 'arquivo.jpg') {
  const form = new FormData();
  form.append(campo, new Blob([buffer], { type: tipo }), nome);
  const resp = await fetch(`${t.base}${caminho}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
  const texto = await resp.text();
  let dados = null;
  try { dados = JSON.parse(texto); } catch { dados = texto; }
  return { status: resp.status, dados };
}

const arquivosGravados = () => fs.existsSync(dir)
  ? fs.readdirSync(dir, { recursive: true, withFileTypes: true }).filter((e) => e.isFile()).length
  : 0;

describe('Fotos da O.S.: validação do conteúdo real', () => {
  for (const [nome, buf, tipo] of [['HTML', HTML, 'image/jpeg'], ['SVG', SVG, 'image/png'], ['PHP', PHP, 'image/webp'], ['arquivo vazio', Buffer.alloc(0), 'image/jpeg']]) {
    test(`recusa ${nome} enviado como imagem e não grava nada em disco`, async () => {
      const antes = arquivosGravados();
      const r = await enviar(`/ordens/${ordem.id}/fotos`, 'fotos', buf, tipo);
      assert.equal(r.status, 400, JSON.stringify(r.dados));
      assert.equal(arquivosGravados(), antes);
      const { rows } = await t.pool.query('SELECT 1 FROM ordem_fotos WHERE ordem_id = $1', [ordem.id]);
      assert.equal(rows.length, 0);
    });
  }

  test('recusa o content-type não permitido (gif) mesmo com bytes de JPEG', async () => {
    const r = await enviar(`/ordens/${ordem.id}/fotos`, 'fotos', JPEG, 'image/gif');
    assert.equal(r.status, 400);
  });

  test('aceita JPEG, PNG e WEBP verdadeiros', async () => {
    for (const [buf, tipo, ext] of [[JPEG, 'image/jpeg', '.jpg'], [PNG, 'image/png', '.png'], [WEBP, 'image/webp', '.webp']]) {
      const r = await enviar(`/ordens/${ordem.id}/fotos`, 'fotos', buf, tipo);
      assert.equal(r.status, 201, JSON.stringify(r.dados));
      assert.ok(r.dados[0].url.endsWith(ext), r.dados[0].url);
    }
  });

  test('a extensão gravada vem do conteúdo detectado, não do Content-Type enviado', async () => {
    const r = await enviar(`/ordens/${ordem.id}/fotos`, 'fotos', PNG, 'image/jpeg');
    assert.equal(r.status, 201);
    assert.ok(r.dados[0].url.endsWith('.png'), r.dados[0].url);
  });

  test('lote com um arquivo falso é recusado por inteiro (nenhuma foto do lote fica gravada)', async () => {
    const antesDb = (await t.pool.query('SELECT COUNT(*)::int AS n FROM ordem_fotos WHERE ordem_id = $1', [ordem.id])).rows[0].n;
    const antes = arquivosGravados();
    const form = new FormData();
    form.append('fotos', new Blob([JPEG], { type: 'image/jpeg' }), 'a.jpg');
    form.append('fotos', new Blob([HTML], { type: 'image/jpeg' }), 'b.jpg');
    const resp = await fetch(`${t.base}/ordens/${ordem.id}/fotos`, { method: 'POST', headers: { Authorization: `Bearer ${t.tokens.editor}` }, body: form });
    assert.equal(resp.status, 400);
    assert.equal((await t.pool.query('SELECT COUNT(*)::int AS n FROM ordem_fotos WHERE ordem_id = $1', [ordem.id])).rows[0].n, antesDb);
    assert.equal(arquivosGravados(), antes);
  });
});

describe('Logo da empresa', () => {
  test('recusa conteúdo que não é imagem', async () => {
    const r = await enviar('/configuracoes/logo', 'logo', SVG, 'image/png', t.tokens.admin, 'logo.png');
    assert.equal(r.status, 400, JSON.stringify(r.dados));
  });

  test('editor não troca a logo', async () => {
    const r = await enviar('/configuracoes/logo', 'logo', PNG, 'image/png', t.tokens.editor, 'logo.png');
    assert.equal(r.status, 403);
  });
});

describe('Configurações da empresa', () => {
  test('atualiza vários campos de uma vez e texto vazio remove o campo', async () => {
    const antes = (await t.chamar('GET', '/configuracoes')).dados;
    try {
      const r = await t.chamar('PUT', '/configuracoes', { token: t.tokens.admin, corpo: { empresa_nome: 'zz teste Ltda', empresa_instagram: '@zzteste', nota_mensagem: 'obrigado' } });
      assert.equal(r.status, 200);
      assert.equal(r.dados.empresa_nome, 'zz teste Ltda');
      assert.equal(r.dados.empresa_instagram, '@zzteste');
      const v = await t.chamar('PUT', '/configuracoes', { token: t.tokens.admin, corpo: { empresa_instagram: '  ' } });
      assert.equal(v.dados.empresa_instagram, '');
      assert.equal(v.dados.empresa_nome, 'zz teste Ltda');
    } finally {
      await t.chamar('PUT', '/configuracoes', { token: t.tokens.admin, corpo: {
        empresa_nome: antes.empresa_nome, empresa_instagram: antes.empresa_instagram, nota_mensagem: antes.nota_mensagem } });
    }
  });

  test('número, complemento e CNPJ da empresa são opcionais; CNPJ inválido é recusado', async () => {
    const antes = (await t.chamar('GET', '/configuracoes')).dados;
    try {
      const ok = await t.chamar('PUT', '/configuracoes', { token: t.tokens.admin, corpo: {
        empresa_numero: '123', empresa_complemento: 'Sala 2', empresa_bairro: 'Centro', empresa_cnpj: '11.222.333/0001-81' } });
      assert.equal(ok.status, 200);
      assert.equal(ok.dados.empresa_numero, '123');
      assert.equal(ok.dados.empresa_bairro, 'Centro');
      assert.equal(ok.dados.empresa_complemento, 'Sala 2');
      assert.equal(ok.dados.empresa_cnpj, '11.222.333/0001-81');

      const ruim = await t.chamar('PUT', '/configuracoes', { token: t.tokens.admin, corpo: { empresa_cnpj: '11.222.333/0001-82' } });
      assert.equal(ruim.status, 422);

      const vazio = await t.chamar('PUT', '/configuracoes', { token: t.tokens.admin, corpo: {
        empresa_numero: '', empresa_complemento: '', empresa_bairro: '', empresa_cnpj: '' } });
      assert.equal(vazio.status, 200);
      assert.equal(vazio.dados.empresa_cnpj, '');
    } finally {
      await t.chamar('PUT', '/configuracoes', { token: t.tokens.admin, corpo: {
        empresa_numero: antes.empresa_numero, empresa_complemento: antes.empresa_complemento, empresa_bairro: antes.empresa_bairro, empresa_cnpj: antes.empresa_cnpj } });
    }
  });

  test('a gravação é atômica: falha no meio não deixa metade dos campos gravada', async () => {
    const antes = (await t.chamar('GET', '/configuracoes')).dados;
    // NUL é recusado pelo PostgreSQL: o 2º campo falha depois de o 1º já ter sido gravado na mesma operação
    const r = await t.chamar('PUT', '/configuracoes', { token: t.tokens.admin, corpo: { empresa_nome: 'NOME-NAO-PODE-FICAR', empresa_endereco: 'rua\u0000x' } });
    assert.ok(r.status >= 400, `status ${r.status}`);
    const depois = (await t.chamar('GET', '/configuracoes')).dados;
    assert.equal(depois.empresa_nome, antes.empresa_nome);
  });
});