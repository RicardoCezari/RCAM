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
      <!-- Barra de ações e situação (fixa no topo) -->
      <div
        class="sticky top-12 z-30 -mx-4 mb-3 space-y-2 border-b border-black/10 bg-white/95 px-4 py-2 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:shadow-sm"
      >
        <div class="flex items-center gap-2">
          <BaseIconButton icon="mdi-arrow-left" title="Voltar para a lista" @click="voltar" />

          <div class="min-w-0 flex-1 leading-tight">
            <p class="truncate text-sm font-semibold text-black">
              O.S. {{ ordem.numero }}
              <span class="font-normal text-black/50">· {{ ordem.cliente_nome }}</span>
            </p>
            <p class="truncate text-[11px] text-black/45">{{ descricao }}</p>
          </div>

          <span
            v-if="statusAuto"
            :class="['flex shrink-0 items-center gap-1 text-[11px]', statusAuto === 'erro' ? 'text-red-600' : 'text-black/45']"
          >
            <span
              :class="[
                'mdi text-[14px]',
                statusAuto === 'salvando' ? 'mdi-loading animate-spin' : statusAuto === 'erro' ? 'mdi-alert-circle-outline' : 'mdi-check',
              ]"
            ></span>
            <span class="hidden sm:inline">
              {{ statusAuto === 'salvando' ? 'Salvando...' : statusAuto === 'erro' ? 'Não salvo' : 'Salvo' }}
            </span>
          </span>
          <BaseIconButton icon="mdi-history" title="Histórico do cliente (peças e fotos)" @click="historicoClienteAberto = true" />
          <BaseImprimirMenu @imprimir="imprimirAtual" />
          <button
            v-if="!somenteLeitura"
            type="button"
            :disabled="salvando"
            class="flex h-9 items-center gap-1.5 rounded-xl bg-black px-3 text-sm font-semibold text-white transition hover:bg-black/80 disabled:opacity-50"
            @click="salvar"
          >
            <span :class="['mdi text-[16px]', salvando ? 'mdi-loading animate-spin' : 'mdi-content-save-outline']"></span>
            <span class="hidden sm:inline">Salvar</span>
          </button>
        </div>

        <div v-if="!somenteLeitura" class="flex items-center gap-2">
          <BaseSegmentedIcons
            class="min-w-0"
            :model-value="estadoOsComoItem"
            :options="opcoesOs"
            @update:model-value="pedirAplicar"
          />
          <span v-if="ativos" class="shrink-0 text-[11px] text-black/50">{{ prontos }}/{{ ativos }} prontos</span>
        </div>

        <!-- O.S. entregue ou cancelada: somente histórico, sem ações -->
        <div v-else class="flex items-center gap-2 text-xs text-black/60">
          <span
            :class="[
              'inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 font-semibold ring-1 ring-inset',
              ordem.estado === 'CANCELADO'
                ? 'bg-red-50 text-red-700 ring-red-200'
                : 'bg-slate-100 text-slate-700 ring-slate-300',
            ]"
          >
            <span :class="['mdi text-[15px]', ordem.estado === 'CANCELADO' ? 'mdi-close' : 'mdi-package-variant-closed-check']"></span>
            {{ ordem.estado === 'CANCELADO' ? 'Cancelada' : 'Entregue' }}
          </span>
          <button
            v-if="ordem.estado === 'CANCELADO' && !ordem.data_entregue"
            type="button"
            class="flex h-8 items-center gap-1.5 rounded-lg bg-black px-2.5 font-semibold text-white transition hover:bg-black/80"
            title="Registrar a devolução do objeto ao cliente"
            @click="pedirEntrega(null)"
          >
            <span class="mdi mdi-package-variant-closed-check text-[15px]"></span>
            <span>Devolver ao cliente</span>
          </button>
          <button
            v-if="ordem.estado === 'CANCELADO'"
            type="button"
            class="flex h-8 items-center gap-1.5 rounded-lg border border-black/15 px-2.5 font-semibold text-black transition hover:bg-black/5"
            title="Voltar esta O.S. para a entrada (o cliente quer fazer o serviço)"
            @click="reabrir.aberto = true; reabrir.erro = ''"
          >
            <span class="mdi mdi-restore text-[15px]"></span>
            <span>Reabrir</span>
          </button>
          <span v-if="ordem.data_entregue" class="min-w-0 truncate">
            <template v-if="ordem.estado === 'CANCELADO'">Devolvida </template>
            {{ formatarDataHora(ordem.data_entregue) }}
            <template v-if="ordem.entregue_por_nome"> · {{ ordem.entregue_por_nome }}</template>
          </span>
          <span class="ml-auto flex shrink-0 items-center gap-1 text-black/45" title="Somente consulta">
            <span class="mdi mdi-lock-outline text-[14px]"></span>
            <span class="hidden sm:inline">Somente consulta</span>
          </span>
        </div>
      </div>

      <BaseAlert :message="erro" class="mb-3" />

      <div class="space-y-3">
        <!-- Cliente e entrega -->
        <section :class="[cardClass, 'p-3']">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div class="flex min-w-0 items-center gap-3">
              <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black text-xs font-semibold text-white">
                {{ iniciais(ordem.cliente_nome) }}
              </div>
              <div class="min-w-0 text-xs leading-snug text-black/60">
                <p class="truncate text-sm font-semibold text-black">{{ ordem.cliente_nome }}</p>
                <p class="truncate">
                  {{ formatarTelefone(ordem.cliente_telefone) || '—' }}
                  <template v-if="ordem.cliente_cpf"> · {{ formatarCpf(ordem.cliente_cpf) }}</template>
                </p>
              </div>
            </div>

            <div v-if="!somenteLeitura" class="flex items-center gap-2 border-t border-black/5 pt-2 sm:border-0 sm:pt-0">
              <label
                class="flex shrink-0 items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-black/50"
                for="os-data"
                title="Entrega prevista"
              >
                <span class="mdi mdi-calendar-clock-outline text-[18px]"></span>
                <span class="hidden sm:inline">Entrega</span>
              </label>
              <BaseDatePicker id="os-data" v-model="form.dataEntrega" compact class="min-w-0 flex-1 sm:w-40 sm:flex-none" />
              <BaseTimePicker id="os-hora" v-model="form.horaEntrega" compact class="w-[6.5rem] shrink-0" />
            </div>
            <p v-else class="flex items-center gap-1.5 border-t border-black/5 pt-2 text-xs text-black/60 sm:border-0 sm:pt-0">
              <span class="mdi mdi-calendar-clock-outline text-[18px]"></span>
              Entrega prevista {{ formatarDataBR(form.dataEntrega) }}<template v-if="form.horaEntrega"> {{ form.horaEntrega }}</template>
            </p>
          </div>
        </section>

        <!-- Itens agrupados por objeto -->
        <section :class="cardClass">
          <header class="flex items-center justify-between border-b border-black/5 px-3 py-2">
            <h2 class="text-sm font-semibold text-black">Itens</h2>
            <span class="text-xs text-black/50">{{ itens.length }} {{ itens.length === 1 ? 'item' : 'itens' }}</span>
          </header>

          <p v-if="!itens.length" class="px-4 py-8 text-center text-sm text-black/50">Esta O.S. não possui itens.</p>

          <div v-for="(grupo, gIdx) in grupos" :key="grupo.key" class="border-b border-black/5 last:border-b-0">
            <div class="flex items-center gap-2 bg-black/[0.03] px-3 py-1.5">
              <span class="truncate text-sm font-semibold text-black">{{ grupo.nome }}</span>
              <span v-if="grupos.length > 1" class="text-xs font-medium text-black/40">#{{ gIdx + 1 }}</span>
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
            </div>

            <!-- A situação vale para o objeto inteiro (todos os serviços dele) -->
            <BaseSegmentedIcons
              v-if="!somenteLeitura || grupo.itens.some((i) => i.estado === 'ENTREGUE')"
              class="px-3 pb-1 pt-2"
              small
              :model-value="estadoGrupo(grupo)"
              :options="opcoesDoGrupo(grupo)"
              :loading="grupo.itens.some((i) => i.salvando)"
              :disabled="somenteLeitura || grupo.itens.some((i) => i.salvando || i.estado === 'ENTREGUE')"
              :class="grupo.itens.every((i) => i.estado === 'ENTREGUE') ? 'opacity-70' : ''"
              @update:model-value="(estado) => definirEstadoGrupo(grupo, estado)"
            />

            <div class="divide-y divide-black/5">
              <div v-for="item in grupo.itens" :key="item.id" class="px-3 py-2">
                <div class="flex items-center justify-between gap-2">
                  <div class="min-w-0">
                    <p class="truncate text-sm font-medium leading-tight text-black">{{ item.servico_nome }}</p>
                    <p v-if="subtotal(item) > 0 || item.data_entregue" class="text-[11px] text-black/50">
                      <template v-if="subtotal(item) > 0">
                        {{ item.quantidade > 1 ? `${item.quantidade} × ` : '' }}{{ formatarMoeda(subtotal(item)) }}
                      </template>
                      <template v-if="item.data_entregue"> · Entregue {{ formatarDataHora(item.data_entregue) }}</template>
                    </p>
                  </div>
                  <span
                    v-if="somenteLeitura || !estadoGrupo(grupo)"
                    class="flex shrink-0 items-center gap-1 text-[11px] font-medium text-black/60"
                  >
                    <span :class="['mdi text-[14px]', estadoItemInfo(item.estado).icon, estadoItemInfo(item.estado).iconClass]"></span>
                    {{ estadoItemInfo(item.estado).label }}
                  </span>
                </div>

                <div v-if="!somenteLeitura" class="mt-1.5 flex items-center gap-2">
                  <div :class="['flex h-8 shrink-0 items-center rounded-lg border border-black/10 bg-white', item.estado === 'ENTREGUE' ? 'opacity-40' : '']">
                    <button
                      type="button"
                      class="flex h-8 w-7 items-center justify-center text-black/60 transition hover:text-black disabled:opacity-30"
                      :disabled="item.quantidade <= 1 || item.estado === 'ENTREGUE'"
                      aria-label="Diminuir quantidade"
                      @click="item.quantidade--"
                    >
                      <span class="mdi mdi-minus text-[13px]"></span>
                    </button>
                    <span class="w-5 text-center text-sm font-medium text-black">{{ item.quantidade }}</span>
                    <button
                      type="button"
                      class="flex h-8 w-7 items-center justify-center text-black/60 transition hover:text-black disabled:opacity-30"
                      :disabled="item.quantidade >= 99 || item.estado === 'ENTREGUE'"
                      aria-label="Aumentar quantidade"
                      @click="item.quantidade++"
                    >
                      <span class="mdi mdi-plus text-[13px]"></span>
                    </button>
                  </div>

                  <div class="relative min-w-0 flex-1 sm:max-w-[9rem]">
                    <span class="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-xs text-black/40">R$</span>
                    <input
                      :value="item.valorStr"
                      type="text"
                      inputmode="numeric"
                      placeholder="0,00"
                      aria-label="Valor unitário"
                      class="h-8 w-full rounded-lg border border-black/10 bg-white pl-7 pr-2.5 text-right text-sm outline-none transition focus:border-black/30 focus:ring-2 focus:ring-black/10"
                      :readonly="item.estado === 'ENTREGUE'"
                      :class="item.estado === 'ENTREGUE' ? 'cursor-not-allowed opacity-40' : ''"
                      @input="aoDigitarValor(item, $event)"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- Observação do objeto e, ao lado, as fotos: uma foto ocupa o espaço todo; várias viram miniaturas roláveis -->
            <div
              v-if="!somenteLeitura || grupo.itens[0].observacoes || grupo.fotos.length || podeFotografar"
              class="flex items-stretch gap-2 border-t border-black/5 p-3"
            >
              <div v-if="!somenteLeitura || grupo.itens[0].observacoes" class="min-w-0 flex-1">
                <label
                  :for="`obs-obj-${grupo.key}`"
                  class="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-black/50"
                >
                  Observação do objeto
                </label>
                <textarea
                  :id="`obs-obj-${grupo.key}`"
                  v-model="grupo.itens[0].observacoes"
                  rows="3"
                  maxlength="500"
                  placeholder="Defeito, riscos, instrução ao técnico..."
                  :readonly="somenteLeitura"
                  :class="[inputClass, 'resize-none']"
                ></textarea>
              </div>

              <div
                v-if="grupo.fotos.length || podeFotografar"
                :class="[
                  'relative flex min-h-[6.5rem] shrink-0 overflow-hidden rounded-xl border border-black/10 bg-black/[0.02]',
                  !somenteLeitura || grupo.itens[0].observacoes ? 'w-24 sm:w-36' : 'w-full sm:w-36',
                ]"
              >
                <button
                  v-if="grupo.fotos.length === 1"
                  type="button"
                  :class="['absolute inset-0 overflow-hidden', grupo.fotos[0].etapa === 'ENTREGA' ? 'ring-2 ring-inset ring-emerald-500' : '']"
                  :title="grupo.fotos[0].etapa === 'ENTREGA' ? 'Foto da entrega' : 'Foto da entrada'"
                  @click="abrirFotos(grupo.key, 0)"
                >
                  <img :src="fileUrl(grupo.fotos[0].url)" alt="Foto do objeto" loading="lazy" class="h-full w-full object-cover" />
                </button>

                <div v-else class="flex w-full snap-x items-center gap-1.5 overflow-x-auto p-2">
                  <label
                    v-if="podeFotografar"
                    class="relative flex h-12 w-12 shrink-0 cursor-pointer snap-start items-center justify-center rounded-lg border border-black/10 bg-white text-black transition hover:bg-black hover:text-white"
                    title="Tirar foto do objeto"
                  >
                    <span :class="['mdi text-[20px]', enviandoFotos ? 'mdi-loading animate-spin' : 'mdi-camera-outline']"></span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      class="sr-only"
                      :disabled="enviandoFotos"
                      @change="enviarNovasFotos($event, grupo.itens[0].id)"
                    />
                  </label>
                  <button
                    v-for="(f, i) in grupo.fotos"
                    :key="f.id"
                    type="button"
                    :class="[
                      'h-12 w-12 shrink-0 snap-start overflow-hidden rounded-lg border bg-black/5',
                      f.etapa === 'ENTREGA' ? 'border-emerald-500' : 'border-black/10',
                    ]"
                    :title="f.etapa === 'ENTREGA' ? 'Foto da entrega' : 'Foto da entrada'"
                    @click="abrirFotos(grupo.key, i)"
                  >
                    <img :src="fileUrl(f.url)" alt="Foto do objeto" loading="lazy" class="h-full w-full object-cover" />
                  </button>
                </div>

                <label
                  v-if="podeFotografar && grupo.fotos.length === 1"
                  class="absolute bottom-1.5 right-1.5 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/90 text-black shadow transition hover:bg-black hover:text-white"
                  title="Tirar foto do objeto"
                >
                  <span :class="['mdi text-[16px]', enviandoFotos ? 'mdi-loading animate-spin' : 'mdi-camera-outline']"></span>
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
            </div>
          </div>

          <footer class="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 border-t border-black/5 px-3 py-2">
            <p class="text-sm text-black/60">
              Total <span class="text-lg font-semibold text-black">{{ formatarMoeda(total) }}</span>
            </p>
            <span v-if="pendentesOrcamento" class="mr-auto flex items-center gap-1.5 text-xs text-orange-600">
              <span class="mdi mdi-phone text-[14px]"></span>
              {{ pendentesOrcamento }} {{ pendentesOrcamento === 1 ? 'item precisa' : 'itens precisam' }} de orçamento (ligar para o cliente)
            </span>
          </footer>
        </section>

        <!-- Observações -->
        <section :class="[cardClass, 'p-3']">
          <label for="os-obs" class="mb-1 block text-xs font-semibold uppercase tracking-wide text-black/50">Observações</label>
          <textarea
            id="os-obs"
            v-model="form.observacoes"
            rows="2"
            placeholder="Prazo especial, instrução ao técnico..."
            :class="[inputClass, 'resize-none']"
            :readonly="somenteLeitura"
          ></textarea>
        </section>

        <!-- Fotos gerais -->
        <details :class="[cardClass, 'group']">
          <summary class="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5">
            <span class="text-sm font-semibold text-black">
              Fotos gerais <span class="font-normal text-black/45">({{ fotosGerais.length }})</span>
            </span>
            <span class="mdi mdi-chevron-down text-[18px] text-black/50 transition group-open:rotate-180"></span>
          </summary>
          <div class="border-t border-black/5 p-3">
            <div class="flex items-center gap-2">
              <label
                v-if="podeFotografar"
                class="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-black/10 bg-white text-black transition hover:bg-black hover:text-white"
                title="Tirar foto"
              >
                <span :class="['mdi text-[18px]', enviandoFotos ? 'mdi-loading animate-spin' : 'mdi-camera-outline']"></span>
                <input type="file" accept="image/*" capture="environment" class="sr-only" :disabled="enviandoFotos" @change="enviarNovasFotos($event)" />
              </label>
              <label
                v-if="podeFotografar"
                class="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-black/10 bg-white text-black transition hover:bg-black hover:text-white"
                title="Escolher da galeria"
              >
                <span class="mdi mdi-image-plus-outline text-[18px]"></span>
                <input type="file" accept="image/*" multiple class="sr-only" :disabled="enviandoFotos" @change="enviarNovasFotos($event)" />
              </label>
              <button
                v-for="(f, i) in fotosGerais"
                :key="f.id"
                type="button"
                :class="[
                  'h-9 w-9 shrink-0 overflow-hidden rounded-lg border bg-black/5',
                  f.etapa === 'ENTREGA' ? 'border-emerald-500' : 'border-black/10',
                ]"
                @click="abrirFotos('geral', i)"
              >
                <img :src="fileUrl(f.url)" alt="Foto geral" loading="lazy" class="h-full w-full object-cover" />
              </button>
            </div>
          </div>
        </details>

        <!-- Histórico da O.S. -->
        <details :class="[cardClass, 'group']" @toggle="aoAbrirHistorico">
          <summary class="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5">
            <span class="text-sm font-semibold text-black">Histórico de situação</span>
            <span class="mdi mdi-chevron-down text-[18px] text-black/50 transition group-open:rotate-180"></span>
          </summary>
          <div class="border-t border-black/5 px-3 py-2">
            <p v-if="carregandoHistorico" class="py-2 text-xs text-black/50">Carregando...</p>
            <p v-else-if="!historico.length" class="py-2 text-xs text-black/50">Sem movimentações registradas.</p>
            <ul v-else class="divide-y divide-black/5 text-xs">
              <li v-for="h in historico" :key="h.id" class="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 py-1.5">
                <span class="text-black/80">
                  <template v-if="h.item_id"><b>{{ h.tipo_objeto_nome }}</b> — {{ h.servico_nome }}: </template>
                  <template v-else><b>O.S.:</b> </template>
                  <template v-if="h.estado_anterior">{{ rotuloEstado(h.estado_anterior) }} → </template>{{ rotuloEstado(h.estado_novo) }}
                </span>
                <span class="text-black/45">
                  {{ formatarDataHora(h.data_mudanca) }}<template v-if="h.usuario_nome"> · {{ h.usuario_nome }}</template>
                </span>
              </li>
            </ul>
          </div>
        </details>
      </div>

      <FotoViewer
        v-model="viewer.aberto"
        v-model:indice="viewer.indice"
        :fotos="fotosViewer"
        :titulo="tituloViewer"
        :pode-remover="!somenteLeitura"
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

      <!-- Reabrir O.S. cancelada -->
      <BaseModal
        v-model="reabrir.aberto"
        title="Reabrir O.S."
        :subtitle="`O.S. ${ordem.numero}`"
        icon="mdi-restore"
      >
        <div class="space-y-3 px-4 py-4 sm:px-6">
          <p class="text-sm text-black/70">
            Voltar esta O.S. para a entrada? Os itens cancelados voltam como cadastrados e a O.S. fica editável de novo.
            Clique OK para confirmar.
          </p>
          <BaseAlert :message="reabrir.erro" />
        </div>

        <template #footer>
          <button
            type="button"
            class="rounded-xl border border-black/10 px-5 py-2 text-sm font-medium text-black hover:bg-black/5"
            @click="reabrir.aberto = false"
          >
            Cancelar
          </button>
          <button
            type="button"
            :disabled="reabrir.salvando"
            class="flex items-center gap-2 rounded-xl bg-black px-6 py-2 text-sm font-semibold text-white transition hover:bg-black/80 disabled:opacity-60"
            @click="confirmarReabrir"
          >
            <span v-if="reabrir.salvando" class="mdi mdi-loading animate-spin text-[16px]"></span>
            <span>OK</span>
          </button>
        </template>
      </BaseModal>

      <!-- Confirmação de entrega -->
      <BaseModal
        v-model="entrega.aberto"
        :title="ehDevolucao ? 'Devolver ao cliente' : 'Entregar ao cliente'"
        :subtitle="entrega.grupo ? `${entrega.grupo.nome} — ${entrega.grupo.itens.map((i) => i.servico_nome).join(', ')}` : `O.S. ${ordem.numero} (todos os itens)`"
        icon="mdi-package-variant-closed-check"
      >
        <div class="space-y-3 px-4 py-4 sm:px-6">
          <p class="text-sm text-black/70">
            {{ ehDevolucao ? 'Registrar a devolução do objeto ao cliente (O.S. cancelada). Clique OK para confirmar.' : 'Concluir e entregar para o cliente. Clique OK para confirmar.' }}
          </p>

          <div>
            <p class="mb-1.5 text-xs font-semibold uppercase tracking-wide text-black/50">Fotos da entrega (opcional)</p>
            <div class="flex flex-wrap items-center gap-2">
              <label
                class="flex h-14 w-14 cursor-pointer items-center justify-center rounded-xl border border-dashed border-black/25 text-black/50 transition hover:bg-black/5"
                title="Tirar foto"
              >
                <span class="mdi mdi-camera-outline text-[22px]"></span>
                <input type="file" accept="image/*" capture="environment" class="sr-only" @change="adicionarFotosEntrega" />
              </label>
              <label
                class="flex h-14 w-14 cursor-pointer items-center justify-center rounded-xl border border-dashed border-black/25 text-black/50 transition hover:bg-black/5"
                title="Escolher da galeria"
              >
                <span class="mdi mdi-image-multiple-outline text-[22px]"></span>
                <input type="file" accept="image/*" multiple class="sr-only" @change="adicionarFotosEntrega" />
              </label>
              <div v-for="(f, i) in entrega.fotos" :key="f.previa" class="relative h-14 w-14">
                <img :src="f.previa" alt="Prévia" class="h-full w-full rounded-xl border border-black/10 object-cover" />
                <button
                  type="button"
                  class="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black text-white"
                  aria-label="Remover foto"
                  @click="removerFotoEntrega(i)"
                >
                  <span class="mdi mdi-close text-[12px]"></span>
                </button>
              </div>
            </div>
          </div>

          <BaseAlert :message="entrega.erro" />
        </div>

        <template #footer>
          <button
            type="button"
            class="rounded-xl border border-black/10 px-5 py-2 text-sm font-medium text-black hover:bg-black/5"
            @click="entrega.aberto = false"
          >
            Cancelar
          </button>
          <button
            type="button"
            :disabled="entrega.salvando"
            class="flex items-center gap-2 rounded-xl bg-black px-6 py-2 text-sm font-semibold text-white transition hover:bg-black/80 disabled:opacity-60"
            @click="confirmarEntrega"
          >
            <span v-if="entrega.salvando" class="mdi mdi-loading animate-spin text-[16px]"></span>
            <span>OK</span>
          </button>
        </template>
      </BaseModal>

      <!-- Aplicar uma situação a todos os itens -->
      <BaseModal
        v-model="aplicar.aberto"
        title="Aplicar a todos os itens"
        :subtitle="`O.S. ${ordem.numero}`"
        icon="mdi-checkbox-multiple-marked-outline"
      >
        <div class="space-y-3 px-4 py-4 sm:px-6">
          <p class="text-sm text-black/70">
            Marcar todos os itens como <b>{{ estadoItemInfo(aplicar.estado).label }}</b>?
            Itens já entregues ou cancelados não serão alterados.
          </p>
          <BaseAlert :message="aplicar.erro" />
        </div>

        <template #footer>
          <button
            type="button"
            class="rounded-xl border border-black/10 px-5 py-2 text-sm font-medium text-black hover:bg-black/5"
            @click="aplicar.aberto = false"
          >
            Cancelar
          </button>
          <button
            type="button"
            :disabled="aplicar.salvando"
            class="flex items-center gap-2 rounded-xl bg-black px-6 py-2 text-sm font-semibold text-white transition hover:bg-black/80 disabled:opacity-60"
            @click="confirmarAplicar"
          >
            <span v-if="aplicar.salvando" class="mdi mdi-loading animate-spin text-[16px]"></span>
            <span>OK</span>
          </button>
        </template>
      </BaseModal>

      <ClienteHistoricoModal
        v-model="historicoClienteAberto"
        :cliente="{ id: ordem.cliente_id, nome: ordem.cliente_nome }"
      />
    </template>
  </AppLayout>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'
