<template>
  <teleport to="body">
    <transition name="modal">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-end justify-center px-4 pb-4 sm:items-center sm:pb-0"
      >
        <div
          class="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
          @click="$emit('update:modelValue', false)"
        ></div>

        <div
          ref="dialogo"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="idTitulo"
          tabindex="-1"
          :class="['relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-[0_32px_80px_rgba(0,0,0,0.22)] outline-none', size === 'xl' ? 'max-w-3xl' : 'max-w-lg']"
        >
          <div class="flex shrink-0 items-center justify-between border-b border-black/8 px-4 py-3 sm:px-6">
            <div class="flex items-center gap-3">
              <div
                v-if="icon"
                class="flex h-8 w-8 items-center justify-center rounded-xl bg-black text-white"
              >
                <span :class="['mdi text-[15px]', icon]"></span>
              </div>
              <div>
                <h3 :id="idTitulo" class="text-sm font-semibold text-slate-900">{{ title }}</h3>
                <p v-if="subtitle" class="mt-0.5 text-xs text-slate-400">{{ subtitle }}</p>
              </div>
            </div>

            <button
              type="button"
              aria-label="Fechar"
              class="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              @click="$emit('update:modelValue', false)"
            >
              <span class="mdi mdi-close text-[18px]"></span>
            </button>
          </div>

          <div class="min-h-0 flex-1 overflow-y-auto"><slot /></div>

          <div
            v-if="$slots.footer"
            class="flex shrink-0 items-center justify-end gap-3 border-t border-black/8 px-4 py-3 sm:px-6"
          >
            <slot name="footer" />
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  icon: { type: String, default: '' },
  size: { type: String, default: 'lg' },
})

const emit = defineEmits(['update:modelValue'])

const idTitulo = `modal-titulo-${Math.random().toString(36).slice(2, 9)}`
const dialogo = ref(null)
let elementoAnterior = null

// Escape fecha o modal do topo mesmo que o foco não esteja dentro dele
function aoTeclar(event) {
  if (event.key !== 'Escape') return
  const abertos = document.querySelectorAll('[role="dialog"]')
  if (abertos[abertos.length - 1] === dialogo.value) emit('update:modelValue', false)
}

watch(
  () => props.modelValue,
  async (aberto) => {
    if (aberto) {
      elementoAnterior = document.activeElement
      document.addEventListener('keydown', aoTeclar)
      await nextTick()
      // não rouba o foco de um campo já focado dentro do modal (autofocus)
      if (dialogo.value && !dialogo.value.contains(document.activeElement)) dialogo.value.focus()
    } else {
      document.removeEventListener('keydown', aoTeclar)
      elementoAnterior?.focus?.()
      elementoAnterior = null
    }
  },
  { immediate: true }
)

onBeforeUnmount(() => document.removeEventListener('keydown', aoTeclar))
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
