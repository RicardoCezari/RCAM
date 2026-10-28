const { pool } = require('../config/database');

async function buscarPorLogin(login) {
  const { rows } = await pool.query(
    // Prefere o login idêntico; só então ignora maiúsculas/minúsculas (há logins antigos duplicados por caixa)
    `SELECT id, nome, login, senha, ativo, perfil, foto_url FROM usuarios
     WHERE LOWER(login) = LOWER($1)
     ORDER BY (login = $1) DESC, ativo DESC, id DESC
     LIMIT 1`,
    [login]
  );
  return rows[0] || null;
}

async function buscarPorId(id) {
  const { rows } = await pool.query(
    'SELECT id, nome, login, ativo, perfil, foto_url, data_criacao, (pin_hash IS NOT NULL) AS tem_pin FROM usuarios WHERE id = $1 LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

async function buscarComSenhaPorId(id) {
  const { rows } = await pool.query('SELECT id, senha, ativo FROM usuarios WHERE id = $1 LIMIT 1', [id]);
  return rows[0] || null;
}

async function listarPerfisComPin() {
  const { rows } = await pool.query(
    'SELECT id, nome, foto_url FROM usuarios WHERE ativo = true AND pin_hash IS NOT NULL ORDER BY nome'
  );
  return rows;
}

/*
 * Reserva uma tentativa de PIN antes de conferir o valor (atômico): tentativas simultâneas não ganham
 * palpites extras. Ao atingir o limite, o perfil é bloqueado e o contador zera. Retorna null se o perfil
 * não existe, está inativo, não tem PIN ou está bloqueado.
 */
async function reservarTentativaPin(id, maxTentativas, minutosBloqueio) {
  const { rows } = await pool.query(
    `UPDATE usuarios SET
       pin_tentativas = CASE WHEN pin_tentativas + 1 >= $2 THEN 0 ELSE pin_tentativas + 1 END,
       pin_bloqueado_ate = CASE WHEN pin_tentativas + 1 >= $2 THEN NOW() + make_interval(mins => $3) END
     WHERE id = $1 AND ativo = true AND pin_hash IS NOT NULL
       AND (pin_bloqueado_ate IS NULL OR pin_bloqueado_ate <= NOW())
     RETURNING id, nome, login, senha, perfil, foto_url, pin_hash,
               (pin_bloqueado_ate IS NOT NULL AND pin_bloqueado_ate > NOW()) AS bloqueou_agora`,
    [id, maxTentativas, minutosBloqueio]
  );
  return rows[0] || null;
}

// Minutos restantes de bloqueio (arredondado para cima), ou 0 se o perfil não estiver bloqueado
async function situacaoDoPin(id) {
  const { rows } = await pool.query(
    `SELECT CEIL(GREATEST(EXTRACT(EPOCH FROM (pin_bloqueado_ate - NOW())), 0) / 60)::int AS minutos
     FROM usuarios WHERE id = $1 AND ativo = true AND pin_hash IS NOT NULL`,
    [id]
  );
  return rows[0] ? { existe: true, minutos: rows[0].minutos || 0 } : { existe: false, minutos: 0 };
}

async function limparTentativasPin(id) {
  await pool.query('UPDATE usuarios SET pin_tentativas = 0, pin_bloqueado_ate = NULL WHERE id = $1', [id]);
}

module.exports = {
  buscarPorLogin,
  buscarPorId,
  buscarComSenhaPorId,
  listarPerfisComPin,
  reservarTentativaPin,
  situacaoDoPin,
  limparTentativasPin,
};
