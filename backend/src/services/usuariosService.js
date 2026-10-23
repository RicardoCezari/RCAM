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

async function criar({ nome, login, senha, ativo = true, perfil = 'EDITOR' }) {
  const senhaHash = await bcrypt.hash(senha, SALT_ROUNDS);
  return usuariosRepository.criar({ nome, login, senhaHash, ativo, perfil });
}

// Redefinição de senha pelo administrador (senha opcional)
async function atualizar(id, { nome, login, ativo, perfil, senha }) {
  const atual = await buscarPorId(id);

  const perdeAdmin =
    atual.perfil === 'ADMIN' &&
    atual.ativo &&
    ((perfil && perfil !== 'ADMIN') || ativo === false);
  if (perdeAdmin && (await usuariosRepository.contarAdminsAtivos(id)) === 0) {
    throw AppError.badRequest('Deve existir ao menos um administrador ativo');
  }

  const atualizado = await usuariosRepository.atualizar(id, { nome, login, ativo, perfil });
  if (senha) {
    await usuariosRepository.atualizarSenha(id, await bcrypt.hash(senha, SALT_ROUNDS));
  }
  return atualizado;
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
