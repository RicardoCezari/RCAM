export const BLOCOS_NOTA = [
  { id: 'logo', label: 'Logo ou nome da empresa' },
  { id: 'dadosEmpresa', label: 'Dados e contatos da empresa' },
  { id: 'cliente', label: 'Nome do cliente' },
  { id: 'telefone', label: 'Telefone do cliente' },
  { id: 'numeroOs', label: 'Número da O.S.' },
  { id: 'itens', label: 'Itens e serviços' },
  { id: 'total', label: 'Total da O.S.' },
  { id: 'observacoes', label: 'Observações' },
  { id: 'mensagem', label: 'Mensagem final da empresa' },
  { id: 'assinatura', label: 'Assinatura de recebimento' },
  { id: 'rodape', label: 'Data de emissão e aviso fiscal' },
]

export const PADRAO_LAYOUT_NOTA = {
  larguraMm: 80,
  espacamento: 'normal',
  cliente: ['logo', 'dadosEmpresa', 'cliente', 'telefone', 'numeroOs', 'itens', 'total', 'rodape', 'mensagem'],
  loja: ['cliente', 'telefone', 'numeroOs', 'itens', 'total', 'observacoes', 'assinatura', 'rodape'],
}

const BLOCOS_CLIENTE = new Set(PADRAO_LAYOUT_NOTA.cliente)
const BLOCOS_LOJA = new Set([...PADRAO_LAYOUT_NOTA.loja, 'logo', 'dadosEmpresa', 'mensagem'])

export function normalizarLayoutNota(layout) {
  const idsValidos = new Set(BLOCOS_NOTA.map((bloco) => bloco.id))
  const ordenar = (via, padrao, permitidos) => {
    if (!Array.isArray(via)) return [...padrao]
    return [...new Set(via.filter((id) => idsValidos.has(id) && permitidos.has(id)))]
  }

  return {
    larguraMm: Number.isInteger(layout?.larguraMm) && layout.larguraMm >= 48 && layout.larguraMm <= 100
      ? layout.larguraMm
      : PADRAO_LAYOUT_NOTA.larguraMm,
    espacamento: ['compacto', 'normal', 'amplo'].includes(layout?.espacamento)
      ? layout.espacamento
      : PADRAO_LAYOUT_NOTA.espacamento,
    cliente: ordenar(layout?.cliente, PADRAO_LAYOUT_NOTA.cliente, BLOCOS_CLIENTE),
    loja: ordenar(layout?.loja, PADRAO_LAYOUT_NOTA.loja, BLOCOS_LOJA),
  }
}

export function copiarLayoutNota(layout = PADRAO_LAYOUT_NOTA) {
  const normalizado = normalizarLayoutNota(layout)
  return {
    ...normalizado,
    cliente: [...normalizado.cliente],
    loja: [...normalizado.loja],
  }
}
