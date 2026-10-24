const crypto = require('crypto');
const AppError = require('../utils/AppError');
const repository = require('../repositories/dispositivosRepository');

const sha256 = (texto) => crypto.createHash('sha256').update(texto).digest('hex');

// O token só é devolvido aqui, uma vez; no banco fica apenas o hash
async function autorizar(nome, usuarioId) {
  const token = crypto.randomBytes(32).toString('base64url');
  const dispositivo = await repository.criar({ nome, tokenHash: sha256(token), criadoPor: usuarioId });
  return { ...dispositivo, token };
}

const listar = () => repository.listar();

async function revogar(id) {
  if (!(await repository.remover(id))) throw AppError.notFound('Aparelho não encontrado');
}

// Valida o token enviado pelo aparelho; lança 401 se desconhecido ou revogado
async function validar(token) {
  if (typeof token !== 'string' || token.length < 20 || token.length > 100) {
    throw AppError.unauthorized('Aparelho não autorizado');
  }
  const dispositivo = await repository.buscarPorTokenEAtualizarUso(sha256(token));
  if (!dispositivo) throw AppError.unauthorized('Aparelho não autorizado');
  return dispositivo;
}

module.exports = { autorizar, listar, revogar, validar };
