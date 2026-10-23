const { pool } = require('../config/database');
const AppError = require('../utils/AppError');

async function apenasAdmin(req, _res, next) {
  try {
    const { rows } = await pool.query('SELECT perfil FROM usuarios WHERE id = $1 AND ativo = true', [req.usuario.id]);
    if (rows[0]?.perfil !== 'ADMIN') {
      return next(AppError.forbidden('Apenas administradores podem executar esta ação'));
    }
    next();
  } catch (err) {
    next(err);
  }
}

// Leitura liberada para todos os usuários; alterações somente para administradores
function escritaApenasAdmin(req, res, next) {
  if (req.method === 'GET') return next();
  return apenasAdmin(req, res, next);
}

module.exports = { apenasAdmin, escritaApenasAdmin };
