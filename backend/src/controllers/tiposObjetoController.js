const tiposObjetoService = require('../services/tiposObjetoService');

async function listar(_req, res, next) {
  try {
    res.json(await tiposObjetoService.listar());
  } catch (err) {
    next(err);
  }
}

async function buscarPorId(req, res, next) {
  try {
    res.json(await tiposObjetoService.buscarPorId(req.params.id));
  } catch (err) {
    next(err);
  }
}

async function criar(req, res, next) {
  try {
    res.status(201).json(await tiposObjetoService.criar(req.body));
  } catch (err) {
    next(err);
  }
}

async function atualizar(req, res, next) {
  try {
    res.json(await tiposObjetoService.atualizar(req.params.id, req.body));
  } catch (err) {
    next(err);
  }
}

async function deletar(req, res, next) {
  try {
    await tiposObjetoService.deletar(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, buscarPorId, criar, atualizar, deletar };
