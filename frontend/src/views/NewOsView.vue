<template>
  <AppLayout full-height>
    <!-- WizardSteps: sempre visível, shrink-0 -->
    <WizardSteps
      class="shrink-0 py-3 sm:py-4"
      :steps="STEPS" :current="etapaAtual" :can-navigate="podeNavegar"
      @navigate="k => etapa = k"
    />

    <!-- Área das etapas: ocupa o restante da altura disponível -->
    <transition name="slide" mode="out-in">
      <!-- ── ETAPA 1: Cliente ──────────────────────────────────── -->
      <div v-if="etapa === 'cliente'" key="cliente" class="flex flex-1 min-h-0 flex-col">
        <h1 class="mb-3 shrink-0 text-lg font-semibold text-slate-900">Dados do cliente</h1>

        <!-- Card com scroll interno, botões fixos no fundo -->
        <form
          class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-black/8 bg-white shadow-[0_4px_24px_rgba(15,23,42,0.06)]"
          novalidate @submit.prevent="irParaOs"
        >
          <!-- Campos: rolam aqui dentro -->
          <div class="flex flex-1 flex-col overflow-y-auto p-4 sm:p-5">

            <!-- Telefone + Nome: empilhados no mobile, lado a lado no lg+ -->
            <div class="mb-3 grid gap-3 lg:grid-cols-[2fr_3fr]">
            <BaseFormField id="os-telefone" label="Telefone" optional :error="errosCliente.telefone">
              <div class="relative">
                <input
                  id="os-telefone"
                  :value="cliente.telefone"
                  type="tel"
                  maxlength="15"
                  placeholder="(00) 00000-0000"
                  autocomplete="off"
                  :class="[inputClass('telefone'), clienteVinculado ? 'pr-20' : 'pr-10']"
                  @input="aoDigitarTelefone"
                  @blur="touchCliente('telefone')"
                />
                <div class="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  <span v-if="buscandoTel" class="mdi mdi-loading animate-spin text-[15px] text-slate-400"></span>
                  <button
                    v-if="clienteVinculado"
                    type="button"
                    class="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-500 transition hover:bg-slate-200"
                    @click="desvincular"
                  >
                    <span class="mdi mdi-close text-[11px]"></span>
                    limpar
                  </button>
                </div>

                <transition name="slide-down">
                  <div v-if="sugestaoTel && !clienteVinculado && !avisoSubstituirTel"
                    class="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.12)]">
                    <button type="button" class="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
                      @mousedown.prevent="vincularCliente(sugestaoTel)">
                      <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black text-[11px] font-bold text-white">{{ iniciais(sugestaoTel.nome) }}</div>
                      <div class="min-w-0">
                        <p class="truncate text-sm font-medium text-slate-900">{{ sugestaoTel.nome }}</p>
                        <p class="text-xs text-slate-400">{{ sugestaoTel.telefone }}</p>
                      </div>
                      <span class="ml-auto shrink-0 text-xs text-slate-400">selecionar</span>
                    </button>
                  </div>
                </transition>

                <transition name="slide-down">
                  <div v-if="avisoSubstituirTel && clienteVinculado"
                    class="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.12)]">
                    <div class="px-4 py-3">
                      <p class="mb-3 text-sm text-slate-700">
                        <span class="mdi mdi-information-outline mr-1 text-[14px] text-slate-400"></span>
                        <strong>{{ clienteVinculado.nome }}</strong> tem <strong>{{ telOriginal }}</strong> cadastrado. O que deseja fazer?
                      </p>
                      <div class="flex gap-2">
                        <button type="button" :disabled="loadingSubstituir"
                          class="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-black px-3 py-2 text-xs font-semibold text-white transition hover:bg-black/85 disabled:opacity-60"
                          @mousedown.prevent="substituirTelefone">
                          <span :class="loadingSubstituir ? 'mdi mdi-loading animate-spin' : 'mdi mdi-phone-sync-outline'" class="text-[13px]"></span>
                          {{ loadingSubstituir ? 'Atualizando...' : 'Substituir número' }}
                        </button>
                        <button type="button"
                          class="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                          @mousedown.prevent="reverterTelefone">
                          <span class="mdi mdi-undo text-[13px]"></span>
                          Manter original
                        </button>
                      </div>
                    </div>
                  </div>
                </transition>
              </div>
            </BaseFormField>

            <BaseFormField id="os-nome" label="Nome completo" required :error="clienteVinculado ? '' : errosCliente.nome">
              <div class="relative">
                <input
                  id="os-nome"
                  v-model="cliente.nome"
                  type="text"
                  :placeholder="clienteVinculado ? '' : 'Ex: José da Silva'"
                  autocomplete="off"
                  :disabled="!!clienteVinculado"
                  :class="clienteVinculado
                    ? 'w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none'
                    : inputClass('nome')"
                  @blur="touchCliente('nome')"
                />
                <span v-if="buscandoNome" class="mdi mdi-loading animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-[15px] text-slate-400"></span>
                <transition name="slide-down">
                  <div v-if="sugestoesNome.length && !clienteVinculado"
                    class="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.12)]">
                    <button v-for="c in sugestoesNome" :key="c.id" type="button"
                      class="flex w-full items-center gap-3 border-t border-black/5 px-4 py-3 text-left transition first:border-0 hover:bg-slate-50"
                      @mousedown.prevent="vincularCliente(c)">
                      <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black text-[11px] font-bold text-white">{{ iniciais(c.nome) }}</div>
                      <div class="min-w-0 flex-1">
                        <p class="truncate text-sm font-medium text-slate-900">{{ c.nome }}</p>
                        <p class="text-xs text-slate-400">{{ c.telefone || 'Sem telefone' }}</p>
                      </div>
                      <span class="ml-auto shrink-0 text-xs text-slate-400">selecionar</span>
                    </button>
                  </div>
                </transition>
              </div>
            </BaseFormField>
            </div><!-- /grid Telefone+Nome -->

            <!-- CPF + Email -->
            <div class="mb-3 grid gap-3 sm:grid-cols-2">
              <BaseFormField id="os-cpf" label="CPF" optional :error="errosCliente.cpf">
                <input id="os-cpf" v-model="cliente.cpf" type="text" maxlength="14" inputmode="numeric"
                  placeholder="000.000.000-00" :class="inputClass('cpf')"
                  @input="mascaraCpf" @blur="touchCliente('cpf')" />
              </BaseFormField>
              <BaseFormField id="os-email" label="E-mail" optional :error="errosCliente.email">
                <input id="os-email" v-model="cliente.email" type="email" placeholder="exemplo@email.com"
                  autocomplete="email" :class="inputClass('email')" @blur="touchCliente('email')" />
              </BaseFormField>
            </div>

            <!-- Observações -->
            <BaseFormField id="os-obs" label="Observações" optional class="flex flex-1 min-h-0 flex-col">
              <textarea id="os-obs" v-model="cliente.observacoes"
                placeholder="Endereço, referência, anotações..."
                class="flex-1 min-h-[80px] w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-black focus:bg-white focus:ring-2 focus:ring-black/10"
              ></textarea>
            </BaseFormField>

          </div><!-- /scroll area -->

          <!-- Botões: sempre visíveis, fora do scroll -->
          <div class="shrink-0 border-t border-slate-100 px-4 py-3 sm:px-5">
            <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <RouterLink to="/"
                class="flex items-center justify-center gap-2 rounded-xl border border-black/10 px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
                Cancelar
              </RouterLink>
              <button type="submit"
                class="flex items-center justify-center gap-2 rounded-xl bg-black px-7 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-px hover:bg-black/85">
                <span class="mdi mdi-wrench-outline text-[18px]"></span>
                Criar O.S.
              </button>
            </div>
          </div>
        </form>
      </div>

      <!-- ── ETAPA 2: O.S. ─────────────────────────────────────── -->
      <div v-else-if="etapa === 'os'" key="os" class="flex flex-1 min-h-0 flex-col">
        <h1 class="mb-3 shrink-0 text-lg font-semibold text-slate-900">
          {{ editandoOs ? `Editar O.S. ${osCriada?.numero ?? osCriada?.id ?? ''}` : 'Dados da ordem de serviço' }}
        </h1>

        <ClienteVinculadoBanner
          class="shrink-0" :nome="cliente.nome" :telefone="cliente.telefone" :pode-alterar="!editandoOs"
          @alterar="etapa = 'cliente'"
        />

        <form
          class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-black/8 bg-white shadow-[0_4px_24px_rgba(15,23,42,0.06)]"
          novalidate @submit.prevent="salvarOs"
        >
          <div class="flex flex-1 flex-col overflow-y-auto p-4 sm:p-5">

            <!-- Editor de objetos + serviços -->
            <OsItensEditor
              :objetos="objetos"
              :erros="errosItens"
              :tipos-objeto="tiposObjeto"
              :servicos="servicos"
              :total-objeto="totalObjeto"
              :nome-tipo-objeto="nomeTipoObjeto"
              :mudar-quantidade="mudarQuantidade"
              :carregando="carregando"
              :adicionar-fotos="adicionarFotosObjetoSeguro"
              @abrir-camera="marcarFotoPendente"
              @adicionar-objeto="adicionarObjeto"
              @remover-objeto="removerObjeto"
              @remover-foto="removerFotoObjeto"
              @adicionar-servico="adicionarServico"
              @remover-servico="removerServico"
              @selecionar-servico="aoSelecionarServico"
              @mudar-tipo="mudarTipoObjeto"
              @toggle-orcamento="toggleOrcamento"
            />

            <!-- Separador -->
            <hr class="my-3 border-slate-100" />

            <!-- Data + Hora -->
            <div class="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2 [&>*]:min-w-0">
              <BaseFormField id="os-data" label="Data de entrega" required :error="errosOs.dataEntrega">
                <BaseDatePicker
                  id="os-data"
                  :model-value="os.dataEntrega"
                  :min="minDate"
                  :has-error="!!errosOs.dataEntrega"
                  @update:model-value="(v) => { os.dataEntrega = v; touchOs('dataEntrega') }"
                />
              </BaseFormField>

              <BaseFormField id="os-hora" label="Hora de entrega" optional>
                <BaseTimePicker id="os-hora" v-model="os.horaEntrega" />
              </BaseFormField>
            </div>

            <!-- Observações gerais -->
            <BaseFormField id="os-obs2" label="Observações gerais" optional class="shrink-0">
              <textarea id="os-obs2" v-model="os.observacoes" placeholder="Observações da O.S. (prazo especial, instrução ao técnico...)"
                rows="3"
                class="min-h-[80px] w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-black focus:bg-white focus:ring-2 focus:ring-black/10"
              ></textarea>
            </BaseFormField>

            <!-- Fotos gerais (tudo o que o cliente deixou) -->
            <div class="mt-4 shrink-0">
              <p class="mb-2 text-sm font-medium text-slate-700">
                Fotos gerais
                <span class="ml-1 text-xs font-normal text-slate-400">(opcional — tudo o que o cliente deixou)</span>
              </p>

              <div class="flex flex-wrap gap-2">
                <div
                  v-for="(f, i) in fotosGerais"
                  :key="f._k"
                  :class="[
                    'relative h-20 w-20 overflow-hidden rounded-xl border',
                    f.status === 'erro' ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50',
                  ]"
                >
                  <img v-if="f.url" :src="f.url" :alt="f.name" :class="['h-full w-full object-cover', f.status === 'erro' ? 'opacity-60' : '']" />
                  <div v-if="f.status === 'carregando'" class="flex h-full w-full items-center justify-center text-slate-400">
                    <span class="mdi mdi-loading animate-spin text-[24px]"></span>
                  </div>
                  <div v-else-if="f.status === 'erro'" class="absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-red-500/20 text-red-600" :title="f.erro">
                    <span class="mdi mdi-alert-circle text-[26px]"></span>
                    <span class="text-[10px] font-semibold leading-none">Não carregou</span>
                  </div>
                  <button
                    v-if="f.status !== 'carregando'"
                    type="button"
                    class="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white transition hover:bg-black"
                    title="Remover foto"
                    @click="removerFotoGeral(i)"
                  >
                    <span class="mdi mdi-close text-[11px]"></span>
                  </button>
                </div>

                <label
                  class="relative flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl border-2 border-dashed border-slate-200 text-slate-500 transition hover:border-black hover:text-black"
                  title="Tirar foto"
                >
                  <span class="mdi mdi-camera-outline text-[22px]"></span>
                  <span class="text-[10px] font-medium">Tirar foto</span>
                  <input ref="inputCameraGeral" type="file" accept="image/*" capture="environment" class="sr-only" @click="marcarFotoPendente('geral')" @change="aoEscolherFotoGeral" />
                </label>
                <label
                  class="relative flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl border-2 border-dashed border-slate-200 text-slate-500 transition hover:border-black hover:text-black"
                  title="Escolher da galeria"
                >
                  <span class="mdi mdi-image-multiple-outline text-[22px]"></span>
                  <span class="text-[10px] font-medium">Galeria</span>
                  <input type="file" accept="image/*" multiple class="sr-only" data-testid="galeria-geral" @click="marcarFotoPendente('geral')" @change="aoEscolherFotoGeral" />
                </label>
              </div>

              <div
                v-if="promptFotoGeral || fotosGerais.some(f => f.status === 'erro')"
                class="mt-3 flex flex-wrap items-center gap-2 rounded-xl px-3 py-2 text-xs"
                :class="fotosGerais.some(f => f.status === 'erro') ? 'bg-red-50' : 'bg-slate-50'"
              >
                <span v-if="fotosGerais.some(f => f.status === 'erro')" class="font-medium text-red-700" data-testid="motivo-foto">
                  <strong>Foto em vermelho:</strong> {{ motivoDaFalha(fotosGerais) }}
                </span>
                <span v-else class="font-medium text-slate-700">Foto adicionada. Tirar mais uma ou {{ editandoOs ? 'salvar' : 'criar a O.S.' }}?</span>
                <button
                  type="button"
                  class="flex items-center gap-1 rounded-lg border border-black/10 bg-white px-3 py-1.5 font-medium text-slate-700 transition hover:bg-slate-100"
                  @click="inputCameraGeral?.click()"
                >
                  <span class="mdi mdi-camera-outline text-[14px]"></span>
                  Tirar outra
                </button>
                <button
                  v-if="fotosGerais.some(f => f.status === 'erro')"
                  type="button"
                  class="rounded-lg border border-black/10 bg-white px-3 py-1.5 font-medium text-slate-600 transition hover:bg-slate-100"
                  @click="descartarFotosComErro"
                >
                  Descartar
                </button>
                <button
                  v-else
                  type="button"
                  :disabled="salvando"
                  class="flex items-center gap-1 rounded-lg bg-black px-3 py-1.5 font-semibold text-white transition hover:bg-black/85 disabled:opacity-60"
                  @click="salvarOs"
                >
                  {{ editandoOs ? 'Salvar alterações' : 'Criar O.S.' }}
                </button>
              </div>
            </div>

            <BaseAlert :message="erroSalvar" class="mt-4" />

          </div><!-- /scroll area -->

          <div class="shrink-0 border-t border-slate-100 px-4 py-3 sm:px-5">
            <!-- Desconto e total sempre visíveis -->
            <div class="mb-3 flex items-center justify-between gap-3">
              <div class="flex items-center gap-2">
                <label for="os-desconto" class="text-xs font-medium text-slate-500">Desconto</label>
                <div class="relative">
                  <span class="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-medium text-slate-400">− R$</span>
                  <input
                    id="os-desconto"
                    :value="descontoStr"
                    type="text"
                    inputmode="decimal"
                    placeholder="0,00"
                    class="w-28 rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-10 pr-2.5 text-right text-sm font-semibold text-slate-900 outline-none transition focus:border-black focus:bg-white focus:ring-2 focus:ring-black/10"
                    @input="aoEditarDesconto"
                    @blur="aoBlurDesconto"
                  />
                </div>
              </div>
              <div class="text-right leading-tight">
                <p v-if="totalGeral > totalFinal" class="text-[11px] text-slate-400 line-through">{{ formatarMoeda(totalGeral) }}</p>
                <p class="text-lg font-black tracking-tight text-black">
                  <span class="mr-1 text-xs font-medium text-slate-500">Total</span>{{ formatarMoeda(totalFinal) }}
                </p>
              </div>
            </div>

            <div class="flex gap-2 sm:items-center sm:justify-end">
              <button type="button"
                class="flex flex-1 items-center justify-center gap-2 rounded-xl border border-black/10 px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 sm:flex-none"
                @click="editandoOs ? cancelarEdicao() : (etapa = 'cliente')">
                <span class="mdi mdi-arrow-left text-[16px]"></span> {{ editandoOs ? 'Cancelar' : 'Voltar' }}
              </button>
              <button type="submit" :disabled="salvando"
                class="flex flex-1 items-center justify-center gap-2 rounded-xl bg-black px-7 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-px hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none">
                <span :class="salvando ? 'mdi mdi-loading animate-spin' : 'mdi mdi-content-save-outline'" class="text-[18px]"></span>
                {{ salvando ? 'Salvando...' : editandoOs ? 'Salvar alterações' : 'Criar O.S.' }}
              </button>
            </div>
          </div>
        </form>
      </div>


      <!-- ── ETAPA 4: Impressão ────────────────────────────────── -->
      <div v-else-if="etapa === 'impressao'" key="impressao" class="flex flex-1 min-h-0 flex-col pt-3">

        <div class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-black/8 bg-white shadow-[0_4px_24px_rgba(15,23,42,0.06)]">
          <div class="flex flex-1 flex-col overflow-y-auto p-3 sm:p-5">

            <!-- Sucesso + número da O.S. -->
            <div class="anim-subir mb-3 flex items-center gap-3 rounded-xl bg-emerald-50 px-3 py-2.5">
              <div class="anim-check relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                <span class="anim-onda absolute inset-0 rounded-full bg-emerald-400"></span>
                <span class="mdi mdi-check-bold relative text-[22px]"></span>
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-sm font-semibold text-emerald-900 sm:text-base">O.S. criada com sucesso</p>
                <p class="truncate text-xs text-emerald-800/70">{{ cliente.nome }}</p>
              </div>
              <div class="flex shrink-0 flex-col items-end leading-none">
                <span class="text-[10px] font-medium uppercase tracking-wider text-emerald-800/60">O.S. nº</span>
                <span class="mt-1 text-2xl font-bold tabular-nums tracking-tight text-emerald-900">{{ osCriada?.numero ?? osCriada?.id }}</span>
              </div>
            </div>

            <BaseAlert :message="avisoFotos" class="mb-3" />
            <dl class="anim-subir mb-4 grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-3 sm:p-3 lg:grid-cols-3" style="animation-delay:.08s">
              <div v-for="item in resumo" :key="item.label" :class="item.cheio ? 'col-span-2 sm:col-span-1' : ''" class="min-w-0">
                <dt class="text-[10px] text-slate-400 sm:text-[11px]">{{ item.label }}</dt>
                <dd class="truncate text-[13px] font-medium text-slate-900 sm:text-sm">{{ item.valor }}</dd>
              </div>
            </dl>

            <!-- Seção de impressão -->
            <p class="anim-subir mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400" style="animation-delay:.16s">Impressão das vias</p>

            <div :class="['anim-subir relative mt-2 sm:mt-3', menuImpressaoAberto ? 'z-50' : '']" style="animation-delay:.16s" @keydown.esc="menuImpressaoAberto = false">
              <div class="flex overflow-hidden rounded-xl bg-black text-white shadow-sm">
                <button type="button"
                  class="flex min-w-0 flex-1 items-center justify-center gap-2 px-3 py-3 text-sm font-semibold transition hover:bg-black/80 sm:py-3.5"
                  @click="imprimirVia('ambas')">
                  <span class="mdi mdi-printer-pos-outline text-[19px]"></span>
                  <span>Imprimir as duas vias juntas</span>
                </button>
                <div class="border-l border-white/25">
                  <button type="button"
                    class="flex h-full w-12 items-center justify-center transition hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
                    aria-label="Escolher via para imprimir"
                    aria-haspopup="menu"
                    :aria-expanded="menuImpressaoAberto"
                    @click="menuImpressaoAberto = !menuImpressaoAberto">
                    <span class="mdi mdi-printer-outline text-[20px]"></span>
                  </button>
                </div>
              </div>
              <template v-if="menuImpressaoAberto">
                <button type="button" class="fixed inset-0 z-40 cursor-default" aria-label="Fechar opções de impressão" @click="menuImpressaoAberto = false"></button>
                <div role="menu" class="absolute bottom-full right-0 z-50 mb-1 w-48 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 text-slate-700 shadow-lg sm:bottom-auto sm:top-full sm:mb-0 sm:mt-1">
                  <button type="button" role="menuitem" class="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-slate-50" @click="selecionarVia('cliente')">
                    <span class="mdi mdi-account-outline text-base"></span> Via do cliente
                  </button>
                  <button type="button" role="menuitem" class="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-slate-50" @click="selecionarVia('loja')">
                    <span class="mdi mdi-store-outline text-base"></span> Via da loja
                  </button>
                </div>
              </template>
            </div>

            <!-- Esqueceu algo? -->
            <p class="anim-subir mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400" style="animation-delay:.24s">Esqueceu algo?</p>
            <div class="anim-subir grid grid-cols-2 gap-2 sm:gap-3" style="animation-delay:.24s">
              <button type="button" :disabled="carregandoEdicao"
                class="flex items-center justify-center gap-1.5 rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                @click="editarOs">
                <span :class="carregandoEdicao ? 'mdi mdi-loading animate-spin' : 'mdi mdi-pencil-outline'" class="text-[16px]"></span>
                Editar O.S.
              </button>
              <label
                :class="[
                  'flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50',
                  enviandoFotoExtra ? 'pointer-events-none opacity-60' : '',
                ]">
                <span :class="enviandoFotoExtra ? 'mdi mdi-loading animate-spin' : 'mdi mdi-camera-outline'" class="text-[16px]"></span>
                {{ enviandoFotoExtra ? 'Enviando...' : 'Adicionar foto' }}
                <input type="file" accept="image/*" capture="environment" class="sr-only"
                  :disabled="enviandoFotoExtra" @change="aoEscolherFotoExtra" />
              </label>
            </div>

          </div>

          <div class="shrink-0 border-t border-slate-100 px-3 py-2.5 sm:px-5 sm:py-3">
            <div class="flex gap-2">
              <button type="button"
                class="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-black/10 px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 sm:px-5"
                @click="reiniciar">
                <span class="mdi mdi-plus text-[16px]"></span> Nova O.S.
              </button>
              <RouterLink to="/"
                class="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-black/10 px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 sm:px-5">
                <span class="mdi mdi-home-outline text-[16px]"></span> Início
              </RouterLink>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </AppLayout>
