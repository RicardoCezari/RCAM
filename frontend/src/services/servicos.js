import api from './api'

export async function listarServicos(params = {}) {
  const { data } = await api.get('/servicos', { params })
  return data
}

export async function buscarServico(id) {
  const { data } = await api.get(`/servicos/${id}`)
  return data
}

export async function criarServico(payload) {
  const { data } = await api.post('/servicos', payload)
  return data
}

export async function atualizarServico(id, payload) {
  const { data } = await api.put(`/servicos/${id}`, payload)
  return data
}

export async function deletarServico(id) {
  await api.delete(`/servicos/${id}`)
}

export async function listarTiposObjeto() {
  const { data } = await api.get('/tipos-objeto')
  return data
}
