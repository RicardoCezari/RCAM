require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const app = require('./app');
const { testConnection, pool } = require('./config/database');
const { validarAmbiente } = require('./config/ambiente');
const { iniciarAgendador } = require('./services/backupService');

const PORT = process.env.PORT || 3000;

function encerrarComGraca(server) {
  let encerrando = false;
  const encerrar = (sinal) => {
    if (encerrando) return;
    encerrando = true;
    console.log(`[SERVER] ${sinal} recebido: encerrando (aguarda requisições em andamento)`);
    // Se algo travar, não deixa o processo pendurado
    setTimeout(() => process.exit(1), 15000).unref();
    server.close(async () => {
      try { await pool.end(); } catch { /* ignora */ }
      console.log('[SERVER] Encerrado');
      process.exit(0);
    });
  };
  process.on('SIGTERM', () => encerrar('SIGTERM'));
  process.on('SIGINT', () => encerrar('SIGINT'));
}

async function start() {
  const { erros, avisos } = validarAmbiente();
  avisos.forEach((a) => console.warn(`[CONFIG] ${a}`));
  if (erros.length) throw new Error(`Configuração inválida:\n - ${erros.join('\n - ')}`);

  await testConnection();
  const server = app.listen(PORT, () => {
    console.log(`[SERVER] API rodando em http://localhost:${PORT}`);
    console.log(`[SERVER] Ambiente: ${process.env.NODE_ENV || 'development'}`);
    iniciarAgendador().catch((err) => console.error('[BACKUP] Agendador não iniciado:', err.message));
  });
  encerrarComGraca(server);
}

process.on('unhandledRejection', (motivo) => {
  console.error('[SERVER] Promise rejeitada sem tratamento:', motivo instanceof Error ? motivo.stack : motivo);
});

start().catch((err) => {
  console.error('[SERVER] Falha ao iniciar:', err.message);
  process.exit(1);
});