</template>

<script setup>
import { useToastStore } from '@/stores/toast'
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'
import BaseFormField from '@/components/base/BaseFormField.vue'
import BaseAlert from '@/components/base/BaseAlert.vue'
import WizardSteps from '@/components/base/WizardSteps.vue'
import ClienteVinculadoBanner from '@/components/base/ClienteVinculadoBanner.vue'
import BaseTimePicker from '@/components/base/BaseTimePicker.vue'
import BaseDatePicker from '@/components/base/BaseDatePicker.vue'
import OsItensEditor from '@/components/os/OsItensEditor.vue'
import { useClienteForm } from '@/composables/useClienteForm'
import { useOsForm } from '@/composables/useOsForm'
import { useItens, formatarMoeda, parseMoeda } from '@/composables/useItens'
import { useFotos } from '@/composables/useFotos'
import { useImpressao } from '@/composables/useImpressao'
import { useRascunhoOs, limparRascunhoOs } from '@/composables/useRascunhoOs'
import { buscarCliente, criarCliente } from '@/services/clientes'
import { criarOrdem, buscarOrdem, enviarFotos, atualizarOrdem, adicionarItemOrdem } from '@/services/ordensServico'
import { adicionarFotosNaLista, liberarFotos, motivoDaFalha } from '@/utils/imagem'
import { dataISO, horaCurta } from '@/utils/ordem'

