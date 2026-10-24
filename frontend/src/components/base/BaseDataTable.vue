<template>
  <div
    class="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.04)]"
  >
    <!-- Barra superior: abas/atalhos (slot), busca, filtros por coluna -->
    <div
      v-if="searchable || filterable || $slots.toolbar"
      class="flex flex-wrap items-center gap-2 border-b border-black/5 px-3 py-2"
    >
      <slot name="toolbar" />

      <div class="ml-auto flex flex-wrap items-center gap-2">
        <div v-if="searchable" class="relative">
          <span class="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-black/40">
            <span class="mdi mdi-magnify text-[15px]"></span>
          </span>
          <input
            v-model="busca"
            type="search"
            :placeholder="searchPlaceholder"
            class="h-8 w-44 rounded-lg border border-black/10 bg-white pl-8 pr-2 text-xs outline-none transition focus:border-black/30 focus:ring-2 focus:ring-black/10 sm:w-56"
          />
        </div>

        <button
          v-if="filterable && temColunasFiltraveis"
          type="button"
          :title="mostrarFiltros ? 'Ocultar filtros das colunas' : 'Filtrar por coluna'"
          :class="[
            'inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-xs font-medium transition',
            mostrarFiltros || filtrosAtivos
              ? 'border-black bg-black text-white'
              : 'border-black/10 bg-white text-black hover:bg-black/5',
          ]"
          @click="mostrarFiltros = !mostrarFiltros"
        >
          <span class="mdi mdi-filter-variant text-[15px]"></span>
          <span class="hidden sm:inline">Filtros</span>
          <span v-if="filtrosAtivos" class="rounded-full bg-white/25 px-1.5 text-[10px]">{{ filtrosAtivos }}</span>
        </button>

        <button
          v-if="busca || filtrosAtivos"
          type="button"
          title="Limpar busca e filtros"
          class="inline-flex h-8 items-center gap-1 rounded-lg border border-black/10 bg-white px-2.5 text-xs font-medium text-black transition hover:bg-black/5"
          @click="limparFiltros"
        >
          <span class="mdi mdi-close text-[14px]"></span>
          <span class="hidden sm:inline">Limpar</span>
        </button>
      </div>
    </div>

    <div class="overflow-x-auto">
      <table class="min-w-full border-separate border-spacing-0">
        <thead>
          <tr class="bg-black/[0.03]">
            <th
              v-for="column in columns"
              :key="column.key"
              class="border-b border-black/10 text-left text-xs font-semibold uppercase tracking-wide text-black/70"
              :class="[
                cellPadding,
                hideClass(column),
                column.headerClass,
                column.nowrap !== false ? 'whitespace-nowrap' : '',
              ]"
              :aria-sort="ariaSort(column)"
            >
              <button
                v-if="isSortable(column)"
                type="button"
                class="inline-flex items-center gap-1 uppercase tracking-wide transition hover:text-black"
                @click="alternarOrdem(column)"
              >
                {{ column.label }}
                <span :class="['mdi text-[13px]', iconeOrdem(column)]"></span>
              </button>
              <template v-else>{{ column.label }}</template>
            </th>

            <th
              v-if="$slots.actions"
              class="whitespace-nowrap border-b border-black/10 text-right text-xs font-semibold uppercase tracking-wide text-black/70"
              :class="[cellPadding, actionsHeaderClass]"
            >
              {{ actionsLabel }}
            </th>
          </tr>

          <!-- Filtro por coluna -->
          <tr v-if="filterable && mostrarFiltros && temColunasFiltraveis" class="bg-white">
            <th
              v-for="column in columns"
              :key="`f-${column.key}`"
              class="border-b border-black/10 px-2 py-1.5 font-normal"
              :class="hideClass(column)"
            >
              <template v-if="isFilterable(column)">
                <!-- Intervalo (modo servidor): grava filtros["<coluna>:de"] e filtros["<coluna>:ate"] -->
                <div v-if="isRange(column)" class="flex min-w-[6.5rem] flex-col gap-1">
                  <input
                    v-model="filtros[`${column.key}:de`]"
                    :type="column.filterType === 'date-range' ? 'date' : 'number'"
                    :min="column.filterType === 'number-range' ? 0 : undefined"
                    :step="column.filterType === 'number-range' ? '0.01' : undefined"
                    :placeholder="column.filterType === 'number-range' ? 'De (R$)' : undefined"
                    :aria-label="`Filtrar ${column.label} a partir de`"
                    class="h-7 w-full rounded-md border border-black/10 bg-white px-1.5 text-xs outline-none placeholder:text-black/30 focus:border-black/30"
                  />
                  <input
                    v-model="filtros[`${column.key}:ate`]"
                    :type="column.filterType === 'date-range' ? 'date' : 'number'"
                    :min="column.filterType === 'number-range' ? 0 : undefined"
                    :step="column.filterType === 'number-range' ? '0.01' : undefined"
                    :placeholder="column.filterType === 'number-range' ? 'Até (R$)' : undefined"
                    :aria-label="`Filtrar ${column.label} até`"
                    class="h-7 w-full rounded-md border border-black/10 bg-white px-1.5 text-xs outline-none placeholder:text-black/30 focus:border-black/30"
                  />
                </div>
                <select
                  v-else-if="column.filterOptions"
                  v-model="filtros[column.key]"
                  :aria-label="`Filtrar ${column.label}`"
                  class="h-7 w-full min-w-[5rem] rounded-md border border-black/10 bg-white px-1.5 text-xs outline-none focus:border-black/30"
                >
                  <option value="">Todos</option>
                  <option v-for="op in column.filterOptions" :key="op.value" :value="op.value">
                    {{ op.label }}
                  </option>
                </select>
                <input
                  v-else
                  v-model="filtros[column.key]"
                  type="text"
                  :placeholder="column.label"
                  :aria-label="`Filtrar ${column.label}`"
                  class="h-7 w-full min-w-[4.5rem] rounded-md border border-black/10 bg-white px-2 text-xs outline-none placeholder:text-black/30 focus:border-black/30"
                />
              </template>
            </th>
            <th v-if="$slots.actions" class="border-b border-black/10"></th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="row in paginatedRows"
            :key="getRowKey(row)"
            class="transition hover:bg-black/[0.02]"
            :class="clickable ? 'cursor-pointer' : ''"
            @click="clickable && emit('row-click', row)"
          >
            <td
              v-for="column in columns"
              :key="column.key"
              class="border-b border-black/5 text-[13px]"
              :class="[cellPadding, hideClass(column), column.cellClass || 'text-black/75']"
            >
              <slot
                v-if="column.slot"
                :name="column.slot"
                :row="row"
                :value="row[column.key]"
                :column="column"
              />

              <template v-else>
                {{ formatCellValue(row, column) }}
              </template>
            </td>

            <td
              v-if="$slots.actions"
              class="border-b border-black/5 text-right"
              :class="[cellPadding, actionsCellClass]"
              @click.stop
            >
              <slot name="actions" :row="row" />
            </td>
          </tr>

          <tr v-if="!paginatedRows.length">
            <td
              :colspan="columns.length + ($slots.actions ? 1 : 0)"
              class="px-6 py-8 text-center text-sm text-black/50"
            >
              <span v-if="loading" class="mdi mdi-loading animate-spin text-[18px] align-middle"></span>
              {{ loading ? 'Carregando...' : emptyText }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      class="flex flex-col gap-2 border-t border-black/5 px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
    >
      <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-black/60">
        <span class="flex items-center gap-1.5">
          {{ perPageLabel }}
          <select
            :value="itemsPerPage"
            class="h-8 rounded-lg border border-black/10 bg-white px-2 text-xs text-black outline-none transition focus:border-black/20"
            @change="onChangeItemsPerPage"
          >
            <option v-for="option in perPageOptions" :key="option" :value="option">
              {{ option }}
            </option>
          </select>
        </span>
        <span>{{ resumo }}</span>
      </div>

      <div class="flex items-center gap-1">
        <button
          type="button"
          class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 bg-white text-black transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="currentPage === 1"
          aria-label="Página anterior"
          @click="goToPreviousPage"
        >
          <span class="mdi mdi-chevron-left text-[18px]"></span>
        </button>

        <button
          v-for="page in visiblePages"
          :key="page"
          type="button"
          class="inline-flex h-8 min-w-[32px] items-center justify-center rounded-lg border px-2 text-xs font-medium transition"
          :class="
            page === currentPage
              ? 'border-black bg-black text-white'
              : 'border-black/10 bg-white text-black hover:bg-black hover:text-white'
          "
          @click="goToPage(page)"
        >
          {{ page }}
        </button>

        <button
          type="button"
          class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 bg-white text-black transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="currentPage === totalPages"
          aria-label="Próxima página"
          @click="goToNextPage"
        >
          <span class="mdi mdi-chevron-right text-[18px]"></span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";

/*
 * Modo cliente (padrão): recebe todas as linhas e filtra/ordena/pagina no navegador.
 * Modo servidor (`server-side`): `rows` é apenas a página atual e `total` o total geral; a tabela não filtra
 * nem ordena sozinha, apenas emite `query` ({ q, filtros, ordenarPor, direcao, page, limit }) quando a busca,
 * os filtros, a ordenação ou a página mudam (busca/filtros com atraso de 300 ms) e também ao montar.
 * Mudar `reset-key` volta para a página 1 e emite `query` (ex.: ao trocar de aba).
 *
 * Colunas (todas opcionais, exceto key e label):
 *  - slot / format / hideBelow / headerClass / cellClass / nowrap
 *  - sortable: false          -> desliga a ordenação da coluna
 *  - filter: false            -> desliga o filtro da coluna
 *  - filterType: 'date-range' | 'number-range' -> (modo servidor) dois campos; emite filtros["<key>:de"] e ["<key>:ate"]
 *  - filterOptions: [{value,label}] -> filtro em lista (select)
 *  - filterValue(row)         -> texto usado na busca/filtro (padrão: valor da célula)
 *  - sortValue(row)           -> valor usado na ordenação (padrão: valor da célula)
 */
const props = defineProps({
  columns: { type: Array, required: true },
  rows: { type: Array, default: () => [] },
  rowKey: { type: [String, Function], default: "id" },
  perPageOptions: { type: Array, default: () => [10, 20, 30, 40, 50, 100] },
  initialItemsPerPage: { type: Number, default: 10 },
  maxVisiblePages: { type: Number, default: 5 },
  emptyText: { type: String, default: "Nenhum registro encontrado." },
  perPageLabel: { type: String, default: "Mostrar" },
  actionsLabel: { type: String, default: "Ações" },
  actionsHeaderClass: { type: String, default: "" },
  actionsCellClass: { type: String, default: "" },
  loading: { type: Boolean, default: false },
  compact: { type: Boolean, default: false },
  clickable: { type: Boolean, default: false },
  searchable: { type: Boolean, default: true },
  filterable: { type: Boolean, default: true },
  searchPlaceholder: { type: String, default: "Buscar..." },
  defaultSort: { type: Object, default: null }, // { key, dir: 'asc' | 'desc' }
  serverSide: { type: Boolean, default: false },
  total: { type: Number, default: 0 },
  resetKey: { type: [Number, String], default: 0 },
});

const emit = defineEmits(["row-click", "query"]);

const cellPadding = computed(() => (props.compact ? "px-2.5 py-1.5" : "px-2.5 py-2 sm:px-3"));

const HIDE_BELOW = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
};

