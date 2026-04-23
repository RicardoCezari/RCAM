const ordensService = require('../services/ordensServicoService');

async function listar(req, res, next) {
  try {
    const { estado, clienteId, usuarioId, dataInicio, dataFim, page, limit } = req.query;
    const result = await ordensService.listar({ estado, clienteId, usuarioId, dataInicio, dataFim, page, limit });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function buscarPorId(req, res, next) {
  try {
    res.json(await ordensService.buscarPorId(req.params.id));
  } catch (err) {
    next(err);
  }
}

async function criar(req, res, next) {
  try {
    // Injeta o usuário logado como responsável pela OS
    const usuarioId = req.body.usuario_id ?? req.usuario.id;
    const os = await ordensService.criar({ ...req.body, usuario_id: usuarioId });
    res.status(201).json(os);
  } catch (err) {
    next(err);
  }
}

async function atualizar(req, res, next) {
  try {
    res.json(await ordensService.atualizar(req.params.id, req.body));
  } catch (err) {
    next(err);
  }
}

async function mudarEstado(req, res, next) {
  try {
    res.json(await ordensService.mudarEstado(req.params.id, req.body.estado));
  } catch (err) {
    next(err);
  }
}

async function adicionarItem(req, res, next) {
  try {
    const item = await ordensService.adicionarItem(req.params.id, req.body);
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
}

async function atualizarItem(req, res, next) {
  try {
    res.json(await ordensService.atualizarItem(req.params.id, req.params.itemId, req.body));
  } catch (err) {
    next(err);
  }
}

async function removerItem(req, res, next) {
  try {
    await ordensService.removerItem(req.params.id, req.params.itemId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, buscarPorId, criar, atualizar, mudarEstado, adicionarItem, atualizarItem, removerItem };
