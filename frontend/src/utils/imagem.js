// Reduz fotos de câmera (vários MB) antes do envio: lado máximo e JPEG comprimido
export function comprimirImagem(arquivo, { maxLado = 1600, qualidade = 0.8 } = {}) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(arquivo)
    const img = new Image()

    img.onload = () => {
      const escala = Math.min(1, maxLado / Math.max(img.naturalWidth, img.naturalHeight))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.naturalWidth * escala)
      canvas.height = Math.round(img.naturalHeight * escala)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)

      canvas.toBlob((blob) => {
        if (!blob || blob.size >= arquivo.size) return resolve(arquivo)
        const nome = arquivo.name.replace(/\.[^.]+$/, '') || 'foto'
        resolve(new File([blob], `${nome}.jpg`, { type: 'image/jpeg' }))
      }, 'image/jpeg', qualidade)
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(arquivo)
    }

    img.src = url
  })
}

// Recebe um FileList/array e devolve [{ file, url, name }] prontos para pré-visualização e envio
export async function prepararFotos(arquivos) {
  const imagens = Array.from(arquivos ?? []).filter((f) => f.type.startsWith('image/'))
  const comprimidas = await Promise.all(imagens.map((f) => comprimirImagem(f)))
  return comprimidas.map((file) => ({ file, url: URL.createObjectURL(file), name: file.name }))
}

export function liberarFotos(fotos) {
  fotos.forEach((f) => URL.revokeObjectURL(f.url))
}
