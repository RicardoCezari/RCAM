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
const BYTES_POR_ENVIO = 15 * 1024 * 1024

// Lotes limitados por quantidade e por tamanho (originais grandes não podem ir todos na mesma requisição)
function agruparParaEnvio(arquivos) {
  const lotes = []
  let lote = []
  let bytes = 0
  for (const arquivo of arquivos) {
    if (lote.length && (lote.length >= FOTOS_POR_ENVIO || bytes + arquivo.size > BYTES_POR_ENVIO)) {
      lotes.push(lote)
      lote = []
      bytes = 0
    }
    lote.push(arquivo)
    bytes += arquivo.size
  }
  if (lote.length) lotes.push(lote)
  return lotes
}

// Envia fotos da O.S. (itemId opcional vincula as fotos a um objeto/item)
export async function enviarFotos(ordemId, arquivos, itemId = null, etapa = 'ENTRADA') {
  const enviadas = []
  for (const lote of agruparParaEnvio(arquivos)) {
    const form = new FormData()
    if (itemId) form.append('item_id', itemId)
    form.append('etapa', etapa)
    lote.forEach((f) => form.append('fotos', f))
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
