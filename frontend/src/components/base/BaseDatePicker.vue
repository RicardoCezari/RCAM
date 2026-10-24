<template>
  <div ref="container">
    <!-- Campo de exibição -->
    <div
      role="button"
      tabindex="0"
      :class="[
        'flex cursor-pointer items-center justify-between gap-2 border text-sm outline-none transition focus:ring-2',
        compact ? 'rounded-lg bg-white px-2.5 py-1.5 focus:border-black/30 focus:ring-black/10' : 'h-[46px] rounded-xl bg-slate-50 px-4 focus:bg-white',
        hasError
          ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
          : compact ? 'border-black/10' : 'border-slate-200 focus:border-black focus:ring-black/10',
        modelValue ? 'text-slate-900' : 'text-slate-400',
      ]"
      @click="abrir"
      @keydown.enter.prevent="abrir"
      @keydown.space.prevent="abrir"
    >
      <span class="truncate">{{ modelValue ? formatarBR(modelValue) : placeholder }}</span>
      <span class="mdi mdi-calendar-month-outline text-[16px] text-slate-400"></span>
    </div>

    <Teleport to="body">
      <Transition name="dp-fade">
        <div
          v-if="aberto"
          class="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
        >
          <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="fechar"></div>

          <Transition name="dp-up" appear>
            <div
              v-if="aberto"
              class="relative w-full overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-xs sm:rounded-3xl"
            >
              <!-- Cabeçalho escuro com a data escolhida -->
              <div class="bg-black px-6 pb-4 pt-5">
                <p class="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">Selecionar data</p>
                <p class="mt-1 text-2xl font-black leading-tight text-white">
                  {{ modelValue ? formatarLongo(modelValue) : 'Escolha um dia' }}
                </p>
              </div>

              <!-- Navegação de mês -->
              <div class="flex items-center justify-between px-3 pt-3">
                <button
                  type="button"
                  class="flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 disabled:text-slate-300 disabled:hover:bg-transparent"
                  :disabled="!podeMesAnterior"
                  aria-label="Mês anterior"
                  @click="mudarMes(-1)"
                >
                  <span class="mdi mdi-chevron-left text-[22px]"></span>
                </button>
                <p class="text-sm font-semibold capitalize text-slate-900">{{ nomeMes }} {{ ano }}</p>
                <button
                  type="button"
                  class="flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100"
                  aria-label="Próximo mês"
                  @click="mudarMes(1)"
                >
                  <span class="mdi mdi-chevron-right text-[22px]"></span>
                </button>
              </div>

              <!-- Dias -->
              <div class="px-3 pb-2 pt-1">
                <div class="grid grid-cols-7 text-center text-[11px] font-medium uppercase text-slate-400">
                  <span v-for="(d, i) in SEMANA" :key="i" class="py-1.5">{{ d }}</span>
                </div>
                <div class="grid grid-cols-7 gap-y-0.5">
                  <template v-for="(dia, i) in dias" :key="i">
                    <span v-if="!dia" class="h-10"></span>
                    <button
                      v-else
                      type="button"
                      :disabled="dia.desabilitado"
                      :class="[
                        'mx-auto flex h-10 w-10 items-center justify-center rounded-full text-sm transition',
                        dia.selecionado
                          ? 'bg-black font-semibold text-white'
                          : dia.desabilitado
                            ? 'text-slate-300'
                            : dia.hoje
                              ? 'font-semibold text-black ring-1 ring-black/30 hover:bg-slate-100'
                              : 'text-slate-700 hover:bg-slate-100',
                      ]"
                      @click="escolher(dia.iso)"
                    >{{ dia.numero }}</button>
                  </template>
                </div>
              </div>

              <!-- Ações -->
              <div class="flex items-center justify-between border-t border-slate-100 px-6 pb-6 pt-3">
                <button
                  type="button"
                  class="text-sm font-medium text-slate-500 transition hover:text-slate-900 disabled:text-slate-300"
                  :disabled="hojeBloqueado"
                  @click="escolher(hoje)"
                >Hoje</button>
                <button
                  type="button"
                  class="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
                  @click="fechar"
                >Cancelar</button>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  modelValue:  { type: String,  default: '' },   // 'YYYY-MM-DD'
  min:         { type: String,  default: '' },   // 'YYYY-MM-DD'
  placeholder: { type: String,  default: 'dd/mm/aaaa' },
  hasError:    { type: Boolean, default: false },
  compact:     { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

const SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

const aberto = ref(false)
const ano    = ref(new Date().getFullYear())
const mes    = ref(new Date().getMonth()) // 0-11

function pad(n) { return String(n).padStart(2, '0') }
function paraISO(a, m, d) { return `${a}-${pad(m + 1)}-${pad(d)}` }

const hoje = computed(() => {
  const d = new Date()
  return paraISO(d.getFullYear(), d.getMonth(), d.getDate())
})
const hojeBloqueado = computed(() => !!props.min && hoje.value < props.min)

function formatarBR(iso) {
  const [a, m, d] = iso.split('-')
  return `${d}/${m}/${a}`
}
function formatarLongo(iso) {
  const [a, m, d] = iso.split('-').map(Number)
  const dia = new Date(a, m - 1, d).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')
  return `${dia}, ${d} de ${MESES[m - 1].slice(0, 3)}`
}

const nomeMes = computed(() => MESES[mes.value])

const dias = computed(() => {
  const primeiro = new Date(ano.value, mes.value, 1).getDay()
  const total    = new Date(ano.value, mes.value + 1, 0).getDate()
  const lista = Array(primeiro).fill(null)
  for (let d = 1; d <= total; d++) {
    const iso = paraISO(ano.value, mes.value, d)
    lista.push({
      numero: d,
      iso,
      selecionado: iso === props.modelValue,
      hoje: iso === hoje.value,
      desabilitado: !!props.min && iso < props.min,
    })
  }
  return lista
})

// Não deixa navegar para meses inteiros anteriores ao mínimo
const podeMesAnterior = computed(() => {
  if (!props.min) return true
  const ultimoDiaMesAnterior = paraISO(
    mes.value === 0 ? ano.value - 1 : ano.value,
    mes.value === 0 ? 11 : mes.value - 1,
    new Date(ano.value, mes.value, 0).getDate(),
  )
  return ultimoDiaMesAnterior >= props.min
})

function mudarMes(delta) {
  const d = new Date(ano.value, mes.value + delta, 1)
  ano.value = d.getFullYear()
  mes.value = d.getMonth()
}

function abrir() {
  const base = props.modelValue || (hojeBloqueado.value ? props.min : hoje.value)
  const [a, m] = base.split('-').map(Number)
  ano.value = a
  mes.value = m - 1
  aberto.value = true
}

function fechar() { aberto.value = false }

// Tocar no dia já seleciona e fecha, sem botão OK
function escolher(iso) {
  emit('update:modelValue', iso)
  fechar()
}

function aoKeydown(e) { if (e.key === 'Escape' && aberto.value) fechar() }
onMounted(() => document.addEventListener('keydown', aoKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', aoKeydown))
</script>

<style scoped>
.dp-fade-enter-active, .dp-fade-leave-active { transition: opacity 0.2s ease; }
.dp-fade-enter-from, .dp-fade-leave-to { opacity: 0; }

.dp-up-enter-active { transition: transform 0.28s cubic-bezier(0.34, 1.4, 0.64, 1), opacity 0.2s ease; }
.dp-up-leave-active { transition: transform 0.18s ease, opacity 0.15s ease; }
.dp-up-enter-from { transform: translateY(24px) scale(0.96); opacity: 0; }
.dp-up-leave-to  { transform: translateY(12px) scale(0.98); opacity: 0; }
</style>
