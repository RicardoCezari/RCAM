<template>
  <AppLayout>
    <div class="mb-5 flex items-start justify-between gap-3 sm:mb-8 sm:gap-4">
      <BasePageTitle
        title="Lista de clientes"
        description="Gerencie os clientes e acompanhe o cadastro de forma rápida."
      />
      <button
        type="button"
        class="flex shrink-0 items-center gap-2 rounded-2xl bg-black px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-black/80"
        @click="abrirModalCriar"
      >
        <span class="mdi mdi-plus text-[18px]"></span>
        Novo cliente
      </button>
    </div>

    <div class="mb-4 flex flex-wrap items-center gap-3">
      <div class="relative">
        <span class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-black/40">
          <span class="mdi mdi-magnify text-[16px]"></span>
        </span>
        <input
          v-model="filtro"
          type="text"
          placeholder="Buscar por nome, CPF, telefone..."
          class="h-10 w-72 rounded-xl border border-black/10 bg-white pl-8 pr-4 text-sm outline-none transition focus:border-black/30 focus:ring-2 focus:ring-black/10"
        />
      </div>
    </div>

    <BaseAlert :message="erroLista" class="mb-4" />

    <BaseDataTable
      :columns="columns"
      :rows="clientesFiltrados"
      :loading="carregando"
      clickable
      empty-text="Nenhum cliente encontrado."
      @row-click="abrirModalEditar"
    >
      <template #nome="{ value }">
        <span class="font-medium text-black">{{ value }}</span>
      </template>

      <template #cpf="{ value }">
        {{ formatarCpf(value) || '—' }}
      </template>

      <template #telefone="{ value }">
        {{ formatarTelefone(value) || '—' }}
      </template>

      <template #informacao_adicional="{ value }">
        <span class="block max-w-[220px] truncate" :title="value || ''">{{ value || '—' }}</span>
      </template>

      <template #actions="{ row }">
        <div class="flex items-center justify-end gap-2">
          <BaseIconButton icon="mdi-file-document-plus-outline" title="Nova O.S. para este cliente" @click="novaOs(row)" />
          <BaseIconButton icon="mdi-pencil" title="Editar cliente" @click="abrirModalEditar(row)" />
          <BaseIconButton icon="mdi-trash-can-outline" title="Excluir cliente" variant="danger" @click="confirmarDeletar(row)" />
        </div>
      </template>
    </BaseDataTable>

    <!-- Modal criar / editar -->
    <BaseModal
      v-model="modalAberto"
      :title="modoEdicao ? 'Editar cliente' : 'Novo cliente'"
      :subtitle="modoEdicao ? `ID #${form.id}` : 'Preencha os dados do cliente'"
      :icon="modoEdicao ? 'mdi-account-edit-outline' : 'mdi-account-plus-outline'"
    >
      <form class="space-y-4 px-6 py-5" novalidate @submit.prevent="salvar">
        <BaseFormField label="Nome *" :error="errosForm.nome">
          <input
            v-model="form.nome"
            type="text"
            placeholder="Nome completo"
            :class="[inputClass, { 'border-red-400': errosForm.nome }]"
            @input="errosForm.nome = ''"
          />
        </BaseFormField>

        <div class="grid gap-4 sm:grid-cols-2">
          <BaseFormField label="Telefone *" :error="errosForm.telefone">
            <input
              :value="form.telefone"
              type="tel"
              inputmode="numeric"
              placeholder="(00) 00000-0000"
              :class="[inputClass, { 'border-red-400': errosForm.telefone }]"
              @input="aoDigitarTelefone"
            />
          </BaseFormField>

          <BaseFormField label="CPF" optional :error="errosForm.cpf">
            <input
              :value="form.cpf"
              type="text"
              inputmode="numeric"
              placeholder="000.000.000-00"
              :class="[inputClass, { 'border-red-400': errosForm.cpf }]"
              @input="aoDigitarCpf"
            />
          </BaseFormField>
        </div>

        <BaseFormField label="E-mail" optional :error="errosForm.email">
          <input
            v-model="form.email"
            type="email"
            placeholder="cliente@email.com"
            :class="[inputClass, { 'border-red-400': errosForm.email }]"
            @input="errosForm.email = ''"
          />
        </BaseFormField>

        <BaseFormField label="Observações" optional>
          <textarea
            v-model="form.informacao_adicional"
            rows="3"
            placeholder="Informações adicionais sobre o cliente..."
            :class="[inputClass, 'resize-none']"
          ></textarea>
        </BaseFormField>

        <BaseAlert :message="erroForm" />
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
          <span v-else class="mdi mdi-content-save-outline text-[16px]"></span>
          {{ modoEdicao ? 'Salvar alterações' : 'Cadastrar cliente' }}
        </button>
      </template>
    </BaseModal>

    <BaseConfirmModal
      v-model="modalDeletarAberto"
      title="Excluir cliente"
      hint="Clientes com ordens de serviço não podem ser excluídos."
      :error="erroDeletar"
      :loading="salvando"
      @confirm="executarDeletar"
    >
      Deseja excluir o cliente <strong class="text-black">{{ clienteParaDeletar?.nome }}</strong>?
    </BaseConfirmModal>
  </AppLayout>
