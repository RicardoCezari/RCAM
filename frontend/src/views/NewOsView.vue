<template>
  <AppLayout>
    <!-- ── Indicador de etapas ─────────────────────────────────── -->
    <div class="mb-6 flex items-center">
      <template v-for="(s, i) in steps" :key="s.key">
        <div class="flex flex-col items-center gap-1">
          <button
            type="button"
            :disabled="!podeNavegar(i)"
            :class="[
              'flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition',
              etapaAtual > i
                ? 'border-black bg-black text-white'
                : etapaAtual === i
                  ? 'border-black bg-white text-black'
                  : 'cursor-not-allowed border-slate-200 bg-white text-slate-400',
            ]"
            @click="podeNavegar(i) && (etapa = s.key)"
          >
            {{ i + 1 }}
          </button>
          <span
            :class="[
              'hidden text-xs sm:block',
              etapaAtual === i ? 'font-semibold text-black' : 'text-slate-400',
            ]"
          >{{ s.label }}</span>
        </div>
        <div
          v-if="i < steps.length - 1"
          :class="['mb-4 mx-2 h-px flex-1', etapaAtual > i ? 'bg-black' : 'bg-slate-200']"
        />
      </template>
    </div>

    <!-- ── ETAPA 1: Cliente ───────────────────────────────────── -->
    <transition name="slide" mode="out-in">
      <div v-if="etapa === 'cliente'" key="cliente">
        <div class="mb-2 flex items-center gap-2 text-sm text-slate-400">
          <RouterLink to="/" class="transition hover:text-slate-700">Início</RouterLink>
          <span class="mdi mdi-chevron-right text-[16px]"></span>
          <span class="font-medium text-slate-700">Nova O.S.</span>
          <span class="mdi mdi-chevron-right text-[16px]"></span>
          <span class="font-medium text-slate-700">Cliente</span>
        </div>
        <h1 class="mb-6 mt-4 text-2xl font-semibold text-slate-900">Dados do cliente</h1>

        <form
          class="rounded-2xl border border-black/8 bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,0.06)] sm:p-8"
          novalidate
          @submit.prevent="irParaOs"
        >
          <!-- Telefone -->
          <BaseFormField id="os-telefone" label="Telefone" optional :error="erros.telefone" class="mb-5">
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
                @blur="touch('telefone')"
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
                <div
                  v-if="sugestaoTel && !clienteVinculado && !avisoSubstituirTel"
                  class="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.12)]"
                >
                  <button
                    type="button"
                    class="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
                    @mousedown.prevent="vincularCliente(sugestaoTel)"
                  >
                    <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black text-[11px] font-bold text-white">
                      {{ iniciais(sugestaoTel.nome) }}
                    </div>
                    <div class="min-w-0">
                      <p class="truncate text-sm font-medium text-slate-900">{{ sugestaoTel.nome }}</p>
                      <p class="text-xs text-slate-400">{{ sugestaoTel.telefone }}</p>
                    </div>
                    <span class="ml-auto shrink-0 text-xs text-slate-400">selecionar</span>
                  </button>
                </div>
              </transition>
              <transition name="slide-down">
                <div
                  v-if="avisoSubstituirTel && clienteVinculado"
                  class="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.12)]"
                >
                  <div class="px-4 py-3">
                    <p class="mb-3 text-sm text-slate-700">
                      <span class="mdi mdi-information-outline mr-1 text-[14px] text-slate-400"></span>
                      <strong>{{ clienteVinculado.nome }}</strong> tem <strong>{{ telOriginal }}</strong> cadastrado. O que deseja fazer?
                    </p>
                    <div class="flex gap-2">
                      <button
                        type="button"
                        :disabled="loadingSubstituir"
                        class="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-black px-3 py-2 text-xs font-semibold text-white transition hover:bg-black/85 disabled:opacity-60"
                        @mousedown.prevent="substituirTelefone"
                      >
                        <span v-if="loadingSubstituir" class="mdi mdi-loading animate-spin text-[13px]"></span>
                        <span v-else class="mdi mdi-phone-sync-outline text-[13px]"></span>
                        {{ loadingSubstituir ? 'Atualizando...' : 'Substituir número' }}
                      </button>
                      <button
                        type="button"
                        class="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                        @mousedown.prevent="reverterTelefone"
                      >
                        <span class="mdi mdi-undo text-[13px]"></span>
                        Manter original
                      </button>
                    </div>
                  </div>
                </div>
              </transition>
            </div>
          </BaseFormField>

          <!-- Nome -->
          <BaseFormField
            id="os-nome"
            label="Nome completo"
            required
            :error="!clienteVinculado ? erros.nome : ''"
            class="mb-5"
          >
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
                @blur="touch('nome')"
              />
              <span v-if="buscandoNome" class="mdi mdi-loading animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-[15px] text-slate-400"></span>
              <transition name="slide-down">
                <div
                  v-if="sugestoesNome.length && !clienteVinculado"
                  class="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.12)]"
                >
                  <button
                    v-for="c in sugestoesNome"
                    :key="c.id"
                    type="button"
                    class="flex w-full items-center gap-3 border-t border-black/5 px-4 py-3 text-left transition first:border-0 hover:bg-slate-50"
                    @mousedown.prevent="vincularCliente(c)"
                  >
                    <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black text-[11px] font-bold text-white">
                      {{ iniciais(c.nome) }}
                    </div>
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

          <!-- CPF + Email -->
          <div class="mb-5 grid gap-5 sm:grid-cols-2">
            <BaseFormField id="os-cpf" label="CPF" optional :error="erros.cpf">
              <input
                id="os-cpf"
                v-model="cliente.cpf"
                type="text"
                maxlength="14"
                inputmode="numeric"
                placeholder="000.000.000-00"
                :class="inputClass('cpf')"
                @input="mascaraCpf"
                @blur="touch('cpf')"
              />
            </BaseFormField>
            <BaseFormField id="os-email" label="E-mail" optional :error="erros.email">
              <input
                id="os-email"
                v-model="cliente.email"
                type="email"
                placeholder="exemplo@email.com"
                autocomplete="email"
                :class="inputClass('email')"
                @blur="touch('email')"
              />
            </BaseFormField>
          </div>

          <!-- Observações -->
          <BaseFormField id="os-obs" label="Observações" optional class="mb-5">
            <textarea
              id="os-obs"
              v-model="cliente.observacoes"
              rows="3"
              placeholder="Endereço, referência, anotações..."
              class="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-black focus:bg-white focus:ring-2 focus:ring-black/10"
            ></textarea>
          </BaseFormField>

          <div class="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <RouterLink
              to="/"
              class="flex items-center justify-center gap-2 rounded-xl border border-black/10 px-6 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Cancelar
            </RouterLink>
            <button
              type="submit"
              class="flex items-center justify-center gap-2 rounded-xl bg-black px-8 py-3 text-sm font-semibold text-white transition hover:-translate-y-px hover:bg-black/85"
            >
              <span class="mdi mdi-wrench-outline text-[18px]"></span>
              Criar O.S.
            </button>
          </div>
        </form>
      </div>
    </transition>

    <!-- ── ETAPA 2: O.S. ──────────────────────────────────────── -->
    <transition name="slide" mode="out-in">
      <div v-if="etapa === 'os'" key="os">
        <div class="mb-2 flex items-center gap-2 text-sm text-slate-400">
          <RouterLink to="/" class="transition hover:text-slate-700">Início</RouterLink>
          <span class="mdi mdi-chevron-right text-[16px]"></span>
          <button type="button" class="transition hover:text-slate-700" @click="etapa = 'cliente'">Nova O.S.</button>
          <span class="mdi mdi-chevron-right text-[16px]"></span>
          <span class="font-medium text-slate-700">Dados da O.S.</span>
        </div>
        <h1 class="mb-6 mt-4 text-2xl font-semibold text-slate-900">Dados da ordem de serviço</h1>

        <!-- Info cliente vinculado -->
        <div class="mb-4 flex items-center gap-3 rounded-xl border border-black/8 bg-white px-4 py-3 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
          <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-black text-sm font-bold text-white">
            {{ iniciais(cliente.nome) }}
          </div>
          <div class="min-w-0">
            <p class="truncate text-sm font-semibold text-slate-900">{{ cliente.nome }}</p>
            <p class="text-xs text-slate-400">{{ cliente.telefone || 'Sem telefone' }}</p>
          </div>
          <button
            type="button"
            class="ml-auto flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-200"
            @click="etapa = 'cliente'"
          >
            <span class="mdi mdi-pencil-outline text-[12px]"></span>
            Alterar
          </button>
        </div>

        <form
          class="rounded-2xl border border-black/8 bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,0.06)] sm:p-8"
          novalidate
          @submit.prevent="irParaFotos"
        >
          <!-- Tipo objeto + Serviço -->
          <div class="mb-5 grid gap-5 sm:grid-cols-2">
            <BaseFormField id="os-tipo" label="Tipo de objeto" required :error="errosOs.tipoObjeto">
              <div class="relative">
                <select
                  id="os-tipo"
                  v-model="os.tipoObjeto"
                  :class="selectClass('tipoObjeto')"
                  @blur="touchOs('tipoObjeto')"
                >
                  <option value="">Selecione o tipo de objeto</option>
                  <option v-for="t in tiposObjeto" :key="t.id" :value="String(t.id)">{{ t.nome }}</option>
                </select>
                <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <span class="mdi mdi-chevron-down text-[16px]"></span>
                </span>
              </div>
            </BaseFormField>

            <BaseFormField id="os-servico" label="Serviço" required :error="errosOs.servico">
              <div class="relative">
                <select
                  id="os-servico"
                  v-model="os.servico"
                  :class="selectClass('servico')"
                  @blur="touchOs('servico')"
                >
                  <option value="">Selecione um serviço</option>
                  <option v-for="s in servicos" :key="s.id" :value="String(s.id)">{{ s.nome }}</option>
                </select>
                <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <span class="mdi mdi-chevron-down text-[16px]"></span>
                </span>
              </div>
            </BaseFormField>
          </div>

          <!-- Quantidade + Data entrega -->
          <div class="mb-5 grid gap-5 sm:grid-cols-2">
            <BaseFormField id="os-qtd" label="Quantidade" required>
              <div class="flex h-12 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 transition focus-within:border-black focus-within:ring-2 focus-within:ring-black/10">
                <button
                  type="button"
                  class="flex w-11 shrink-0 items-center justify-center border-r border-slate-200 text-slate-500 transition hover:bg-slate-100"
                  @click="os.quantidade = Math.max(1, os.quantidade - 1)"
                >
                  <span class="mdi mdi-minus text-[16px]"></span>
                </button>
                <input
                  type="number"
                  v-model.number="os.quantidade"
                  min="1"
                  max="99"
                  class="w-full bg-transparent text-center text-sm font-semibold text-slate-900 outline-none [appearance:textfield]"
                />
                <button
                  type="button"
                  class="flex w-11 shrink-0 items-center justify-center border-l border-slate-200 text-slate-500 transition hover:bg-slate-100"
                  @click="os.quantidade = Math.min(99, os.quantidade + 1)"
                >
                  <span class="mdi mdi-plus text-[16px]"></span>
                </button>
              </div>
            </BaseFormField>

            <BaseFormField id="os-data" label="Data de entrega" required :error="errosOs.dataEntrega">
              <input
                id="os-data"
                ref="dateInputRef"
                v-model="os.dataEntrega"
                type="date"
                :class="inputClassOs('dataEntrega')"
                @blur="touchOs('dataEntrega')"
                @click="openDatePicker"
              />
            </BaseFormField>
          </div>

          <!-- Valor + Observações -->
          <div class="mb-5 grid gap-5 sm:grid-cols-2">
            <BaseFormField id="os-valor" label="Valor estimado" optional>
              <input
                id="os-valor"
                v-model="os.valor"
                type="text"
                inputmode="numeric"
                placeholder="R$ 0,00"
                class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-black focus:bg-white focus:ring-2 focus:ring-black/10"
                @input="onCurrencyInput"
              />
            </BaseFormField>

            <BaseFormField id="os-obs2" label="Observações" optional>
              <textarea
                id="os-obs2"
                v-model="os.observacoes"
                rows="1"
                placeholder="Detalhes do serviço..."
                class="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-black focus:bg-white focus:ring-2 focus:ring-black/10"
              ></textarea>
            </BaseFormField>
          </div>

          <div class="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              class="flex items-center justify-center gap-2 rounded-xl border border-black/10 px-6 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              @click="etapa = 'cliente'"
            >
              <span class="mdi mdi-arrow-left text-[16px]"></span>
              Voltar
            </button>
            <button
              type="submit"
              class="flex items-center justify-center gap-2 rounded-xl bg-black px-8 py-3 text-sm font-semibold text-white transition hover:-translate-y-px hover:bg-black/85"
            >
              <span class="mdi mdi-camera-outline text-[18px]"></span>
              Adicionar fotos
            </button>
          </div>
        </form>
      </div>
    </transition>

    <!-- ── ETAPA 3: Fotos ─────────────────────────────────────── -->
    <transition name="slide" mode="out-in">
      <div v-if="etapa === 'fotos'" key="fotos">
        <div class="mb-2 flex items-center gap-2 text-sm text-slate-400">
          <RouterLink to="/" class="transition hover:text-slate-700">Início</RouterLink>
          <span class="mdi mdi-chevron-right text-[16px]"></span>
          <button type="button" class="transition hover:text-slate-700" @click="etapa = 'os'">Dados da O.S.</button>
          <span class="mdi mdi-chevron-right text-[16px]"></span>
          <span class="font-medium text-slate-700">Fotos</span>
        </div>
        <h1 class="mb-2 mt-4 text-2xl font-semibold text-slate-900">Fotos das peças</h1>
        <p class="mb-6 text-sm text-slate-500">Registre o estado dos itens recebidos. As fotos ficam salvas junto à O.S.</p>

        <div class="rounded-2xl border border-black/8 bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,0.06)] sm:p-8">
          <!-- Botões de captura -->
          <div class="flex flex-col gap-3 sm:flex-row">
            <label class="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-5 text-sm font-medium text-slate-600 transition hover:border-black hover:bg-white hover:text-black">
              <span class="mdi mdi-camera text-[22px]"></span>
              Tirar foto (câmera)
              <input type="file" accept="image/*" capture="environment" class="sr-only" @change="adicionarFotos" />
            </label>
            <label class="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-5 text-sm font-medium text-slate-600 transition hover:border-black hover:bg-white hover:text-black">
              <span class="mdi mdi-image-multiple-outline text-[22px]"></span>
              Selecionar arquivos
              <input type="file" accept="image/*" multiple class="sr-only" @change="adicionarFotos" />
            </label>
          </div>

          <!-- Preview grid -->
          <div v-if="fotoPreviews.length" class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <div
              v-for="(f, i) in fotoPreviews"
              :key="f.url"
              class="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
            >
              <img :src="f.url" :alt="f.name" class="h-32 w-full object-cover" />
              <button
                type="button"
                class="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white transition hover:bg-black"
                @click="removerFoto(i)"
              >
                <span class="mdi mdi-close text-[12px]"></span>
              </button>
              <p class="truncate px-2 py-1.5 text-[11px] text-slate-500">{{ f.name }}</p>
            </div>
          </div>
          <p v-else class="mt-6 text-center text-sm text-slate-400">
            Nenhuma foto adicionada ainda. (Opcional)
          </p>

          <BaseAlert :message="erroSalvar" class="mt-4" />

          <div class="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              class="flex items-center justify-center gap-2 rounded-xl border border-black/10 px-6 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              @click="etapa = 'os'"
            >
              <span class="mdi mdi-arrow-left text-[16px]"></span>
              Voltar
            </button>
            <button
              type="button"
              :disabled="salvando"
              class="flex items-center justify-center gap-2 rounded-xl bg-black px-8 py-3 text-sm font-semibold text-white transition hover:-translate-y-px hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-60"
              @click="salvarOs"
            >
              <span v-if="salvando" class="mdi mdi-loading animate-spin text-[18px]"></span>
              <span v-else class="mdi mdi-content-save-outline text-[18px]"></span>
              {{ salvando ? 'Salvando...' : 'Salvar O.S.' }}
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- ── ETAPA 4: Impressão ─────────────────────────────────── -->
    <transition name="slide" mode="out-in">
      <div v-if="etapa === 'impressao'" key="impressao">
        <div class="flex flex-col items-center py-8 text-center">
          <div class="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 ring-8 ring-emerald-50/50">
            <span class="mdi mdi-check-circle text-[40px] text-emerald-500"></span>
          </div>
          <h2 class="mt-4 text-2xl font-semibold text-slate-900">O.S. criada com sucesso!</h2>
          <p class="mt-1 text-sm text-slate-500">
            O.S. <strong class="text-slate-900">#{{ osCriada?.numero ?? osCriada?.id }}</strong>
            para <strong class="text-slate-900">{{ cliente.nome }}</strong>
          </p>
        </div>

        <div class="rounded-2xl border border-black/8 bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,0.06)] sm:p-8">
          <!-- Resumo -->
          <h3 class="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Resumo</h3>
          <dl class="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <div>
              <dt class="text-xs text-slate-400">Cliente</dt>
              <dd class="text-sm font-medium text-slate-900">{{ cliente.nome }}</dd>
            </div>
            <div>
              <dt class="text-xs text-slate-400">Telefone</dt>
              <dd class="text-sm font-medium text-slate-900">{{ cliente.telefone || '—' }}</dd>
            </div>
            <div>
              <dt class="text-xs text-slate-400">Serviço</dt>
              <dd class="text-sm font-medium text-slate-900">{{ nomeServico }}</dd>
            </div>
            <div>
              <dt class="text-xs text-slate-400">Data de entrega</dt>
              <dd class="text-sm font-medium text-slate-900">{{ os.dataEntrega ? formatarData(os.dataEntrega) : '—' }}</dd>
            </div>
            <div>
              <dt class="text-xs text-slate-400">Valor</dt>
              <dd class="text-sm font-medium text-slate-900">{{ os.valor || '—' }}</dd>
            </div>
            <div>
              <dt class="text-xs text-slate-400">Fotos</dt>
              <dd class="text-sm font-medium text-slate-900">
                {{ fotoPreviews.length }} foto{{ fotoPreviews.length !== 1 ? 's' : '' }}
              </dd>
            </div>
          </dl>

          <hr class="my-6 border-slate-100" />

          <!-- Impressão -->
          <h3 class="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Impressão</h3>
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              class="flex flex-1 items-center justify-center gap-2 rounded-xl bg-black px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-px hover:bg-black/85"
              @click="imprimirVias(2)"
            >
              <span class="mdi mdi-printer-outline text-[18px]"></span>
              Imprimir 2 vias
            </button>
            <div class="flex h-12 overflow-hidden rounded-xl border border-slate-200 sm:w-56">
              <input
                v-model.number="viasExtra"
                type="number"
                min="1"
                max="20"
                class="w-full bg-slate-50 px-3 text-center text-sm font-semibold text-slate-900 outline-none [appearance:textfield] focus:bg-white"
              />
              <button
                type="button"
                class="flex shrink-0 items-center gap-2 border-l border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                @click="imprimirVias(viasExtra)"
              >
                <span class="mdi mdi-printer-outline text-[16px]"></span>
                Imprimir
              </button>
            </div>
          </div>

          <div class="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              class="flex flex-1 items-center justify-center gap-2 rounded-xl border border-black/10 px-6 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              @click="reiniciar"
            >
              <span class="mdi mdi-plus text-[16px]"></span>
              Nova O.S.
            </button>
            <RouterLink
              to="/"
              class="flex flex-1 items-center justify-center gap-2 rounded-xl border border-black/10 px-6 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              <span class="mdi mdi-home-outline text-[16px]"></span>
              Início
            </RouterLink>
          </div>
        </div>
      </div>
    </transition>
  </AppLayout>
