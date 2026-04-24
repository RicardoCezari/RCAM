import { reactive, ref, computed, onMounted } from 'vue'
import { listarServicos, listarTiposObjeto } from '@/services/servicos'

const FIELD_BASE =
  'w-full rounded-xl border bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:bg-white focus:ring-2'

function cls(base, hasError) {
  return hasError
    ? `${base} border-red-300 focus:border-red-400 focus:ring-red-100`
    : `${base} border-slate-200 focus:border-black focus:ring-black/10`
}

function hojeISO() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm   = String(d.getMonth() + 1).padStart(2, '0')
  const dd   = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export function useOsForm() {
  const os = reactive({
    estado:      'ENTRADA',
    dataEntrega: '',
    horaEntrega: '',
    observacoes: '',
  })
  const erros = reactive({ dataEntrega: '' })
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

  // ── validação ──────────────────────────────────────────────
  function touch(campo) { tocados[campo] = true; _validarCampo(campo) }

  function _validarCampo(campo) {
    erros[campo] = ''
    if (campo === 'dataEntrega') {
      if (!os.dataEntrega) {
        erros.dataEntrega = 'Informe a data de entrega.'
      } else if (os.dataEntrega < hojeISO()) {
        erros.dataEntrega = 'A data de entrega não pode ser no passado.'
      }
    }
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

  function reset() {
    Object.assign(os,     { estado: 'ENTRADA', dataEntrega: '', horaEntrega: '', observacoes: '' })
    Object.assign(erros,  { dataEntrega: '' })
    Object.assign(tocados, {})
  }

  return {
    os, erros, dateInputRef, tiposObjeto, servicos, carregando,
    minDate: hojeISO(),
    inputClass, touch, validar,
    openDatePicker, reset,
  }
}
