<template>
  <div class="max-w-3xl space-y-3">
    <BaseAlert :message="erro" />

    <section class="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="min-w-0">
          <h2 class="text-base font-semibold text-black">Backup do banco e das fotos</h2>
          <p class="mt-0.5 text-sm text-black/55">
            Pasta de destino:
            <span class="break-all font-mono text-xs text-black/80">{{ situacao?.pasta || '—' }}</span>
          </p>
          <p v-if="situacao" class="text-xs text-black/45">
            {{ situacao.automatico ? `Automático todos os dias às ${situacao.horario}` : 'Backup automático desativado' }}
            · mantém os últimos {{ situacao.retencao }}
          </p>
        </div>

        <button
          type="button"
          :disabled="executando || situacao?.em_andamento"
          class="flex items-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-black/80 disabled:opacity-50"
          @click="efetuar"
        >
          <span :class="['mdi text-[18px]', executando ? 'mdi-loading animate-spin' : 'mdi-database-arrow-down-outline']"></span>
          {{ executando ? 'Fazendo backup...' : 'Efetuar backup agora' }}
        </button>
      </div>

      <div
        v-if="situacao?.ultimo"
        :class="[
          'mt-3 flex items-start gap-2 rounded-xl px-3 py-2 text-sm',
          situacao.ultimo.sucesso ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700',
        ]"
      >
        <span :class="['mdi mt-0.5 text-[16px]', situacao.ultimo.sucesso ? 'mdi-check-circle-outline' : 'mdi-alert-circle-outline']"></span>
        <span v-if="situacao.ultimo.sucesso">
          Último backup {{ formatarDataHora(situacao.ultimo.concluido_em) }}
          ({{ situacao.ultimo.origem === 'automatico' ? 'automático' : 'manual' }}) —
          {{ situacao.ultimo.fotos_copiadas }} foto(s) nova(s) copiada(s).
        </span>
        <span v-else>
          Falha no último backup ({{ formatarDataHora(situacao.ultimo.concluido_em) }}): {{ situacao.ultimo.erro }}
        </span>
      </div>
      <p v-else-if="situacao" class="mt-3 text-sm text-black/50">Nenhum backup realizado ainda.</p>
    </section>

    <BaseDataTable
      :columns="columns"
      :rows="situacao?.backups ?? []"
      :loading="carregando"
      compact
      row-key="nome"
      search-placeholder="Buscar backup..."
      :default-sort="{ key: 'data', dir: 'desc' }"
      empty-text="Nenhum backup do banco encontrado."
    >
      <template #data="{ row }">{{ formatarDataHora(row.data) }}</template>
      <template #tamanho="{ row }">{{ formatarTamanho(row.tamanho) }}</template>
      <template #actions="{ row }">
        <BaseIconButton icon="mdi-download-outline" title="Baixar arquivo .sql" @click="baixar(row.nome)" />
      </template>
    </BaseDataTable>

    <p class="text-xs text-black/45">
      Cada backup grava um arquivo .sql do banco; as fotos são copiadas para a subpasta "fotos" (apenas as novas).
      Para restaurar o banco: <span class="font-mono">psql -d NOME_DO_BANCO -f arquivo.sql</span>.
    </p>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import BaseAlert from '@/components/base/BaseAlert.vue'
import BaseDataTable from '@/components/base/BaseDataTable.vue'
import BaseIconButton from '@/components/base/BaseIconButton.vue'
import { situacaoBackup, executarBackup, baixarBackup } from '@/services/backup'
import { useToastStore } from '@/stores/toast'

const toast = useToastStore()

const situacao = ref(null)
const carregando = ref(false)
const executando = ref(false)
const erro = ref('')

const columns = [
  { key: 'nome', label: 'Arquivo' },
  { key: 'data', label: 'Data', slot: 'data', filterValue: (r) => formatarDataHora(r.data) },
  { key: 'tamanho', label: 'Tamanho', slot: 'tamanho', filter: false, hideBelow: 'sm' },
]

function formatarDataHora(valor) {
  const d = new Date(valor)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function formatarTamanho(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

async function carregar() {
  carregando.value = true
  try {
    situacao.value = await situacaoBackup()
  } catch (err) {
    erro.value = err?.response?.data?.message || 'Não foi possível carregar os backups.'
  } finally {
    carregando.value = false
  }
}

async function efetuar() {
  executando.value = true
  erro.value = ''
  try {
    await executarBackup()
    toast.sucesso('Backup concluído.')
  } catch (err) {
    erro.value = err?.response?.data?.message || 'Não foi possível efetuar o backup.'
  } finally {
    executando.value = false
    await carregar()
  }
}

async function baixar(nome) {
  try {
    await baixarBackup(nome)
  } catch {
    toast.erro('Não foi possível baixar o backup.')
  }
}

onMounted(carregar)
</script>
