import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'
import { entrarComPin } from '@/services/dispositivo'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token') || null)
  const usuario = ref(JSON.parse(localStorage.getItem('usuario') || 'null'))
  const loading = ref(false)
  const erro = ref(null)
  // Administração liberada pelo PIN: só em memória, vale enquanto o usuário permanece nela
  const adminLiberado = ref(false)

  const isAutenticado = computed(() => !!token.value)
  const isAdmin = computed(() => usuario.value?.perfil === 'ADMIN')

  function salvarUsuario(dados) {
    usuario.value = dados
    localStorage.setItem('usuario', JSON.stringify(dados))
  }

  // Atualiza o perfil a cada carregamento da página (o perfil pode mudar no banco)
  let perfilPromise = null
  function carregarPerfil(forcar = false) {
    if (!token.value) return Promise.resolve()
    if (forcar) perfilPromise = null
    if (!perfilPromise) {
      perfilPromise = api
        .get('/auth/me')
        .then(({ data }) => salvarUsuario({ ...usuario.value, ...(data.usuario || data) }))
        .catch(() => {
          // 401 já é tratado pelo interceptor
        })
    }
    return perfilPromise
  }

  function iniciarSessao(data) {
    token.value = data.token
    usuario.value = data.usuario
    perfilPromise = Promise.resolve()
    localStorage.setItem('token', data.token)
    localStorage.setItem('usuario', JSON.stringify(data.usuario))
  }

  async function login(login, senha) {
    loading.value = true
    erro.value = null
    try {
      const { data } = await api.post('/auth/login', { login, senha })
      iniciarSessao(data)
      return true
    } catch (err) {
      erro.value = err.response?.data?.message || 'Erro ao fazer login'
      return false
    } finally {
      loading.value = false
    }
  }

  // Entrada rápida por PIN (aparelho autorizado)
  async function loginPin(usuarioId, pin) {
    loading.value = true
    erro.value = null
    try {
      iniciarSessao(await entrarComPin(usuarioId, pin))
      return true
    } catch (err) {
      erro.value = err.response?.data?.message || 'Erro ao entrar com o PIN'
      return false
    } finally {
      loading.value = false
    }
  }

  function logout() {
    token.value = null
    usuario.value = null
    adminLiberado.value = false
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
  }

  return { token, usuario, loading, erro, adminLiberado, isAutenticado, isAdmin, login, loginPin, logout, carregarPerfil }
})
