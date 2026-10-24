<template>
  <div class="space-y-3">
    <BaseAlert :message="erro" />

    <!-- Filtros -->
    <section class="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="text-base font-semibold text-black">Dashboard</h2>
        <div class="flex items-center gap-2">
          <span v-if="carregando" class="flex items-center gap-1.5 text-xs text-black/50">
            <span class="mdi mdi-loading animate-spin text-[14px]"></span>
            Atualizando...
          </span>
          <span v-else-if="intervalo?.inicio && intervalo?.fim" class="text-xs text-black/50">
            O.S. criadas de {{ formatarDataBr(intervalo.inicio) }} a {{ formatarDataBr(intervalo.fim) }}
          </span>
          <button
            type="button"
            data-testid="alternar-indicadores"
            :aria-expanded="aberto"
            :aria-label="aberto ? 'Ocultar indicadores' : 'Mostrar indicadores'"
            :title="aberto ? 'Ocultar indicadores' : 'Mostrar indicadores'"
            class="flex h-8 w-8 items-center justify-center rounded-xl text-black/60 transition hover:bg-black/5 hover:text-black"
            @click="aberto = !aberto"
          >
            <span :class="['mdi text-[22px]', aberto ? 'mdi-chevron-up' : 'mdi-chevron-down']"></span>
          </button>
        </div>
      </div>

      <BaseSegmentedIcons v-model="periodo" :options="PERIODOS" class="mt-3" />

      <div class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <template v-if="periodo === 'custom'">
          <BaseFormField label="De">
            <BaseDatePicker v-model="inicioPersonalizado" compact />
          </BaseFormField>
          <BaseFormField label="Até">
            <BaseDatePicker v-model="fimPersonalizado" :min="inicioPersonalizado" compact />
          </BaseFormField>
        </template>

        <BaseFormField label="Funcionário (quem abriu a O.S.)">
          <select v-model="usuarioId" :class="campoClass">
            <option value="">Todos</option>
            <option v-for="u in usuarios" :key="u.id" :value="u.id">{{ u.nome }}</option>
          </select>
        </BaseFormField>
        <BaseFormField label="Tipo de serviço">
          <select v-model="servicoId" :class="campoClass">
            <option value="">Todos</option>
            <option v-for="s in servicos" :key="s.id" :value="s.id">{{ s.nome }}</option>
          </select>
        </BaseFormField>
      </div>
    </section>

    <p v-if="!dados" class="py-10 text-center text-sm text-black/50">
      {{ carregando ? 'Carregando indicadores...' : 'Indicadores indisponíveis.' }}
    </p>

    <div v-else :class="['space-y-3 transition-opacity', carregando && 'opacity-60']">
      <!-- Indicadores (recolhidos por padrão) -->
      <div v-if="aberto" class="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <DashKpi titulo="Total de O.S." icon="mdi-clipboard-text-outline" :valor="numero(resumo.total)" legenda="Criadas no período" />
        <DashKpi
          titulo="Concluídas"
          icon="mdi-check-circle-outline"
          :valor="numero(resumo.concluidas)"
          :legenda="resumo.percentualConcluidas === null ? 'Sem O.S. no período' : `${percentual(resumo.percentualConcluidas)} do total`"
        />
        <DashKpi titulo="Pendentes" icon="mdi-progress-clock" :valor="numero(resumo.pendentes)" legenda="Entrada, orçamento e em andamento" />
        <DashKpi titulo="Faturamento" icon="mdi-cash-multiple" :valor="formatarMoeda(resumo.faturamento)" legenda="Serviços concluídos ou entregues" />
        <DashKpi
          titulo="Ticket médio"
          icon="mdi-receipt-text-outline"
          :valor="resumo.ticketMedio === null ? '—' : formatarMoeda(resumo.ticketMedio)"
          :legenda="resumo.ordensFaturadas ? `Média de ${numero(resumo.ordensFaturadas)} O.S. com serviço concluído` : 'Sem serviços concluídos'"
        />
      </div>

      <!-- Evolução -->
      <DashSecao
        titulo="O.S. por período"
        :descricao="`Ordens de serviço criadas, agrupadas por ${agrupadoPor}.`"
        :vazio="resumo.total === 0"
      >
        <SerieBarras :serie="dados.serie" :agrupamento="dados.agrupamento" />
      </DashSecao>

      <div class="grid gap-3 lg:grid-cols-2">
        <DashSecao titulo="Distribuição por status" descricao="Situação atual das O.S. criadas no período." :vazio="resumo.total === 0">
          <BarrasHorizontais :itens="itensStatus" />
        </DashSecao>

        <DashSecao
          titulo="Serviços mais realizados"
          descricao="Unidades de serviço concluídas ou entregues."
          :vazio="!dados.servicosMaisRealizados.length"
          texto-vazio="Nenhum serviço concluído no período."
        >
          <BarrasHorizontais :itens="itensRealizados" />
        </DashSecao>

        <DashSecao
          titulo="Produtividade dos funcionários"
          descricao="O.S. com serviços concluídos por quem registrou a conclusão."
          :vazio="!dados.produtividade.length"
          texto-vazio="Nenhum serviço concluído no período."
        >
          <BarrasHorizontais :itens="itensProdutividade" />
        </DashSecao>

        <DashSecao
          titulo="Serviços mais rentáveis"
          descricao="Valor (R$) dos serviços concluídos ou entregues."
          :vazio="!dados.servicosMaisRentaveis.length"
          texto-vazio="Nenhum serviço concluído no período."
        >
          <BarrasHorizontais :itens="itensRentaveis" />
        </DashSecao>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import BaseAlert from '@/components/base/BaseAlert.vue'
