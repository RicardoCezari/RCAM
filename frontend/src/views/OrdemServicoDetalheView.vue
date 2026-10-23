<template>
  <AppLayout>
    <div v-if="carregando" class="py-20 text-center text-sm text-black/50">
      <span class="mdi mdi-loading animate-spin text-[20px] align-middle"></span>
      Carregando O.S...
    </div>

    <div v-else-if="!ordem">
      <BaseAlert :message="erro" />
      <BaseIconButton icon="mdi-arrow-left" title="Voltar para a lista" class="mt-4" @click="voltar" />
    </div>

    <template v-else>
      <!-- Cabeçalho -->
      <div class="mb-5 flex items-start justify-between gap-3 sm:mb-8 sm:gap-4">
        <div class="flex min-w-0 items-start gap-3">
          <BaseIconButton icon="mdi-arrow-left" title="Voltar para a lista" class="mt-1" @click="voltar" />
          <BasePageTitle :title="`O.S. #${ordem.numero}`" :description="descricao" class="min-w-0" />
        </div>

        <div class="flex shrink-0 items-center gap-2">
          <span
            v-if="parcialmenteConcluida"
            :title="`${prontos} de ${ativos} itens prontos`"
            class="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-600 ring-1 ring-inset ring-orange-200"
          >
            <span class="mdi mdi-check-circle-outline text-[15px]"></span>
            {{ prontos }}/{{ ativos }}
          </span>
          <span class="sm:hidden"><BaseStatusBadge :estado="form.estado" icon-only /></span>
          <span class="hidden sm:inline-flex"><BaseStatusBadge :estado="form.estado" /></span>
          <BaseIconButton icon="mdi-printer-outline" title="Imprimir O.S." @click="imprimirAtual" />
        </div>
      </div>

      <div class="grid items-start gap-4 sm:gap-6 lg:grid-cols-3">
        <!-- Coluna principal -->
        <div class="min-w-0 space-y-4 sm:space-y-6 lg:col-span-2">
          <!-- Itens agrupados por objeto -->
          <section :class="cardClass">
            <header class="flex items-center justify-between border-b border-black/5 px-4 py-3 sm:px-6 sm:py-4">
              <h2 class="text-sm font-semibold text-black">Itens da O.S.</h2>
              <span class="text-xs text-black/50">{{ itens.length }} {{ itens.length === 1 ? 'item' : 'itens' }}</span>
            </header>

            <p v-if="!itens.length" class="px-6 py-10 text-center text-sm text-black/50">Esta O.S. não possui itens.</p>

            <div v-for="grupo in grupos" :key="grupo.key" class="border-b border-black/5 last:border-b-0">
              <!-- Cabeçalho do objeto -->
              <div class="flex items-center gap-2 bg-black/[0.03] px-4 py-2.5 sm:px-6">
                <button
                  type="button"
                  class="flex min-w-0 flex-1 items-center gap-2 text-left"
                  :disabled="!grupo.fotos.length"
                  :title="grupo.fotos.length ? 'Ver fotos do objeto' : ''"
                  @click="abrirFotos(grupo.key)"
                >
                  <span class="truncate text-sm font-semibold text-black">{{ grupo.nome }}</span>
                  <span
                    :class="[
                      'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                      grupoPronto(grupo)
                        ? 'bg-emerald-50 text-emerald-700'
                        : grupoParcial(grupo)
                          ? 'bg-orange-50 text-orange-600'
                          : 'bg-black/5 text-black/50',
                    ]"
                  >
                    {{ prontosDoGrupo(grupo) }}/{{ grupo.itens.length }}
                  </span>
                  <span v-if="grupo.fotos.length" class="mdi mdi-image-outline shrink-0 text-[16px] text-black/40"></span>
                </button>

                <label
                  class="relative flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-black/10 bg-white text-black transition hover:bg-black hover:text-white"
                  title="Tirar foto do objeto"
                >
                  <span :class="['mdi text-[18px]', enviandoFotos ? 'mdi-loading animate-spin' : 'mdi-camera-outline']"></span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    class="sr-only"
                    :disabled="enviandoFotos"
                    @change="enviarNovasFotos($event, grupo.itens[0].id)"
                  />
                </label>
              </div>

              <!-- Miniaturas -->
              <div v-if="grupo.fotos.length" class="flex gap-2 overflow-x-auto px-4 pt-3 sm:px-6">
                <button
                  v-for="(f, i) in grupo.fotos"
                  :key="f.id"
                  type="button"
                  class="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-black/10 bg-black/5 sm:h-16 sm:w-16"
                  @click="abrirFotos(grupo.key, i)"
                >
                  <img :src="fileUrl(f.url)" alt="Foto do objeto" loading="lazy" class="h-full w-full object-cover" />
                </button>
              </div>

              <!-- Serviços do objeto -->
              <div class="divide-y divide-black/5">
                <div v-for="item in grupo.itens" :key="item.id" class="px-4 py-3 sm:px-6">
                  <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0">
                      <p class="text-sm font-medium leading-tight text-black">{{ item.servico_nome }}</p>
                      <p v-if="subtotal(item) > 0" class="mt-0.5 text-xs text-black/50">
                        {{ item.quantidade > 1 ? `${item.quantidade} × ` : '' }}Subtotal {{ formatarMoeda(subtotal(item)) }}
                      </p>
                    </div>

                    <span
                      v-if="item.estado === 'CANCELADO'"
                      class="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-200"
                    >
                      <span class="mdi mdi-close-circle-outline text-[15px]"></span>
                      Cancelado
                    </span>
                    <button
                      v-else
                      type="button"
                      :disabled="item.salvando"
                      :aria-pressed="item.estado === 'CONCLUIDO'"
                      :title="item.estado === 'CONCLUIDO' ? 'Marcar como pendente' : 'Marcar como pronto'"
                      :class="[
                        'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition disabled:opacity-60',
                        item.estado === 'CONCLUIDO'
                          ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                          : 'bg-white text-black/55 ring-black/15 hover:bg-black/5',
                      ]"
                      @click="alternarPronto(item)"
                    >
                      <span :class="['mdi text-[15px]', item.salvando ? 'mdi-loading animate-spin' : item.estado === 'CONCLUIDO' ? 'mdi-check-circle' : 'mdi-clock-outline']"></span>
                      {{ item.estado === 'CONCLUIDO' ? 'Pronto' : 'Pendente' }}
                    </button>
                  </div>

                  <div class="mt-2.5 flex items-center gap-2">
                    <div class="flex h-9 shrink-0 items-center rounded-xl border border-black/10 bg-white">
                      <button
                        type="button"
                        class="flex h-9 w-8 items-center justify-center text-black/60 transition hover:text-black disabled:opacity-30"
                        :disabled="item.quantidade <= 1"
                        aria-label="Diminuir quantidade"
                        @click="item.quantidade--"
                      >
                        <span class="mdi mdi-minus text-[14px]"></span>
                      </button>
                      <span class="w-6 text-center text-sm font-medium text-black">{{ item.quantidade }}</span>
                      <button
                        type="button"
                        class="flex h-9 w-8 items-center justify-center text-black/60 transition hover:text-black disabled:opacity-30"
                        :disabled="item.quantidade >= 99"
                        aria-label="Aumentar quantidade"
                        @click="item.quantidade++"
                      >
                        <span class="mdi mdi-plus text-[14px]"></span>
                      </button>
                    </div>

                    <div class="relative min-w-0 flex-1 sm:max-w-[10rem]">
                      <span class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xs text-black/40">R$</span>
                      <input
                        :value="item.valorStr"
                        type="text"
                        inputmode="numeric"
                        placeholder="0,00"
                        aria-label="Valor unitário"
                        class="h-9 w-full rounded-xl border border-black/10 bg-white pl-8 pr-3 text-right text-sm outline-none transition focus:border-black/30 focus:ring-2 focus:ring-black/10"
                        @input="aoDigitarValor(item, $event)"
                      />
                    </div>

                    <button
                      type="button"
                      :title="item.eh_orcamento ? 'Item em orçamento (valor a definir)' : 'Marcar como orçamento'"
                      :aria-pressed="item.eh_orcamento"
                      :class="[
                        'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition',
                        item.eh_orcamento
                          ? 'border-amber-200 bg-amber-50 text-amber-700'
                          : 'border-black/10 bg-white text-black/30 hover:text-black',
                      ]"
                      @click="item.eh_orcamento = !item.eh_orcamento"
                    >
                      <span class="mdi mdi-phone-outline text-[17px]"></span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <footer class="flex items-center justify-between gap-3 border-t border-black/5 px-4 py-3 sm:px-6 sm:py-4">
              <span v-if="pendentesOrcamento" class="flex items-center gap-1.5 text-xs text-amber-700">
                <span class="mdi mdi-phone-outline text-[15px]"></span>
                {{ pendentesOrcamento }} {{ pendentesOrcamento === 1 ? 'item aguarda' : 'itens aguardam' }} orçamento
              </span>
              <span v-else></span>

              <div class="text-right">
                <p class="text-xs text-black/50">Total</p>
                <p class="text-lg font-semibold text-black sm:text-xl">{{ formatarMoeda(total) }}</p>
              </div>
            </footer>
          </section>

          <!-- Fotos gerais -->
          <section :class="[cardClass, 'p-4 sm:p-6']">
            <div class="flex items-center justify-between gap-3">
              <h2 class="text-sm font-semibold text-black">Fotos gerais</h2>
              <div class="flex items-center gap-2">
                <label
                  class="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-black/10 bg-white text-black transition hover:bg-black hover:text-white"
                  title="Tirar foto"
                >
                  <span :class="['mdi text-[18px]', enviandoFotos ? 'mdi-loading animate-spin' : 'mdi-camera-outline']"></span>
                  <input type="file" accept="image/*" capture="environment" class="sr-only" :disabled="enviandoFotos" @change="enviarNovasFotos($event)" />
                </label>
                <label
                  class="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-black/10 bg-white text-black transition hover:bg-black hover:text-white"
                  title="Escolher da galeria"
                >
                  <span class="mdi mdi-image-plus-outline text-[18px]"></span>
                  <input type="file" accept="image/*" multiple class="sr-only" :disabled="enviandoFotos" @change="enviarNovasFotos($event)" />
                </label>
              </div>
            </div>

            <div v-if="fotosGerais.length" class="mt-3 flex flex-wrap gap-2">
              <button
                v-for="(f, i) in fotosGerais"
                :key="f.id"
                type="button"
                class="h-16 w-16 overflow-hidden rounded-xl border border-black/10 bg-black/5 sm:h-20 sm:w-20"
                @click="abrirFotos('geral', i)"
              >
                <img :src="fileUrl(f.url)" alt="Foto geral" loading="lazy" class="h-full w-full object-cover" />
              </button>
            </div>
            <p v-else class="mt-2 text-xs text-black/45">Nenhuma foto geral nesta O.S.</p>
          </section>

          <section :class="[cardClass, 'p-4 sm:p-6']">
            <label for="os-obs" class="mb-1.5 block text-sm font-semibold text-black">Observações</label>
            <textarea
              id="os-obs"
              v-model="form.observacoes"
              rows="3"
              placeholder="Observações da O.S. (prazo especial, instrução ao técnico...)"
              :class="[inputClass, 'resize-none']"
            ></textarea>
          </section>
        </div>

        <!-- Coluna lateral -->
        <div class="min-w-0 space-y-4 sm:space-y-6">
          <section :class="[cardClass, 'p-4 sm:p-6']">
            <h2 class="mb-3 text-sm font-semibold text-black sm:mb-4">Cliente</h2>
            <div class="flex items-center gap-3">
              <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-black text-sm font-semibold text-white">
                {{ iniciais(ordem.cliente_nome) }}
              </div>
              <div class="min-w-0">
                <p class="truncate text-sm font-semibold text-black">{{ ordem.cliente_nome }}</p>
                <p class="flex items-center gap-1.5 text-xs text-black/60">
                  <span class="mdi mdi-phone-outline text-[14px]"></span>
                  {{ formatarTelefone(ordem.cliente_telefone) || '—' }}
                </p>
                <p v-if="ordem.cliente_cpf" class="flex items-center gap-1.5 text-xs text-black/60">
                  <span class="mdi mdi-card-account-details-outline text-[14px]"></span>
                  {{ formatarCpf(ordem.cliente_cpf) }}
                </p>
              </div>
            </div>
          </section>

          <section :class="[cardClass, 'space-y-4 p-4 sm:p-6']">
            <h2 class="text-sm font-semibold text-black">Entrega</h2>

            <div class="grid grid-cols-2 gap-3 lg:grid-cols-1">
              <BaseFormField id="os-data" label="Data">
                <input id="os-data" v-model="form.dataEntrega" type="date" :class="inputClass" />
              </BaseFormField>

              <BaseFormField id="os-hora" label="Hora" optional>
                <BaseTimePicker id="os-hora" v-model="form.horaEntrega" />
              </BaseFormField>
            </div>
          </section>

          <section :class="[cardClass, 'p-4 sm:p-6']">
            <h2 class="mb-3 text-sm font-semibold text-black sm:mb-4">Situação</h2>
            <div class="grid grid-cols-2 gap-2">
              <button
                v-for="key in opcoesEstado"
                :key="key"
                type="button"
                :class="[
                  'flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition',
                  form.estado === key
                    ? 'border-black bg-black text-white'
                    : 'border-black/10 bg-white text-black hover:bg-black/5',
                ]"
                @click="escolherEstado(key)"
              >
                <span :class="['mdi text-[17px]', estadoInfo(key).icon]"></span>
                {{ estadoInfo(key).label }}
              </button>
            </div>
          </section>
        </div>
      </div>

      <!-- Ações -->
      <div class="mt-4 space-y-3 sm:mt-6">
        <BaseAlert :message="erro" />

        <div class="flex items-center justify-end gap-3">
          <button
            type="button"
            class="flex flex-1 items-center justify-center gap-2 rounded-xl border border-black/10 px-5 py-2.5 text-sm font-medium text-black transition hover:bg-black/5 sm:flex-none"
            @click="descartar"
          >
            <span class="mdi mdi-undo-variant text-[16px]"></span>
            Descartar
          </button>
          <button
            type="button"
            :disabled="salvando"
            class="flex flex-1 items-center justify-center gap-2 rounded-xl bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-black/80 disabled:opacity-50 sm:flex-none"
            @click="salvar"
          >
            <span v-if="salvando" class="mdi mdi-loading animate-spin text-[16px]"></span>
            <span v-else class="mdi mdi-content-save-outline text-[16px]"></span>
            Salvar alterações
          </button>
        </div>
      </div>

      <FotoViewer
        v-model="viewer.aberto"
        v-model:indice="viewer.indice"
        :fotos="fotosViewer"
        :titulo="tituloViewer"
        @remover="fotoParaRemover = $event"
      />

      <BaseConfirmModal
        :model-value="!!fotoParaRemover"
        title="Excluir foto"
        :error="erroRemoverFoto"
        :loading="removendoFoto"
        @update:model-value="(v) => { if (!v) fotoParaRemover = null }"
        @confirm="removerFotoSelecionada"
      >
        Deseja excluir esta foto da O.S.?
      </BaseConfirmModal>
    </template>
  </AppLayout>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'
