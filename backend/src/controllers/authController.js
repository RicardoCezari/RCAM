const authService = require('../services/authService');

async function login(req, res, next) {
  try {
    const { login, senha } = req.body;
    const result = await authService.login(login, senha);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const usuario = await authService.me(req.usuario.id);
    res.json(usuario);
  } catch (err) {
    next(err);
  }
}

module.exports = { login, me };
