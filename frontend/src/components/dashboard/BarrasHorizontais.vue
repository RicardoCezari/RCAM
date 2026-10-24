<template>
  <ul class="space-y-2.5">
    <li v-for="item in itens" :key="item.chave" :title="item.dica || undefined">
      <div class="flex items-baseline justify-between gap-3 text-sm">
        <span class="min-w-0 truncate text-black/80">{{ item.rotulo }}</span>
        <span class="shrink-0 font-semibold tabular-nums text-black">{{ item.texto }}</span>
      </div>
      <div class="mt-1 h-2 overflow-hidden rounded-full bg-black/5" role="presentation">
        <div
          :class="['h-full rounded-full', item.cor || 'bg-black']"
          :style="{ width: `${largura(item.valor)}%` }"
        ></div>
      </div>
      <p v-if="item.detalhe" class="mt-0.5 text-[11px] text-black/45">{{ item.detalhe }}</p>
    </li>
  </ul>
</template>

<script setup>
import { computed } from 'vue'

// itens: [{ chave, rotulo, valor (base da barra), texto (valor exibido), detalhe?, dica?, cor? (classe de fundo) }]
const props = defineProps({
  itens: { type: Array, required: true },
})

const maximo = computed(() => Math.max(0, ...props.itens.map((i) => i.valor)))
// Barras com valor positivo nunca somem: largura mínima de 2%
const largura = (valor) => (valor > 0 && maximo.value > 0 ? Math.max(2, (valor / maximo.value) * 100) : 0)
</script>