import BasePageTitle from '@/components/base/BasePageTitle.vue'
import BaseAlert from '@/components/base/BaseAlert.vue'
import BaseIconButton from '@/components/base/BaseIconButton.vue'
import BaseStatusBadge from '@/components/base/BaseStatusBadge.vue'
import BaseFormField from '@/components/base/BaseFormField.vue'
import BaseTimePicker from '@/components/base/BaseTimePicker.vue'
import BaseConfirmModal from '@/components/base/BaseConfirmModal.vue'
import FotoViewer from '@/components/os/FotoViewer.vue'
import { useImpressao } from '@/composables/useImpressao'
import { useToastStore } from '@/stores/toast'
import { formatarTelefone } from '@/composables/useClienteForm'
import { formatarMoeda, mascaraMonetaria, numeroParaMascara, parseMoeda } from '@/composables/useItens'
import { ESTADOS_SELECIONAVEIS, estadoInfo, dataISO, horaCurta } from '@/utils/ordem'
import { fileUrl } from '@/utils/arquivos'
import { comprimirImagem } from '@/utils/imagem'
import {
  buscarOrdem, atualizarOrdem, atualizarItemOrdem, mudarEstado, enviarFotos, removerFotoOrdem,
} from '@/services/ordensServico'

const route = useRoute()
const router = useRouter()
const { imprimirOrdem } = useImpressao()
const toast = useToastStore()

