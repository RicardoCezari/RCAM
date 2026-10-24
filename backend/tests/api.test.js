const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { iniciar } = require('./helpers');

let t;
before(async () => { t = await iniciar(); });
after(async () => { await t.encerrar(); });

const hoje = () => new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

describe('Autenticação e autorização', () => {
  test('login válido devolve token e perfil', async () => {
    const r = await t.chamar('POST', '/auth/login', { corpo: { login: `${t.PREFIXO}admin`, senha: t.SENHA } });
    assert.equal(r.status, 200);
    assert.ok(r.dados.token);
    assert.equal(r.dados.usuario.perfil, 'ADMIN');
  });

  test('senha errada e usuário inexistente recebem a mesma resposta 401', async () => {
    const a = await t.chamar('POST', '/auth/login', { corpo: { login: `${t.PREFIXO}admin`, senha: 'errada' } });
    const b = await t.chamar('POST', '/auth/login', { corpo: { login: 'nao_existe_xyz', senha: 'errada' } });
    assert.equal(a.status, 401);
    assert.equal(b.status, 401);
    assert.equal(a.dados.message, b.dados.message);
  });

  test('rotas protegidas exigem token', async () => {
    assert.equal((await t.chamar('GET', '/clientes')).status, 401);
    assert.equal((await t.chamar('GET', '/ordens')).status, 401);
    assert.equal((await t.chamar('GET', '/clientes', { token: 'invalido' })).status, 401);
  });

  test('editor não acessa administração de usuários; admin acessa', async () => {
    assert.equal((await t.chamar('GET', '/usuarios', { token: t.tokens.editor })).status, 403);
    assert.equal((await t.chamar('GET', '/usuarios', { token: t.tokens.admin })).status, 200);
  });

  test('editor não altera serviços (somente leitura)', async () => {
    const r = await t.chamar('POST', '/servicos', { token: t.tokens.editor, corpo: { nome: 'x', valor: 1 } });
    assert.equal(r.status, 403);
  });

  test('usuário desativado perde o acesso imediatamente, mesmo com token válido', async () => {
    const login = `${t.PREFIXO}temp`;
    await t.pool.query(
      `INSERT INTO usuarios (nome, login, senha, ativo, perfil)
       SELECT $1, $1, senha, TRUE, 'EDITOR' FROM usuarios WHERE login = $2
       ON CONFLICT (login) DO UPDATE SET ativo = TRUE`, [login, `${t.PREFIXO}editor`]);
    const l = await t.chamar('POST', '/auth/login', { corpo: { login, senha: t.SENHA } });
    assert.equal(l.status, 200);
    assert.equal((await t.chamar('GET', '/clientes?limit=1', { token: l.dados.token })).status, 200);

    await t.pool.query('UPDATE usuarios SET ativo = FALSE WHERE login = $1', [login]);
    const depois = await t.chamar('GET', '/clientes?limit=1', { token: l.dados.token });
    await t.pool.query('DELETE FROM usuarios WHERE login = $1', [login]);
    assert.equal(depois.status, 401);
  });
});

