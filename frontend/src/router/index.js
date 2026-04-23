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
      path: '/novo-cliente',
      redirect: '/nova-os',
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
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()

  if (!to.meta.publica && !auth.isAutenticado) {
    return { name: 'login' }
  }

  if (to.name === 'login' && auth.isAutenticado) {
    return { name: 'home' }
  }

  return true
})

export default router