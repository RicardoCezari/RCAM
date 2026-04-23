import api from './api'

export async function listarOrdens(params = {}) {
  const { data } = await api.get('/ordens', { params })
  return data
}

export async function buscarOrdem(id) {
  const { data } = await api.get(`/ordens/${id}`)
  return data
}

export async function criarOrdem(payload) {
  const { data } = await api.post('/ordens', payload)
  return data
}

export async function atualizarOrdem(id, payload) {
  const { data } = await api.put(`/ordens/${id}`, payload)
  return data
}

export async function mudarEstado(id, estado) {
  const { data } = await api.patch(`/ordens/${id}/estado`, { estado })
  return data
}