const cardClass = 'rounded-3xl border border-black/10 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.04)] sm:rounded-[28px]'
const inputClass =
  'w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-black/30 focus:ring-2 focus:ring-black/10'

const ordem = ref(null)
const itens = ref([])
const fotos = ref([])
const form = reactive({ estado: '', dataEntrega: '', horaEntrega: '', observacoes: '' })

const carregando = ref(true)
const salvando = ref(false)
const enviandoFotos = ref(false)
const erro = ref('')

const opcoesEstado = computed(() =>
  ESTADOS_SELECIONAVEIS.includes(ordem.value?.estado)
    ? ESTADOS_SELECIONAVEIS
    : [ordem.value?.estado, ...ESTADOS_SELECIONAVEIS]
)

const descricao = computed(() => {
  const data = ordem.value?.data_criacao ? new Date(ordem.value.data_criacao).toLocaleDateString('pt-BR') : ''
  return [data && `Aberta em ${data}`, ordem.value?.usuario_nome && `por ${ordem.value.usuario_nome}`]
    .filter(Boolean)
    .join(' ')
})

function subtotal(item) {
  return parseMoeda(item.valorStr) * item.quantidade
}

const total = computed(() => itens.value.reduce((soma, item) => soma + subtotal(item), 0))
const pendentesOrcamento = computed(() => itens.value.filter((i) => i.eh_orcamento).length)

