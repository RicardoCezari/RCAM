const usuariosService = require('../services/usuariosService');

async function listar(_req, res, next) {
  try {
    const usuarios = await usuariosService.listar();
    res.json(usuarios);
  } catch (err) {
    next(err);
  }
}

async function buscarPorId(req, res, next) {
  try {
    const usuario = await usuariosService.buscarPorId(req.params.id);
    res.json(usuario);
  } catch (err) {
    next(err);
  }
}

async function criar(req, res, next) {
  try {
    const usuario = await usuariosService.criar(req.body);
    res.status(201).json(usuario);
  } catch (err) {
    next(err);
  }
}

async function atualizar(req, res, next) {
  try {
    const usuario = await usuariosService.atualizar(req.params.id, req.body);
    res.json(usuario);
  } catch (err) {
    next(err);
  }
}

async function trocarSenha(req, res, next) {
  try {
    const { senhaAtual, novaSenha } = req.body;
    await usuariosService.trocarSenha(req.params.id, senhaAtual, novaSenha);
    res.json({ message: 'Senha alterada com sucesso' });
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, buscarPorId, criar, atualizar, trocarSenha };
