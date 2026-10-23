<template>
  <BaseModal
    :model-value="modelValue"
    :title="title"
    subtitle="Esta ação não pode ser desfeita"
    icon="mdi-trash-can-outline"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div class="space-y-3 px-6 py-5">
      <p class="text-sm text-slate-600"><slot /></p>
      <p v-if="hint" class="text-xs text-slate-400">{{ hint }}</p>
      <BaseAlert :message="error" />
    </div>

    <template #footer>
      <button
        type="button"
        class="rounded-xl border border-black/10 px-5 py-2.5 text-sm font-medium text-black hover:bg-black/5"
        @click="$emit('update:modelValue', false)"
      >
        Cancelar
      </button>
      <button
        type="button"
        :disabled="loading"
        class="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-60"
        @click="$emit('confirm')"
      >
        <span v-if="loading" class="mdi mdi-loading animate-spin text-[16px]"></span>
        Excluir
      </button>
    </template>
  </BaseModal>
</template>

<script setup>
import BaseModal from '@/components/base/BaseModal.vue'
import BaseAlert from '@/components/base/BaseAlert.vue'

defineProps({
  modelValue: { type: Boolean, required: true },
  title: { type: String, required: true },
  hint: { type: String, default: '' },
  error: { type: String, default: '' },
  loading: { type: Boolean, default: false },
})

defineEmits(['update:modelValue', 'confirm'])
</script>
