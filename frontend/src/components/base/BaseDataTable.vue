<template>
  <div
    class="overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.04)]"
  >
    <div class="overflow-x-auto">
      <table class="min-w-full border-separate border-spacing-0">
        <thead>
          <tr class="bg-black/[0.03]">
            <th
              v-for="column in columns"
              :key="column.key"
              class="border-b border-black/10 px-6 py-4 text-left text-sm font-semibold text-black"
              :class="[
                column.headerClass,
                column.nowrap !== false ? 'whitespace-nowrap' : '',
              ]"
            >
              {{ column.label }}
            </th>

            <th
              v-if="$slots.actions"
              class="whitespace-nowrap border-b border-black/10 px-6 py-4 text-right text-sm font-semibold text-black"
              :class="actionsHeaderClass"
            >
              {{ actionsLabel }}
            </th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="row in paginatedRows"
            :key="getRowKey(row)"
            class="transition hover:bg-black/[0.02]"
          >
            <td
              v-for="column in columns"
              :key="column.key"
              class="border-b border-black/5 px-6 py-4 text-sm"
              :class="[column.cellClass || 'text-black/75']"
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
              class="border-b border-black/5 px-6 py-4 text-right"
              :class="actionsCellClass"
            >
              <slot name="actions" :row="row" />
            </td>
          </tr>

          <tr v-if="!paginatedRows.length">
            <td
              :colspan="columns.length + ($slots.actions ? 1 : 0)"
              class="px-6 py-10 text-center text-sm text-black/50"
            >
              {{ emptyText }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      class="flex flex-col gap-4 border-t border-black/5 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="flex items-center gap-2 text-sm text-black/60">
        <span>{{ perPageLabel }}</span>

        <select
          :value="itemsPerPage"
          class="h-10 rounded-xl border border-black/10 bg-white px-3 text-sm text-black outline-none transition focus:border-black/20"
          @change="onChangeItemsPerPage"
        >
          <option
            v-for="option in perPageOptions"
            :key="option"
            :value="option"
          >
            {{ option }}
          </option>
        </select>
      </div>

      <div
        class="flex flex-col items-end gap-3 sm:flex-row sm:items-center sm:justify-end"
      >
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-black/10 bg-white text-[30px] text-black transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="currentPage === 1"
            @click="goToPreviousPage"
          >
            ‹
          </button>

          <button
            v-for="page in visiblePages"
            :key="page"
            type="button"
            class="inline-flex h-10 min-w-[40px] items-center justify-center rounded-xl border px-3 text-sm font-medium transition"
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
            class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-black/10 bg-white text-[30px] text-black transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="currentPage === totalPages"
            @click="goToNextPage"
          >
            ›
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from "vue";

const props = defineProps({
  columns: {
    type: Array,
    required: true,
  },
  rows: {
    type: Array,
    default: () => [],
  },
  rowKey: {
    type: [String, Function],
    default: "id",
  },
  perPageOptions: {
    type: Array,
    default: () => [10, 20, 30, 40, 50, 100],
  },
  initialItemsPerPage: {
    type: Number,
    default: 10,
  },
  maxVisiblePages: {
    type: Number,
    default: 5,
  },
  emptyText: {
    type: String,
    default: "Nenhum registro encontrado.",
  },
  perPageLabel: {
    type: String,
    default: "Mostrar",
  },
  actionsLabel: {
    type: String,
    default: "Ações",
  },
  actionsHeaderClass: {
    type: String,
    default: "",
  },
  actionsCellClass: {
    type: String,
    default: "",
  },
});

const itemsPerPage = ref(props.initialItemsPerPage);
const currentPage = ref(1);

const totalPages = computed(() => {
  return Math.max(1, Math.ceil(props.rows.length / itemsPerPage.value));
});

const paginatedRows = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return props.rows.slice(start, end);
});

const visiblePages = computed(() => {
  const pages = [];
  const maxVisible = props.maxVisiblePages;

  let start = Math.max(1, currentPage.value - 2);
  let end = Math.min(totalPages.value, start + maxVisible - 1);

  if (end - start < maxVisible - 1) {
    start = Math.max(1, end - maxVisible + 1);
  }

  for (let i = start; i <= end; i += 1) {
    pages.push(i);
  }

  return pages;
});

watch(itemsPerPage, () => {
  currentPage.value = 1;
});

watch(totalPages, (newTotal) => {
  if (currentPage.value > newTotal) {
    currentPage.value = newTotal;
  }
});

function getRowKey(row) {
  if (typeof props.rowKey === "function") {
    return props.rowKey(row);
  }

  return row?.[props.rowKey];
}

function formatCellValue(row, column) {
  const value = row?.[column.key];

  if (typeof column.format === "function") {
    return column.format(value, row);
  }

  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return value;
}

function goToPage(page) {
  currentPage.value = page;
}

function goToPreviousPage() {
  if (currentPage.value > 1) {
    currentPage.value -= 1;
  }
}

function goToNextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value += 1;
  }
}

function onChangeItemsPerPage(event) {
  itemsPerPage.value = Number(event.target.value);
}
</script>