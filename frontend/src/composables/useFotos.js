import { ref } from 'vue'
import { adicionarFotosNaLista, liberarFotos } from '@/utils/imagem'

// Fotos gerais da O.S. (tudo o que o cliente deixou)
export function useFotos() {
  const fotos = ref([])

  // Retorna quantas fotos foram recebidas (inclusive as que falharam)
  function adicionar(event) {
    const promessa = adicionarFotosNaLista(fotos.value, event.target.files)
    event.target.value = '' // permite re-selecionar o mesmo arquivo
    return promessa
  }

  function remover(i) {
    liberarFotos(fotos.value.splice(i, 1))
  }

  function reset() {
    liberarFotos(fotos.value)
    fotos.value = []
  }

  return { fotos, adicionar, remover, reset }
}
