import { reactive, ref, computed, onMounted } from 'vue'
import { listarServicos, listarTiposObjeto } from '@/services/servicos'

const FIELD_BASE =
  'w-full rounded-xl border bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:bg-white focus:ring-2'

function cls(base, hasError) {
  return hasError
    ? `${base} border-red-300 focus:border-red-400 focus:ring-red-100`
    : `${base} border-slate-200 focus:border-black focus:ring-black/10`
}

export function useOsForm() {
  const os = reactive({
    tipoObjeto: '', servico: '', quantidade: 1,
    dataEntrega: '', valor: '', observacoes: '',
  })
  const erros   = reactive({ tipoObjeto: '', servico: '', dataEntrega: '' })
  const tocados = reactive({})
  const dateInputRef = ref(null)
  const tiposObjeto  = ref([])
  const servicos     = ref([])

  const nomeServico = computed(
    () => servicos.value.find(s => String(s.id) === os.servico)?.nome || '—'
  )

  onMounted(async () => {
    try {
      const [tipos, svcs] = await Promise.all([
        listarTiposObjeto(),
        listarServicos({ ativo: true }),
      ])
      tiposObjeto.value = tipos ?? []
      servicos.value    = svcs?.data ?? svcs ?? []
    } catch { /* campos ficam vazios */ }
  })

  // ── classes de campo ───────────────────────────────────────
  function inputClass(campo) { return cls(FIELD_BASE, tocados[campo] && erros[campo]) }
  function selectClass(campo) { return cls(`${FIELD_BASE} appearance-none pr-8`, tocados[campo] && erros[campo]) }

  // ── validação ──────────────────────────────────────────────
  function touch(campo) { tocados[campo] = true; _validarCampo(campo) }

  function _validarCampo(campo) {
    erros[campo] = ''
    if (campo === 'tipoObjeto' && !os.tipoObjeto) erros.tipoObjeto = 'Selecione o tipo de objeto.'
    if (campo === 'servico'    && !os.servico)    erros.servico    = 'Selecione um serviço.'
    if (campo === 'dataEntrega'&& !os.dataEntrega) erros.dataEntrega = 'Informe a data de entrega.'
  }

  function validar() {
    ;['tipoObjeto', 'servico', 'dataEntrega'].forEach(c => { tocados[c] = true; _validarCampo(c) })
    return !Object.values(erros).some(Boolean)
  }

  // ── helpers de campo ───────────────────────────────────────
  function openDatePicker() {
    if (dateInputRef.value && typeof dateInputRef.value.showPicker === 'function')
      dateInputRef.value.showPicker()
  }

  function onCurrencyInput(e) {
    const d = e.target.value.replace(/\D/g, '')
    os.valor = d
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(d) / 100)
      : ''
  }

  function reset() {
    Object.assign(os,     { tipoObjeto: '', servico: '', quantidade: 1, dataEntrega: '', valor: '', observacoes: '' })
    Object.assign(erros,  { tipoObjeto: '', servico: '', dataEntrega: '' })
    Object.assign(tocados, {})
  }

  return {
    os, erros, dateInputRef, tiposObjeto, servicos, nomeServico,
    inputClass, selectClass, touch, validar,
    openDatePicker, onCurrencyInput, reset,
  }
}