describe('Clientes', () => {
  test('cria, consulta e atualiza cliente (telefone normalizado para dígitos)', async () => {
    const tel = t.novoTelefone();
    const formatado = `(${tel.slice(0, 2)}) ${tel.slice(2, 7)}-${tel.slice(7)}`;
    const c = await t.criarCliente({ telefone: formatado });
    assert.equal(c.status, 201);
    assert.equal(c.dados.telefone, tel);
    assert.equal(Object.hasOwn(c.dados, 'telefone_digitos'), false, 'não expõe coluna interna');

    const g = await t.chamar('GET', `/clientes/${c.dados.id}`, { token: t.tokens.editor });
    assert.equal(g.status, 200);

    const u = await t.chamar('PUT', `/clientes/${c.dados.id}`, { token: t.tokens.editor, corpo: { nome: `${t.PREFIXO}editado`, telefone: tel } });
    assert.equal(u.status, 200);
    assert.equal(u.dados.nome, `${t.PREFIXO}editado`);
  });

  test('rejeita dados inválidos com 422', async () => {
    const t0 = { token: t.tokens.editor };
    assert.equal((await t.chamar('POST', '/clientes', { ...t0, corpo: { telefone: t.novoTelefone() } })).status, 422, 'sem nome');
    assert.equal((await t.chamar('POST', '/clientes', { ...t0, corpo: { nome: 'A', telefone: '123' } })).status, 422, 'telefone curto');
    assert.equal((await t.chamar('POST', '/clientes', { ...t0, corpo: { nome: 'A', telefone: t.novoTelefone(), cpf: '123' } })).status, 422, 'cpf curto');
    assert.equal((await t.chamar('POST', '/clientes', { ...t0, corpo: { nome: 'A', telefone: t.novoTelefone(), email: 'nao-e-email' } })).status, 422, 'email');
    assert.equal((await t.chamar('GET', '/clientes/abc', t0)).status, 422, 'id não numérico');
  });

  test('telefone duplicado é recusado mesmo com formatação diferente', async () => {
    const tel = t.novoTelefone();
    assert.equal((await t.criarCliente({ telefone: tel })).status, 201);
    const formatado = `(${tel.slice(0, 2)}) ${tel.slice(2, 7)}-${tel.slice(7)}`;
    assert.equal((await t.criarCliente({ telefone: formatado })).status, 409);
  });

  test('banco impede telefone duplicado mesmo com formatação diferente (índice único em telefone_digitos)', async () => {
    const tel = t.novoTelefone();
    const formatado = `(${tel.slice(0, 2)}) ${tel.slice(2, 7)}-${tel.slice(7)}`;
    const nome = `${t.PREFIXO}legado`;
    await t.pool.query('INSERT INTO clientes (nome, telefone) VALUES ($1, $2)', [nome, formatado]);
    await assert.rejects(
      t.pool.query('INSERT INTO clientes (nome, telefone) VALUES ($1, $2)', [nome, tel]),
      (err) => err.code === '23505'
    );
    // E pela API, o cliente legado também é reconhecido pelos dígitos
    const dup = await t.criarCliente({ telefone: tel });
    assert.equal(dup.status, 409);
  });

  test('criações simultâneas com o mesmo telefone: só uma vence', async () => {
    const tel = t.novoTelefone();
    const rs = await Promise.all(Array.from({ length: 6 }, () => t.criarCliente({ telefone: tel })));
    const status = rs.map((r) => r.status).sort();
    assert.deepEqual(status, [201, 409, 409, 409, 409, 409]);
  });

  test('paginação é limitada e tolera parâmetros inválidos', async () => {
    const t0 = { token: t.tokens.editor };
    const a = await t.chamar('GET', '/clientes?limit=100000', t0);
    assert.equal(a.status, 200);
    assert.ok(a.dados.limit <= 100, `limit devolvido: ${a.dados.limit}`);
    assert.ok(a.dados.data.length <= 100);

    const b = await t.chamar('GET', '/clientes?limit=abc&page=-3', t0);
    assert.equal(b.status, 200);
    assert.equal(b.dados.page, 1);
    assert.equal(b.dados.limit, 20);
    assert.ok(typeof b.dados.total === 'number');
  });

  test('busca por nome, telefone formatado e CPF', async () => {
    const tel = t.novoTelefone();
    const cpf = String(Date.now()).slice(-11).padStart(11, '7');
    const c = await t.criarCliente({ telefone: tel, cpf });
    assert.equal(c.status, 201);
    const t0 = { token: t.tokens.editor };

    const porNome = await t.chamar('GET', `/clientes?q=${encodeURIComponent(c.dados.nome)}`, t0);
    assert.ok(porNome.dados.data.some((x) => x.id === c.dados.id), 'nome');

    const formatado = `(${tel.slice(0, 2)}) ${tel.slice(2, 7)}-${tel.slice(7)}`;
    const porTel = await t.chamar('GET', `/clientes?q=${encodeURIComponent(formatado)}`, t0);
    assert.ok(porTel.dados.data.some((x) => x.id === c.dados.id), 'telefone formatado');

    const porCpf = await t.chamar('GET', `/clientes?q=${cpf}`, t0);
    assert.ok(porCpf.dados.data.some((x) => x.id === c.dados.id), 'cpf');

    const lookupTel = await t.chamar('GET', `/clientes/telefone/${formatado.replace(/\D/g, '')}`, t0);
    assert.equal(lookupTel.dados.id, c.dados.id);
    const lookupCpf = await t.chamar('GET', `/clientes/cpf/${cpf}`, t0);
    assert.equal(lookupCpf.dados.id, c.dados.id);
  });

  test('ordenação de clientes aceita somente colunas conhecidas e respeita a direção', async () => {
    const t0 = { token: t.tokens.editor };
    const asc = await t.chamar('GET', '/clientes?ordenarPor=nome&direcao=asc&limit=20', t0);
    const desc = await t.chamar('GET', '/clientes?ordenarPor=nome&direcao=desc&limit=20', t0);
    assert.equal(asc.status, 200);
    assert.equal(desc.status, 200);
    assert.notEqual(asc.dados.data[0].id, desc.dados.data[0].id);
    const tel = await t.chamar('GET', '/clientes?ordenarPor=telefone&direcao=desc&limit=5', t0);
    assert.equal(tel.status, 200);
    const digitos = tel.dados.data.map((x) => String(x.telefone).replace(/\D/g, ''));
    assert.deepEqual(digitos, [...digitos].sort().reverse());
    const invalido = await t.chamar('GET', '/clientes?ordenarPor=nome;DROP TABLE clientes&direcao=x', t0);
    assert.equal(invalido.status, 200);
  });

  test('cliente com ordens não pode ser excluído', async () => {
    const c = await t.criarCliente();
    const os = await t.chamar('POST', '/ordens', { token: t.tokens.editor, corpo: { cliente_id: c.dados.id, data_entrega: hoje(), itens: [] } });
    assert.equal(os.status, 201);
    assert.equal((await t.chamar('DELETE', `/clientes/${c.dados.id}`, { token: t.tokens.editor })).status, 409);
  });
});

