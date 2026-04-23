const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');

function authMiddleware(req, _res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(AppError.unauthorized('Token de acesso não fornecido'));
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = { id: payload.sub, nome: payload.nome, login: payload.login };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(AppError.unauthorized('Sessão expirada. Faça login novamente'));
    }
    return next(AppError.unauthorized('Token inválido'));
  }
}

module.exports = authMiddleware;
