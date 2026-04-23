<template>
  <AppLayout>
    <!-- ── SUCESSO ──────────────────────────────────────────── -->
    <transition name="success-fade">
      <div v-if="etapa === 'sucesso'" class="flex flex-col items-center justify-center py-16 text-center">
        <div class="relative mb-6">
          <div class="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-50 ring-8 ring-emerald-50/50">
            <span class="mdi mdi-check-circle text-[52px] text-emerald-500"></span>
          </div>
          <div
            class="absolute inset-0 animate-ping rounded-full bg-emerald-100 opacity-40"
            style="animation-duration:1.4s;animation-iteration-count:2"
          ></div>
        </div>

        <h2 class="text-2xl font-semibold text-slate-900 sm:text-3xl">Cliente cadastrado!</h2>
        <p class="mt-2 max-w-xs text-sm leading-6 text-slate-500">
          <strong class="text-slate-700">{{ clienteCriado?.nome }}</strong> foi adicionado com sucesso.
        </p>

        <div class="mt-8 flex flex-col gap-3 sm:flex-row">
          <RouterLink
            :to="{ path: '/nova-os', query: { cliente_id: clienteCriado?.id, nome: clienteCriado?.nome } }"
            class="flex items-center gap-2 rounded-xl bg-black px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-px hover:bg-black/85"
          >
            <span class="mdi mdi-file-document-plus-outline text-[18px]"></span>
            Abrir O.S. agora
          </RouterLink>
          <button
            type="button"
            class="flex items-center gap-2 rounded-xl border border-black/10 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:-translate-y-px hover:bg-slate-50"
            @click="reiniciar"
          >
            <span class="mdi mdi-account-plus-outline text-[18px]"></span>
            Cadastrar outro
          </button>
          <button
            type="button"
            class="flex items-center gap-2 rounded-xl border border-black/10 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:-translate-y-px hover:bg-slate-50"
            @click="abrirModal"
          >
            <span class="mdi mdi-pencil-outline text-[18px]"></span>
            Corrigir dados
          </button>
        </div>
      </div>
    </transition>

    <!-- ── FORMULÁRIO ───────────────────────────────────────── -->
    <transition name="etapa">
      <div v-if="etapa === 'form'">
        <div class="mb-2 flex items-center gap-2 text-sm text-slate-400">
          <RouterLink to="/" class="transition hover:text-slate-700">Início</RouterLink>
          <span class="mdi mdi-chevron-right text-[16px]"></span>
          <span class="font-medium text-slate-700">Novo cliente</span>
        </div>
        <h1 class="mt-4 text-2xl font-semibold text-slate-900">Novo cliente</h1>

        <BaseAlert :message="erroGlobal" class="mb-6 mt-3" />

        <form
          class="rounded-2xl border border-black/8 bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,0.06)] sm:p-8"
          novalidate
          @submit.prevent="handleSubmit"
        >
          <!-- ── TELEFONE ──────────────────────────────────── -->
          <BaseFormField id="telefone" label="Telefone" optional :error="erros.telefone" class="mb-5">
            <div class="relative">
              <input
                id="telefone"
                v-model="form.telefone"
                type="tel"
                maxlength="15"
                placeholder="(00) 00000-0000"
                autocomplete="off"
                :class="[inputClass('telefone'), clienteVinculado ? 'pr-20' : 'pr-10']"
                @input="aoDigitarTelefone"
                @blur="touch('telefone')"
              />
              <div class="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                <span v-if="buscandoTel" class="mdi mdi-loading animate-spin text-[15px] text-slate-400"></span>
                <button
                  v-if="clienteVinculado"
                  type="button"
                  class="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-500 transition hover:bg-slate-200"
                  @click="desvincular"
                >
                  <span class="mdi mdi-close text-[11px]"></span>
                  limpar
                </button>
              </div>

              <transition name="slide-down">
                <div
                  v-if="sugestaoTel && !clienteVinculado && !avisoSubstituirTel"
                  class="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.12)]"
                >
                  <button
                    type="button"
                    class="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
                    @mousedown.prevent="vincularCliente(sugestaoTel)"
                  >
                    <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black text-[11px] font-bold text-white">
                      {{ iniciais(sugestaoTel.nome) }}
                    </div>
                    <div class="min-w-0">
                      <p class="truncate text-sm font-medium text-slate-900">{{ sugestaoTel.nome }}</p>
                      <p class="text-xs text-slate-400">{{ sugestaoTel.telefone }}</p>
                    </div>
                    <span class="ml-auto shrink-0 text-xs text-slate-400">selecionar</span>
                  </button>
                </div>
              </transition>

              <transition name="slide-down">
                <div
                  v-if="avisoSubstituirTel && clienteVinculado"
                  class="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.12)]"
                >
                  <div class="px-4 py-3">
                    <p class="mb-3 text-sm text-slate-700">
                      <span class="mdi mdi-information-outline mr-1 text-[14px] text-slate-400"></span>
                      <strong>{{ clienteVinculado.nome }}</strong> tem <strong>{{ telOriginal }}</strong> cadastrado. O que deseja fazer?
                    </p>
                    <div class="flex gap-2">
                      <button
                        type="button"
                        :disabled="loadingSubstituir"
                        class="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-black px-3 py-2 text-xs font-semibold text-white transition hover:bg-black/85 disabled:opacity-60"
                        @mousedown.prevent="substituirTelefone"
                      >
                        <span v-if="loadingSubstituir" class="mdi mdi-loading animate-spin text-[13px]"></span>
                        <span v-else class="mdi mdi-phone-sync-outline text-[13px]"></span>
                        {{ loadingSubstituir ? 'Atualizando...' : 'Substituir número' }}
                      </button>
                      <button
                        type="button"
                        class="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                        @mousedown.prevent="reverterTelefone"
                      >
                        <span class="mdi mdi-undo text-[13px]"></span>
                        Manter original
                      </button>
                    </div>
                  </div>
                </div>
              </transition>
            </div>
          </BaseFormField>

          <!-- ── NOME ─────────────────────────────────────── -->
          <BaseFormField
            id="nome"
            label="Nome completo"
            required
            :error="!clienteVinculado ? erros.nome : ''"
            class="mb-5"
          >
            <div class="relative">
              <input
                id="nome"
                ref="inputNome"
                v-model="form.nome"
                type="text"
                :placeholder="clienteVinculado ? '' : 'Ex: José da Silva'"
                autocomplete="off"
                :disabled="!!clienteVinculado"
                :class="[
                  clienteVinculado
                    ? 'w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none'
                    : inputClass('nome'),
                ]"
                @blur="touch('nome')"
              />
              <span
                v-if="buscandoNome"
                class="mdi mdi-loading animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-[15px] text-slate-400"
              ></span>

              <transition name="slide-down">
                <div
                  v-if="sugestoesNome.length && !clienteVinculado"
                  class="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.12)]"
                >
                  <button
                    v-for="c in sugestoesNome"
                    :key="c.id"
                    type="button"
                    class="flex w-full items-center gap-3 border-t border-black/5 px-4 py-3 text-left transition first:border-0 hover:bg-slate-50"
                    @mousedown.prevent="vincularCliente(c)"
                  >
                    <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black text-[11px] font-bold text-white">
                      {{ iniciais(c.nome) }}
                    </div>
                    <div class="min-w-0 flex-1">
                      <p class="truncate text-sm font-medium text-slate-900">{{ c.nome }}</p>
                      <p class="text-xs text-slate-400">
                        <span v-if="c.telefone">{{ c.telefone }}</span>
                        <span v-else class="italic">Sem telefone</span>
                      </p>
                    </div>
                    <span class="ml-auto shrink-0 text-xs text-slate-400">selecionar</span>
                  </button>
                </div>
              </transition>
            </div>
          </BaseFormField>

          <!-- ── CPF + EMAIL ──────────────────────────────── -->
          <div class="mb-5 grid gap-5 sm:grid-cols-2">
            <BaseFormField id="cpf" label="CPF" optional :error="erros.cpf">
              <input
                id="cpf"
                v-model="form.cpf"
                type="text"
                maxlength="14"
                inputmode="numeric"
                placeholder="000.000.000-00"
                :class="inputClass('cpf')"
                @input="mascaraCpf"
                @blur="touch('cpf')"
              />
            </BaseFormField>

            <BaseFormField id="email" label="E-mail" optional :error="erros.email">
              <input
                id="email"
                v-model="form.email"
                type="email"
                placeholder="exemplo@email.com"
                autocomplete="email"
                :class="inputClass('email')"
                @blur="touch('email')"
              />
            </BaseFormField>
          </div>

          <!-- ── OBSERVAÇÕES ──────────────────────────────── -->
          <BaseFormField id="info" label="Observações" optional class="mb-5">
            <textarea
              id="info"
              v-model="form.informacao_adicional"
              rows="3"
              placeholder="Endereço, referência, anotações..."
              class="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-black focus:bg-white focus:ring-2 focus:ring-black/10"
            ></textarea>
          </BaseFormField>

          <!-- ── AÇÕES ────────────────────────────────────── -->
          <div class="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <RouterLink
              to="/"
              class="flex items-center justify-center gap-2 rounded-xl border border-black/10 px-6 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Cancelar
            </RouterLink>

            <RouterLink
              v-if="clienteVinculado && !avisoSubstituirTel"
              :to="{ path: '/nova-os', query: { cliente_id: clienteVinculado.id, nome: clienteVinculado.nome } }"
              class="flex items-center justify-center gap-2 rounded-xl bg-black px-8 py-3 text-sm font-semibold text-white transition hover:-translate-y-px hover:bg-black/85"
            >
              <span class="mdi mdi-file-document-plus-outline text-[18px]"></span>
              Nova O.S. para este cliente
            </RouterLink>

            <button
              v-if="clienteVinculado && avisoSubstituirTel"
              type="button"
              disabled
              class="flex cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-black/40 px-8 py-3 text-sm font-semibold text-white"
            >
              <span class="mdi mdi-alert-outline text-[18px]"></span>
              Resolva o número acima
            </button>

            <button
              v-if="!clienteVinculado"
              type="submit"
              :disabled="loading"
              class="flex items-center justify-center gap-2 rounded-xl bg-black px-8 py-3 text-sm font-semibold text-white transition hover:-translate-y-px hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span v-if="loading" class="mdi mdi-loading animate-spin text-[18px]"></span>
              <span v-else class="mdi mdi-account-plus-outline text-[18px]"></span>
              {{ loading ? 'Cadastrando...' : 'Cadastrar cliente' }}
            </button>
          </div>
        </form>
      </div>
    </transition>

    <!-- ── MODAL DE EDIÇÃO ──────────────────────────────────── -->
    <BaseModal
      v-model="modalAberto"
      title="Editar cliente"
      subtitle="Corrija os dados cadastrados"
      icon="mdi-pencil-outline"
    >
      <div class="space-y-4 px-6 py-5">
        <BaseAlert :message="erroModal" />
        <BaseAlert type="success" :message="sucessoModal ? 'Dados atualizados com sucesso!' : ''" />

        <BaseFormField
          id="modal-nome"
          label="Nome completo"
          required
          :error="tocadosModal.nome && errosModal.nome ? errosModal.nome : ''"
          label-class="text-xs font-medium text-slate-600"
        >
          <input
            id="modal-nome"
            v-model="modal.nome"
            type="text"
            placeholder="Nome do cliente"
            :class="modalInputClass('nome')"
            @blur="touchModal('nome')"
          />
        </BaseFormField>

        <div class="grid grid-cols-2 gap-4">
          <BaseFormField id="modal-telefone" label="Telefone" label-class="text-xs font-medium text-slate-600">
            <input
              id="modal-telefone"
              v-model="modal.telefone"
              type="tel"
              maxlength="15"
              placeholder="(00) 00000-0000"
              :class="modalInputClass('telefone')"
              @input="mascaraTelefoneModal"
            />
          </BaseFormField>

          <BaseFormField
            id="modal-cpf"
            label="CPF"
            :error="tocadosModal.cpf && errosModal.cpf ? errosModal.cpf : ''"
            label-class="text-xs font-medium text-slate-600"
          >
            <input
              id="modal-cpf"
              v-model="modal.cpf"
              type="text"
              maxlength="14"
              inputmode="numeric"
              placeholder="000.000.000-00"
              :class="modalInputClass('cpf')"
              @input="mascaraCpfModal"
            />
          </BaseFormField>
        </div>

        <BaseFormField
          id="modal-email"
          label="E-mail"
          :error="tocadosModal.email && errosModal.email ? errosModal.email : ''"
          label-class="text-xs font-medium text-slate-600"
        >
          <input
            id="modal-email"
            v-model="modal.email"
            type="email"
            placeholder="exemplo@email.com"
            :class="modalInputClass('email')"
            @blur="touchModal('email')"
          />
        </BaseFormField>

        <BaseFormField id="modal-obs" label="Observações" label-class="text-xs font-medium text-slate-600">
          <textarea
            id="modal-obs"
            v-model="modal.informacao_adicional"
            rows="2"
            placeholder="Endereço, referência, anotações..."
            class="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-black focus:bg-white focus:ring-2 focus:ring-black/10"
          ></textarea>
        </BaseFormField>
      </div>

      <template #footer>
        <button
          type="button"
          class="rounded-xl border border-black/10 px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          @click="fecharModal"
        >
          Cancelar
        </button>
        <button
          type="button"
          :disabled="loadingModal"
          class="flex items-center gap-2 rounded-xl bg-black px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-black/85 disabled:opacity-60"
          @click="salvarEdicao"
        >
          <span v-if="loadingModal" class="mdi mdi-loading animate-spin text-[16px]"></span>
          <span v-else class="mdi mdi-content-save-outline text-[16px]"></span>
          {{ loadingModal ? 'Salvando...' : 'Salvar alterações' }}
        </button>
      </template>
    </BaseModal>
  </AppLayout>
