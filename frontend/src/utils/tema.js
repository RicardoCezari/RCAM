// Tema do sistema: a cor de destaque fica na variável --cor-tema; o style.css faz o "black" do Tailwind (fundos, bordas,
// anéis e transparências) segui-la, e o texto continua preto.
export const COR_PADRAO = '#000000'
export const CONTRASTE_MINIMO = 4.5 // WCAG AA: texto branco legível sobre a cor

// Tons escuros, todos com contraste adequado com texto branco
export const PALETA = [
  { nome: 'Preto', cor: COR_PADRAO },
  { nome: 'Grafite', cor: '#1f2937' },
  { nome: 'Azul-marinho', cor: '#1e3a8a' },
  { nome: 'Azul', cor: '#1d4ed8' },
  { nome: 'Petróleo', cor: '#0f766e' },
  { nome: 'Verde', cor: '#166534' },
  { nome: 'Marrom', cor: '#78350f' },
  { nome: 'Laranja', cor: '#c2410c' },
  { nome: 'Vinho', cor: '#9f1239' },
  { nome: 'Roxo', cor: '#6d28d9' },
]

const HEX = /^#[0-9a-f]{6}$/i
const CHAVE = 'tema_cor'

export const corValida = (cor) => HEX.test(cor || '')

function luminancia(hex) {
  const canal = (i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * canal(1) + 0.7152 * canal(3) + 0.0722 * canal(5)
}

export function contrasteComBranco(hex) {
  return 1.05 / (luminancia(hex) + 0.05)
}

export const corLegivel = (cor) => corValida(cor) && contrasteComBranco(cor) >= CONTRASTE_MINIMO

// Aplica a cor em todo o sistema (null/vazio volta ao padrão) e guarda para o próximo carregamento
export function aplicarTema(cor) {
  const usar = corLegivel(cor) && cor.toLowerCase() !== COR_PADRAO ? cor.toLowerCase() : null
  const raiz = document.documentElement
  if (usar) {
    raiz.style.setProperty('--cor-tema', usar)
    localStorage.setItem(CHAVE, usar)
  } else {
    raiz.style.removeProperty('--cor-tema')
    localStorage.removeItem(CHAVE)
  }
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', usar || COR_PADRAO)
}

// Antes de montar o app: evita o "piscar" da cor padrão enquanto a configuração não chega do servidor
export function aplicarTemaSalvo() {
  aplicarTema(localStorage.getItem(CHAVE))
}
