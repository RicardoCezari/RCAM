const sharp = require('sharp');
const AppError = require('../utils/AppError');
const { detectarTipoImagem } = require('../utils/tipoImagem');

const LADO_MAXIMO = 1600;
const QUALIDADE_JPEG = 80;
const BYTES_MAXIMOS = 1.5 * 1024 * 1024;
const PIXELS_MAXIMOS = 150e6;

/*
 * Rede de segurança no servidor: mesmo que o navegador envie uma foto grande, o arquivo guardado respeita
 * o tamanho definido. Foto que já está pequena passa intacta (não recomprime o que o navegador já tratou).
 */
async function normalizar(buffer, { ladoMaximo = LADO_MAXIMO } = {}) {
  if (!detectarTipoImagem(buffer)) throw AppError.badRequest('O arquivo não é uma imagem JPG, PNG ou WEBP válida');

  try {
    const imagem = sharp(buffer, { limitInputPixels: PIXELS_MAXIMOS });
    const { width, height } = await imagem.metadata();
    if (Math.max(width, height) <= ladoMaximo && buffer.length <= BYTES_MAXIMOS) return buffer;

    return await imagem
      .rotate()
      .resize({ width: ladoMaximo, height: ladoMaximo, fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' }) // PNG com transparência não pode virar fundo preto no JPEG
      .jpeg({ quality: QUALIDADE_JPEG, mozjpeg: true })
      .toBuffer();
  } catch {
    throw AppError.badRequest('Não foi possível ler a imagem. Ela pode estar corrompida.');
  }
}

module.exports = { normalizar, LADO_MAXIMO };
