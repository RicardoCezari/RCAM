<template>
  <BaseModal
    :model-value="modelValue"
    :title="`Histórico — ${cliente?.nome ?? ''}`"
    subtitle="O.S. entregues ou canceladas · clique para abrir"
    icon="mdi-history"
    size="xl"
    @update:model-value="(v) => emit('update:modelValue', v)"
  >
    <div class="space-y-3 px-4 py-3 sm:px-6">
      <BaseAlert :message="erro" />

      <BaseDataTable
        :columns="columns"
        :rows="ordens"
        row-key="ordem_id"
        compact
        clickable
        :filterable="false"
        :loading="carregando"
        :default-sort="{ key: 'numero', dir: 'desc' }"
        :initial-items-per-page="10"
        :per-page-options="[10, 20, 50]"
        search-placeholder="Nº, peça, serviço..."
        empty-text="Nenhuma O.S. entregue ou cancelada deste cliente."
        @row-click="abrirOrdem"
      >
        <template #numero="{ row }">
          <span class="flex items-center gap-1.5 font-semibold text-black">
            {{ row.numero }}
            <BaseStatusBadge :estado="row.ordem_estado" icon-only />
          </span>
        </template>

        <template #pecas="{ row }">
          <span class="block max-w-[200px] truncate sm:max-w-[320px]" :title="row.pecas">{{ row.pecas }}</span>
        </template>

        <template #data_criacao="{ row }">
          <span class="whitespace-nowrap">{{ formatarDataHora(row.data_criacao) }}</span>
        </template>

        <template #data_entregue="{ row }">
          <span class="whitespace-nowrap">{{ formatarDataHora(row.data_entregue) || '—' }}</span>
        </template>

        <template #actions="{ row }">
          <div class="flex items-center justify-end gap-1">
            <button
              v-if="row.fotos.length"
              type="button"
              :title="`${row.fotos.length} foto(s)`"
              class="inline-flex h-8 items-center gap-1 rounded-lg border border-black/10 bg-white px-2 text-xs text-black transition hover:bg-black hover:text-white"
              @click="abrirFotos(row, 0)"
            >
              <span class="mdi mdi-image-multiple-outline text-[15px]"></span>
              {{ row.fotos.length }}
            </button>
            <BaseIconButton icon="mdi-open-in-new" title="Abrir O.S." @click="abrirOrdem(row)" />
          </div>
        </template>
      </BaseDataTable>
    </div>

    <template #footer>
      <button
        type="button"
        class="rounded-xl border border-black/10 px-4 py-2 text-sm font-medium text-black transition hover:bg-black/5"
        @click="emit('update:modelValue', false)"
      >
        Fechar
      </button>
    </template>
  </BaseModal>

  <FotoViewer
    v-model="viewer.aberto"
    v-model:indice="viewer.indice"
    :fotos="viewer.fotos"
    :titulo="viewer.titulo"
    :pode-remover="false"
  />
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import BaseModal from '@/components/base/BaseModal.vue'
import BaseAlert from '@/components/base/BaseAlert.vue'
import BaseDataTable from '@/components/base/BaseDataTable.vue'
import BaseIconButton from '@/components/base/BaseIconButton.vue'
import BaseStatusBadge from '@/components/base/BaseStatusBadge.vue'
import FotoViewer from '@/components/os/FotoViewer.vue'
import { historicoCliente } from '@/services/ordensServico'

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  cliente: { type: Object, default: null },
})
const emit = defineEmits(['update:modelValue'])

const router = useRouter()

const columns = [
  { key: 'numero', label: 'O.S.', slot: 'numero' },
  { key: 'pecas', label: 'Peças', slot: 'pecas' },
  { key: 'data_criacao', label: 'Entrada', slot: 'data_criacao', hideBelow: 'sm',
    filterValue: (r) => formatarDataHora(r.data_criacao) },
  { key: 'data_entregue', label: 'Entrega', slot: 'data_entregue', hideBelow: 'md',
    filterValue: (r) => formatarDataHora(r.data_entregue) },
]

const linhas = ref([])
const carregando = ref(false)
const erro = ref('')
const viewer = reactive({ aberto: false, indice: 0, fotos: [], titulo: '' })

// Agrupa as linhas (uma por item) em uma entrada por O.S., sem repetir fotos
const ordens = computed(() => {
  const mapa = new Map()
  for (const l of linhas.value) {
    if (!mapa.has(l.ordem_id)) {
      mapa.set(l.ordem_id, {
        ordem_id: l.ordem_id,
        numero: l.numero,
        ordem_estado: l.ordem_estado,
        data_criacao: l.data_criacao,
        data_entregue: l.ordem_data_entregue,
        itens: [],
        fotos: [],
        pecas: '',
      })
    }
    const os = mapa.get(l.ordem_id)
    os.itens.push(l)
    const peca = `${l.tipo_objeto_nome} — ${l.servico_nome}${l.quantidade > 1 ? ` ×${l.quantidade}` : ''}`
    os.pecas = os.pecas ? `${os.pecas}; ${peca}` : peca
    for (const f of l.fotos ?? []) {
      if (!os.fotos.some((x) => x.id === f.id)) os.fotos.push(f)
    }
  }
  return [...mapa.values()]
})

function abrirOrdem(os) {
  emit('update:modelValue', false)
  router.push(`/listar-os/${os.ordem_id}`)
}

function formatarDataHora(valor) {
  if (!valor) return ''
  const d = new Date(valor)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function abrirFotos(os, indice) {
  viewer.fotos = os.fotos
  viewer.indice = indice
  viewer.titulo = `O.S. ${os.numero}`
  viewer.aberto = true
}

watch(
  () => [props.modelValue, props.cliente?.id],
  async ([aberto, id]) => {
    if (!aberto || !id) return
    carregando.value = true
    erro.value = ''
    linhas.value = []
    try {
      linhas.value = await historicoCliente(id)
    } catch (err) {
      erro.value = err?.response?.data?.message || 'Não foi possível carregar o histórico.'
    } finally {
      carregando.value = false
    }
  },
  { immediate: true }
)
</script>
