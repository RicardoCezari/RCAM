import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import '@mdi/font/css/materialdesignicons.css'
import router from './router'
import { useConfigStore } from '@/stores/config'
import { useAuthStore } from '@/stores/auth'
import './style.css'
import { aplicarTemaSalvo } from '@/utils/tema'

aplicarTemaSalvo()

const app = createApp(App)
app.use(createPinia())
app.use(router)

useConfigStore().carregar()
useAuthStore().carregarPerfil()

app.mount('#app')