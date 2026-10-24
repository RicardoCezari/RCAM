const { pool } = require('../config/database');
const AppError = require('../utils/AppError');

async function apenasAdmin(req, _res, next) {
  try {
    // O authMiddleware já carrega o perfil na própria requisição; a consulta só ocorre se ele não tiver rodado
    let perfil = req.usuario?.perfil;
    if (perfil === undefined) {
      const { rows } = await pool.query('SELECT perfil FROM usuarios WHERE id = $1 AND ativo = true', [req.usuario.id]);
      perfil = rows[0]?.perfil;
    }
    if (perfil !== 'ADMIN') {
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
