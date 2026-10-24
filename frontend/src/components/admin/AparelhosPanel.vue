<template>
  <div class="max-w-3xl space-y-3">
    <BaseAlert :message="erro" />

    <section class="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
      <h2 class="text-base font-semibold text-black">Entrada rápida por PIN</h2>
      <p class="mt-1 text-sm text-black/55">
        Autorize o celular do balcão para que cada funcionário entre tocando no próprio nome e digitando o PIN.
        Defina o PIN de cada um em <strong class="font-semibold text-black/70">Usuários</strong>. Fora dos aparelhos
        autorizados, o acesso continua sendo só por usuário e senha.
      </p>

      <div
        v-if="esteAutorizado"
        class="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
      >
        <span class="mdi mdi-check-circle-outline text-[16px]"></span>
        Este aparelho está autorizado.
      </div>

      <form v-else class="mt-4 flex flex-col gap-2 sm:flex-row" @submit.prevent="autorizar">
        <input
          v-model="nome"
          type="text"
          maxlength="80"
          placeholder="Nome do aparelho (ex: Celular da loja)"
          data-testid="nome-aparelho"
          class="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-black/30 focus:ring-2 focus:ring-black/10"
        />
        <button
          type="submit"
          :disabled="salvando || !nome.trim()"
          class="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-black/80 disabled:opacity-50"
        >
          <span :class="['mdi text-[18px]', salvando ? 'mdi-loading animate-spin' : 'mdi-cellphone-check']"></span>
          Autorizar este aparelho
        </button>
      </form>
    </section>

    <section class="rounded-2xl border border-black/10 bg-white shadow-sm">
      <p v-if="carregando" class="px-4 py-6 text-sm text-black/50">Carregando...</p>
      <p v-else-if="!aparelhos.length" class="px-4 py-6 text-sm text-black/50">Nenhum aparelho autorizado.</p>
      <ul v-else class="divide-y divide-black/5">
        <li v-for="a in aparelhos" :key="a.id" class="flex items-center justify-between gap-3 px-4 py-3">
          <div class="min-w-0">
            <p class="truncate text-sm font-medium text-black">
              {{ a.nome }}
              <span v-if="a.id === idAtual" class="ml-1 text-xs text-black/40">(este aparelho)</span>
            </p>
            <p class="text-xs text-black/45">
              Autorizado em {{ formatar(a.data_criacao) }}<template v-if="a.criado_por_nome"> por {{ a.criado_por_nome }}</template>
              · {{ a.ultimo_uso ? `último uso ${formatar(a.ultimo_uso)}` : 'ainda não usado' }}
            </p>
          </div>
          <button
            type="button"
            class="shrink-0 rounded-xl border border-black/10 px-3 py-2 text-sm font-medium text-black/70 transition hover:bg-black/5"
            @click="revogar(a)"
          >
            Revogar
          </button>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import BaseAlert from '@/components/base/BaseAlert.vue'
import {
  autorizarEsteAparelho,
  idDoAparelho,
  listarAparelhos,
  revogarAparelho,
} from '@/services/dispositivo'
import { useToastStore } from '@/stores/toast'

const toast = useToastStore()

const aparelhos = ref([])
const carregando = ref(false)
const salvando = ref(false)
const erro = ref('')
const nome = ref('Celular da loja')
const idAtual = ref(idDoAparelho())

const esteAutorizado = computed(() => !!idAtual.value && aparelhos.value.some((a) => a.id === idAtual.value))

function formatar(valor) {
  if (!valor) return '—'
  const data = new Date(valor)
  return Number.isNaN(data.getTime())
    ? '—'
    : data.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

async function carregar() {
  carregando.value = true
  erro.value = ''
  try {
    aparelhos.value = await listarAparelhos()
  } catch (err) {
    erro.value = err.response?.data?.message || 'Não foi possível carregar os aparelhos'
  } finally {
    carregando.value = false
  }
}

async function autorizar() {
  salvando.value = true
  erro.value = ''
  try {
    await autorizarEsteAparelho(nome.value.trim())
    idAtual.value = idDoAparelho()
    toast.sucesso('Aparelho autorizado.')
    await carregar()
  } catch (err) {
    erro.value = err.response?.data?.message || 'Não foi possível autorizar o aparelho'
  } finally {
    salvando.value = false
  }
}

async function revogar(aparelho) {
  erro.value = ''
  try {
    await revogarAparelho(aparelho.id)
    idAtual.value = idDoAparelho()
    toast.sucesso('Autorização revogada.')
    await carregar()
  } catch (err) {
    erro.value = err.response?.data?.message || 'Não foi possível revogar a autorização'
  }
}

onMounted(carregar)
</script>
