import { test, expect, chamar, sessao } from './apoio.js'

let token
let redeOriginal

test.beforeAll(async () => {
  token = (await sessao('admin')).token
  redeOriginal = (await chamar('GET', '/configuracoes/impressora', { token })).dados
})

test.afterAll(async () => {
  if (redeOriginal) await chamar('PUT', '/configuracoes/impressora', { token, corpo: redeOriginal })
})

test('admin configura conexão Ethernet ou Wi-Fi e recupera a preferência salva', async ({ page }) => {
  await page.context().addInitScript(() => {
    window.__printCalled = false
    window.print = () => { window.__printCalled = true }
  })
  await page.goto('/administracao')
  await page.getByRole('button', { name: 'Impressão' }).click()

  const cabo = page.getByRole('button', { name: /Cabo de rede/ })
  const wifi = page.getByRole('button', { name: 'Wi-Fi' })
  const ip = page.getByRole('textbox', { name: 'Endereço IPv4 local da impressora' })
  const salvar = page.getByRole('button', { name: 'Salvar conexão' })

  await expect(cabo).toHaveAttribute('aria-pressed', 'true')
  await expect(wifi).toHaveAttribute('aria-pressed', 'false')
  await wifi.click()
  await ip.fill('999.168.1.2')
  await expect(salvar).toBeDisabled()

  await ip.fill('192.168.1.24')
  await salvar.click()
  await expect(page.getByText('Configuração da impressora atualizada.')).toBeVisible()

  await page.reload()
  await page.getByRole('button', { name: 'Impressão' }).click()
  await expect(wifi).toHaveAttribute('aria-pressed', 'true')
  await expect(ip).toHaveValue('192.168.1.24')

  const popupPromise = page.waitForEvent('popup')
  await page.getByRole('button', { name: 'Imprimir teste' }).click()
  const popup = await popupPromise
  await expect(popup.locator('.via')).toHaveCount(1)
  await expect(popup.locator('.caixa b')).toHaveText('TESTE')
  await expect(popup.locator('body')).toContainText('Teste de impressão')
  await expect.poll(() => popup.evaluate(() => window.__printCalled)).toBe(true)
  await popup.close()
})
