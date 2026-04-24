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
  // 11 dígitos → celular:  (XX) XXXXX-XXXX
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  // 10 dígitos → fixo:     (XX) XXXX-XXXX
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  // 7–9 dígitos → parcial fixo durante digitação
  if (d.length > 6)    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  if (d.length > 2)    return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length === 2)  return `(${d})`
  return d
}

// DDD brasileiro válido: 11-99 (sem 0X)
// Celular: 11 dígitos, 3º dígito = 9
// Fixo:    10 dígitos, 3º dígito ≠ 9
function _telefoneValido(digits) {
  if (digits.length !== 10 && digits.length !== 11) return { ok: false, msg: 'Telefone incompleto.' }
  const ddd = parseInt(digits.slice(0, 2), 10)
  if (ddd < 11 || ddd > 99) return { ok: false, msg: 'DDD inválido.' }
  // 10 dígitos começando com 9 após o DDD = celular sem o 9 obrigatório
  if (digits.length === 10 && digits[2] === '9') return { ok: false, msg: 'Celular incompleto: falta o 9 obrigatório. Ex: (38) 99997-8848.' }
  if (digits.length === 11 && digits[2] !== '9') return { ok: false, msg: 'Celular deve ter 9 como primeiro dígito após o DDD.' }
  return { ok: true }
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

    // Limpa erro a cada digitação para não deixar mensagem antiga na tela
    erros.telefone = ''

    if (clienteVinculado.value) {
      sugestaoTel.value = null
      if (v !== telOriginal.value) {
        // Valida o novo número antes de mostrar o banner de substituição
        const check = _telefoneValido(d)
        if (!check.ok) {
          tocados['telefone'] = true
          erros.telefone = check.msg
          avisoSubstituirTel.value = false
        } else {
          avisoSubstituirTel.value = true
        }
      } else {
        avisoSubstituirTel.value = false
      }
      return
    }
    avisoSubstituirTel.value = false
    if (d.length === 10 || d.length === 11) {
      const check = _telefoneValido(d)
      if (check.ok) {
        _buscarPorTelefone(d)
      } else {
        sugestaoTel.value = null
        // Mostrar erro imediato quando celular incompleto (10 dígitos + 9 após DDD)
        const celuarIncompleto = d.length === 10 && d[2] === '9'
        if (tocados['telefone'] || celuarIncompleto) {
          tocados['telefone'] = true
          erros.telefone = check.msg
        }
      }
    } else {
      sugestaoTel.value = null
      if (tocados['telefone']) {
        erros.telefone = d.length > 0 ? 'Telefone incompleto.' : ''
      }
    }
  }

  async function _buscarPorTelefone(digits) {
    buscandoTel.value = true
    try {
      const c = await buscarClientePorTelefone(digits)
      sugestaoTel.value = c || null
      // Duplicata NÃO é erro vermelho — o card de aviso no template trata isso
      if (tocados['telefone'] && !c) erros.telefone = ''
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
    erros.telefone             = ''
    erros.nome                 = ''
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
    const d = cliente.telefone.replace(/\D/g, '')
    const check = _telefoneValido(d)
    if (!check.ok) {
      tocados['telefone'] = true
      erros.telefone = check.msg
      avisoSubstituirTel.value = false
      return
    }
    loadingSubstituir.value = true
    try {
      const atualizado = await atualizarCliente(clienteVinculado.value.id, {
        ...clienteVinculado.value,
        telefone: cliente.telefone.trim() || null,
      })
      clienteVinculado.value   = atualizado
      telOriginal.value        = cliente.telefone
      avisoSubstituirTel.value = false
    } catch (err) {
      const status = err?.response?.status
      const msg    = err?.response?.data?.message || ''
      if (status === 409) {
        erros.telefone = msg || 'Este número já está cadastrado para outro cliente.'
        tocados['telefone'] = true
        avisoSubstituirTel.value = false
      }
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
    if (campo === 'nome' && !cliente.nome.trim()) {
      erros.nome = 'Informe o nome do cliente.'
    }
    if (campo === 'telefone' && cliente.telefone) {
      const check = _telefoneValido(d)
      if (!check.ok) erros.telefone = check.msg
      // duplicata: bloqueia submit mas sem vermelho — o card âmbar já informa
    }
    if (campo === 'cpf'   && cliente.cpf   && d.length !== 11) erros.cpf   = 'CPF deve ter 11 dígitos.'
    if (campo === 'email' && cliente.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cliente.email)) erros.email = 'E-mail inválido.'
  }

  function validar() {
    ;['nome', 'telefone', 'cpf', 'email'].forEach(c => { tocados[c] = true; _validarCampo(c) })
    // Bloquear se houver duplicata não resolvida
    if (sugestaoTel.value && !clienteVinculado.value) return false
    return !Object.values(erros).some(Boolean)
  }

  function ignorarSugestaoTel() {
    sugestaoTel.value = null
    erros.telefone    = ''
  }

  function reset() { desvincular() }

  return {
    cliente, erros, clienteVinculado,
    buscandoTel, buscandoNome, sugestaoTel, sugestoesNome,
    telOriginal, avisoSubstituirTel, loadingSubstituir,
    aoDigitarTelefone, vincularCliente, desvincular, ignorarSugestaoTel,
    substituirTelefone, reverterTelefone,
    mascaraCpf, iniciais, inputClass, touch, validar, reset,
  }
}
