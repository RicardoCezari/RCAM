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
        <label
          class="relative flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-200 hover:text-black"
          title="Tirar foto do objeto"
        >
          <span class="mdi mdi-camera-outline text-[20px]"></span>
          <span
            v-if="obj.fotos.length"
            class="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-black px-1 text-[10px] font-bold text-white"
          >
            {{ obj.fotos.length }}
          </span>
          <input
            :ref="(el) => { inputsFoto[obj._id] = el }"
            type="file"
            accept="image/*"
            capture="environment"
            class="sr-only"
            @click="emit('abrir-camera', obj._id)"
            @change="aoEscolherFoto(obj._id, $event)"
          />
        </label>
        <button
          v-if="objetos.length > 1 && !objetoTravado(obj)"
          type="button"
          class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-500"
          :aria-label="`Remover objeto ${objIdx + 1}`"
          title="Remover objeto"
          @click="removerObjeto(obj._id)"
        >
          <span class="mdi mdi-trash-can-outline text-[16px]"></span>
        </button>
      </div>

      <!-- Miniaturas das fotos do objeto -->
      <div v-if="obj.fotos.length" class="border-b border-slate-100 px-4 py-3">
        <div class="flex flex-wrap gap-2">
          <div
            v-for="(f, fIdx) in obj.fotos"
            :key="f._k"
            :class="[
              'relative h-16 w-16 overflow-hidden rounded-lg border',
              f.status === 'erro' ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50',
            ]"
          >
            <img v-if="f.status === 'ok'" :src="f.url" :alt="f.name" class="h-full w-full object-cover" />
            <div v-else-if="f.status === 'carregando'" class="flex h-full w-full items-center justify-center text-slate-400">
              <span class="mdi mdi-loading animate-spin text-[20px]"></span>
            </div>
            <div v-else class="flex h-full w-full flex-col items-center justify-center gap-0.5 text-red-500">
              <span class="mdi mdi-close-circle text-[22px]"></span>
              <span class="text-[9px] font-semibold leading-none">Falhou</span>
            </div>
            <button
              v-if="f.status !== 'carregando'"
              type="button"
              class="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white transition hover:bg-black"
              title="Remover foto"
              @click="emit('remover-foto', obj._id, fIdx)"
            >
              <span class="mdi mdi-close text-[11px]"></span>
            </button>
          </div>
        </div>

        <div
          v-if="temErro(obj)"
          class="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs"
        >
          <span class="font-medium text-red-700">Uma foto não carregou. Tire novamente.</span>
          <button
            type="button"
            class="flex items-center gap-1 rounded-lg bg-black px-3 py-1.5 font-semibold text-white transition hover:bg-black/85"
            @click="inputsFoto[obj._id]?.click()"
          >
            <span class="mdi mdi-camera-outline text-[14px]"></span>
            Tirar outra
          </button>
          <button
            type="button"
            class="rounded-lg border border-black/10 bg-white px-3 py-1.5 font-medium text-slate-600 transition hover:bg-slate-100"
            @click="descartarErros(obj)"
          >
            Descartar
          </button>
        </div>

        <div
          v-else-if="promptFoto[obj._id]"
          class="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs"
        >
          <span class="font-medium text-slate-700">Foto adicionada. Tirar mais uma?</span>
          <button
            type="button"
            class="flex items-center gap-1 rounded-lg bg-black px-3 py-1.5 font-semibold text-white transition hover:bg-black/85"
            @click="inputsFoto[obj._id]?.click()"
          >
            <span class="mdi mdi-camera-outline text-[14px]"></span>
            Tirar outra
          </button>
          <button
            type="button"
            class="rounded-lg border border-black/10 bg-white px-3 py-1.5 font-medium text-slate-600 transition hover:bg-slate-100"
            @click="promptFoto[obj._id] = false"
          >
            Continuar
          </button>
        </div>
      </div>

      <div class="p-4">
        <!-- Tipo de objeto -->
        <div class="mb-4">
          <div class="mb-1.5 flex items-center justify-between">
            <label :for="`tipo-${obj._id}`" class="text-sm font-medium text-slate-700">
              Tipo de objeto <span class="text-red-500">*</span>
            </label>
            <label
          :class="['relative flex items-center gap-1.5 select-none', objetoTravado(obj) ? 'cursor-not-allowed opacity-60' : 'cursor-pointer']"
        >
              <span
                :class="[
                  'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition',
                  obj.eh_orcamento ? 'border-black bg-black' : 'border-slate-300 bg-white',
                ]"
              >
                <span v-if="obj.eh_orcamento" class="mdi mdi-check text-[11px] font-black text-white"></span>
              </span>
              <span class="text-xs font-medium text-slate-500">Orçamento</span>
              <input type="checkbox" class="sr-only" :checked="obj.eh_orcamento" :disabled="objetoTravado(obj)" @change="aoToggleOrcamento(obj._id, !obj.eh_orcamento)" />
            </label>
          </div>
          <div class="relative">
            <select
              :id="`tipo-${obj._id}`"
              :value="obj.tipo_objeto_id"
              :disabled="objetoTravado(obj)"
              :data-erro="erros[obj._id]?.tipo ? '' : null"
              :class="[
                'w-full appearance-none rounded-xl border bg-slate-50 px-4 py-3 pr-8 text-sm text-slate-900 outline-none transition focus:bg-white focus:ring-2',
                objetoTravado(obj) ? 'cursor-not-allowed opacity-60' : '',
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
              class="flex items-start gap-1.5
                     sm:grid sm:grid-cols-[1.25rem_1fr_5.5rem_2rem] sm:items-center sm:gap-x-2"
            >
              <!-- ① Índice (só no desktop) -->
              <span class="hidden text-center text-[11px] font-medium text-slate-400 sm:block">
                {{ svIdx + 1 }}
              </span>

              <!-- ② Select -->
              <div class="min-w-0 flex-1">
                <div v-if="!obj.tipo_objeto_id" class="flex h-10 items-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 text-xs text-slate-400">
                  <span class="mdi mdi-arrow-up-left mr-1.5 text-[13px]"></span>
                  Escolha o tipo primeiro
                </div>
                <div v-else class="relative">
                  <select
                    :value="sv.servico_id"
                    :disabled="!!sv._itemId"
                    :data-erro="erros[obj._id]?.servicos?.[sv._id] ? '' : null"
                    :class="[
                      'w-full appearance-none rounded-xl border bg-slate-50 px-3 py-2.5 pr-7 text-sm text-slate-900 outline-none transition focus:bg-white focus:ring-2',
                      sv._itemId ? 'cursor-not-allowed opacity-60' : '',
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
                      {{ rotuloServico(s, obj) }}
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

              <!-- ③ Quantidade e valor -->

                <!-- Stepper quantidade -->
                <div
                  class="flex h-[42px] shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
                  :aria-label="`Quantidade do serviço ${svIdx + 1}`"
                >
                  <button
                    type="button"
                    class="flex w-6 items-center justify-center text-slate-500 transition hover:bg-slate-100 disabled:text-slate-300 sm:w-7"
                    :disabled="sv.quantidade <= 1 || !!sv._itemId"
                    :aria-label="`Diminuir quantidade do serviço ${svIdx + 1}`"
                    @click="mudarQuantidade(obj._id, sv._id, -1)"
                  >
                    <span class="mdi mdi-minus text-[13px]"></span>
                  </button>
                  <span class="flex w-6 items-center justify-center border-x border-slate-200 text-sm font-semibold text-slate-900 sm:w-8">
                    {{ sv.quantidade }}
                  </span>
                  <button
                    type="button"
                    class="flex w-6 items-center justify-center text-slate-500 transition hover:bg-slate-100 disabled:text-slate-300 sm:w-7"
                    :disabled="!!sv._itemId"
                    :aria-label="`Aumentar quantidade do serviço ${svIdx + 1}`"
                    @click="mudarQuantidade(obj._id, sv._id, 1)"
                  >
                    <span class="mdi mdi-plus text-[13px]"></span>
                  </button>
                </div>

              <!--
                ④ Botão remover:
                   Mobile  → ao lado do valor, na mesma linha
                   Desktop → último item da grid
              -->
              <button
                type="button"
                :class="[
                  'flex h-[42px] w-7 shrink-0 items-center justify-center rounded-lg transition',
                  'sm:h-8 sm:w-8 sm:self-center',
                  obj.servicos.length > 1 && !sv._itemId
                    ? 'text-slate-400 hover:bg-red-50 hover:text-red-500'
                    : 'cursor-not-allowed text-slate-200',
                ]"
                :disabled="obj.servicos.length === 1 || !!sv._itemId"
                :aria-label="`Remover serviço ${svIdx + 1}`"
                :title="sv._itemId ? 'Serviço já gravado na O.S.' : obj.servicos.length === 1 ? 'O objeto deve ter ao menos um serviço' : 'Remover serviço'"
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

  </div>
