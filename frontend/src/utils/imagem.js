// Reduz fotos de câmera (vários MB) antes do envio: no máximo 1600 px no lado maior, em JPEG.
// Se o navegador não conseguir reduzir (memória), `prepararFoto` envia o original e o servidor faz a redução;
// só quando isso também não é possível lança ErroImagem com o motivo para o usuário.
export const LADO_MAXIMO = 1600
const QUALIDADES = [0.8, 0.7, 0.6]
const ALVO_BYTES = 1.5 * 1024 * 1024
const TAMANHO_MAXIMO = 10 * 1024 * 1024
// mesmo limite do servidor para fotos (que ele mesmo reduz)
export const TAMANHO_ORIGINAL_MAXIMO = 30 * 1024 * 1024
const TIPOS_ACEITOS = ['image/jpeg', 'image/png', 'image/webp']

const MENSAGENS = {
  formato: 'Formato de imagem não suportado (ex.: HEIC). Configure a câmera para JPEG ("mais compatível") ou escolha outra foto.',
  ilegivel: 'Não foi possível abrir esta foto (arquivo corrompido ou incompleto). Tire novamente.',
  processamento: 'O celular não conseguiu processar a foto (resolução muito alta). Reduza a resolução da câmera e tire novamente.',
  tamanho: 'A foto continua grande demais mesmo depois de reduzida. Tire novamente com resolução menor.',
  grande: 'A foto tem mais de 30 MB e não pôde ser reduzida neste celular. Reduza a resolução da câmera e tire novamente.',
  recarregou: 'O celular recarregou a página ao abrir a câmera (comum com câmera em resolução alta) e a foto se perdeu. Tire novamente ou reduza a resolução da câmera.',
}

export class ErroImagem extends Error {
  constructor(codigo) {
    super(MENSAGENS[codigo])
    this.name = 'ErroImagem'
    this.codigo = codigo
  }
}

// Lê só o cabeçalho da imagem (dimensões já consideram a orientação do EXIF), sem decodificá-la inteira
function abrirImagem(arquivo) {
  const url = URL.createObjectURL(arquivo)
  const img = new Image()
  return new Promise((resolve, reject) => {
    img.onload = () => {
      if (!img.naturalWidth || !img.naturalHeight) {
        URL.revokeObjectURL(url)
        reject(new ErroImagem('processamento'))
        return
      }
      resolve({ img, largura: img.naturalWidth, altura: img.naturalHeight, liberar: () => URL.revokeObjectURL(url) })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new ErroImagem(TIPOS_ACEITOS.includes(arquivo.type) ? 'ilegivel' : 'formato'))
    }
    img.src = url
  })
}

// Câmeras de 50–108 MP ocupam centenas de MB ao decodificar inteiras; por isso a imagem é decodificada
// já reduzida (createImageBitmap). Retorna null se o navegador não suportar ou se a proporção sair errada
// (alguns navegadores aplicam a orientação do EXIF depois de redimensionar).
async function bitmapReduzido(arquivo, alvo, proporcao) {
  if (typeof createImageBitmap !== 'function') return null
  try {
    const bmp = await createImageBitmap(arquivo, {
      resizeWidth: alvo.largura,
      resizeHeight: alvo.altura,
      resizeQuality: 'medium',
      imageOrientation: 'from-image',
    })
    if (Math.abs(bmp.width / bmp.height - proporcao) / proporcao > 0.02) {
      bmp.close?.()
      return null
    }
    return bmp
  } catch {
    return null
  }
}

async function paraJpeg(fonte, largura, altura) {
  const canvas = document.createElement('canvas')
  canvas.width = largura
  canvas.height = altura
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new ErroImagem('processamento')
  ctx.fillStyle = '#fff' // PNG com transparência não pode virar fundo preto
  ctx.fillRect(0, 0, largura, altura)
  try {
    ctx.drawImage(fonte, 0, 0, largura, altura)
    let blob = null
    for (const qualidade of QUALIDADES) {
      blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', qualidade))
      if (!blob) throw new ErroImagem('processamento')
      if (blob.size <= ALVO_BYTES) break
    }
    return blob
  } catch (err) {
    throw err instanceof ErroImagem ? err : new ErroImagem('processamento')
  } finally {
    canvas.width = canvas.height = 0
  }
}

