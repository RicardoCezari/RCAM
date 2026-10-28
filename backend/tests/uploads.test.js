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
const crypto = require('node:crypto');
const sharp = require('sharp');
const { iniciar } = require('./helpers');

let t; let ordem;
let JPEG; let PNG; let WEBP;
before(async () => {
  t = await iniciar();
  [JPEG, PNG, WEBP] = await Promise.all(['jpeg', 'png', 'webp'].map((formato) => imagem(formato)));
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

// Imagens de verdade: o servidor decodifica a foto para conferir/reduzir o tamanho
async function imagem(formato, largura = 8, altura = 8) {
  return sharp({ create: { width: largura, height: altura, channels: 3, background: '#336699' } })[formato]().toBuffer();
}

// Ruído em blocos: não comprime bem, mas continua leve o bastante para ficar abaixo do limite de 10 MB
async function fotoGrande(largura, altura, formato = 'jpeg') {
  const bloco = 8;
  const ruido = crypto.randomBytes((largura / bloco) * (altura / bloco) * 3);
  return sharp(ruido, { raw: { width: largura / bloco, height: altura / bloco, channels: 3 } })
    .resize(largura, altura, { kernel: 'nearest' })[formato]({ quality: 90 })
    .toBuffer();
}

const FALSO = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16]), Buffer.from('JFIF\0'), Buffer.alloc(32)]);
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

