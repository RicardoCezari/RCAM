const { pool } = require('../config/database');
const AppError = require('../utils/AppError');
const { verificar, versaoSenha } = require('../utils/token');

async function authMiddleware(req, _res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(AppError.unauthorized('Token de acesso não fornecido'));
  }

  const token = authHeader.slice(7);

  let payload;
  try {
    payload = verificar(token);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(AppError.unauthorized('Sessão expirada. Faça login novamente'));
    }
    return next(AppError.unauthorized('Token inválido'));
  }

  try {
    // Consulta por chave primária: usuário desativado/removido perde o acesso na hora, sem esperar o token (8h)
    // expirar. O perfil também é carregado para evitar uma segunda consulta nas rotas de administrador.
    const { rows } = await pool.query(
      'SELECT id, nome, login, perfil, senha FROM usuarios WHERE id = $1 AND ativo = true',
      [payload.sub]
    );
    if (!rows[0]) return next(AppError.unauthorized('Usuário inativo ou inexistente'));
    // Troca de senha invalida os tokens anteriores
    if (payload.pv !== versaoSenha(rows[0].senha)) {
      return next(AppError.unauthorized('Sessão expirada. Faça login novamente'));
    }
    const { senha: _senha, ...usuario } = rows[0];
    req.usuario = usuario;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = authMiddleware;
