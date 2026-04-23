const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');
const authRepository = require('../repositories/authRepository');

async function login(login, senha) {
  const usuario = await authRepository.buscarPorLogin(login);

  if (!usuario || !usuario.ativo) {
    throw AppError.unauthorized('Credenciais inválidas');
  }

  const senhaValida = await bcrypt.compare(senha, usuario.senha);
  if (!senhaValida) {
    throw AppError.unauthorized('Credenciais inválidas');
  }

  const token = jwt.sign(
    { sub: usuario.id, nome: usuario.nome, login: usuario.login },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );

  return {
    token,
    usuario: { id: usuario.id, nome: usuario.nome, login: usuario.login },
  };
}

async function me(usuarioId) {
  const usuario = await authRepository.buscarPorId(usuarioId);
  if (!usuario) throw AppError.notFound('Usuário não encontrado');
  return usuario;
}

module.exports = { login, me };
