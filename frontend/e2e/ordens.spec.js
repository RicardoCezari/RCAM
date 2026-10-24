import { test, expect, semear, PREFIXO } from './apoio.js'

const CLIENTE = `${PREFIXO} Lista 01` // dono das 30 O.S. semeadas (entregas de 2031-01-01 a 2031-01-30, valores 35 a 64)

test.beforeAll(async () => { await semear() })

const linhas = (page) => page.locator('tbody tr')
const resumo = (page) => page.getByText(/\d+–\d+ de \d+|^0 registros$/)
const busca = (page) => page.getByPlaceholder('Nº, cliente, telefone, objeto...')
const respostaOrdens = (page, extra = () => true) =>
  page.waitForResponse((r) => r.url().includes('/api/ordens?') && r.status() === 200 && extra(r.url()))

async function abrir(page) {
  const primeira = respostaOrdens(page)
  await page.goto('/listar-os')
  await expect(page.getByRole('heading', { name: 'Lista de O.S.' })).toBeVisible()
  await primeira
}

async function pesquisar(page, texto) {
  const resposta = respostaOrdens(page, (u) => u.includes('q='))
  await busca(page).fill(texto)
  await resposta
}

async function todas(page) {
  await page.getByRole('button', { name: 'Todas' }).click()
  await expect(page.getByRole('button', { name: 'Todas' })).toHaveAttribute('aria-pressed', 'true')
}