// ── progresso dos itens ──────────────────────────────────────────────────
const itensAtivos = computed(() => itens.value.filter((i) => i.estado !== 'CANCELADO'))
const ativos = computed(() => itensAtivos.value.length)
const prontos = computed(() => itensAtivos.value.filter((i) => i.estado === 'CONCLUIDO').length)
const parcialmenteConcluida = computed(() => prontos.value > 0 && prontos.value < ativos.value)

// Um objeto = itens consecutivos do mesmo tipo; as fotos do objeto ficam presas ao primeiro item dele
const grupos = computed(() => {
  const lista = []
  for (const item of itens.value) {
    const temFotos = fotos.value.some((f) => f.item_id === item.id)
    let grupo = lista[lista.length - 1]
    if (!grupo || grupo.tipoId !== item.tipo_objeto_id || temFotos) {
      grupo = { key: item.id, tipoId: item.tipo_objeto_id, nome: item.tipo_objeto_nome || 'Objeto', itens: [] }
      lista.push(grupo)
    }
    grupo.itens.push(item)
  }
  return lista.map((g) => ({
    ...g,
    fotos: fotos.value.filter((f) => g.itens.some((i) => i.id === f.item_id)),
  }))
})

const fotosGerais = computed(() => fotos.value.filter((f) => !f.item_id))

