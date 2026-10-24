import api from './api'

// params: { inicio, fim, usuarioId?, servicoId? } (datas AAAA-MM-DD)
export async function obterDashboard(params) {
  const { data } = await api.get('/dashboard', { params })
  return data
}
