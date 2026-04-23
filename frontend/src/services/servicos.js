import api from './api'

export async function listarServicos(params = {}) {
  const { data } = await api.get('/servicos', { params })
  return data
}

export async function listarTiposObjeto() {
  const { data } = await api.get('/tipos-objeto')
  return data
}
