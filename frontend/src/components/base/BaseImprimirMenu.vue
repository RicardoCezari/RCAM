<template>
  <div class="relative">
    <BaseIconButton icon="mdi-printer-outline" title="Imprimir" @click="aberto = !aberto" />

    <template v-if="aberto">
      <div class="fixed inset-0 z-40" @click="aberto = false"></div>
      <div
        class="absolute right-0 top-[calc(100%+6px)] z-50 w-56 overflow-hidden rounded-2xl border border-black/10 bg-white p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.15)]"
      >
        <button
          v-for="opcao in opcoes"
          :key="opcao.tipo"
          type="button"
          class="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-black transition hover:bg-black/5"
          @click="escolher(opcao.tipo)"
        >
          <span :class="['mdi text-[18px] text-black/60', opcao.icon]"></span>
          {{ opcao.label }}
        </button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import BaseIconButton from './BaseIconButton.vue'

const emit = defineEmits(['imprimir'])

const aberto = ref(false)

const opcoes = [
  { tipo: 'ambas', label: 'As duas vias', icon: 'mdi-printer-pos-outline' },
  { tipo: 'cliente', label: 'Só via do cliente', icon: 'mdi-account-outline' },
  { tipo: 'loja', label: 'Só via da loja', icon: 'mdi-store-outline' },
]

function escolher(tipo) {
  aberto.value = false
  emit('imprimir', tipo)
}
</script>