function prontosDoGrupo(grupo) {
  return grupo.itens.filter((i) => i.estado === 'CONCLUIDO').length
}
const grupoPronto = (grupo) => prontosDoGrupo(grupo) === grupo.itens.length
const grupoParcial = (grupo) => prontosDoGrupo(grupo) > 0 && !grupoPronto(grupo)

// Marca/desmarca o item como pronto e já salva (item e, se mudar, o estado da O.S.)
async function alternarPronto(item) {
  if (item.salvando) return

  const estadoItemAnterior = item.estado
  const estadoOsAnterior = form.estado

  item.estado = estadoItemAnterior === 'CONCLUIDO' ? 'CADASTRADO' : 'CONCLUIDO'
  sincronizarEstadoOs()
  item.salvando = true

  try {
    await salvarItem(item)
  } catch (err) {
    item.estado = estadoItemAnterior
    form.estado = estadoOsAnterior
    item.salvando = false
    toast.erro(err?.response?.data?.message || 'Não foi possível atualizar o item.')
    return
  }

  try {
    const osMudou = form.estado !== ordem.value.estado
    if (osMudou) {
      await mudarEstado(ordem.value.id, form.estado)
      ordem.value.estado = form.estado
    }

    const pronto = item.estado === 'CONCLUIDO'
    toast.sucesso(
      osMudou && form.estado === 'CONCLUIDO'
        ? 'Todos os itens prontos. O.S. concluída.'
        : `${item.servico_nome || 'Item'} marcado como ${pronto ? 'pronto' : 'pendente'}.`
    )
  } catch (err) {
    form.estado = ordem.value.estado
    toast.erro(err?.response?.data?.message || 'O item foi salvo, mas não foi possível atualizar a situação da O.S.')
  } finally {
    item.salvando = false
  }
}