const route = useRoute()

const STEPS = [
  { key: 'cliente',   label: 'Cliente'   },
  { key: 'os',        label: 'O.S.'      },
  { key: 'impressao', label: 'Impressão' },
]
const etapa     = ref('cliente')
const etapaAtual = computed(() => STEPS.findIndex(s => s.key === etapa.value))
// Editando a O.S. já criada (botão "Editar O.S." da tela final): não volta para a etapa do cliente
const editandoOs = ref(false)
function podeNavegar(i) { return !editandoOs.value && i < etapaAtual.value }

// ── composables ───────────────────────────────────────────────
const {
  cliente, erros: errosCliente, clienteVinculado,
  buscandoTel, buscandoNome, sugestaoTel, sugestoesNome,
  telOriginal, avisoSubstituirTel, loadingSubstituir,
  aoDigitarTelefone, vincularCliente, desvincular,
  substituirTelefone, reverterTelefone,
  mascaraCpf, iniciais, inputClass, touch: touchCliente, validar: validarCliente, reset: resetCliente,
} = useClienteForm()

const {
  os, erros: errosOs, dateInputRef, tiposObjeto, servicos, carregando,
  minDate,
  inputClass: inputClassOs, touch: touchOs, validar: validarOs,
  openDatePicker, reset: resetOs,
} = useOsForm()

