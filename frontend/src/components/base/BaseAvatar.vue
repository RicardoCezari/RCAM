<template>
  <span class="inline-flex shrink-0 select-none items-center justify-center overflow-hidden">
    <img v-if="url" :src="url" :alt="nome" class="h-full w-full object-cover" @error="falhou = true" />
    <template v-else>{{ iniciais }}</template>
  </span>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { fileUrl } from '@/utils/arquivos'

// Tamanho, formato e cores ficam por conta de quem usa (classes no próprio componente)
const props = defineProps({
  nome: { type: String, default: '' },
  src: { type: String, default: null },
})

const falhou = ref(false)
watch(() => props.src, () => { falhou.value = false })

const url = computed(() => (props.src && !falhou.value ? fileUrl(props.src) : ''))

const iniciais = computed(() =>
  (props.nome || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join('')
    .toUpperCase()
)
</script>
