<template>
  <AppLayout>
    <div class="mb-5 flex items-start justify-between gap-3 sm:mb-8 sm:gap-4">
      <BasePageTitle
        title="Lista de O.S."
        description="Acompanhe o andamento das ordens de serviço e abra qualquer uma para editar."
      />
      <button
        type="button"
        class="flex shrink-0 items-center gap-2 rounded-2xl bg-black px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-black/80 sm:px-5 sm:py-3"
        @click="router.push('/nova-os')"
      >
        <span class="mdi mdi-plus text-[18px]"></span>
        Nova O.S.
      </button>
    </div>

    <div class="mb-3 flex flex-col gap-2 sm:mb-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
      <div class="relative">
        <span class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-black/40">
          <span class="mdi mdi-magnify text-[16px]"></span>
        </span>
        <input
          v-model="filtro"
          type="text"
          placeholder="Buscar por nº, cliente ou objeto..."
          class="h-10 w-full rounded-xl border border-black/10 bg-white pl-8 pr-4 text-sm outline-none transition focus:border-black/30 focus:ring-2 focus:ring-black/10 sm:w-72"
        />
      </div>

      <div class="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
        <button
          v-for="opcao in opcoesEstado"
          :key="opcao.key"
          type="button"
          :title="opcao.label"
          :class="[
            'inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border px-3 text-sm font-medium transition sm:h-10',
            filtroEstado === opcao.key
              ? 'border-black bg-black text-white'
              : 'border-black/10 bg-white text-black hover:bg-black/5',
          ]"
          @click="filtroEstado = opcao.key"
        >
          <span v-if="opcao.icon" :class="['mdi text-[16px]', opcao.icon]"></span>
          {{ opcao.label }}
          <span class="text-xs opacity-60">{{ opcao.total }}</span>
        </button>
      </div>
    </div>

    <BaseAlert :message="erro" class="mb-4" />

    <BaseDataTable
      :columns="columns"
      :rows="ordensFiltradas"
      :loading="carregando"
      compact
      clickable
      empty-text="Nenhuma ordem de serviço encontrada."
      actions-header-class="hidden sm:table-cell"
      actions-cell-class="hidden sm:table-cell"
      @row-click="abrir"
    >
      <template #numero="{ row }">
        <span class="inline-flex items-center gap-2 whitespace-nowrap">
          <span class="font-semibold text-black">{{ row.numero }}</span>
          <BaseStatusBadge :estado="row.estado" :parcial="ordemParcial(row)" icon-only />
        </span>
      </template>

      <template #cliente_nome="{ row }">
        <span class="block max-w-[150px] truncate font-medium text-black sm:max-w-[260px]" :title="row.cliente_nome">
          {{ row.cliente_nome }}
        </span>
      </template>

      <template #cliente_telefone="{ row }">
        <span class="whitespace-nowrap">{{ formatarTelefone(row.cliente_telefone) || '—' }}</span>
      </template>

      <template #objetos="{ value }">
        <span class="block max-w-[200px] truncate" :title="value || ''">{{ value || '—' }}</span>
      </template>

      <template #data_entrega="{ row }">
        <span class="whitespace-nowrap">
          <span class="sm:hidden">{{ formatarDataBR(row.data_entrega).slice(0, 5) || '—' }}</span>
          <span class="hidden sm:inline">{{ formatarDataBR(row.data_entrega) || '—' }}</span>
          <span v-if="row.hora_entrega" class="hidden text-xs text-black/50 sm:inline">{{ horaCurta(row.hora_entrega) }}</span>
        </span>
      </template>

      <template #valor_total="{ row }">
        <span class="font-medium text-black">{{ valorExibido(row) }}</span>
      </template>

      <template #actions="{ row }">
        <div class="flex items-center justify-end">
          <BaseIconButton icon="mdi-pencil" title="Abrir O.S." @click="abrir(row)" />
        </div>
      </template>
    </BaseDataTable>
  </AppLayout>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'
import BasePageTitle from '@/components/base/BasePageTitle.vue'
import BaseDataTable from '@/components/base/BaseDataTable.vue'
import BaseAlert from '@/components/base/BaseAlert.vue'
import BaseIconButton from '@/components/base/BaseIconButton.vue'
import BaseStatusBadge from '@/components/base/BaseStatusBadge.vue'
import { formatarTelefone } from '@/composables/useClienteForm'
import { formatarMoeda } from '@/composables/useItens'
import { ESTADOS_OS, formatarDataBR, horaCurta, ordemParcial } from '@/utils/ordem'
import { listarOrdens } from '@/services/ordensServico'

const router = useRouter()

const columns = [
  { key: 'numero', label: 'O.S.', slot: 'numero' },
  { key: 'cliente_nome', label: 'Cliente', slot: 'cliente_nome' },
  { key: 'cliente_telefone', label: 'Telefone', slot: 'cliente_telefone' },
  { key: 'objetos', label: 'Objetos', slot: 'objetos', hideBelow: 'md' },
  { key: 'data_entrega', label: 'Entrega', slot: 'data_entrega' },
  { key: 'valor_total', label: 'Valor', slot: 'valor_total', hideBelow: 'sm' },
]

const ordens = ref([])
const carregando = ref(false)
const erro = ref('')
const filtro = ref('')
const filtroEstado = ref('')

const opcoesEstado = computed(() => [
  { key: '', label: 'Todas', icon: '', total: ordens.value.length },
  ...Object.entries(ESTADOS_OS).map(([key, info]) => ({
    key,
    label: info.label,
    icon: info.icon,
    total: ordens.value.filter((o) => o.estado === key).length,
  })),
])

const ordensFiltradas = computed(() => {
  const termo = filtro.value.trim().toLowerCase()

  return ordens.value.filter((o) => {
    if (filtroEstado.value && o.estado !== filtroEstado.value) return false
    if (!termo) return true
    return (
      String(o.numero).includes(termo.replace('#', '')) ||
      o.cliente_nome?.toLowerCase().includes(termo) ||
      (termo.replace(/\D/g, '') && o.cliente_telefone?.includes(termo.replace(/\D/g, ''))) ||
      o.objetos?.toLowerCase().includes(termo)
    )
  })
})

function valorExibido(ordem) {
  const total = Number(ordem.valor_total)
  if (total > 0) return formatarMoeda(total)
  return Number(ordem.valor_orcamento) > 0 ? `${formatarMoeda(ordem.valor_orcamento)} (orç.)` : '—'
}

function abrir(ordem) {
  router.push(`/listar-os/${ordem.id}`)
}

onMounted(async () => {
  carregando.value = true
  try {
    const res = await listarOrdens({ limit: 1000 })
    ordens.value = res.data ?? res
  } catch (err) {
    erro.value = err?.response?.data?.message || 'Não foi possível carregar as ordens de serviço.'
  } finally {
    carregando.value = false
  }
})
</script>
