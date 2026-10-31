import { ref, computed } from 'vue'
import { adicionarFotosNaLista, liberarFotos } from '@/utils/imagem'

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
export function mascaraMonetaria(raw) {
  const digits = String(raw || '').replace(/\D/g, '').replace(/^0+/, '') || '0'
  const padded  = digits.padStart(3, '0')
  const intPart = padded.slice(0, -2)
  const decPart = padded.slice(-2)
  return `${parseInt(intPart, 10).toLocaleString('pt-BR')},${decPart}`
}

// Converte número decimal para string de centavos, depois aplica a máscara
export function numeroParaMascara(num) {
  const cents = Math.round(Math.abs(Number(num) || 0) * 100)
  return cents > 0 ? mascaraMonetaria(String(cents)) : ''
}
// crypto.randomUUID só existe em contexto seguro (https/localhost); no celular via IP da rede não
let contadorId = 0
function gerarId() {
  contadorId += 1
  return `${Date.now().toString(36)}-${contadorId}-${Math.random().toString(36).slice(2, 8)}`
}

// Preço do serviço para um tipo de objeto (se não houver preço próprio, vale o valor padrão)
export function valorDoServico(servico, tipoId) {
  const doTipo = servico?.tipos?.find((t) => String(t.tipo_objeto_id) === String(tipoId))?.valor
  return doTipo ?? servico?.valor
}

function novoServico(servico = null) {
  return {
    _id:        gerarId(),
    servico_id: servico ? String(servico.id) : '',
    nome:       servico?.nome ?? '',
    quantidade: 1,
    valor:      servico ? String(servico.valor ?? 0) : '',
    _valorStr:  servico ? numeroParaMascara(servico.valor ?? 0) : '',
  }
}

function novoObjeto() {
  return {
    _id:            gerarId(),
    tipo_objeto_id: '',
    eh_orcamento:   false,
    observacoes:    '',
    mostrarObs:     false,
    fotos:          [],
    servicos:       [novoServico()],
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

  function toggleObservacao(objetoId) {
    const obj = objetos.value.find(o => o._id === objetoId)
    if (obj) obj.mostrarObs = !obj.mostrarObs
  }

  function removerObjeto(objetoId) {
    if (objetos.value.length === 1) return   // sempre manter ao menos um
    const removido = objetos.value.find(o => o._id === objetoId)
    if (removido) liberarFotos(removido.fotos)
    objetos.value = objetos.value.filter(o => o._id !== objetoId)
    delete erros.value[objetoId]
  }

  // Retorna quantas fotos foram recebidas (inclusive as que falharam)
  function adicionarFotosObjeto(objetoId, event) {
    const arquivos = Array.from(event.target.files ?? [])
    event.target.value = ''
    const obj = objetos.value.find(o => o._id === objetoId)
    if (!obj) return Promise.resolve(0)
    return adicionarFotosNaLista(obj.fotos, arquivos)
  }

  function removerFotoObjeto(objetoId, idx) {
    const obj = objetos.value.find(o => o._id === objetoId)
    if (obj) liberarFotos(obj.fotos.splice(idx, 1))
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
    if (valorDoServico(svcDados, obj.tipo_objeto_id)) {
      const valorSvc = valorDoServico(svcDados, obj.tipo_objeto_id)
      sv.valor     = String(valorSvc)
      sv._valorStr = numeroParaMascara(valorSvc)
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

  // ── orçamento por objeto ────────────────────────────────────────────────────
  function toggleOrcamento(objetoId, value) {
    const obj = objetos.value.find(o => o._id === objetoId)
    if (!obj) return
    obj.eh_orcamento = value
    if (value) {
      // Ao marcar como orçamento, limpa os valores — preço será definido depois
      for (const sv of obj.servicos) {
        sv.valor     = ''
        sv._valorStr = ''
      }
    } else {
      // Ao desmarcar, restaura o valor original do cadastro do serviço (se selecionado)
      for (const sv of obj.servicos) {
        if (!sv.servico_id) continue
        const svcDados = servicosDisp.value?.find(s => String(s.id) === String(sv.servico_id))
        const valorSvc = valorDoServico(svcDados, obj.tipo_objeto_id)
        if (valorSvc) {
          sv.valor     = String(valorSvc)
          sv._valorStr = numeroParaMascara(valorSvc)
        }
      }
    }
  }

  // ── serializar para envio ─────────────────────────────────────────────────
  function toItens() {
    return objetos.value.flatMap((obj, objIdx) =>
      obj.servicos.map((sv, svIdx) => ({
        tipo_objeto_id: Number(obj.tipo_objeto_id),
        servico_id:     Number(sv.servico_id),
        quantidade:     sv.quantidade,
        valor_unitario: parseMoeda(sv._valorStr) || null,
        eh_orcamento:   obj.eh_orcamento,
        objeto_indice:  obj.objeto_indice ?? (objIdx + 1),
        observacoes:    svIdx === 0 ? (obj.observacoes?.trim() || null) : null,
      }))
    )
  }

  function reset() {
    objetos.value.forEach(o => liberarFotos(o.fotos))
    objetos.value    = [novoObjeto()]
    erros.value      = {}
    descontoStr.value = ''
  }

  // Carrega os itens já gravados de uma O.S. (cada serviço guarda o _itemId do servidor).
  // Um objeto = itens consecutivos do mesmo tipo; fotos presas a um item iniciam um novo objeto (mesma regra da tela da O.S.)
  function carregarDeOrdem(itens = [], fotos = []) {
    objetos.value.forEach(o => liberarFotos(o.fotos))
    const grupos = []
    for (const item of itens) {
      const tipoId = String(item.tipo_objeto_id)
      const temFotos = fotos.some(f => f.item_id === item.id)
      let grupo = grupos[grupos.length - 1]
      const novoGrupo = !grupo
        ? true
        : item.objeto_indice != null
          ? grupo.objeto_indice !== item.objeto_indice
          : (grupo.tipo_objeto_id !== tipoId || temFotos)
      if (novoGrupo) {
        grupo = {
          _id:            gerarId(),
          objeto_indice:  item.objeto_indice ?? (grupos.length + 1),
          tipo_objeto_id: tipoId,
          eh_orcamento:   !!item.eh_orcamento,
          observacoes:    item.observacoes || '',
          mostrarObs:     Boolean(item.observacoes?.trim()),
          fotos:          [],
          servicos:       [],
        }
        grupos.push(grupo)
      } else if (!grupo.observacoes && item.observacoes) {
        grupo.observacoes = item.observacoes
        grupo.mostrarObs = true
      }
      const valor = Number(item.valor_unitario) || 0
      grupo.servicos.push({
        _id:        gerarId(),
        _itemId:    item.id,
        servico_id: String(item.servico_id),
        nome:       item.servico_nome ?? '',
        quantidade: item.quantidade,
        valor:      valor ? String(valor) : '',
        _valorStr:  numeroParaMascara(valor),
      })
    }
    objetos.value = grupos.length ? grupos : [novoObjeto()]
    erros.value   = {}
  }

  return {
    objetos, erros, totalGeral, totalObjeto,
    descontoStr, totalFinal,
    nomeTipoObjeto, mudarTipoObjeto, toggleOrcamento,
    adicionarObjeto, removerObjeto, toggleObservacao, adicionarFotosObjeto, removerFotoObjeto,
    adicionarServico, removerServico, mudarQuantidade,
    aoSelecionarServico, aoEditarValor, aoBlurValor,
    aoEditarDesconto, aoBlurDesconto,
    validar, toItens, reset, carregarDeOrdem,
  }
}
