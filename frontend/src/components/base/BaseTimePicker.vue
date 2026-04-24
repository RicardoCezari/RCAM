<template>
  <div ref="container">
    <!-- Campo de exibição -->
    <div
      role="button"
      tabindex="0"
      :class="[
        'flex cursor-pointer items-center justify-between rounded-xl border bg-slate-50 px-4 py-3 text-sm outline-none transition focus:bg-white focus:ring-2',
        hasError
          ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
          : 'border-slate-200 focus:border-black focus:ring-black/10',
        modelValue ? 'text-slate-900' : 'text-slate-400',
      ]"
      @click="abrir"
      @keydown.enter.prevent="abrir"
      @keydown.space.prevent="abrir"
    >
      <span>{{ modelValue || placeholder }}</span>
      <span class="mdi mdi-clock-outline text-[16px] text-slate-400"></span>
    </div>

    <Teleport to="body">
      <Transition name="tp-fade">
        <div
          v-if="aberto"
          class="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
        >
          <!-- Backdrop -->
          <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="fechar"></div>

          <!-- Card do picker -->
          <Transition name="tp-up">
            <div
              v-if="aberto"
              class="relative w-full overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-xs sm:rounded-3xl"
            >
              <!-- Header escuro -->
              <div class="bg-black px-8 pt-6 pb-5">
                <p class="mb-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
                  {{ modo === 'hora' ? 'Selecionar hora' : 'Selecionar minutos' }}
                </p>
                <div class="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    :class="['rounded-xl px-3 py-0.5 text-[52px] leading-none font-black transition-colors', modo === 'hora' ? 'text-white' : 'text-white/35 hover:text-white/60']"
                    @click="modo = 'hora'"
                  >{{ pad(hora) }}</button>
                  <span class="text-[48px] leading-none font-black text-white/25">:</span>
                  <button
                    type="button"
                    :class="['rounded-xl px-3 py-0.5 text-[52px] leading-none font-black transition-colors', modo === 'minuto' ? 'text-white' : 'text-white/35 hover:text-white/60']"
                    @click="modo = 'minuto'"
                  >{{ pad(minuto) }}</button>
                </div>
              </div>

              <!-- Relógio analógico -->
              <div class="flex justify-center py-6">
                <div
                  ref="clockFace"
                  class="relative rounded-full bg-slate-100"
                  style="width: 240px; height: 240px; touch-action: none; cursor: pointer;"
                  @pointerdown="aoPointerDown"
                  @pointermove="aoPointerMove"
                  @pointerup="aoPointerUp"
                >
                  <!-- SVG: ponteiro -->
                  <svg
                    class="absolute inset-0 pointer-events-none"
                    width="240" height="240"
                    viewBox="0 0 240 240"
                  >
                    <line
                      x1="120" y1="120"
                      :x2="handPos.x" :y2="handPos.y"
                      stroke="#000" stroke-width="2"
                      stroke-linecap="round"
                    />
                    <circle cx="120" cy="120" r="4" fill="#000" />
                    <circle :cx="handPos.x" :cy="handPos.y" r="20" fill="#000" />
                  </svg>

                  <!-- Números -->
                  <span
                    v-for="n in currentNumbers"
                    :key="n.key"
                    :style="{ left: n.x + 'px', top: n.y + 'px' }"
                    :class="[
                      'absolute flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-sm leading-none font-semibold pointer-events-none select-none z-10',
                      n.selected ? 'text-white' : 'text-slate-600',
                    ]"
                  >{{ n.label }}</span>
                </div>
              </div>

              <!-- Ações -->
              <div class="flex items-center justify-between border-t border-slate-100 px-6 pb-7 pt-3">
                <button
                  type="button"
                  class="text-sm font-medium text-slate-400 transition hover:text-slate-700"
                  @click="limpar"
                >Limpar</button>
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    class="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
                    @click="fechar"
                  >Cancelar</button>
                  <button
                    type="button"
                    class="rounded-xl bg-black px-6 py-2 text-sm font-semibold text-white transition hover:bg-black/85"
                    @click="confirmar"
                  >OK</button>
                </div>
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
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '--:--' },
  hasError:    { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

// Horas válidas: 7-18
// Posição no relógio: (h % 12) * 30° — igual a um relógio real
// 7→7h, 8→8h, 9→9h, 10→10h, 11→11h, 12→12h(topo), 13→1h, 14→2h, 15→3h, 16→4h, 17→5h, 18→6h
const HORAS_VALIDAS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]

// ── estado ─────────────────────────────────────────────────────
const aberto     = ref(false)
const modo       = ref('hora')
const hora       = ref(7)
const minuto     = ref(0)
const clockFace  = ref(null)
const isDragging = ref(false)

