import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { publica: true },
    },
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
    },
    {
      path: '/nova-os',
      name: 'nova-os',
      component: () => import('@/views/NewOsView.vue'),
    },
    {
      path: '/listar-clientes',
      name: 'listar-clientes',
      component: () => import('@/views/CustomerListView.vue'),
    },
    {
      path: '/listar-os',
      name: 'listar-os',
      component: () => import('@/views/ServiceOrderListView.vue'),
    },
    {
      path: '/listar-os/:id(\\d+)',
      name: 'detalhe-os',
      component: () => import('@/views/OrdemServicoDetalheView.vue'),
    },
    {
      path: '/cadastrar-servicos',
      name: 'cadastrar-servicos',
      component: () => import('@/views/ServicosCadastroView.vue'),
      meta: { admin: true },
    },
    {
      path: '/cadastrar-objetos',
      name: 'cadastrar-objetos',
      component: () => import('@/views/ObjetosCadastroView.vue'),
      meta: { admin: true },
    },
    {
      path: '/administracao',
      name: 'administracao',
      component: () => import('@/views/AdminView.vue'),
      meta: { admin: true },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  if (!to.meta.publica && !auth.isAutenticado) {
    return { name: 'login' }
  }

  if (to.name === 'login' && auth.isAutenticado) {
    return { name: 'home' }
  }

  if (to.meta.admin) {
    await auth.carregarPerfil()
    if (!auth.isAdmin) return { name: 'home' }
  }

  return true
})

export default router