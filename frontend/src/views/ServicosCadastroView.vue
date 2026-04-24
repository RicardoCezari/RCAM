<template>
  <AppLayout>
    <div class="mb-8 flex items-start justify-between gap-4">
      <BasePageTitle
        title="Catálogo de serviços"
        description="Gerencie os serviços e associe-os aos tipos de objeto."
      />
      <button
        type="button"
        class="flex shrink-0 items-center gap-2 rounded-2xl bg-black px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-black/80"
        @click="abrirModalCriar"
      >
        <span class="mdi mdi-plus text-[18px]"></span>
        Novo serviço
      </button>
    </div>

    <!-- Filtros -->
    <div class="mb-4 flex flex-wrap items-center gap-3">
      <div class="relative">
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

      <select
        v-model="filtroTipo"
        class="h-10 rounded-xl border border-black/10 bg-white px-3 text-sm outline-none transition focus:border-black/30 focus:ring-2 focus:ring-black/10"
      >
        <option value="">Todos os tipos</option>
        <option v-for="t in tiposObjeto" :key="t.id" :value="String(t.id)">
          {{ t.nome }}
        </option>
      </select>

      <select
        v-model="filtroAtivo"
        class="h-10 rounded-xl border border-black/10 bg-white px-3 text-sm outline-none transition focus:border-black/30 focus:ring-2 focus:ring-black/10"
      >
        <option value="">Todos os status</option>
        <option value="true">Ativo</option>
        <option value="false">Inativo</option>
      </select>
    </div>

    <!-- Tabela -->
    <BaseDataTable
      :columns="columns"
      :rows="servicosFiltrados"
      :loading="carregando"
      empty-text="Nenhum serviço cadastrado."
      actions-label="Ações"
    >
      <template #valor="{ value }">
        {{ formatarValor(value) }}
      </template>

      <template #tipos="{ row }">
        <div class="flex flex-wrap gap-1">
          <span
            v-for="tipoId in row.tipo_ids"
            :key="tipoId"
            class="inline-flex items-center rounded-lg bg-black/5 px-2.5 py-0.5 text-xs font-medium text-black/70"
          >
            {{ nomeTipo(tipoId) }}
          </span>
          <span
            v-if="!row.tipo_ids || !row.tipo_ids.length"
            class="text-xs text-black/35 italic"
          >
            Universal
          </span>
        </div>
      </template>

      <template #ativo="{ value }">
        <span
          :class="[
            'inline-flex items-center rounded-lg px-2.5 py-0.5 text-xs font-semibold',
            value ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500',
          ]"
        >
          {{ value ? 'Ativo' : 'Inativo' }}
        </span>
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
      :title="modoEdicao ? 'Editar serviço' : 'Novo serviço'"
      :subtitle="modoEdicao ? `ID #${form.id}` : 'Preencha os dados do serviço'"
      :icon="modoEdicao ? 'mdi-pencil-outline' : 'mdi-wrench-cog-outline'"
    >
      <form class="px-6 py-5 space-y-4" @submit.prevent="salvar">
        <BaseFormField label="Nome do serviço *" :error="errosForm.nome">
          <input
            v-model="form.nome"
            type="text"
            placeholder="Ex: Troca de bateria"
            class="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-black/30 focus:ring-2 focus:ring-black/10"
            :class="{ 'border-red-400': errosForm.nome }"
            @input="errosForm.nome = ''"
          />
        </BaseFormField>

        <BaseFormField label="Valor (R$)" :error="errosForm.valor">
          <input
            v-model="valorStr"
            type="text"
            inputmode="numeric"
            placeholder="0,00"
            class="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-black/30 focus:ring-2 focus:ring-black/10"
            :class="{ 'border-red-400': errosForm.valor }"
            @input="aoDigitarValor"
            @blur="aoBlurValor"
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

        <!-- Tipos de objeto (multiselect checkboxes) -->
        <BaseFormField label="Tipos de objeto vinculados">
          <p class="mb-2 text-xs text-black/50">
            Deixe em branco para que o serviço apareça em todos os tipos (universal).
          </p>
          <div
            class="max-h-40 overflow-y-auto rounded-xl border border-black/10 bg-white p-3 space-y-2"
          >
            <label
              v-for="tipo in tiposObjeto"
              :key="tipo.id"
              class="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 transition hover:bg-black/[0.03]"
            >
              <input
                type="checkbox"
                :value="tipo.id"
                v-model="form.tipo_ids"
                class="h-4 w-4 rounded border-black/20 accent-black"
              />
              <span class="text-sm text-black">{{ tipo.nome }}</span>
            </label>
            <p v-if="!tiposObjeto.length" class="text-sm text-black/40 italic">
              Nenhum tipo cadastrado.
            </p>
          </div>
        </BaseFormField>

        <!-- Status (apenas na edição) -->
        <div v-if="modoEdicao" class="flex items-center gap-3">
          <button
            type="button"
            :class="[
              'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
              form.ativo ? 'bg-black' : 'bg-black/20',
            ]"
            @click="form.ativo = !form.ativo"
          >
            <span
              :class="[
                'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition',
                form.ativo ? 'translate-x-5' : 'translate-x-0',
              ]"
            ></span>
          </button>
          <span class="text-sm font-medium text-black">
            {{ form.ativo ? 'Ativo' : 'Inativo' }}
          </span>
        </div>

        <!-- Erro geral -->
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
          <span
            v-if="salvando"
            class="mdi mdi-loading animate-spin text-[16px]"
          ></span>
          {{ modoEdicao ? 'Salvar alterações' : 'Criar serviço' }}
        </button>
      </template>
    </BaseModal>

    <!-- Modal confirmação de exclusão -->
    <BaseModal
      v-model="modalDeletarAberto"
      title="Excluir serviço"
      subtitle="Esta ação não pode ser desfeita"
      icon="mdi-trash-can-outline"
    >
      <div class="px-6 py-5">
        <p class="text-sm text-black/70">
          Deseja excluir o serviço
          <strong class="text-black">{{ servicoParaDeletar?.nome }}</strong>?
        </p>
        <p class="mt-1 text-xs text-black/45">
          Se houver ordens de serviço vinculadas, o serviço será apenas desativado.
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
import AppLayout from '@/layouts/AppLayout.vue'
import BasePageTitle from '@/components/base/BasePageTitle.vue'
import BaseDataTable from '@/components/base/BaseDataTable.vue'
import BaseModal from '@/components/base/BaseModal.vue'
import BaseFormField from '@/components/base/BaseFormField.vue'
import BaseAlert from '@/components/base/BaseAlert.vue'
import {
  listarServicos,
  criarServico,
  atualizarServico,
  deletarServico,
  listarTiposObjeto,
} from '@/services/servicos'

