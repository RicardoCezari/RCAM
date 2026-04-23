<template>
  <div class="relative rounded-2xl border border-black/10 bg-[#fafafa] shadow-[0_4px_14px_rgba(0,0,0,0.04)] transition duration-200 focus-within:border-black focus-within:bg-white focus-within:ring-4 focus-within:ring-black/5">
    <select
      :id="id"
      :value="modelValue"
      class="h-14 w-full appearance-none rounded-2xl bg-transparent px-4 pr-10 text-sm text-black outline-none"
      @change="$emit('update:modelValue', $event.target.value)"
    >
      <option value="">{{ placeholder }}</option>
      <option v-for="opt in options" :key="opt.value" :value="opt.value">
        {{ opt.label }}
      </option>
    </select>

    <span class="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-black/45">
      <i class="mdi mdi-chevron-down text-lg"></i>
    </span>
  </div>
</template>

<script setup>
defineProps({
  id: { type: String, default: '' },
  modelValue: { type: String, default: '' },
  options: { type: Array, default: () => [] }, // [{ value, label }]
  placeholder: { type: String, default: 'Selecione...' },
})

defineEmits(['update:modelValue'])
</script>
