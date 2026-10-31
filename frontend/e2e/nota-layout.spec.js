import { test, expect, chamar, sessao } from './apoio.js'

let token
let layoutOriginal

test.beforeAll(async () => {
  token = (await sessao('admin')).token
  layoutOriginal = (await chamar('GET', '/configuracoes')).dados.nota_layout
})

test.afterAll(async () => {
  if (layoutOriginal) await chamar('PUT', '/configuracoes', { token, corpo: { nota_layout: layoutOriginal } })
})

async function abrirLayout(page) {
  await page.goto('/administracao')
  await page.getByRole('button', { name: 'Impressão' }).click()
  await expect(page.getByRole('heading', { name: 'Papel e espaçamento' })).toBeVisible()
}

test('admin personaliza e salva largura e disposição da nota', async ({ page }) => {
  await abrirLayout(page)

  await page.getByRole('spinbutton', { name: 'Largura do papel em milímetros' }).fill('58')
  await page.getByRole('checkbox', { name: 'Dados e contatos da empresa na via cliente' }).uncheck()
  const alcaTotal = page.getByRole('button', { name: 'Arrastar Total da O.S. na via cliente' })
  const linhaItens = page.locator('[data-via-row="cliente"][data-block-id="itens"]')
  await linhaItens.scrollIntoViewIfNeeded()
  const areaDestino = await linhaItens.boundingBox()
  await alcaTotal.hover()
  await page.mouse.down()
  await page.mouse.move(areaDestino.x + areaDestino.width / 2, areaDestino.y + areaDestino.height * 0.2, { steps: 8 })
  await page.mouse.up()

  const previa = page.frameLocator('iframe[title="Pré-visualização das vias da nota"]')
  await expect(previa.locator('.via')).toHaveCount(2)
  await expect(previa.locator('html style')).toContainText('@page{size:58mm auto')
  await expect(previa.locator('.via').first().locator('.contato')).toHaveCount(0)
  await page.getByRole('button', { name: 'Salvar layout' }).click()
  await expect(page.getByText('Layout da nota atualizado.')).toBeVisible()

  const salvo = (await chamar('GET', '/configuracoes')).dados.nota_layout
  expect(salvo.larguraMm).toBe(58)
  expect(salvo.cliente).not.toContain('dadosEmpresa')
  expect(salvo.cliente.indexOf('total')).toBeLessThan(salvo.cliente.indexOf('itens'))

  await page.reload()
  await page.getByRole('button', { name: 'Impressão' }).click()
  await expect(page.getByRole('checkbox', { name: 'Dados e contatos da empresa na via cliente' })).not.toBeChecked()
  await expect(page.getByRole('spinbutton', { name: 'Largura do papel em milímetros' })).toHaveValue('58')
})

test('admin pode restaurar o layout padrão', async ({ page }) => {
  await abrirLayout(page)
  await page.getByRole('button', { name: 'Restaurar padrão' }).click()
  await page.getByRole('button', { name: 'Salvar layout' }).click()
  await expect(page.getByText('Layout da nota atualizado.')).toBeVisible()

  const layout = (await chamar('GET', '/configuracoes')).dados.nota_layout
  expect(layout.larguraMm).toBe(80)
  expect(layout.espacamento).toBe('normal')
  expect(layout.cliente).toContain('dadosEmpresa')
})
