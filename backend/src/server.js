require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const app = require('./app');
const { testConnection } = require('./config/database');

const PORT = process.env.PORT || 3000;

async function start() {
  await testConnection();
  app.listen(PORT, () => {
    console.log(`[SERVER] Azteca OS API rodando em http://localhost:${PORT}`);
    console.log(`[SERVER] Ambiente: ${process.env.NODE_ENV || 'development'}`);
  });
}

start().catch((err) => {
  console.error('[SERVER] Falha ao iniciar:', err.message);
  process.exit(1);
});
