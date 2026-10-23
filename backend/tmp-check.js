require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const bcrypt = require('bcryptjs');
const { pool } = require('./src/config/database');
(async () => {
  const { rows } = await pool.query('SELECT id, login, ativo, perfil, senha FROM usuarios ORDER BY id');
  for (const u of rows) {
    const ok = typeof u.senha === 'string' ? await bcrypt.compare('123456', u.senha) : 'SENHA NULA';
    console.log(u.id, u.login, 'ativo=' + u.ativo, u.perfil, '123456=' + ok);
  }
  await pool.end();
})().catch((e) => { console.error(e.message); process.exit(1); });