// ─── Estado ────────────────────────────────────────────────────────────────
const servicos     = ref([])
const tiposObjeto  = ref([])
const carregando   = ref(false)
const salvando     = ref(false)
const erroGeral    = ref('')

// filtros
const filtroNome  = ref('')
const filtroTipo  = ref('')
const filtroAtivo = ref('')

// modais
const modalAberto      = ref(false)
const modalDeletarAberto = ref(false)
const modoEdicao       = ref(false)
const servicoParaDeletar = ref(null)

// form
const formInicial = () => ({ id: null, nome: '', valor: 0, descricao: '', ativo: true, tipo_ids: [] })
const form       = ref(formInicial())
const errosForm  = ref({ nome: '', valor: '' })
const valorStr   = ref('')

// ─── Colunas da tabela ──────────────────────────────────────────────────────
const columns = [
  { key: 'nome',  label: 'Nome',             cellClass: 'font-medium text-black' },
  { key: 'valor', label: 'Valor',            slot: 'valor', cellClass: 'text-black/75' },
  { key: 'tipos', label: 'Tipos de objeto',  slot: 'tipos', nowrap: false },
  { key: 'ativo', label: 'Status',           slot: 'ativo' },
]

// ─── Carregamento ───────────────────────────────────────────────────────────
async function carregar() {
  carregando.value = true
  try {
    const [svcs, tipos] = await Promise.all([listarServicos(), listarTiposObjeto()])
    servicos.value    = svcs
    tiposObjeto.value = tipos
  } finally {
    carregando.value = false
  }
}

onMounted(carregar)

