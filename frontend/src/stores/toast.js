import { defineStore } from 'pinia'
import { ref } from 'vue'

let proximoId = 1

export const useToastStore = defineStore('toast', () => {
  const toasts = ref([])

  function remover(id) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  function mostrar(message, type = 'success', duracao = 3500) {
    const id = proximoId++
    toasts.value.push({ id, message, type })
    if (duracao > 0) setTimeout(() => remover(id), duracao)
    return id
  }

  const sucesso = (message) => mostrar(message, 'success')
  const erro = (message) => mostrar(message, 'error', 5500)
  const info = (message) => mostrar(message, 'info')

  return { toasts, mostrar, remover, sucesso, erro, info }
})
