<template>
  <div>
    <div class="mb-4 flex items-center justify-between gap-3">
      <p class="text-sm text-black/55">Gerencie quem acessa o sistema e o perfil de cada usuário.</p>
      <button
        type="button"
        class="flex shrink-0 items-center gap-2 rounded-2xl bg-black px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-black/80"
        @click="abrirCriar"
      >
        <span class="mdi mdi-plus text-[18px]"></span>
        <span class="hidden sm:inline">Novo usuário</span>
        <span class="sm:hidden">Novo</span>
      </button>
    </div>

    <BaseAlert :message="erroLista" />

    <BaseDataTable
      :columns="columns"
      :rows="usuarios"
      :loading="carregando"
      empty-text="Nenhum usuário cadastrado."
      actions-label="Ações"
      compact
    >
      <template #nome="{ row }">
        <span class="whitespace-nowrap font-medium text-black">{{ row.nome }}</span>
        <span v-if="row.id === auth.usuario?.id" class="ml-1.5 text-xs text-black/40">(você)</span>
      </template>

      <template #login="{ value }">
        <span class="whitespace-nowrap text-black/70">{{ value }}</span>
      </template>

      <template #perfil="{ value }">
        <span
          :class="[
            'inline-flex items-center rounded-lg px-2.5 py-0.5 text-xs font-semibold',
            value === 'ADMIN' ? 'bg-black text-white' : 'bg-black/5 text-black/70',
          ]"
        >
          {{ value === 'ADMIN' ? 'Administrador' : 'Editor' }}
        </span>
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

      <template #tem_pin="{ value }">
        <span
          :class="[
            'inline-flex items-center gap-1 rounded-lg px-2.5 py-0.5 text-xs font-semibold',
            value ? 'bg-black/5 text-black/70' : 'text-black/30',
          ]"
        >
          <span v-if="value" class="mdi mdi-dialpad text-[14px]"></span>
          {{ value ? 'PIN' : '—' }}
        </span>
      </template>

      <template #actions="{ row }">
        <div class="flex items-center justify-end gap-2">
          <BaseIconButton icon="mdi-pencil" title="Editar usuário" @click="abrirEditar(row)" />
        </div>
      </template>
    </BaseDataTable>

    <BaseModal
      v-model="modalAberto"
      :title="modoEdicao ? 'Editar usuário' : 'Novo usuário'"
      :subtitle="modoEdicao ? form.login : 'Preencha os dados de acesso'"
      :icon="modoEdicao ? 'mdi-account-edit-outline' : 'mdi-account-plus-outline'"
    >
      <form class="space-y-4 px-6 py-5" @submit.prevent="salvar">
        <BaseFormField label="Nome" required :error="erros.nome">
          <input
            v-model="form.nome"
            type="text"
            maxlength="100"
            :class="[inputClass, { 'border-red-400': erros.nome }]"
            @input="erros.nome = ''"
          />
        </BaseFormField>

        <BaseFormField label="Login" required :error="erros.login">
          <input
            v-model="form.login"
            type="text"
            maxlength="50"
            autocomplete="off"
            :class="[inputClass, { 'border-red-400': erros.login }]"
            @input="erros.login = ''"
          />
        </BaseFormField>

        <BaseFormField
          :label="modoEdicao ? 'Nova senha' : 'Senha'"
          :required="!senhaOpcional"
          :optional="senhaOpcional"
          :error="erros.senha"
        >
          <input
            v-model="form.senha"
            type="password"
            autocomplete="new-password"
            :placeholder="modoEdicao ? 'Deixe em branco para manter' : senhaOpcional ? 'Em branco = entra só com PIN' : 'Mínimo 6 caracteres'"
            :class="[inputClass, { 'border-red-400': erros.senha }]"
            @input="erros.senha = ''"
          />
        </BaseFormField>

        <BaseFormField label="PIN de entrada rápida" optional :error="erros.pin">
          <div class="flex items-center gap-2">
            <input
              v-model="form.pin"
              type="password"
              inputmode="numeric"
              pattern="[0-9]*"
              autocomplete="off"
              :maxlength="config.pinTamanho"
              :placeholder="form.tem_pin ? 'Digite para trocar o PIN' : `${config.pinTamanho} dígitos`"
              data-testid="campo-pin"
              :class="[inputClass, { 'border-red-400': erros.pin }]"
              @input="form.pin = form.pin.replace(/\D/g, ''); erros.pin = ''"
            />
            <button
              v-if="modoEdicao && form.tem_pin"
              type="button"
              class="shrink-0 rounded-xl border border-black/10 px-3 py-2.5 text-sm font-medium text-black/70 transition hover:bg-black/5"
              @click="removerPinAtual"
            >
              Remover PIN
            </button>
          </div>
          <p class="mt-1 text-xs text-black/45">
            Permite entrar tocando no perfil, apenas em aparelhos autorizados. Sem PIN, o usuário não aparece na tela de perfis.
          </p>
        </BaseFormField>

        <BaseFormField label="Perfil">
          <div class="grid grid-cols-2 gap-2">
            <label
              v-for="op in perfis"
              :key="op.valor"
              :class="[
                'relative flex cursor-pointer flex-col rounded-xl border px-4 py-3 transition',
                form.perfil === op.valor ? 'border-black bg-black/[0.03]' : 'border-black/10 hover:bg-black/[0.02]',
              ]"
            >
              <input v-model="form.perfil" type="radio" :value="op.valor" class="sr-only" />
              <span class="text-sm font-semibold text-black">{{ op.nome }}</span>
              <span class="mt-0.5 text-xs text-black/50">{{ op.descricao }}</span>
            </label>
          </div>
        </BaseFormField>

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
          <span class="text-sm font-medium text-black">{{ form.ativo ? 'Ativo' : 'Inativo (sem acesso)' }}</span>
        </div>

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
          {{ modoEdicao ? 'Salvar alterações' : 'Criar usuário' }}
        </button>
      </template>
    </BaseModal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import BaseDataTable from '@/components/base/BaseDataTable.vue'