// A O.S. só é "Concluído" quando todos os itens (não cancelados) estão prontos
function sincronizarEstadoOs() {
  if (!ativos.value || form.estado === 'CANCELADO') return

  if (prontos.value === ativos.value) {
    form.estado = 'CONCLUIDO'
  } else if (form.estado === 'CONCLUIDO') {
    form.estado = ordem.value.estado !== 'CONCLUIDO' ? ordem.value.estado : 'ENTRADA'
  }
}

function escolherEstado(estado) {
  form.estado = estado
  if (estado === 'CONCLUIDO') {
    itens.value.forEach((item) => {
      if (item.estado !== 'CANCELADO') item.estado = 'CONCLUIDO'
    })
  }
}

// ── fotos ────────────────────────────────────────────────────────────────
const viewer = reactive({ aberto: false, indice: 0, escopo: 'geral' })
const fotoParaRemover = ref(null)
const removendoFoto = ref(false)
const erroRemoverFoto = ref('')

const fotosViewer = computed(() =>
  viewer.escopo === 'geral'
    ? fotosGerais.value
    : grupos.value.find((g) => g.key === viewer.escopo)?.fotos ?? []
)

const tituloViewer = computed(() =>
  viewer.escopo === 'geral'
    ? 'Fotos gerais'
    : grupos.value.find((g) => g.key === viewer.escopo)?.nome ?? 'Fotos'
)

function abrirFotos(escopo, indice = 0) {
  viewer.escopo = escopo
  viewer.indice = indice
  viewer.aberto = true
}

async function enviarNovasFotos(event, itemId = null) {
  const originais = Array.from(event.target.files ?? []).filter((f) => f.type.startsWith('image/'))
  event.target.value = ''
  if (!originais.length) return

  enviandoFotos.value = true
  erro.value = ''
  try {
    const arquivos = await Promise.all(originais.map((f) => comprimirImagem(f)))
    const novas = await enviarFotos(ordem.value.id, arquivos, itemId)
    fotos.value.push(...novas)
    toast.sucesso(novas.length > 1 ? `${novas.length} fotos adicionadas.` : 'Foto adicionada.')
  } catch (err) {
    toast.erro(err?.response?.data?.message || 'Não foi possível enviar a foto.')
  } finally {
    enviandoFotos.value = false
  }
}

async function removerFotoSelecionada() {
  removendoFoto.value = true
  erroRemoverFoto.value = ''
  try {
    const foto = fotoParaRemover.value
    await removerFotoOrdem(ordem.value.id, foto.id)
    fotos.value = fotos.value.filter((f) => f.id !== foto.id)
    fotoParaRemover.value = null
    toast.sucesso('Foto excluída.')
  } catch (err) {
    erroRemoverFoto.value = err?.response?.data?.message || 'Não foi possível excluir a foto.'
  } finally {
    removendoFoto.value = false
  }
}

function iniciais(nome = '') {
  return nome.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || '?'
}

function formatarCpf(valor) {
  const d = String(valor ?? '').replace(/\D/g, '')
  return d.length === 11 ? d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : valor
}

