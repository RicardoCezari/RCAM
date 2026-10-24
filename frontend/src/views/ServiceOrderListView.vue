<template>
  <AppLayout>
    <div class="mb-3 flex items-center justify-between gap-3">
      <BasePageTitle title="Lista de O.S." description="Pendentes, entregues e histórico." />
      <button
        type="button"
        class="flex shrink-0 items-center gap-1.5 rounded-xl bg-black px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-black/80"
        @click="router.push('/nova-os')"
      >
        <span class="mdi mdi-plus text-[17px]"></span>
        <span class="hidden sm:inline">Nova O.S.</span>
        <span class="sm:hidden">Nova</span>
      </button>
    </div>

    <BaseAlert :message="erro" class="mb-3" />

    <BaseDataTable
      :columns="columns"
      :rows="ordens"
      :loading="carregando"
      server-side
      :total="total"
      :reset-key="situacaoVersao"
      compact
      clickable
      search-placeholder="Nº, cliente, telefone, objeto..."
      :default-sort="{ key: 'numero', dir: 'desc' }"
      empty-text="Nenhuma ordem de serviço encontrada."
      @query="aoConsultar"
      @row-click="abrir"
    >
      <template #toolbar>
        <BaseSegmentedIcons :model-value="situacao" :options="abas" @update:model-value="trocarSituacao" />
      </template>

      <template #numero="{ row }">
        <span class="inline-flex items-center gap-1">
          <span class="font-semibold text-black">{{ row.numero }}</span>
          <span class="inline-flex w-5 justify-center">
            <span
              v-if="iconeOrdem(row)"
              :title="iconeOrdem(row).label"
              :class="['mdi text-[18px] leading-none', iconeOrdem(row).icon, iconeOrdem(row).cor]"
            ></span>
          </span>
        </span>
      </template>

      <template #cliente_nome="{ row }">
        <span class="block max-w-[150px] truncate font-medium text-black sm:max-w-[240px]" :title="row.cliente_nome">
          {{ row.cliente_nome }}
        </span>
      </template>

      <template #cliente_telefone="{ row }">
        <span class="whitespace-nowrap">{{ formatarTelefone(row.cliente_telefone) || '—' }}</span>
      </template>

      <template #data_criacao="{ row }">
        <span class="whitespace-nowrap">{{ dataHoraCurta(row.data_criacao) || '—' }}</span>
      </template>

      <template #objetos="{ value }">
        <span class="block max-w-[200px] truncate" :title="value || ''">{{ value || '—' }}</span>
      </template>

      <template #data_entrega="{ row }">
        <span class="whitespace-nowrap">
          {{ formatarDataBR(row.data_entrega) || '—' }}
          <span v-if="row.hora_entrega" class="hidden text-xs text-black/50 sm:inline">{{ horaCurta(row.hora_entrega) }}</span>
        </span>
      </template>

      <template #valor_total="{ row }">
        <span class="font-medium text-black">{{ valorExibido(row) }}</span>
      </template>

      <template #actions="{ row }">
        <div class="flex items-center justify-end">
          <BaseIconButton icon="mdi-open-in-new" title="Abrir O.S." @click="abrir(row)" />
        </div>
      </template>
    </BaseDataTable>
  </AppLayout>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'
import BasePageTitle from '@/components/base/BasePageTitle.vue'
import BaseDataTable from '@/components/base/BaseDataTable.vue'
import BaseAlert from '@/components/base/BaseAlert.vue'
import BaseIconButton from '@/components/base/BaseIconButton.vue'
import BaseSegmentedIcons from '@/components/base/BaseSegmentedIcons.vue'
import { formatarTelefone } from '@/composables/useClienteForm'
import { formatarMoeda } from '@/composables/useItens'
import { formatarDataBR, horaCurta, iconeOrdem } from '@/utils/ordem'
import { listarOrdens } from '@/services/ordensServico'
import { useListaServidor } from '@/composables/useListaServidor'

