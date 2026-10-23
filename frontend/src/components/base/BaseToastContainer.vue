<template>
  <Teleport to="body">
    <div
      class="pointer-events-none fixed right-4 top-4 z-[70] flex w-[calc(100vw-2rem)] flex-col items-end gap-2 sm:w-auto"
      aria-live="polite"
    >
      <TransitionGroup name="toast">
        <div
          v-for="toast in toastStore.toasts"
          :key="toast.id"
          role="status"
          class="pointer-events-auto flex w-full items-center gap-3 rounded-2xl border border-black/10 bg-white py-3 pl-3 pr-2 shadow-[0_12px_32px_rgba(0,0,0,0.14)] sm:w-80"
        >
          <span
            :class="['flex h-8 w-8 shrink-0 items-center justify-center rounded-full', estilos[toast.type].icone]"
          >
            <span :class="['mdi text-[18px]', estilos[toast.type].mdi]"></span>
          </span>
          <p class="min-w-0 flex-1 text-sm font-medium leading-snug text-black">{{ toast.message }}</p>
          <button
            type="button"
            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-black/40 transition hover:bg-black/5 hover:text-black"
            aria-label="Fechar aviso"
            @click="toastStore.remover(toast.id)"
          >
            <span class="mdi mdi-close text-[16px]"></span>
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup>
import { useToastStore } from '@/stores/toast'

const toastStore = useToastStore()

const estilos = {
  success: { icone: 'bg-emerald-50 text-emerald-600', mdi: 'mdi-check-circle-outline' },
  error: { icone: 'bg-red-50 text-red-600', mdi: 'mdi-alert-circle-outline' },
  info: { icone: 'bg-sky-50 text-sky-600', mdi: 'mdi-information-outline' },
}
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(24px);
}
.toast-move {
  transition: transform 0.25s ease;
}
</style>
