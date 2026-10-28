import { test, expect, semear, chamar, sessao, preencherAssistente, PREFIXO } from './apoio.js'

let massa
test.beforeAll(async () => { massa = await semear() })

const sufixo = () => `${Date.now()}${Math.floor(Math.random() * 90 + 10)}`.slice(-9)
const celular = (ddd, s) => `${ddd}9${s.slice(-8)}`

async function criarOsPorApi({ valor = 50, itens = 1 } = {}) {
  const { token } = await sessao('admin')
  const s = sufixo()
  const cli = await chamar('POST', '/clientes', {
    token,
    corpo: { nome: `${PREFIXO} Detalhe ${s}`, telefone: celular('95', s), email: `detalhe${s}@exemplo.com` },
  })
  expect(cli.status).toBe(201)
  const os = await chamar('POST', '/ordens', {
    token,
    corpo: {
      cliente_id: cli.dados.id,
      data_entrega: '2031-03-01',
      observacoes: `${PREFIXO} detalhe`,
      itens: Array.from({ length: itens }, () => ({
        tipo_objeto_id: massa.tipo.id, servico_id: massa.servico.id, quantidade: 1, valor_unitario: valor,
      })),
    },
  })
  expect(os.status).toBe(201)
  return { token, cliente: cli.dados, os: os.dados }
}

const botaoCriar = (page) => page.locator('form button[type=submit]')
const respostaCriarOs = (page) =>
  page.waitForResponse((r) => r.url().endsWith('/api/ordens') && r.request().method() === 'POST')

