export const ESTADOS_OS = {
  ENTRADA:    { label: 'Entrada',    icon: 'mdi-inbox-arrow-down-outline', classes: 'bg-sky-50 text-sky-700 ring-sky-200' },
  ORCAMENTO:  { label: 'Orçamento',  icon: 'mdi-phone-outline',            classes: 'bg-amber-50 text-amber-700 ring-amber-200' },
  EM_ANDAMENTO: { label: 'Em andamento', icon: 'mdi-progress-wrench',       classes: 'bg-indigo-50 text-indigo-700 ring-indigo-200' },
  CONCLUIDO:  { label: 'Pronto',     icon: 'mdi-check-circle-outline',     classes: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  ENTREGUE:   { label: 'Entregue',   icon: 'mdi-package-variant-closed-check', classes: 'bg-slate-100 text-slate-700 ring-slate-300' },
  CANCELADO:  { label: 'Cancelado',  icon: 'mdi-close-circle-outline',     classes: 'bg-red-50 text-red-700 ring-red-200' },
}

// Estados que o usuário pode escolher na tela da O.S.
export const ESTADOS_SELECIONAVEIS = ['ENTRADA', 'ORCAMENTO', 'EM_ANDAMENTO', 'CONCLUIDO', 'ENTREGUE', 'CANCELADO']

// O.S. que já saíram do balcão (não aparecem em "Pendentes")
export const ESTADOS_FINAIS = ['ENTREGUE', 'CANCELADO']

// Pelo menos um item pronto, mas a O.S. ainda não foi concluída
export const ESTADO_PARCIAL = {
  label: 'Parcialmente pronta',
  icon: 'mdi-check-circle-outline',
  classes: 'bg-orange-50 text-orange-600 ring-orange-300',
}

export function ordemParcial(ordem) {
  return (
    !['CONCLUIDO', 'ENTREGUE', 'CANCELADO'].includes(ordem?.estado) && Number(ordem?.itens_concluidos) > 0
  )
}

// Estados de cada item da O.S. (ORCAMENTO = precisa ligar para o cliente)
export const ESTADOS_ITEM = {
  CADASTRADO:   { label: 'Entrada',      icon: 'mdi-inbox-arrow-down-outline',     iconClass: 'text-sky-600' },
  ORCAMENTO:    { label: 'Orçado',       icon: 'mdi-phone',                        iconClass: 'text-orange-500' },
  AUTORIZADO:   { label: 'Autorizado',   icon: 'mdi-phone-check',                  iconClass: 'text-emerald-600' },
  EM_ANDAMENTO: { label: 'Em andamento', icon: 'mdi-progress-wrench',              iconClass: 'text-indigo-600' },
  CONCLUIDO:    { label: 'Pronto',       icon: 'mdi-check',                        iconClass: 'text-emerald-600' },
  ENTREGUE:     { label: 'Entregue',     icon: 'mdi-package-variant-closed-check', iconClass: 'text-slate-500' },
  CANCELADO:    { label: 'Cancelado',    icon: 'mdi-close',                        iconClass: 'text-red-600' },
}

export const OPCOES_ESTADO_ITEM = Object.entries(ESTADOS_ITEM).map(([value, info]) => ({ value, ...info }))

export function estadoItemInfo(estado) {
  return ESTADOS_ITEM[estado] ?? { label: estado || '—', icon: 'mdi-help-circle-outline', iconClass: 'text-slate-500' }
}

/*
 * Ícone único que resume a situação da O.S. pelos estados dos itens.
 * Prioridade: orçado > autorizado > parcial > pronto. Entrada não mostra ícone.
 * Usa as contagens devolvidas pela listagem (itens_*); sem elas, cai no estado da O.S.
 */
export function iconeOrdem(ordem) {
  if (!ordem) return null
  const total = Number(ordem.itens_total)
  const ativos = Number(ordem.itens_ativos)

  if (!Number.isFinite(total) || total === 0) {
    if (ordem.estado === 'CANCELADO') return ICONES_ORDEM.cancelado
    if (ordem.estado === 'ENTREGUE') return ICONES_ORDEM.entregue
    return null
  }

  const orcados = Number(ordem.itens_orcamento) || 0
  const autorizados = Number(ordem.itens_autorizado) || 0
  const andamento = Number(ordem.itens_andamento) || 0
  const entregues = Number(ordem.itens_entregue) || 0
  const prontos = Number(ordem.itens_concluidos) || 0 // pronto + entregue

  if (ativos === 0) return ICONES_ORDEM.cancelado
  if (entregues === ativos) return ICONES_ORDEM.entregue
  if (orcados > 0) return ICONES_ORDEM.orcado
  if (autorizados > 0) return ICONES_ORDEM.autorizado
  if (prontos === ativos) return ICONES_ORDEM.pronto
  if (prontos > 0) return ICONES_ORDEM.parcial
  if (andamento > 0) return ICONES_ORDEM.andamento
  return null
}

const ICONES_ORDEM = {
  orcado:     { label: 'Orçado: ligar para o cliente',    icon: 'mdi-phone',                        cor: 'text-orange-500' },
  autorizado: { label: 'Orçamento autorizado',            icon: 'mdi-phone',                        cor: 'text-emerald-600' },
  parcial:    { label: 'Parcialmente pronta',             icon: 'mdi-check',                        cor: 'text-orange-500' },
  pronto:     { label: 'Pronta',                          icon: 'mdi-check',                        cor: 'text-emerald-600' },
  cancelado:  { label: 'Cancelada',                       icon: 'mdi-close',                        cor: 'text-red-600' },
  andamento:  { label: 'Em andamento',                    icon: 'mdi-progress-wrench',              cor: 'text-slate-400' },
  entregue:   { label: 'Entregue',                        icon: 'mdi-package-variant-closed-check', cor: 'text-slate-400' },
}

// Texto de busca/filtro equivalente ao ícone da lista
export function rotuloIconeOrdem(ordem) {
  return iconeOrdem(ordem)?.label ?? 'Entrada'
}

export function estadoInfo(estado) {
  return ESTADOS_OS[estado] ?? {
    label: estado || '—',
    icon: 'mdi-help-circle-outline',
    classes: 'bg-slate-100 text-slate-600 ring-slate-200',
  }
}

// Aceita 'YYYY-MM-DD' ou ISO ('YYYY-MM-DDTHH:mm...') e devolve 'YYYY-MM-DD'
export function dataISO(valor) {
  const m = String(valor ?? '').match(/^(\d{4}-\d{2}-\d{2})/)
  return m ? m[1] : ''
}

export function formatarDataBR(valor) {
  const iso = dataISO(valor)
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

// 'HH:MM:SS' -> 'HH:MM'
export function horaCurta(valor) {
  return valor ? String(valor).slice(0, 5) : ''
}
