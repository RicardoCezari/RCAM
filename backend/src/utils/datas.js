const AppError = require('./AppError');

const MS_DIA = 86_400_000;

// Valida AAAA-MM-DD (rejeita datas inexistentes como 2025-02-30) e devolve o texto original
function dataIso(valor, campo) {
  const texto = String(valor).trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
  const d = m && new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (!d || d.getUTCFullYear() !== +m[1] || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) {
    throw AppError.badRequest(`${campo} inválida. Use o formato AAAA-MM-DD`);
  }
  return texto;
}

// Número de dias do intervalo fechado [inicio, fim] (ambos AAAA-MM-DD válidos)
function diasEntre(inicio, fim) {
  return Math.round((Date.parse(fim) - Date.parse(inicio)) / MS_DIA) + 1;
}

// Data local de hoje, deslocada em `dias`, no formato AAAA-MM-DD
function hojeIso(dias = 0) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

module.exports = { dataIso, diasEntre, hojeIso };
