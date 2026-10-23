<template>
  <span
    v-if="iconOnly"
    :title="info.label"
    :class="['inline-flex h-6 w-6 shrink-0 items-center justify-center', corTexto]"
  >
    <span :class="['mdi text-[20px]', info.icon]"></span>
  </span>
  <span
    v-else
    :class="['inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset', info.classes]"
  >
    <span :class="['mdi text-[15px]', info.icon]"></span>
    {{ info.label }}
  </span>
</template>

<script setup>
import { computed } from 'vue'
import { estadoInfo, ESTADO_PARCIAL } from '@/utils/ordem'

const props = defineProps({
  estado: { type: String, default: '' },
  iconOnly: { type: Boolean, default: false },
  parcial: { type: Boolean, default: false },
})

const info = computed(() => (props.parcial ? ESTADO_PARCIAL : estadoInfo(props.estado)))

// No modo só ícone, usa apenas a cor do texto (sem fundo nem borda)
const corTexto = computed(() => info.value.classes.split(' ').find((c) => c.startsWith('text-')) ?? '')
</script>
