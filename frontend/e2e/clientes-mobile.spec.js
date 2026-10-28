import { test, expect, chamar, sessao, PREFIXO } from './apoio.js'

test.use({ viewport: { width: 390, height: 800 } })

test('lista de clientes no celular: cada cliente ocupa uma linha e a tabela não rola de lado', async ({ page }) => {
  const { token } = await sessao('admin')
  const s = Date.now().toString().slice(-8)
  const nome = `${PREFIXO} Ricardo Cezari Fernandes Junior ${s}`
  expect((await chamar('POST', '/clientes', { token, corpo: { nome, telefone: `389${s}` } })).status).toBe(201)

  await page.goto('/listar-clientes')
  await page.getByPlaceholder(/Nome, CPF/).fill(nome)
  const linha = page.locator('tbody tr').first()
  await expect(linha).toContainText(PREFIXO)

  expect((await linha.boundingBox()).height).toBeLessThan(52)
  const rolaDeLado = await page.evaluate(() => {
    const tabela = document.querySelector('table')
    return tabela.scrollWidth > tabela.parentElement.clientWidth
  })
  expect(rolaDeLado).toBe(false)
})
