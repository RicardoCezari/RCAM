import { ref } from 'vue'
import { prepararFotos, liberarFotos } from '@/utils/imagem'

// Fotos gerais da O.S. (tudo o que o cliente deixou)
export function useFotos() {
  const fotos = ref([])

  async function adicionar(event) {
    const novas = await prepararFotos(event.target.files)
    event.target.value = '' // permite re-selecionar o mesmo arquivo
    fotos.value.push(...novas)
    return novas.length
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
