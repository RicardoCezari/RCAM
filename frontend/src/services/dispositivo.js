import api from './api'

// Token do aparelho autorizado pelo administrador (fica só neste navegador)
const CHAVE_TOKEN = 'dispositivo'
const CHAVE_ID = 'dispositivo_id'

export const temAparelho = () => !!localStorage.getItem(CHAVE_TOKEN)
export const idDoAparelho = () => Number(localStorage.getItem(CHAVE_ID)) || null

export function esquecerAparelho() {
  localStorage.removeItem(CHAVE_TOKEN)
  localStorage.removeItem(CHAVE_ID)
}

const cabecalho = () => ({ 'X-Dispositivo': localStorage.getItem(CHAVE_TOKEN) || '' })

// Perfis com PIN. Aparelho revogado (401): esquece o token e cai no login com senha.
export async function listarPerfis() {
  try {
    const { data } = await api.get('/auth/perfis', { headers: cabecalho() })
    return data
  } catch (err) {
    if (err.response?.status === 401) esquecerAparelho()
    throw err
  }
}

export async function entrarComPin(usuarioId, pin) {
  const { data } = await api.post('/auth/pin', { usuario_id: usuarioId, pin }, { headers: cabecalho() })
  return data
}

// Reconfirma o PIN de quem já está logado (não depende do aparelho)
export async function confirmarPinAtual(pin) {
  const { data } = await api.post('/auth/pin/confirmar', { pin })
  return data
}

// Alternativa ao PIN esquecido: reconfirma a senha de quem já está logado
export async function confirmarSenhaAtual(senha) {
  const { data } = await api.post('/auth/senha/confirmar', { senha })
  return data
}

// ── Administração (somente ADMIN) ────────────────────────────────────────
export async function listarAparelhos() {
  const { data } = await api.get('/dispositivos')
  return data
}

// Autoriza o navegador atual e guarda o token recebido
export async function autorizarEsteAparelho(nome) {
  const { data } = await api.post('/dispositivos', { nome })
  localStorage.setItem(CHAVE_TOKEN, data.token)
  localStorage.setItem(CHAVE_ID, String(data.id))
  return data
}

export async function revogarAparelho(id) {
  await api.delete(`/dispositivos/${id}`)
  if (id === idDoAparelho()) esquecerAparelho()
}

export async function definirPin(usuarioId, pin) {
  await api.put(`/usuarios/${usuarioId}/pin`, { pin })
}

export async function removerPin(usuarioId) {
  await api.delete(`/usuarios/${usuarioId}/pin`)
}
