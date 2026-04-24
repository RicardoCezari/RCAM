import { ref, computed } from 'vue'

// ── helpers de formatação ──────────────────────────────────────────────────
export function formatarMoeda(num) {
  if (!num && num !== 0) return ''
  return Number(num).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function parseMoeda(str) {
  if (!str && str !== 0) return 0
  // Formato brasileiro: pontos são separadores de milhar, vírgula é decimal
  const s = String(str)
    .replace(/[R$\s]/g, '')   // remove símbolo e espaços
    .replace(/\./g,  '')      // remove separadores de milhar
    .replace(',',    '.')     // vírgula decimal → ponto
    .replace(/[^\d.]/g, '')   // remove resto
  const num = Number(s)
  return isNaN(num) ? 0 : num
}

// Máscara estilo calculadora: trata dígitos como centavos → "X.XXX,XX"
function mascaraMonetaria(raw) {
  const digits = String(raw || '').replace(/\D/g, '').replace(/^0+/, '') || '0'
  const padded  = digits.padStart(3, '0')
  const intPart = padded.slice(0, -2)
  const decPart = padded.slice(-2)
  return `${parseInt(intPart, 10).toLocaleString('pt-BR')},${decPart}`
}

// Converte número decimal para string de centavos, depois aplica a máscara
function numeroParaMascara(num) {
  const cents = Math.round(Math.abs(Number(num) || 0) * 100)
  return cents > 0 ? mascaraMonetaria(String(cents)) : ''
}
function novoServico(servico = null) {
  return {
    _id:        crypto.randomUUID(),
    servico_id: servico ? String(servico.id) : '',
    nome:       servico?.nome ?? '',
    quantidade: 1,
    valor:      servico ? String(servico.valor ?? 0) : '',
    _valorStr:  servico ? numeroParaMascara(servico.valor ?? 0) : '',
  }
}

function novoObjeto() {
  return {
    _id:           crypto.randomUUID(),
    tipo_objeto_id: '',
    servicos:      [novoServico()],
  }
}

export function useItens(tiposObjeto, servicosDisp) {
  const objetos = ref([novoObjeto()])
  const erros   = ref({})   // { [objetoId]: { tipo: '', servicos: { [svcId]: string } } }

  // ── totais ────────────────────────────────────────────────────────────────
  const totalGeral = computed(() =>
    objetos.value.reduce((sum, obj) =>
      sum + obj.servicos.reduce((s, sv) => s + parseMoeda(sv._valorStr) * sv.quantidade, 0), 0)
  )

  const descontoStr = ref('')

  const totalFinal = computed(() => {
    const d = parseMoeda(descontoStr.value)
    return Math.max(0, totalGeral.value - d)
  })

  function aoEditarDesconto(e) {
    const masked = mascaraMonetaria(e.target.value)
    descontoStr.value = masked === '0,00' ? '' : masked
  }

  function aoBlurDesconto() {
    // já formatado pelo @input, nada a fazer
  }

  function totalObjeto(obj) {
    return obj.servicos.reduce((s, sv) => s + parseMoeda(sv._valorStr) * sv.quantidade, 0)
  }

  // ── objetos ───────────────────────────────────────────────────────────────
  function adicionarObjeto() {
    objetos.value.push(novoObjeto())
  }

  function removerObjeto(objetoId) {
    if (objetos.value.length === 1) return   // sempre manter ao menos um
    objetos.value = objetos.value.filter(o => o._id !== objetoId)
    delete erros.value[objetoId]
  }

  function nomeTipoObjeto(tipoId) {
    return tiposObjeto.value?.find(t => String(t.id) === String(tipoId))?.nome || ''
  }

  function mudarTipoObjeto(objetoId, tipoId) {
    const obj = objetos.value.find(o => o._id === objetoId)
    if (!obj) return
    obj.tipo_objeto_id = tipoId
    // Reseta os serviços sempre que o tipo muda para evitar seleções inválidas
    obj.servicos = [novoServico()]
    if (erros.value[objetoId]) erros.value[objetoId].tipo = ''
  }

  // ── serviços ──────────────────────────────────────────────────────────────
  function adicionarServico(objetoId) {
    const obj = objetos.value.find(o => o._id === objetoId)
    if (obj) obj.servicos.push(novoServico())
  }

  function removerServico(objetoId, svcId) {
    const obj = objetos.value.find(o => o._id === objetoId)
    if (!obj || obj.servicos.length === 1) return
    obj.servicos = obj.servicos.filter(s => s._id !== svcId)
  }

  function mudarQuantidade(objetoId, svcId, delta) {
    const obj = objetos.value.find(o => o._id === objetoId)
    if (!obj) return
    const sv = obj.servicos.find(s => s._id === svcId)
    if (!sv) return
    sv.quantidade = Math.max(1, Math.min(99, sv.quantidade + delta))
  }

  function aoSelecionarServico(objetoId, svcId, servicoId) {
    const obj = objetos.value.find(o => o._id === objetoId)
    if (!obj) return
    const sv = obj.servicos.find(s => s._id === svcId)
    if (!sv) return
    const svcDados = servicosDisp.value?.find(s => String(s.id) === String(servicoId))
    sv.servico_id = String(servicoId)
    sv.nome       = svcDados?.nome ?? ''
    if (svcDados?.valor) {
      sv.valor     = String(svcDados.valor)
      sv._valorStr = numeroParaMascara(svcDados.valor)
    }
    _limparErroServico(objetoId, svcId)
  }

  function aoEditarValor(objetoId, svcId, e) {
    const obj = objetos.value.find(o => o._id === objetoId)
    if (!obj) return
    const sv = obj.servicos.find(s => s._id === svcId)
    if (!sv) return
    const masked = mascaraMonetaria(e.target.value)
    sv._valorStr = masked === '0,00' ? '' : masked
    sv.valor     = String(parseMoeda(masked) || '')
  }

  function aoBlurValor(objetoId, svcId) {
    // Nada a fazer: o campo já está formatado pelo @input
    // Apenas garante que valor némrico está sincronizado
    const obj = objetos.value.find(o => o._id === objetoId)
    if (!obj) return
    const sv = obj.servicos.find(s => s._id === svcId)
    if (!sv) return
    sv.valor = String(parseMoeda(sv._valorStr) || '')
  }

  // ── validação ─────────────────────────────────────────────────────────────
  function _limparErroServico(objetoId, svcId) {
    if (erros.value[objetoId]?.servicos?.[svcId]) {
      delete erros.value[objetoId].servicos[svcId]
    }
  }

  function validar() {
    erros.value = {}
    let ok = true

    for (const obj of objetos.value) {
      const e = { tipo: '', servicos: {} }

      if (!obj.tipo_objeto_id) {
        e.tipo = 'Selecione o tipo de objeto.'
        ok = false
      }

      for (const sv of obj.servicos) {
        if (!sv.servico_id) {
          e.servicos[sv._id] = 'Selecione um serviço.'
          ok = false
        }
      }

      if (e.tipo || Object.keys(e.servicos).length) {
        erros.value[obj._id] = e
      }
    }

    return ok
  }

  // ── serializar para envio ─────────────────────────────────────────────────
  function toItens(ehOrcamento = false) {
    return objetos.value.flatMap(obj =>
      obj.servicos.map(sv => ({
        tipo_objeto_id: Number(obj.tipo_objeto_id),
        servico_id:     Number(sv.servico_id),
        quantidade:     sv.quantidade,
        valor_unitario: parseMoeda(sv._valorStr) || null,
        eh_orcamento:   ehOrcamento,
      }))
    )
  }

  function reset() {
    objetos.value    = [novoObjeto()]
    erros.value      = {}
    descontoStr.value = ''
  }

  return {
    objetos, erros, totalGeral, totalObjeto,
    descontoStr, totalFinal,
    nomeTipoObjeto, mudarTipoObjeto,
    adicionarObjeto, removerObjeto,
    adicionarServico, removerServico, mudarQuantidade,
    aoSelecionarServico, aoEditarValor, aoBlurValor,
    aoEditarDesconto, aoBlurDesconto,
    validar, toItens, reset,
  }
}
