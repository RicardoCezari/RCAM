const { pool } = require('../config/database');
const AppError = require('../utils/AppError');

/*
 * Ordem de lock única em toda escrita: primeiro a linha da O.S., depois os itens. Assim itens e estado da O.S.
 * alterados ao mesmo tempo se enfileiram (sem deadlock) e a checagem "O.S. editável?" vale até o COMMIT.
 */
async function travarOrdem(client, ordemId, { editavel = true } = {}) {
  const { rows } = await client.query('SELECT estado, data_entregue FROM ordens_servico WHERE id = $1 FOR UPDATE', [ordemId]);
  if (!rows[0]) throw AppError.notFound('Ordem de serviço não encontrada');
  if (editavel && (rows[0].estado === 'ENTREGUE' || rows[0].estado === 'CANCELADO')) {
    throw AppError.conflict(
      `Esta O.S. já foi ${rows[0].estado === 'ENTREGUE' ? 'entregue' : 'cancelada'} e não pode mais ser alterada.`
    );
  }
  return rows[0];
}

/*
 * Listagem em duas etapas:
 *  1) subconsulta "p" aplica filtros, ordena e pagina apenas as O.S. necessárias;
 *  2) os agregados dos itens são calculados UMA vez por O.S. da página (LATERAL), em vez de 8 subconsultas
 *     correlacionadas por linha. O resultado mantém exatamente os mesmos campos da versão anterior.
 */
async function listar({
  conditions, params, limit, offset,
  orderBy = 'os.data_criacao DESC, os.id DESC',
  orderByExterno = 'p.data_criacao DESC, p.id DESC',
}) {
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const dataParams = [...params, limit, offset];
  const limitIdx   = dataParams.length - 1;
  const offsetIdx  = dataParams.length;
  const sql = `
    SELECT
      p.*,
      a.objetos, a.itens_ativos, a.itens_concluidos, a.itens_total,
      a.itens_orcamento, a.itens_autorizado, a.itens_andamento, a.itens_entregue
    FROM (
      SELECT
        os.id, os.numero, os.estado,
        os.data_criacao, os.data_entrega, os.hora_entrega,
        os.valor_total, os.valor_orcamento, os.observacoes, os.data_entregue,
        c.id   AS cliente_id,
        c.nome AS cliente_nome,
        c.telefone AS cliente_telefone,
        u.id   AS usuario_id,
        u.nome AS usuario_nome
      FROM ordens_servico os
      JOIN clientes c ON c.id = os.cliente_id
      JOIN usuarios u ON u.id = os.usuario_id
      ${where}
      ORDER BY ${orderBy}
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    ) p
    LEFT JOIN LATERAL (
      SELECT
        STRING_AGG(DISTINCT t.nome, ', ') AS objetos,
        (COUNT(*) FILTER (WHERE i.estado IS DISTINCT FROM 'CANCELADO'))::int AS itens_ativos,
        (COUNT(*) FILTER (WHERE i.estado IN ('CONCLUIDO', 'ENTREGUE')))::int AS itens_concluidos,
        COUNT(*)::int AS itens_total,
        (COUNT(*) FILTER (WHERE i.estado = 'ORCAMENTO'))::int AS itens_orcamento,
        (COUNT(*) FILTER (WHERE i.estado = 'AUTORIZADO'))::int AS itens_autorizado,
        (COUNT(*) FILTER (WHERE i.estado = 'EM_ANDAMENTO'))::int AS itens_andamento,
        (COUNT(*) FILTER (WHERE i.estado = 'ENTREGUE'))::int AS itens_entregue
      FROM itens_ordem_servico i
      JOIN tipos_objeto t ON t.id = i.tipo_objeto_id
      WHERE i.ordem_id = p.id
    ) a ON TRUE
    ORDER BY ${orderByExterno}
  `;

  // A contagem só precisa dos JOINs quando algum filtro usa as tabelas de cliente/usuário
  const usaCliente = conditions.some((c) => /\bc\./.test(c));
  const usaUsuario = conditions.some((c) => /\bu\./.test(c));
  const countSql = `
    SELECT COUNT(*) FROM ordens_servico os
    ${usaCliente ? 'JOIN clientes c ON c.id = os.cliente_id' : ''}
    ${usaUsuario ? 'JOIN usuarios u ON u.id = os.usuario_id' : ''}
    ${where}`;

  const [countRes, dataRes] = await Promise.all([
    pool.query(countSql, params),
    pool.query(sql, dataParams),
  ]);

  return { rows: dataRes.rows, total: Number(countRes.rows[0].count) };
}

