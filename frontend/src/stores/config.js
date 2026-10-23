import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'
import { fileUrl } from '@/utils/arquivos'

export const useConfigStore = defineStore('config', () => {
  const empresaNome = ref('')
  const logoUrl = ref(null)

  const logoSrc = computed(() => (logoUrl.value ? fileUrl(logoUrl.value) : ''))

  function aplicar(data) {
    empresaNome.value = data?.empresa_nome || ''
    logoUrl.value = data?.logo_url || null
  }

  async function carregar() {
    try {
      const { data } = await api.get('/configuracoes')
      aplicar(data)
    } catch {
      // mantém valores atuais; a marca padrão é exibida
    }
  }

  async function salvarNome(nome) {
    const { data } = await api.put('/configuracoes', { empresa_nome: nome })
    aplicar(data)
  }

  async function enviarLogo(arquivo) {
    const form = new FormData()
    form.append('logo', arquivo)
    const { data } = await api.post('/configuracoes/logo', form)
    aplicar(data)
  }

  async function removerLogo() {
    const { data } = await api.delete('/configuracoes/logo')
    aplicar(data)
  }

  return { empresaNome, logoUrl, logoSrc, carregar, salvarNome, enviarLogo, removerLogo }
})
