import { reactive, ref, watch, nextTick } from 'vue'
import {
  buscarClientePorTelefone,
  listarClientes,
  atualizarCliente,
} from '@/services/clientes'

const INPUT_BASE =
  'w-full rounded-xl border bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-2'

function formatarTelefone(raw) {
  const d = (raw || '').replace(/\D/g, '').slice(0, 11)
  if (d.length > 7) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length > 2) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length === 2) return `(${d})`
  return d
}

export function useClienteForm() {
  const cliente = reactive({ nome: '', telefone: '', cpf: '', email: '', observacoes: '' })
  const erros   = reactive({ nome: '', telefone: '', cpf: '', email: '' })
  const tocados = reactive({})

  const clienteVinculado    = ref(null)
  const buscandoTel         = ref(false)
  const buscandoNome        = ref(false)
  const sugestaoTel         = ref(null)
  const sugestoesNome       = ref([])
  const telOriginal         = ref('')
  const avisoSubstituirTel  = ref(false)
  const loadingSubstituir   = ref(false)
  let timerNome = null

  // ── autocomplete por nome ──────────────────────────────────
  watch(() => cliente.nome, (val) => {
    if (clienteVinculado.value) return
    sugestoesNome.value = []
    clearTimeout(timerNome)
    const q = val.trim()
    if (q.length < 2) { buscandoNome.value = false; return }
    buscandoNome.value = true
    timerNome = setTimeout(async () => {
      try {
        const res = await listarClientes({ q, limit: 6, page: 1 })
        sugestoesNome.value = res.data || []
      } catch {
        sugestoesNome.value = []
      } finally {
        buscandoNome.value = false
      }
    }, 350)
  })

  // ── telefone ───────────────────────────────────────────────
  function aoDigitarTelefone(e) {
    const d = e.target.value.replace(/\D/g, '').slice(0, 11)
    const v = formatarTelefone(d)
    cliente.telefone = v

    if (clienteVinculado.value) {
      sugestaoTel.value = null
      avisoSubstituirTel.value = v !== telOriginal.value
      return
    }
    sugestaoTel.value = null
    avisoSubstituirTel.value = false
    if (d.length === 11) _buscarPorTelefone(d)
  }

  async function _buscarPorTelefone(digits) {
    buscandoTel.value = true
    try {
      const c = await buscarClientePorTelefone(digits)
      sugestaoTel.value = c || null
    } catch {
      sugestaoTel.value = null
    } finally {
      buscandoTel.value = false
    }
  }

  // ── vincular / desvincular ─────────────────────────────────
  function vincularCliente(c) {
    const fmt = formatarTelefone(c.telefone || '')
    clienteVinculado.value = c
    Object.assign(cliente, {
      nome:        c.nome || '',
      telefone:    fmt || c.telefone || '',
      cpf:         c.cpf || '',
      email:       c.email || '',
      observacoes: c.informacao_adicional || c.observacoes || '',
    })
    telOriginal.value          = cliente.telefone
    sugestaoTel.value          = null
    sugestoesNome.value        = []
    avisoSubstituirTel.value   = false
  }

  function desvincular() {
    clienteVinculado.value = null
    sugestaoTel.value      = null
    sugestoesNome.value    = []
    avisoSubstituirTel.value = false
    telOriginal.value      = ''
    Object.assign(cliente, { nome: '', telefone: '', cpf: '', email: '', observacoes: '' })
    Object.assign(erros,   { nome: '', telefone: '', cpf: '', email: '' })
    Object.assign(tocados, {})
    nextTick(() => document.getElementById('os-telefone')?.focus())
  }

  async function substituirTelefone() {
    loadingSubstituir.value = true
    try {
      const atualizado = await atualizarCliente(clienteVinculado.value.id, {
        ...clienteVinculado.value,
        telefone: cliente.telefone.trim() || null,
      })
      clienteVinculado.value   = atualizado
      telOriginal.value        = cliente.telefone
      avisoSubstituirTel.value = false
    } catch {
      reverterTelefone()
    } finally {
      loadingSubstituir.value = false
    }
  }

  function reverterTelefone() {
    cliente.telefone         = telOriginal.value
    avisoSubstituirTel.value = false
  }

  // ── máscaras ───────────────────────────────────────────────
  function mascaraCpf(e) {
    let v = e.target.value.replace(/\D/g, '').slice(0, 11)
    v = v
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3}\.\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3}\.\d{3}\.\d{3})(\d)/, '$1-$2')
    cliente.cpf = v
  }

  // ── helpers de UI ──────────────────────────────────────────
  function iniciais(nome) {
    return (nome || '').split(' ').slice(0, 2).map(p => p[0] || '').join('').toUpperCase() || '?'
  }

  function inputClass(campo) {
    return tocados[campo] && erros[campo]
      ? `${INPUT_BASE} border-red-300 focus:border-red-400 focus:ring-red-100`
      : `${INPUT_BASE} border-slate-200 focus:border-black focus:ring-black/10`
  }

  // ── validação ──────────────────────────────────────────────
  function touch(campo) { tocados[campo] = true; _validarCampo(campo) }

  function _validarCampo(campo) {
    erros[campo] = ''
    const d = cliente[campo]?.replace?.(/\D/g, '') ?? ''
    if (campo === 'nome'     && !cliente.nome.trim())                              erros.nome     = 'Informe o nome do cliente.'
    if (campo === 'telefone' && cliente.telefone && d.length < 10)                 erros.telefone = 'Telefone incompleto.'
    if (campo === 'cpf'      && cliente.cpf      && d.length !== 11)               erros.cpf      = 'CPF deve ter 11 dígitos.'
    if (campo === 'email'    && cliente.email    && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cliente.email)) erros.email = 'E-mail inválido.'
  }

  function validar() {
    ;['nome', 'telefone', 'cpf', 'email'].forEach(c => { tocados[c] = true; _validarCampo(c) })
    return !Object.values(erros).some(Boolean)
  }

  function reset() { desvincular() }

  return {
    cliente, erros, clienteVinculado,
    buscandoTel, buscandoNome, sugestaoTel, sugestoesNome,
    telOriginal, avisoSubstituirTel, loadingSubstituir,
    aoDigitarTelefone, vincularCliente, desvincular,
    substituirTelefone, reverterTelefone,
    mascaraCpf, iniciais, inputClass, touch, validar, reset,
  }
}
