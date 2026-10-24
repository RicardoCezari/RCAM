const ordensService = require('../services/ordensServicoService');
const { lerPaginacao } = require('../utils/paginacao');

async function listar(req, res, next) {
  try {
    const {
      estado, situacao, clienteId, usuarioId, dataInicio, dataFim, criacaoInicio, criacaoFim, valorMin, valorMax,
      q, numero, cliente, telefone, usuario, objeto, ordenarPor, direcao,
    } = req.query;
    const { page, limit } = lerPaginacao(req.query);
    const result = await ordensService.listar({
      estado, situacao, clienteId, usuarioId, dataInicio, dataFim, criacaoInicio, criacaoFim, valorMin, valorMax,
      q, numero, cliente, telefone, usuario, objeto, ordenarPor, direcao, page, limit,
    });
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
    // O responsável é sempre o usuário autenticado; qualquer usuario_id enviado no corpo é ignorado
    const os = await ordensService.criar({ ...req.body, usuario_id: req.usuario.id });
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
    res.json(await ordensService.mudarEstado(req.params.id, req.body.estado, req.usuario?.id));
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
    res.json(await ordensService.atualizarItem(req.params.id, req.params.itemId, req.body, req.usuario?.id));
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

async function adicionarFotos(req, res, next) {
  try {
    const fotos = await ordensService.adicionarFotos(req.params.id, req.files, req.body.item_id, req.body.etapa);
    res.status(201).json(fotos);
  } catch (err) {
    next(err);
  }
}

async function historicoOrdem(req, res, next) {
  try {
    res.json(await ordensService.historicoOrdem(req.params.id));
  } catch (err) {
    next(err);
  }
}

async function historicoCliente(req, res, next) {
  try {
    res.json(await ordensService.historicoCliente(req.params.clienteId));
  } catch (err) {
    next(err);
  }
}

async function removerFoto(req, res, next) {
  try {
    await ordensService.removerFoto(req.params.id, req.params.fotoId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listar, buscarPorId, criar, atualizar, mudarEstado,
  adicionarItem, atualizarItem, removerItem,
  adicionarFotos, removerFoto, historicoOrdem, historicoCliente,
};
