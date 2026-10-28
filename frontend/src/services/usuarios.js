import api from './api'

export async function listarUsuarios() {
  const { data } = await api.get('/usuarios')
  return data
}

export async function criarUsuario(payload) {
  const { data } = await api.post('/usuarios', payload)
  return data
}

export async function atualizarUsuario(id, payload) {
  const { data } = await api.put(`/usuarios/${id}`, payload)
  return data
}

export async function enviarFotoUsuario(id, arquivo) {
  const form = new FormData()
  form.append('foto', arquivo)
  const { data } = await api.put(`/usuarios/${id}/foto`, form)
  return data
}

export async function removerFotoUsuario(id) {
  const { data } = await api.delete(`/usuarios/${id}/foto`)
  return data
}
