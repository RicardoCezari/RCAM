import { test as semSessao, expect as esperar } from '@playwright/test'
import { test, expect, chamar, sessao } from './apoio.js'

const PIN = '4827'
let token
let editor
let admin
let aparelhos = []

async function autorizarViaApi(nome) {
  const r = await chamar('POST', '/dispositivos', { token, corpo: { nome } })
  expect(r.status).toBe(201)
  aparelhos.push(r.dados.id)
  return r.dados
}

async function limparPin() {
  await chamar('DELETE', `/usuarios/${editor.id}/pin`, { token })
  await chamar('DELETE', `/usuarios/${admin.id}/pin`, { token })
  for (const id of aparelhos) await chamar('DELETE', `/dispositivos/${id}`, { token })
  aparelhos = []
}

test.beforeAll(async () => {
  token = (await sessao('admin')).token
  const lista = await chamar('GET', '/usuarios', { token })
  editor = lista.dados.find((u) => u.login === 'zz_e2e_editor')
  admin = lista.dados.find((u) => u.login === 'zz_e2e_admin')
  await limparPin()
})

test.afterAll(limparPin)

semSessao('perfis e PIN: toca no nome, digita o PIN e entra', async ({ page }) => {
  const aparelho = await autorizarViaApi('ZZE2E celular')
  expect((await chamar('PUT', `/usuarios/${editor.id}/pin`, { token, corpo: { pin: PIN } })).status).toBe(200)

  await page.addInitScript((t) => localStorage.setItem('dispositivo', t), aparelho.token)
  await page.goto('/login')

  await esperar(page.getByRole('heading', { name: 'Quem está entrando?' })).toBeVisible()
  await page.getByTestId('perfis').getByRole('button', { name: new RegExp(editor.nome) }).click()
  await esperar(page.getByTestId('tela-pin')).toBeVisible()

  // PIN errado: mensagem e pontos zerados
  for (const d of '0000') await page.getByRole('button', { name: d, exact: true }).click()
  await esperar(page.getByRole('alert')).toContainText('PIN incorreto')

  for (const d of PIN) await page.getByRole('button', { name: d, exact: true }).click()
  await page.waitForURL((u) => !u.pathname.startsWith('/login'))
  const usuario = await page.evaluate(() => JSON.parse(localStorage.getItem('usuario')))
  esperar(usuario.login).toBe('zz_e2e_editor')
})

semSessao('aparelho não autorizado vê só o login com senha', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('dispositivo', 'x'.repeat(43)))
  await page.goto('/login')
  await esperar(page.getByLabel('Login')).toBeVisible()
  await esperar(page.getByText('Quem está entrando?')).toHaveCount(0)
  expect(await page.evaluate(() => localStorage.getItem('dispositivo'))).toBeNull()
})

test('administrador autoriza e revoga este aparelho na aba Aparelhos', async ({ page }) => {
  await page.goto('/administracao')
  await page.getByRole('button', { name: 'Aparelhos' }).click()
  await page.getByTestId('nome-aparelho').fill('ZZE2E tablet')
  await page.getByRole('button', { name: 'Autorizar este aparelho' }).click()

  await expect(page.getByText('Este aparelho está autorizado.')).toBeVisible()
  const lista = await chamar('GET', '/dispositivos', { token })
  const criado = lista.dados.find((d) => d.nome === 'ZZE2E tablet')
  expect(criado).toBeTruthy()
  aparelhos.push(criado.id)
  expect(await page.evaluate(() => localStorage.getItem('dispositivo'))).toBeTruthy()

  await page.getByRole('listitem').filter({ hasText: 'ZZE2E tablet' }).getByRole('button', { name: 'Revogar' }).click()
  await expect(page.getByText('Este aparelho está autorizado.')).toHaveCount(0)
  expect(await page.evaluate(() => localStorage.getItem('dispositivo'))).toBeNull()
})

test('Administração pede o PIN do administrador a cada entrada', async ({ page }) => {
  expect((await chamar('PUT', `/usuarios/${admin.id}/pin`, { token, corpo: { pin: PIN } })).status).toBe(200)
  await page.goto('/')

  const abrirAdministracao = () => page.getByRole('link', { name: /Administração/ }).first().click()
  const dialogo = page.getByRole('dialog')

  await abrirAdministracao()
  await expect(dialogo.getByText('Confirme seu PIN')).toBeVisible()
  for (const d of '0000') await dialogo.getByRole('button', { name: d, exact: true }).click()
  await expect(dialogo.getByRole('alert')).toContainText('PIN incorreto')

  // cancelar mantém o usuário onde estava
  await dialogo.getByRole('button', { name: 'Fechar' }).click()
  await expect(dialogo).toHaveCount(0)
  await expect(page).not.toHaveURL(/administracao/)

  await abrirAdministracao()
  for (const d of PIN) await dialogo.getByRole('button', { name: d, exact: true }).click()
  await expect(page).toHaveURL(/administracao/)
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

  // sair e voltar pede o PIN de novo
  await page.goBack()
  await abrirAdministracao()
  await expect(dialogo.getByText('Confirme seu PIN')).toBeVisible()
})

test('esqueci o PIN: a senha do administrador libera a Administração', async ({ page }) => {
  expect((await chamar('PUT', `/usuarios/${admin.id}/pin`, { token, corpo: { pin: PIN } })).status).toBe(200)
  await page.goto('/')
  await page.getByRole('link', { name: /Administração/ }).first().click()

  const dialogo = page.getByRole('dialog')
  await dialogo.getByRole('button', { name: 'Esqueci o PIN' }).click()

  await dialogo.getByLabel('Senha').fill('senha-errada-1')
  await dialogo.getByRole('button', { name: 'Confirmar' }).click()
  await expect(dialogo.getByRole('alert')).toContainText('Senha incorreta')
  await expect(page).not.toHaveURL(/administracao/)

  await dialogo.getByLabel('Senha').fill('e2e-senha-1234')
  await dialogo.getByRole('button', { name: 'Confirmar' }).click()
  await expect(page).toHaveURL(/administracao/)
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
})
