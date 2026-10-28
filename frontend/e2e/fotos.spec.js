import { test, expect, semear, preencherAssistente, PREFIXO } from './apoio.js'

test.beforeAll(semear)

const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
)

const sufixo = () => `${Date.now()}${Math.floor(Math.random() * 90 + 10)}`.slice(-9)
const celular = (ddd, s) => `${ddd}9${s.slice(-8)}`
const botaoCriar = (page) => page.locator('form button[type=submit]')
const galeria = (page) => page.getByTestId('galeria-geral')
const motivo = (page) => page.getByTestId('motivo-foto')

// Foto de câmera simulada: 4000x3000 px, bem maior do que o limite de 1600 px
async function fotoDeCamera(page) {
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 4000
    canvas.height = 3000
    const ctx = canvas.getContext('2d')
    for (let i = 0; i < 60000; i++) {
      ctx.fillStyle = `rgb(${Math.random() * 255 | 0},${Math.random() * 255 | 0},${Math.random() * 255 | 0})`
      ctx.fillRect(Math.random() * 4000, Math.random() * 3000, 6 + Math.random() * 30, 6 + Math.random() * 30)
    }
    return canvas.toDataURL('image/jpeg', 0.95).split(',')[1]
  })
  return Buffer.from(base64, 'base64')
}

const fotosNoIndexedDb = (page) => page.evaluate(() => new Promise((resolve) => {
  const pedido = indexedDB.open('workflow-rascunho', 1)
  pedido.onupgradeneeded = () => pedido.result.createObjectStore('fotos', { keyPath: 'chave' })
  pedido.onsuccess = () => {
    const contagem = pedido.result.transaction('fotos').objectStore('fotos').count()
    contagem.onsuccess = () => { pedido.result.close(); resolve(contagem.result) }
  }
}))

test.describe('Fotos da nova O.S.', () => {
  test('foto de câmera grande é reduzida antes do envio', async ({ page }) => {
    const s = sufixo()
    await preencherAssistente(page, { nome: `${PREFIXO} Foto grande ${s}`, telefone: celular('98', s) })

    const original = await fotoDeCamera(page)
    await galeria(page).setInputFiles({ name: 'camera.jpg', mimeType: 'image/jpeg', buffer: original })
    await expect(page.locator('img[alt="camera.jpg"]')).toBeVisible()

    const envio = page.waitForRequest((r) => /\/ordens\/\d+\/fotos$/.test(r.url()) && r.method() === 'POST')
    await botaoCriar(page).click()
    const enviado = Number((await (await envio).allHeaders())['content-length'])

    expect(original.length).toBeGreaterThan(1.5 * 1024 * 1024)
    expect(enviado).toBeLessThan(1.6 * 1024 * 1024)
    await expect(page.getByText('O.S. criada com sucesso')).toBeVisible()
  })

  test('foto que não pode ser processada mostra o motivo', async ({ page }) => {
    const s = sufixo()
    await preencherAssistente(page, { nome: `${PREFIXO} Foto ruim ${s}`, telefone: celular('97', s) })

    await galeria(page).setInputFiles({ name: 'quebrada.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('isto não é uma imagem') })
    await expect(motivo(page)).toContainText('Não foi possível abrir esta foto')
    // a foto com erro continua na tela, marcada em vermelho, para o usuário saber qual foi
    await expect(page.locator('img[alt="quebrada.jpg"]')).toHaveCount(1)
    await expect(page.getByText('Não carregou')).toBeVisible()
  })

  test('ao recarregar a página, as fotos já tiradas voltam e a perdida é explicada', async ({ page }) => {
    const s = sufixo()
    await preencherAssistente(page, { nome: `${PREFIXO} Foto recarrega ${s}`, telefone: celular('96', s) })

    await galeria(page).setInputFiles({ name: 'foto-teste.png', mimeType: 'image/png', buffer: PNG_1X1 })
    await expect(page.locator('img[alt="foto-teste.png"]')).toBeVisible()
    await expect.poll(() => fotosNoIndexedDb(page)).toBe(1)

    // abre a câmera e o navegador recarrega a página antes de a foto voltar
    // o clique (sem abrir o seletor de arquivos) marca a foto como pendente, como ao abrir a câmera
    await page.locator('input[capture="environment"]').last().dispatchEvent('click')
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('workflow:rascunho-nova-os') || '{}').pendentes?.length)).toBe(1)
    await page.reload()

    await expect(page.getByText('Recuperamos o cadastro')).toBeVisible()
    await expect(page.locator('img[alt="foto-teste.png"]')).toBeVisible()
    await expect(motivo(page)).toContainText('recarregou a página ao abrir a câmera')
  })
})
