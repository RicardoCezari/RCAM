export const ESTADOS_OS = {
  ENTRADA:    { label: 'Entrada',    icon: 'mdi-inbox-arrow-down-outline', classes: 'bg-sky-50 text-sky-700 ring-sky-200' },
  ORCAMENTO:  { label: 'Orçamento',  icon: 'mdi-phone-outline',            classes: 'bg-amber-50 text-amber-700 ring-amber-200' },
  AUTORIZADO: { label: 'Autorizado', icon: 'mdi-thumb-up-outline',         classes: 'bg-indigo-50 text-indigo-700 ring-indigo-200' },
  PENDENTE:   { label: 'Pendente',   icon: 'mdi-clock-outline',            classes: 'bg-orange-50 text-orange-700 ring-orange-200' },
  CONCLUIDO:  { label: 'Concluído',  icon: 'mdi-check-circle-outline',     classes: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  CANCELADO:  { label: 'Cancelado',  icon: 'mdi-close-circle-outline',     classes: 'bg-red-50 text-red-700 ring-red-200' },
}

// Estados que o usuário pode escolher na tela da O.S.
export const ESTADOS_SELECIONAVEIS = ['ENTRADA', 'ORCAMENTO', 'CONCLUIDO', 'CANCELADO']

// Pelo menos um item pronto, mas a O.S. ainda não foi concluída
export const ESTADO_PARCIAL = {
  label: 'Parcialmente concluída',
  icon: 'mdi-check-circle-outline',
  classes: 'bg-orange-50 text-orange-600 ring-orange-300',
}

export function ordemParcial(ordem) {
  return (
    !['CONCLUIDO', 'CANCELADO'].includes(ordem?.estado) && Number(ordem?.itens_concluidos) > 0
  )
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
