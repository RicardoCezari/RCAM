const servicosService = require('../services/servicosService');

async function listar(req, res, next) {
  try {
    res.json(await servicosService.listar({ ativo: req.query.ativo }));
  } catch (err) {
    next(err);
  }
}

async function buscarPorId(req, res, next) {
  try {
    res.json(await servicosService.buscarPorId(req.params.id));
  } catch (err) {
    next(err);
  }
}

async function criar(req, res, next) {
  try {
    res.status(201).json(await servicosService.criar(req.body));
  } catch (err) {
    next(err);
  }
}

async function atualizar(req, res, next) {
  try {
    res.json(await servicosService.atualizar(req.params.id, req.body));
  } catch (err) {
    next(err);
  }
}

async function deletar(req, res, next) {
  try {
    const result = await servicosService.deletar(req.params.id);
    if (result?._softDeleted) {
      return res.json({ message: 'Serviço desativado pois possui itens vinculados', servico: result });
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, buscarPorId, criar, atualizar, deletar };
