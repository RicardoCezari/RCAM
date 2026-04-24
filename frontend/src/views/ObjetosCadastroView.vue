<template>
  <AppLayout>
    <div class="mb-8 flex items-start justify-between gap-4">
      <BasePageTitle
        title="Tipos de objeto"
        description="Gerencie os tipos de peças aceitas para serviço (relógios, anéis, pulseiras, etc.)."
      />
      <button
        type="button"
        class="flex shrink-0 items-center gap-2 rounded-2xl bg-black px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-black/80"
        @click="abrirModalCriar"
      >
        <span class="mdi mdi-plus text-[18px]"></span>
        Novo tipo
      </button>
    </div>

    <!-- Filtro -->
    <div class="mb-4">
      <div class="relative inline-block">
        <span class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-black/40">
          <span class="mdi mdi-magnify text-[16px]"></span>
        </span>
        <input
          v-model="filtroNome"
          type="text"
          placeholder="Buscar por nome..."
          class="h-10 rounded-xl border border-black/10 bg-white pl-8 pr-4 text-sm outline-none transition focus:border-black/30 focus:ring-2 focus:ring-black/10"
        />
      </div>
    </div>

    <!-- Tabela -->
    <BaseDataTable
      :columns="columns"
      :rows="tiposFiltrados"
      :loading="carregando"
      empty-text="Nenhum tipo de objeto cadastrado."
      actions-label="Ações"
    >
      <template #descricao="{ value }">
        <span class="line-clamp-2 text-black/60 italic">{{ value || '—' }}</span>
      </template>

      <template #actions="{ row }">
        <div class="flex items-center justify-end gap-2">
          <button
            type="button"
            class="inline-flex h-9 items-center justify-center rounded-xl border border-black/10 bg-white px-4 text-sm font-medium text-black transition hover:bg-black hover:text-white"
            @click="abrirModalEditar(row)"
          >
            Editar
          </button>
          <button
            type="button"
            class="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 bg-white text-black/50 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            title="Excluir"
            @click="confirmarDeletar(row)"
          >
            <span class="mdi mdi-trash-can-outline text-[16px]"></span>
          </button>
        </div>
      </template>
    </BaseDataTable>

    <!-- Modal Criar / Editar -->
    <BaseModal
      v-model="modalAberto"
      :title="modoEdicao ? 'Editar tipo de objeto' : 'Novo tipo de objeto'"
      :subtitle="modoEdicao ? `ID #${form.id}` : 'Preencha os dados do tipo'"
      :icon="modoEdicao ? 'mdi-pencil-outline' : 'mdi-shape-plus-outline'"
    >
      <form class="px-6 py-5 space-y-4" @submit.prevent="salvar">
        <BaseFormField label="Nome *" :error="errosForm.nome">
          <input
            v-model="form.nome"
            type="text"
            placeholder="Ex: Relógio de pulso"
            class="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-black/30 focus:ring-2 focus:ring-black/10"
            :class="{ 'border-red-400': errosForm.nome }"
            @input="errosForm.nome = ''"
          />
        </BaseFormField>

        <BaseFormField label="Descrição">
          <textarea
            v-model="form.descricao"
            rows="2"
            placeholder="Descrição opcional..."
            class="w-full resize-none rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-black/30 focus:ring-2 focus:ring-black/10"
          ></textarea>
        </BaseFormField>

        <BaseAlert v-if="erroGeral" type="error" :message="erroGeral" />
      </form>

      <template #footer>
        <button
          type="button"
          class="rounded-xl border border-black/10 px-5 py-2.5 text-sm font-medium text-black transition hover:bg-black/5"
          @click="modalAberto = false"
        >
          Cancelar
        </button>
        <button
          type="button"
          :disabled="salvando"
          class="flex items-center gap-2 rounded-xl bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-black/80 disabled:opacity-50"
          @click="salvar"
        >
          <span v-if="salvando" class="mdi mdi-loading animate-spin text-[16px]"></span>
          {{ modoEdicao ? 'Salvar alterações' : 'Criar tipo' }}
        </button>
      </template>
    </BaseModal>

    <!-- Modal confirmação de exclusão -->
    <BaseModal
      v-model="modalDeletarAberto"
      title="Excluir tipo de objeto"
      subtitle="Esta ação não pode ser desfeita"
      icon="mdi-trash-can-outline"
    >
      <div class="px-6 py-5">
        <p class="text-sm text-black/70">
          Deseja excluir o tipo
          <strong class="text-black">{{ tipoParaDeletar?.nome }}</strong>?
        </p>
        <p class="mt-1 text-xs text-black/45">
          Tipos vinculados a ordens de serviço não poderão ser excluídos.
        </p>
        <BaseAlert v-if="erroGeral" type="error" :message="erroGeral" class="mt-3" />
      </div>

      <template #footer>
        <button
          type="button"
          class="rounded-xl border border-black/10 px-5 py-2.5 text-sm font-medium text-black transition hover:bg-black/5"
          @click="modalDeletarAberto = false"
        >
          Cancelar
        </button>
        <button
          type="button"
          :disabled="salvando"
          class="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
          @click="executarDeletar"
        >
          <span v-if="salvando" class="mdi mdi-loading animate-spin text-[16px]"></span>
          Excluir
        </button>
      </template>
    </BaseModal>
  </AppLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/services/api'
