import { test, expect, chamar, sessao, API, PREFIXO } from './apoio.js'

const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
)

async function abrirUsuarios(page) {
  await page.goto('/administracao')
  await page.getByRole('button', { name: 'Usuários' }).click()
}

const linhaDo = (page, nome) => page.locator('tbody tr').filter({ hasText: nome })

test('foto de perfil é opcional: cria com foto, aparece na lista e pode ser removida', async ({ page }) => {
  const sufixo = Date.now().toString().slice(-8)
  const nome = `${PREFIXO} Foto ${sufixo}`
  const login = `${PREFIXO}foto${sufixo}`
  const { token } = await sessao('admin')
  const buscar = async () => (await chamar('GET', '/usuarios', { token })).dados.find((u) => u.login === login)

  await abrirUsuarios(page)
  await page.getByRole('button', { name: /Novo usuário/ }).click()
  const form = page.locator('form').filter({ has: page.getByTestId('campo-foto') })
  await form.locator('input[type=text]').nth(0).fill(nome)
  await form.locator('input[type=text]').nth(1).fill(login)
  await form.locator('input[autocomplete="new-password"]').fill('senha-e2e-123')
  await form.getByTestId('campo-foto').setInputFiles({ name: 'foto.png', mimeType: 'image/png', buffer: PNG_1X1 })
  await expect(form.getByTestId('foto-previa').locator('img')).toBeVisible()

  await page.getByRole('button', { name: 'Criar usuário' }).click()
  await expect(page.getByText('Usuário criado.')).toBeVisible()

  await page.getByPlaceholder('Buscar...').fill(nome)
  await expect(linhaDo(page, nome).locator('img')).toHaveCount(1)
  expect((await buscar()).foto_url).toMatch(/^\/uploads\/usuarios\//)

  await linhaDo(page, nome).getByRole('button').click()
  await page.getByRole('button', { name: 'Remover', exact: true }).click()
  await page.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(page.getByText('Usuário atualizado.')).toBeVisible()

  await expect(linhaDo(page, nome).locator('img')).toHaveCount(0)
  expect((await buscar()).foto_url).toBeNull()
})

test('no celular a foto do usuário aparece ao lado do menu', async ({ page }) => {
  const { token, usuario } = await sessao('admin')
  const autorizacao = { Authorization: `Bearer ${token}` }
  const form = new FormData()
  form.append('foto', new Blob([PNG_1X1], { type: 'image/png' }), 'foto.png')
  expect((await fetch(`${API}/usuarios/${usuario.id}/foto`, { method: 'PUT', headers: autorizacao, body: form })).status).toBe(200)

  try {
    await page.setViewportSize({ width: 390, height: 800 })
    await page.goto('/')
    await expect(page.getByTestId('avatar-mobile').locator('img')).toBeVisible()
  } finally {
    await fetch(`${API}/usuarios/${usuario.id}/foto`, { method: 'DELETE', headers: autorizacao })
  }
})
