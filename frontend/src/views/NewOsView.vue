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
            <div class="mb-5 grid gap-5 lg:grid-cols-[2fr_3fr]">
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
            <div class="mb-5 grid gap-5 sm:grid-cols-2">
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
        <h1 class="mb-3 shrink-0 text-lg font-semibold text-slate-900">Dados da ordem de serviço</h1>

        <ClienteVinculadoBanner class="shrink-0" :nome="cliente.nome" :telefone="cliente.telefone" @alterar="etapa = 'cliente'" />

        <form
          class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-black/8 bg-white shadow-[0_4px_24px_rgba(15,23,42,0.06)]"
          novalidate @submit.prevent="irParaFotos"
        >
          <div class="flex flex-1 flex-col overflow-y-auto p-4 sm:p-5">

            <!-- Tipo da OS: Entrada / Orçamento -->
            <div class="mb-5">
              <p class="mb-1.5 text-sm font-medium text-slate-700">Tipo da O.S.</p>
              <div class="flex w-full rounded-xl border border-slate-200 bg-slate-50 p-1 gap-1 sm:inline-flex sm:w-auto">
                <button
                  v-for="opt in ESTADOS_INICIAIS" :key="opt.value"
                  type="button"
                  :class="[
                    'flex flex-1 items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition sm:flex-none sm:justify-start',
                    os.estado === opt.value
                      ? 'bg-black text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800',
                  ]"
                  @click="os.estado = opt.value"
                >
                  <span :class="['mdi text-[16px]', opt.icon]"></span>
                  {{ opt.label }}
                </button>
              </div>
              <p class="mt-1.5 text-xs text-slate-400">{{ os.estado === 'ORCAMENTO' ? 'A O.S. ficará aguardando aprovação do cliente antes de iniciar.' : 'O serviço está autorizado e pode ser iniciado.' }}</p>
            </div>

            <!-- Editor de objetos + serviços -->
            <OsItensEditor
              :objetos="objetos"
              :erros="errosItens"
              :tipos-objeto="tiposObjeto"
              :servicos="servicos"
              :total-geral="totalGeral"
              :total-objeto="totalObjeto"
              :nome-tipo-objeto="nomeTipoObjeto"
              :mudar-quantidade="mudarQuantidade"
              :carregando="carregando"
              @adicionar-objeto="adicionarObjeto"
              @remover-objeto="removerObjeto"
              @adicionar-servico="adicionarServico"
              @remover-servico="removerServico"
              @selecionar-servico="aoSelecionarServico"
              @editar-valor="aoEditarValor"
              @blur-valor="aoBlurValor"
            />

            <!-- Separador -->
            <hr class="my-4 border-slate-100" />

            <!-- Data + Hora -->
            <div class="mb-4 grid gap-4 sm:grid-cols-2">
              <BaseFormField id="os-data" label="Data de entrega" required :error="errosOs.dataEntrega">
                <input id="os-data" ref="dateInputRef" v-model="os.dataEntrega" type="date"
                  :class="inputClassOs('dataEntrega')"
                  @blur="touchOs('dataEntrega')" @click="openDatePicker" />
              </BaseFormField>

              <BaseFormField id="os-hora" label="Hora de entrega" optional>
                <input id="os-hora" v-model="os.horaEntrega" type="time"
                  :class="inputClassOs('horaEntrega')" />
              </BaseFormField>
            </div>

            <!-- Observações gerais -->
            <BaseFormField id="os-obs2" label="Observações gerais" optional class="flex flex-1 min-h-0 flex-col">
              <textarea id="os-obs2" v-model="os.observacoes" placeholder="Observações da O.S. (prazo especial, instrução ao técnico...)"
                class="flex-1 min-h-[60px] w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-black focus:bg-white focus:ring-2 focus:ring-black/10"
              ></textarea>
            </BaseFormField>

          </div><!-- /scroll area -->

          <div class="shrink-0 border-t border-slate-100 px-4 py-3 sm:px-5">
            <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <button type="button"
                class="flex items-center justify-center gap-2 rounded-xl border border-black/10 px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                @click="etapa = 'cliente'">
                <span class="mdi mdi-arrow-left text-[16px]"></span> Voltar
              </button>
              <button type="submit"
                class="flex items-center justify-center gap-2 rounded-xl bg-black px-7 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-px hover:bg-black/85">
                <span class="mdi mdi-camera-outline text-[18px]"></span> Adicionar fotos
              </button>
            </div>
          </div>
        </form>
      </div>

      <!-- ── ETAPA 3: Fotos ────────────────────────────────────── -->
      <div v-else-if="etapa === 'fotos'" key="fotos" class="flex flex-1 min-h-0 flex-col">
        <h1 class="mb-3 shrink-0 text-lg font-semibold text-slate-900">Fotos das peças <span class="text-sm font-normal text-slate-400">— registre o estado dos itens</span></h1>

        <div class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-black/8 bg-white shadow-[0_4px_24px_rgba(15,23,42,0.06)]">
          <div class="flex-1 overflow-y-auto p-4 sm:p-5">
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

            <div v-if="fotoPreviews.length" class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              <div v-for="(f, i) in fotoPreviews" :key="f.url"
                class="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                <img :src="f.url" :alt="f.name" class="h-32 w-full object-cover" />
                <button type="button"
                  class="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white transition hover:bg-black"
                  @click="removerFoto(i)">
                  <span class="mdi mdi-close text-[12px]"></span>
                </button>
                <p class="truncate px-2 py-1.5 text-[11px] text-slate-500">{{ f.name }}</p>
              </div>
            </div>
            <p v-else class="mt-6 text-center text-sm text-slate-400">Nenhuma foto adicionada ainda. (Opcional)</p>

            <BaseAlert :message="erroSalvar" class="mt-4" />
          </div>

          <div class="shrink-0 border-t border-slate-100 px-4 py-3 sm:px-5">
            <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <button type="button"
                class="flex items-center justify-center gap-2 rounded-xl border border-black/10 px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                @click="etapa = 'os'">
                <span class="mdi mdi-arrow-left text-[16px]"></span> Voltar
              </button>
              <button type="button" :disabled="salvando"
                class="flex items-center justify-center gap-2 rounded-xl bg-black px-7 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-px hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-60"
                @click="salvarOs">
                <span :class="salvando ? 'mdi mdi-loading animate-spin' : 'mdi mdi-content-save-outline'" class="text-[18px]"></span>
                {{ salvando ? 'Salvando...' : 'Salvar O.S.' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ── ETAPA 4: Impressão ────────────────────────────────── -->
      <div v-else-if="etapa === 'impressao'" key="impressao" class="flex flex-1 min-h-0 flex-col">

        <!-- Cabeçalho de sucesso compacto -->
        <div class="shrink-0 py-3">
          <div class="flex items-center gap-3">
            <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100">
              <span class="mdi mdi-check-bold text-[20px] text-emerald-600"></span>
            </div>
            <div>
              <h2 class="text-base font-semibold text-slate-900">O.S. criada com sucesso!</h2>
              <p class="text-xs text-slate-500">{{ cliente.nome }}</p>
            </div>
            <!-- Número da OS em destaque -->
            <div class="ml-auto shrink-0 flex flex-col items-end">
              <span class="text-[11px] font-medium uppercase tracking-wider text-slate-400">Número</span>
              <span class="text-2xl font-black tracking-tight text-slate-900">#{{ osCriada?.numero ?? osCriada?.id }}</span>
            </div>
          </div>
        </div>

        <div class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-black/8 bg-white shadow-[0_4px_24px_rgba(15,23,42,0.06)]">
          <div class="flex flex-1 flex-col overflow-y-auto p-4 sm:p-5">

            <!-- Resumo da OS -->
            <p class="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Resumo</p>
            <dl class="mb-5 grid gap-x-6 gap-y-3 rounded-xl border border-slate-100 bg-slate-50 p-3 sm:grid-cols-2 lg:grid-cols-3">
              <div v-for="item in resumo" :key="item.label">
                <dt class="text-[11px] text-slate-400">{{ item.label }}</dt>
                <dd class="text-sm font-medium text-slate-900">{{ item.valor }}</dd>
              </div>
            </dl>

            <!-- Seção de impressão -->
            <p class="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Impressão das vias</p>

            <!-- Via do Cliente -->
            <div class="mb-3 flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-4">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                <span class="mdi mdi-account-outline text-[22px] text-slate-600"></span>
              </div>
              <div class="min-w-0 flex-1">
                <p class="font-semibold text-slate-900">Via do cliente</p>
                <p class="mt-0.5 text-xs text-slate-500">Nome, telefone, número da O.S. e data de entrega. Sem detalhes internos.</p>
              </div>
              <button type="button"
                class="shrink-0 flex items-center gap-1.5 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                @click="imprimirVia('cliente')">
                <span class="mdi mdi-printer-outline text-[16px]"></span>
                Imprimir
              </button>
            </div>

            <!-- Via da Loja -->
            <div class="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-4">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-black">
                <span class="mdi mdi-store-outline text-[22px] text-white"></span>
              </div>
              <div class="min-w-0 flex-1">
                <p class="font-semibold text-slate-900">Via da loja</p>
                <p class="mt-0.5 text-xs text-slate-500">Completo: serviço, valor, tipo de objeto, quantidade, observações e fotos.</p>
              </div>
              <button type="button"
                class="shrink-0 flex items-center gap-1.5 rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-black/85"
                @click="imprimirVia('loja')">
                <span class="mdi mdi-printer-outline text-[16px]"></span>
                Imprimir
              </button>
            </div>

            <!-- Botão imprimir ambas juntas -->
            <button type="button"
              class="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-3 text-sm font-medium text-slate-500 transition hover:border-black hover:text-slate-900"
              @click="imprimirVia('ambas')">
              <span class="mdi mdi-printer-pos-outline text-[18px]"></span>
              Imprimir as duas vias juntas
            </button>

          </div>

          <div class="shrink-0 border-t border-slate-100 px-4 py-3 sm:px-5">
            <div class="flex flex-col gap-2 sm:flex-row">
              <button type="button"
                class="flex flex-1 items-center justify-center gap-2 rounded-xl border border-black/10 px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                @click="reiniciar">
                <span class="mdi mdi-plus text-[16px]"></span> Nova O.S.
              </button>
              <RouterLink to="/"
                class="flex flex-1 items-center justify-center gap-2 rounded-xl border border-black/10 px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
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
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'
import BaseFormField from '@/components/base/BaseFormField.vue'
import BaseAlert from '@/components/base/BaseAlert.vue'
import WizardSteps from '@/components/base/WizardSteps.vue'
import ClienteVinculadoBanner from '@/components/base/ClienteVinculadoBanner.vue'
import OsItensEditor from '@/components/os/OsItensEditor.vue'
import { useClienteForm } from '@/composables/useClienteForm'
import { useOsForm } from '@/composables/useOsForm'
import { useItens, formatarMoeda } from '@/composables/useItens'
import { useFotos } from '@/composables/useFotos'
import { useImpressao } from '@/composables/useImpressao'
import { buscarCliente, criarCliente } from '@/services/clientes'
import { criarOrdem } from '@/services/ordensServico'

const route = useRoute()

const ESTADOS_INICIAIS = [
  { value: 'ENTRADA',   label: 'Entrada',   icon: 'mdi-wrench-outline' },
  { value: 'ORCAMENTO', label: 'Orçamento', icon: 'mdi-file-document-outline' },
]

const STEPS = [
  { key: 'cliente',   label: 'Cliente'   },
  { key: 'os',        label: 'O.S.'      },
  { key: 'fotos',     label: 'Fotos'     },
  { key: 'impressao', label: 'Impressão' },
]
const etapa     = ref('cliente')
const etapaAtual = computed(() => STEPS.findIndex(s => s.key === etapa.value))
function podeNavegar(i) { return i < etapaAtual.value }

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
  inputClass: inputClassOs, touch: touchOs, validar: validarOs,
  openDatePicker, reset: resetOs,
} = useOsForm()

const {
  objetos, erros: errosItens, totalGeral, totalObjeto,
  nomeTipoObjeto,
  adicionarObjeto, removerObjeto,
  adicionarServico, removerServico, mudarQuantidade,
  aoSelecionarServico, aoEditarValor, aoBlurValor,
  validar: validarItens, toItens, reset: resetItens,
} = useItens(tiposObjeto, servicos)

const { previews: fotoPreviews, files: fotosFiles, adicionar: adicionarFotos, remover: removerFoto, reset: resetFotos } = useFotos()
const { formatarData, imprimir } = useImpressao()

// ── estado local ─────────────────────────────────────────────
const salvando   = ref(false)
const erroSalvar = ref('')
const osCriada   = ref(null)

const resumo = computed(() => [
  { label: 'Tipo',          valor: os.estado === 'ORCAMENTO' ? 'Orçamento' : 'Entrada' },
  { label: 'Cliente',       valor: cliente.nome },
  { label: 'Telefone',      valor: cliente.telefone || '—' },
  { label: 'Objetos',       valor: objetos.value.length + (objetos.value.length !== 1 ? ' objetos' : ' objeto') },
  { label: 'Total',         valor: totalGeral.value > 0 ? formatarMoeda(totalGeral.value) : '—' },
  { label: 'Data de entrega',valor: os.dataEntrega ? formatarData(os.dataEntrega) : '—' },
  { label: 'Hora de entrega',valor: os.horaEntrega || '—' },
  { label: 'Fotos',         valor: fotoPreviews.value.length + (fotoPreviews.value.length !== 1 ? ' fotos' : ' foto') },
])

// ── ciclo de vida ────────────────────────────────────────────
onMounted(async () => {
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
function irParaFotos() {
  const okOs    = validarOs()
  const okItens = validarItens()
  if (okOs && okItens) etapa.value = 'fotos'
}

// ── salvar ───────────────────────────────────────────────────
async function salvarOs() {
  salvando.value  = true
  erroSalvar.value = ''
  try {
    let clienteId = clienteVinculado.value?.id ?? null
    if (!clienteId) {
      const novo = await criarCliente({
        nome:                  cliente.nome.trim(),
        telefone:              cliente.telefone.replace(/\D/g, '') || null,
        cpf:                   cliente.cpf ? cliente.cpf.replace(/\D/g, '') : null,
        email:                 cliente.email.trim() || null,
        informacao_adicional:  cliente.observacoes.trim() || null,
      })
      clienteId = novo.id
    }


    osCriada.value = await criarOrdem({
      cliente_id:   clienteId,
      estado:       os.estado,
      data_entrega: os.dataEntrega,
      hora_entrega: os.horaEntrega || undefined,
      observacoes:  os.observacoes.trim() || undefined,
      itens:        toItens(os.estado === 'ORCAMENTO'),
    })
    etapa.value = 'impressao'
  } catch (err) {
    const msg = err?.response?.data?.message ?? err?.response?.data?.erro
    const s   = err?.response?.status
    erroSalvar.value = s === 409 ? msg || 'Telefone ou CPF já cadastrado.'
      : s === 422             ? msg || 'Verifique os dados e tente novamente.'
      :                         msg || 'Erro ao salvar. Tente novamente.'
  } finally {
    salvando.value = false
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
    qtdFotos: fotoPreviews.value.length,
  })
}

// ── reiniciar ────────────────────────────────────────────────
function reiniciar() {
  etapa.value = 'cliente'
  resetCliente()
  resetOs()
  resetItens()
  resetFotos()
  osCriada.value   = null
  erroSalvar.value = ''
}
</script>

<style scoped>
.slide-enter-active, .slide-leave-active { transition: opacity 0.18s ease, transform 0.18s ease; }
.slide-enter-from { opacity: 0; transform: translateX(16px); }
.slide-leave-to   { opacity: 0; transform: translateX(-16px); }
.slide-down-enter-active, .slide-down-leave-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.slide-down-enter-from, .slide-down-leave-to { opacity: 0; transform: translateY(-6px); }
</style>
