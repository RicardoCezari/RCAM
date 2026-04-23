<template>
  <div class="flex items-center">
    <template v-for="(s, i) in steps" :key="s.key">
      <div class="flex flex-col items-center gap-0.5">
        <button
          type="button"
          :disabled="!canNavigate(i)"
          :class="[
            'flex h-7 w-7 items-center justify-center rounded-full border-2 text-[11px] font-bold transition',
            current > i  ? 'border-black bg-black text-white'
            : current === i ? 'border-black bg-white text-black'
                            : 'cursor-not-allowed border-slate-200 bg-white text-slate-400',
          ]"
          @click="canNavigate(i) && emit('navigate', s.key)"
        >
          {{ i + 1 }}
        </button>
        <span
          :class="['hidden text-[11px] sm:block', current === i ? 'font-semibold text-black' : 'text-slate-400']"
        >{{ s.label }}</span>
      </div>
      <div
        v-if="i < steps.length - 1"
        :class="['mb-3.5 mx-2 h-px flex-1', current > i ? 'bg-black' : 'bg-slate-200']"
      />
    </template>
  </div>
</template>

<script setup>
defineProps({
  steps:       { type: Array,    required: true },
  current:     { type: Number,   required: true },
  canNavigate: { type: Function, required: true },
})
const emit = defineEmits(['navigate'])
</script>
