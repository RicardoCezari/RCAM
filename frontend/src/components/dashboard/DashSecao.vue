<template>
  <section class="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
    <h3 class="text-sm font-semibold text-black">{{ titulo }}</h3>
    <p v-if="descricao" class="mt-0.5 text-xs text-black/50">{{ descricao }}</p>

    <div class="mt-3">
      <p v-if="vazio" class="flex h-32 items-center justify-center text-center text-sm text-black/45">
        {{ textoVazio }}
      </p>
      <slot v-else />
    </div>
  </section>
</template>

<script setup>
defineProps({
  titulo: { type: String, required: true },
  descricao: { type: String, default: '' },
  vazio: { type: Boolean, default: false },
  textoVazio: { type: String, default: 'Sem dados no período selecionado.' },
})
</script>
