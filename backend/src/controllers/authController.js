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

async function perfis(_req, res, next) {
  try {
    res.json(await authService.perfis());
  } catch (err) {
    next(err);
  }
}

async function loginPorPin(req, res, next) {
  try {
    res.json(await authService.loginPorPin(req.body.usuario_id, req.body.pin));
  } catch (err) {
    next(err);
  }
}

async function confirmarPin(req, res, next) {
  try {
    res.json(await authService.confirmarPin(req.usuario.id, req.body.pin));
  } catch (err) {
    next(err);
  }
}

async function confirmarSenha(req, res, next) {
  try {
    res.json(await authService.confirmarSenha(req.usuario.id, req.body.senha));
  } catch (err) {
    next(err);
  }
}

module.exports = { login, me, perfis, loginPorPin, confirmarPin, confirmarSenha };