function aoDigitarValor(item, e) {
  const mascara = mascaraMonetaria(e.target.value)
  item.valorStr = mascara === '0,00' ? '' : mascara
  e.target.value = item.valorStr
}

function preencher(os) {
  ordem.value = os
  form.estado = os.estado
  form.dataEntrega = dataISO(os.data_entrega)
  form.horaEntrega = horaCurta(os.hora_entrega)
  form.observacoes = os.observacoes ?? ''
  fotos.value = [...(os.fotos ?? [])]
  itens.value = (os.itens ?? []).map((item) => ({
    ...item,
    salvando: false,
    valorStr: numeroParaMascara(item.valor_unitario),
    original: {
      quantidade: item.quantidade,
      valor: Number(item.valor_unitario) || 0,
      eh_orcamento: item.eh_orcamento,
      estado: item.estado,
    },
  }))
}

async function carregar() {
  try {
    preencher(await buscarOrdem(route.params.id))
  } catch (err) {
    erro.value = err?.response?.data?.message || 'Não foi possível carregar a ordem de serviço.'
  } finally {
    carregando.value = false
  }
}

onMounted(carregar)

function itemAlterado(item) {
  return (
    item.quantidade !== item.original.quantidade ||
    item.eh_orcamento !== item.original.eh_orcamento ||
    item.estado !== item.original.estado ||
    parseMoeda(item.valorStr) !== item.original.valor
  )
}

async function salvarItem(item) {
  // O endpoint de item sobrescreve os campos opcionais, por isso todos são reenviados
  await atualizarItemOrdem(ordem.value.id, item.id, {
    quantidade: item.quantidade,
    valor_unitario: parseMoeda(item.valorStr),
    eh_orcamento: item.eh_orcamento,
    estado: item.estado,
    observacoes: item.observacoes,
    foto_url: item.foto_url,
    data_entrega: dataISO(item.data_entrega) || null,
    hora_entrega: item.hora_entrega,
  })

  item.original = {
    quantidade: item.quantidade,
    valor: parseMoeda(item.valorStr),
    eh_orcamento: item.eh_orcamento,
    estado: item.estado,
  }
}

async function salvar() {
  erro.value = ''

  if (!form.dataEntrega) {
    erro.value = 'Informe a data de entrega.'
    return
  }

  salvando.value = true
  try {
    const id = ordem.value.id

    await atualizarOrdem(id, {
      data_entrega: form.dataEntrega,
      hora_entrega: form.horaEntrega || null,
      observacoes: form.observacoes.trim() || null,
    })

    for (const item of itens.value.filter(itemAlterado)) {
      await salvarItem(item)
    }

    if (form.estado !== ordem.value.estado) await mudarEstado(id, form.estado)

    toast.sucesso(`O.S. #${ordem.value.numero} salva com sucesso.`)
    voltar()
  } catch (err) {
    erro.value = err?.response?.data?.message ?? err?.response?.data?.erro ?? 'Não foi possível salvar as alterações.'
    toast.erro(erro.value)
  } finally {
    salvando.value = false
  }
}

function descartar() {
  erro.value = ''
  form.estado = ordem.value.estado
  form.dataEntrega = dataISO(ordem.value.data_entrega)
  form.horaEntrega = horaCurta(ordem.value.hora_entrega)
  form.observacoes = ordem.value.observacoes ?? ''
  itens.value.forEach((item) => {
    item.quantidade = item.original.quantidade
    item.valorStr = numeroParaMascara(item.original.valor)
    item.eh_orcamento = item.original.eh_orcamento
    item.estado = item.original.estado
  })
  toast.info('Alterações descartadas.')
}

function imprimirAtual() {
  imprimirOrdem({
    ...ordem.value,
    estado: form.estado,
    data_entrega: form.dataEntrega,
    hora_entrega: form.horaEntrega,
    observacoes: form.observacoes,
    fotos: fotos.value,
    itens: itens.value.map((item) => ({ ...item, valor_unitario: parseMoeda(item.valorStr) })),
  })
}

function voltar() {
  router.push('/listar-os')
}
</script>