describe('Ordens de serviço', () => {
  let cliente;
  before(async () => { cliente = (await t.criarCliente()).dados; });

  const novaOs = (extra = {}) => t.chamar('POST', '/ordens', {
    token: t.tokens.editor,
    corpo: {
      cliente_id: cliente.id, data_entrega: hoje(),
      itens: [{ tipo_objeto_id: t.tipoId, servico_id: t.servicoId, quantidade: 2, valor_unitario: 30 }],
      ...extra,
    },
  });

  test('cria O.S. com itens, número sequencial e totais calculados', async () => {
    const r = await novaOs();
    assert.equal(r.status, 201);
    assert.equal(r.dados.estado, 'ENTRADA');
    assert.ok(r.dados.numero > 0);
    assert.equal(r.dados.itens.length, 1);
    assert.equal(Number(r.dados.valor_total), 60);
  });

  test('o responsável é sempre o usuário autenticado, ignorando usuario_id do corpo', async () => {
    const { rows: [outro] } = await t.pool.query(`SELECT id FROM usuarios WHERE login = $1`, [`${t.PREFIXO}admin`]);
    const eu = await t.chamar('GET', '/auth/me', { token: t.tokens.editor });
    const r = await novaOs({ usuario_id: outro.id });
    assert.equal(r.status, 201);
    assert.equal(r.dados.usuario_id, eu.dados.id);
  });

  test('valida payload de criação', async () => {
    assert.equal((await t.chamar('POST', '/ordens', { token: t.tokens.editor, corpo: { data_entrega: hoje() } })).status, 422);
    assert.equal((await novaOs({ data_entrega: 'ontem' })).status, 422);
    assert.equal((await novaOs({ itens: [{ tipo_objeto_id: t.tipoId, servico_id: t.servicoId, quantidade: 99 }] })).status, 422);
  });

  test('listagem pagina no servidor e respeita o teto de limit', async () => {
    // Não depende de dados pré-existentes: garante mais de 5 O.S. (banco vazio no CI)
    for (let i = 0; i < 6; i += 1) assert.equal((await novaOs()).status, 201);
    const a = await t.chamar('GET', '/ordens?limit=5&page=1', { token: t.tokens.editor });
    assert.equal(a.status, 200);
    assert.equal(a.dados.data.length, 5);
    assert.ok(a.dados.total > 5);

    const b = await t.chamar('GET', '/ordens?limit=100000', { token: t.tokens.editor });
    assert.ok(b.dados.limit <= 100);
    assert.ok(b.dados.data.length <= 100);

    const c = await t.chamar('GET', '/ordens?page=2&limit=5', { token: t.tokens.editor });
    assert.notEqual(c.dados.data[0].id, a.dados.data[0].id);
  });

  test('listagem traz os contadores por estado de item e filtra por situação', async () => {
    const os = (await novaOs()).dados;
    const r = await t.chamar('GET', `/ordens?clienteId=${cliente.id}&situacao=pendentes&limit=100`, { token: t.tokens.editor });
    const linha = r.dados.data.find((x) => x.id === os.id);
    assert.ok(linha);
    assert.equal(linha.itens_total, 1);
    assert.equal(linha.itens_ativos, 1);
    assert.equal(linha.itens_concluidos, 0);
    assert.equal(linha.itens_orcamento, 0);
    assert.match(linha.objetos, new RegExp(`${t.PREFIXO}tipo`));
    assert.equal(linha.cliente_id, cliente.id);

    const ent = await t.chamar('GET', `/ordens?clienteId=${cliente.id}&situacao=entregues&limit=100`, { token: t.tokens.editor });
    assert.ok(!ent.dados.data.some((x) => x.id === os.id));
  });

  test('ordenação aceita somente colunas conhecidas', async () => {
    const r = await t.chamar('GET', '/ordens?ordenarPor=numero;DROP TABLE x&direcao=asc&limit=3', { token: t.tokens.editor });
    assert.equal(r.status, 200);
    const asc = await t.chamar('GET', '/ordens?ordenarPor=numero&direcao=asc&limit=5', { token: t.tokens.editor });
    const nums = asc.dados.data.map((x) => x.numero);
    assert.deepEqual(nums, [...nums].sort((a, b) => a - b));
  });

  test('busca global por nome do cliente e filtros por coluna', async () => {
    const os = (await novaOs()).dados;
    const q = await t.chamar('GET', `/ordens?q=${encodeURIComponent(cliente.nome)}&limit=50`, { token: t.tokens.editor });
    assert.ok(q.dados.data.some((x) => x.id === os.id));
    const n = await t.chamar('GET', `/ordens?numero=${os.numero}&limit=50`, { token: t.tokens.editor });
    assert.ok(n.dados.data.some((x) => x.id === os.id));
  });

  test('filtro por objeto e busca global encontram O.S. pelo tipo de objeto', async () => {
    const os = (await novaOs()).dados;
    const nomeTipo = `${t.PREFIXO}tipo`;
    const f = await t.chamar('GET', `/ordens?objeto=${encodeURIComponent(nomeTipo)}&clienteId=${cliente.id}&limit=100`, { token: t.tokens.editor });
    assert.equal(f.status, 200);
    assert.ok(f.dados.data.some((x) => x.id === os.id), 'filtro objeto');
    const q = await t.chamar('GET', `/ordens?q=${encodeURIComponent(nomeTipo)}&limit=100`, { token: t.tokens.editor });
    assert.ok(q.dados.data.some((x) => x.id === os.id), 'q por objeto');
    const nada = await t.chamar('GET', `/ordens?objeto=${encodeURIComponent('zzz-inexistente-zzz')}`, { token: t.tokens.editor });
    assert.equal(nada.dados.total, 0);
  });

  test('fluxo de estados: itens, mudança de estado, entrega e bloqueio após entregue', async () => {
    const os = (await novaOs()).dados;
    const item = os.itens[0];

    const add = await t.chamar('POST', `/ordens/${os.id}/itens`, { token: t.tokens.editor, corpo: { tipo_objeto_id: t.tipoId, servico_id: t.servicoId, quantidade: 1, valor_unitario: 10 } });
    assert.equal(add.status, 201);

    const upd = await t.chamar('PUT', `/ordens/${os.id}/itens/${item.id}`, { token: t.tokens.editor, corpo: { quantidade: 3, valor_unitario: 40, estado: 'AUTORIZADO' } });
    assert.equal(upd.status, 200);

    const ruim = await t.chamar('PUT', `/ordens/${os.id}/itens/${item.id}`, { token: t.tokens.editor, corpo: { quantidade: 0 } });
    assert.equal(ruim.status, 422, 'quantidade 0');
    const ruim2 = await t.chamar('PUT', `/ordens/${os.id}/itens/${item.id}`, { token: t.tokens.editor, corpo: { estado: 'INEXISTENTE' } });
    assert.ok([400, 422].includes(ruim2.status), 'estado inválido');

    const est = await t.chamar('PATCH', `/ordens/${os.id}/estado`, { token: t.tokens.editor, corpo: { estado: 'CONCLUIDO' } });
    assert.equal(est.status, 200);
    assert.equal(est.dados.estado, 'CONCLUIDO');

    const ent = await t.chamar('PATCH', `/ordens/${os.id}/estado`, { token: t.tokens.editor, corpo: { estado: 'ENTREGUE' } });
    assert.equal(ent.dados.estado, 'ENTREGUE');

    const bloq = await t.chamar('PUT', `/ordens/${os.id}`, { token: t.tokens.editor, corpo: { observacoes: 'x' } });
    assert.equal(bloq.status, 409);

    const hist = await t.chamar('GET', `/ordens/${os.id}/historico`, { token: t.tokens.editor });
    assert.ok(hist.dados.length >= 2);
  });

  test('inclusão de item é atômica: item inválido não deixa a O.S. inconsistente', async () => {
    const os = (await novaOs()).dados;
    const r = await t.chamar('POST', `/ordens/${os.id}/itens`, { token: t.tokens.editor, corpo: { tipo_objeto_id: 99999999, servico_id: t.servicoId, quantidade: 1, valor_unitario: 10 } });
    assert.ok([404, 409, 422].includes(r.status), `status ${r.status}`);
    const g = await t.chamar('GET', `/ordens/${os.id}`, { token: t.tokens.editor });
    assert.equal(g.dados.itens.length, 1);
  });

  test('entrega só é permitida para itens prontos; cancelados não bloqueiam', async () => {
    const os = (await novaOs({
      itens: [
        { tipo_objeto_id: t.tipoId, servico_id: t.servicoId, quantidade: 1, valor_unitario: 10 },
        { tipo_objeto_id: t.tipoId, servico_id: t.servicoId, quantidade: 1, valor_unitario: 20 },
      ],
    })).dados;
    const [a, b] = os.itens;
    const item = (id, estado) => t.chamar('PUT', `/ordens/${os.id}/itens/${id}`, { token: t.tokens.editor, corpo: { estado } });
    const osEstado = (estado) => t.chamar('PATCH', `/ordens/${os.id}/estado`, { token: t.tokens.editor, corpo: { estado } });

    // Nada pronto: nem o item nem a O.S. inteira podem ser entregues
    assert.equal((await item(a.id, 'ENTREGUE')).status, 409);
    assert.equal((await osEstado('ENTREGUE')).status, 409);
    assert.equal((await t.chamar('GET', `/ordens/${os.id}`, { token: t.tokens.editor })).dados.estado, 'ENTRADA');

    // Um item pronto e outro ainda em andamento: a O.S. inteira continua bloqueada
    assert.equal((await item(a.id, 'CONCLUIDO')).status, 200);
    assert.equal((await item(b.id, 'EM_ANDAMENTO')).status, 200);
    assert.equal((await osEstado('ENTREGUE')).status, 409);

    // Item cancelado não bloqueia e não é entregue
    assert.equal((await item(b.id, 'CANCELADO')).status, 200);
    assert.equal((await item(b.id, 'ENTREGUE')).status, 409);
    const ent = await osEstado('ENTREGUE');
    assert.equal(ent.status, 200);
    assert.equal(ent.dados.estado, 'ENTREGUE');
  });

  test('item pronto pode ser entregue individualmente', async () => {
    const os = (await novaOs()).dados;
    const id = os.itens[0].id;
    await t.chamar('PUT', `/ordens/${os.id}/itens/${id}`, { token: t.tokens.editor, corpo: { estado: 'CONCLUIDO' } });
    const r = await t.chamar('PUT', `/ordens/${os.id}/itens/${id}`, { token: t.tokens.editor, corpo: { estado: 'ENTREGUE' } });
    assert.equal(r.status, 200);
    assert.equal(r.dados.estado, 'ENTREGUE');
  });

  test('lista de pendentes inclui O.S. cancelada até a devolução ao cliente (baixa)', async () => {
    const cancelada = (await novaOs()).dados;
    await t.chamar('PATCH', `/ordens/${cancelada.id}/estado`, { token: t.tokens.editor, corpo: { estado: 'CANCELADO' } });
    const entregue = (await novaOs()).dados;
    await t.chamar('PATCH', `/ordens/${entregue.id}/estado`, { token: t.tokens.editor, corpo: { estado: 'CONCLUIDO' } });
    await t.chamar('PATCH', `/ordens/${entregue.id}/estado`, { token: t.tokens.editor, corpo: { estado: 'ENTREGUE' } });
    const lista = (situacao) => t.chamar('GET', `/ordens?clienteId=${cliente.id}&situacao=${situacao}&limit=100`, { token: t.tokens.editor });

    let pend = await lista('pendentes');
    assert.ok(pend.dados.data.some((x) => x.id === cancelada.id), 'cancelada aparece');
    assert.ok(!pend.dados.data.some((x) => x.id === entregue.id), 'entregue não aparece');

    // Cancelada só aceita a devolução; qualquer outra mudança continua bloqueada
    const outra = await t.chamar('PATCH', `/ordens/${cancelada.id}/estado`, { token: t.tokens.editor, corpo: { estado: 'CONCLUIDO' } });
    assert.equal(outra.status, 409);

    const dev = await t.chamar('PATCH', `/ordens/${cancelada.id}/estado`, { token: t.tokens.editor, corpo: { estado: 'ENTREGUE' } });
    assert.equal(dev.status, 200);
    assert.equal(dev.dados.estado, 'CANCELADO');
    assert.ok(dev.dados.data_entregue);

    pend = await lista('pendentes');
    assert.ok(!pend.dados.data.some((x) => x.id === cancelada.id), 'devolvida sai das pendentes');
    const ent = await lista('entregues');
    assert.ok(ent.dados.data.some((x) => x.id === cancelada.id), 'devolvida vai para entregues');
    const canc = await lista('canceladas');
    assert.ok(canc.dados.data.some((x) => x.id === cancelada.id), 'continua cancelada');

    // Já devolvida: não repete a baixa nem aceita edição
    assert.equal((await t.chamar('PATCH', `/ordens/${cancelada.id}/estado`, { token: t.tokens.editor, corpo: { estado: 'ENTREGUE' } })).status, 409);
    assert.equal((await t.chamar('PUT', `/ordens/${cancelada.id}`, { token: t.tokens.editor, corpo: { observacoes: 'x' } })).status, 409);
  });

  test('O.S. cancelada pode ser reaberta (volta para a entrada), inclusive depois de devolvida', async () => {
    const os = (await novaOs({
      itens: [
        { tipo_objeto_id: t.tipoId, servico_id: t.servicoId, quantidade: 1, valor_unitario: 10 },
        { tipo_objeto_id: t.tipoId, servico_id: t.servicoId, quantidade: 1, valor_unitario: 20 },
      ],
    })).dados;
    const estado = (e) => t.chamar('PATCH', `/ordens/${os.id}/estado`, { token: t.tokens.editor, corpo: { estado: e } });
    const buscar = async () => (await t.chamar('GET', `/ordens/${os.id}`, { token: t.tokens.editor })).dados;

    assert.equal((await estado('CANCELADO')).status, 200);
    assert.equal((await buscar()).estado, 'CANCELADO');

    const reaberta = await estado('ENTRADA');
    assert.equal(reaberta.status, 200);
    assert.equal(reaberta.dados.estado, 'ENTRADA');
    let g = await buscar();
    assert.deepEqual(g.itens.map((i) => i.estado), ['CADASTRADO', 'CADASTRADO']);
    assert.equal(g.data_entregue, null);

    // A mesma O.S. segue o fluxo normal
    assert.equal((await t.chamar('PUT', `/ordens/${os.id}`, { token: t.tokens.editor, corpo: { observacoes: 'cliente aprovou' } })).status, 200);

    // Cancelada e devolvida também pode ser reaberta: sai das entregues e volta para as pendentes
    await estado('CANCELADO');
    assert.equal((await estado('ENTREGUE')).status, 200);
    assert.equal((await estado('ENTRADA')).status, 200);
    g = await buscar();
    assert.equal(g.estado, 'ENTRADA');
    assert.equal(g.data_entregue, null);

    // Entregue continua fechada: não há como reabrir
    assert.equal((await estado('CONCLUIDO')).status, 200);
    assert.equal((await estado('ENTREGUE')).status, 200);
    assert.equal((await estado('ENTRADA')).status, 409);
  });

  test('histórico do cliente devolve os itens finalizados com suas fotos', async () => {
    const os = (await novaOs({
      itens: [
        { tipo_objeto_id: t.tipoId, servico_id: t.servicoId, quantidade: 1, valor_unitario: 10 },
        { tipo_objeto_id: t.tipoId, servico_id: t.servicoId, quantidade: 1, valor_unitario: 20 },
      ],
    })).dados;
    await t.pool.query(`INSERT INTO ordem_fotos (ordem_id, item_id, url) VALUES ($1, NULL, '/uploads/geral.jpg')`, [os.id]);
    await t.chamar('PATCH', `/ordens/${os.id}/estado`, { token: t.tokens.editor, corpo: { estado: 'CONCLUIDO' } });
    await t.chamar('PATCH', `/ordens/${os.id}/estado`, { token: t.tokens.editor, corpo: { estado: 'ENTREGUE' } });

    const r = await t.chamar('GET', `/ordens/cliente/${cliente.id}/historico`, { token: t.tokens.editor });
    assert.equal(r.status, 200);
    const linhas = r.dados.filter((x) => x.ordem_id === os.id);
    assert.equal(linhas.length, 2);
    for (const l of linhas) assert.ok(Array.isArray(l.fotos));
  });
});