import BaseModal from '@/components/base/BaseModal.vue'
import BaseFormField from '@/components/base/BaseFormField.vue'
import BaseAlert from '@/components/base/BaseAlert.vue'
import BaseIconButton from '@/components/base/BaseIconButton.vue'
import { listarUsuarios, criarUsuario, atualizarUsuario } from '@/services/usuarios'
import { definirPin, removerPin } from '@/services/dispositivo'
import { useAuthStore } from '@/stores/auth'
import { useConfigStore } from '@/stores/config'
import { useToastStore } from '@/stores/toast'

const auth = useAuthStore()
const config = useConfigStore()
const toast = useToastStore()

const inputClass =
  'w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-black/30 focus:ring-2 focus:ring-black/10'

const perfis = [
  { valor: 'EDITOR', nome: 'Editor', descricao: 'Ordens de serviço e clientes' },
  { valor: 'ADMIN', nome: 'Administrador', descricao: 'Acesso total e administração' },
]

const columns = [
  { key: 'nome', label: 'Nome', slot: 'nome' },
  { key: 'login', label: 'Login', slot: 'login' },
  { key: 'perfil', label: 'Perfil', slot: 'perfil' },
  { key: 'tem_pin', label: 'PIN', slot: 'tem_pin' },
  {
    key: 'ativo', label: 'Status', slot: 'ativo',
    filterOptions: [{ value: 'Ativo', label: 'Ativo' }, { value: 'Inativo', label: 'Inativo' }],
    filterValue: (r) => (r.ativo ? 'Ativo' : 'Inativo'),
  },
]

const usuarios = ref([])
const carregando = ref(false)
const salvando = ref(false)
const erroLista = ref('')
const erroGeral = ref('')

const modalAberto = ref(false)
const modoEdicao = ref(false)
const formInicial = () => ({ id: null, nome: '', login: '', senha: '', pin: '', tem_pin: false, perfil: 'EDITOR', ativo: true })
const form = ref(formInicial())
const erros = ref({ nome: '', login: '', senha: '', pin: '' })

// Editor pode ser criado sem senha (entra só por PIN); administrador sempre precisa de senha
const senhaOpcional = computed(() => modoEdicao.value || form.value.perfil === 'EDITOR')

async function carregar() {
  carregando.value = true
  erroLista.value = ''
  try {
    usuarios.value = await listarUsuarios()
  } catch (err) {
    erroLista.value = err.response?.data?.message || 'Não foi possível carregar os usuários'
  } finally {
    carregando.value = false
  }
}

function abrirCriar() {
  modoEdicao.value = false
  form.value = formInicial()
  erros.value = { nome: '', login: '', senha: '', pin: '' }
  erroGeral.value = ''
  modalAberto.value = true
}

function abrirEditar(usuario) {
  modoEdicao.value = true
  form.value = { ...formInicial(), ...usuario, senha: '', pin: '' }
  erros.value = { nome: '', login: '', senha: '', pin: '' }
  erroGeral.value = ''
  modalAberto.value = true
}

function validar() {
  const e = { nome: '', login: '', senha: '', pin: '' }
  if (!form.value.nome.trim()) e.nome = 'Informe o nome'
  if (!form.value.login.trim()) e.login = 'Informe o login'
  if (!modoEdicao.value && !form.value.senha && senhaOpcional.value) {
    if (!form.value.pin) e.pin = 'Informe uma senha ou um PIN'
  } else if ((!modoEdicao.value || form.value.senha) && form.value.senha.length < 6) {
    e.senha = 'A senha deve ter no mínimo 6 caracteres'
  }
  if (form.value.pin && form.value.pin.length !== config.pinTamanho) {
    e.pin = `O PIN deve ter ${config.pinTamanho} dígitos`
  }
  erros.value = e
  return !e.nome && !e.login && !e.senha && !e.pin
}

async function removerPinAtual() {
  erroGeral.value = ''
  try {
    await removerPin(form.value.id)
    form.value.tem_pin = false
    toast.sucesso('PIN removido.')
    await carregar()
  } catch (err) {
    erroGeral.value = err.response?.data?.message || 'Não foi possível remover o PIN'
  }
}

async function salvar() {
  if (!validar()) return
  salvando.value = true
  erroGeral.value = ''

  const payload = {
    nome: form.value.nome.trim(),
    login: form.value.login.trim(),
    perfil: form.value.perfil,
  }
  if (form.value.senha) payload.senha = form.value.senha
  if (!modoEdicao.value && form.value.pin) payload.pin = form.value.pin

  try {
    if (modoEdicao.value) {
      payload.ativo = form.value.ativo
      await atualizarUsuario(form.value.id, payload)
      if (form.value.id === auth.usuario?.id) await auth.carregarPerfil(true)
      if (form.value.pin) await definirPin(form.value.id, form.value.pin)
    } else {
      await criarUsuario(payload)
    }
    modalAberto.value = false
    toast.sucesso(modoEdicao.value ? 'Usuário atualizado.' : 'Usuário criado.')
    await carregar()
  } catch (err) {
    erroGeral.value = err.response?.data?.message || 'Não foi possível salvar o usuário'
  } finally {
    salvando.value = false
  }
}

onMounted(carregar)
</script>
