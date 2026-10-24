<template>
  <AppLayout>
    <!-- Celular: saudação curta e atalhos ocupando a tela toda -->
    <div class="flex h-[calc(100dvh-4.75rem)] flex-col lg:hidden">
      <h1 class="mb-3 text-lg font-semibold text-slate-900">Olá, {{ nomeUsuario }}.</h1>

      <section class="grid flex-1 auto-rows-fr grid-cols-2 gap-3">
        <RouterLink
          v-for="atalho in atalhosVisiveis"
          :key="atalho.to"
          :to="atalho.to"
          class="flex flex-col items-center justify-center gap-3 rounded-3xl bg-black px-3 text-white shadow-sm transition active:bg-black/80 [&:last-child:nth-child(odd)]:col-span-2"
        >
          <span :class="['mdi text-[44px] text-white/80', atalho.icon]"></span>
          <span class="text-center text-base font-semibold leading-tight">{{ atalho.title }}</span>
        </RouterLink>
      </section>
    </div>

    <!-- Computador: destaque com descrição e cartões grandes -->
    <div class="hidden space-y-6 lg:block">
      <BaseHeroSection
        eyebrow="Painel"
        :title="`Olá, ${nomeUsuario}.`"
        description="Crie ordens de serviço, acompanhe o andamento, consulte clientes e mantenha o catálogo de serviços e objetos organizado em um só lugar."
      />

      <section class="grid grid-cols-3 gap-4 xl:gap-5">
        <BaseActionCard
          v-for="atalho in atalhosVisiveis"
          :key="atalho.to"
          :to="atalho.to"
          :icon="atalho.icon"
          :title="atalho.title"
          :description="atalho.description"
        />
      </section>
    </div>
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

const atalhos = [
  {
    to: '/nova-os', icon: 'mdi-file-document-plus-outline', title: 'Nova O.S.',
    description: 'Cadastre uma nova ordem de serviço com objetos, serviços e fotos.',
  },
  {
    to: '/listar-os', icon: 'mdi-format-list-bulleted-square', title: 'Listar O.S.',
    description: 'Acompanhe o andamento, altere status e imprima as ordens.',
  },
  {
    to: '/listar-clientes', icon: 'mdi-account-group-outline', title: 'Clientes',
    description: 'Consulte e edite os clientes e o histórico de cada um.',
  },
  {
    to: '/cadastrar-objetos', icon: 'mdi-shape-outline', title: 'Tipos de objeto', admin: true,
    description: 'Gerencie os tipos de objeto atendidos pela oficina.',
  },
  {
    to: '/cadastrar-servicos', icon: 'mdi-tools', title: 'Serviços', admin: true,
    description: 'Mantenha o catálogo de serviços e seus preços por tipo de objeto.',
  },
  {
    to: '/administracao', icon: 'mdi-cog-outline', title: 'Administração', admin: true,
    description: 'Usuários, dados da empresa e demais configurações do sistema.',
  },
]

const atalhosVisiveis = computed(() => atalhos.filter((a) => !a.admin || authStore.isAdmin))
</script>