const {
  objetos, erros: errosItens, totalGeral, totalObjeto,
  descontoStr, totalFinal,
  nomeTipoObjeto, mudarTipoObjeto, toggleOrcamento,
  adicionarObjeto, removerObjeto, adicionarFotosObjeto, removerFotoObjeto,
  adicionarServico, removerServico, mudarQuantidade,
  aoSelecionarServico, aoEditarValor, aoBlurValor,
  aoEditarDesconto, aoBlurDesconto,
  validar: validarItens, toItens, reset: resetItens, carregarDeOrdem,
} = useItens(tiposObjeto, servicos)

const { fotos: fotosGerais, adicionar: adicionarFotoGeral, remover: removerFotoGeral, reset: resetFotos } = useFotos()
const { formatarData, imprimir } = useImpressao()
const toast = useToastStore()

// ── estado local ─────────────────────────────────────────────────
const salvando   = ref(false)
const erroSalvar = ref('')
const avisoFotos = ref('')
const osCriada   = ref(null)
const clienteCriado = ref(null)
const fotosExtras = ref(0)
const enviandoFotoExtra = ref(false)
const menuImpressaoAberto = ref(false)
const carregandoEdicao = ref(false)
const inputCameraGeral  = ref(null)
const promptFotoGeral   = ref(false)

