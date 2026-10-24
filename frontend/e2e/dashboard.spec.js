import { test, expect, semear } from './apoio.js'

test.beforeAll(async () => { await semear() })

const respostaDashboard = (page, extra = () => true) =>
  page.waitForResponse((r) => r.url().includes('/api/dashboard') && r.status() === 200 && extra(r.url()))

const cartao = (page, titulo) => page.locator('div.rounded-2xl', { has: page.getByText(titulo, { exact: true }) }).first()

async function abrir(page) {
  const primeira = respostaDashboard(page)
  await page.goto('/administracao')
  const dados = await (await primeira).json()
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  await page.getByRole('button', { name: 'Mostrar indicadores' }).click()
  return dados
}

test('os cartões de indicadores começam fechados e a seta abre e fecha; o resto fica aberto', async ({ page }) => {
  await page.goto('/administracao')
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  await expect(page.getByText('Total de O.S.', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Hoje' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'O.S. por período' })).toBeVisible()

  await page.getByRole('button', { name: 'Mostrar indicadores' }).click()
  await expect(page.getByText('Total de O.S.', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Ocultar indicadores' }).click()
  await expect(page.getByText('Total de O.S.', { exact: true })).toHaveCount(0)
})

test('exibe indicadores e gráficos com os mesmos números da API', async ({ page }) => {
  const { resumo } = await abrir(page)

  await expect(cartao(page, 'Total de O.S.')).toContainText(resumo.total.toLocaleString('pt-BR'))
  await expect(cartao(page, 'Concluídas')).toContainText(resumo.concluidas.toLocaleString('pt-BR'))
  await expect(cartao(page, 'Pendentes')).toContainText(resumo.pendentes.toLocaleString('pt-BR'))
  await expect(cartao(page, 'Faturamento')).toContainText('R$')
  await expect(cartao(page, 'Ticket médio')).toBeVisible()

  for (const titulo of ['O.S. por período', 'Distribuição por status', 'Serviços mais realizados', 'Produtividade dos funcionários', 'Serviços mais rentáveis']) {
    await expect(page.getByRole('heading', { name: titulo })).toBeVisible()
  }
})

test('trocar período e filtros refaz a consulta com os parâmetros escolhidos', async ({ page }) => {
  await abrir(page)

  const hoje = new Date()
  const iso = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`
  const doDia = respostaDashboard(page, (u) => u.includes(`inicio=${iso}`) && u.includes(`fim=${iso}`))
  await page.getByRole('button', { name: 'Hoje' }).click()
  const { serie } = await (await doDia).json()
  expect(serie).toHaveLength(1)

  const comServico = respostaDashboard(page, (u) => u.includes('servicoId='))
  // Segundo seletor da tela: "Tipo de serviço" (o primeiro é "Funcionário")
  await page.locator('select').nth(1).selectOption({ index: 1 })
  await comServico

  await page.getByRole('button', { name: 'Personalizado' }).click()
  await expect(page.getByText('De', { exact: true })).toBeVisible()
  await expect(page.getByText('Até', { exact: true })).toBeVisible()
})
