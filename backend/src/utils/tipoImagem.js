/*
 * Detecta o tipo real de uma imagem pelos primeiros bytes (magic bytes).
 * O Content-Type enviado pelo cliente não é confiável; só JPEG, PNG e WEBP são aceitos.
 */
function detectarTipoImagem(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mimetype: 'image/jpeg', extensao: '.jpg' };
  }
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { mimetype: 'image/png', extensao: '.png' };
  }
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return { mimetype: 'image/webp', extensao: '.webp' };
  }
  return null;
}

module.exports = { detectarTipoImagem };
