import api from '@/services/api'

// Origem da API (sem o sufixo /api), usada para montar a URL de arquivos enviados
const origemApi = new URL(api.defaults.baseURL, window.location.href).origin

// Aceita caminho relativo (/uploads/...), URL absoluta (ex.: S3) ou prévia local (blob:)
export function fileUrl(caminho) {
  if (!caminho) return ''
  if (/^(https?:|blob:)/i.test(caminho)) return caminho
  return `${origemApi}${caminho}`
}