</template>

<script setup>
import { reactive, ref, nextTick, watch } from 'vue'
import AppLayout from '@/layouts/AppLayout.vue'
import BaseFormField from '@/components/base/BaseFormField.vue'
import BaseAlert from '@/components/base/BaseAlert.vue'
import BaseModal from '@/components/base/BaseModal.vue'
import { criarCliente, atualizarCliente, buscarClientePorTelefone, listarClientes } from '@/services/clientes'

// ─── estado ──────────────────────────────────────────────────
const etapa         = ref('form') // 'form' | 'sucesso'
const loading       = ref(false)
const erroGlobal    = ref('')
const tocados       = reactive({})
const clienteCriado = ref(null)
const inputNome     = ref(null)

const form = reactive({ nome: '', telefone: '', cpf: '', email: '', informacao_adicional: '' })
const erros = reactive({ nome: '', telefone: '', cpf: '', email: '' })

// ─── busca por nome (autocomplete) ───────────────────────────
const buscandoNome  = ref(false)
const sugestoesNome = ref([])
let timerNome = null

// ─── busca por telefone ──────────────────────────────────────
const buscandoTel        = ref(false)
const sugestaoTel        = ref(null)
const clienteVinculado   = ref(null)
const telOriginal        = ref('')
const avisoSubstituirTel = ref(false)
const loadingSubstituir  = ref(false)


