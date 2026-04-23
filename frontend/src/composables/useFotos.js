import { ref } from 'vue'

export function useFotos() {
  const previews = ref([])
  const files    = ref([])

  function adicionar(e) {
    Array.from(e.target.files ?? []).forEach(f => {
      files.value.push(f)
      previews.value.push({ name: f.name, url: URL.createObjectURL(f) })
    })
    e.target.value = '' // permite re-selecionar o mesmo arquivo
  }

  function remover(i) {
    URL.revokeObjectURL(previews.value[i].url)
    previews.value.splice(i, 1)
    files.value.splice(i, 1)
  }

  function reset() {
    previews.value.forEach(f => URL.revokeObjectURL(f.url))
    previews.value = []
    files.value    = []
  }

  return { previews, files, adicionar, remover, reset }
}
