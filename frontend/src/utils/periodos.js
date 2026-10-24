const dois = (n) => String(n).padStart(2, '0')

// Date local -> AAAA-MM-DD (sem passar por UTC, que deslocaria o dia à noite)
export function paraIso(data) {
  return `${data.getFullYear()}-${dois(data.getMonth() + 1)}-${dois(data.getDate())}`
}

export const PERIODOS = [
  { value: 'hoje', label: 'Hoje', icon: 'mdi-calendar-today' },
  { value: '7d', label: '7 dias', icon: 'mdi-calendar-week' },
  { value: '30d', label: '30 dias', icon: 'mdi-calendar-month-outline' },
  { value: 'mes', label: 'Mês atual', icon: 'mdi-calendar-range' },
  { value: 'custom', label: 'Personalizado', icon: 'mdi-calendar-edit' },
]

// Intervalo fechado [inicio, fim] de cada atalho; "últimos N dias" inclui hoje
export function intervaloDoPeriodo(periodo, agora = new Date()) {
  const fim = paraIso(agora)
  const voltar = (dias) => {
    const d = new Date(agora)
    d.setDate(d.getDate() - dias)
    return paraIso(d)
  }

  switch (periodo) {
    case 'hoje': return { inicio: fim, fim }
    case '7d': return { inicio: voltar(6), fim }
    case '30d': return { inicio: voltar(29), fim }
    case 'mes': return { inicio: paraIso(new Date(agora.getFullYear(), agora.getMonth(), 1)), fim }
    default: return null
  }
}

export function formatarDataBr(iso) {
  const [a, m, d] = iso.split('-')
  return `${d}/${m}/${a}`
}