test.describe('O.S.: lista no servidor', () => {
  test('carrega pendentes, pagina e mantém o total', async ({ page }) => {
    await abrir(page)
    await pesquisar(page, CLIENTE)
    await expect(resumo(page)).toHaveText('1–10 de 30')
    await expect(linhas(page)).toHaveCount(10)

    await page.getByRole('button', { name: '3', exact: true }).click()
    await expect(resumo(page)).toHaveText('21–30 de 30')
    await expect(linhas(page)).toHaveCount(10)
    await expect(page.getByRole('button', { name: 'Próxima página' })).toBeDisabled()

    await page.locator('span', { hasText: 'Mostrar' }).locator('select').selectOption('50')
    await expect(resumo(page)).toHaveText('1–30 de 30')
    await expect(linhas(page)).toHaveCount(30)
  })

  test('busca global: cliente, e-mail do cliente, observações da O.S. e datas', async ({ page }) => {
    await abrir(page)
    await pesquisar(page, 'zze2e.lista01@exemplo.com')
    await expect(resumo(page)).toHaveText('1–10 de 30')

    await pesquisar(page, 'ZZE2E lote')
    await expect(resumo(page)).toHaveText(/1–10 de \d+/)

    await pesquisar(page, '05/01/2031') // data de entrega da 5ª O.S. semeada
    await expect(linhas(page)).toHaveCount(1)
    await expect(linhas(page).first()).toContainText('05/01/2031')

    await pesquisar(page, 'zzzz-nao-existe')
    await expect(page.getByText('Nenhuma ordem de serviço encontrada.')).toBeVisible()
    await expect(resumo(page)).toHaveText('0 registros')
  })

  test('busca por texto com número não traz telefones aleatórios', async ({ page }) => {
    await abrir(page)
    await pesquisar(page, `${PREFIXO} Lista 01`)
    await expect(resumo(page)).toHaveText('1–10 de 30')
  })

  test('filtros por intervalo: valor, entrega e abertura', async ({ page }) => {
    await abrir(page)
    await pesquisar(page, CLIENTE)

    // Valor 40..45 => 6 O.S.
    await page.getByLabel('Filtrar Valor a partir de').fill('40')
    await page.getByLabel('Filtrar Valor até').fill('45')
    await expect(resumo(page)).toHaveText('1–6 de 6')
    await page.getByLabel('Filtrar Valor a partir de').fill('')
    await page.getByLabel('Filtrar Valor até').fill('')
    await expect(resumo(page)).toHaveText('1–10 de 30')

    // Entrega 2031-01-05..2031-01-07 => 3 O.S.
    await page.getByLabel('Filtrar Entrega a partir de').fill('2031-01-05')
    await page.getByLabel('Filtrar Entrega até').fill('2031-01-07')
    await expect(resumo(page)).toHaveText('1–3 de 3')
    await page.getByLabel('Filtrar Entrega a partir de').fill('')
    await page.getByLabel('Filtrar Entrega até').fill('')

    // Abertura anterior a 2000 => nenhuma; a partir de 2000 => todas
    await page.getByLabel('Filtrar Aberta em até').fill('1999-12-31')
    await expect(page.getByText('Nenhuma ordem de serviço encontrada.')).toBeVisible()
    await page.getByLabel('Filtrar Aberta em até').fill('')
    await page.getByLabel('Filtrar Aberta em a partir de').fill('2000-01-01')
    await expect(resumo(page)).toHaveText('1–10 de 30')
  })

  test('filtros por coluna de texto e abas', async ({ page }) => {
    await abrir(page)
    await page.getByLabel('Filtrar Cliente').fill(CLIENTE)
    await expect(resumo(page)).toHaveText('1–10 de 30')
    await page.getByLabel('Filtrar Telefone').fill('(91) 99900-0001')
    await expect(resumo(page)).toHaveText('1–10 de 30')
    await page.getByLabel('Filtrar Telefone').fill('0000000')
    await expect(page.getByText('Nenhuma ordem de serviço encontrada.')).toBeVisible()
    await page.getByLabel('Filtrar Telefone').fill('')

    await page.getByRole('button', { name: 'Entregues' }).click()
    await expect(page.getByText('Nenhuma ordem de serviço encontrada.')).toBeVisible()
    await todas(page)
    await expect(resumo(page)).toHaveText('1–10 de 30')
  })

  test('ordenação por valor e por entrega', async ({ page }) => {
    await abrir(page)
    await pesquisar(page, CLIENTE)

    await page.getByRole('button', { name: /^Valor/ }).click()
    await expect(linhas(page).first()).toContainText('35,00')
    await page.getByRole('button', { name: /^Valor/ }).click()
    await expect(linhas(page).first()).toContainText('64,00')

    await page.getByRole('button', { name: /^Entrega/ }).click()
    await expect(linhas(page).first()).toContainText('01/01/2031')
  })

  test('data ou valor inválidos na API retornam 400 (não 500)', async ({ page }) => {
    await abrir(page)
    const r = await page.evaluate(async () => {
      const token = localStorage.getItem('token')
      const h = { Authorization: `Bearer ${token}` }
      const base = 'http://127.0.0.1:3100/api/ordens'
      const a = await fetch(`${base}?dataInicio=abc`, { headers: h })
      const b = await fetch(`${base}?valorMin=-5`, { headers: h })
      const c = await fetch(`${base}?criacaoFim=2031-02-31`, { headers: h })
      return [a.status, b.status, c.status]
    })
    expect(r).toEqual([400, 400, 400])
  })

  test('erro da API aparece na tela e a lista se recupera', async ({ page }) => {
    await abrir(page)
    await pesquisar(page, CLIENTE)

    await page.route('**/api/ordens?*', (route) => route.fulfill({ status: 500, json: { message: 'Falha simulada' } }))
    await busca(page).fill(`${CLIENTE} `)
    await busca(page).fill('ZZE2E lote')
    await expect(page.getByText('Falha simulada')).toBeVisible()

    await page.unroute('**/api/ordens?*')
    await busca(page).fill(CLIENTE)
    await expect(resumo(page)).toHaveText('1–10 de 30')
    await expect(page.getByText('Falha simulada')).toHaveCount(0)
  })

  test('troca rápida de abas, filtros e páginas mantém o último estado pedido', async ({ page }) => {
    await abrir(page)
    await pesquisar(page, CLIENTE)
    const primeiraDaPagina1 = (await linhas(page).first().textContent()).trim()

    // A primeira resposta (aba Todas, página 1) chega depois da última pedida
    await page.route('**/api/ordens?*', async (route) => {
      const url = route.request().url()
      if (!url.includes('situacao=') && url.includes('page=1')) await new Promise((r) => setTimeout(r, 2500))
      await route.continue().catch(() => {})
    })
    await page.getByRole('button', { name: 'Todas' }).click()
    await page.getByRole('button', { name: 'Pendentes' }).click()
    await page.getByRole('button', { name: '2', exact: true }).click()
    await page.getByRole('button', { name: '3', exact: true }).click()
    await expect(resumo(page)).toHaveText('21–30 de 30')
    await expect(linhas(page).first()).not.toHaveText(primeiraDaPagina1)
    const primeiraDaPagina3 = (await linhas(page).first().textContent()).trim()
    await page.waitForTimeout(3000)
    await expect(resumo(page)).toHaveText('21–30 de 30')
    await expect(linhas(page).first()).toHaveText(primeiraDaPagina3) // a resposta antiga não voltou a página 1
    await expect(page.getByRole('button', { name: 'Pendentes' })).toHaveAttribute('aria-pressed', 'true')
  })

  test('abrir a O.S. pela linha leva ao detalhe', async ({ page }) => {
    await abrir(page)
    await pesquisar(page, `${CLIENTE}`)
    await linhas(page).first().click()
    await expect(page).toHaveURL(/\/listar-os\/\d+$/)
    await expect(page.getByText(CLIENTE).first()).toBeVisible()
  })
})
