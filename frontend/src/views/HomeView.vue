<template>
  <AppLayout>
    <BaseHeroSection
      :title="`Olá, ${nomeUsuario}, bem-vindo novamente.`"
      description="O sistema foi reformulado pensando em uma melhor usabilidade para você, com uma navegação mais simples, intuitiva e organizada. O que deseja fazer hoje?"
    />

    <section class="mt-8 sm:mt-10">
      <p class="text-xl font-medium text-slate-500">Navegação rápida</p>
    </section>

    <section class="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <BaseActionCard
        v-for="card in actionCards"
        :key="card.to"
        v-bind="card"
      />
    </section>
  </AppLayout>
</template>

<script setup>
import { computed } from 'vue'
import AppLayout from '@/layouts/AppLayout.vue'
import BaseHeroSection from '@/components/base/BaseHeroSection.vue'
import BaseActionCard from '@/components/base/BaseActionCard.vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const nomeUsuario = computed(() => authStore.usuario?.nome || 'usuário')

const actionCards = [
  {
    to: '/nova-os',
    icon: 'mdi-file-document-plus-outline',
    title: 'Nova O.S.',
    description: 'Crie uma nova ordem de serviço com mais praticidade no fluxo.',
    contentClass: 'bg-[#111111]',
  },
  {
    to: '/listar-clientes',
    icon: 'mdi-account-group-outline',
    title: 'Listar clientes',
    description: 'Visualize e consulte os clientes já cadastrados no sistema.',
    contentClass: 'bg-black',
  },
  {
    to: '/listar-os',
    icon: 'mdi-format-list-bulleted-square',
    title: 'Listar O.S.',
    description: 'Consulte e acompanhe as ordens de serviço cadastradas.',
    contentClass: 'bg-[#111111]',
  },
]
</script>
