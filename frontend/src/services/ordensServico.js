import api from './api'

export async function listarOrdens(params = {}, config = {}) {
  const { data } = await api.get('/ordens', { ...config, params })
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

export async function atualizarItemOrdem(ordemId, itemId, payload) {
  const { data } = await api.put(`/ordens/${ordemId}/itens/${itemId}`, payload)
  return data
}

export async function adicionarItemOrdem(ordemId, payload) {
  const { data } = await api.post(`/ordens/${ordemId}/itens`, payload)
  return data
}

const FOTOS_POR_ENVIO = 10

// Envia fotos da O.S. (itemId opcional vincula as fotos a um objeto/item)
export async function enviarFotos(ordemId, arquivos, itemId = null, etapa = 'ENTRADA') {
  const enviadas = []
  for (let i = 0; i < arquivos.length; i += FOTOS_POR_ENVIO) {
    const form = new FormData()
    if (itemId) form.append('item_id', itemId)
    form.append('etapa', etapa)
    arquivos.slice(i, i + FOTOS_POR_ENVIO).forEach((f) => form.append('fotos', f))
    const { data } = await api.post(`/ordens/${ordemId}/fotos`, form, { timeout: 120000 })
    enviadas.push(...data)
  }
  return enviadas
}

export async function historicoOrdem(id) {
  const { data } = await api.get(`/ordens/${id}/historico`)
  return data
}

export async function historicoCliente(clienteId) {
  const { data } = await api.get(`/ordens/cliente/${clienteId}/historico`)
  return data
}

export async function removerFotoOrdem(ordemId, fotoId) {
  await api.delete(`/ordens/${ordemId}/fotos/${fotoId}`)
}