// Alvos ('geral' ou _id do objeto) cuja foto está sendo tirada/processada: se a página recarregar
// nesse meio tempo, o rascunho recupera o cadastro e mostra a foto com erro para tirar de novo.
const fotosPendentes   = ref([])
const processandoFotos = ref(0)

function marcarFotoPendente(alvo) {
  if (!fotosPendentes.value.includes(alvo)) fotosPendentes.value.push(alvo)
}

async function comFotoPendente(alvo, tarefa) {
  processandoFotos.value++
  try {
    return await tarefa()
  } finally {
    processandoFotos.value--
    fotosPendentes.value = fotosPendentes.value.filter(a => a !== alvo)
  }
}

const adicionarFotosObjetoSeguro = (objetoId, event) =>
  comFotoPendente(objetoId, () => adicionarFotosObjeto(objetoId, event))

// Se o celular recarregar a página (ex.: ao abrir a câmera), o cadastro em andamento é recuperado.
// Ao vir da lista de clientes (cliente_id na URL), o rascunho só vale se for do mesmo cliente.
const rascunhoRestaurado = useRascunhoOs({
  etapa, cliente, clienteVinculado, os, objetos, descontoStr, fotosGerais, fotosPendentes,
  clienteId: route.query.cliente_id || null,
  pausado: editandoOs,
})

