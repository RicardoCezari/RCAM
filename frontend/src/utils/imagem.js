// Reduz fotos de câmera (vários MB) antes do envio: lado máximo e JPEG comprimido.
// Câmeras de 50–108 MP ocupam centenas de MB ao decodificar inteiras; por isso a imagem já é
// decodificada reduzida (createImageBitmap) para não estourar a memória e recarregar a página.
async function decodificarReduzida(arquivo, maxLado) {
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(arquivo, {
        resizeWidth: maxLado,
        resizeQuality: 'medium',
        imageOrientation: 'from-image',
      })
      return { fonte: bmp, largura: bmp.width, altura: bmp.height, liberar: () => bmp.close?.() }
    } catch { /* usa o caminho tradicional */ }
  }
  const url = URL.createObjectURL(arquivo)
  const img = new Image()
  await new Promise((resolve, reject) => {
    img.onload = resolve
    img.onerror = reject
    img.src = url
  }).catch(() => { URL.revokeObjectURL(url); throw new Error('imagem inválida') })
  return {
    fonte: img,
    largura: img.naturalWidth,
    altura: img.naturalHeight,
    liberar: () => URL.revokeObjectURL(url),
  }
}

export async function comprimirImagem(arquivo, { maxLado = 1600, qualidade = 0.8 } = {}) {
  let dec
  try {
    dec = await decodificarReduzida(arquivo, maxLado)
  } catch {
    return arquivo
  }

  const escala = Math.min(1, maxLado / Math.max(dec.largura, dec.altura))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(dec.largura * escala)
  canvas.height = Math.round(dec.altura * escala)
  canvas.getContext('2d').drawImage(dec.fonte, 0, 0, canvas.width, canvas.height)
  dec.liberar()

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', qualidade))
  canvas.width = canvas.height = 0
  if (!blob || blob.size >= arquivo.size) return arquivo
  const nome = arquivo.name.replace(/\.[^.]+$/, '') || 'foto'
  return new File([blob], `${nome}.jpg`, { type: 'image/jpeg' })
}

const TAMANHO_MAXIMO = 10 * 1024 * 1024 // mesmo limite do servidor
let sequenciaFoto = 0
const novaChave = () => `foto-${Date.now().toString(36)}-${++sequenciaFoto}`

// Foto que não chegou a ser carregada (ex.: a página recarregou ao abrir a câmera)
export function fotoComErro() {
  return { _k: novaChave(), status: 'erro', file: null, url: '', name: '' }
}

// Cada foto entra na lista na hora como 'carregando' e vira 'ok' ou 'erro' ao terminar.
// `lista` deve ser um array reativo. Retorna quantos arquivos de imagem foram recebidos.
export async function adicionarFotosNaLista(lista, arquivos) {
  const imagens = Array.from(arquivos ?? []).filter((f) => !f.type || f.type.startsWith('image/'))

  const itens = imagens.map((f) => lista[lista.push({
    _k: novaChave(), status: 'carregando', file: null, url: '', name: f.name,
  }) - 1])

  // uma por vez, para poupar memória
  for (let i = 0; i < imagens.length; i++) {
    const item = itens[i]
    try {
      const file = await comprimirImagem(imagens[i])
      if (file.size > TAMANHO_MAXIMO) throw new Error('arquivo grande demais')
      item.file = file
      item.url = URL.createObjectURL(file)
      item.name = file.name
      item.status = 'ok'
    } catch {
      item.status = 'erro'
    }
  }
  return imagens.length
}

export function liberarFotos(fotos) {
  fotos.forEach((f) => { if (f.url) URL.revokeObjectURL(f.url) })
}
