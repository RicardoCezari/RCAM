<template>
  <div class="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
    <div class="flex items-center gap-2 text-black/55">
      <span :class="['mdi text-[18px]', icon]"></span>
      <p class="text-xs font-semibold uppercase tracking-wide">{{ titulo }}</p>
    </div>
    <p class="mt-2 break-words text-xl font-bold text-black sm:text-2xl">{{ valor }}</p>
    <p class="mt-0.5 text-xs text-black/50">{{ legenda }}</p>
  </div>
</template>

<script setup>
defineProps({
  titulo: { type: String, required: true },
  valor: { type: String, required: true },
  legenda: { type: String, default: '' },
  icon: { type: String, default: 'mdi-chart-box-outline' },
})
</script>
