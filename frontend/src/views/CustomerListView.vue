<template>
  <AppLayout>
    <BasePageTitle
      class="mb-8"
      title="Clientes"
      description="Visualize e gerencie os clientes cadastrados."
    />

    <BaseDataTable
      :columns="columns"
      :rows="clientes"
      :loading="carregando"
      empty-text="Nenhum cliente encontrado."
      actions-label="Ações"
    >
      <template #observacoes="{ value }">
        <span class="line-clamp-2">{{ value || '—' }}</span>
      </template>
      <template #actions="{ row }">
        <button
          type="button"
          class="inline-flex h-10 items-center justify-center rounded-xl border border-black/10 bg-white px-4 text-sm font-medium text-black transition hover:bg-black hover:text-white"
          @click="editarCliente(row)"
        >
          Editar
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
import { listarClientes } from '@/services/clientes'

const columns = [
  { key: 'nome',                label: 'Nome completo',  cellClass: 'text-black' },
  { key: 'cpf',                 label: 'CPF',            cellClass: 'text-black/75' },
  { key: 'telefone',            label: 'Telefone',       cellClass: 'text-black/75' },
  { key: 'email',               label: 'E-mail',         cellClass: 'text-black/75' },
  {
    key: 'informacao_adicional', label: 'Observações',
    slot: 'observacoes', headerClass: 'min-w-[220px]',
    cellClass: 'text-black/65', nowrap: false,
  },
]

const clientes   = ref([])
const carregando = ref(false)

onMounted(async () => {
  carregando.value = true
  try {
    const res = await listarClientes({ limit: 100 })
    clientes.value = res.data ?? res
  } finally {
    carregando.value = false
  }
})

function editarCliente(cliente) {
  // TODO: abrir modal de edição
  console.warn('Editar cliente:', cliente.id)
}
</script>


<script setup>
import { ref } from "vue";
import AppLayout from "@/layouts/AppLayout.vue";
import BasePageTitle from "@/components/base/BasePageTitle.vue";
import BaseDataTable from "@/components/base/BaseDataTable.vue";

const columns = [
  {
    key: "nomeCompleto",
    label: "Nome completo",
    cellClass: "text-black",
  },
  {
    key: "cpf",
    label: "CPF",
    cellClass: "text-black/75",
  },
  {
    key: "telefone",
    label: "Telefone",
    cellClass: "text-black/75",
  },
  {
    key: "email",
    label: "E-mail",
    cellClass: "text-black/75",
  },
  {
    key: "observacoes",
    label: "Observações",
    slot: "observacoes",
    headerClass: "min-w-[220px]",
    cellClass: "text-black/65",
    nowrap: false,
  },
];

const clientes = ref([
  {
    id: 1,
    nomeCompleto: "Gabriel Albuquerque Silva",
    cpf: "123.456.789-00",
    telefone: "(11) 98765-4321",
    email: "gabriel@email.com",
    observacoes: "Cliente recorrente e prefere atendimento via WhatsApp.",
  },
  {
    id: 2,
    nomeCompleto: "Mariana Costa Ferreira",
    cpf: "987.654.321-00",
    telefone: "(11) 97654-3210",
    email: "mariana@email.com",
    observacoes: "Solicita envio de orçamento por e-mail.",
  },
  {
    id: 3,
    nomeCompleto: "Carlos Eduardo Lima",
    cpf: "456.789.123-00",
    telefone: "(11) 96543-2109",
    email: "carlos@email.com",
    observacoes: "Cliente sem observações adicionais.",
  },
  {
    id: 4,
    nomeCompleto: "Fernanda Oliveira Souza",
    cpf: "741.852.963-00",
    telefone: "(11) 95432-1098",
    email: "fernanda@email.com",
    observacoes: "Atendimento preferencial no período da tarde.",
  },
  {
    id: 5,
    nomeCompleto: "Lucas Martins Rocha",
    cpf: "159.357.258-00",
    telefone: "(11) 94321-0987",
    email: "lucas@email.com",
    observacoes: "Já realizou mais de um serviço anteriormente.",
  },
  {
    id: 6,
    nomeCompleto: "Amanda Ribeiro Alves",
    cpf: "321.654.987-00",
    telefone: "(11) 93210-9876",
    email: "amanda@email.com",
    observacoes: "Prefere contato por ligação.",
  },
  {
    id: 7,
    nomeCompleto: "Thiago Henrique Melo",
    cpf: "753.951.456-00",
    telefone: "(11) 92109-8765",
    email: "thiago@email.com",
    observacoes: "Aguardando retorno sobre orçamento anterior.",
  },
  {
    id: 8,
    nomeCompleto: "Juliana Mendes Prado",
    cpf: "258.369.147-00",
    telefone: "(11) 91098-7654",
    email: "juliana@email.com",
    observacoes: "Cliente novo.",
  },
  {
    id: 9,
    nomeCompleto: "Ricardo Gomes Pereira",
    cpf: "654.987.321-00",
    telefone: "(11) 99987-6543",
    email: "ricardo@email.com",
    observacoes: "Necessita atendimento com urgência.",
  },
  {
    id: 10,
    nomeCompleto: "Patrícia Nunes Carvalho",
    cpf: "852.741.963-00",
    telefone: "(11) 98876-5432",
    email: "patricia@email.com",
    observacoes: "Sem observações.",
  },
  {
    id: 11,
    nomeCompleto: "Roberto Almeida Santos",
    cpf: "147.258.369-00",
    telefone: "(11) 97765-4321",
    email: "roberto@email.com",
    observacoes: "Cliente empresarial.",
  },
  {
    id: 12,
    nomeCompleto: "Camila Freitas Lopes",
    cpf: "369.258.147-00",
    telefone: "(11) 96654-3210",
    email: "camila@email.com",
    observacoes: "Prefere confirmação por e-mail.",
  },
]);

function editarCliente(cliente) {
  console.log("Editar cliente:", cliente);
}
</script>