// watch no nome: só ativa quando não há cliente vinculado
watch(() => form.nome, (val) => {
  if (clienteVinculado.value) return
  sugestoesNome.value = []
  clearTimeout(timerNome)
  const q = val.trim()
  if (q.length < 2) {
    buscandoNome.value = false
    return
  }
  buscandoNome.value = true
  timerNome = setTimeout(async () => {
    try {
      const res = await listarClientes({ q, limit: 6, page: 1 })
      sugestoesNome.value = res.data || []
    } catch (e) {
      console.error('[autocomplete nome]', e)
      sugestoesNome.value = []
    } finally {
      buscandoNome.value = false
    }
  }, 350)
})

function numDigitos(v) { return (v || '').replace(/\D/g, '').length }

function aoDigitarTelefone(e) {
  // máscara: sempre formato celular (11) 00000-0000 — 11 dígitos
  let d = e.target.value.replace(/\D/g, '').slice(0, 11)
  let v = d
  if (d.length > 2 && d.length <= 7)  v = `(${d.slice(0,2)}) ${d.slice(2)}`
  else if (d.length > 7)              v = `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
  else if (d.length === 2)            v = `(${d})`
  form.telefone = v

  // se já vinculou um cliente, mostra aviso em vez de buscar
  if (clienteVinculado.value) {
    sugestaoTel.value = null
    avisoSubstituirTel.value = (v !== telOriginal.value)
    return
  }

  sugestaoTel.value = null
  avisoSubstituirTel.value = false
  // só busca com 11 dígitos (celular completo)
  if (d.length === 11) buscarPorTelefone(d)
}

async function buscarPorTelefone(digits) {
  buscandoTel.value = true
  try {
    const cliente = await buscarClientePorTelefone(digits)
    sugestaoTel.value = cliente || null
  } catch {
    sugestaoTel.value = null
  } finally {
    buscandoTel.value = false
  }
}

function vincularCliente(c) {
  // formata o telefone no padrão celular (11) 00000-0000
  const d = (c.telefone || '').replace(/\D/g, '').slice(0, 11)
  let fmt = d
  if (d.length > 7) fmt = `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`

  clienteVinculado.value = c
  form.nome = c.nome
  form.telefone = fmt || c.telefone || ''
  telOriginal.value = form.telefone
  sugestaoTel.value = null
  sugestoesNome.value = []
  avisoSubstituirTel.value = false
}

function desvincular() {
  clienteVinculado.value = null
  sugestaoTel.value = null
  sugestoesNome.value = []
  avisoSubstituirTel.value = false
  telOriginal.value = ''
  form.telefone = ''
  form.nome = ''
  nextTick(() => document.getElementById('telefone')?.focus())
}

async function substituirTelefone() {
  loadingSubstituir.value = true
  try {
    const atualizado = await atualizarCliente(clienteVinculado.value.id, {
      ...clienteVinculado.value,
      telefone: form.telefone.trim() || null,
    })
    clienteVinculado.value = atualizado
    telOriginal.value = form.telefone
    avisoSubstituirTel.value = false
  } catch {
    reverterTelefone()
  } finally {
    loadingSubstituir.value = false
  }
}

function reverterTelefone() {
  form.telefone = telOriginal.value
  avisoSubstituirTel.value = false
}

// ─── helpers ─────────────────────────────────────────────────
function iniciais(nome) {
  return (nome || '').split(' ').slice(0, 2).map(p => p[0] || '').join('').toUpperCase() || '?'
}

// ─── máscaras ─────────────────────────────────────────────────
function mascaraCpf(e) {
  let v = e.target.value.replace(/\D/g, '').slice(0, 11)
  v = v.replace(/^(\d{3})(\d)/, '$1.$2')
       .replace(/^(\d{3}\.\d{3})(\d)/, '$1.$2')
       .replace(/^(\d{3}\.\d{3}\.\d{3})(\d)/, '$1-$2')
  form.cpf = v
}

// ─── validação ────────────────────────────────────────────────
function inputClass(campo) {
  const base = 'w-full rounded-xl border bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-2'
  return tocados[campo] && erros[campo]
    ? `${base} border-red-300 focus:border-red-400 focus:ring-red-100`
    : `${base} border-slate-200 focus:border-black focus:ring-black/10`
}

function touch(campo) { tocados[campo] = true; validarCampo(campo) }

function validarCampo(campo) {
  erros[campo] = ''
  const d = form[campo]?.replace?.(/\D/g, '') ?? ''
  if (campo === 'nome' && !form.nome.trim()) erros.nome = 'Informe o nome do cliente.'
  if (campo === 'telefone' && form.telefone && d.length < 10) erros.telefone = 'Telefone incompleto.'
  if (campo === 'cpf' && form.cpf && d.length !== 11) erros.cpf = 'CPF deve ter 11 dígitos.'
  if (campo === 'email' && form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) erros.email = 'E-mail inválido.'
}

function validarTudo() {
  ;['nome', 'telefone', 'cpf', 'email'].forEach(c => { tocados[c] = true; validarCampo(c) })
  return !Object.values(erros).some(Boolean)
}

async function handleSubmit() {
  erroGlobal.value = ''
  if (!validarTudo()) return
  loading.value = true
  try {
    const payload = {
      nome: form.nome.trim(),
      telefone: form.telefone.trim() || null,
      cpf: form.cpf ? form.cpf.replace(/\D/g, '') : null,
      email: form.email.trim() || null,
      informacao_adicional: form.informacao_adicional.trim() || null,
    }
    clienteCriado.value = await criarCliente(payload)
    etapa.value = 'sucesso'
  } catch (err) {
    const msg = err.response?.data?.message || err.response?.data?.erro
    if (err.response?.status === 409) erroGlobal.value = msg || 'Telefone ou CPF já cadastrado em outro cliente.'
    else if (err.response?.status === 422) erroGlobal.value = msg || 'Verifique os campos e tente novamente.'
    else erroGlobal.value = 'Erro ao cadastrar. Tente novamente.'
  } finally {
    loading.value = false
  }
}

function reiniciar() {
  Object.assign(form, { nome: '', telefone: '', cpf: '', email: '', informacao_adicional: '' })
  Object.keys(erros).forEach(k => (erros[k] = ''))
  Object.keys(tocados).forEach(k => delete tocados[k])
  erroGlobal.value = ''
  sugestaoTel.value = null
  sugestoesNome.value = []
  clienteVinculado.value = null
  avisoSubstituirTel.value = false
  telOriginal.value = ''
  clienteCriado.value = null
  etapa.value = 'form'
  nextTick(() => document.getElementById('telefone')?.focus())
}

// ─── modal de edição ──────────────────────────────────────────
const modalAberto  = ref(false)
const loadingModal = ref(false)
const erroModal    = ref('')
const sucessoModal = ref(false)
const tocadosModal = reactive({})
const errosModal   = reactive({ nome: '', cpf: '', email: '' })
const modal = reactive({ nome: '', telefone: '', cpf: '', email: '', informacao_adicional: '' })

function abrirModal() {
  const c = clienteCriado.value
  if (!c) return
  const cpfFmt = c.cpf ? c.cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4') : ''
  const telFmt = c.telefone ? c.telefone.replace(/\D/g, '').replace(/^(\d{2})(\d{4,5})(\d{4})$/, '($1) $2-$3') : ''
  Object.assign(modal, { nome: c.nome || '', telefone: telFmt, cpf: cpfFmt, email: c.email || '', informacao_adicional: c.informacao_adicional || '' })
  Object.keys(errosModal).forEach(k => (errosModal[k] = ''))
  Object.keys(tocadosModal).forEach(k => delete tocadosModal[k])
  erroModal.value = ''
  sucessoModal.value = false
  modalAberto.value = true
}

function fecharModal() { modalAberto.value = false }

function modalInputClass(campo) {
  const base = 'w-full rounded-xl border bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-2'
  return tocadosModal[campo] && errosModal[campo]
    ? `${base} border-red-300 focus:border-red-400 focus:ring-red-100`
    : `${base} border-slate-200 focus:border-black focus:ring-black/10`
}

function touchModal(campo) { tocadosModal[campo] = true; validarCampoModal(campo) }

function mascaraTelefoneModal(e) {
  let v = e.target.value.replace(/\D/g, '').slice(0, 11)
  if (v.length <= 10) v = v.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '')
  else                v = v.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '')
  modal.telefone = v
}

function mascaraCpfModal(e) {
  let v = e.target.value.replace(/\D/g, '').slice(0, 11)
  v = v.replace(/^(\d{3})(\d)/, '$1.$2')
       .replace(/^(\d{3}\.\d{3})(\d)/, '$1.$2')
       .replace(/^(\d{3}\.\d{3}\.\d{3})(\d)/, '$1-$2')
  modal.cpf = v
}

function validarCampoModal(campo) {
  errosModal[campo] = ''
  if (campo === 'nome' && !modal.nome.trim()) errosModal.nome = 'Informe o nome.'
  if (campo === 'cpf' && modal.cpf && modal.cpf.replace(/\D/g, '').length !== 11) errosModal.cpf = 'CPF deve ter 11 dígitos.'
  if (campo === 'email' && modal.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(modal.email)) errosModal.email = 'E-mail inválido.'
}

async function salvarEdicao() {
  ;['nome', 'cpf', 'email'].forEach(c => { tocadosModal[c] = true; validarCampoModal(c) })
  if (Object.values(errosModal).some(Boolean)) return
  erroModal.value = ''
  sucessoModal.value = false
  loadingModal.value = true
  try {
    const c = clienteCriado.value
    const payload = {
      nome: modal.nome.trim(),
      telefone: modal.telefone.trim() || null,
      cpf: modal.cpf ? modal.cpf.replace(/\D/g, '') : null,
      email: modal.email.trim() || null,
      informacao_adicional: modal.informacao_adicional.trim() || null,
    }
    clienteCriado.value = await atualizarCliente(c.id, payload)
    sucessoModal.value = true
    setTimeout(() => { sucessoModal.value = false; fecharModal() }, 1800)
  } catch (err) {
    const msg = err.response?.data?.message || err.response?.data?.erro
    erroModal.value = err.response?.status === 409
      ? 'CPF ou telefone já cadastrado em outro cliente.'
      : (msg || 'Erro ao salvar. Tente novamente.')
  } finally {
    loadingModal.value = false
  }
}
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to       { opacity: 0; }

.slide-down-enter-active { transition: all 0.22s ease; }
.slide-down-leave-active { transition: all 0.15s ease; }
.slide-down-enter-from   { opacity: 0; transform: translateY(-8px); }
.slide-down-leave-to     { opacity: 0; transform: translateY(-4px); }

.etapa-enter-active { transition: all 0.28s ease; }
.etapa-leave-active { transition: all 0.18s ease; }
.etapa-enter-from   { opacity: 0; transform: translateY(12px); }
.etapa-leave-to     { opacity: 0; }

.success-fade-enter-active { transition: all 0.4s ease; }
.success-fade-enter-from   { opacity: 0; transform: translateY(12px); }

.modal-enter-active, .modal-leave-active { transition: opacity 0.22s ease; }
.modal-enter-from, .modal-leave-to       { opacity: 0; }
</style>
