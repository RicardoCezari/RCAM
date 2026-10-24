// Apoio aos testes no navegador: login via API, massa de dados idempotente e sessão pré-autenticada.
import { test as base, expect } from '@playwright/test'

export const API = 'http://127.0.0.1:3100/api'
export const SENHA = 'e2e-senha-1234'
export const PREFIXO = 'ZZE2E'

let sessaoCache = null

async function chamar(metodo, caminho, { token, corpo } = {}) {
  const resp = await fetch(`${API}${caminho}`, {
    method: metodo,
    headers: {
      ...(corpo ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
  })
  const texto = await resp.text()
  let dados = null
  try { dados = texto ? JSON.parse(texto) : null } catch { dados = texto }
  return { status: resp.status, dados }
}

export async function sessao(perfil = 'admin') {
  sessaoCache ??= {}
  if (!sessaoCache[perfil]) {
    const r = await chamar('POST', '/auth/login', { corpo: { login: `zz_e2e_${perfil}`, senha: SENHA } })
    if (r.status !== 200) throw new Error(`Login E2E falhou (${r.status}): ${JSON.stringify(r.dados)}`)
    sessaoCache[perfil] = r.dados
  }
  return sessaoCache[perfil]
}

const doisDigitos = (n) => String(n).padStart(2, '0')

/*
 * Massa de dados determinística (idempotente: só cria o que falta):
 *  - 45 clientes "ZZE2E Lista NN" (telefone 91999NNNNN, e-mail e observações previsíveis)
 *  - tipo de objeto + serviço vinculados
 *  - 30 O.S. do cliente "ZZE2E Lista 01" (para paginação/filtros da lista de O.S.)
 */
export async function semear() {
  const { token } = await sessao('admin')
  const lista = await chamar('GET', `/clientes?q=${encodeURIComponent(`${PREFIXO} Lista`)}&limit=100`, { token })
  const existentes = new Set((lista.dados?.data ?? []).map((c) => c.nome))

  for (let n = 1; n <= 45; n++) {
    const nome = `${PREFIXO} Lista ${doisDigitos(n)}`
    if (existentes.has(nome)) continue
    const r = await chamar('POST', '/clientes', {
      token,
      corpo: {
        nome,
        telefone: `91999${String(n).padStart(6, '0')}`,
        email: `zze2e.lista${doisDigitos(n)}@exemplo.com`,
        informacao_adicional: n % 5 === 0 ? `Cliente especial ${PREFIXO} n${doisDigitos(n)} entrega no balcão` : null,
      },
    })
    if (r.status !== 201) throw new Error(`Falha ao semear cliente ${nome}: ${r.status} ${JSON.stringify(r.dados)}`)
  }

  const tipos = (await chamar('GET', '/tipos-objeto', { token })).dados
  let tipo = (tipos.data ?? tipos).find((t) => t.nome === `${PREFIXO} Relógio`)
  if (!tipo) tipo = (await chamar('POST', '/tipos-objeto', { token, corpo: { nome: `${PREFIXO} Relógio` } })).dados

  const servicos = (await chamar('GET', '/servicos', { token })).dados
  let servico = (servicos.data ?? servicos).find((s) => s.nome === `${PREFIXO} Troca de pilha`)
  if (!servico) {
    servico = (await chamar('POST', '/servicos', { token, corpo: { nome: `${PREFIXO} Troca de pilha`, valor: 35, tipo_ids: [tipo.id] } })).dados
  }

  const primeiro = (await chamar('GET', `/clientes?q=${encodeURIComponent(`${PREFIXO} Lista 01`)}&limit=5`, { token })).dados.data[0]
  const ordens = await chamar('GET', `/ordens?clienteId=${primeiro.id}&limit=100`, { token })
  const faltam = 30 - ordens.dados.total
  // Datas de entrega fixas (2031-01-01 em diante): os testes de filtro por data não dependem do dia da execução
  for (let i = 0; i < faltam; i++) {
    const entrega = new Date(Date.UTC(2031, 0, 1 + ordens.dados.total + i)).toISOString().slice(0, 10)
    const r = await chamar('POST', '/ordens', {
      token,
      corpo: {
        cliente_id: primeiro.id,
        data_entrega: entrega,
        observacoes: `${PREFIXO} lote`,
        itens: [{ tipo_objeto_id: tipo.id, servico_id: servico.id, quantidade: 1, valor_unitario: 35 + i }],
      },
    })
    if (r.status !== 201) throw new Error(`Falha ao semear O.S.: ${r.status} ${JSON.stringify(r.dados)}`)
  }

  return { clientePrimeiroId: primeiro.id, tipo, servico }
}

export { chamar }

// Teste com sessão de administrador já gravada no localStorage antes de a página carregar
export const test = base.extend({
  page: async ({ page }, use) => {
    const { token, usuario } = await sessao('admin')
    await page.addInitScript(([t, u]) => {
      localStorage.setItem('token', t)
      localStorage.setItem('usuario', JSON.stringify(u))
    }, [token, usuario])
    await use(page)
  },
})

export { expect }