async function processar(arquivo, maxLado) {
  const aberta = await abrirImagem(arquivo)
  try {
    const { largura, altura } = aberta
    const escala = Math.min(1, maxLado / Math.max(largura, altura))
    const formatoAceito = TIPOS_ACEITOS.includes(arquivo.type)
    // Já está pequena e no formato certo: não há o que reduzir
    if (escala === 1 && formatoAceito && arquivo.size <= ALVO_BYTES) return arquivo

    const alvo = { largura: Math.max(1, Math.round(largura * escala)), altura: Math.max(1, Math.round(altura * escala)) }
    const bitmap = await bitmapReduzido(arquivo, alvo, largura / altura)
    let blob
    try {
      blob = await paraJpeg(bitmap ?? aberta.img, alvo.largura, alvo.altura)
    } finally {
      bitmap?.close?.()
    }

    if (blob.size > TAMANHO_MAXIMO) throw new ErroImagem('tamanho')
    if (escala === 1 && formatoAceito && arquivo.size <= blob.size) return arquivo
    const nome = arquivo.name.replace(/\.[^.]+$/, '') || 'foto'
    return new File([blob], `${nome}.jpg`, { type: 'image/jpeg' })
  } finally {
    aberta.liberar()
  }
}

// Uma foto por vez, mesmo quando várias são pedidas juntas: decodificar várias de uma vez estoura a memória do celular
let fila = Promise.resolve()
export function comprimirImagem(arquivo, { maxLado = LADO_MAXIMO } = {}) {
  const tarefa = fila.then(() => processar(arquivo, maxLado))
  fila = tarefa.catch(() => {})
  return tarefa
}

// Mensagem para o usuário, seja qual for o erro lançado por comprimirImagem
export function mensagemDoErro(err) {
  return err instanceof ErroImagem ? err.message : MENSAGENS.processamento
}

// Foto pronta para enviar. Se o navegador não conseguiu reduzi-la mas ela é uma imagem válida,
// segue o original: o servidor sempre reduz antes de guardar.
export async function prepararFoto(arquivo, opcoes) {
  try {
    return await comprimirImagem(arquivo, opcoes)
  } catch (err) {
    const falhouAoReduzir = err instanceof ErroImagem && (err.codigo === 'processamento' || err.codigo === 'tamanho')
    if (!falhouAoReduzir || !TIPOS_ACEITOS.includes(arquivo.type)) throw err
    if (arquivo.size > TAMANHO_ORIGINAL_MAXIMO) throw new ErroImagem('grande')
    return arquivo
  }
}

let sequenciaFoto = 0
const novaChave = () => `foto-${Date.now().toString(36)}-${++sequenciaFoto}`

// Foto que não chegou a ser carregada (ex.: a página recarregou ao abrir a câmera)
export function fotoComErro(codigo = 'recarregou') {
  return { _k: novaChave(), status: 'erro', file: null, url: '', name: '', erro: MENSAGENS[codigo] }
}

// Motivo da primeira foto com problema da lista (para o aviso vermelho)
export function motivoDaFalha(fotos) {
  return fotos.find((f) => f.status === 'erro')?.erro || MENSAGENS.processamento
}

// Cada foto entra na lista na hora como 'carregando' e vira 'ok' ou 'erro' ao terminar.
// `lista` deve ser um array reativo. Retorna quantos arquivos de imagem foram recebidos.
export async function adicionarFotosNaLista(lista, arquivos) {
  const imagens = Array.from(arquivos ?? []).filter((f) => !f.type || f.type.startsWith('image/'))

  const itens = imagens.map((f) => lista[lista.push({
    _k: novaChave(), status: 'carregando', file: null, url: '', name: f.name, erro: '',
  }) - 1])

  for (let i = 0; i < imagens.length; i++) {
    const item = itens[i]
    try {
      const file = await prepararFoto(imagens[i])
      item.file = file
      item.url = URL.createObjectURL(file)
      item.name = file.name
      item.status = 'ok'
    } catch (err) {
      // a foto continua visível para o usuário saber qual deu erro
      item.url = URL.createObjectURL(imagens[i])
      item.erro = mensagemDoErro(err)
      item.status = 'erro'
    }
  }
  return imagens.length
}

export function liberarFotos(fotos) {
  fotos.forEach((f) => { if (f.url) URL.revokeObjectURL(f.url) })
}
