<template>
  <teleport to="body">
    <transition name="viewer">
      <div
        v-if="modelValue && atual"
        class="fixed inset-0 z-[45] flex flex-col bg-black/95 text-white"
        role="dialog"
        aria-modal="true"
        @click.self="fechar"
      >
        <!-- Barra superior -->
        <div class="flex shrink-0 items-center justify-between gap-3 px-4 py-3">
          <div class="min-w-0">
            <p class="truncate text-sm font-semibold">{{ titulo }}</p>
            <p class="text-xs text-white/55">{{ indice + 1 }} de {{ fotos.length }}</p>
          </div>
          <div class="flex shrink-0 items-center gap-2">
            <button
              v-if="podeRemover"
              type="button"
              class="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition hover:bg-red-500/80"
              title="Excluir foto"
              @click="emit('remover', atual)"
            >
              <span class="mdi mdi-trash-can-outline text-[20px]"></span>
            </button>
            <button
              type="button"
              class="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
              title="Fechar"
              @click="fechar"
            >
              <span class="mdi mdi-close text-[22px]"></span>
            </button>
          </div>
        </div>

        <!-- Imagem -->
        <div class="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-4 sm:px-14" @click.self="fechar">
          <img
            :key="atual.id"
            :src="fileUrl(atual.url)"
            :alt="titulo"
            class="max-h-full max-w-full rounded-lg object-contain"
          />

          <template v-if="fotos.length > 1">
            <button
              type="button"
              class="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 transition hover:bg-white/20"
              title="Anterior"
              @click="ir(-1)"
            >
              <span class="mdi mdi-chevron-left text-[26px]"></span>
            </button>
            <button
              type="button"
              class="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 transition hover:bg-white/20"
              title="Próxima"
              @click="ir(1)"
            >
              <span class="mdi mdi-chevron-right text-[26px]"></span>
            </button>
          </template>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { fileUrl } from '@/utils/arquivos'

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  fotos: { type: Array, default: () => [] },
  indice: { type: Number, default: 0 },
  titulo: { type: String, default: 'Fotos' },
  podeRemover: { type: Boolean, default: true },
})

const emit = defineEmits(['update:modelValue', 'update:indice', 'remover'])

const atual = computed(() => props.fotos[props.indice] ?? null)

function fechar() {
  emit('update:modelValue', false)
}

function ir(delta) {
  const total = props.fotos.length
  if (total) emit('update:indice', (props.indice + delta + total) % total)
}

// Se a foto exibida for removida, ajusta o índice ou fecha quando acabarem
watch(
  () => props.fotos.length,
  (total) => {
    if (!props.modelValue) return
    if (!total) return fechar()
    if (props.indice >= total) emit('update:indice', total - 1)
  }
)

function aoPressionarTecla(e) {
  if (!props.modelValue) return
  if (e.key === 'Escape') fechar()
  else if (e.key === 'ArrowLeft') ir(-1)
  else if (e.key === 'ArrowRight') ir(1)
}

onMounted(() => window.addEventListener('keydown', aoPressionarTecla))
onBeforeUnmount(() => window.removeEventListener('keydown', aoPressionarTecla))
</script>

<style scoped>
.viewer-enter-active,
.viewer-leave-active {
  transition: opacity 0.18s ease;
}
.viewer-enter-from,
.viewer-leave-to {
  opacity: 0;
}
</style>
