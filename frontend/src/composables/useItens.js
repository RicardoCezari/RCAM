import { ref, computed } from 'vue'

// ── helpers de formatação ──────────────────────────────────────────────────
export function formatarMoeda(num) {
  if (!num && num !== 0) return ''
  return Number(num).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function parseMoeda(str) {
  if (!str && str !== 0) return 0
  // normaliza separador decimal: ponto ou vírgula
  const s = String(str)
    .replace(/[^\d.,]/g, '')   // remove tudo exceto dígito, ponto e vírgula
    .replace(',', '.')          // vírgula → ponto
    .replace(/(\..*)\./g, '$1') // mantém apenas o último ponto (ex: '1.234.56' → '1234.56' não, mas isso é raro)
  // se houver separador de milhar (1.234) sem decimal extra:
  // heurística: se há ponto e os dígitos após são exatamente 3, é milhar
  const num = Number(s)
  return isNaN(num) ? 0 : num
}

function novoServico(servico = null) {
  return {
    _id:        crypto.randomUUID(),
    servico_id: servico ? String(servico.id) : '',
    nome:       servico?.nome ?? '',
    quantidade: 1,
    valor:      servico ? String(servico.valor ?? 0) : '',
    _valorStr:  servico ? formatarMoeda(servico.valor) : '',
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
      sv.valor    = String(svcDados.valor)
      sv._valorStr = formatarMoeda(svcDados.valor)
    }
    _limparErroServico(objetoId, svcId)
  }

  function aoEditarValor(objetoId, svcId, e) {
    const obj = objetos.value.find(o => o._id === objetoId)
    if (!obj) return
    const sv = obj.servicos.find(s => s._id === svcId)
    if (!sv) return
    // aceita dígitos, vírgula e ponto (usuário pode usar qualquer um como decimal)
    // normaliza ponto para vírgula na exibição
    const raw = e.target.value
      .replace(/[^\d.,]/g, '')   // remove caracteres inválidos
      .replace('.', ',')          // normaliza para vírgula
      .replace(/(,.*),/g, '$1')   // permite apenas uma vírgula
    sv._valorStr = raw
    sv.valor     = raw
  }

  function aoBlurValor(objetoId, svcId) {
    const obj = objetos.value.find(o => o._id === objetoId)
    if (!obj) return
    const sv = obj.servicos.find(s => s._id === svcId)
    if (!sv) return
    // formata ao perder foco
    const n = parseMoeda(sv._valorStr)
    sv._valorStr = n > 0 ? formatarMoeda(n) : ''
    sv.valor     = String(n || '')
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
    objetos.value = [novoObjeto()]
    erros.value   = {}
  }

  return {
    objetos, erros, totalGeral, totalObjeto,
    nomeTipoObjeto,
    adicionarObjeto, removerObjeto,
    adicionarServico, removerServico, mudarQuantidade,
    aoSelecionarServico, aoEditarValor, aoBlurValor,
    validar, toItens, reset,
  }
}