import BaseAlert from '@/components/base/BaseAlert.vue'
import BaseIconButton from '@/components/base/BaseIconButton.vue'
import BaseImprimirMenu from '@/components/base/BaseImprimirMenu.vue'
import BaseSegmentedIcons from '@/components/base/BaseSegmentedIcons.vue'
import BaseModal from '@/components/base/BaseModal.vue'
import BaseTimePicker from '@/components/base/BaseTimePicker.vue'
import BaseDatePicker from '@/components/base/BaseDatePicker.vue'
import BaseConfirmModal from '@/components/base/BaseConfirmModal.vue'
import FotoViewer from '@/components/os/FotoViewer.vue'
import ClienteHistoricoModal from '@/components/cliente/ClienteHistoricoModal.vue'
import { useImpressao } from '@/composables/useImpressao'
import { useToastStore } from '@/stores/toast'
import { formatarTelefone } from '@/composables/useClienteForm'
import { formatarMoeda, mascaraMonetaria, numeroParaMascara, parseMoeda } from '@/composables/useItens'
import { ESTADOS_ITEM, ESTADOS_OS, OPCOES_ESTADO_ITEM, estadoItemInfo, dataISO, formatarDataBR, horaCurta } from '@/utils/ordem'
import { fileUrl } from '@/utils/arquivos'
import { prepararFoto, ErroImagem } from '@/utils/imagem'
import {
  buscarOrdem, atualizarOrdem, atualizarItemOrdem, mudarEstado, enviarFotos, removerFotoOrdem, historicoOrdem,
} from '@/services/ordensServico'