const totalFotos = computed(() =>
  fotosGerais.value.filter(f => f.status === 'ok').length
  + objetos.value.reduce((n, o) => n + o.fotos.filter(f => f.status === 'ok').length, 0)
)

const carregandoFotos = computed(() =>
  fotosGerais.value.some(f => f.status === 'carregando')
  || objetos.value.some(o => o.fotos.some(f => f.status === 'carregando'))
)

function descartarFotosComErro() {
  for (let i = fotosGerais.value.length - 1; i >= 0; i--) {
    if (fotosGerais.value[i].status === 'erro') removerFotoGeral(i)
  }
}

async function aoEscolherFotoGeral(event) {
  const recebidas = await comFotoPendente('geral', () => adicionarFotoGeral(event))
  promptFotoGeral.value = recebidas > 0
}

// Se o navegador voltar da câmera sem recarregar a página, a marca de "foto pendente" é descartada
let timerPendente = null
function aoVoltarParaApp() {
  if (document.visibilityState !== 'visible') return
  clearTimeout(timerPendente)
  timerPendente = setTimeout(() => {
    if (!processandoFotos.value) fotosPendentes.value = []
  }, 2500)
}
onMounted(() => document.addEventListener('visibilitychange', aoVoltarParaApp))
onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', aoVoltarParaApp)
  clearTimeout(timerPendente)
})

const resumo = computed(() => {
  const nOrç = objetos.value.filter(o => o.eh_orcamento).length
  const total = objetos.value.length
  const tipoLabel = nOrç === 0 ? 'Entrada' : nOrç === total ? 'Orçamento' : `Misto (${nOrç} em orç.)`
  return [
  { label: 'Tipo',          valor: tipoLabel },
  { label: 'Cliente',       valor: cliente.nome, cheio: true },
  { label: 'Telefone',      valor: cliente.telefone || '—' },
  { label: 'Objetos',       valor: objetos.value.length + (objetos.value.length !== 1 ? ' objetos' : ' objeto') },
  { label: 'Total',         valor: totalFinal.value > 0 ? formatarMoeda(totalFinal.value) : '—' },
  { label: 'Data de entrega',valor: os.dataEntrega ? formatarData(os.dataEntrega) : '—' },
  { label: 'Hora de entrega',valor: os.horaEntrega || '—' },
  { label: 'Fotos',         valor: (totalFotos.value + fotosExtras.value) + (totalFotos.value + fotosExtras.value !== 1 ? ' fotos' : ' foto') },
]})

// ── ciclo de vida ────────────────────────────────────────────
onMounted(async () => {
  if (rascunhoRestaurado.restaurado) {
    const fotos = await rascunhoRestaurado.fotosRestauradas
    if (rascunhoRestaurado.fotoPerdida) {
      toast.erro('Recuperamos o cadastro, mas o celular recarregou a página ao abrir a câmera e a última foto se perdeu. Tire novamente.')
    } else {
      toast.sucesso(fotos
        ? `Recuperamos o cadastro em andamento e ${fotos === 1 ? '1 foto' : `${fotos} fotos`}.`
        : 'Recuperamos o cadastro em andamento.')
    }
    return
  }
  const cid = route.query.cliente_id
  if (cid) {
    try {
      const c = await buscarCliente(Number(cid))
      if (c) vincularCliente(c)
    } catch { /* ignora */ }
  }
})

// ── navegação entre etapas ────────────────────────────────────
function irParaOs() { if (validarCliente()) etapa.value = 'os' }