async function buscarPorId(id) {
  const { rows } = await pool.query(
    `SELECT os.*,
       c.nome AS cliente_nome, c.telefone AS cliente_telefone, c.cpf AS cliente_cpf,
       u.nome AS usuario_nome, ue.nome AS entregue_por_nome
     FROM ordens_servico os
     JOIN clientes c ON c.id = os.cliente_id
     JOIN usuarios u ON u.id = os.usuario_id
     LEFT JOIN usuarios ue ON ue.id = os.entregue_por
     WHERE os.id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function buscarItens(ordemId) {
  const { rows } = await pool.query(
    `SELECT i.*,
       s.nome AS servico_nome, s.valor AS servico_valor_padrao,
       t.nome AS tipo_objeto_nome
     FROM itens_ordem_servico i
     JOIN servicos     s ON s.id = i.servico_id
     JOIN tipos_objeto t ON t.id = i.tipo_objeto_id
     WHERE i.ordem_id = $1
     ORDER BY i.id`,
    [ordemId]
  );
  return rows;
}

/* Cria OS + itens dentro de uma única transação */
async function criar({ cliente_id, usuario_id, estado = 'ENTRADA', data_entrega, hora_entrega, observacoes, itens = [] }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: osRows } = await client.query(
      `INSERT INTO ordens_servico (cliente_id, usuario_id, estado, data_entrega, hora_entrega, observacoes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [cliente_id, usuario_id, estado, data_entrega, hora_entrega || null, observacoes || null]
    );
    const os = osRows[0];

    for (const item of itens) {
      await client.query(
        `INSERT INTO itens_ordem_servico
           (ordem_id, tipo_objeto_id, servico_id, quantidade, valor_unitario, eh_orcamento, estado, observacoes, foto_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          os.id,
          item.tipo_objeto_id,
          item.servico_id,
          item.quantidade || 1,
          item.valor_unitario || 0,
          item.eh_orcamento || false,
          item.eh_orcamento ? 'ORCAMENTO' : 'CADASTRADO',
          item.observacoes || null,
          item.foto_url || null,
        ]
      );
    }

    await client.query('COMMIT');
    return os;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function atualizar(id, { data_entrega, hora_entrega, observacoes }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await travarOrdem(client, id);
    await client.query(
      `UPDATE ordens_servico
       SET data_entrega = COALESCE($1, data_entrega),
           hora_entrega = $2,
           observacoes  = $3,
           data_atualizacao = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [data_entrega, hora_entrega ?? null, observacoes ?? null, id]
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// O estado da O.S. é calculado a partir dos itens (cancelados não contam)
function derivarEstadoOrdem(estadosItens) {
  const ativos = estadosItens.filter((e) => e !== 'CANCELADO');
  if (!ativos.length) return 'CANCELADO';
  if (ativos.every((e) => e === 'ENTREGUE')) return 'ENTREGUE';
  if (ativos.every((e) => e === 'CONCLUIDO' || e === 'ENTREGUE')) return 'CONCLUIDO';
  if (ativos.includes('ORCAMENTO')) return 'ORCAMENTO';
  if (ativos.some((e) => e !== 'CADASTRADO')) return 'EM_ANDAMENTO';
  return 'ENTRADA';
}

/* Recalcula e grava o estado da O.S. a partir dos itens. `db` é um client ou o pool. */
async function recalcularEstadoOrdem(db, ordemId, usuarioId = null) {
  const { rows: itens } = await db.query(
    'SELECT estado FROM itens_ordem_servico WHERE ordem_id = $1',
    [ordemId]
  );
  if (!itens.length) return null;

  const novo = derivarEstadoOrdem(itens.map((i) => i.estado));
  const { rows: atual } = await db.query('SELECT estado FROM ordens_servico WHERE id = $1', [ordemId]);
  if (!atual[0]) return null;
  if (atual[0].estado === novo) return novo;

  const entregue = novo === 'ENTREGUE';
  await db.query(
    `UPDATE ordens_servico
        SET estado = $1,
            data_atualizacao = CURRENT_TIMESTAMP,
            data_entregue = CASE WHEN $3::boolean THEN COALESCE(data_entregue, CURRENT_TIMESTAMP) ELSE NULL END,
            entregue_por  = CASE WHEN $3::boolean THEN COALESCE(entregue_por, $4::int) ELSE NULL END
      WHERE id = $2`,
    [novo, ordemId, entregue, usuarioId]
  );
  // Ao entregar a O.S., os itens cancelados voltam ao cliente junto (baixa de tudo que ficou no balcão)
  if (entregue) {
    await db.query(
      `UPDATE itens_ordem_servico
          SET data_entregue = CURRENT_TIMESTAMP, entregue_por = $2::int
        WHERE ordem_id = $1 AND estado = 'CANCELADO' AND data_entregue IS NULL`,
      [ordemId, usuarioId]
    );
  }
  await db.query(
    `INSERT INTO ordem_historico (ordem_id, estado_anterior, estado_novo, usuario_id)
     VALUES ($1, $2, $3, $4)`,
    [ordemId, atual[0].estado, novo, usuarioId]
  );
  return novo;
}

const ESTADO_ITEM_POR_ESTADO_OS = {
  ENTRADA: 'CADASTRADO',
  ORCAMENTO: 'ORCAMENTO',
  AUTORIZADO: 'AUTORIZADO',
  EM_ANDAMENTO: 'EM_ANDAMENTO',
  CONCLUIDO: 'CONCLUIDO',
  ENTREGUE: 'ENTREGUE',
  CANCELADO: 'CANCELADO',
};

/*
 * Muda o estado da O.S.:
 * - com itens: aplica o estado a todos os itens que ainda não foram entregues nem cancelados
 *   e recalcula a O.S.
 * - sem itens: grava o estado diretamente
 * - O.S. cancelada: pode ser reaberta (ENTRADA: itens cancelados voltam a CADASTRADO, o cliente fecha o serviço
 *   na mesma O.S.) ou ter a devolução registrada (ENTREGUE), que não muda o estado: continua CANCELADO e
 *   data_entregue marca que já foi devolvida.
 */
async function atualizarEstado(id, estado, usuarioId = null) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let atual;
    try {
      atual = [await travarOrdem(client, id, { editavel: false })];
    } catch (err) {
      if (err.statusCode === 404) {
        await client.query('ROLLBACK');
        return null;
      }
      throw err;
    }

    if (atual[0].estado === 'ENTREGUE') {
      throw AppError.conflict('Esta O.S. já foi entregue e não pode mais ser alterada.');
    }
    if (atual[0].estado === 'CANCELADO') {
      if (estado === 'ENTRADA') {
        // Reabertura: o cliente decidiu fazer o serviço, então a mesma O.S. volta para a entrada
        const { rows: cancelados } = await client.query(
          `SELECT id FROM itens_ordem_servico WHERE ordem_id = $1 AND estado = 'CANCELADO' FOR UPDATE`,
          [id]
        );
        for (const it of cancelados) {
          await client.query(
            `UPDATE itens_ordem_servico
                SET estado = 'CADASTRADO', eh_orcamento = FALSE, data_entregue = NULL, entregue_por = NULL
              WHERE id = $1`,
            [it.id]
          );
          await client.query(
            `INSERT INTO ordem_historico (ordem_id, item_id, estado_anterior, estado_novo, usuario_id)
             VALUES ($1, $2, 'CANCELADO', 'CADASTRADO', $3)`,
            [id, it.id, usuarioId]
          );
        }
        if (cancelados.length) {
          await recalcularEstadoOrdem(client, id, usuarioId);
        } else {
          await client.query(
            `UPDATE ordens_servico
                SET estado = 'ENTRADA', data_entregue = NULL, entregue_por = NULL, data_atualizacao = CURRENT_TIMESTAMP
              WHERE id = $1`,
            [id]
          );
          await client.query(
            `INSERT INTO ordem_historico (ordem_id, estado_anterior, estado_novo, usuario_id)
             VALUES ($1, 'CANCELADO', 'ENTRADA', $2)`,
            [id, usuarioId]
          );
        }
        const { rows: reaberta } = await client.query(
          'SELECT id, numero, estado, data_entregue FROM ordens_servico WHERE id = $1',
          [id]
        );
        await client.query('COMMIT');
        return reaberta[0];
      }
      if (atual[0].data_entregue) {
        throw AppError.conflict('Esta O.S. cancelada já foi devolvida ao cliente.');
      }
      if (estado !== 'ENTREGUE') {
        throw AppError.conflict('Esta O.S. foi cancelada: só é possível registrar a devolução ao cliente ou reabri-la.');
      }
      await client.query(
        `UPDATE itens_ordem_servico
            SET data_entregue = CURRENT_TIMESTAMP, entregue_por = $2::int
          WHERE ordem_id = $1 AND estado = 'CANCELADO' AND data_entregue IS NULL`,
        [id, usuarioId]
      );
      await client.query(
        `UPDATE ordens_servico
            SET data_entregue = CURRENT_TIMESTAMP, entregue_por = $2::int, data_atualizacao = CURRENT_TIMESTAMP
          WHERE id = $1`,
        [id, usuarioId]
      );
      await client.query(
        `INSERT INTO ordem_historico (ordem_id, estado_anterior, estado_novo, usuario_id)
         VALUES ($1, 'CANCELADO', 'DEVOLVIDO', $2)`,
        [id, usuarioId]
      );
      const { rows: devolvida } = await client.query(
        'SELECT id, numero, estado, data_entregue FROM ordens_servico WHERE id = $1',
        [id]
      );
      await client.query('COMMIT');
      return devolvida[0];
    }

    const { rows: itens } = await client.query(
      `SELECT id, estado FROM itens_ordem_servico
        WHERE ordem_id = $1 AND estado NOT IN ('CANCELADO', 'ENTREGUE')
        FOR UPDATE`,
      [id]
    );
    const { rows: [{ total }] } = await client.query(
      'SELECT COUNT(*)::int AS total FROM itens_ordem_servico WHERE ordem_id = $1',
      [id]
    );

    // Entrega só do que está pronto: itens cancelados ficam de fora, qualquer outro item pendente bloqueia
    if (estado === 'ENTREGUE') {
      const naoProntos = itens.filter((it) => it.estado !== 'CONCLUIDO').length;
      if (naoProntos > 0) {
        throw AppError.conflict(
          `Não é possível entregar: ${naoProntos} ${naoProntos === 1 ? 'item ainda não está' : 'itens ainda não estão'} pronto${naoProntos === 1 ? '' : 's'}.`
        );
      }
      if (total === 0 && atual[0].estado !== 'CONCLUIDO') {
        throw AppError.conflict('Não é possível entregar: a O.S. ainda não está pronta.');
      }
    }

    if (total > 0) {
      const novoItem = ESTADO_ITEM_POR_ESTADO_OS[estado];
      const entregando = novoItem === 'ENTREGUE';
      for (const it of itens) {
        if (it.estado === novoItem) continue;
        await client.query(
          `UPDATE itens_ordem_servico
              SET estado = $2::varchar,
                  eh_orcamento = ($2::varchar = 'ORCAMENTO'),
                  data_entregue = CASE WHEN $3::boolean THEN CURRENT_TIMESTAMP ELSE NULL END,
                  entregue_por  = CASE WHEN $3::boolean THEN $4::int ELSE NULL END
            WHERE id = $1`,
          [it.id, novoItem, entregando, usuarioId]
        );
        await client.query(
          `INSERT INTO ordem_historico (ordem_id, item_id, estado_anterior, estado_novo, usuario_id)
           VALUES ($1, $2, $3, $4, $5)`,
          [id, it.id, it.estado, novoItem, usuarioId]
        );
      }
      await recalcularEstadoOrdem(client, id, usuarioId);
    } else {
      const entregue = estado === 'ENTREGUE';
      if (estado === 'AUTORIZADO') estado = 'EM_ANDAMENTO';
      await client.query(
        `UPDATE ordens_servico
            SET estado = $1,
                data_atualizacao = CURRENT_TIMESTAMP,
                data_entregue = CASE WHEN $3::boolean THEN CURRENT_TIMESTAMP ELSE NULL END,
                entregue_por  = CASE WHEN $3::boolean THEN $4::int ELSE NULL END
          WHERE id = $2`,
        [estado, id, entregue, usuarioId]
      );
      if (atual[0].estado !== estado) {
        await client.query(
          `INSERT INTO ordem_historico (ordem_id, estado_anterior, estado_novo, usuario_id)
           VALUES ($1, $2, $3, $4)`,
          [id, atual[0].estado, estado, usuarioId]
        );
      }
    }

    const { rows } = await client.query(
      'SELECT id, numero, estado, data_entregue FROM ordens_servico WHERE id = $1',
      [id]
    );
    await client.query('COMMIT');
    return rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Item + recálculo do estado da O.S. na mesma transação: se um passo falhar, nada fica pela metade
async function inserirItem({ ordem_id, tipo_objeto_id, servico_id, quantidade, valor_unitario, eh_orcamento, observacoes, foto_url }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await travarOrdem(client, ordem_id);
    const { rows } = await client.query(
      `INSERT INTO itens_ordem_servico
         (ordem_id, tipo_objeto_id, servico_id, quantidade, valor_unitario, eh_orcamento, estado, observacoes, foto_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [ordem_id, tipo_objeto_id, servico_id, quantidade || 1, valor_unitario || 0,
        eh_orcamento || false, eh_orcamento ? 'ORCAMENTO' : 'CADASTRADO', observacoes || null, foto_url || null]
    );
    await recalcularEstadoOrdem(client, ordem_id);
    await client.query('COMMIT');
    return rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function buscarItemPorId(itemId, ordemId) {
  const { rows } = await pool.query(
    'SELECT id FROM itens_ordem_servico WHERE id = $1 AND ordem_id = $2',
    [itemId, ordemId]
  );
  return rows[0] || null;
}

async function atualizarItem(itemId, { quantidade, valor_unitario, eh_orcamento, estado, observacoes, foto_url, data_entrega, hora_entrega }, usuarioId = null) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // A O.S. do item é travada antes do item (mesma ordem de lock de atualizarEstado)
    const { rows: dono } = await client.query('SELECT ordem_id FROM itens_ordem_servico WHERE id = $1', [itemId]);
    if (!dono[0]) {
      await client.query('ROLLBACK');
      return null;
    }
    await travarOrdem(client, dono[0].ordem_id);

    const { rows: atual } = await client.query(
      'SELECT ordem_id, estado FROM itens_ordem_servico WHERE id = $1 FOR UPDATE',
      [itemId]
    );
    if (!atual[0]) {
      await client.query('ROLLBACK');
      return null;
    }
    const estadoAnterior = atual[0].estado;
    const mudouEstado = estado && estado !== estadoAnterior;
    const entregando = mudouEstado && estado === 'ENTREGUE';
    if (entregando && estadoAnterior !== 'CONCLUIDO') {
      throw AppError.conflict('Não é possível entregar: o item ainda não está pronto.');
    }
    // O marcador de orçamento acompanha o estado do item
    const ehOrcamento = estado ? estado === 'ORCAMENTO' : eh_orcamento;

    const { rows } = await client.query(
      `UPDATE itens_ordem_servico
       SET quantidade     = COALESCE($1, quantidade),
           valor_unitario = COALESCE($2, valor_unitario),
           eh_orcamento   = COALESCE($3, eh_orcamento),
           estado         = COALESCE($4, estado),
           observacoes    = $5,
           foto_url       = $6,
           data_entrega   = $7,
           hora_entrega   = $8,
           data_entregue  = CASE WHEN $10::boolean THEN CURRENT_TIMESTAMP
                                 WHEN $11::boolean THEN NULL
                                 ELSE data_entregue END,
           entregue_por   = CASE WHEN $10::boolean THEN $12::int
                                 WHEN $11::boolean THEN NULL
                                 ELSE entregue_por END
       WHERE id = $9
       RETURNING *`,
      [quantidade, valor_unitario, ehOrcamento, estado,
        observacoes ?? null, foto_url ?? null, data_entrega ?? null, hora_entrega ?? null, itemId,
        entregando, Boolean(mudouEstado && estadoAnterior === 'ENTREGUE'), usuarioId]
    );

    if (mudouEstado) {
      await client.query(
        `INSERT INTO ordem_historico (ordem_id, item_id, estado_anterior, estado_novo, usuario_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [atual[0].ordem_id, itemId, estadoAnterior, estado, usuarioId]
      );
    }

    await recalcularEstadoOrdem(client, atual[0].ordem_id, usuarioId);
    await client.query('COMMIT');
    return rows[0] || null;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function removerItem(itemId, ordemId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await travarOrdem(client, ordemId);
    const { rows: fotos } = await client.query(
      `SELECT url FROM ordem_fotos WHERE item_id = $1
       UNION SELECT foto_url FROM itens_ordem_servico WHERE id = $1 AND ordem_id = $2 AND foto_url IS NOT NULL`,
      [itemId, ordemId]
    );
    const { rows } = await client.query(
      'DELETE FROM itens_ordem_servico WHERE id = $1 AND ordem_id = $2 RETURNING id',
      [itemId, ordemId]
    );
    if (rows[0]) await recalcularEstadoOrdem(client, ordemId);
    await client.query('COMMIT');
    return rows[0] ? { id: rows[0].id, urls: fotos.map((f) => f.url) } : null;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function buscarFotos(ordemId) {
  const { rows } = await pool.query(
    'SELECT id, ordem_id, item_id, url, etapa, data_criacao FROM ordem_fotos WHERE ordem_id = $1 ORDER BY id',
    [ordemId]
  );
  return rows;
}

async function inserirFoto({ ordem_id, item_id, url, etapa = 'ENTRADA' }) {
  const { rows } = await pool.query(
    `INSERT INTO ordem_fotos (ordem_id, item_id, url, etapa) VALUES ($1, $2, $3, $4)
     RETURNING id, ordem_id, item_id, url, etapa, data_criacao`,
    [ordem_id, item_id || null, url, etapa]
  );
  return rows[0];
}

async function removerFoto(fotoId, ordemId) {
  const { rows } = await pool.query(
    'DELETE FROM ordem_fotos WHERE id = $1 AND ordem_id = $2 RETURNING url',
    [fotoId, ordemId]
  );
  return rows[0] || null;
}

async function buscarHistorico(ordemId) {
  const { rows } = await pool.query(
    `SELECT h.id, h.ordem_id, h.item_id, h.estado_anterior, h.estado_novo,
            h.observacao, h.data_mudanca, h.usuario_id, u.nome AS usuario_nome,
            t.nome AS tipo_objeto_nome, s.nome AS servico_nome
       FROM ordem_historico h
       LEFT JOIN usuarios u ON u.id = h.usuario_id
       LEFT JOIN itens_ordem_servico i ON i.id = h.item_id
       LEFT JOIN tipos_objeto t ON t.id = i.tipo_objeto_id
       LEFT JOIN servicos s ON s.id = i.servico_id
      WHERE h.ordem_id = $1
      ORDER BY h.data_mudanca DESC, h.id DESC`,
    [ordemId]
  );
  return rows;
}

/* Itens de O.S. já finalizadas (entregues ou canceladas) de um cliente, com as fotos de cada um.
 * Limitado aos itens mais recentes para que clientes muito antigos não gerem respostas gigantes. */
const LIMITE_HISTORICO_CLIENTE = 500;

async function historicoCliente(clienteId) {
  const { rows } = await pool.query(
    `SELECT i.id AS item_id, i.estado AS item_estado, i.quantidade, i.valor_unitario, i.valor_total,
            i.observacoes, i.data_entregue,
            os.id AS ordem_id, os.numero, os.estado AS ordem_estado,
            os.data_criacao, os.data_entregue AS ordem_data_entregue,
            t.nome AS tipo_objeto_nome, s.nome AS servico_nome,
            ue.nome AS entregue_por_nome,
            COALESCE((
              SELECT json_agg(json_build_object('id', f.id, 'item_id', f.item_id, 'url', f.url, 'etapa', f.etapa, 'data_criacao', f.data_criacao)
                              ORDER BY f.id)
                FROM ordem_fotos f
               WHERE f.ordem_id = os.id AND (f.item_id = i.id OR f.item_id IS NULL)
            ), '[]'::json) AS fotos
       FROM itens_ordem_servico i
       JOIN ordens_servico os ON os.id = i.ordem_id
       JOIN tipos_objeto t ON t.id = i.tipo_objeto_id
       JOIN servicos s ON s.id = i.servico_id
       LEFT JOIN usuarios ue ON ue.id = i.entregue_por
      WHERE os.cliente_id = $1
        AND os.estado IN ('ENTREGUE', 'CANCELADO')
      ORDER BY os.data_criacao DESC, i.id
      LIMIT $2`,
    [clienteId, LIMITE_HISTORICO_CLIENTE]
  );
  return rows;
}

module.exports = {
  listar,
  buscarPorId,
  buscarItens,
  buscarFotos,
  buscarHistorico,
  historicoCliente,
  inserirFoto,
  removerFoto,
  criar,
  atualizar,
  atualizarEstado,
  inserirItem,
  buscarItemPorId,
  atualizarItem,
  removerItem,
};
