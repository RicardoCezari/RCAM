<template>
  <AppLayout>
    <BasePageTitle
      class="mb-8"
      title="Ordens de Serviço"
      description="Visualize e gerencie as ordens de serviço cadastradas."
    />

    <BaseDataTable
      :columns="columns"
      :rows="ordens"
      :loading="carregando"
      row-key="id"
      empty-text="Nenhuma ordem de serviço encontrada."
      actions-label="Ações"
      actions-header-class="w-[120px]"
      actions-cell-class="w-[120px]"
    >
      <template #status="{ value }">
        <span
          class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
          :class="statusClass(value)"
        >
          {{ value || '—' }}
        </span>
      </template>
      <template #actions="{ row }">
        <button
          type="button"
          class="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-black/10 bg-white text-black transition hover:-translate-y-[1px] hover:bg-black hover:text-white"
          title="Editar O.S."
          aria-label="Editar O.S."
          @click="editarOrdem(row)"
        >
          <i class="mdi mdi-pencil-outline text-lg"></i>
        </button>
      </template>
    </BaseDataTable>
  </AppLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import AppLayout from '@/layouts/AppLayout.vue'
import BasePageTitle from '@/components/base/BasePageTitle.vue'
import BaseDataTable from '@/components/base/BaseDataTable.vue'
import { listarOrdens } from '@/services/ordensServico'

const STATUS_CLASSES = {
  'Concluído':   'bg-emerald-100 text-emerald-700',
  'Pendente':    'bg-amber-100 text-amber-700',
  'Atrasado':    'bg-red-100 text-red-700',
}

const columns = [
  { key: 'cliente',      label: 'Cliente',           headerClass: 'min-w-[220px]', cellClass: 'text-black/80' },
  { key: 'telefone',     label: 'Telefone',           headerClass: 'min-w-[180px]', cellClass: 'whitespace-nowrap text-black/75' },
  { key: 'objeto',       label: 'Objeto',             headerClass: 'min-w-[180px]', cellClass: 'text-black/75' },
  { key: 'status',       label: 'Status',             headerClass: 'min-w-[140px]', slot: 'status' },
  { key: 'data_entrega', label: 'Data de entrega',    headerClass: 'min-w-[150px]', cellClass: 'whitespace-nowrap text-black/75' },
  { key: 'valor',        label: 'Valor',              headerClass: 'min-w-[140px]', cellClass: 'whitespace-nowrap text-black/75' },
]

const ordens     = ref([])
const carregando = ref(false)

onMounted(async () => {
  carregando.value = true
  try {
    const res = await listarOrdens({ limit: 100 })
    ordens.value = res.data ?? res
  } finally {
    carregando.value = false
  }
})

function statusClass(status) {
  return STATUS_CLASSES[status] ?? 'bg-black/5 text-black/60'
}

function editarOrdem(ordem) {
  // TODO: abrir modal de edição
  console.warn('Editar O.S.:', ordem.id)
}
</script>
          <span
            class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
            :class="getStatusClass(value)"
          >
            {{ value || "—" }}
          </span>
        </template>

        <template #actions="{ row }">
          <button
            type="button"
            class="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-black/10 bg-white text-black transition hover:-translate-y-[1px] hover:bg-black hover:text-white"
            title="Editar O.S."
            aria-label="Editar O.S."
            @click="handleEdit(row)"
          >
            <i class="mdi mdi-pencil-outline text-lg"></i>
          </button>
        </template>
      </BaseDataTable>
    </div>
  </section>
  </AppLayout>
</template>

<script setup>
import { ref } from "vue";
import AppLayout from "@/layouts/AppLayout.vue";
import BasePageTitle from "@/components/base/BasePageTitle.vue";
import BaseDataTable from "@/components/base/BaseDataTable.vue";

const columns = [
  {
    key: "cliente",
    label: "Cliente",
    headerClass: "min-w-[220px]",
    cellClass: "text-black/80",
  },
  {
    key: "telefone",
    label: "Telefone do cliente",
    headerClass: "min-w-[180px]",
    cellClass: "whitespace-nowrap text-black/75",
  },
  {
    key: "objeto",
    label: "Objeto",
    headerClass: "min-w-[180px]",
    cellClass: "text-black/75",
  },
  {
    key: "status",
    label: "Status",
    headerClass: "min-w-[140px]",
    slot: "status",
  },
  {
    key: "dataEntrega",
    label: "Data de entrega",
    headerClass: "min-w-[150px]",
    cellClass: "whitespace-nowrap text-black/75",
  },
  {
    key: "valor",
    label: "Valor",
    headerClass: "min-w-[140px]",
    cellClass: "whitespace-nowrap text-black/75",
  },
];

