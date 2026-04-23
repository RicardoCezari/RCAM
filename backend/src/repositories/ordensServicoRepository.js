const { pool } = require('../config/database');

async function listar({ conditions, params, limit, offset }) {
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const dataParams = [...params, limit, offset];
  const limitIdx   = dataParams.length - 1;
  const offsetIdx  = dataParams.length;
  const sql = `
    SELECT
      os.id, os.numero, os.estado,
      os.data_criacao, os.data_entrega, os.hora_entrega,
      os.valor_total, os.valor_orcamento, os.observacoes,
      c.id   AS cliente_id,
      c.nome AS cliente_nome,
      c.telefone AS cliente_telefone,
      u.id   AS usuario_id,
      u.nome AS usuario_nome
    FROM ordens_servico os
    JOIN clientes c ON c.id = os.cliente_id
    JOIN usuarios u ON u.id = os.usuario_id
    ${where}
    ORDER BY os.data_criacao DESC
    LIMIT $${limitIdx} OFFSET $${offsetIdx}
  `;
  const countSql = `SELECT COUNT(*) FROM ordens_servico os ${where}`;

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
       u.nome AS usuario_nome
     FROM ordens_servico os
     JOIN clientes c ON c.id = os.cliente_id
     JOIN usuarios u ON u.id = os.usuario_id
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
async function criar({ cliente_id, usuario_id, data_entrega, hora_entrega, observacoes, itens = [] }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: osRows } = await client.query(
      `INSERT INTO ordens_servico (cliente_id, usuario_id, data_entrega, hora_entrega, observacoes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [cliente_id, usuario_id, data_entrega, hora_entrega || null, observacoes || null]
    );
    const os = osRows[0];

    for (const item of itens) {
      await client.query(
        `INSERT INTO itens_ordem_servico
           (ordem_id, tipo_objeto_id, servico_id, quantidade, valor_unitario, eh_orcamento, observacoes, foto_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          os.id,
          item.tipo_objeto_id,
          item.servico_id,
          item.quantidade || 1,
          item.valor_unitario || 0,
          item.eh_orcamento || false,
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
  await pool.query(
    `UPDATE ordens_servico
     SET data_entrega = COALESCE($1, data_entrega),
         hora_entrega = $2,
         observacoes  = $3,
         data_atualizacao = CURRENT_TIMESTAMP
     WHERE id = $4`,
    [data_entrega, hora_entrega ?? null, observacoes ?? null, id]
  );
}

async function atualizarEstado(id, estado) {
  const { rows } = await pool.query(
    `UPDATE ordens_servico
     SET estado = $1, data_atualizacao = CURRENT_TIMESTAMP
     WHERE id = $2
     RETURNING id, numero, estado`,
    [estado, id]
  );
  return rows[0] || null;
}

async function inserirItem({ ordem_id, tipo_objeto_id, servico_id, quantidade, valor_unitario, eh_orcamento, observacoes, foto_url }) {
  const { rows } = await pool.query(
    `INSERT INTO itens_ordem_servico
       (ordem_id, tipo_objeto_id, servico_id, quantidade, valor_unitario, eh_orcamento, observacoes, foto_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [ordem_id, tipo_objeto_id, servico_id, quantidade || 1, valor_unitario || 0,
      eh_orcamento || false, observacoes || null, foto_url || null]
  );
  return rows[0];
}

async function buscarItemPorId(itemId, ordemId) {
  const { rows } = await pool.query(
    'SELECT id FROM itens_ordem_servico WHERE id = $1 AND ordem_id = $2',
    [itemId, ordemId]
  );
  return rows[0] || null;
}

async function atualizarItem(itemId, { quantidade, valor_unitario, eh_orcamento, estado, observacoes, foto_url, data_entrega, hora_entrega }) {
  const { rows } = await pool.query(
    `UPDATE itens_ordem_servico
     SET quantidade     = COALESCE($1, quantidade),
         valor_unitario = COALESCE($2, valor_unitario),
         eh_orcamento   = COALESCE($3, eh_orcamento),
         estado         = COALESCE($4, estado),
         observacoes    = $5,
         foto_url       = $6,
         data_entrega   = $7,
         hora_entrega   = $8
     WHERE id = $9
     RETURNING *`,
    [quantidade, valor_unitario, eh_orcamento, estado,
      observacoes ?? null, foto_url ?? null, data_entrega ?? null, hora_entrega ?? null, itemId]
  );
  return rows[0] || null;
}

async function removerItem(itemId, ordemId) {
  const { rows } = await pool.query(
    'DELETE FROM itens_ordem_servico WHERE id = $1 AND ordem_id = $2 RETURNING id',
    [itemId, ordemId]
  );
  return rows[0] || null;
}

module.exports = {
  listar,
  buscarPorId,
  buscarItens,
  criar,
  atualizar,
  atualizarEstado,
  inserirItem,
  buscarItemPorId,
  atualizarItem,
  removerItem,
};