</template>

<script setup>
import { useToastStore } from '@/stores/toast'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'
import BasePageTitle from '@/components/base/BasePageTitle.vue'
import BaseDataTable from '@/components/base/BaseDataTable.vue'
import BaseModal from '@/components/base/BaseModal.vue'
import BaseFormField from '@/components/base/BaseFormField.vue'
import BaseAlert from '@/components/base/BaseAlert.vue'
import BaseIconButton from '@/components/base/BaseIconButton.vue'
import BaseConfirmModal from '@/components/base/BaseConfirmModal.vue'
import { formatarTelefone, _telefoneValido } from '@/composables/useClienteForm'
import { listarClientes, criarCliente, atualizarCliente, deletarCliente } from '@/services/clientes'

const router = useRouter()

const inputClass =
  'w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-black/30 focus:ring-2 focus:ring-black/10'

const columns = [
  { key: 'nome', label: 'Nome', slot: 'nome' },
  { key: 'cpf', label: 'CPF', slot: 'cpf' },
  { key: 'telefone', label: 'Telefone', slot: 'telefone' },
  { key: 'email', label: 'E-mail' },
  { key: 'informacao_adicional', label: 'Observações', slot: 'informacao_adicional' },
]

// ─── Lista ─────────────────────────────────────────────────────────────────
const clientes = ref([])
const carregando = ref(false)
const erroLista = ref('')
const filtro = ref('')

const clientesFiltrados = computed(() => {
  const termo = filtro.value.trim().toLowerCase()
  if (!termo) return clientes.value
  const digitos = termo.replace(/\D/g, '')

  return clientes.value.filter((c) =>
    c.nome?.toLowerCase().includes(termo) ||
    c.email?.toLowerCase().includes(termo) ||
    (digitos && (c.cpf?.includes(digitos) || c.telefone?.replace(/\D/g, '').includes(digitos)))
  )
})

async function carregar() {
  carregando.value = true
  erroLista.value = ''
  try {
    const res = await listarClientes({ limit: 1000 })
    clientes.value = res.data ?? res
  } catch (err) {
    erroLista.value = err?.response?.data?.message || 'Não foi possível carregar os clientes.'
  } finally {
    carregando.value = false
  }
}

onMounted(carregar)

function formatarCpf(valor) {
  const d = String(valor ?? '').replace(/\D/g, '')
  return d.length === 11 ? d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : valor
}

function novaOs(cliente) {
  router.push({ path: '/nova-os', query: { cliente_id: cliente.id } })
}

// ─── Modal criar / editar ───────────────────────────────────────────────────
const modalAberto = ref(false)
const modoEdicao = ref(false)
const salvando = ref(false)
const erroForm = ref('')