const router = useRouter()

const abas = [
  { value: 'pendentes', label: 'Pendentes', icon: 'mdi-clock-outline' },
  { value: 'entregues', label: 'Entregues', icon: 'mdi-package-variant-closed-check' },
  { value: '', label: 'Todas', icon: 'mdi-format-list-bulleted' },
]

// 23/10/26 14:35 (data e hora em que a nota foi aberta)
function dataHoraCurta(valor) {
  const d = new Date(valor)
  if (!valor || Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

// Busca, filtros, ordenação e paginação são feitos no servidor; colunas sem `filter: false` enviam o filtro
// ao campo correspondente (ver FILTROS_API). Datas e valor usam intervalo (de/até).
const columns = [
  { key: 'numero', label: 'O.S.', slot: 'numero' },
  { key: 'cliente_nome', label: 'Cliente', slot: 'cliente_nome' },
  { key: 'cliente_telefone', label: 'Telefone', slot: 'cliente_telefone' },
  { key: 'data_criacao', label: 'Aberta em', slot: 'data_criacao', filterType: 'date-range' },
  { key: 'objetos', label: 'Objetos', slot: 'objetos', hideBelow: 'md', sortable: false },
  { key: 'data_entrega', label: 'Entrega', slot: 'data_entrega', filterType: 'date-range' },
  { key: 'valor_total', label: 'Valor', slot: 'valor_total', hideBelow: 'md', filterType: 'number-range' },
  { key: 'usuario_nome', label: 'Usuário', hideBelow: 'lg' },
]

// coluna da tabela -> parâmetro de filtro / ordenação da API
const FILTROS_API = {
  numero: 'numero',
  cliente_nome: 'cliente',
  cliente_telefone: 'telefone',
  objetos: 'objeto',
  usuario_nome: 'usuario',
  'data_criacao:de': 'criacaoInicio',
  'data_criacao:ate': 'criacaoFim',
  'data_entrega:de': 'dataInicio',
  'data_entrega:ate': 'dataFim',
  'valor_total:de': 'valorMin',
  'valor_total:ate': 'valorMax',
}
const ORDENACAO_API = {
  numero: 'numero',
  cliente_nome: 'cliente',
  cliente_telefone: 'telefone',
  data_criacao: 'cadastro',
  data_entrega: 'entrega',
  usuario_nome: 'usuario',
  valor_total: 'total',
}

const situacao = ref('pendentes')
const situacaoVersao = ref(0)

function parametros(consulta) {
  const params = { page: consulta.page, limit: consulta.limit }
  if (situacao.value) params.situacao = situacao.value
  if (consulta.q) params.q = consulta.q
  for (const [coluna, valor] of Object.entries(consulta.filtros)) {
    if (FILTROS_API[coluna]) params[FILTROS_API[coluna]] = valor
  }
  if (ORDENACAO_API[consulta.ordenarPor]) {
    params.ordenarPor = ORDENACAO_API[consulta.ordenarPor]
    params.direcao = consulta.direcao
  }
  return params
}

const { linhas: ordens, total, carregando, erro, carregar: aoConsultar } = useListaServidor(
  (consulta, signal) => listarOrdens(parametros(consulta), { signal }),
  'Não foi possível carregar as ordens de serviço.'
)

function valorExibido(ordem) {
  const total = Number(ordem.valor_total)
  if (total > 0) return formatarMoeda(total)
  return Number(ordem.valor_orcamento) > 0 ? `${formatarMoeda(ordem.valor_orcamento)} (orç.)` : '—'
}

function abrir(ordem) {
  router.push(`/listar-os/${ordem.id}`)
}

// Trocar de aba volta à página 1; a tabela emite a nova consulta, que já usa a situação atual
function trocarSituacao(key) {
  if (situacao.value === key) return
  situacao.value = key
  situacaoVersao.value += 1
}
</script>
