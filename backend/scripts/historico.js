/*
 * Retenção do histórico (somente leitura; nunca apaga).
 *   node scripts/historico.js relatorio
 *   node scripts/historico.js exportar --ate=2025-01-01 [--saida=historico-2025.csv]
 * Faça backup antes de qualquer decisão de expurgo; o expurgo é manual e fora deste script.
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { pool } = require('../src/config/database');
const { relatorio, exportar } = require('../src/services/historicoRetencao');

const arg = (nome) => (process.argv.find((a) => a.startsWith(`--${nome}=`)) || '').split('=').slice(1).join('=');

async function main() {
  const comando = process.argv[2];
  if (comando === 'relatorio') {
    const r = await relatorio(pool);
    console.log(`Registros: ${r.total}`);
    console.log(`Mais antigo: ${r.maisAntigo ? r.maisAntigo.toISOString() : '-'} | mais recente: ${r.maisRecente ? r.maisRecente.toISOString() : '-'}`);
    console.log(`Tamanho (tabela + índices): ${(r.bytesTabelaComIndices / 1024 / 1024).toFixed(2)} MB`);
    r.porAno.forEach((a) => console.log(`  ${a.ano}: ${a.registros}`));
  } else if (comando === 'exportar') {
    const ate = new Date(`${arg('ate')}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(arg('ate')) || Number.isNaN(ate.getTime())) throw new Error('Informe --ate=AAAA-MM-DD');
    const destino = path.resolve(arg('saida') || `historico-ate-${arg('ate')}.csv`);
    if (fs.existsSync(destino)) throw new Error(`Arquivo já existe (não será sobrescrito): ${destino}`);
    const saida = fs.createWriteStream(destino, { flags: 'wx', encoding: 'utf8' });
    const total = await exportar(pool, { ate, saida });
    await new Promise((resolve) => saida.end(resolve));
    console.log(`Exportados ${total} registros anteriores a ${arg('ate')} para ${destino}. Nada foi apagado.`);
  } else {
    console.error('Uso: node scripts/historico.js relatorio | exportar --ate=AAAA-MM-DD [--saida=arquivo.csv]');
    process.exitCode = 1;
  }
}

main()
  .catch((err) => { console.error('[HISTORICO] Falha:', err.message); process.exitCode = 1; })
  .finally(() => pool.end());