test.describe('Fluxo completo de O.S.', () => {
  test('cria cliente + O.S. pelo assistente e encontra na lista e no detalhe', async ({ page }) => {
    const s = sufixo()
    const nome = `${PREFIXO} Fluxo OS ${s}`
    await preencherAssistente(page, { nome, telefone: celular('97', s) })

    const resposta = respostaCriarOs(page)
    await botaoCriar(page).click()
    const criada = await (await resposta).json()
    await expect(page.getByText('O.S. criada com sucesso')).toBeVisible()
    await expect(page.getByText(String(criada.numero ?? criada.id)).first()).toBeVisible()

    // aparece na lista de pendentes
    await page.goto('/listar-os')
    await page.getByPlaceholder('Nº, cliente, telefone, objeto...').fill(nome)
    await expect(page.locator('tbody tr')).toHaveCount(1)
    await expect(page.locator('tbody tr').first()).toContainText(String(criada.numero))

    // e o detalhe mostra o item, o valor e o cliente
    await page.locator('tbody tr').first().click()
    await expect(page).toHaveURL(new RegExp(`/listar-os/${criada.id}$`))
    await expect(page.getByText(nome).first()).toBeVisible()
    await expect(page.getByText(`${PREFIXO} Troca de pilha`).first()).toBeVisible()
  })

  test('"Editar O.S." volta ao passo de serviços e permite acrescentar um serviço ao objeto', async ({ page }) => {
    const s = sufixo()
    await preencherAssistente(page, { nome: `${PREFIXO} Edita ${s}`, telefone: celular('93', s) })

    const resposta = respostaCriarOs(page)
    await botaoCriar(page).click()
    const criada = await (await resposta).json()
    await expect(page.getByText('O.S. criada com sucesso')).toBeVisible()

    await page.getByRole('button', { name: 'Editar O.S.' }).click()
    await expect(page.getByRole('heading', { name: /Editar O\.S\./ })).toBeVisible()
    // o serviço já gravado fica travado
    await expect(page.locator('select[id^="tipo-"]').first()).toBeDisabled()
    await expect(page.locator('form select:not([id^="tipo-"])').first()).toBeDisabled()

    await page.getByRole('button', { name: /Adicionar serviço/ }).first().click()
    const novo = page.locator('form select:not([id^="tipo-"])').nth(1)
    const valor = await novo.locator('option', { hasText: `${PREFIXO} Troca de pilha` }).first().getAttribute('value')
    await novo.selectOption(valor)

    const gravouItem = page.waitForResponse((r) => /\/ordens\/\d+\/itens$/.test(r.url()) && r.request().method() === 'POST')
    await page.getByRole('button', { name: 'Salvar alterações' }).click()
    expect((await gravouItem).status()).toBe(201)
    await expect(page.getByText('O.S. criada com sucesso')).toBeVisible()

    const { token } = await sessao('admin')
    const ordem = await chamar('GET', `/ordens/${criada.id}`, { token })
    expect(ordem.dados.itens).toHaveLength(2)
  })

  test('falha ao criar a O.S. não deixa o cliente órfão: a segunda tentativa funciona', async ({ page }) => {
    const s = sufixo()
    const nome = `${PREFIXO} Retry ${s}`
    const telefone = celular('96', s)
    await preencherAssistente(page, { nome, telefone })

    let falhou = false
    await page.route('**/api/ordens', async (route) => {
      if (route.request().method() === 'POST' && !falhou) {
        falhou = true
        await route.fulfill({ status: 500, json: { message: 'Falha simulada ao criar a O.S.' } })
      } else {
        await route.continue()
      }
    })

    await botaoCriar(page).click()
    await expect(page.getByText('Falha simulada ao criar a O.S.').first()).toBeVisible()

    const resposta = respostaCriarOs(page)
    await botaoCriar(page).click()
    expect((await resposta).status()).toBe(201)
    await expect(page.getByText('O.S. criada com sucesso')).toBeVisible()

    const { token } = await sessao('admin')
    const clientes = await chamar('GET', `/clientes?telefone=${telefone}`, { token })
    expect(clientes.dados.total).toBe(1)
  })

  test('validação: sem tipo/serviço/data a O.S. não é criada', async ({ page }) => {
    const s = sufixo()
    await page.goto('/nova-os')
    await page.locator('#os-telefone').fill(celular('94', s))
    await page.locator('#os-nome').fill(`${PREFIXO} Validacao ${s}`)
    await page.getByRole('button', { name: 'Criar O.S.' }).click()

    let posts = 0
    page.on('request', (r) => { if (r.method() === 'POST' && r.url().endsWith('/api/ordens')) posts++ })
    await botaoCriar(page).click()
    await expect(page.locator('[data-erro], .text-red-600').first()).toBeVisible()
    expect(posts).toBe(0)
  })

  test('edição no detalhe: observações e quantidade são salvas sozinhas e persistem', async ({ page }) => {
    const { token, os } = await criarOsPorApi({ valor: 50 })
    await page.goto(`/listar-os/${os.id}`)
    await expect(page.getByText(`O.S. ${os.numero}`).first()).toBeVisible()

    const salvouObs = page.waitForResponse((r) => r.url().endsWith(`/api/ordens/${os.id}`) && r.request().method() === 'PUT')
    await page.locator('#os-obs').fill(`${PREFIXO} observação editada`)
    expect((await salvouObs).status()).toBe(200)

    const salvouItem = page.waitForResponse((r) => /\/itens\/\d+$/.test(r.url()) && r.request().method() === 'PUT')
    await page.getByLabel('Aumentar quantidade').first().click()
    expect((await salvouItem).status()).toBe(200)

    await page.reload()
    await expect(page.locator('#os-obs')).toHaveValue(`${PREFIXO} observação editada`)
    await expect(page.getByText(/R\$\s*100,00/).first()).toBeVisible()

    const api = await chamar('GET', `/ordens/${os.id}`, { token })
    expect(Number(api.dados.valor_total)).toBe(100)
  })

  test('situação do item muda na hora e reflete na O.S.; entrega torna a O.S. somente consulta', async ({ page }) => {
    const { token, os } = await criarOsPorApi({ valor: 30 })
    await page.goto(`/listar-os/${os.id}`)

    await page.getByTitle('Em andamento').last().click()
    await expect(page.getByText(/em andamento\./i).first()).toBeVisible()
    let api = await chamar('GET', `/ordens/${os.id}`, { token })
    expect(api.dados.estado).toBe('EM_ANDAMENTO')

    await page.getByTitle('Pronto').first().click()
    await page.getByRole('button', { name: 'OK', exact: true }).click()
    await expect(page.getByText(/Itens marcados como pronto/i).first()).toBeVisible()
    await page.getByTitle('Entregue').first().click()
    // câmera da entrega abre a câmera (capture); a galeria é um botão separado
    const modal = page.getByRole('dialog')
    await expect(modal.getByTitle('Tirar foto').locator('input[capture]')).toBeAttached()
    await expect(modal.getByTitle('Escolher da galeria').locator('input:not([capture])')).toBeAttached()
    await page.getByRole('button', { name: 'OK', exact: true }).click()
    // ao entregar a O.S. volta para a lista de pendentes
    await expect(page).toHaveURL(/\/listar-os$/)
    await expect(page.getByRole('button', { name: 'Pendentes' })).toBeVisible()
    api = await chamar('GET', `/ordens/${os.id}`, { token })
    expect(api.dados.estado).toBe('ENTREGUE')

    // some das pendentes e aparece em "Entregues"
    await page.getByRole('button', { name: 'Entregues' }).click()
    await page.getByPlaceholder('Nº, cliente, telefone, objeto...').fill(`${PREFIXO} Detalhe`)
    await expect(page.locator('tbody tr').first()).toBeVisible()
    await expect(page.locator('tbody')).toContainText(String(os.numero))
  })

  test('situação é por objeto (vale para todos os serviços dele) e a observação do objeto é salva', async ({ page }) => {
    const { token, os } = await criarOsPorApi({ valor: 25, itens: 2 })
    await page.goto(`/listar-os/${os.id}`)

    await page.locator('textarea[id^="obs-obj-"]').fill(`${PREFIXO} trocar a coroa`)
    await page.getByTitle('Em andamento').last().click()
    await expect(page.getByText(/em andamento\./i).first()).toBeVisible()

    await expect.poll(async () => {
      const api = await chamar('GET', `/ordens/${os.id}`, { token })
      return [api.dados.itens.map((i) => i.estado).join(','), api.dados.itens[0].observacoes]
    }).toEqual(['EM_ANDAMENTO,EM_ANDAMENTO', `${PREFIXO} trocar a coroa`])
  })

  test('O.S. entregue ainda aceita foto; cancelada não, mas pode ser reaberta', async ({ page }) => {
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64'
    )

    // Entregue: a câmera continua disponível e a foto fica como foto de entrega
    const entregue = await criarOsPorApi({ valor: 30 })
    await chamar('PATCH', `/ordens/${entregue.os.id}/estado`, { token: entregue.token, corpo: { estado: 'CONCLUIDO' } })
    await chamar('PATCH', `/ordens/${entregue.os.id}/estado`, { token: entregue.token, corpo: { estado: 'ENTREGUE' } })
    await page.goto(`/listar-os/${entregue.os.id}`)
    await page.locator('input[type=file][capture]').first().setInputFiles({ name: 'f.png', mimeType: 'image/png', buffer: png })
    await expect(page.getByText('Foto adicionada.').first()).toBeVisible()
    const fotos = await chamar('GET', `/ordens/${entregue.os.id}`, { token: entregue.token })
    expect(fotos.dados.fotos.map((f) => f.etapa)).toEqual(['ENTREGA'])

    // Cancelada: sem câmera; "Reabrir" volta para a entrada e libera a edição e as fotos
    const cancelada = await criarOsPorApi({ valor: 30 })
    await chamar('PATCH', `/ordens/${cancelada.os.id}/estado`, { token: cancelada.token, corpo: { estado: 'CANCELADO' } })
    await page.goto(`/listar-os/${cancelada.os.id}`)
    await expect(page.getByText('Cancelada').first()).toBeVisible()
    await expect(page.locator('input[type=file][capture]')).toHaveCount(0)

    await page.getByRole('button', { name: 'Reabrir' }).click()
    await page.getByRole('button', { name: 'OK', exact: true }).click()
    await expect(page.getByText(/reaberta/i).first()).toBeVisible()
    await expect(page.locator('input[type=file][capture]').first()).toBeAttached()
    const api = await chamar('GET', `/ordens/${cancelada.os.id}`, { token: cancelada.token })
    expect(api.dados.estado).toBe('ENTRADA')
    expect(api.dados.itens.map((i) => i.estado)).toEqual(['CADASTRADO'])
  })

  test('O.S. cancelada fica nas pendentes até a devolução ao cliente; depois vai para entregues', async ({ page }) => {
    const { token, os } = await criarOsPorApi({ valor: 20 })
    const cancelar = await chamar('PATCH', `/ordens/${os.id}/estado`, { token, corpo: { estado: 'CANCELADO' } })
    expect(cancelar.status).toBe(200)

    await page.goto(`/listar-os/${os.id}`)
    await page.getByRole('button', { name: 'Devolver ao cliente' }).click()
    await page.getByRole('button', { name: 'OK', exact: true }).click()
    // após devolver volta para a lista de pendentes
    await expect(page).toHaveURL(/\/listar-os$/)
    await expect(page.getByRole('button', { name: 'Pendentes' })).toBeVisible()

    const api = await chamar('GET', `/ordens/${os.id}`, { token })
    expect(api.dados.estado).toBe('CANCELADO')
    expect(api.dados.data_entregue).toBeTruthy()

    const pend = await chamar('GET', `/ordens?numero=${os.numero}&situacao=pendentes`, { token })
    expect(pend.dados.total).toBe(0)
    const ent = await chamar('GET', `/ordens?numero=${os.numero}&situacao=entregues`, { token })
    expect(ent.dados.total).toBe(1)
  })

  test('erro ao salvar item: a tela volta ao estado anterior e avisa', async ({ page }) => {
    const { token, os } = await criarOsPorApi({ valor: 20 })
    await page.goto(`/listar-os/${os.id}`)

    await page.route(/\/api\/ordens\/\d+\/itens\/\d+$/, (route) =>
      route.request().method() === 'PUT'
        ? route.fulfill({ status: 500, json: { message: 'Falha simulada no item' } })
        : route.continue()
    )
    await page.getByTitle('Em andamento').last().click()
    await expect(page.getByText('Falha simulada no item').first()).toBeVisible()

    const api = await chamar('GET', `/ordens/${os.id}`, { token })
    expect(api.dados.estado).not.toBe('EM_ANDAMENTO')
  })
})
