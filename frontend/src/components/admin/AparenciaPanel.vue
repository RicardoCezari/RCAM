<template>
  <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start">
    <!-- Escolha da cor -->
    <section class="space-y-4 rounded-3xl border border-black/10 bg-white p-4 shadow-sm sm:p-6">
      <div>
        <h2 class="text-base font-semibold text-black">Cor do sistema</h2>
        <p class="mt-1 text-sm text-black/55">
          Escolha a cor de destaque de botões, cartões e títulos. Vale para todos os usuários e aparelhos.
        </p>
      </div>

      <BaseAlert :message="erro" />

      <div role="radiogroup" aria-label="Paleta de cores" class="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <button
          v-for="p in PALETA"
          :key="p.cor"
          type="button"
          role="radio"
          :aria-checked="igual(cor, p.cor)"
          :data-testid="`cor-${p.cor.slice(1)}`"
          class="flex items-center gap-2.5 rounded-xl border-2 bg-white p-2 text-left text-sm font-medium text-black transition hover:bg-black/5"
          :class="igual(cor, p.cor) ? '' : 'border-black/10'"
          :style="igual(cor, p.cor) ? { borderColor: p.cor } : null"
          @click="cor = p.cor"
        >
          <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white" :style="{ backgroundColor: p.cor }">
            <span v-if="igual(cor, p.cor)" class="mdi mdi-check text-[18px]"></span>
          </span>
          <span class="truncate">{{ p.nome }}</span>
        </button>
      </div>

      <!-- Outra cor -->
      <div class="rounded-2xl border border-black/10 p-3">
        <p class="text-sm font-medium text-black">Outra cor</p>
        <div class="mt-2 flex flex-wrap items-center gap-3">
          <input
            type="color"
            aria-label="Escolher cor personalizada"
            :value="corValida(cor) ? cor : COR_PADRAO"
            class="h-10 w-14 cursor-pointer rounded-lg border border-black/10 bg-white p-1"
            @input="cor = $event.target.value"
          />
          <input
            type="text"
            inputmode="text"
            maxlength="7"
            aria-label="Código da cor (#rrggbb)"
            placeholder="#1e3a8a"
            :value="hex"
            class="w-28 rounded-xl border border-black/10 bg-white px-3 py-2 font-mono text-sm uppercase outline-none transition focus:border-black/30 focus:ring-2 focus:ring-black/10"
            @input="aoDigitarHex"
          />
        </div>

        <p
          class="mt-3 flex items-start gap-1.5 text-xs"
          :class="legivel ? 'text-emerald-700' : 'text-red-700'"
          :role="legivel ? null : 'alert'"
          data-testid="contraste-tema"
        >
          <span :class="['mdi mt-px text-[14px]', legivel ? 'mdi-check-circle-outline' : 'mdi-alert-circle-outline']"></span>
          <span v-if="!hexOk">Digite uma cor no formato #rrggbb.</span>
          <span v-else-if="legivel">Texto branco legível sobre esta cor (contraste {{ razao }}:1).</span>
          <span v-else>Cor muito clara: o texto branco não ficaria legível (contraste {{ razao }}:1). Escolha um tom mais escuro.</span>
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2 pt-1">
        <button
          type="button"
          :disabled="salvando || !alterado || !legivel"
          class="flex items-center gap-2 rounded-2xl bg-black px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-black/80 disabled:opacity-50"
          @click="salvar"
        >
          <span :class="['mdi text-[18px]', salvando ? 'mdi-loading animate-spin' : 'mdi-content-save-outline']"></span>
          Salvar cor
        </button>
        <button
          v-if="alterado"
          type="button"
          class="rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-black/70 transition hover:bg-black/5"
          @click="cor = atual"
        >
          Descartar
        </button>
        <button
          v-if="!igual(cor, COR_PADRAO)"
          type="button"
          class="rounded-2xl px-3 py-3 text-sm font-medium text-black/60 transition hover:text-black"
          @click="cor = COR_PADRAO"
        >
          Voltar ao padrão
        </button>
      </div>
    </section>

    <!-- Pré-visualização: a variável --cor-tema é trocada só neste bloco, então as mesmas classes do sistema aparecem na cor escolhida -->
    <section class="rounded-3xl border border-black/10 bg-white p-4 shadow-sm sm:p-6 max-lg:order-first lg:sticky lg:top-4">
      <h2 class="text-base font-semibold text-black">Pré-visualização</h2>
      <p class="mt-1 text-sm text-black/55">O sistema só muda quando você salvar.</p>

      <div
        class="mt-4 overflow-hidden rounded-2xl border border-black/10 bg-[#f5f5f7]"
        :style="{ '--cor-tema': corPrevia }"
        data-testid="previa-tema"
        aria-hidden="true"
      >
        <div class="flex items-center justify-between bg-black px-3 py-2.5">
          <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-[11px] font-semibold text-black">{{ config.iniciais }}</span>
          <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 text-white">
            <span class="mdi mdi-menu text-[16px]"></span>
          </span>
        </div>

        <div class="space-y-3 p-3">
          <p class="text-sm font-medium text-black">Olá, {{ primeiroNome }}.</p>

          <div class="grid grid-cols-2 gap-2">
            <div
              v-for="t in tiles"
              :key="t.titulo"
              class="flex h-20 flex-col items-center justify-center gap-1.5 rounded-2xl bg-black text-white"
            >
              <span :class="['mdi text-[22px]', t.icone]"></span>
              <span class="text-[11px] font-semibold">{{ t.titulo }}</span>
            </div>
          </div>

          <div class="flex flex-wrap gap-1.5">
            <span class="flex h-7 items-center gap-1 rounded-lg border border-black bg-black px-2.5 text-xs font-medium text-white">
              <span class="mdi mdi-clipboard-text-outline text-[14px]"></span>Abertas
            </span>
            <span class="flex h-7 items-center gap-1 rounded-lg border border-black/10 bg-white px-2.5 text-xs font-medium text-black">
              <span class="mdi mdi-check-circle-outline text-[14px]"></span>Concluídas
            </span>
            <span class="flex h-7 items-center rounded-lg bg-black/5 px-2.5 text-xs font-medium text-black/70">ADMIN</span>
          </div>

          <div class="rounded-xl border border-black bg-white px-3 py-2 text-xs text-black/60 ring-2 ring-black/10">Campo em foco</div>

          <div class="flex items-center gap-3">
            <span class="relative inline-flex h-5 w-9 shrink-0 rounded-full bg-black">
              <span class="absolute right-0.5 top-0.5 h-4 w-4 rounded-full bg-white"></span>
            </span>
            <span class="h-2 flex-1 overflow-hidden rounded-full bg-black/10"><span class="block h-full w-2/3 rounded-full bg-black"></span></span>
          </div>

          <div class="flex gap-2">
            <span class="flex-1 rounded-xl border border-black/10 bg-white py-2 text-center text-xs font-medium text-black">Cancelar</span>
            <span class="flex-1 rounded-xl bg-black py-2 text-center text-xs font-semibold text-white">Salvar</span>
          </div>
        </div>
      </div>

      <p class="mt-3 text-xs text-black/45">A impressão da O.S. não é alterada pela cor do sistema.</p>
    </section>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import BaseAlert from '@/components/base/BaseAlert.vue'
