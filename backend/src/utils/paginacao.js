const LIMITE_PADRAO = 20;
const LIMITE_MAXIMO = 100;
const PAGINA_MAXIMA = 1_000_000;

// Lê page/limit da query string sem nunca lançar erro: valores ausentes, não numéricos ou fora
// da faixa caem em padrões seguros. O teto de limit impede listagens ilimitadas.
function lerPaginacao(query = {}, { limitPadrao = LIMITE_PADRAO, limitMaximo = LIMITE_MAXIMO } = {}) {
  const page = Math.min(PAGINA_MAXIMA, Math.max(1, parseInt(query.page, 10) || 1));
  const limit = Math.min(limitMaximo, Math.max(1, parseInt(query.limit, 10) || limitPadrao));
  return { page, limit, offset: (page - 1) * limit };
}

// Escapa curingas do LIKE/ILIKE para que o termo digitado seja tratado como texto literal
function escaparLike(texto) {
  return String(texto).replace(/[\\%_]/g, '\\$&');
}

module.exports = { lerPaginacao, escaparLike, LIMITE_PADRAO, LIMITE_MAXIMO };
