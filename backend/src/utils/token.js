const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const EMISSOR = 'azteca-os';
const AUDIENCIA = 'azteca-os-web';

/*
 * "pv" (versão da senha): fragmento do SHA-256 do hash atual da senha. Trocar a senha muda o hash e, com ele,
 * invalida todos os tokens emitidos antes, sem precisar de tabela de revogação.
 */
function versaoSenha(hashSenha) {
  return crypto.createHash('sha256').update(String(hashSenha)).digest('hex').slice(0, 16);
}

function assinar(usuario) {
  return jwt.sign(
    { sub: usuario.id, nome: usuario.nome, login: usuario.login, pv: versaoSenha(usuario.senha) },
    process.env.JWT_SECRET,
    { algorithm: 'HS256', issuer: EMISSOR, audience: AUDIENCIA, expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

function verificar(token) {
  return jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'], issuer: EMISSOR, audience: AUDIENCIA });
}

module.exports = { assinar, verificar, versaoSenha };
