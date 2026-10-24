const { pool } = require('../config/database');
const { escaparLike } = require('../utils/paginacao');

// Lista explícita: colunas auxiliares (ex.: telefone_digitos) nunca vazam para a API
const COLUNAS = 'id, nome, telefone, cpf, email, informacao_adicional, data_criacao';

// Ordenação pedida pelo cliente da API: somente colunas desta lista entram no SQL
const COLUNAS_ORDENAVEIS = {
  nome: 'nome',
  cpf: 'cpf',
  telefone: 'telefone_digitos',
  email: 'email',
  cadastro: 'data_criacao',
};

// Texto composto apenas por dígitos e pontuação de telefone/CPF (ex.: "(11) 99999-0000", "123.456.789-00")
const SOMENTE_NUMERICO = /^[\d\s().+\-/]+$/;
const soDigitos = (v) => String(v).replace(/\D/g, '');
const parcial = (v) => `%${escaparLike(String(v).trim())}%`;

/*
 * Monta o WHERE (parametrizado) da listagem:
 *  - q: busca global em nome, e-mail e observações; se o texto for só número/pontuação, também em telefone
 *    e CPF (comparados apenas pelos dígitos). Texto com letras nunca casa com telefone, evitando que
 *    "Silva 2" traga todos os telefones que contêm 2.
 *  - nome, telefone, cpf, email, observacoes: filtros por coluna (parciais, AND entre si).
 */
function montarWhere({ q, nome, telefone, cpf, email, observacoes } = {}) {
  const params = [];
  const condicoes = [];
  const add = (valor) => { params.push(valor); return `$${params.length}`; };

  if (q) {
    const p = add(parcial(q));
    const ou = [`nome ILIKE ${p}`, `email ILIKE ${p}`, `informacao_adicional ILIKE ${p}`];
    if (SOMENTE_NUMERICO.test(q) && soDigitos(q)) {
      const d = add(`%${soDigitos(q)}%`);
      ou.push(`telefone_digitos LIKE ${d}`, `cpf LIKE ${d}`);
    }
    condicoes.push(`(${ou.join(' OR ')})`);
  }
  if (nome) condicoes.push(`nome ILIKE ${add(parcial(nome))}`);
  if (email) condicoes.push(`email ILIKE ${add(parcial(email))}`);
  if (observacoes) condicoes.push(`informacao_adicional ILIKE ${add(parcial(observacoes))}`);
  if (telefone) {
    condicoes.push(soDigitos(telefone) ? `telefone_digitos LIKE ${add(`%${soDigitos(telefone)}%`)}` : 'FALSE');
  }
  if (cpf) {
    condicoes.push(soDigitos(cpf) ? `cpf LIKE ${add(`%${soDigitos(cpf)}%`)}` : 'FALSE');
  }

  return { where: condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '', params };
}

async function listar({ q, nome, telefone, cpf, email, observacoes, limit, offset, ordenarPor, direcao }) {
  const { where, params } = montarWhere({ q, nome, telefone, cpf, email, observacoes });

  const colunaOrdem = COLUNAS_ORDENAVEIS[ordenarPor] || 'nome';
  const sentido = String(direcao).toLowerCase() === 'desc' ? 'DESC' : 'ASC';
  const ordem = colunaOrdem === 'nome' ? `nome ${sentido}, id` : `${colunaOrdem} ${sentido} NULLS LAST, nome, id`;

  const countSql = `SELECT COUNT(*) FROM clientes ${where}`;
  const dataParams = [...params, limit, offset];
  const limitIdx   = dataParams.length - 1;
  const offsetIdx  = dataParams.length;
  const dataSql = `
    SELECT ${COLUNAS}
    FROM clientes ${where}
    ORDER BY ${ordem}
    LIMIT $${limitIdx} OFFSET $${offsetIdx}
  `;

  const [countRes, dataRes] = await Promise.all([
    pool.query(countSql, params),
    pool.query(dataSql, dataParams),
  ]);

  return { rows: dataRes.rows, total: Number(countRes.rows[0].count) };
}

async function buscarPorTelefone(telefone) {
  // Compara somente os dígitos (coluna gerada e indexada), independente de como o telefone foi armazenado
  const { rows } = await pool.query(
    `SELECT ${COLUNAS} FROM clientes WHERE telefone_digitos = $1 LIMIT 1`,
    [telefone]
  );
  return rows[0] || null;
}

async function buscarPorCpf(cpf) {
  const { rows } = await pool.query(
    `SELECT ${COLUNAS} FROM clientes WHERE cpf = $1 LIMIT 1`,
    [cpf]
  );
  return rows[0] || null;
}

async function buscarPorId(id) {
  const { rows } = await pool.query(`SELECT ${COLUNAS} FROM clientes WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function possuiOrdens(id) {
  const { rows } = await pool.query(
    'SELECT id FROM ordens_servico WHERE cliente_id = $1 LIMIT 1',
    [id]
  );
  return rows.length > 0;
}

async function criar({ nome, telefone, cpf, email, informacao_adicional }) {
  const { rows } = await pool.query(
    `INSERT INTO clientes (nome, telefone, cpf, email, informacao_adicional)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${COLUNAS}`,
    [nome, telefone, cpf || null, email || null, informacao_adicional || null]
  );
  return rows[0];
}

async function atualizar(id, { nome, telefone, cpf, email, informacao_adicional }) {
  const { rows } = await pool.query(
    `UPDATE clientes
     SET nome = COALESCE($1, nome),
         telefone = COALESCE($2, telefone),
         cpf = $3,
         email = $4,
         informacao_adicional = $5
     WHERE id = $6
     RETURNING ${COLUNAS}`,
    [nome, telefone, cpf ?? null, email ?? null, informacao_adicional ?? null, id]
  );
  return rows[0] || null;
}

async function deletar(id) {
  await pool.query('DELETE FROM clientes WHERE id = $1', [id]);
}

module.exports = { listar, buscarPorTelefone, buscarPorCpf, buscarPorId, possuiOrdens, criar, atualizar, deletar };
