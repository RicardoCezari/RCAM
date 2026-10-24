import { reactive } from 'vue'

// Estado compartilhado entre o guard do router e a janela de PIN (montada uma vez no App.vue)
export const pinAdmin = reactive({ aberto: false, resolver: null })

// Abre a janela de PIN e resolve com true (PIN confirmado) ou false (cancelado)
export function pedirPinAdmin() {
  if (pinAdmin.resolver) pinAdmin.resolver(false)
  return new Promise((resolver) => {
    pinAdmin.resolver = resolver
    pinAdmin.aberto = true
  })
}

export function concluirPinAdmin(confirmado) {
  const resolver = pinAdmin.resolver
  pinAdmin.resolver = null
  pinAdmin.aberto = false
  resolver?.(confirmado)
}
