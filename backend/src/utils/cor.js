// Cor de destaque do sistema (tema): formato #rrggbb e contraste mínimo com o texto branco aplicado sobre ela
const HEX = /^#[0-9a-f]{6}$/i;
const CONTRASTE_MINIMO = 4.5; // WCAG AA para texto normal

function luminancia(hex) {
  const canal = (i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(1) + 0.7152 * canal(3) + 0.0722 * canal(5);
}

function contrasteComBranco(hex) {
  return 1.05 / (luminancia(hex) + 0.05);
}

module.exports = { HEX, CONTRASTE_MINIMO, contrasteComBranco };