// ─── Computed filtros ───────────────────────────────────────────────────────
const servicosFiltrados = computed(() => {
  return servicos.value.filter(s => {
    if (filtroNome.value && !s.nome.toLowerCase().includes(filtroNome.value.toLowerCase())) {
      return false
    }
    if (filtroTipo.value) {
      const tipoId = Number(filtroTipo.value)
      if (!s.tipo_ids || !s.tipo_ids.includes(tipoId)) return false
    }
    if (filtroAtivo.value !== '') {
      const esperado = filtroAtivo.value === 'true'
      if (s.ativo !== esperado) return false
    }
    return true
  })
})

// ─── Helpers ────────────────────────────────────────────────────────────────
function nomeTipo(tipoId) {
  const t = tiposObjeto.value.find(x => x.id === tipoId)
  return t ? t.nome : `#${tipoId}`
}

function formatarValor(valor) {
  if (valor == null) return '—'
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// ─── Máscara monetária ───────────────────────────────────────────────────────
function mascaraMonetaria(raw) {
  const digits  = String(raw || '').replace(/\D/g, '').replace(/^0+/, '') || '0'
  const padded  = digits.padStart(3, '0')
  const intPart = padded.slice(0, -2)
  const decPart = padded.slice(-2)
  return `${parseInt(intPart, 10).toLocaleString('pt-BR')},${decPart}`
}

function parseMoeda(str) {
  const s = String(str || '').replace(/\./g, '').replace(',', '.')
  const n = parseFloat(s)
  return isNaN(n) ? 0 : n
}

function aoDigitarValor(e) {
  errosForm.value.valor = ''
  const digits = e.target.value.replace(/\D/g, '')
  valorStr.value = digits ? mascaraMonetaria(digits) : ''
}

function aoBlurValor() {
  if (!valorStr.value) {
    valorStr.value = ''
    form.value.valor = 0
    return
  }
  const n = parseMoeda(valorStr.value)
  form.value.valor = n
  valorStr.value = mascaraMonetaria(String(Math.round(n * 100)))
}

// ─── Modal criar / editar ────────────────────────────────────────────────────
function abrirModalCriar() {
  modoEdicao.value = false
  form.value = formInicial()
  errosForm.value = { nome: '', valor: '' }
  erroGeral.value = ''
  valorStr.value = ''
  modalAberto.value = true
}

function abrirModalEditar(servico) {
  modoEdicao.value = true
  form.value = {
    id:       servico.id,
    nome:     servico.nome,
    valor:    Number(servico.valor) || 0,
    descricao: servico.descricao || '',
    ativo:    servico.ativo,
    tipo_ids: [...(servico.tipo_ids || [])],
  }
  errosForm.value = { nome: '', valor: '' }
  erroGeral.value = ''
  const cents = Math.round((Number(servico.valor) || 0) * 100)
  valorStr.value = cents > 0 ? mascaraMonetaria(String(cents)) : ''
  modalAberto.value = true
}

function _validarForm() {
  let valido = true
  errosForm.value = { nome: '', valor: '' }
  if (!form.value.nome.trim()) {
    errosForm.value.nome = 'Nome é obrigatório.'
    valido = false
  }
  const v = parseMoeda(valorStr.value)
  if (isNaN(v) || v < 0) {
    errosForm.value.valor = 'Informe um valor válido.'
    valido = false
  }
  return valido
}

async function salvar() {
  if (!_validarForm()) return
  salvando.value = true
  erroGeral.value = ''
  try {
    form.value.valor = parseMoeda(valorStr.value)
    const payload = {
      nome:      form.value.nome.trim(),
      valor:     form.value.valor,
      descricao: form.value.descricao.trim() || null,
      ativo:     form.value.ativo,
      tipo_ids:  form.value.tipo_ids,
    }
    if (modoEdicao.value) {
      await atualizarServico(form.value.id, payload)
    } else {
      await criarServico(payload)
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
function confirmarDeletar(servico) {
  servicoParaDeletar.value = servico
  erroGeral.value = ''
  modalDeletarAberto.value = true
}

async function executarDeletar() {
  if (!servicoParaDeletar.value) return
  salvando.value = true
  erroGeral.value = ''
  try {
    await deletarServico(servicoParaDeletar.value.id)
    modalDeletarAberto.value = false
    await carregar()
  } catch (err) {
    erroGeral.value = err?.response?.data?.message || err?.message || 'Erro ao excluir.'
  } finally {
    salvando.value = false
  }
}
</script>
