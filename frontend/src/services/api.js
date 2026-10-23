import axios from 'axios'

const api = axios.create({
  // Sem VITE_API_URL, usa o mesmo host da tela (funciona no PC e no celular da mesma rede)
  baseURL: import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3000/api`,
  timeout: 15000,
})

// Injeta o token em todas as requisições autenticadas
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Redireciona para login se o token expirar (401)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 401 no login = credenciais inválidas: mantém a tela e mostra a mensagem
    const ehLogin = error.config?.url?.includes('/auth/login')
    if (error.response?.status === 401 && !ehLogin) {
      localStorage.removeItem('token')
      localStorage.removeItem('usuario')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
