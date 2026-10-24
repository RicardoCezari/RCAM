<template>
  <div class="min-h-screen bg-[#f5f5f7]">
    <div class="grid min-h-screen lg:grid-cols-2">
      <!-- Lado esquerdo -->
      <section
        class="relative hidden overflow-hidden bg-black text-white lg:flex lg:items-center lg:justify-center"
      >
        <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.12),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.08),transparent_30%)]"></div>

        <div class="relative z-10 flex flex-col items-center justify-center px-12 text-center">
          <h1
            class="text-6xl font-black tracking-[-0.04em] text-white xl:text-7xl 2xl:text-8xl"
            style="font-family: Inter, ui-sans-serif, system-ui, sans-serif"
          >
            Workflow
          </h1>

          <p class="mt-5 max-w-md text-base leading-7 text-white/70 xl:text-lg">
            Gerencie processos, acompanhe atividades e mantenha o fluxo de trabalho
            da sua operação de forma mais simples, organizada e eficiente.
          </p>
        </div>
      </section>

      <!-- Lado direito -->
      <section
        class="flex items-center justify-center px-6 py-10 sm:px-8 lg:rounded-l-[40px] lg:bg-[#f5f5f7] lg:px-12 xl:px-20"
      >
        <div class="w-full max-w-sm lg:max-w-md">
          <!-- Marca (celular) -->
          <div class="mb-10 text-center lg:hidden">
            <h1 class="text-4xl font-black tracking-[-0.04em] text-slate-900">Workflow</h1>
          </div>

          <!-- Carregando perfis -->
          <div v-if="modo === 'carregando'" class="flex justify-center py-16 text-slate-400">
            <span class="mdi mdi-loading animate-spin text-3xl"></span>
          </div>

          <!-- Quem está entrando? (aparelho autorizado) -->
          <div v-else-if="modo === 'perfis'" data-testid="perfis">
            <h2 class="mb-8 text-center text-xl font-semibold tracking-tight text-slate-900">Quem está entrando?</h2>
            <div class="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3">
              <button
                v-for="p in perfis"
                :key="p.id"
                type="button"
                class="group flex flex-col items-center gap-3 rounded-2xl p-2 outline-none transition active:scale-95"
                @click="escolher(p)"
              >
                <span
                  class="flex h-20 w-20 items-center justify-center rounded-full bg-black text-2xl font-bold text-white shadow-[0_10px_24px_rgba(0,0,0,0.18)] transition group-hover:bg-zinc-800 group-focus-visible:ring-4 group-focus-visible:ring-black/20"
                >{{ iniciaisDe(p.nome) }}</span>
                <span class="w-full truncate text-center text-sm font-medium text-slate-700">{{ p.nome }}</span>
              </button>
            </div>
            <button
              type="button"
              class="mt-10 block w-full py-3 text-center text-sm font-medium text-slate-500 underline-offset-4 hover:text-slate-900 hover:underline"
              @click="irParaSenha"
            >
              Entrar com usuário e senha
            </button>
          </div>

          <!-- PIN -->
          <div v-else-if="modo === 'pin'" data-testid="tela-pin" class="flex flex-col items-center">
            <button
              type="button"
              class="mb-6 flex items-center gap-1 self-start rounded-xl px-2 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              @click="voltarAosPerfis"
            >
              <span class="mdi mdi-chevron-left text-xl"></span> Trocar de perfil
            </button>

            <span class="flex h-20 w-20 items-center justify-center rounded-full bg-black text-2xl font-bold text-white shadow-[0_10px_24px_rgba(0,0,0,0.18)]">{{ iniciaisDe(perfilEscolhido.nome) }}</span>
            <p class="mt-3 text-base font-semibold text-slate-900">{{ perfilEscolhido.nome }}</p>
            <p class="mt-1 text-sm text-slate-500">Digite seu PIN</p>

            <div
              class="my-6 flex h-4 items-center justify-center gap-4"
              :class="{ 'animate-pulse': authStore.loading }"
              aria-label="PIN"
            >
              <span
                v-for="n in pinTamanho"
                :key="n"
                class="h-3.5 w-3.5 rounded-full border-2 border-slate-900 transition"
                :class="n <= pin.length ? 'bg-slate-900' : 'bg-transparent'"
              ></span>
            </div>

            <p
              class="mb-4 min-h-10 w-full rounded-2xl text-center text-sm"
              :class="authStore.erro ? 'bg-red-50 px-3 py-2 text-red-700' : ''"
              role="alert"
            >{{ authStore.erro }}</p>

            <div class="grid w-full max-w-[18rem] grid-cols-3 gap-3">
              <button
                v-for="d in ['1', '2', '3', '4', '5', '6', '7', '8', '9']"
                :key="d"
                type="button"
                class="h-16 rounded-full bg-white text-2xl font-semibold text-slate-900 shadow-[0_6px_16px_rgba(15,23,42,0.08)] transition active:scale-95 active:bg-slate-100 disabled:opacity-50"
                :disabled="authStore.loading"
                @click="digitar(d)"
              >{{ d }}</button>
              <span></span>
              <button
                type="button"
                class="h-16 rounded-full bg-white text-2xl font-semibold text-slate-900 shadow-[0_6px_16px_rgba(15,23,42,0.08)] transition active:scale-95 active:bg-slate-100 disabled:opacity-50"
                :disabled="authStore.loading"
                @click="digitar('0')"
              >0</button>
              <button
                type="button"
                aria-label="Apagar"
                class="flex h-16 items-center justify-center rounded-full text-2xl text-slate-500 transition active:scale-95 active:bg-slate-100 disabled:opacity-50"
                :disabled="authStore.loading"
                @click="apagar"
              ><span class="mdi mdi-backspace-outline"></span></button>
            </div>

            <button
              type="button"
              class="mt-8 py-2 text-sm font-medium text-slate-500 underline-offset-4 hover:text-slate-900 hover:underline"
              @click="irParaSenha"
            >
              Entrar com usuário e senha
            </button>
          </div>

          <template v-else>
          <!-- Título (desktop) -->
          <div class="mb-8 hidden lg:block">
            <h2 class="text-3xl font-semibold tracking-tight text-slate-900">
              Entrar no sistema
            </h2>
            <p class="mt-2 text-sm leading-6 text-slate-500">
              Informe seu login e sua senha para acessar o sistema.
            </p>
          </div>

          <form @submit.prevent="handleLogin">
            <BaseAlert :message="authStore.erro" class="mb-5" />

            <BaseFormField id="login" label="Login" class="mb-5">
              <input
                id="login"
                v-model="form.login"
                type="text"
                autocomplete="username"
                autocapitalize="none"
                autocorrect="off"
                spellcheck="false"
                enterkeyhint="next"
                placeholder="Digite seu login"
                class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-base text-slate-900 shadow-[0_8px_24px_rgba(15,23,42,0.06)] outline-none transition placeholder:text-slate-400 focus:border-black focus:shadow-[0_12px_30px_rgba(15,23,42,0.10)] focus:ring-4 focus:ring-black/5"
                :disabled="authStore.loading"
              />
            </BaseFormField>

            <BaseFormField id="senha" label="Senha" class="mb-7">
              <div class="relative">
                <input
                  id="senha"
                  v-model="form.senha"
                  :type="mostrarSenha ? 'text' : 'password'"
                  autocomplete="current-password"
                  autocapitalize="none"
                  autocorrect="off"
                  enterkeyhint="go"
                  placeholder="Digite sua senha"
                  class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 pr-12 text-base text-slate-900 shadow-[0_8px_24px_rgba(15,23,42,0.06)] outline-none transition placeholder:text-slate-400 focus:border-black focus:shadow-[0_12px_30px_rgba(15,23,42,0.10)] focus:ring-4 focus:ring-black/5"
                  :disabled="authStore.loading"
                />
                <button
                  type="button"
                  tabindex="-1"
                  class="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  @click="mostrarSenha = !mostrarSenha"
                >
                  <span
                    class="mdi text-xl"
                    :class="mostrarSenha ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
                  ></span>
                </button>
              </div>
            </BaseFormField>

            <button
              type="submit"
              class="flex w-full items-center justify-center gap-2 rounded-2xl bg-black px-4 py-4 text-base font-semibold text-white shadow-[0_14px_30px_rgba(0,0,0,0.18)] transition hover:bg-zinc-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="authStore.loading || !form.login || !form.senha"
            >
              <span v-if="authStore.loading" class="mdi mdi-loading animate-spin text-base"></span>
              {{ authStore.loading ? 'Entrando...' : 'Entrar' }}
            </button>
          </form>

          <button
            v-if="perfis.length"
            type="button"
            class="mt-6 block w-full py-2 text-center text-sm font-medium text-slate-500 underline-offset-4 hover:text-slate-900 hover:underline"
            @click="voltarAosPerfis"
          >
            Entrar com PIN
          </button>
          </template>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { temAparelho, listarPerfis } from '@/services/dispositivo'