</template>

<script setup>
import { reactive, ref, computed, watch, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'
import BaseFormField from '@/components/base/BaseFormField.vue'
import BaseAlert from '@/components/base/BaseAlert.vue'
import {
  buscarClientePorTelefone,
  listarClientes,
  criarCliente,
  atualizarCliente,
  buscarCliente,
} from '@/services/clientes'
import { listarServicos, listarTiposObjeto } from '@/services/servicos'
import { criarOrdem } from '@/services/ordensServico'

const route = useRoute()

// ── Etapas ────────────────────────────────────────────────────
const etapa = ref('cliente')
const steps = [
  { key: 'cliente',   label: 'Cliente'   },
  { key: 'os',        label: 'O.S.'      },
  { key: 'fotos',     label: 'Fotos'     },
  { key: 'impressao', label: 'Impressão' },
]
const etapaAtual = computed(() => steps.findIndex(s => s.key === etapa.value))
function podeNavegar(i) { return i < etapaAtual.value }

// ── Dados do cliente ──────────────────────────────────────────
const cliente = reactive({ nome: '', telefone: '', cpf: '', email: '', observacoes: '' })
const erros = reactive({ nome: '', telefone: '', cpf: '', email: '' })
const tocados = reactive({})
const clienteVinculado = ref(null)
const buscandoTel = ref(false)
const buscandoNome = ref(false)
const sugestaoTel = ref(null)
const sugestoesNome = ref([])
const telOriginal = ref('')
const avisoSubstituirTel = ref(false)
const loadingSubstituir = ref(false)
let timerNome = null

onMounted(async () => {
  // Pré-carregar cliente via query param (link de NovoClienteView)
  const cid = route.query.cliente_id
  if (cid) {
    try {
      const c = await buscarCliente(Number(cid))
      if (c) vincularCliente(c)
    } catch { /* ignora */ }
  }
  // Carregar catálogos
  try {
    const [tipos, svcs] = await Promise.all([
      listarTiposObjeto(),
      listarServicos({ ativo: true }),
    ])
    tiposObjeto.value = tipos ?? []
    servicos.value = svcs?.data ?? svcs ?? []
  } catch { /* ignora — campos ficam vazios */ }
})

watch(() => cliente.nome, (val) => {
  if (clienteVinculado.value) return
  sugestoesNome.value = []
  clearTimeout(timerNome)
  const q = val.trim()
  if (q.length < 2) { buscandoNome.value = false; return }
  buscandoNome.value = true
  timerNome = setTimeout(async () => {
    try {
      const res = await listarClientes({ q, limit: 6, page: 1 })
      sugestoesNome.value = res.data || []
    } catch {
      sugestoesNome.value = []
    } finally {
      buscandoNome.value = false
    }
  }, 350)
})

function aoDigitarTelefone(e) {
  let d = e.target.value.replace(/\D/g, '').slice(0, 11)
  let v = d
  if (d.length > 2 && d.length <= 7)  v = `(${d.slice(0, 2)}) ${d.slice(2)}`
  else if (d.length > 7)              v = `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  else if (d.length === 2)            v = `(${d})`
  cliente.telefone = v

  if (clienteVinculado.value) {
    sugestaoTel.value = null
    avisoSubstituirTel.value = (v !== telOriginal.value)
    return
  }
  sugestaoTel.value = null
  avisoSubstituirTel.value = false
  if (d.length === 11) buscarPorTelefone(d)
}

async function buscarPorTelefone(digits) {
  buscandoTel.value = true
  try {
    const c = await buscarClientePorTelefone(digits)
    sugestaoTel.value = c || null
  } catch {
    sugestaoTel.value = null
  } finally {
    buscandoTel.value = false
  }
}

function vincularCliente(c) {
  const d = (c.telefone || '').replace(/\D/g, '').slice(0, 11)
  let fmt = d
  if (d.length > 7) fmt = `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  clienteVinculado.value = c
  cliente.nome        = c.nome || ''
  cliente.telefone    = fmt || c.telefone || ''
  cliente.cpf         = c.cpf || ''
  cliente.email       = c.email || ''
  cliente.observacoes = c.informacao_adicional || c.observacoes || ''
  telOriginal.value   = cliente.telefone
  sugestaoTel.value   = null
  sugestoesNome.value = []
  avisoSubstituirTel.value = false
}

function desvincular() {
  clienteVinculado.value = null
  sugestaoTel.value = null
  sugestoesNome.value = []
  avisoSubstituirTel.value = false
  telOriginal.value = ''
  cliente.telefone = ''
  cliente.nome = ''
  cliente.cpf = ''
  cliente.email = ''
  cliente.observacoes = ''
  Object.assign(erros, { nome: '', telefone: '', cpf: '', email: '' })
  Object.assign(tocados, {})
  nextTick(() => document.getElementById('os-telefone')?.focus())
}

async function substituirTelefone() {
  loadingSubstituir.value = true
  try {
    const atualizado = await atualizarCliente(clienteVinculado.value.id, {
      ...clienteVinculado.value,
      telefone: cliente.telefone.trim() || null,
    })
    clienteVinculado.value = atualizado
    telOriginal.value = cliente.telefone
    avisoSubstituirTel.value = false
  } catch {
    reverterTelefone()
  } finally {
    loadingSubstituir.value = false
  }
}

function reverterTelefone() {
  cliente.telefone = telOriginal.value
  avisoSubstituirTel.value = false
}

function iniciais(nome) {
  return (nome || '').split(' ').slice(0, 2).map(p => p[0] || '').join('').toUpperCase() || '?'
}

function mascaraCpf(e) {
  let v = e.target.value.replace(/\D/g, '').slice(0, 11)
  v = v
    .replace(/^(d{3})(d)/, '$1.$2')
    .replace(/^(d{3}.d{3})(d)/, '$1.$2')
    .replace(/^(d{3}.d{3}.d{3})(d)/, '$1-$2')
  cliente.cpf = v
}

function inputClass(campo) {
  const base = 'w-full rounded-xl border bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-2'
  return tocados[campo] && erros[campo]
    ? `${base} border-red-300 focus:border-red-400 focus:ring-red-100`
    : `${base} border-slate-200 focus:border-black focus:ring-black/10`
}

function touch(campo) { tocados[campo] = true; validarCampo(campo) }

function validarCampo(campo) {
  erros[campo] = ''
  if (campo === 'nome' && !cliente.nome.trim())
    erros.nome = 'Informe o nome do cliente.'
  const d = cliente[campo]?.replace?.(/\D/g, '') ?? ''
  if (campo === 'telefone' && cliente.telefone && d.length < 10)
    erros.telefone = 'Telefone incompleto.'
  if (campo === 'cpf' && cliente.cpf && d.length !== 11)
    erros.cpf = 'CPF deve ter 11 dígitos.'
  if (campo === 'email' && cliente.email && !/^[^s@]+@[^s@]+.[^s@]+$/.test(cliente.email))
    erros.email = 'E-mail inválido.'
}

function validarCliente() {
  ;['nome', 'telefone', 'cpf', 'email'].forEach(c => { tocados[c] = true; validarCampo(c) })
  return !Object.values(erros).some(Boolean)
}

function irParaOs() {
  if (!validarCliente()) return
  etapa.value = 'os'
}

// ── Dados da O.S. ────────────────────────────────────────────
const os = reactive({
  tipoObjeto: '',
  servico: '',
  quantidade: 1,
  dataEntrega: '',
  valor: '',
  observacoes: '',
})
const errosOs = reactive({ tipoObjeto: '', servico: '', dataEntrega: '' })
const tocadosOs = reactive({})
const dateInputRef = ref(null)
const tiposObjeto = ref([])
const servicos = ref([])

const nomeServico = computed(
  () => servicos.value.find(s => String(s.id) === os.servico)?.nome || '—'
)

function selectClass(campo) {
  const base = 'w-full appearance-none rounded-xl border bg-slate-50 px-4 py-3 pr-8 text-sm text-slate-900 outline-none transition focus:bg-white focus:ring-2'
  return tocadosOs[campo] && errosOs[campo]
    ? `${base} border-red-300 focus:border-red-400 focus:ring-red-100`
    : `${base} border-slate-200 focus:border-black focus:ring-black/10`
}

function inputClassOs(campo) {
  const base = 'w-full rounded-xl border bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:bg-white focus:ring-2'
  return tocadosOs[campo] && errosOs[campo]
    ? `${base} border-red-300 focus:border-red-400 focus:ring-red-100`
    : `${base} border-slate-200 focus:border-black focus:ring-black/10`
}

function touchOs(campo) { tocadosOs[campo] = true; validarCampoOs(campo) }

function validarCampoOs(campo) {
  errosOs[campo] = ''
  if (campo === 'tipoObjeto' && !os.tipoObjeto) errosOs.tipoObjeto = 'Selecione o tipo de objeto.'
  if (campo === 'servico' && !os.servico) errosOs.servico = 'Selecione um serviço.'
  if (campo === 'dataEntrega' && !os.dataEntrega) errosOs.dataEntrega = 'Informe a data de entrega.'
}

function validarOs() {
  ;['tipoObjeto', 'servico', 'dataEntrega'].forEach(c => { tocadosOs[c] = true; validarCampoOs(c) })
  return !Object.values(errosOs).some(Boolean)
}

function openDatePicker() {
  const el = dateInputRef.value
  if (el && typeof el.showPicker === 'function') el.showPicker()
}

function onCurrencyInput(e) {
  const digits = e.target.value.replace(/\D/g, '')
  if (!digits) { os.valor = ''; return }
  os.valor = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    Number(digits) / 100,
  )
}

