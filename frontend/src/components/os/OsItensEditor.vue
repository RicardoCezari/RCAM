<template>
  <div class="flex flex-col gap-4">

    <!-- ── Card de cada objeto ──────────────────────────────── -->
    <div
      v-for="(obj, objIdx) in objetos"
      :key="obj._id"
      class="overflow-hidden rounded-2xl border border-black/8 bg-white shadow-[0_2px_12px_rgba(15,23,42,0.05)]"
    >
      <!-- Cabeçalho do objeto -->
      <div class="flex items-center gap-2.5 border-b border-slate-100 bg-slate-50 px-4 py-3">
        <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-black text-[11px] font-bold text-white">
          {{ objIdx + 1 }}
        </div>
        <div class="min-w-0 flex-1">
          <p v-if="obj.tipo_objeto_id" class="truncate text-sm font-semibold text-slate-900">
            {{ nomeTipoObjeto(obj.tipo_objeto_id) }}
          </p>
          <p v-else class="text-sm text-slate-400">Objeto {{ objIdx + 1 }}</p>
          <p v-if="totalObjeto(obj) > 0" class="text-[11px] font-semibold text-slate-500">
            {{ formatarMoeda(totalObjeto(obj)) }}
          </p>
        </div>
        <button
          v-if="objetos.length > 1"
          type="button"
          class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-500"
          :aria-label="`Remover objeto ${objIdx + 1}`"
          title="Remover objeto"
          @click="removerObjeto(obj._id)"
        >
          <span class="mdi mdi-trash-can-outline text-[16px]"></span>
        </button>
      </div>

      <div class="p-4">
        <!-- Tipo de objeto -->
        <div class="mb-4">
          <div class="mb-1.5 flex items-center justify-between">
            <label :for="`tipo-${obj._id}`" class="text-sm font-medium text-slate-700">
              Tipo de objeto <span class="text-red-500">*</span>
            </label>
            <label class="flex cursor-pointer items-center gap-1.5 select-none">
              <span
                :class="[
                  'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition',
                  obj.eh_orcamento ? 'border-black bg-black' : 'border-slate-300 bg-white',
                ]"
              >
                <span v-if="obj.eh_orcamento" class="mdi mdi-check text-[11px] font-black text-white"></span>
              </span>
              <span class="text-xs font-medium text-slate-500">Orçamento</span>
              <input type="checkbox" class="sr-only" :checked="obj.eh_orcamento" @change="aoToggleOrcamento(obj._id, !obj.eh_orcamento)" />
            </label>
          </div>
          <div class="relative">
            <select
              :id="`tipo-${obj._id}`"
              :value="obj.tipo_objeto_id"
              :class="[
                'w-full appearance-none rounded-xl border bg-slate-50 px-4 py-3 pr-8 text-sm text-slate-900 outline-none transition focus:bg-white focus:ring-2',
                erros[obj._id]?.tipo
                  ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                  : 'border-slate-200 focus:border-black focus:ring-black/10',
              ]"
              @change="aoMudarTipo(obj._id, $event.target.value)"
            >
              <option value="" disabled>
                {{ carregando ? 'Carregando tipos...' : 'Selecione o tipo de objeto' }}
              </option>
              <option v-for="t in tiposObjeto" :key="t.id" :value="String(t.id)">{{ t.nome }}</option>
            </select>
            <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              <span class="mdi mdi-chevron-down text-[16px]"></span>
            </span>
          </div>
          <p v-if="erros[obj._id]?.tipo" class="mt-1.5 text-xs text-red-600">
            <span class="mdi mdi-alert-circle-outline"></span> {{ erros[obj._id].tipo }}
          </p>
        </div>

        <!-- Lista de serviços -->
        <div class="mb-3">
          <p class="mb-2 text-sm font-medium text-slate-700">Serviços</p>

          <div class="flex flex-col gap-3">
            <!--
              Layout de cada linha de serviço:

              Mobile  (<640px) — grid 3 colunas [1.25rem | 1fr | 2rem]:
                Linha 1: [# row-span-2/3]  [Select ──────────────]  [×]
                Linha 2: [# spanning    ]  [−][N][+]   [R$ 0,00  ]
                Linha 3: (só qty > 1)       [# spanning]  [ N× = R$ 0,00 → direita]

              Desktop (≥640px) — grid 6 colunas [1.25rem | 1fr | 5.5rem | 7rem | 7rem | 2rem]:
                Uma linha só:  [#]  [Select ──────────]  [−][N][+]  [R$ 0,00]  [subtotal]  [×]
                                                                                (vazio se qty=1)
            -->
            <div
              v-for="(sv, svIdx) in obj.servicos"
              :key="sv._id"
              class="grid grid-cols-[1.25rem_1fr_2rem] items-start gap-x-2 gap-y-1.5
                     sm:grid-cols-[1.25rem_1fr_5.5rem_7rem_2rem] sm:items-center sm:gap-y-0"
            >
              <!-- ① Índice — row-span-2 mobile, 1 linha desktop -->
              <span class="row-span-2 self-center text-center text-[11px] font-medium text-slate-400 sm:row-span-1">
                {{ svIdx + 1 }}
              </span>

              <!-- ② Select — col-2 linha-1 mobile | col-2 desktop -->
              <div class="min-w-0">
                <div v-if="!obj.tipo_objeto_id" class="flex h-10 items-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 text-xs text-slate-400">
                  <span class="mdi mdi-arrow-up-left mr-1.5 text-[13px]"></span>
                  Selecione o tipo de objeto primeiro
                </div>
                <div v-else class="relative">
                  <select
                    :value="sv.servico_id"
                    :class="[
                      'w-full appearance-none rounded-xl border bg-slate-50 px-3 py-2.5 pr-7 text-sm text-slate-900 outline-none transition focus:bg-white focus:ring-2',
                      erros[obj._id]?.servicos?.[sv._id]
                        ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                        : 'border-slate-200 focus:border-black focus:ring-black/10',
                    ]"
                    @change="aoSelecionarServico(obj._id, sv._id, $event.target.value)"
                  >
                    <option value="" disabled>
                      {{ carregando ? 'Carregando serviços...' : 'Selecione um serviço' }}
                    </option>
                    <option v-for="s in servicosParaObjeto(obj)" :key="s.id" :value="String(s.id)">
                      {{ s.nome }}
                    </option>
                  </select>
                  <span class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
                    <span class="mdi mdi-chevron-down text-[14px]"></span>
                  </span>
                </div>
                <p v-if="erros[obj._id]?.servicos?.[sv._id]" class="mt-1 text-xs text-red-600">
                  <span class="mdi mdi-alert-circle-outline"></span> {{ erros[obj._id].servicos[sv._id] }}
                </p>
              </div>

              <!--
                ③ Wrapper linha-2 mobile (col-start-2, col-span-1):
                   sm:contents → filhos ocupam cols 3 e 4 no desktop.
                   Vem antes do botão remover para que auto-placement funcione (cols 3→4→5).
              -->
              <div class="col-start-2 flex items-center gap-2 sm:contents">

                <!-- Stepper quantidade → auto col-3 desktop -->
                <div
                  class="flex h-9 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
                  :aria-label="`Quantidade do serviço ${svIdx + 1}`"
                >
                  <button
                    type="button"
                    class="flex w-7 items-center justify-center text-slate-500 transition hover:bg-slate-100 disabled:text-slate-300"
                    :disabled="sv.quantidade <= 1"
                    :aria-label="`Diminuir quantidade do serviço ${svIdx + 1}`"
                    @click="mudarQuantidade(obj._id, sv._id, -1)"
                  >
                    <span class="mdi mdi-minus text-[13px]"></span>
                  </button>
                  <span class="flex w-8 items-center justify-center border-x border-slate-200 text-sm font-semibold text-slate-900">
                    {{ sv.quantidade }}
                  </span>
                  <button
                    type="button"
                    class="flex w-7 items-center justify-center text-slate-500 transition hover:bg-slate-100"
                    :aria-label="`Aumentar quantidade do serviço ${svIdx + 1}`"
                    @click="mudarQuantidade(obj._id, sv._id, 1)"
                  >
                    <span class="mdi mdi-plus text-[13px]"></span>
                  </button>
                </div>

                <!-- Valor unitário → auto col-4 desktop -->
                <div class="relative flex-1 sm:flex-none sm:w-full">
                  <span class="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-medium text-slate-400">R$</span>
                  <input
                    :value="sv._valorStr"
                    type="text"
                    inputmode="decimal"
                    placeholder="0,00"
                    title="Valor unitário (por unidade)"
                    class="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-8 pr-2 text-sm font-semibold text-slate-900 outline-none transition focus:border-black focus:bg-white focus:ring-2 focus:ring-black/10"
                    @input="aoEditarValor(obj._id, sv._id, $event)"
                    @blur="aoBlurValor(obj._id, sv._id)"
                  />
                </div>

              </div>

              <!--
                ④ Botão remover:
                   Mobile  → row-start-1 col-start-3 (linha 1, col 3, ao lado do select)
                   Desktop → auto col-5 (último, sem col-start explícito para não quebrar auto-placement)
              -->
              <button
                type="button"
                :class="[
                  'row-start-1 col-start-3 self-start mt-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition',
                  'sm:row-auto sm:col-auto sm:mt-0 sm:self-center',
                  obj.servicos.length > 1
                    ? 'text-slate-400 hover:bg-red-50 hover:text-red-500'
                    : 'cursor-not-allowed text-slate-200',
                ]"
                :disabled="obj.servicos.length === 1"
                :aria-label="`Remover serviço ${svIdx + 1}`"
                :title="obj.servicos.length === 1 ? 'O objeto deve ter ao menos um serviço' : 'Remover serviço'"
                @click="removerServico(obj._id, sv._id)"
              >
                <span class="mdi mdi-minus-circle-outline text-[17px]"></span>
              </button>

            </div>
          </div>
        </div>

        <!-- Adicionar serviço -->
        <button
          type="button"
          class="flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs font-medium text-slate-500 transition hover:border-black hover:text-slate-800"
          @click="adicionarServico(obj._id)"
        >
          <span class="mdi mdi-plus text-[14px]"></span>
          Adicionar serviço
        </button>
      </div>
    </div>

    <!-- ── Botão Adicionar Objeto ──────────────────────────── -->
    <button
      type="button"
      class="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 py-3.5 text-sm font-medium text-slate-500 transition hover:border-black hover:text-slate-900"
      @click="adicionarObjeto"
    >
      <span class="mdi mdi-plus-circle-outline text-[20px]"></span>
      Adicionar outro objeto
    </button>

    <!-- ── Total geral ─────────────────────────────────────── -->
    <div
      v-if="totalGeral > 0"
      class="overflow-hidden rounded-2xl border border-black/8 bg-black text-white"
    >
      <!-- Subtotal (só aparece quando há desconto) -->
      <div v-if="parseMoeda(descontoStr) > 0" class="flex items-center justify-between px-5 pt-4">
        <p class="text-sm text-white/55">Subtotal</p>
        <p class="text-sm text-white/55">{{ formatarMoeda(totalGeral) }}</p>
      </div>

      <!-- Linha do desconto (sempre visível) -->
      <div class="flex items-center justify-between px-5 pt-4" :class="{ 'pt-2': parseMoeda(descontoStr) > 0 }">
        <p class="text-sm text-white/70">Desconto</p>
        <div class="relative">
          <span class="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-medium text-white/50">− R$</span>
          <input
            :value="descontoStr"
            type="text"
            inputmode="decimal"
            placeholder="0,00"
            class="w-32 rounded-lg border border-white/20 bg-white/10 py-1.5 pl-10 pr-3 text-right text-sm font-semibold text-white placeholder:text-white/30 outline-none transition focus:border-white/50 focus:bg-white/15"
            @input="aoEditarDesconto"
            @blur="aoBlurDesconto"
          />
        </div>
      </div>

      <!-- Total final -->
      <div class="flex items-center justify-between px-5 py-4" :class="{ 'pt-2': true }">
        <p class="text-sm font-medium">Total</p>
        <p class="text-xl font-black tracking-tight">{{ formatarMoeda(totalFinal) }}</p>
      </div>
    </div>

  </div>
</template>

<script setup>
import { formatarMoeda, parseMoeda } from '@/composables/useItens'

const props = defineProps({
  objetos:        { type: Array,    required: true },
  erros:          { type: Object,   required: true },
  tiposObjeto:    { type: Array,    default: () => [] },
  servicos:       { type: Array,    default: () => [] },
  totalGeral:     { type: Number,   default: 0 },
  totalFinal:     { type: Number,   default: 0 },
  descontoStr:    { type: String,   default: '' },
  totalObjeto:    { type: Function, required: true },
  nomeTipoObjeto: { type: Function, required: true },
  mudarQuantidade:{ type: Function, required: true },
  carregando:     { type: Boolean,  default: false },
})

const emit = defineEmits([
  'adicionar-objeto', 'remover-objeto',
  'adicionar-servico', 'remover-servico',
  'selecionar-servico', 'editar-valor', 'blur-valor',
  'editar-desconto', 'blur-desconto',
  'mudar-tipo', 'toggle-orcamento',
])

function aoMudarTipo(objId, tipoId) {
  emit('mudar-tipo', objId, tipoId)
}

function aoToggleOrcamento(objId, value) {
  emit('toggle-orcamento', objId, value)
}

function servicosParaObjeto(obj) {
  if (!obj.tipo_objeto_id) return props.servicos
  const tipoId = Number(obj.tipo_objeto_id)
  return props.servicos.filter(s => {
    const ids = s.tipo_ids
    return !ids || ids.length === 0 || ids.includes(tipoId)
  })
}

const adicionarObjeto  = ()           => emit('adicionar-objeto')
const removerObjeto    = (id)         => emit('remover-objeto', id)
const adicionarServico = (objId)      => emit('adicionar-servico', objId)
const removerServico   = (objId, sId) => emit('remover-servico', objId, sId)

function aoSelecionarServico(objId, svId, servicoId) {
  emit('selecionar-servico', objId, svId, servicoId)
}
function aoEditarValor(objId, svId, e) {
  emit('editar-valor', objId, svId, e)
}
function aoBlurValor(objId, svId) {
  emit('blur-valor', objId, svId)
}
function aoEditarDesconto(e) {
  emit('editar-desconto', e)
}
function aoBlurDesconto() {
  emit('blur-desconto')
}
</script>