import { useAuthStore } from '@/stores/auth'
import { useConfigStore } from '@/stores/config'
import { useToastStore } from '@/stores/toast'
import { COR_PADRAO, PALETA, contrasteComBranco, corLegivel, corValida } from '@/utils/tema'

const config = useConfigStore()
const auth = useAuthStore()
const toast = useToastStore()

const tiles = [
  { titulo: 'Nova O.S.', icone: 'mdi-file-document-plus-outline' },
  { titulo: 'Listar O.S.', icone: 'mdi-format-list-bulleted' },
  { titulo: 'Clientes', icone: 'mdi-account-group-outline' },
  { titulo: 'Serviços', icone: 'mdi-tools' },
]

const atual = computed(() => config.temaCor || COR_PADRAO)
const cor = ref(atual.value)
const hex = ref(cor.value)
const salvando = ref(false)
const erro = ref('')

watch(atual, (nova) => { cor.value = nova })
watch(cor, (nova) => { hex.value = nova })

const igual = (a, b) => (a || '').toLowerCase() === (b || '').toLowerCase()
const alterado = computed(() => !igual(cor.value, atual.value))
const hexOk = computed(() => corValida(hex.value))
const legivel = computed(() => hexOk.value && corLegivel(cor.value))
const razao = computed(() => (corValida(cor.value) ? contrasteComBranco(cor.value) : 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 }))
const corPrevia = computed(() => (corValida(cor.value) ? cor.value : atual.value))
const primeiroNome = computed(() => (auth.usuario?.nome || 'usuário').split(' ')[0])

function aoDigitarHex(event) {
  let texto = event.target.value.trim()
  if (texto && !texto.startsWith('#')) texto = `#${texto}`
  hex.value = texto
  if (corValida(texto)) cor.value = texto.toLowerCase()
}

async function salvar() {
  erro.value = ''
  salvando.value = true
  try {
    await config.salvarTema(igual(cor.value, COR_PADRAO) ? '' : cor.value)
    toast.sucesso('Cor do sistema atualizada.')
  } catch (err) {
    erro.value = err.response?.data?.message || 'Não foi possível salvar a cor'
  } finally {
    salvando.value = false
  }
}
</script>