import BaseDatePicker from '@/components/base/BaseDatePicker.vue'
import BaseFormField from '@/components/base/BaseFormField.vue'
import BaseSegmentedIcons from '@/components/base/BaseSegmentedIcons.vue'
import BarrasHorizontais from '@/components/dashboard/BarrasHorizontais.vue'
import DashKpi from '@/components/dashboard/DashKpi.vue'
import DashSecao from '@/components/dashboard/DashSecao.vue'
import SerieBarras from '@/components/dashboard/SerieBarras.vue'
import { useDashboard } from '@/composables/useDashboard'
import { formatarMoeda } from '@/composables/useItens'
import { listarServicos } from '@/services/servicos'
import { listarUsuarios } from '@/services/usuarios'
import { ESTADOS_OS } from '@/utils/ordem'
import { PERIODOS, formatarDataBr } from '@/utils/periodos'

const {
  periodo, inicioPersonalizado, fimPersonalizado, usuarioId, servicoId, dados, carregando, erro, intervalo,
} = useDashboard()

const campoClass = 'w-full rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-sm outline-none transition focus:border-black/30 focus:ring-2 focus:ring-black/10'

// Classes completas (não montadas por concatenação) para o Tailwind gerá-las
const COR_STATUS = {
  ENTRADA: 'bg-sky-500',
  ORCAMENTO: 'bg-amber-500',
  EM_ANDAMENTO: 'bg-indigo-500',
  CONCLUIDO: 'bg-emerald-500',
  ENTREGUE: 'bg-slate-500',
  CANCELADO: 'bg-red-500',
}
const AGRUPAMENTO = { day: 'dia', week: 'semana', month: 'mês' }

const usuarios = ref([])
const servicos = ref([])
// Cartões de indicadores fechados por padrão: os valores não ficam à mostra até o usuário abrir
const aberto = ref(false)

const resumo = computed(() => dados.value.resumo)
const agrupadoPor = computed(() => AGRUPAMENTO[dados.value.agrupamento] ?? 'dia')

const numero = (n) => Number(n).toLocaleString('pt-BR')
const percentual = (n) => `${Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`

const itensStatus = computed(() => {
  const { total } = resumo.value
  return dados.value.status.map((s) => ({
    chave: s.estado,
    rotulo: ESTADOS_OS[s.estado]?.label ?? s.estado,
    valor: s.total,
    texto: `${numero(s.total)} (${percentual(total ? (s.total / total) * 100 : 0)})`,
    cor: COR_STATUS[s.estado],
  }))
})

const itensRealizados = computed(() =>
  dados.value.servicosMaisRealizados.map((s) => ({
    chave: s.id,
    rotulo: s.nome,
    valor: s.quantidade,
    texto: `${numero(s.quantidade)} un.`,
    detalhe: `${numero(s.ordens)} O.S.`,
  }))
)

const itensRentaveis = computed(() =>
  dados.value.servicosMaisRentaveis.map((s) => ({
    chave: s.id,
    rotulo: s.nome,
    valor: s.valor,
    texto: formatarMoeda(s.valor),
    detalhe: `${numero(s.quantidade)} un. em ${numero(s.ordens)} O.S.`,
  }))
)

const itensProdutividade = computed(() =>
  dados.value.produtividade.map((p) => ({
    chave: p.id ?? 'sem-registro',
    rotulo: p.nome ?? 'Sem registro do executor',
    valor: p.ordens,
    texto: `${numero(p.ordens)} O.S.`,
    detalhe: `${numero(p.servicos)} un. de serviço`,
    dica: p.nome ? undefined : 'Serviços concluídos sem registro de quem os concluiu (dados anteriores ao histórico)',
    cor: p.nome ? undefined : 'bg-black/30',
  }))
)

onMounted(async () => {
  try {
    const [listaUsuarios, listaServicos] = await Promise.all([listarUsuarios(), listarServicos()])
    usuarios.value = listaUsuarios
    servicos.value = listaServicos
  } catch {
    // Os filtros por funcionário e serviço ficam apenas com "Todos"; os indicadores continuam funcionando
  }
})
</script>
