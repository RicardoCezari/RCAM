// Fotos do rascunho da nova O.S. ficam no IndexedDB (o localStorage não comporta arquivos).
// Falhas de armazenamento (modo privado, cheio) só tiram a proteção: nunca podem quebrar o cadastro.
const BANCO = 'workflow-rascunho'
const LOJA = 'fotos'

function abrir() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB indisponível'))
      return
    }
    const pedido = indexedDB.open(BANCO, 1)
    pedido.onupgradeneeded = () => pedido.result.createObjectStore(LOJA, { keyPath: 'chave' })
    pedido.onsuccess = () => resolve(pedido.result)
    pedido.onerror = () => reject(pedido.error)
  })
}

async function transacao(modo, operacao) {
  const banco = await abrir()
  try {
    return await new Promise((resolve, reject) => {
      const tx = banco.transaction(LOJA, modo)
      const pedido = operacao(tx.objectStore(LOJA))
      tx.oncomplete = () => resolve(pedido?.result)
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  } finally {
    banco.close()
  }
}

async function tolerante(tarefa, padrao) {
  try {
    return await tarefa()
  } catch {
    return padrao
  }
}

// registro = { chave, alvo, arquivo, nome, ordem }
export const gravarFotoRascunho = (registro) => tolerante(() => transacao('readwrite', (loja) => loja.put(registro)))
export const apagarFotoRascunho = (chave) => tolerante(() => transacao('readwrite', (loja) => loja.delete(chave)))
export const limparFotosRascunho = () => tolerante(() => transacao('readwrite', (loja) => loja.clear()))
export const lerFotosRascunho = () => tolerante(() => transacao('readonly', (loja) => loja.getAll()), [])
