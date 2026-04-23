const bcrypt = require('bcryptjs');
const AppError = require('../utils/AppError');
const usuariosRepository = require('../repositories/usuariosRepository');

const SALT_ROUNDS = 12;

async function listar() {
  return usuariosRepository.listar();
}

async function buscarPorId(id) {
  const usuario = await usuariosRepository.buscarPorId(id);
  if (!usuario) throw AppError.notFound('Usuário não encontrado');
  return usuario;
}

async function criar({ nome, login, senha, ativo = true }) {
  const senhaHash = await bcrypt.hash(senha, SALT_ROUNDS);
  return usuariosRepository.criar({ nome, login, senhaHash, ativo });
}

async function atualizar(id, { nome, login, ativo }) {
  await buscarPorId(id);
  return usuariosRepository.atualizar(id, { nome, login, ativo });
}

async function trocarSenha(id, senhaAtual, novaSenha) {
  const registro = await usuariosRepository.buscarSenhaPorId(id);
  if (!registro) throw AppError.notFound('Usuário não encontrado');

  const valida = await bcrypt.compare(senhaAtual, registro.senha);
  if (!valida) throw AppError.badRequest('Senha atual incorreta');

  const senhaHash = await bcrypt.hash(novaSenha, SALT_ROUNDS);
  await usuariosRepository.atualizarSenha(id, senhaHash);
}

module.exports = { listar, buscarPorId, criar, atualizar, trocarSenha };