import AppLayout from '@/layouts/AppLayout.vue'
import BasePageTitle from '@/components/base/BasePageTitle.vue'
import BaseDataTable from '@/components/base/BaseDataTable.vue'
import BaseModal from '@/components/base/BaseModal.vue'
import BaseFormField from '@/components/base/BaseFormField.vue'
import BaseAlert from '@/components/base/BaseAlert.vue'

// ─── API helpers ────────────────────────────────────────────────────────────
const listar   = ()          => api.get('/tipos-objeto').then(r => r.data)
const criar    = (p)         => api.post('/tipos-objeto', p).then(r => r.data)
const atualizar = (id, p)   => api.put(`/tipos-objeto/${id}`, p).then(r => r.data)
const deletar  = (id)        => api.delete(`/tipos-objeto/${id}`)

// ─── Estado ─────────────────────────────────────────────────────────────────
const tipos    = ref([])
const carregando = ref(false)
const salvando   = ref(false)
const erroGeral  = ref('')
const filtroNome = ref('')

const modalAberto        = ref(false)
const modalDeletarAberto = ref(false)
const modoEdicao         = ref(false)
const tipoParaDeletar    = ref(null)

const formInicial = () => ({ id: null, nome: '', descricao: '' })
const form      = ref(formInicial())
const errosForm = ref({ nome: '' })

// ─── Tabela ──────────────────────────────────────────────────────────────────
const columns = [
  { key: 'nome',      label: 'Nome',      cellClass: 'font-medium text-black' },
  { key: 'descricao', label: 'Descrição', slot: 'descricao', nowrap: false },
]

// ─── Carregamento ────────────────────────────────────────────────────────────
async function carregar() {
  carregando.value = true
  try {
    tipos.value = await listar()
  } finally {
    carregando.value = false
  }
}

onMounted(carregar)

// ─── Filtro ──────────────────────────────────────────────────────────────────
const tiposFiltrados = computed(() => {
  if (!filtroNome.value) return tipos.value
  return tipos.value.filter(t =>
    t.nome.toLowerCase().includes(filtroNome.value.toLowerCase())
  )
})

// ─── Modal criar / editar ────────────────────────────────────────────────────
function abrirModalCriar() {
  modoEdicao.value = false
  form.value = formInicial()
  errosForm.value = { nome: '' }
  erroGeral.value = ''
  modalAberto.value = true
}

function abrirModalEditar(tipo) {
  modoEdicao.value = true
  form.value = { id: tipo.id, nome: tipo.nome, descricao: tipo.descricao || '' }
  errosForm.value = { nome: '' }
  erroGeral.value = ''
  modalAberto.value = true
}

async function salvar() {
  errosForm.value = { nome: '' }
  if (!form.value.nome.trim()) {
    errosForm.value.nome = 'Nome é obrigatório.'
    return
  }
  salvando.value = true
  erroGeral.value = ''
  try {
    const payload = { nome: form.value.nome.trim(), descricao: form.value.descricao.trim() || null }
    if (modoEdicao.value) {
      await atualizar(form.value.id, payload)
    } else {
      await criar(payload)
    }
    modalAberto.value = false
    await carregar()
  } catch (err) {
    erroGeral.value = err?.response?.data?.message || err?.message || 'Ocorreu um erro. Tente novamente.'
  } finally {
    salvando.value = false
  }
}

// ─── Deletar ─────────────────────────────────────────────────────────────────
function confirmarDeletar(tipo) {
  tipoParaDeletar.value = tipo
  erroGeral.value = ''
  modalDeletarAberto.value = true
}

async function executarDeletar() {
  if (!tipoParaDeletar.value) return
  salvando.value = true
  erroGeral.value = ''
  try {
    await deletar(tipoParaDeletar.value.id)
    modalDeletarAberto.value = false
    await carregar()
  } catch (err) {
    erroGeral.value = err?.response?.data?.message || err?.message || 'Erro ao excluir.'
  } finally {
    salvando.value = false
  }
}
</script>