import BaseFormField from '@/components/base/BaseFormField.vue'
import BaseAlert from '@/components/base/BaseAlert.vue'

const router = useRouter()
const authStore = useAuthStore()

const form = ref({ login: '', senha: '' })
const mostrarSenha = ref(false)

// carregando | perfis | pin | senha
const modo = ref(temAparelho() ? 'carregando' : 'senha')
const perfis = ref([])
const pinTamanho = ref(4)
const perfilEscolhido = ref(null)
const pin = ref('')

const iniciaisDe = (nome) =>
  (nome || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join('')
    .toUpperCase()

async function carregarPerfis() {
  try {
    const data = await listarPerfis()
    perfis.value = data.perfis
    pinTamanho.value = data.pin_tamanho
    modo.value = perfis.value.length ? 'perfis' : 'senha'
  } catch {
    // aparelho não autorizado/revogado ou servidor indisponível: login com senha
    perfis.value = []
    modo.value = 'senha'
  }
}

function escolher(perfil) {
  authStore.erro = null
  perfilEscolhido.value = perfil
  pin.value = ''
  modo.value = 'pin'
}

function irParaSenha() {
  authStore.erro = null
  modo.value = 'senha'
}

function voltarAosPerfis() {
  authStore.erro = null
  pin.value = ''
  modo.value = 'perfis'
}

async function digitar(digito) {
  if (authStore.loading || pin.value.length >= pinTamanho.value) return
  authStore.erro = null
  pin.value += digito
  if (pin.value.length === pinTamanho.value) await confirmarPin()
}

function apagar() {
  if (authStore.loading) return
  authStore.erro = null
  pin.value = pin.value.slice(0, -1)
}

async function confirmarPin() {
  const ok = await authStore.loginPin(perfilEscolhido.value.id, pin.value)
  if (ok) router.push({ name: 'home' })
  else pin.value = ''
}

// Teclado físico (PC) na tela de PIN
function aoTeclar(e) {
  if (modo.value !== 'pin' || e.ctrlKey || e.metaKey || e.altKey) return
  if (/^\d$/.test(e.key)) digitar(e.key)
  else if (e.key === 'Backspace') apagar()
}

async function handleLogin() {
  const ok = await authStore.login(form.value.login.trim(), form.value.senha)
  if (ok) router.push({ name: 'home' })
}

onMounted(() => {
  window.addEventListener('keydown', aoTeclar)
  if (modo.value === 'carregando') carregarPerfis()
})
onBeforeUnmount(() => window.removeEventListener('keydown', aoTeclar))
</script>