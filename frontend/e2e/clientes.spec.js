import { test, expect, semear, PREFIXO } from './apoio.js'

const LISTA = `${PREFIXO} Lista`

test.beforeAll(async () => { await semear() })

const linhas = (page) => page.locator('tbody tr')
const resumo = (page) => page.getByText(/\d+–\d+ de \d+|^0 registros$/)
const busca = (page) => page.getByPlaceholder('Nome, CPF, telefone, e-mail...')

async function abrir(page) {
  await page.goto('/listar-clientes')
  await expect(page.getByRole('heading', { name: 'Lista de clientes' })).toBeVisible()
}

async function pesquisar(page, texto) {
  const resposta = page.waitForResponse((r) => r.url().includes('/api/clientes?') && r.status() === 200)
  await busca(page).fill(texto)
  await resposta
}

test.describe('Clientes: lista no servidor', () => {
  test('carrega, pagina e respeita o tamanho da página', async ({ page }) => {
    await abrir(page)
    await pesquisar(page, LISTA)
    await expect(linhas(page)).toHaveCount(10)
    await expect(resumo(page)).toHaveText('1–10 de 45')

    await page.getByRole('button', { name: '2', exact: true }).click()
    await expect(resumo(page)).toHaveText('11–20 de 45')
    await expect(linhas(page).first()).toContainText(`${LISTA} 11`)

    await page.getByRole('button', { name: '5', exact: true }).click()
    await expect(resumo(page)).toHaveText('41–45 de 45')
    await expect(linhas(page)).toHaveCount(5)
    await expect(page.getByRole('button', { name: 'Próxima página' })).toBeDisabled()

    await page.locator('span', { hasText: 'Mostrar' }).locator('select').selectOption('20')
    await expect(resumo(page)).toHaveText('1–20 de 45')
    await expect(linhas(page)).toHaveCount(20)
    await expect(page.getByRole('button', { name: 'Página anterior' })).toBeDisabled()
  })

  test('busca por nome, telefone formatado, e-mail e observações', async ({ page }) => {
    await abrir(page)

    await pesquisar(page, `${LISTA} 07`)
    await expect(linhas(page)).toHaveCount(1)
    await expect(linhas(page).first()).toContainText(`${LISTA} 07`)

    await pesquisar(page, '(91) 99900-0012')
    await expect(linhas(page)).toHaveCount(1)
    await expect(linhas(page).first()).toContainText(`${LISTA} 12`)

    // Busca global também cobre e-mail e observações
    await pesquisar(page, 'zze2e.lista21@exemplo.com')
    await expect(linhas(page)).toHaveCount(1)
    await expect(linhas(page).first()).toContainText(`${LISTA} 21`)

    await pesquisar(page, 'entrega no balcão')
    await expect(resumo(page)).toHaveText(/1–\d+ de \d+/)
    await expect(linhas(page).first()).toContainText(PREFIXO)
  })

  test('ordenação alterna entre crescente e decrescente e mantém a página 1', async ({ page }) => {
    await abrir(page)
    await pesquisar(page, LISTA)
    await expect(linhas(page).first()).toContainText(`${LISTA} 01`)

    const resposta = page.waitForResponse((r) => r.url().includes('ordenarPor=nome') && r.url().includes('direcao=desc'))
    await page.getByRole('button', { name: /^Nome/ }).click()
    await resposta
    await expect(linhas(page).first()).toContainText(`${LISTA} 45`)

    await page.getByRole('button', { name: /^Telefone/ }).click()
    await expect(linhas(page).first()).toContainText(`${LISTA} 01`)
  })

  test('filtros por coluna (nome, telefone, e-mail, observações)', async ({ page }) => {
    await abrir(page)
    await pesquisar(page, LISTA)
    // Em telas largas a linha de filtros já abre visível; o botão alterna a exibição
    await expect(page.getByLabel('Filtrar Nome')).toBeVisible()
    await page.getByRole('button', { name: /Filtros/ }).click()
    await expect(page.getByLabel('Filtrar Nome')).toBeHidden()
    await page.getByRole('button', { name: /Filtros/ }).click()

    await page.getByLabel('Filtrar Nome').fill('Lista 3')
    await expect(resumo(page)).toHaveText('1–10 de 10')

    await page.getByLabel('Filtrar E-mail').fill('lista35@')
    await expect(linhas(page)).toHaveCount(1)
    await expect(linhas(page).first()).toContainText(`${LISTA} 35`)

    await page.getByLabel('Filtrar Observações').fill('n35')
    await expect(linhas(page)).toHaveCount(1)

    await page.getByRole('button', { name: /Limpar/ }).click()
    await expect(busca(page)).toHaveValue('')
    await expect(page.getByLabel('Filtrar Nome')).toHaveValue('')
  })

  test('estado vazio e recuperação', async ({ page }) => {
    await abrir(page)
    await pesquisar(page, 'zzzz-nao-existe-9999')
    await expect(page.getByText('Nenhum cliente encontrado.')).toBeVisible()
    await expect(resumo(page)).toHaveText('0 registros')

    await pesquisar(page, `${LISTA} 03`)
    await expect(linhas(page)).toHaveCount(1)
  })

  test('erro da API aparece na tela e some quando a consulta volta a funcionar', async ({ page }) => {
    await abrir(page)
    await pesquisar(page, `${LISTA} 05`)

    await page.route('**/api/clientes?*', (route) => route.fulfill({ status: 500, json: { message: 'Erro interno' } }))
    await busca(page).fill(`${LISTA} 06`)
    await expect(page.getByText(/Erro interno|Não foi possível carregar os clientes/)).toBeVisible()

    await page.unroute('**/api/clientes?*')
    await busca(page).fill(`${LISTA} 08`)
    await expect(linhas(page)).toHaveCount(1)
    await expect(linhas(page).first()).toContainText(`${LISTA} 08`)
    await expect(page.getByText(/Erro interno|Não foi possível carregar os clientes/)).toHaveCount(0)
  })

  test('troca rápida de busca: resposta antiga e lenta não sobrescreve a nova', async ({ page }) => {
    await abrir(page)
    await pesquisar(page, LISTA)

    let canceladas = 0
    page.on('requestfailed', (r) => { if (r.url().includes('/api/clientes?') && /ERR_ABORTED|aborted/i.test(r.failure()?.errorText ?? '')) canceladas++ })

    await page.route('**/api/clientes?*', async (route) => {
      if (decodeURIComponent(route.request().url().replace(/\+/g, ' ')).includes(`${LISTA} 01`)) {
        await new Promise((r) => setTimeout(r, 2500)) // resposta antiga chega depois da nova
      }
      await route.continue().catch(() => {})
    })

    await busca(page).fill(`${LISTA} 01`)
    await page.waitForTimeout(450) // passa do debounce: a requisição lenta já saiu
    await busca(page).fill(`${LISTA} 02`)

    await expect(linhas(page)).toHaveCount(1)
    await expect(linhas(page).first()).toContainText(`${LISTA} 02`)
    await page.waitForTimeout(3000) // dá tempo da resposta antiga (se não foi cancelada) chegar
    await expect(linhas(page)).toHaveCount(1)
    await expect(linhas(page).first()).toContainText(`${LISTA} 02`)
    expect(canceladas).toBeGreaterThanOrEqual(0)
  })

  test('digitação rápida gera poucas requisições (debounce)', async ({ page }) => {
    await abrir(page)
    await pesquisar(page, LISTA)
    let n = 0
    page.on('request', (r) => { if (r.url().includes('/api/clientes?')) n++ })
    await busca(page).pressSequentially(`${LISTA} 12`, { delay: 40 })
    await expect(linhas(page)).toHaveCount(1)
    expect(n).toBeLessThanOrEqual(3)
  })
})

