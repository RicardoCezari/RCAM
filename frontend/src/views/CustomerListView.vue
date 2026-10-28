<template>
  <AppLayout>
    <div class="mb-3 flex items-center justify-between gap-3">
      <BasePageTitle
        title="Lista de clientes"
        description="Clientes cadastrados e histórico de peças."
      />
      <button
        type="button"
        class="flex shrink-0 items-center gap-1.5 rounded-xl bg-black px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-black/80"
        @click="abrirModalCriar"
      >
        <span class="mdi mdi-plus text-[17px]"></span>
        <span class="hidden sm:inline">Novo cliente</span>
        <span class="sm:hidden">Novo</span>
      </button>
    </div>

    <BaseAlert :message="erroLista" class="mb-3" />

    <BaseDataTable
      :columns="columns"
      :rows="clientes"
      :loading="carregando"
      server-side
      :total="total"
      compact
      clickable
      search-placeholder="Nome, CPF, telefone, e-mail..."
      :default-sort="{ key: 'nome', dir: 'asc' }"
      empty-text="Nenhum cliente encontrado."
      @query="aoConsultar"
      @row-click="abrirModalEditar"
    >
      <template #nome="{ value }">
        <span class="block max-w-[24vw] truncate font-medium text-black sm:max-w-none" :title="value">{{ value }}</span>
      </template>

      <template #cpf="{ value }">
        {{ formatarCpf(value) || '—' }}
      </template>

      <template #telefone="{ value }">
        <span class="whitespace-nowrap">{{ formatarTelefone(value) || '—' }}</span>
      </template>

      <template #informacao_adicional="{ value }">
        <span class="block max-w-[220px] truncate" :title="value || ''">{{ value || '—' }}</span>
      </template>

      <template #actions="{ row }">
        <div class="flex items-center justify-end gap-1 sm:gap-1.5">
          <BaseIconButton icon="mdi-history" title="Histórico de peças e fotos" @click="abrirHistorico(row)" />
          <BaseIconButton icon="mdi-file-document-plus-outline" title="Nova O.S. para este cliente" @click="novaOs(row)" />
          <!-- no celular, tocar na linha já abre a edição -->
          <span class="hidden sm:contents">
            <BaseIconButton icon="mdi-pencil" title="Editar cliente" @click="abrirModalEditar(row)" />
          </span>
          <BaseIconButton icon="mdi-trash-can-outline" title="Excluir cliente" variant="danger" @click="confirmarDeletar(row)" />
        </div>
      </template>
    </BaseDataTable>

    <ClienteHistoricoModal v-model="historicoAberto" :cliente="clienteHistorico" />

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
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'
import BasePageTitle from '@/components/base/BasePageTitle.vue'
import BaseDataTable from '@/components/base/BaseDataTable.vue'
import BaseModal from '@/components/base/BaseModal.vue'
import BaseFormField from '@/components/base/BaseFormField.vue'
import BaseAlert from '@/components/base/BaseAlert.vue'
import BaseIconButton from '@/components/base/BaseIconButton.vue'
import BaseConfirmModal from '@/components/base/BaseConfirmModal.vue'
import ClienteHistoricoModal from '@/components/cliente/ClienteHistoricoModal.vue'
import { formatarTelefone, _telefoneValido } from '@/composables/useClienteForm'
import { listarClientes, criarCliente, atualizarCliente, deletarCliente } from '@/services/clientes'
import { useListaServidor } from '@/composables/useListaServidor'

const router = useRouter()

const inputClass =
  'w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-black/30 focus:ring-2 focus:ring-black/10'

const columns = [
  { key: 'nome', label: 'Nome', slot: 'nome' },
  { key: 'cpf', label: 'CPF', slot: 'cpf', hideBelow: 'md' },
  { key: 'telefone', label: 'Telefone', slot: 'telefone' },
  { key: 'email', label: 'E-mail', hideBelow: 'lg' },
  { key: 'informacao_adicional', label: 'Observações', slot: 'informacao_adicional', hideBelow: 'lg', sortable: false },
]

// ─── Lista ───────────────────────────────────────────────────────────────────────────────
// Busca global, filtros por coluna, ordenação e paginação são feitos no servidor
const FILTROS_API = {
  nome: 'nome',
  cpf: 'cpf',
  telefone: 'telefone',
  email: 'email',
  informacao_adicional: 'observacoes',
}

const { linhas: clientes, total, carregando, erro: erroLista, carregar } = useListaServidor(
  (consulta, signal) => {
    const params = { page: consulta.page, limit: consulta.limit }
    if (consulta.q) params.q = consulta.q
    for (const [coluna, valor] of Object.entries(consulta.filtros ?? {})) {
      if (FILTROS_API[coluna]) params[FILTROS_API[coluna]] = valor
    }
    if (consulta.ordenarPor) {
      params.ordenarPor = consulta.ordenarPor
      params.direcao = consulta.direcao
    }
    return listarClientes(params, { signal })
  },
  'Não foi possível carregar os clientes.'
)
const aoConsultar = carregar

const historicoAberto = ref(false)
const clienteHistorico = ref(null)

function abrirHistorico(cliente) {
  clienteHistorico.value = cliente
  historicoAberto.value = true
}

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
