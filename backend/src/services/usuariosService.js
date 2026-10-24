const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const AppError = require('../utils/AppError');
const usuariosRepository = require('../repositories/usuariosRepository');
const { tamanhoPin, pinValido, gerarHash } = require('../utils/pin');

const SALT_ROUNDS = 12;

async function listar() {
  return usuariosRepository.listar();
}

async function buscarPorId(id) {
  const usuario = await usuariosRepository.buscarPorId(id);
  if (!usuario) throw AppError.notFound('Usuário não encontrado');
  return usuario;
}

/*
 * A senha é opcional quando o usuário entra só por PIN (perfil EDITOR). Nesse caso grava-se um hash de uma
 * senha aleatória descartada: o login com senha fica impossível até o administrador definir uma senha.
 */
async function criar({ nome, login, senha, pin, ativo = true, perfil = 'EDITOR' }) {
  const pinHash = pin ? await gerarPinOuFalhar(pin) : null;
  if (!senha) {
    if (!pinHash) throw AppError.badRequest('Informe uma senha ou um PIN');
    if (perfil === 'ADMIN') throw AppError.badRequest('Administrador precisa de senha');
  }
  const senhaHash = await bcrypt.hash(senha || crypto.randomBytes(32).toString('hex'), SALT_ROUNDS);
  const criado = await usuariosRepository.criar({ nome, login, senhaHash, ativo, perfil });
  if (pinHash) await usuariosRepository.atualizarPin(criado.id, pinHash);
  return criado;
}

async function gerarPinOuFalhar(pin) {
  if (!pinValido(pin)) throw AppError.badRequest(`O PIN deve ter ${tamanhoPin()} dígitos`);
  return gerarHash(pin);
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

// PIN de entrada rápida (definido pelo administrador). Redefinir ou remover também desbloqueia o perfil.
async function definirPin(id, pin) {
  if (!pinValido(pin)) throw AppError.badRequest(`O PIN deve ter ${tamanhoPin()} dígitos`);
  if (!(await usuariosRepository.atualizarPin(id, await gerarHash(pin)))) {
    throw AppError.notFound('Usuário não encontrado');
  }
}

async function removerPin(id) {
  if (!(await usuariosRepository.atualizarPin(id, null))) throw AppError.notFound('Usuário não encontrado');
}

module.exports = { listar, buscarPorId, criar, atualizar, trocarSenha, definirPin, removerPin };