function hideClass(column) {
  return HIDE_BELOW[column.hideBelow] ?? "";
}

// ── busca, filtros e ordenação ───────────────────────────────────────────
const busca = ref("");
const filtros = reactive({});
const mostrarFiltros = ref(typeof window !== "undefined" && window.innerWidth >= 768);
const ordem = reactive({
  key: props.defaultSort?.key ?? "",
  dir: props.defaultSort?.dir ?? "asc",
});

const normalizar = (v) =>
  String(v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const isSortable = (column) => column.sortable !== false;
const isFilterable = (column) => column.filter !== false;
const isRange = (column) => props.serverSide && (column.filterType === "date-range" || column.filterType === "number-range");
const temColunasFiltraveis = computed(() => props.columns.some(isFilterable));
const filtrosAtivos = computed(() => Object.values(filtros).filter((v) => String(v ?? "").trim()).length);

function textoDaCelula(row, column) {
  if (typeof column.filterValue === "function") return column.filterValue(row);
  const v = row?.[column.key];
  return typeof column.format === "function" ? column.format(v, row) : v;
}

function valorOrdenacao(row, column) {
  return typeof column.sortValue === "function" ? column.sortValue(row) : row?.[column.key];
}

function limparFiltros() {
  busca.value = "";
  Object.keys(filtros).forEach((k) => delete filtros[k]);
}

const linhasFiltradas = computed(() => {
  if (props.serverSide) return props.rows;
  const termo = normalizar(busca.value);
  const digitos = termo.replace(/\D/g, "");
  const ativos = props.columns
    .filter((c) => isFilterable(c) && String(filtros[c.key] ?? "").trim())
    .map((c) => ({ column: c, valor: normalizar(filtros[c.key]), exato: !!c.filterOptions }));

  return props.rows.filter((row) => {
    for (const { column, valor, exato } of ativos) {
      const texto = normalizar(textoDaCelula(row, column));
      if (exato ? texto !== valor : !texto.includes(valor)) return false;
    }

    if (!termo) return true;
    return props.columns.some((c) => {
      if (!isFilterable(c)) return false;
      const texto = normalizar(textoDaCelula(row, c));
      if (texto.includes(termo)) return true;
      return digitos.length >= 3 && texto.replace(/\D/g, "").includes(digitos);
    });
  });
});

const collator = new Intl.Collator("pt-BR", { numeric: true, sensitivity: "base" });

const linhasOrdenadas = computed(() => {
  if (props.serverSide) return props.rows;
  const column = props.columns.find((c) => c.key === ordem.key);
  if (!column) return linhasFiltradas.value;

  const sentido = ordem.dir === "desc" ? -1 : 1;
  return [...linhasFiltradas.value].sort((a, b) => {
    const va = valorOrdenacao(a, column);
    const vb = valorOrdenacao(b, column);
    const vazioA = va === null || va === undefined || va === "";
    const vazioB = vb === null || vb === undefined || vb === "";
    if (vazioA || vazioB) return vazioA === vazioB ? 0 : vazioA ? 1 : -1; // vazios sempre no fim

    if (typeof va === "number" && typeof vb === "number") return (va - vb) * sentido;
    return collator.compare(String(va), String(vb)) * sentido;
  });
});

function alternarOrdem(column) {
  if (ordem.key !== column.key) {
    ordem.key = column.key;
    ordem.dir = "asc";
  } else if (ordem.dir === "asc") {
    ordem.dir = "desc";
  } else {
    ordem.key = "";
    ordem.dir = "asc";
  }
}

function iconeOrdem(column) {
  if (ordem.key !== column.key) return "mdi-unfold-more-horizontal text-black/25";
  return ordem.dir === "asc" ? "mdi-arrow-up" : "mdi-arrow-down";
}

function ariaSort(column) {
  if (ordem.key !== column.key) return undefined;
  return ordem.dir === "asc" ? "ascending" : "descending";
}

// ── paginação ────────────────────────────────────────────────────────────
const itemsPerPage = ref(props.initialItemsPerPage);
const currentPage = ref(1);

const totalLinhas = computed(() => (props.serverSide ? props.total : linhasOrdenadas.value.length));

const totalPages = computed(() => Math.max(1, Math.ceil(totalLinhas.value / itemsPerPage.value)));

const paginatedRows = computed(() => {
  if (props.serverSide) return props.rows;
  const start = (currentPage.value - 1) * itemsPerPage.value;
  return linhasOrdenadas.value.slice(start, start + itemsPerPage.value);
});

const resumo = computed(() => {
  const total = totalLinhas.value;
  if (!total) return "0 registros";
  const ini = (currentPage.value - 1) * itemsPerPage.value + 1;
  const fim = Math.min(total, ini + itemsPerPage.value - 1);
  const filtrado = !props.serverSide && total !== props.rows.length ? ` (de ${props.rows.length})` : "";
  return `${ini}–${fim} de ${total}${filtrado}`;
});

const visiblePages = computed(() => {
  const pages = [];
  const maxVisible = props.maxVisiblePages;

  let start = Math.max(1, currentPage.value - 2);
  let end = Math.min(totalPages.value, start + maxVisible - 1);

  if (end - start < maxVisible - 1) {
    start = Math.max(1, end - maxVisible + 1);
  }

  for (let i = start; i <= end; i += 1) pages.push(i);
  return pages;
});

watch([itemsPerPage, busca, () => JSON.stringify(filtros), () => ordem.key, () => ordem.dir], () => {
  currentPage.value = 1;
});

watch(totalPages, (newTotal) => {
  if (currentPage.value > newTotal) currentPage.value = newTotal;
});

// ── modo servidor ─────────────────────────────────────────────────────────────────
const ATRASO_DIGITACAO = 300;
let temporizador = null;
let atrasoPendente = 0;

// Agrupa mudanças próximas em uma só consulta; quando há mais de um motivo, vale o maior atraso
function agendarConsulta(atraso) {
  if (!props.serverSide) return;
  atrasoPendente = temporizador ? Math.max(atraso, atrasoPendente) : atraso;
  clearTimeout(temporizador);
  temporizador = setTimeout(() => {
    temporizador = null;
    atrasoPendente = 0;
    const filtrosPreenchidos = {};
    for (const [chave, valor] of Object.entries(filtros)) {
      if (String(valor ?? "").trim()) filtrosPreenchidos[chave] = String(valor).trim();
    }
    emit("query", {
      q: busca.value.trim(),
      filtros: filtrosPreenchidos,
      ordenarPor: ordem.key,
      direcao: ordem.dir,
      page: currentPage.value,
      limit: itemsPerPage.value,
    });
  }, atrasoPendente);
}

watch([busca, () => JSON.stringify(filtros)], () => agendarConsulta(ATRASO_DIGITACAO));
watch([itemsPerPage, currentPage, () => ordem.key, () => ordem.dir], () => agendarConsulta(0));
watch(
  () => props.resetKey,
  () => {
    currentPage.value = 1;
    agendarConsulta(0);
  }
);

onMounted(() => agendarConsulta(0));
onBeforeUnmount(() => clearTimeout(temporizador));

function getRowKey(row) {
  return typeof props.rowKey === "function" ? props.rowKey(row) : row?.[props.rowKey];
}

function formatCellValue(row, column) {
  const value = row?.[column.key];

  if (typeof column.format === "function") return column.format(value, row);
  if (value === null || value === undefined || value === "") return "—";
  return value;
}

function goToPage(page) {
  currentPage.value = page;
}
function goToPreviousPage() {
  if (currentPage.value > 1) currentPage.value -= 1;
}
function goToNextPage() {
  if (currentPage.value < totalPages.value) currentPage.value += 1;
}
function onChangeItemsPerPage(event) {
  itemsPerPage.value = Number(event.target.value);
}
</script>
