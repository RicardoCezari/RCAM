const AppError = require('../utils/AppError');
const clientesRepository = require('../repositories/clientesRepository');

const soDigitos = (v) => String(v ?? '').replace(/\D/g, '');

// Telefone e CPF são gravados somente com dígitos; e-mail/informação vazios viram NULL
function normalizar({ nome, telefone, cpf, email, informacao_adicional }) {
  return {
    nome: typeof nome === 'string' ? nome.trim() : nome,
    telefone: telefone ? soDigitos(telefone) : telefone,
    cpf: cpf ? soDigitos(cpf) : null,
    email: email ? String(email).trim() : null,
    informacao_adicional: informacao_adicional ? String(informacao_adicional).trim() : null,
  };
}

async function listar({ page = 1, limit = 20, ...filtros } = {}) {
  const offset = (page - 1) * limit;
  const { rows, total } = await clientesRepository.listar({ ...filtros, limit, offset });
  return { data: rows, total, page: Number(page), limit: Number(limit) };
}

async function buscarPorCpf(cpf) {
  return clientesRepository.buscarPorCpf(soDigitos(cpf));
}

async function buscarPorTelefone(telefone) {
  return clientesRepository.buscarPorTelefone(soDigitos(telefone));
}

async function buscarPorId(id) {
  const cliente = await clientesRepository.buscarPorId(id);
  if (!cliente) throw AppError.notFound('Cliente não encontrado');
  return cliente;
}

// A verificação prévia dá a mensagem amigável; a garantia real contra duplicidade (inclusive em requisições
// simultâneas) é o índice único em telefone_digitos, cuja violação o errorHandler converte em 409.
async function criar(dados) {
  const cliente = normalizar(dados);
  if (cliente.telefone) {
    const existente = await clientesRepository.buscarPorTelefone(cliente.telefone);
    if (existente) throw AppError.conflict(`Telefone já cadastrado para ${existente.nome}.`);
  }
  return clientesRepository.criar(cliente);
}

async function atualizar(id, dados) {
  await buscarPorId(id);
  const cliente = normalizar(dados);
  if (cliente.telefone) {
    const existente = await clientesRepository.buscarPorTelefone(cliente.telefone);
    if (existente && existente.id !== Number(id)) {
      throw AppError.conflict(`Telefone já cadastrado para ${existente.nome}.`);
    }
  }
  return clientesRepository.atualizar(id, cliente);
}

async function deletar(id) {
  await buscarPorId(id);

  const temOrdens = await clientesRepository.possuiOrdens(id);
  if (temOrdens) {
    throw AppError.conflict('Não é possível excluir cliente com ordens de serviço cadastradas');
  }

  await clientesRepository.deletar(id);
}

module.exports = { listar, buscarPorTelefone, buscarPorCpf, buscarPorId, criar, atualizar, deletar };
