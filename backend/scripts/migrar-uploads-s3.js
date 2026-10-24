/*
 * Envia as fotos/logo da pasta local para o bucket S3 configurado (STORAGE_DRIVER=s3 + S3_*).
 *   node scripts/migrar-uploads-s3.js            -> simulação (não envia nada)
 *   node scripts/migrar-uploads-s3.js --aplicar  -> envia de fato
 *
 * Não apaga nada. Pode ser repetido. Origem: UPLOADS_DIR (ou backend/uploads).
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  const aplicar = process.argv.includes('--aplicar');
  process.env.STORAGE_DRIVER = 's3'; // destino é sempre o S3; a origem é a pasta local
  const { criarStorage } = require('../src/services/storageService');
  const destino = criarStorage(process.env);
  const origem = criarStorage({ ...process.env, STORAGE_DRIVER: 'local' });

  const { pool } = require('../src/config/database');
  const { migrarUploads } = require('../src/services/migrarUploads');
  try {
    const { rows } = await pool.query(
      `SELECT url FROM ordem_fotos UNION SELECT valor FROM configuracoes WHERE chave = 'logo_url' AND valor IS NOT NULL`
    );
    console.log(`[UPLOADS] Origem: ${origem.UPLOAD_DIR}`);
    console.log(`[UPLOADS] Destino: s3://${destino.driver.bucket}/${destino.driver.prefixo}`);
    console.log(`[UPLOADS] Modo: ${aplicar ? 'APLICAR' : 'simulação (use --aplicar para enviar)'}`);
    const r = await migrarUploads({
      dirOrigem: origem.UPLOAD_DIR,
      driver: destino.driver,
      aplicar,
      urlsBanco: rows.map((x) => x.url),
      log: (m) => console.log(`[UPLOADS] ${m}`),
    });
    console.log(`[UPLOADS] Arquivos locais: ${r.total} | ${aplicar ? 'enviados' : 'a enviar'}: ${r.enviados} | já no bucket: ${r.jaExistiam}`);
    if (r.invalidos.length) console.log(`[UPLOADS] Ignorados (não são imagens válidas): ${r.invalidos.join(', ')}`);
    if (r.semArquivo.length) console.log(`[UPLOADS] Referenciados no banco e ausentes na pasta local (${r.semArquivo.length}): ${r.semArquivo.slice(0, 20).join(', ')}`);
    if (r.falhas.length) {
      console.log(`[UPLOADS] Falhas (${r.falhas.length}):`);
      r.falhas.forEach((f) => console.log(`  ${f.chave}: ${f.erro}`));
      process.exitCode = 1;
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('[UPLOADS] Falha:', err.message);
  process.exit(1);
});