// ── fotos ───────────────────────────────────────────────────────────────────────
// Os itens são gravados na ordem dos objetos/serviços; a foto de um objeto fica no primeiro item dele
async function enviarFotosDaOrdem(ordemId) {
  if (!totalFotos.value) return

  try {
    const { itens } = await buscarOrdem(ordemId)
    let posicao = 0
    for (const obj of objetos.value) {
      const primeiroItem = itens[posicao]
      posicao += obj.servicos.length
      const fotosObj = obj.fotos.filter(f => f.status === 'ok')
      if (fotosObj.length && primeiroItem) {
        await enviarFotos(ordemId, fotosObj.map(f => f.file), primeiroItem.id)
      }
    }
    const fotosGeraisOk = fotosGerais.value.filter(f => f.status === 'ok')
    if (fotosGeraisOk.length) {
      await enviarFotos(ordemId, fotosGeraisOk.map(f => f.file))
    }
  } catch {
    avisoFotos.value = 'A O.S. foi criada, mas nem todas as fotos foram enviadas. Adicione-as pela tela da O.S.'
  }
}

// ── salvar ────────────────────────────────────────────────────────────────────
async function salvarOs() {
  if (salvando.value) return
  if (carregandoFotos.value) {
    toast.erro('Aguarde as fotos terminarem de carregar.')
    return
  }
  const okOs    = validarOs()
  const okItens = validarItens()
  if (!okOs || !okItens) {
    await nextTick()
    const alvo = document.querySelector('[data-erro]') || (!okOs ? document.getElementById('os-data') : null)
    alvo?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    if (alvo?.matches('select')) alvo.focus({ preventScroll: true })
    return
  }

  salvando.value  = true
  erroSalvar.value = ''
  avisoFotos.value = ''
  if (editandoOs.value) {
    await salvarEdicao()
    salvando.value = false
    return
  }
  try {
    let clienteId = clienteVinculado.value?.id ?? null
    const telefoneDigitos = cliente.telefone.replace(/\D/g, '')
    // Se uma tentativa anterior criou o cliente mas falhou ao criar a O.S., reaproveita em vez de duplicar (409)
    if (!clienteId && clienteCriado.value && clienteCriado.value.telefone === telefoneDigitos && clienteCriado.value.nome === cliente.nome.trim()) {
      clienteId = clienteCriado.value.id
    }
    if (!clienteId) {
      const novo = await criarCliente({
        nome:                  cliente.nome.trim(),
        telefone:              cliente.telefone.replace(/\D/g, '') || null,
        cpf:                   cliente.cpf ? cliente.cpf.replace(/\D/g, '') : null,
        email:                 cliente.email.trim() || null,
        informacao_adicional:  cliente.observacoes.trim() || null,
      })
      clienteId = novo.id
      clienteCriado.value = { id: novo.id, telefone: telefoneDigitos, nome: cliente.nome.trim() }
    }


    osCriada.value = await criarOrdem({
      cliente_id:   clienteId,
      estado:       os.estado,
      data_entrega: os.dataEntrega,
      hora_entrega: os.horaEntrega || undefined,
      observacoes:  os.observacoes.trim() || undefined,
      itens:        toItens(),
    })
    await enviarFotosDaOrdem(osCriada.value.id)
    limparRascunhoOs()
    etapa.value = 'impressao'
  } catch (err) {
    const msg = err?.response?.data?.message ?? err?.response?.data?.erro
    const s   = err?.response?.status
    erroSalvar.value = s === 409 ? msg || 'Telefone ou CPF já cadastrado.'
      : s === 422             ? msg || 'Verifique os dados e tente novamente.'
      :                         msg || 'Erro ao salvar. Tente novamente.'
    toast.erro(erroSalvar.value)
  } finally {
    salvando.value = false
  }
}

// ── editar a O.S. já criada ──────────────────────────────────────────
// Mostra a O.S. gravada no editor: o que já existe fica travado e só recebe acréscimos
// (novo serviço em um objeto, novo objeto, fotos) além de data, hora e observações.
function aplicarOrdem(ordem) {
  osCriada.value = ordem
  carregarDeOrdem(ordem.itens, ordem.fotos)
  resetFotos()
  os.dataEntrega = dataISO(ordem.data_entrega)
  os.horaEntrega = horaCurta(ordem.hora_entrega)
  os.observacoes = ordem.observacoes || ''
  // as fotos já enviadas contam como "extras"; as do editor são só as novas
  fotosExtras.value = ordem.fotos?.length ?? 0
}

async function editarOs() {
  if (!osCriada.value || carregandoEdicao.value) return
  carregandoEdicao.value = true
  try {
    aplicarOrdem(await buscarOrdem(osCriada.value.id))
    erroSalvar.value = ''
    avisoFotos.value = ''
    promptFotoGeral.value = false
    editandoOs.value = true
    etapa.value = 'os'
  } catch {
    toast.erro('Não foi possível abrir a O.S. para edição. Tente novamente.')
  } finally {
    carregandoEdicao.value = false
  }
}

async function cancelarEdicao() {
  editandoOs.value = false
  etapa.value = 'impressao'
  // descarta o que não foi salvo, para a impressão refletir só a O.S. gravada
  try {
    aplicarOrdem(await buscarOrdem(osCriada.value.id))
  } catch {
    toast.erro('Não foi possível recarregar a O.S.')
  }
}

