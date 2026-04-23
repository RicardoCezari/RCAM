const clientesService = require('../services/clientesService');

async function buscarPorCpf(req, res, next) {
  try {
    const cliente = await clientesService.buscarPorCpf(req.params.cpf);
    res.json(cliente);
  } catch (err) {
    next(err);
  }
}

async function buscarPorTelefone(req, res, next) {
  try {
    // Retorna o cliente ou null — não lança 404 ("não encontrado" é resposta válida aqui)
    const cliente = await clientesService.buscarPorTelefone(req.params.telefone);
    res.json(cliente);
  } catch (err) {
    next(err);
  }
}

async function listar(req, res, next) {
  try {
    const { q, page, limit } = req.query;
    const result = await clientesService.listar({ q, page, limit });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function buscarPorId(req, res, next) {
  try {
    const cliente = await clientesService.buscarPorId(req.params.id);
    res.json(cliente);
  } catch (err) {
    next(err);
  }
}

async function criar(req, res, next) {
  try {
    const cliente = await clientesService.criar(req.body);
    res.status(201).json(cliente);
  } catch (err) {
    next(err);
  }
}

async function atualizar(req, res, next) {
  try {
    const cliente = await clientesService.atualizar(req.params.id, req.body);
    res.json(cliente);
  } catch (err) {
    next(err);
  }
}

async function deletar(req, res, next) {
  try {
    await clientesService.deletar(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, buscarPorCpf, buscarPorTelefone, buscarPorId, criar, atualizar, deletar };
