import { onBeforeUnmount, watch } from 'vue'
import { fotoComErro } from '@/utils/imagem'
import {
  gravarFotoRascunho, apagarFotoRascunho, limparFotosRascunho, lerFotosRascunho,
} from '@/utils/fotosRascunho'

// Rascunho da nova O.S. guardado no aparelho. No celular o navegador pode recarregar a página
// ao abrir a câmera (pouca memória); sem isso o cadastro inteiro seria perdido.
const CHAVE = 'workflow:rascunho-nova-os'
const VALIDADE_MS = 12 * 60 * 60 * 1000
// Originais pesados (quando o navegador não conseguiu reduzir) não valem o espaço do aparelho
const BYTES_MAXIMOS_RASCUNHO = 6 * 1024 * 1024

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
  limparFotosRascunho()
}

/**
 * Restaura o rascunho (se houver) e passa a salvar toda alteração.
 * Retorna { restaurado, fotoPerdida, fotosRestauradas }. `fotosRestauradas` é uma promessa com o número de fotos
 * recuperadas do IndexedDB. `fotosPendentes` guarda os alvos ('geral' ou _id do objeto)
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

  // ── fotos já tiradas (IndexedDB) ──────────────────────────────────────
  const persistidas = new Set()

  const fotosProntas = () => [
    ...fotosGerais.value.map((foto) => ({ alvo: 'geral', foto })),
    ...objetos.value.flatMap((o) => o.fotos.map((foto) => ({ alvo: o._id, foto }))),
  ].filter(({ foto }) => foto.status === 'ok' && foto.file && foto.file.size <= BYTES_MAXIMOS_RASCUNHO)

  function sincronizarFotos() {
    if (pausado?.value || (etapa.value !== 'cliente' && etapa.value !== 'os')) return
    const atuais = new Map(fotosProntas().map((item) => [item.foto._k, item]))

    for (const chave of persistidas) {
      if (atuais.has(chave)) continue
      persistidas.delete(chave)
      apagarFotoRascunho(chave)
    }
    for (const [chave, { alvo, foto }] of atuais) {
      if (persistidas.has(chave)) continue
      persistidas.add(chave)
      gravarFotoRascunho({ chave, alvo, arquivo: foto.file, nome: foto.name, ordem: Date.now() })
    }
  }

  watch(() => fotosProntas().map(({ alvo, foto }) => `${alvo}:${foto._k}`).join('|'), sincronizarFotos)

  async function restaurarFotos() {
    const registros = (await lerFotosRascunho()).sort((a, b) => a.ordem - b.ordem)
    const porLista = new Map()
    for (const r of registros) {
      const lista = r.alvo === 'geral' ? fotosGerais.value : objetos.value.find((o) => o._id === r.alvo)?.fotos
      if (!lista) {
        apagarFotoRascunho(r.chave)
        continue
      }
      const file = new File([r.arquivo], r.nome || 'foto.jpg', { type: r.arquivo.type || 'image/jpeg' })
      persistidas.add(r.chave)
      porLista.set(lista, [...(porLista.get(lista) ?? []), {
        _k: r.chave, status: 'ok', file, url: URL.createObjectURL(file), name: file.name, erro: '',
      }])
    }
    // antes de qualquer marcador de foto perdida, para manter a ordem em que foram tiradas
    for (const [lista, fotos] of porLista) lista.unshift(...fotos)
    return registros.length
  }

  const fotosRestauradas = restaurado ? restaurarFotos() : Promise.resolve(0)

  // Sair da tela pelo próprio sistema (menu, Cancelar, voltar) é uma saída intencional: descarta o
  // rascunho. Já quando o navegador mata/recarrega a página (câmera no celular) isto não executa e o
  // rascunho sobrevive para ser restaurado.
  onBeforeUnmount(limparRascunhoOs)

  return { restaurado, fotoPerdida, fotosRestauradas }
}