async function salvarEdicao() {
  const id = osCriada.value.id
  try {
    await atualizarOrdem(id, {
      data_entrega: os.dataEntrega,
      hora_entrega: os.horaEntrega || null,
      observacoes:  os.observacoes.trim() || null,
    })

    let falhouFoto = false
    for (const obj of objetos.value) {
      let primeiroItemId = obj.servicos.find(sv => sv._itemId)?._itemId ?? null
      for (const sv of obj.servicos) {
        if (sv._itemId) continue
        const item = await adicionarItemOrdem(id, {
          tipo_objeto_id: Number(obj.tipo_objeto_id),
          servico_id:     Number(sv.servico_id),
          quantidade:     sv.quantidade,
          valor_unitario: parseMoeda(sv._valorStr) || null,
          eh_orcamento:   obj.eh_orcamento,
        })
        sv._itemId = item.id // se algo falhar adiante, tentar de novo não duplica o que já foi gravado
        primeiroItemId ??= item.id
      }

      const fotosObj = obj.fotos.filter(f => f.status === 'ok')
      if (fotosObj.length && primeiroItemId) {
        try {
          await enviarFotos(id, fotosObj.map(f => f.file), primeiroItemId)
          liberarFotos(fotosObj)
          obj.fotos = obj.fotos.filter(f => !fotosObj.includes(f))
        } catch {
          falhouFoto = true
        }
      }
    }

    const fotosGeraisOk = fotosGerais.value.filter(f => f.status === 'ok')
    if (fotosGeraisOk.length) {
      try {
        await enviarFotos(id, fotosGeraisOk.map(f => f.file))
        descartarFotosEnviadas(fotosGeraisOk)
      } catch {
        falhouFoto = true
      }
    }

    if (falhouFoto) {
      erroSalvar.value = 'Os dados foram salvos, mas nem todas as fotos foram enviadas. Tente salvar de novo.'
      toast.erro(erroSalvar.value)
      return
    }

    aplicarOrdem(await buscarOrdem(id))
    editandoOs.value = false
    toast.sucesso('O.S. atualizada.')
    etapa.value = 'impressao'
  } catch (err) {
    const msg = err?.response?.data?.message ?? err?.response?.data?.erro
    erroSalvar.value = msg || 'Erro ao salvar. Tente novamente.'
    toast.erro(erroSalvar.value)
  }
}

function descartarFotosEnviadas(enviadas) {
  liberarFotos(enviadas)
  for (let i = fotosGerais.value.length - 1; i >= 0; i--) {
    if (enviadas.includes(fotosGerais.value[i])) fotosGerais.value.splice(i, 1)
  }
}

// ── impressão ────────────────────────────────────────────────
function imprimirVia(tipo) {
  imprimir({
    osNum:    osCriada.value?.numero ?? osCriada.value?.id ?? '—',
    cliente, os,
    itens: objetos.value.map(obj => ({
      nomeObjeto: nomeTipoObjeto(obj.tipo_objeto_id),
      servicos:   obj.servicos.map(sv => ({
        nome:       sv.nome,
        quantidade: sv.quantidade,
        valor:      sv._valorStr || '—',
      })),
    })),
    tipo,
  })
}

function selecionarVia(tipo) {
  menuImpressaoAberto.value = false
  imprimirVia(tipo)
}

// Foto esquecida: envia direto para a O.S. já criada
async function aoEscolherFotoExtra(event) {
  const arquivos = Array.from(event.target.files ?? [])
  event.target.value = ''
  if (!arquivos.length || !osCriada.value) return

  enviandoFotoExtra.value = true
  const lista = []
  try {
    await adicionarFotosNaLista(lista, arquivos)
    const ok = lista.filter(f => f.status === 'ok')
    if (!ok.length) throw new Error('nenhuma foto válida')
    await enviarFotos(osCriada.value.id, ok.map(f => f.file))
    fotosExtras.value += ok.length
    toast.sucesso(ok.length === 1 ? 'Foto adicionada.' : `${ok.length} fotos adicionadas.`)
    if (ok.length < lista.length) toast.erro('Alguma foto não pôde ser enviada.')
  } catch {
    toast.erro('Não foi possível enviar a foto. Tente novamente.')
  } finally {
    liberarFotos(lista)
    enviandoFotoExtra.value = false
  }
}

// ── reiniciar ────────────────────────────────────────────────
function reiniciar() {
  editandoOs.value = false
  etapa.value = 'cliente'
  resetCliente()
  resetOs()
  resetItens()
  resetFotos()
  clienteCriado.value = null
  osCriada.value   = null
  fotosExtras.value = 0
  erroSalvar.value = ''
  avisoFotos.value = ''
  promptFotoGeral.value = false
}
</script>

<style scoped>
.slide-enter-active, .slide-leave-active { transition: opacity 0.18s ease, transform 0.18s ease; }
.slide-enter-from { opacity: 0; transform: translateX(16px); }
.slide-leave-to   { opacity: 0; transform: translateX(-16px); }
.slide-down-enter-active, .slide-down-leave-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.slide-down-enter-from, .slide-down-leave-to { opacity: 0; transform: translateY(-6px); }

/* Entrada da tela de sucesso */
.anim-subir { animation: subir .35s ease-out both; }
.anim-check { animation: pop .5s cubic-bezier(.2, 1.4, .4, 1) both; }
.anim-onda  { animation: onda 1s ease-out .35s 1 both; }
@keyframes subir { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
@keyframes pop   { from { opacity: 0; transform: scale(.3); } to { opacity: 1; transform: scale(1); } }
@keyframes onda  { from { opacity: .55; transform: scale(1); } to { opacity: 0; transform: scale(1.9); } }
@media (prefers-reduced-motion: reduce) {
  .anim-subir, .anim-check, .anim-onda { animation: none; }
}
</style>
