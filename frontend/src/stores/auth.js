import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token') || null)
  const usuario = ref(JSON.parse(localStorage.getItem('usuario') || 'null'))
  const loading = ref(false)
  const erro = ref(null)

  const isAutenticado = computed(() => !!token.value)

  async function login(login, senha) {
    loading.value = true
    erro.value = null
    try {
      const { data } = await api.post('/auth/login', { login, senha })
      token.value = data.token
      usuario.value = data.usuario
      localStorage.setItem('token', data.token)
      localStorage.setItem('usuario', JSON.stringify(data.usuario))
      return true
    } catch (err) {
      erro.value = err.response?.data?.message || 'Erro ao fazer login'
      return false
    } finally {
      loading.value = false
    }
  }

  function logout() {
    token.value = null
    usuario.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
  }

  return { token, usuario, loading, erro, isAutenticado, login, logout }
})
