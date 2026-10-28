const bcrypt = require('bcryptjs');
const AppError = require('../utils/AppError');
const { assinar } = require('../utils/token');
const { tamanhoPin, pinValido, conferir, conferirFalso } = require('../utils/pin');
const authRepository = require('../repositories/authRepository');

// Hash descartável: mantém o custo do bcrypt igual quando o login não existe, evitando enumeração por tempo de resposta
const HASH_FALSO = bcrypt.hashSync('senha-inexistente', 12);

const dadosDeSessao = ({ id, nome, login, perfil, foto_url }) => ({ id, nome, login, perfil, foto_url });

async function login(login, senha) {
  const usuario = await authRepository.buscarPorLogin(login);

  const senhaValida = await bcrypt.compare(senha, usuario?.senha || HASH_FALSO);
  if (!usuario || !usuario.ativo || !senhaValida) {
    throw AppError.unauthorized('Credenciais inválidas');
  }

  return { token: assinar(usuario), usuario: dadosDeSessao(usuario) };
}

async function me(usuarioId) {
  const usuario = await authRepository.buscarPorId(usuarioId);
  if (!usuario) throw AppError.notFound('Usuário não encontrado');
  return usuario;
}

// ── Entrada rápida por PIN (só em aparelhos autorizados) ─────────────────
const MAX_TENTATIVAS_PIN = 5;
const BLOQUEIO_PIN_MINUTOS = 15;

// Só id, nome e foto: o login não é exposto na lista
async function perfis() {
  return { pin_tamanho: tamanhoPin(), perfis: await authRepository.listarPerfisComPin() };
}

function bloqueado(minutos) {
  return new AppError(
    `Perfil bloqueado por tentativas incorretas. Tente em ${minutos} min ou entre com usuário e senha.`,
    429
  );
}

// Confere o PIN (com limite de tentativas e bloqueio por perfil) e devolve o usuário
async function validarPin(usuarioId, pin) {
  if (!pinValido(pin)) throw AppError.badRequest(`O PIN tem ${tamanhoPin()} dígitos`);

  const usuario = await authRepository.reservarTentativaPin(usuarioId, MAX_TENTATIVAS_PIN, BLOQUEIO_PIN_MINUTOS);
  if (!usuario) {
    // Perfil inexistente, sem PIN ou bloqueado: mesmo custo de tempo e resposta genérica (exceto bloqueio)
    await conferirFalso(pin);
    const { existe, minutos } = await authRepository.situacaoDoPin(usuarioId);
    if (existe && minutos > 0) throw bloqueado(minutos);
    throw AppError.unauthorized('PIN incorreto');
  }

  if (!(await conferir(pin, usuario.pin_hash))) {
    if (usuario.bloqueou_agora) throw bloqueado(BLOQUEIO_PIN_MINUTOS);
    throw AppError.unauthorized('PIN incorreto');
  }

  await authRepository.limparTentativasPin(usuario.id);
  return usuario;
}

async function loginPorPin(usuarioId, pin) {
  const usuario = await validarPin(usuarioId, pin);
  return { token: assinar(usuario), usuario: dadosDeSessao(usuario) };
}

// Reconfirmação do PIN de quem já está logado (ex.: entrar na Administração)
async function confirmarPin(usuarioId, pin) {
  await validarPin(usuarioId, pin);
  return { ok: true };
}

// Alternativa ao PIN esquecido: reconfirma a senha de quem já está logado
async function confirmarSenha(usuarioId, senha) {
  const usuario = await authRepository.buscarComSenhaPorId(usuarioId);
  const senhaValida = await bcrypt.compare(senha, usuario?.senha || HASH_FALSO);
  if (!usuario || !usuario.ativo || !senhaValida) throw AppError.unauthorized('Senha incorreta');
  return { ok: true };
}

module.exports = { login, me, perfis, loginPorPin, confirmarPin, confirmarSenha };
