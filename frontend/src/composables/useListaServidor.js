import { ref } from 'vue'

/*
 * Estado de uma lista paginada no servidor.
 * - `buscar(consulta, signal)` faz a requisição (consulta = { q, filtros, ordenarPor, direcao, page, limit })
 * - cada nova consulta cancela a anterior; respostas antigas nunca sobrescrevem as novas
 */
export function useListaServidor(buscar, mensagemErro = 'Não foi possível carregar a lista.') {
  const linhas = ref([])
  const total = ref(0)
  // Começa "carregando": a primeira consulta é emitida logo após a montagem e a tabela não deve piscar o estado vazio
  const carregando = ref(true)
  const erro = ref('')

  let consulta = null
  let controlador = null

  // `nova` substitui a consulta guardada; sem ela, repete a última (ex.: depois de salvar um registro)
  async function carregar(nova) {
    if (nova) consulta = nova
    if (!consulta) return

    controlador?.abort()
    const atual = new AbortController()
    controlador = atual

    carregando.value = true
    erro.value = ''
    try {
      const res = await buscar(consulta, atual.signal)
      if (atual.signal.aborted) return
      linhas.value = res.data ?? res
      total.value = res.total ?? linhas.value.length
    } catch (err) {
      if (atual.signal.aborted || err?.code === 'ERR_CANCELED') return
      erro.value = err?.response?.data?.message || mensagemErro
    } finally {
      if (controlador === atual) carregando.value = false
    }
  }

  return { linhas, total, carregando, erro, carregar }
}
