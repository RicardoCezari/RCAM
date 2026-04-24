const servicosService = require('../services/servicosService');

async function listar(req, res, next) {
  try {
    res.json(await servicosService.listar({
      ativo: req.query.ativo,
      tipoObjetoId: req.query.tipo_objeto_id,
    }));
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
    const { nome, valor, descricao, ativo, tipo_ids } = req.body;
    res.status(201).json(await servicosService.criar({ nome, valor, descricao, ativo, tipoIds: tipo_ids || [] }));
  } catch (err) {
    next(err);
  }
}

async function atualizar(req, res, next) {
  try {
    const { nome, valor, descricao, ativo, tipo_ids } = req.body;
    res.json(await servicosService.atualizar(req.params.id, { nome, valor, descricao, ativo, tipoIds: tipo_ids }));
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
