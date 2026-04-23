<template>
  <div class="mb-4 flex items-center gap-3 rounded-xl border border-black/8 bg-white px-4 py-3 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
    <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-black text-sm font-bold text-white">
      {{ iniciais }}
    </div>
    <div class="min-w-0">
      <p class="truncate text-sm font-semibold text-slate-900">{{ nome }}</p>
      <p class="text-xs text-slate-400">{{ telefone || 'Sem telefone' }}</p>
    </div>
    <button
      type="button"
      class="ml-auto flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-200"
      @click="emit('alterar')"
    >
      <span class="mdi mdi-pencil-outline text-[12px]"></span>
      Alterar
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  nome:     { type: String, required: true },
  telefone: { type: String, default: '' },
})
const emit = defineEmits(['alterar'])

const iniciais = computed(() =>
  (props.nome || '').split(' ').slice(0, 2).map(p => p[0] || '').join('').toUpperCase() || '?'
)
</script>
