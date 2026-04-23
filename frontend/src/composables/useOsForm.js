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
    estado: 'ENTRADA',
    tipoObjeto: '', servico: '', quantidade: 1,
    dataEntrega: '', horaEntrega: '', valor: '', observacoes: '',
  })
  const erros   = reactive({ tipoObjeto: '', servico: '', dataEntrega: '' })
  const tocados = reactive({})
  const dateInputRef = ref(null)
  const tiposObjeto  = ref([])
  const servicos     = ref([])
  const carregando   = ref(false)

  onMounted(async () => {
    carregando.value = true
    try {
      const [tipos, svcs] = await Promise.all([
        listarTiposObjeto(),
        listarServicos({ ativo: true }),
      ])
      tiposObjeto.value = tipos ?? []
      servicos.value    = svcs?.data ?? svcs ?? []
    } catch { /* campos ficam vazios */ } finally {
      carregando.value = false
    }
  })

  // ── classes de campo ───────────────────────────────────────
  function inputClass(campo) { return cls(FIELD_BASE, tocados[campo] && erros[campo]) }
  function selectClass(campo) { return cls(`${FIELD_BASE} appearance-none pr-8`, tocados[campo] && erros[campo]) }

  // ── validação ──────────────────────────────────────────────
  function touch(campo) { tocados[campo] = true; _validarCampo(campo) }

  function _validarCampo(campo) {
    erros[campo] = ''
    if (campo === 'dataEntrega' && !os.dataEntrega) erros.dataEntrega = 'Informe a data de entrega.'
  }

  function validar() {
    tocados['dataEntrega'] = true
    _validarCampo('dataEntrega')
    return !erros.dataEntrega
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
    Object.assign(os,     { estado: 'ENTRADA', dataEntrega: '', horaEntrega: '', observacoes: '' })
    Object.assign(erros,  { dataEntrega: '' })
    Object.assign(tocados, {})
  }

  return {
    os, erros, dateInputRef, tiposObjeto, servicos, carregando,
    inputClass, selectClass, touch, validar,
    openDatePicker, reset,
  }
}