// ── helpers ────────────────────────────────────────────────────
function pad(n)   { return String(n).padStart(2, '0') }
function toRad(d) { return d * Math.PI / 180 }

// ── geometria ──────────────────────────────────────────────────
const CENTER = 120
const RADIUS = 90

function xyAt(angleDeg) {
  const r = toRad(angleDeg)
  return { x: CENTER + RADIUS * Math.cos(r), y: CENTER + RADIUS * Math.sin(r) }
}

// Ângulo de uma hora no relógio analógico real
// h=12 → topo (-90°), h=7 → posição das 7h, h=13 → posição das 1h, etc.
function hourAngle(h) { return (h % 12) * 30 - 90 }

// Ângulo para minutos (0 no topo, cresce horário)
function minuteAngle(m) { return m / 60 * 360 - 90 }

// ── posição do ponteiro ────────────────────────────────────────
const handPos = computed(() => {
  if (modo.value === 'hora') return xyAt(hourAngle(hora.value))
  return xyAt(minuteAngle(minuto.value))
})

// ── números exibidos ───────────────────────────────────────────
const currentNumbers = computed(() => {
  if (modo.value === 'hora') {
    return HORAS_VALIDAS.map(h => {
      const { x, y } = xyAt(hourAngle(h))
      return { key: `h${h}`, label: String(h), x, y, selected: hora.value === h }
    })
  } else {
    return Array.from({ length: 12 }, (_, i) => {
      const m = i * 5
      const { x, y } = xyAt(minuteAngle(m))
      return { key: `m${m}`, label: m === 0 ? '00' : String(m), x, y, selected: minuto.value === m }
    })
  }
})

// ── abertura / fechamento ──────────────────────────────────────
function abrir() {
  if (props.modelValue) {
    const [h, m] = props.modelValue.split(':').map(Number)
    hora.value   = HORAS_VALIDAS.includes(h) ? h : 7
    minuto.value = isNaN(m) ? 0 : m
  } else {
    hora.value   = 7
    minuto.value = 0
  }
  modo.value   = 'hora'
  aberto.value = true
}

function fechar()    { aberto.value = false }
function confirmar() { emit('update:modelValue', `${pad(hora.value)}:${pad(minuto.value)}`); fechar() }
function limpar()    { emit('update:modelValue', ''); fechar() }

// ── interação (click + drag) ───────────────────────────────────
function updateFromPointer(e) {
  if (!clockFace.value) return
  const rect = clockFace.value.getBoundingClientRect()
  const dx   = (e.clientX - rect.left)  - rect.width  / 2
  const dy   = (e.clientY - rect.top)   - rect.height / 2

  // ângulo em graus a partir do topo, sentido horário
  let angle = Math.atan2(dy, dx) * 180 / Math.PI + 90
  if (angle < 0) angle += 360

  if (modo.value === 'hora') {
    // pos12: posição no mostrador (0=12h, 1=1h, ..., 6=6h, 7=7h, ..., 11=11h)
    const pos12 = Math.round(angle / 30) % 12
    let h
    if      (pos12 === 0)              h = 12       // topo = 12h
    else if (pos12 >= 1 && pos12 <= 6) h = pos12 + 12  // tarde: 1→13, 2→14 ... 6→18
    else                               h = pos12       // manhã: 7→7, 8→8 ... 11→11
    hora.value = h
  } else {
    minuto.value = Math.round(angle / 6) % 60
  }
}

function aoPointerDown(e) {
  isDragging.value = true
  clockFace.value.setPointerCapture(e.pointerId)
  updateFromPointer(e)
}
function aoPointerMove(e) {
  if (!isDragging.value) return
  updateFromPointer(e)
}
function aoPointerUp(e) {
  if (!isDragging.value) return
  isDragging.value = false
  clockFace.value.releasePointerCapture(e.pointerId)
  updateFromPointer(e)
  if (modo.value === 'hora') setTimeout(() => { modo.value = 'minuto' }, 200)
}

// ── Escape fecha ───────────────────────────────────────────────
function aoKeydown(e) { if (e.key === 'Escape' && aberto.value) fechar() }
onMounted(() => document.addEventListener('keydown', aoKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', aoKeydown))
</script>

<style scoped>
.tp-fade-enter-active, .tp-fade-leave-active { transition: opacity 0.2s ease; }
.tp-fade-enter-from, .tp-fade-leave-to { opacity: 0; }

.tp-up-enter-active { transition: transform 0.28s cubic-bezier(0.34, 1.4, 0.64, 1), opacity 0.2s ease; }
.tp-up-leave-active { transition: transform 0.18s ease, opacity 0.15s ease; }
.tp-up-enter-from { transform: translateY(24px) scale(0.96); opacity: 0; }
.tp-up-leave-to  { transform: translateY(12px) scale(0.98); opacity: 0; }
</style>
