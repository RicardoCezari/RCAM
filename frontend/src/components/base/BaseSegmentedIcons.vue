<template>
  <div class="flex gap-1 overflow-x-auto" role="group">
    <button
      v-for="op in options"
      :key="op.value"
      type="button"
      :title="op.disabled && op.dica ? op.dica : op.label"
      :aria-pressed="op.value === modelValue"
      :disabled="disabled || op.disabled"
      :class="[
        'flex shrink-0 items-center gap-1.5 rounded-lg border text-xs font-medium transition disabled:opacity-50',
        small ? 'h-7 px-2' : 'h-8 px-2.5',
        op.value === modelValue
          ? 'border-black bg-black text-white'
          : 'border-black/10 bg-white text-black hover:bg-black/5',
      ]"
      @click="$emit('update:modelValue', op.value)"
    >
      <span
        :class="[
          'mdi text-[15px]',
          loading && op.value === modelValue ? 'mdi-loading animate-spin' : op.icon,
          op.value !== modelValue && op.iconClass,
        ]"
      ></span>
      <!-- No celular só o item ativo mostra o texto; a partir de sm todos mostram -->
      <span :class="op.value === modelValue ? '' : 'hidden sm:inline'">{{ op.label }}</span>
    </button>
  </div>
</template>

<script setup>
defineProps({
  modelValue: { type: [String, Number, Boolean], default: '' },
  // [{ value, label, icon, iconClass?, disabled? }]
  options: { type: Array, required: true },
  disabled: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  small: { type: Boolean, default: false },
})

defineEmits(['update:modelValue'])
</script>
