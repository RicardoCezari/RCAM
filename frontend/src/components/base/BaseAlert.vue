<template>
  <transition name="fade">
    <div v-if="message" :class="classes">
      <span :class="['mdi mt-0.5 shrink-0 text-base', iconClass]"></span>
      <span>{{ message }}</span>
    </div>
  </transition>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  message: { type: String, default: '' },
  type: { type: String, default: 'error' }, // 'error' | 'success'
})

const classes = computed(() => {
  const base = 'flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm'
  return props.type === 'success'
    ? `${base} border-emerald-200 bg-emerald-50 text-emerald-700`
    : `${base} border-red-200 bg-red-50 text-red-700 shadow-[0_10px_25px_rgba(239,68,68,0.08)]`
})

const iconClass = computed(() =>
  props.type === 'success' ? 'mdi-check-circle-outline' : 'mdi-alert-circle-outline'
)
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
