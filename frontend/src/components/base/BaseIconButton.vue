<template>
  <button
    type="button"
    :title="title"
    :aria-label="title"
    :class="[
      'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-black/10 bg-white transition disabled:cursor-not-allowed disabled:opacity-50 sm:h-9 sm:w-9',
      variant === 'danger'
        ? 'text-black/50 hover:border-red-200 hover:bg-red-50 hover:text-red-600'
        : 'text-black hover:bg-black hover:text-white',
    ]"
  >
    <span :class="['mdi text-[17px]', icon]"></span>
  </button>
</template>

<script setup>
defineProps({
  icon: { type: String, required: true },
  title: { type: String, required: true },
  variant: { type: String, default: 'default' }, // 'default' | 'danger'
})
</script>