</template>

<script setup>
import { reactive } from 'vue'
import { formatarMoeda, valorDoServico } from '@/composables/useItens'

const props = defineProps({
  adicionarFotos: { type: Function, required: true },
  objetos:        { type: Array,    required: true },
  erros:          { type: Object,   required: true },
  tiposObjeto:    { type: Array,    default: () => [] },
  servicos:       { type: Array,    default: () => [] },
  totalObjeto:    { type: Function, required: true },
  nomeTipoObjeto: { type: Function, required: true },
  mudarQuantidade:{ type: Function, required: true },
  carregando:     { type: Boolean,  default: false },
})

const emit = defineEmits([
  'adicionar-objeto', 'remover-objeto',
  'adicionar-servico', 'remover-servico',
  'selecionar-servico',
  'mudar-tipo', 'toggle-orcamento', 'remover-foto', 'abrir-camera',
])

const inputsFoto = {}
const promptFoto = reactive({})

const temErro = (obj) => obj.fotos.some(f => f.status === 'erro')

// Objeto/serviço já gravado na O.S. (ao editar uma O.S. criada): não muda aqui, só recebe acréscimos
const objetoTravado = (obj) => obj.servicos.some(s => s._itemId)

function descartarErros(obj) {
  for (let i = obj.fotos.length - 1; i >= 0; i--) {
    if (obj.fotos[i].status === 'erro') emit('remover-foto', obj._id, i)
  }
}

async function aoEscolherFoto(objId, event) {
  const adicionadas = await props.adicionarFotos(objId, event)
  if (adicionadas) promptFoto[objId] = true
}

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

function rotuloServico(servico, obj) {
  const valor = Number(valorDoServico(servico, obj.tipo_objeto_id))
  return valor > 0 ? `${servico.nome} · ${formatarMoeda(valor)}` : servico.nome
}

const adicionarObjeto  = ()           => emit('adicionar-objeto')
const removerObjeto    = (id)         => emit('remover-objeto', id)
const adicionarServico = (objId)      => emit('adicionar-servico', objId)
const removerServico   = (objId, sId) => emit('remover-servico', objId, sId)

function aoSelecionarServico(objId, svId, servicoId) {
  emit('selecionar-servico', objId, svId, servicoId)
}
</script>