describe('Redução de fotos no servidor', () => {
  const lerGravada = (url) => fs.readFileSync(path.join(dir, url.replace('/uploads/', '')));

  test('foto grande (lado acima de 1600 px) é gravada reduzida, em JPEG e na mesma proporção', async () => {
    const r = await enviar(`/ordens/${ordem.id}/fotos`, 'fotos', await fotoGrande(3200, 2400), 'image/jpeg');
    assert.equal(r.status, 201, JSON.stringify(r.dados));
    assert.ok(r.dados[0].url.endsWith('.jpg'));
    const { width, height, format } = await sharp(lerGravada(r.dados[0].url)).metadata();
    assert.equal(format, 'jpeg');
    assert.equal(Math.max(width, height), 1600);
    assert.equal(Math.round((width / height) * 100), 133);
  });

  test('foto pesada mesmo dentro de 1600 px é recomprimida abaixo de 1,5 MB', async () => {
    const pesada = await sharp(crypto.randomBytes(1000 * 1000 * 3), { raw: { width: 1000, height: 1000, channels: 3 } }).png().toBuffer();
    assert.ok(pesada.length > 1.5 * 1024 * 1024, `PNG de teste com ${pesada.length} bytes`);
    const r = await enviar(`/ordens/${ordem.id}/fotos`, 'fotos', pesada, 'image/png');
    assert.equal(r.status, 201, JSON.stringify(r.dados));
    assert.ok(lerGravada(r.dados[0].url).length <= 1.5 * 1024 * 1024);
  });

  test('foto que já está pequena é gravada sem ser alterada', async () => {
    const r = await enviar(`/ordens/${ordem.id}/fotos`, 'fotos', JPEG, 'image/jpeg');
    assert.equal(r.status, 201);
    assert.ok(lerGravada(r.dados[0].url).equals(JPEG));
  });

  test('original de câmera acima de 10 MB (até 30 MB) é aceito e gravado reduzido', async () => {
    const original = await sharp(crypto.randomBytes(4000 * 3000 * 3), { raw: { width: 4000, height: 3000, channels: 3 } })
      .jpeg({ quality: 100 }).toBuffer();
    assert.ok(original.length > 10 * 1024 * 1024 && original.length < 30 * 1024 * 1024, `foto de teste com ${original.length} bytes`);

    const r = await enviar(`/ordens/${ordem.id}/fotos`, 'fotos', original, 'image/jpeg');
    assert.equal(r.status, 201, JSON.stringify(r.dados));
    const { width, height } = await sharp(lerGravada(r.dados[0].url)).metadata();
    assert.equal(Math.max(width, height), 1600);
    assert.ok(lerGravada(r.dados[0].url).length <= 1.5 * 1024 * 1024);
  });

  test('arquivo acima de 30 MB é recusado com mensagem clara', async () => {
    const r = await enviar(`/ordens/${ordem.id}/fotos`, 'fotos', Buffer.alloc(31 * 1024 * 1024), 'image/jpeg');
    assert.equal(r.status, 400);
    assert.match(r.dados.message, /30 MB/);
  });

  test('imagem corrompida com cabeçalho válido é recusada', async () => {
    const antes = arquivosGravados();
    const r = await enviar(`/ordens/${ordem.id}/fotos`, 'fotos', FALSO, 'image/jpeg');
    assert.equal(r.status, 400);
    assert.match(r.dados.message, /corrompida/);
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

describe('Foto de perfil do usuário', () => {
  let usuario;
  before(async () => {
    const r = await t.chamar('POST', '/usuarios', { token: t.tokens.admin, corpo: { nome: 'Foto Teste', login: `${t.PREFIXO}foto_${Date.now()}`, senha: 'senha-123456' } });
    assert.equal(r.status, 201, JSON.stringify(r.dados));
    usuario = r.dados;
  });
  after(() => t.pool.query('DELETE FROM usuarios WHERE id = $1', [usuario.id]));

  const enviarFoto = (buffer, tipo, token = t.tokens.admin) => {
    const form = new FormData();
    form.append('foto', new Blob([buffer], { type: tipo }), 'foto.jpg');
    return fetch(`${t.base}/usuarios/${usuario.id}/foto`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` }, body: form });
  };

  test('a foto é opcional: o usuário nasce sem foto', () => {
    assert.equal(usuario.foto_url, null);
  });

  test('recusa conteúdo que não é imagem e não grava nada em disco', async () => {
    const antes = arquivosGravados();
    const resp = await enviarFoto(SVG, 'image/png');
    assert.equal(resp.status, 400);
    assert.equal(arquivosGravados(), antes);
  });

  test('editor não altera a foto de ninguém', async () => {
    assert.equal((await enviarFoto(PNG, 'image/png', t.tokens.editor)).status, 403);
  });

  test('troca a foto apagando a anterior, aparece na lista e remove ao final', async () => {
    const primeira = await (await enviarFoto(JPEG, 'image/jpeg')).json();
    assert.match(primeira.foto_url, /^\/uploads\/usuarios\/[\w-]+\.jpg$/);
    const gravados = arquivosGravados();

    const segunda = await (await enviarFoto(PNG, 'image/png')).json();
    assert.match(segunda.foto_url, /\.png$/);
    assert.equal(arquivosGravados(), gravados, 'a foto anterior deve ser apagada');

    const lista = await t.chamar('GET', '/usuarios', { token: t.tokens.admin });
    assert.equal(lista.dados.find((u) => u.id === usuario.id).foto_url, segunda.foto_url);

    const removida = await t.chamar('DELETE', `/usuarios/${usuario.id}/foto`, { token: t.tokens.admin });
    assert.equal(removida.status, 200);
    assert.equal(removida.dados.foto_url, null);
    assert.equal(arquivosGravados(), gravados - 1);
  });

  test('foto de perfil é reduzida para no máximo 512 px', async () => {
    const resposta = await (await enviarFoto(await fotoGrande(1600, 1200), 'image/jpeg')).json();
    const gravada = fs.readFileSync(path.join(dir, resposta.foto_url.replace('/uploads/', '')));
    const { width, height } = await sharp(gravada).metadata();
    assert.equal(Math.max(width, height), 512);
  });

  test('usuário inexistente devolve 404 sem deixar arquivo órfão', async () => {
    const antes = arquivosGravados();
    const form = new FormData();
    form.append('foto', new Blob([JPEG], { type: 'image/jpeg' }), 'foto.jpg');
    const resp = await fetch(`${t.base}/usuarios/2147483000/foto`, { method: 'PUT', headers: { Authorization: `Bearer ${t.tokens.admin}` }, body: form });
    assert.equal(resp.status, 404);
    assert.equal(arquivosGravados(), antes);
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