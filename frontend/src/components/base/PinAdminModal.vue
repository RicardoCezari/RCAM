<template>
  <BaseModal
    :model-value="pinAdmin.aberto"
    title="Confirme seu PIN"
    subtitle="Área restrita da Administração"
    icon="mdi-shield-lock-outline"
    @update:model-value="(v) => { if (!v) cancelar() }"
  >
    <div v-if="modo === 'pin'" class="flex flex-col items-center px-4 py-5 sm:px-6" data-testid="pin-admin">
      <p class="text-sm text-slate-500">Digite o PIN de {{ auth.usuario?.nome || 'administrador' }}</p>

      <div class="my-5 flex h-4 items-center justify-center gap-4" :class="{ 'animate-pulse': verificando }" aria-label="PIN">
        <span
          v-for="n in config.pinTamanho"
          :key="n"
          class="h-3.5 w-3.5 rounded-full border-2 border-slate-900 transition"
          :class="n <= pin.length ? 'bg-slate-900' : 'bg-transparent'"
        ></span>
      </div>

      <p
        class="mb-3 min-h-10 w-full max-w-[18rem] rounded-2xl text-center text-sm"
        :class="erro ? 'bg-red-50 px-3 py-2 text-red-700' : ''"
        role="alert"
      >{{ erro }}</p>

      <div class="grid w-full max-w-[18rem] grid-cols-3 gap-3">
        <button
          v-for="d in ['1', '2', '3', '4', '5', '6', '7', '8', '9']"
          :key="d"
          type="button"
          class="h-14 rounded-full bg-slate-50 text-xl font-semibold text-slate-900 shadow-[0_4px_12px_rgba(15,23,42,0.08)] transition active:scale-95 active:bg-slate-100 disabled:opacity-50"
          :disabled="verificando"
          @click="digitar(d)"
        >{{ d }}</button>
        <span></span>
        <button
          type="button"
          class="h-14 rounded-full bg-slate-50 text-xl font-semibold text-slate-900 shadow-[0_4px_12px_rgba(15,23,42,0.08)] transition active:scale-95 active:bg-slate-100 disabled:opacity-50"
          :disabled="verificando"
          @click="digitar('0')"
        >0</button>
        <button
          type="button"
          aria-label="Apagar"
          class="flex h-14 items-center justify-center rounded-full text-xl text-slate-500 transition active:scale-95 active:bg-slate-100 disabled:opacity-50"
          :disabled="verificando"
          @click="apagar"
        ><span class="mdi mdi-backspace-outline"></span></button>
      </div>

      <button
        type="button"
        class="mt-4 text-sm font-medium text-slate-500 underline-offset-2 hover:text-slate-900 hover:underline"
        @click="usarSenha"
      >Esqueci o PIN</button>
    </div>

    <form v-else class="flex flex-col gap-3 px-4 py-5 sm:px-6" data-testid="senha-admin" @submit.prevent="confirmarSenha">
      <p class="text-sm text-slate-500">
        Confirme a senha de {{ auth.usuario?.nome || 'administrador' }} para entrar. Depois, redefina o PIN na aba Usuários.
      </p>
      <label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Senha
        <input
          ref="campoSenha"
          v-model="senha"
          type="password"
          autocomplete="current-password"
          class="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none transition focus:border-black/30 focus:ring-2 focus:ring-black/10"
        />
      </label>
      <p v-if="erro" class="rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{{ erro }}</p>
      <div class="flex items-center justify-between gap-3">
        <button type="button" class="text-sm font-medium text-slate-500 hover:text-slate-900" @click="usarPin">Voltar ao PIN</button>
        <button
          type="submit"
          class="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-black/85 disabled:opacity-50"
          :disabled="verificando || !senha"
        >Confirmar</button>
      </div>
    </form>
  </BaseModal>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import BaseModal from '@/components/base/BaseModal.vue'
import { concluirPinAdmin, pinAdmin } from '@/composables/usePinAdmin'
import { confirmarPinAtual, confirmarSenhaAtual } from '@/services/dispositivo'
import { useAuthStore } from '@/stores/auth'
import { useConfigStore } from '@/stores/config'

const auth = useAuthStore()
const config = useConfigStore()

const pin = ref('')
const senha = ref('')
const modo = ref('pin')
const campoSenha = ref(null)
const erro = ref('')
const verificando = ref(false)

watch(
  () => pinAdmin.aberto,
  (aberto) => {
    if (!aberto) return
    pin.value = ''
    senha.value = ''
    modo.value = 'pin'
    erro.value = ''
    config.carregar()
  }
)

function usarSenha() {
  modo.value = 'senha'
  pin.value = ''
  senha.value = ''
  erro.value = ''
  nextTick(() => campoSenha.value?.focus())
}

function usarPin() {
  modo.value = 'pin'
  senha.value = ''
  erro.value = ''
}

async function confirmarSenha() {
  if (verificando.value || !senha.value) return
  verificando.value = true
  erro.value = ''
  try {
    await confirmarSenhaAtual(senha.value)
    concluirPinAdmin(true)
  } catch (err) {
    erro.value = err.response?.data?.message || 'Não foi possível confirmar a senha.'
    senha.value = ''
  } finally {
    verificando.value = false
  }
}

function cancelar() {
  concluirPinAdmin(false)
}

function apagar() {
  if (verificando.value) return
  pin.value = pin.value.slice(0, -1)
  erro.value = ''
}

async function digitar(d) {
  if (verificando.value || pin.value.length >= config.pinTamanho) return
  pin.value += d
  erro.value = ''
  if (pin.value.length < config.pinTamanho) return

  verificando.value = true
  try {
    await confirmarPinAtual(pin.value)
    concluirPinAdmin(true)
  } catch (err) {
    erro.value = err.response?.data?.message || 'Não foi possível confirmar o PIN.'
    pin.value = ''
  } finally {
    verificando.value = false
  }
}

// Teclado do computador: dígitos e Backspace
function aoTeclar(event) {
  if (!pinAdmin.aberto || modo.value !== 'pin' || event.ctrlKey || event.metaKey || event.altKey) return
  if (/^\d$/.test(event.key)) digitar(event.key)
  else if (event.key === 'Backspace') apagar()
  else return
  event.preventDefault()
}

onMounted(() => window.addEventListener('keydown', aoTeclar))
onBeforeUnmount(() => window.removeEventListener('keydown', aoTeclar))
</script>
