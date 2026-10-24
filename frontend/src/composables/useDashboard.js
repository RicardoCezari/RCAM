import { ref, computed, watch } from 'vue'
import { obterDashboard } from '@/services/dashboard'
import { intervaloDoPeriodo } from '@/utils/periodos'

// Estado e carga do dashboard: filtros -> requisição única; respostas antigas (corrida) são descartadas
export function useDashboard() {
  const periodo = ref('30d')
  const inicioPersonalizado = ref('')
  const fimPersonalizado = ref('')
  const usuarioId = ref('')
  const servicoId = ref('')

  const dados = ref(null)
  const carregando = ref(false)
  const erro = ref('')

  const intervalo = computed(() =>
    periodo.value === 'custom'
      ? { inicio: inicioPersonalizado.value, fim: fimPersonalizado.value }
      : intervaloDoPeriodo(periodo.value)
  )

  let ultimaRequisicao = 0

  async function carregar() {
    const { inicio, fim } = intervalo.value
    if (!inicio || !fim) return
    if (inicio > fim) {
      erro.value = 'A data final não pode ser anterior à inicial.'
      return
    }

    const minha = ++ultimaRequisicao
    carregando.value = true
    erro.value = ''
    try {
      const resposta = await obterDashboard({
        inicio,
        fim,
        usuarioId: usuarioId.value || undefined,
        servicoId: servicoId.value || undefined,
      })
      if (minha === ultimaRequisicao) dados.value = resposta
    } catch (err) {
      if (minha === ultimaRequisicao) erro.value = err.response?.data?.message || 'Não foi possível carregar o dashboard.'
    } finally {
      if (minha === ultimaRequisicao) carregando.value = false
    }
  }

  // Ao abrir "Personalizado", começa pelo intervalo que já estava na tela
  watch(periodo, (novo, antigo) => {
    if (novo !== 'custom') return
    const anterior = intervaloDoPeriodo(antigo)
    if (anterior && !inicioPersonalizado.value) {
      inicioPersonalizado.value = anterior.inicio
      fimPersonalizado.value = anterior.fim
    }
  })

  watch([periodo, inicioPersonalizado, fimPersonalizado, usuarioId, servicoId], carregar, { immediate: true })

  return { periodo, inicioPersonalizado, fimPersonalizado, usuarioId, servicoId, dados, carregando, erro, intervalo, carregar }
}
