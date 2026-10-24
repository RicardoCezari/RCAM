import { test, expect, chamar, sessao } from './apoio.js'

let token

test.beforeAll(async () => { token = (await sessao('admin')).token })

// A cor do tema é global: sempre volta ao padrão para não afetar os outros testes
const restaurar = () => chamar('PUT', '/configuracoes', { token, corpo: { tema_cor: '' } })
test.beforeAll(restaurar)
test.afterAll(restaurar)

const corDaRaiz = (page) => page.evaluate(() => document.documentElement.style.getPropertyValue('--cor-tema'))

async function abrirAparencia(page) {
  await page.goto('/administracao')
  await page.getByRole('button', { name: 'Aparência' }).click()
  await expect(page.getByRole('heading', { name: 'Pré-visualização' })).toBeVisible()
}

test('escolher uma cor mostra a prévia, só aplica ao salvar e persiste', async ({ page }) => {
  await abrirAparencia(page)
  const previa = page.getByTestId('previa-tema')

  await page.getByRole('radio', { name: 'Azul-marinho' }).click()
  await expect(page.getByRole('radio', { name: 'Azul-marinho' })).toBeChecked()
  expect(await previa.evaluate((el) => el.style.getPropertyValue('--cor-tema'))).toBe('#1e3a8a')
  // a tela de verdade ainda não mudou
  expect(await corDaRaiz(page)).toBe('')

  await page.getByRole('button', { name: 'Salvar cor' }).click()
  await expect(page.getByText('Cor do sistema atualizada.')).toBeVisible()
  expect(await corDaRaiz(page)).toBe('#1e3a8a')

  // botões e fundos seguem a cor escolhida, mas os textos continuam pretos
  await expect(page.getByRole('button', { name: 'Aparência' })).toHaveCSS('background-color', 'rgb(30, 58, 138)')
  await expect(page.getByRole('heading', { name: 'Cor do sistema' })).toHaveCSS('color', 'rgb(0, 0, 0)')
  await expect(page.getByRole('heading', { name: 'Administração' })).toHaveCSS('color', 'rgb(0, 0, 0)')
  await page.reload()
  await expect.poll(() => corDaRaiz(page)).toBe('#1e3a8a')
  expect((await chamar('GET', '/configuracoes')).dados.tema_cor).toBe('#1e3a8a')

  // voltar ao padrão
  await page.getByRole('button', { name: 'Aparência' }).click()
  await page.getByRole('button', { name: 'Voltar ao padrão' }).click()
  await page.getByRole('button', { name: 'Salvar cor' }).click()
  await expect.poll(() => corDaRaiz(page)).toBe('')
})

test('cor clara demais é avisada e não pode ser salva', async ({ page }) => {
  await abrirAparencia(page)

  await page.getByLabel('Código da cor (#rrggbb)').fill('#ffff00')
  await expect(page.getByTestId('contraste-tema')).toContainText('Cor muito clara')
  await expect(page.getByRole('button', { name: 'Salvar cor' })).toBeDisabled()

  await page.getByLabel('Código da cor (#rrggbb)').fill('#0f766e')
  await expect(page.getByTestId('contraste-tema')).toContainText('legível')
  await expect(page.getByRole('button', { name: 'Salvar cor' })).toBeEnabled()
})