const serviceOrders = ref([
  {
    id: 1,
    cliente: "Gabriel Albuquerque",
    telefone: "(11) 99876-4321",
    objeto: "Smartwatch Samsung Galaxy Watch",
    status: "Concluído",
    quantidade: 1,
    servico: "Manutenção",
    dataEntrega: "15/04/2026",
    valor: "R$ 450,00",
    informacaoAdicional: "Troca de teclado e limpeza interna completa.",
  },
  {
    id: 2,
    cliente: "Maria Oliveira",
    telefone: "(11) 98765-1234",
    objeto: "Relógio Casio Vintage",
    status: "Pendente",
    quantidade: 2,
    servico: "Reparo",
    dataEntrega: "18/04/2026",
    valor: "R$ 780,00",
    informacaoAdicional: "Verificar falha na alimentação de papel.",
  },
  {
    id: 3,
    cliente: "João Silva",
    telefone: "(11) 97654-9876",
    objeto: "Smartwatch Apple Watch",
    status: "Atrasado",
    quantidade: 1,
    servico: "Instalação",
    dataEntrega: "20/04/2026",
    valor: "R$ 1.250,00",
    informacaoAdicional: "Instalação no ambiente principal do escritório.",
  },
  {
    id: 4,
    cliente: "Ana Souza",
    telefone: "(11) 96543-1111",
    objeto: 'Relógio Casio G-Shock',
    status: "Pendente",
    quantidade: 4,
    servico: "Instalação",
    dataEntrega: "22/04/2026",
    valor: "R$ 2.300,00",
    informacaoAdicional: "Passagem de cabeamento e configuração inicial.",
  },
  {
    id: 5,
    cliente: "Carlos Mendes",
    telefone: "(11) 95432-2222",
    objeto: "Smartwatch Xiaomi Watch",
    status: "Concluído",
    quantidade: 1,
    servico: "Manutenção",
    dataEntrega: "25/04/2026",
    valor: "R$ 980,00",
    informacaoAdicional: "Atualização de componentes e revisão geral.",
  },
  {
    id: 6,
    cliente: "Fernanda Lima",
    telefone: "(11) 94321-3333",
    objeto: "Relógio Orient Masculino",
    status: "Atrasado",
    quantidade: 3,
    servico: "Reparo",
    dataEntrega: "28/04/2026",
    valor: "R$ 620,00",
    informacaoAdicional: "Dois com problema de imagem e um sem ligar.",
  },
  {
    id: 7,
    cliente: "Ricardo Alves",
    telefone: "(11) 93210-4444",
    objeto: "Smartwatch Amazfit Bip",
    status: "Pendente",
    quantidade: 1,
    servico: "Configuração",
    dataEntrega: "30/04/2026",
    valor: "R$ 350,00",
    informacaoAdicional: "Criar regras de firewall e ajuste de rede interna.",
  },
  {
    id: 8,
    cliente: "Juliana Rocha",
    telefone: "(11) 92109-5555",
    objeto: "Relógio Technos Prata",
    status: "Concluído",
    quantidade: 1,
    servico: "Reparo",
    dataEntrega: "02/05/2026",
    valor: "R$ 540,00",
    informacaoAdicional: "Tela apagando após alguns minutos de uso.",
  },
  {
    id: 9,
    cliente: "Paulo Henrique",
    telefone: "(11) 91098-6666",
    objeto: "Smartwatch Huawei Watch Fit",
    status: "Atrasado",
    quantidade: 1,
    servico: "Manutenção",
    dataEntrega: "04/05/2026",
    valor: "R$ 690,00",
    informacaoAdicional: "Revisão do motor e troca de sensor.",
  },
  {
    id: 10,
    cliente: "Beatriz Santos",
    telefone: "(11) 99999-7777",
    objeto: "Relógio Casio Dourado",
    status: "Pendente",
    quantidade: 1,
    servico: "Upgrade",
    dataEntrega: "06/05/2026",
    valor: "R$ 1.800,00",
    informacaoAdicional: "Instalação de SSD e aumento de memória RAM.",
  },
  {
    id: 11,
    cliente: "Lucas Ferreira",
    telefone: "(11) 98888-8888",
    objeto: "Smartwatch Garmin Forerunner",
    status: "Concluído",
    quantidade: 1,
    servico: "Instalação",
    dataEntrega: "08/05/2026",
    valor: "R$ 1.150,00",
    informacaoAdicional: "Instalação completa em muro lateral.",
  },
  {
    id: 12,
    cliente: "Patrícia Gomes",
    telefone: "(11) 97777-9999",
    objeto: "Relógio Mondaine Feminino",
    status: "Pendente",
    quantidade: 1,
    servico: "Reparo",
    dataEntrega: "10/05/2026",
    valor: "R$ 430,00",
    informacaoAdicional: "Equipamento não está centrifugando.",
  },
]);
function getStatusClass(status) {
  if (status === "Concluído") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "Pendente") {
    return "bg-amber-100 text-amber-700";
  }

  if (status === "Atrasado") {
    return "bg-red-100 text-red-700";
  }

  return "bg-black/5 text-black/60";
}

function handleEdit(row) {
  console.log("Editar O.S.:", row);
}
</script>