const formInicial = () => ({ id: null, nome: '', telefone: '', cpf: '', email: '', informacao_adicional: '' })
const form = ref(formInicial())
const errosForm = ref({ nome: '', telefone: '', cpf: '', email: '' })

function abrirModalCriar() {
  modoEdicao.value = false
  form.value = formInicial()
  limparErrosForm()
  modalAberto.value = true
}

function abrirModalEditar(cliente) {
  modoEdicao.value = true
  form.value = {
    id: cliente.id,
    nome: cliente.nome ?? '',
    telefone: formatarTelefone(cliente.telefone),
    cpf: formatarCpf(cliente.cpf) ?? '',
    email: cliente.email ?? '',
    informacao_adicional: cliente.informacao_adicional ?? '',
  }
  limparErrosForm()
  modalAberto.value = true
}

function limparErrosForm() {
  errosForm.value = { nome: '', telefone: '', cpf: '', email: '' }
  erroForm.value = ''
}

function aoDigitarTelefone(e) {
  form.value.telefone = formatarTelefone(e.target.value)
  e.target.value = form.value.telefone
  errosForm.value.telefone = ''
}

function aoDigitarCpf(e) {
  const d = e.target.value.replace(/\D/g, '').slice(0, 11)
  form.value.cpf = d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3}\.\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3}\.\d{3}\.\d{3})(\d)/, '$1-$2')
  e.target.value = form.value.cpf
  errosForm.value.cpf = ''
}

function validar() {
  const f = form.value
  const erros = { nome: '', telefone: '', cpf: '', email: '' }

  if (!f.nome.trim()) erros.nome = 'Informe o nome do cliente.'

  const tel = f.telefone.replace(/\D/g, '')
  if (!tel) erros.telefone = 'Informe o telefone.'
  else {
    const check = _telefoneValido(tel)
    if (!check.ok) erros.telefone = check.msg
  }

  if (f.cpf && f.cpf.replace(/\D/g, '').length !== 11) erros.cpf = 'CPF deve ter 11 dígitos.'
  if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) erros.email = 'E-mail inválido.'

  errosForm.value = erros
  return !Object.values(erros).some(Boolean)
}

const toast = useToastStore()

async function salvar() {
  erroForm.value = ''
  if (!validar()) return

  const f = form.value
  const payload = {
    nome: f.nome.trim(),
    telefone: f.telefone.replace(/\D/g, ''),
    cpf: f.cpf.replace(/\D/g, '') || null,
    email: f.email.trim() || null,
    informacao_adicional: f.informacao_adicional.trim() || null,
  }

  salvando.value = true
  try {
    if (modoEdicao.value) await atualizarCliente(f.id, payload)
    else await criarCliente(payload)
    toast.sucesso(modoEdicao.value ? 'Cliente atualizado.' : 'Cliente cadastrado.')
    modalAberto.value = false
    await carregar()
  } catch (err) {
    const msg = err?.response?.data?.message ?? err?.response?.data?.erro
    erroForm.value = err?.response?.status === 409
      ? msg || 'Telefone ou CPF já cadastrado para outro cliente.'
      : msg || 'Não foi possível salvar o cliente.'
  } finally {
    salvando.value = false
  }
}

// ─── Exclusão ───────────────────────────────────────────────────────────────
const modalDeletarAberto = ref(false)
const clienteParaDeletar = ref(null)
const erroDeletar = ref('')

function confirmarDeletar(cliente) {
  clienteParaDeletar.value = cliente
  erroDeletar.value = ''
  modalDeletarAberto.value = true
}

async function executarDeletar() {
  salvando.value = true
  erroDeletar.value = ''
  try {
    await deletarCliente(clienteParaDeletar.value.id)
    toast.sucesso('Cliente excluído.')
    modalDeletarAberto.value = false
    await carregar()
  } catch (err) {
    erroDeletar.value =
      err?.response?.data?.message || 'Não foi possível excluir o cliente.'
  } finally {
    salvando.value = false
  }
}
</script>