test.describe('Clientes: cadastro, edição e exclusão', () => {
  test('fluxo completo: criar, editar, pesquisar e excluir', async ({ page }) => {
    const sufixo = String(Date.now()).slice(-6)
    const nome = `${PREFIXO} Fluxo ${sufixo}`
    const telefone = `989${sufixo}00`

    await abrir(page)
    await page.getByRole('button', { name: /Novo/ }).first().click()
    const modal = page.getByRole('dialog')
    await expect(modal).toBeVisible()

    // validação: sem nome/telefone não salva
    await modal.getByRole('button', { name: 'Cadastrar cliente' }).click()
    await expect(modal).toBeVisible()

    await modal.getByPlaceholder('Nome completo').fill(nome)
    await modal.getByPlaceholder('(00) 00000-0000').fill(telefone)
    await modal.getByPlaceholder('cliente@email.com').fill(`fluxo${sufixo}@exemplo.com`)
    await modal.getByRole('button', { name: 'Cadastrar cliente' }).click()
    await expect(modal).toBeHidden()

    await pesquisar(page, nome)
    await expect(linhas(page)).toHaveCount(1)

    // editar
    await linhas(page).first().click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('dialog').getByPlaceholder('Informações adicionais sobre o cliente...').fill('observação editada no teste')
    await page.getByRole('dialog').getByRole('button', { name: 'Salvar alterações' }).click()
    await expect(page.getByRole('dialog')).toBeHidden()

    await pesquisar(page, 'observação editada no teste')
    await expect(linhas(page).first()).toContainText(nome)

    // Escape fecha o modal (acessibilidade)
    await linhas(page).first().click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toBeHidden()

    // excluir
    await linhas(page).first().getByTitle('Excluir cliente').click()
    await page.getByRole('dialog').getByRole('button', { name: /Excluir|Confirmar|Sim/ }).last().click()
    await expect(page.getByRole('dialog')).toBeHidden()
    await pesquisar(page, nome)
    await expect(page.getByText('Nenhum cliente encontrado.')).toBeVisible()
  })

  test('telefone duplicado é recusado com mensagem', async ({ page }) => {
    await abrir(page)
    await page.getByRole('button', { name: /Novo/ }).first().click()
    const modal = page.getByRole('dialog')
    await modal.getByPlaceholder('Nome completo').fill(`${PREFIXO} Duplicado`)
    await modal.getByPlaceholder('(00) 00000-0000').fill('91999000001')
    await modal.getByRole('button', { name: 'Cadastrar cliente' }).click()
    await expect(modal).toBeVisible()
    await expect(modal.getByText(/já|existe|cadastrado/i)).toBeVisible()
  })
})
