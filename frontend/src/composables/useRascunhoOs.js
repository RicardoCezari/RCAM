import { onBeforeUnmount, watch } from 'vue'
import { fotoComErro } from '@/utils/imagem'

// Rascunho da nova O.S. guardado no aparelho. No celular o navegador pode recarregar a página
// ao abrir a câmera (pouca memória); sem isso o cadastro inteiro seria perdido.
const CHAVE = 'workflow:rascunho-nova-os'
const VALIDADE_MS = 12 * 60 * 60 * 1000

function ler() {
  try {
    const bruto = localStorage.getItem(CHAVE)
    if (!bruto) return null
    const dados = JSON.parse(bruto)
    if (!dados?.salvoEm || Date.now() - dados.salvoEm > VALIDADE_MS) {
      localStorage.removeItem(CHAVE)
      return null
    }
    return dados
  } catch {
    return null
  }
}

export function limparRascunhoOs() {
  try { localStorage.removeItem(CHAVE) } catch { /* sem armazenamento */ }
}

/**
 * Restaura o rascunho (se houver) e passa a salvar toda alteração.
 * Retorna { restaurado, fotoPerdida }. `fotosPendentes` guarda os alvos ('geral' ou _id do objeto)
 * cuja foto estava sendo tirada; se a página recarregou nesse meio tempo, a foto aparece com erro.
 */
export function useRascunhoOs({ etapa, cliente, clienteVinculado, os, objetos, descontoStr, fotosGerais, fotosPendentes, clienteId = null, pausado = null }) {
  let rascunho = ler()
  // Veio de um cliente específico: só reaproveita o rascunho se for do mesmo cliente
  if (rascunho && clienteId && Number(rascunho.clienteVinculado?.id) !== Number(clienteId)) {
    limparRascunhoOs()
    rascunho = null
  }
  let restaurado = false
  let fotoPerdida = false

  if (rascunho && (rascunho.etapa === 'cliente' || rascunho.etapa === 'os')) {
    Object.assign(cliente, rascunho.cliente || {})
    clienteVinculado.value = rascunho.clienteVinculado || null
    Object.assign(os, rascunho.os || {})
    if (Array.isArray(rascunho.objetos) && rascunho.objetos.length) {
      objetos.value = rascunho.objetos.map((o) => ({ ...o, fotos: [] }))
    }
    descontoStr.value = rascunho.descontoStr || ''
    etapa.value = rascunho.etapa
    restaurado = true

    for (const alvo of Array.isArray(rascunho.pendentes) ? rascunho.pendentes : []) {
      const lista = alvo === 'geral' ? fotosGerais.value : objetos.value.find((o) => o._id === alvo)?.fotos
      if (lista) {
        lista.push(fotoComErro())
        fotoPerdida = true
      }
    }
    fotosPendentes.value = []
  }

  function salvar() {
    // `pausado`: editando uma O.S. já criada, que não deve virar rascunho de nova O.S.
    if (pausado?.value) return
    if (etapa.value !== 'cliente' && etapa.value !== 'os') return
    try {
      localStorage.setItem(CHAVE, JSON.stringify({
        salvoEm: Date.now(),
        etapa: etapa.value,
        cliente: { ...cliente },
        clienteVinculado: clienteVinculado.value,
        os: { ...os },
        objetos: objetos.value.map(({ fotos, ...resto }) => resto),
        descontoStr: descontoStr.value,
        pendentes: [...fotosPendentes.value],
      }))
    } catch { /* sem armazenamento ou cheio */ }
  }

  watch(
    [etapa, () => ({ ...cliente }), clienteVinculado, () => ({ ...os }), objetos, descontoStr, fotosPendentes],
    salvar,
    { deep: true },
  )

  // Sair da tela pelo próprio sistema (menu, Cancelar, voltar) é uma saída intencional: descarta o
  // rascunho. Já quando o navegador mata/recarrega a página (câmera no celular) isto não executa e o
  // rascunho sobrevive para ser restaurado.
  onBeforeUnmount(limparRascunhoOs)

  return { restaurado, fotoPerdida }
}