function irParaFotos() {
  if (!validarOs()) return
  etapa.value = 'fotos'
}

// ── Fotos ─────────────────────────────────────────────────────
const fotoPreviews = ref([])
const fotosFiles = ref([])

function adicionarFotos(e) {
  const files = Array.from(e.target.files ?? [])
  files.forEach(f => {
    fotosFiles.value.push(f)
    fotoPreviews.value.push({ name: f.name, url: URL.createObjectURL(f) })
  })
  e.target.value = '' // permite re-selecionar o mesmo arquivo
}

function removerFoto(i) {
  URL.revokeObjectURL(fotoPreviews.value[i].url)
  fotoPreviews.value.splice(i, 1)
  fotosFiles.value.splice(i, 1)
}

// ── Salvar O.S. ───────────────────────────────────────────────
const salvando = ref(false)
const erroSalvar = ref('')
const osCriada = ref(null)

async function salvarOs() {
  salvando.value = true
  erroSalvar.value = ''
  try {
    // 1) Resolver cliente_id
    let clienteId = clienteVinculado.value?.id ?? null
    if (!clienteId) {
      const novoCliente = await criarCliente({
        nome: cliente.nome.trim(),
        telefone: cliente.telefone.replace(/\D/g, '') || null,
        cpf: cliente.cpf ? cliente.cpf.replace(/\D/g, '') : null,
        email: cliente.email.trim() || null,
        informacao_adicional: cliente.observacoes.trim() || null,
      })
      clienteId = novoCliente.id
    }

    // 2) Valor numérico
    const valorNum = os.valor
      ? Number(os.valor.replace(/[^d,]/g, '').replace(',', '.'))
      : undefined

    // 3) Criar O.S.
    const result = await criarOrdem({
      cliente_id: clienteId,
      data_entrega: os.dataEntrega,
      observacoes: os.observacoes.trim() || undefined,
      itens: [{
        tipo_objeto_id: Number(os.tipoObjeto),
        servico_id: Number(os.servico),
        quantidade: os.quantidade,
        valor_unitario: valorNum,
      }],
    })

    osCriada.value = result
    etapa.value = 'impressao'
  } catch (err) {
    const m = err?.response?.data?.message ?? err?.response?.data?.erro
    const s = err?.response?.status
    if (s === 409)      erroSalvar.value = m || 'Telefone ou CPF já cadastrado.'
    else if (s === 422) erroSalvar.value = m || 'Verifique os dados e tente novamente.'
    else                erroSalvar.value = m || 'Erro ao salvar. Tente novamente.'
  } finally {
    salvando.value = false
  }
}

