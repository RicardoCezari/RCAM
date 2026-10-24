/*
 * Retenção do histórico de mudanças de estado (ordem_historico).
 *
 * Estratégia: NADA é apagado automaticamente. A tabela é pequena por registro e cresce de forma linear com o
 * uso; este módulo só mede (relatorio) e exporta (exportar) para que a decisão de arquivar/expurgar seja humana,
 * tomada com um backup em mãos. Observação: apagar um item de uma O.S. remove, por cascata, o histórico daquele item.
 */
const CABECALHO = ['id', 'ordem_id', 'item_id', 'estado_anterior', 'estado_novo', 'usuario_id', 'observacao', 'data_mudanca'];

async function relatorio(pool) {
  const { rows: [geral] } = await pool.query(`
    SELECT COUNT(*)::int AS total,
           MIN(data_mudanca) AS mais_antigo,
           MAX(data_mudanca) AS mais_recente,
           pg_total_relation_size('ordem_historico')::bigint AS bytes_tabela_com_indices
      FROM ordem_historico`);
  const { rows: porAno } = await pool.query(`
    SELECT EXTRACT(YEAR FROM data_mudanca)::int AS ano, COUNT(*)::int AS registros
      FROM ordem_historico GROUP BY 1 ORDER BY 1`);
  return {
    total: geral.total,
    maisAntigo: geral.mais_antigo,
    maisRecente: geral.mais_recente,
    bytesTabelaComIndices: Number(geral.bytes_tabela_com_indices),
    porAno,
  };
}

// Células que o Excel/LibreOffice interpretariam como fórmula recebem apóstrofo (CSV injection)
function celula(valor) {
  if (valor === null || valor === undefined) return '';
  let s = valor instanceof Date ? valor.toISOString() : String(valor);
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/*
 * Escreve em `saida` (stream com write) os registros anteriores a `ate` (Date), em lotes por id.
 * Só lê; não altera nem apaga nada. Retorna a quantidade exportada.
 */
async function exportar(pool, { ate, saida, lote = 5000 }) {
  if (!(ate instanceof Date) || Number.isNaN(ate.getTime())) throw new Error('Data limite inválida');
  saida.write(`${CABECALHO.join(',')}\n`);
  let ultimo = 0;
  let total = 0;
  for (;;) {
    const { rows } = await pool.query(
      `SELECT ${CABECALHO.join(', ')} FROM ordem_historico
        WHERE data_mudanca < $1 AND id > $2 ORDER BY id LIMIT $3`,
      [ate, ultimo, lote]
    );
    if (!rows.length) break;
    for (const r of rows) saida.write(`${CABECALHO.map((c) => celula(r[c])).join(',')}\n`);
    ultimo = rows[rows.length - 1].id;
    total += rows.length;
  }
  return total;
}

module.exports = { relatorio, exportar, celula };
