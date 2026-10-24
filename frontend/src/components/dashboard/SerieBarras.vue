<template>
  <div>
    <div class="flex gap-2">
      <!-- Eixo vertical (O.S. criadas) -->
      <div class="flex h-40 w-8 shrink-0 flex-col justify-between text-right text-[10px] tabular-nums text-black/45" aria-hidden="true">
        <span>{{ topo }}</span>
        <span>{{ Math.round(topo / 2) }}</span>
        <span>0</span>
      </div>

      <div class="relative h-40 min-w-0 flex-1 border-b border-l border-black/15">
        <div class="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-black/10"></div>
        <div class="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-black/10"></div>

        <div class="relative flex h-full items-end gap-px sm:gap-0.5">
          <div
            v-for="(ponto, i) in serie"
            :key="ponto.data"
            class="group relative flex h-full flex-1 items-end"
          >
            <div
              class="w-full rounded-t bg-black/80 transition group-hover:bg-black"
              :style="{ height: `${altura(ponto.total)}%` }"
            ></div>
            <div
              :class="[
                'pointer-events-none absolute bottom-full z-10 mb-1 hidden whitespace-nowrap rounded-lg bg-black px-2 py-1 text-xs text-white shadow group-hover:block',
                i > serie.length / 2 ? 'right-0' : 'left-0',
              ]"
            >
              {{ dica(ponto) }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Eixo horizontal -->
    <div class="ml-10 mt-1 flex text-[10px] text-black/45" aria-hidden="true">
      <span v-for="(ponto, i) in serie" :key="ponto.data" class="min-w-0 flex-1 text-center">
        <span v-if="i % passo === 0" class="whitespace-nowrap">{{ rotulo(ponto.data) }}</span>
      </span>
    </div>

    <p class="mt-2 flex items-center gap-1.5 text-xs text-black/55">
      <span class="inline-block h-2.5 w-2.5 rounded-sm bg-black/80"></span>
      O.S. criadas por {{ unidade }}
    </p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatarDataBr } from '@/utils/periodos'

// serie: [{ data: 'AAAA-MM-DD' (início do período), total }]; agrupamento: 'day' | 'week' | 'month'
const props = defineProps({
  serie: { type: Array, required: true },
  agrupamento: { type: String, default: 'day' },
})

const UNIDADES = { day: 'dia', week: 'semana', month: 'mês' }
const unidade = computed(() => UNIDADES[props.agrupamento] ?? 'dia')

// Teto do eixo: múltiplo par para que a marca do meio seja um inteiro
const topo = computed(() => {
  const maior = Math.max(1, ...props.serie.map((p) => p.total))
  return maior % 2 === 0 ? maior : maior + 1
})
const altura = (total) => (total > 0 ? Math.max(2, (total / topo.value) * 100) : 0)

// No máximo ~8 rótulos no eixo, para não se sobreporem
const passo = computed(() => Math.max(1, Math.ceil(props.serie.length / 8)))

function rotulo(iso) {
  const [a, m, d] = iso.split('-')
  if (props.agrupamento === 'month') return `${m}/${a.slice(2)}`
  return `${d}/${m}`
}

function dica(ponto) {
  const [a, m] = ponto.data.split('-')
  const quando = props.agrupamento === 'week' ? `Semana de ${formatarDataBr(ponto.data)}`
    : props.agrupamento === 'month' ? `Mês ${m}/${a}`
      : formatarDataBr(ponto.data)
  return `${quando}: ${ponto.total} O.S.`
}
</script>
