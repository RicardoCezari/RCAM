<template>
  <teleport to="body">
    <transition name="modal">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-end justify-center px-4 pb-4 sm:items-center sm:pb-0"
        @keydown.esc="$emit('update:modelValue', false)"
      >
        <div
          class="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
          @click="$emit('update:modelValue', false)"
        ></div>

        <div class="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-[0_32px_80px_rgba(0,0,0,0.22)]">
          <div class="flex items-center justify-between border-b border-black/8 px-6 py-4">
            <div class="flex items-center gap-3">
              <div
                v-if="icon"
                class="flex h-8 w-8 items-center justify-center rounded-xl bg-black text-white"
              >
                <span :class="['mdi text-[15px]', icon]"></span>
              </div>
              <div>
                <h3 class="text-sm font-semibold text-slate-900">{{ title }}</h3>
                <p v-if="subtitle" class="mt-0.5 text-xs text-slate-400">{{ subtitle }}</p>
              </div>
            </div>

            <button
              type="button"
              class="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              @click="$emit('update:modelValue', false)"
            >
              <span class="mdi mdi-close text-[18px]"></span>
            </button>
          </div>

          <slot />

          <div
            v-if="$slots.footer"
            class="flex items-center justify-end gap-3 border-t border-black/8 px-6 py-4"
          >
            <slot name="footer" />
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup>
defineProps({
  modelValue: { type: Boolean, required: true },
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  icon: { type: String, default: '' },
})

defineEmits(['update:modelValue'])
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
