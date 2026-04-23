<template>
  <div :class="$attrs.class">
    <label
      v-if="label"
      :for="id"
      :class="['mb-1.5 block', labelClass || 'text-sm font-medium text-slate-700']"
    >
      {{ label }}
      <span v-if="required" class="text-red-500"> *</span>
      <span v-if="optional" class="ml-1 text-xs font-normal text-slate-400">(opcional)</span>
    </label>

    <slot />

    <p v-if="error" class="mt-1.5 text-xs text-red-600">
      <span class="mdi mdi-alert-circle-outline"></span> {{ error }}
    </p>
  </div>
</template>

<script setup>
defineOptions({ inheritAttrs: false })
defineProps({
  id: { type: String, default: '' },
  label: { type: String, default: '' },
  required: { type: Boolean, default: false },
  optional: { type: Boolean, default: false },
  error: { type: String, default: '' },
  labelClass: { type: String, default: '' },
})
</script>