const route = useRoute()
const router = useRouter()
const { imprimirOrdem } = useImpressao()
const toast = useToastStore()

const cardClass = 'rounded-2xl border border-black/10 bg-white shadow-[0_4px_16px_rgba(0,0,0,0.03)]'
const inputClass =
  'w-full rounded-lg border border-black/10 bg-white px-3 py-1.5 text-sm outline-none transition focus:border-black/30 focus:ring-2 focus:ring-black/10'

const ordem = ref(null)
const itens = ref([])
const fotos = ref([])
const form = reactive({ dataEntrega: '', horaEntrega: '', observacoes: '' })

const carregando = ref(true)
const salvando = ref(false)
const enviandoFotos = ref(false)
const erro = ref('')
const historicoClienteAberto = ref(false)

function formatarDataHora(valor) {
  if (!valor) return ''
  const d = new Date(valor)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

const descricao = computed(() => {
  const data = ordem.value?.data_criacao ? new Date(ordem.value.data_criacao).toLocaleDateString('pt-BR') : ''
  return [
    data && `Aberta em ${data}`,
    ordem.value?.usuario_nome && `por ${ordem.value.usuario_nome}`,
    ordem.value?.data_entregue && `· Entregue ${formatarDataHora(ordem.value.data_entregue)}`,
  ]
    .filter(Boolean)
    .join(' ')
})

function subtotal(item) {
  return parseMoeda(item.valorStr) * item.quantidade
}

const total = computed(() => itens.value.reduce((soma, item) => soma + subtotal(item), 0))
const pendentesOrcamento = computed(() => itens.value.filter((i) => i.estado === 'ORCAMENTO').length)

// ── progresso dos itens ──────────────────────────────────────────────────
const itensAtivos = computed(() => itens.value.filter((i) => i.estado !== 'CANCELADO'))
const ativos = computed(() => itensAtivos.value.length)
const prontos = computed(() => itensAtivos.value.filter((i) => ['CONCLUIDO', 'ENTREGUE'].includes(i.estado)).length)
const entregues = computed(() => itensAtivos.value.filter((i) => i.estado === 'ENTREGUE').length)

// Entrega só do que está pronto (itens cancelados ficam de fora)
const SEM_ENTREGA = 'Ainda não concluído'

// A situação é do objeto: vale para todos os serviços dele (os já entregues não mudam).
// Sem situação em comum (serviços em etapas diferentes) nenhuma opção fica marcada.
function estadoGrupo(grupo) {
  const abertos = grupo.itens.filter((i) => i.estado !== 'ENTREGUE')
  if (!abertos.length) return 'ENTREGUE'
  const estados = new Set(abertos.map((i) => i.estado))
  return estados.size === 1 ? [...estados][0] : ''
}

function podeEntregarGrupo(grupo) {
  const abertos = grupo.itens.filter((i) => i.estado !== 'ENTREGUE')
  return abertos.some((i) => i.estado === 'CONCLUIDO') && abertos.every((i) => ['CONCLUIDO', 'CANCELADO'].includes(i.estado))
}

function opcoesDoGrupo(grupo) {
  const pode = podeEntregarGrupo(grupo)
  return OPCOES_ESTADO_ITEM.map((o) => (o.value === 'ENTREGUE' ? { ...o, disabled: !pode, dica: SEM_ENTREGA } : o))
}

const podeEntregarOs = computed(() => {
  const aEntregar = itensAtivos.value.filter((i) => i.estado !== 'ENTREGUE')
  return aEntregar.length ? aEntregar.every((i) => i.estado === 'CONCLUIDO') : ordem.value?.estado === 'CONCLUIDO'
})

const opcoesOs = computed(() =>
  OPCOES_ESTADO_ITEM.map((o) =>
    o.value === 'ENTREGUE' ? { ...o, disabled: !podeEntregarOs.value, dica: SEM_ENTREGA } : o
  )
)

// O.S. entregue ou cancelada vira apenas histórico: nenhuma ação de edição
const somenteLeitura = computed(() => ['ENTREGUE', 'CANCELADO'].includes(ordem.value?.estado))

// Foto esquecida ainda pode ser vinculada depois da entrega; O.S. cancelada só aceita foto ao ser reaberta
const podeFotografar = computed(() => ordem.value?.estado !== 'CANCELADO')

// Estado da O.S. na mesma escala dos itens (ENTRADA da O.S. = CADASTRADO do item)
const estadoOsComoItem = computed(() => (ordem.value?.estado === 'ENTRADA' ? 'CADASTRADO' : ordem.value?.estado))

// Um objeto = itens do mesmo objeto_indice (ou consecutivos do mesmo tipo em legados sem objeto_indice)
const grupos = computed(() => {
  const lista = []
  for (const item of itens.value) {
    const temFotos = fotos.value.some((f) => f.item_id === item.id)
    let grupo = lista[lista.length - 1]
    const novoGrupo = !grupo
      ? true
      : item.objeto_indice != null
        ? grupo.objetoIndice !== item.objeto_indice
        : (grupo.tipoId !== item.tipo_objeto_id || temFotos)

    if (novoGrupo) {
      grupo = {
        key: item.id,
        objetoIndice: item.objeto_indice,
        tipoId: item.tipo_objeto_id,
        nome: item.tipo_objeto_nome || 'Objeto',
        itens: [],
      }
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
  return grupo.itens.filter((i) => ['CONCLUIDO', 'ENTREGUE'].includes(i.estado)).length
}
const grupoPronto = (grupo) => prontosDoGrupo(grupo) === grupo.itens.length
const grupoParcial = (grupo) => prontosDoGrupo(grupo) > 0 && !grupoPronto(grupo)

// A situação da O.S. é calculada no servidor; depois de salvar um item só relemos o que mudou na O.S.
async function atualizarSituacaoOs() {
  const os = await buscarOrdem(ordem.value.id)
  ordem.value = { ...ordem.value, estado: os.estado, data_entregue: os.data_entregue }
  historicoCarregado = false
}

// Muda a situação do objeto (todos os serviços dele) e salva na hora (ENTREGUE abre a confirmação com fotos)
async function definirEstadoGrupo(grupo, estado) {
  if (grupo.itens.some((i) => i.salvando)) return
  if (estado === 'ENTREGUE') {
    pedirEntrega(grupo)
    return
  }

  const alvos = grupo.itens.filter((i) => i.estado !== 'ENTREGUE' && i.estado !== estado)
  if (!alvos.length) return

  const anteriores = alvos.map((item) => ({ item, estado: item.estado, eh_orcamento: item.eh_orcamento }))
  for (const item of alvos) {
    item.estado = estado
    item.eh_orcamento = estado === 'ORCAMENTO'
    item.salvando = true
  }

  try {
    for (const item of alvos) await salvarItem(item)
  } catch (err) {
    // Desfaz só o que não chegou a ser gravado
    for (const a of anteriores) {
      if (a.item.original.estado !== estado) {
        a.item.estado = a.estado
        a.item.eh_orcamento = a.eh_orcamento
      }
      a.item.salvando = false
    }
    toast.erro(err?.response?.data?.message || 'Não foi possível atualizar o objeto.')
    return
  }

  try {
    await atualizarSituacaoOs()
    toast.sucesso(`${grupo.nome}${grupos.value.length > 1 ? ` #${grupos.value.indexOf(grupo) + 1}` : ""}: ${estadoItemInfo(estado).label.toLowerCase()}.`)
  } catch {
    toast.erro('O objeto foi salvo, mas não foi possível atualizar a situação da O.S.')
  } finally {
    for (const item of alvos) item.salvando = false
  }
}

// ── aplicar uma situação a todos os itens ────────────────────────────────
const aplicar = reactive({ aberto: false, estado: '', salvando: false, erro: '' })

function pedirAplicar(estado) {
  if (estado === 'ENTREGUE') {
    pedirEntrega(null)
    return
  }
  aplicar.estado = estado
  aplicar.erro = ''
  aplicar.aberto = true
}

async function confirmarAplicar() {
  aplicar.salvando = true
  aplicar.erro = ''
  try {
    const id = ordem.value.id
    for (const item of itens.value.filter((i) => itemAlterado(i))) {
      await salvarItem(item)
    }
    // No servidor, CADASTRADO (entrada do item) corresponde à situação ENTRADA da O.S.
    await mudarEstado(id, aplicar.estado === 'CADASTRADO' ? 'ENTRADA' : aplicar.estado)
    preencher(await buscarOrdem(id))
    historicoCarregado = false
    aplicar.aberto = false
    toast.sucesso(`Itens marcados como ${estadoItemInfo(aplicar.estado).label.toLowerCase()}.`)
  } catch (err) {
    aplicar.erro = err?.response?.data?.message || 'Não foi possível aplicar a situação.'
  } finally {
    aplicar.salvando = false
  }
}

// ── entrega ──────────────────────────────────────────────────────────────
// Reabrir O.S. cancelada: volta para a entrada (o cliente decidiu fazer o servi\u00e7o)
const reabrir = reactive({ aberto: false, salvando: false, erro: '' })

async function confirmarReabrir() {
  reabrir.salvando = true
  reabrir.erro = ''
  try {
    const id = ordem.value.id
    await mudarEstado(id, 'ENTRADA')
    preencher(await buscarOrdem(id))
    historicoCarregado = false
    reabrir.aberto = false
    toast.sucesso(`O.S. ${ordem.value.numero} reaberta.`)
  } catch (err) {
    reabrir.erro = err?.response?.data?.message || 'N\u00e3o foi poss\u00edvel reabrir a O.S.'
  } finally {
    reabrir.salvando = false
  }
}

const entrega = reactive({ aberto: false, grupo: null, fotos: [], salvando: false, erro: '' })

// O.S. cancelada: "entregar" significa devolver o objeto ao cliente (dá baixa nas pendentes)
const ehDevolucao = computed(() => ordem.value?.estado === 'CANCELADO')

function limparPreviasEntrega() {
  entrega.fotos.forEach((f) => URL.revokeObjectURL(f.previa))
  entrega.fotos = []
}

function pedirEntrega(grupo) {
  limparPreviasEntrega()
  entrega.grupo = grupo
  entrega.erro = ''
  entrega.aberto = true
}

watch(
  () => entrega.aberto,
  (aberto) => {
    if (!aberto) limparPreviasEntrega()
  }
)

function adicionarFotosEntrega(event) {
  const arquivos = Array.from(event.target.files ?? []).filter((f) => f.type.startsWith('image/'))
  event.target.value = ''
  arquivos.forEach((arquivo) => entrega.fotos.push({ arquivo, previa: URL.createObjectURL(arquivo) }))
}

function removerFotoEntrega(indice) {
  const [removida] = entrega.fotos.splice(indice, 1)
  if (removida) URL.revokeObjectURL(removida.previa)
}

async function confirmarEntrega() {
  entrega.salvando = true
  entrega.erro = ''
  const devolucao = ehDevolucao.value
  try {
    const id = ordem.value.id
    const grupo = entrega.grupo
    const entregues = grupo ? grupo.itens.filter((i) => i.estado === 'CONCLUIDO') : []

    // Edições ainda não salvas nos itens são gravadas antes da entrega
    for (const item of itens.value.filter((i) => itemAlterado(i) && !entregues.includes(i))) {
      await salvarItem(item)
    }

    if (entrega.fotos.length) {
      const arquivos = await Promise.all(entrega.fotos.map((f) => prepararFoto(f.arquivo)))
      await enviarFotos(id, arquivos, grupo?.itens[0].id ?? null, 'ENTREGA')
    }

    if (grupo) {
      for (const item of entregues) {
        item.estado = 'ENTREGUE'
        await salvarItem(item)
      }
    } else {
      await mudarEstado(id, 'ENTREGUE')
    }

    entrega.aberto = false
    preencher(await buscarOrdem(id))
    historicoCarregado = false
    toast.sucesso(
      devolucao
        ? `O.S. ${ordem.value.numero} devolvida ao cliente.`
        : grupo ? `${grupo.nome}${grupos.value.length > 1 ? ` #${grupos.value.indexOf(grupo) + 1}` : ""} entregue ao cliente.` : `O.S. ${ordem.value.numero} entregue ao cliente.`
    )

    // O.S. concluída (entregue ou devolvida) sai das pendentes: volta para a lista
    if (devolucao || ordem.value.estado === 'ENTREGUE') router.push('/listar-os')
  } catch (err) {
    // Se a gravação falhou, a tela não pode continuar mostrando "Entregue" no que não foi gravado
    for (const item of entrega.grupo?.itens ?? []) {
      if (item.estado === 'ENTREGUE' && item.original.estado !== 'ENTREGUE') item.estado = item.original.estado
    }
    entrega.erro = err instanceof ErroImagem
      ? err.message
      : err?.response?.data?.message || 'Não foi possível registrar a entrega.'
  } finally {
    entrega.salvando = false
  }
}

// ── histórico da O.S. ───────────────────────────────────────────────────
const historico = ref([])
const carregandoHistorico = ref(false)
let historicoCarregado = false

function rotuloEstado(estado) {
  if (!estado) return ''
  if (estado === 'DEVOLVIDO') return 'Devolvida ao cliente'
  return ESTADOS_ITEM[estado]?.label ?? ESTADOS_OS[estado]?.label ?? estado
}

async function aoAbrirHistorico(event) {
  if (!event.target.open || historicoCarregado) return
  carregandoHistorico.value = true
  try {
    historico.value = await historicoOrdem(ordem.value.id)
    historicoCarregado = true
  } catch {
    historico.value = []
  } finally {
    carregandoHistorico.value = false
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
    const arquivos = await Promise.all(originais.map((f) => prepararFoto(f)))
    const novas = await enviarFotos(ordem.value.id, arquivos, itemId, ordem.value.estado === 'ENTREGUE' ? 'ENTREGA' : 'ENTRADA')
    fotos.value.push(...novas)
    toast.sucesso(novas.length > 1 ? `${novas.length} fotos adicionadas.` : 'Foto adicionada.')
  } catch (err) {
    toast.erro(err instanceof ErroImagem ? err.message : err?.response?.data?.message || 'Não foi possível enviar a foto.')
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
      observacoes: item.observacoes ?? '',
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

// Abrir outra O.S. a partir do histórico do cliente reaproveita esta tela
watch(
  () => route.params.id,
  async (id, anterior) => {
    if (!id || id === anterior) return
    await autoSalvar()
    carregando.value = true
    ordem.value = null
    historico.value = []
    historicoCarregado = false
    carregar()
  }
)

function itemAlterado(item) {
  return (
    item.quantidade !== item.original.quantidade ||
    item.eh_orcamento !== item.original.eh_orcamento ||
    item.estado !== item.original.estado ||
    (item.observacoes ?? '') !== item.original.observacoes ||
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
    observacoes: (item.observacoes ?? '').trim() || null,
    foto_url: item.foto_url,
    data_entrega: dataISO(item.data_entrega) || null,
    hora_entrega: item.hora_entrega,
  })

  item.original = {
    quantidade: item.quantidade,
    valor: parseMoeda(item.valorStr),
    eh_orcamento: item.eh_orcamento,
    estado: item.estado,
    observacoes: item.observacoes ?? '',
  }
}

// ── salvamento automático ──────────────────────────────────────────────────────────────────────
// Data, hora, observações, quantidade e valor são gravados sozinhos pouco depois de cada alteração
// (a situação de cada item já é salva na hora). O botão Salvar apenas confirma e volta para a lista.
const statusAuto = ref('') // '' | 'salvando' | 'salvo' | 'erro'
let timerAuto = null
let timerStatusAuto = null
let autoEmAndamento = null

function cabecalhoAlterado() {
  const os = ordem.value
  return (
    form.dataEntrega !== dataISO(os.data_entrega) ||
    form.horaEntrega !== horaCurta(os.hora_entrega) ||
    form.observacoes.trim() !== (os.observacoes ?? '').trim()
  )
}

function itemEditado(item) {
  return (
    item.quantidade !== item.original.quantidade ||
    parseMoeda(item.valorStr) !== item.original.valor ||
    (item.observacoes ?? '') !== item.original.observacoes
  )
}

function temPendencias() {
  if (!ordem.value || somenteLeitura.value) return false
  return Boolean(form.dataEntrega && cabecalhoAlterado()) || itens.value.some((i) => !i.salvando && itemEditado(i))
}

function agendarAuto() {
  clearTimeout(timerAuto)
  if (temPendencias()) timerAuto = setTimeout(autoSalvar, 900)
}

async function autoSalvar() {
  clearTimeout(timerAuto)
  if (autoEmAndamento) await autoEmAndamento
  if (salvando.value || !temPendencias()) return

  autoEmAndamento = (async () => {
    statusAuto.value = 'salvando'
    try {
      if (form.dataEntrega && cabecalhoAlterado()) {
        const dados = {
          data_entrega: form.dataEntrega,
          hora_entrega: form.horaEntrega || null,
          observacoes: form.observacoes.trim() || null,
        }
        await atualizarOrdem(ordem.value.id, dados)
        ordem.value = { ...ordem.value, ...dados }
      }
      for (const item of itens.value.filter((i) => !i.salvando && itemEditado(i))) {
        await salvarItem(item)
      }
      statusAuto.value = 'salvo'
      clearTimeout(timerStatusAuto)
      timerStatusAuto = setTimeout(() => {
        if (statusAuto.value === 'salvo') statusAuto.value = ''
      }, 2500)
    } catch {
      statusAuto.value = 'erro'
      toast.erro('Não foi possível salvar automaticamente. Use o botão Salvar.')
    }
  })()

  try {
    await autoEmAndamento
  } finally {
    autoEmAndamento = null
  }
}

watch(
  () => [form.dataEntrega, form.horaEntrega, form.observacoes, ...itens.value.map((i) => `${i.quantidade}|${i.valorStr}|${i.observacoes ?? ''}`)],
  agendarAuto
)

// Sai da tela ou esconde a aba (ex.: bloqueou o celular) sem perder o que foi digitado
function aoMudarVisibilidade() {
  if (document.visibilityState === 'hidden') autoSalvar()
}
onMounted(() => document.addEventListener('visibilitychange', aoMudarVisibilidade))
onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', aoMudarVisibilidade)
  clearTimeout(timerAuto)
  clearTimeout(timerStatusAuto)
})
onBeforeRouteLeave(async () => {
  await autoSalvar()
})

async function salvar() {
  erro.value = ''
  clearTimeout(timerAuto)
  if (autoEmAndamento) await autoEmAndamento

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

    toast.sucesso(`O.S. ${ordem.value.numero} salva com sucesso.`)
    voltar()
  } catch (err) {
    erro.value = err?.response?.data?.message ?? err?.response?.data?.erro ?? 'Não foi possível salvar as alterações.'
    toast.erro(erro.value)
  } finally {
    salvando.value = false
  }
}

function imprimirAtual(tipo = 'ambas') {
  imprimirOrdem({
    ...ordem.value,
    data_entrega: form.dataEntrega,
    hora_entrega: form.horaEntrega,
    observacoes: form.observacoes,
    fotos: fotos.value,
    itens: itens.value.map((item) => ({ ...item, valor_unitario: parseMoeda(item.valorStr) })),
  }, tipo)
}

function voltar() {
  router.push('/listar-os')
}
</script>