// ── Impressão ─────────────────────────────────────────────────
const viasExtra = ref(1)

function formatarData(d) {
  if (!d) return '—'
  const [y, m, dd] = d.split('-')
  return `${dd}/${m}/${y}`
}

function imprimirVias(n) {
  const osNum  = osCriada.value?.numero ?? osCriada.value?.id ?? '—'
  const hoje   = new Date().toLocaleDateString('pt-BR')
  const servNm = nomeServico.value
  const vias   = Number(n) || 1

  let html = `<!DOCTYPE html><html lang="pt-BR"><head>
<meta charset="UTF-8"><title>O.S. #${osNum}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,sans-serif;font-size:12px;color:#000;background:#fff}
  .via{width:80mm;padding:12px;border:1px solid #000;margin:8px auto}
  @media print{.via{page-break-after:always;margin:0}.via:last-child{page-break-after:avoid}}
  .logo{font-size:22px;font-weight:900;letter-spacing:-1px;margin-bottom:6px}
  .title{font-size:11px;font-weight:bold;text-transform:uppercase;border-top:1px solid #000;border-bottom:1px solid #000;padding:4px 0;margin:8px 0;text-align:center}
  .row{display:flex;justify-content:space-between;margin-bottom:3px;gap:8px}
  .lbl{color:#555;flex-shrink:0}
  .val{font-weight:600;text-align:right;word-break:break-word}
  .sep{border-top:1px dashed #bbb;margin:8px 0}
  .assinatura{margin-top:24px;border-top:1px solid #000;padding-top:4px;text-align:center;font-size:10px;color:#555}
  .via-lbl{text-align:right;font-size:10px;color:#aaa;margin-top:6px}
</style></head><body>`

  for (let i = 1; i <= vias; i++) {
    html += `<div class="via">
<div class="logo">Az</div>
<div class="title">Ordem de Serviço #${osNum}</div>
<div class="row"><span class="lbl">Emissão:</span><span class="val">${hoje}</span></div>
<div class="row"><span class="lbl">Entrega:</span><span class="val">${formatarData(os.dataEntrega)}</span></div>
<div class="sep"></div>
<div class="row"><span class="lbl">Cliente:</span><span class="val">${cliente.nome}</span></div>
<div class="row"><span class="lbl">Telefone:</span><span class="val">${cliente.telefone || '—'}</span></div>
<div class="sep"></div>
<div class="row"><span class="lbl">Serviço:</span><span class="val">${servNm}</span></div>
<div class="row"><span class="lbl">Qtd.:</span><span class="val">${os.quantidade}</span></div>
<div class="row"><span class="lbl">Valor:</span><span class="val">${os.valor || 'A definir'}</span></div>
${os.observacoes ? `<div class="row" style="margin-top:6px"><span class="lbl">Obs:</span><span class="val" style="font-weight:400">${os.observacoes}</span></div>` : ''}
<div class="assinatura">Assinatura do cliente</div>
${vias > 1 ? `<div class="via-lbl">Via ${i}/${vias}</div>` : ''}
</div>`
  }

  html += '</body></html>'

  const w = window.open('', '_blank', 'width=720,height=900')
  if (!w) { alert('Permita popups nesta página para imprimir.'); return }
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => { w.print() }, 350)
}

// ── Reiniciar ─────────────────────────────────────────────────
function reiniciar() {
  etapa.value = 'cliente'
  clienteVinculado.value = null
  sugestaoTel.value = null
  sugestoesNome.value = []
  avisoSubstituirTel.value = false
  telOriginal.value = ''
  Object.assign(cliente, { nome: '', telefone: '', cpf: '', email: '', observacoes: '' })
  Object.assign(os, { tipoObjeto: '', servico: '', quantidade: 1, dataEntrega: '', valor: '', observacoes: '' })
  Object.assign(erros, { nome: '', telefone: '', cpf: '', email: '' })
  Object.assign(errosOs, { tipoObjeto: '', servico: '', dataEntrega: '' })
  fotoPreviews.value.forEach(f => URL.revokeObjectURL(f.url))
  fotoPreviews.value = []
  fotosFiles.value = []
  osCriada.value = null
  erroSalvar.value = ''
}
</script>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.slide-enter-from {
  opacity: 0;
  transform: translateX(16px);
}
.slide-leave-to {
  opacity: 0;
  transform: translateX(-16px);
}
.slide-down-enter-active,
.slide-down-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
