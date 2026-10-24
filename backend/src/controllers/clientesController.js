const clientesService = require('../services/clientesService');
const { lerPaginacao } = require('../utils/paginacao');

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
    const { page, limit } = lerPaginacao(req.query);
    const texto = (v) => (typeof v === 'string' ? v.trim().slice(0, 100) : '');
    const result = await clientesService.listar({
      q: texto(req.query.q),
      nome: texto(req.query.nome),
      telefone: texto(req.query.telefone),
      cpf: texto(req.query.cpf),
      email: texto(req.query.email),
      observacoes: texto(req.query.observacoes),
      page, limit, ordenarPor: req.query.ordenarPor, direcao: req.query.direcao,
    });
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
