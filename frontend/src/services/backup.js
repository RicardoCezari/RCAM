import api from './api'

export async function situacaoBackup() {
  const { data } = await api.get('/backup')
  return data
}

// O backup copia as fotos e pode demorar mais que o tempo padrão
export async function executarBackup() {
  const { data } = await api.post('/backup', null, { timeout: 10 * 60 * 1000 })
  return data
}

export async function baixarBackup(nome) {
  const { data } = await api.get(`/backup/${encodeURIComponent(nome)}/download`, {
    responseType: 'blob',
    timeout: 5 * 60 * 1000,
  })
  const url = URL.createObjectURL(data)
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  a.click()
  URL.revokeObjectURL(url)
}
