<template>
  <AppLayout>
    <div class="mb-5 sm:mb-8">
      <BasePageTitle
        title="Administração"
        description="Dados da empresa e usuários com acesso ao sistema."
      />
    </div>

    <!-- Abas -->
    <div class="mb-5 flex gap-1 border-b border-black/10 sm:mb-6">
      <button
        v-for="aba in abas"
        :key="aba.id"
        type="button"
        :class="[
          '-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition',
          abaAtiva === aba.id
            ? 'border-black text-black'
            : 'border-transparent text-black/50 hover:text-black/80',
        ]"
        @click="abaAtiva = aba.id"
      >
        <span :class="['mdi text-[18px]', aba.icone]"></span>
        {{ aba.nome }}
      </button>
    </div>

    <UsuariosPanel v-if="abaAtiva === 'usuarios'" />

    <div v-else class="max-w-2xl space-y-4 sm:space-y-6">
      <BaseAlert :message="erro" />

      <!-- Logo -->
      <section class="rounded-3xl border border-black/10 bg-white p-4 shadow-sm sm:p-6">
        <h2 class="text-base font-semibold text-black">Logo da empresa</h2>
        <p class="mt-1 text-sm text-black/55">
          Aparece no cabeçalho e na via impressa. Use JPG, PNG ou WEBP de até 10 MB.
        </p>

        <div class="mt-5 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div
            class="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-black/15 bg-[#f5f5f7]"
          >
            <img v-if="config.logoSrc" :src="config.logoSrc" alt="Logo" class="h-full w-full object-contain" />
            <span v-else class="mdi mdi-image-outline text-4xl text-black/25"></span>
          </div>

          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              :disabled="enviando"
              class="flex items-center gap-2 rounded-2xl bg-black px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-black/80 disabled:opacity-50"
              @click="inputLogo.click()"
            >
              <span class="mdi mdi-upload text-[18px]"></span>
              {{ config.logoUrl ? 'Trocar logo' : 'Enviar logo' }}
            </button>
            <button
              v-if="config.logoUrl"
              type="button"
              :disabled="enviando"
              class="flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-black/70 transition hover:bg-black/5 disabled:opacity-50"
              @click="remover"
            >
              <span class="mdi mdi-trash-can-outline text-[18px]"></span>
              Remover
            </button>
            <input ref="inputLogo" type="file" accept="image/jpeg,image/png,image/webp" class="hidden" @change="aoEscolherLogo" />
          </div>
        </div>
      </section>

      <!-- Nome -->
      <section class="rounded-3xl border border-black/10 bg-white p-4 shadow-sm sm:p-6">
        <h2 class="text-base font-semibold text-black">Nome da empresa</h2>
        <form class="mt-4 space-y-4" @submit.prevent="salvarNome">
          <BaseFormField label="Nome" optional>
            <input
              v-model="nome"
              type="text"
              maxlength="80"
              placeholder="Ex: Ateliê Azevedo"
              class="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-black/30 focus:ring-2 focus:ring-black/10"
            />
          </BaseFormField>
          <button
            type="submit"
            :disabled="salvando"
            class="flex items-center gap-2 rounded-2xl bg-black px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-black/80 disabled:opacity-50"
          >
            <span class="mdi mdi-content-save-outline text-[18px]"></span>
            Salvar
          </button>
        </form>
      </section>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import AppLayout from '@/layouts/AppLayout.vue'
import BasePageTitle from '@/components/base/BasePageTitle.vue'
import BaseFormField from '@/components/base/BaseFormField.vue'
import BaseAlert from '@/components/base/BaseAlert.vue'
import UsuariosPanel from '@/components/admin/UsuariosPanel.vue'
import { useConfigStore } from '@/stores/config'
import { useToastStore } from '@/stores/toast'

const config = useConfigStore()
const toast = useToastStore()

const abas = [
  { id: 'empresa', nome: 'Empresa', icone: 'mdi-domain' },
  { id: 'usuarios', nome: 'Usuários', icone: 'mdi-account-group-outline' },
]
const abaAtiva = ref('empresa')

const inputLogo = ref(null)
const nome = ref('')
const enviando = ref(false)
const salvando = ref(false)
const erro = ref('')

function limparMensagens() {
  erro.value = ''
}

async function executar(acao, mensagemSucesso) {
  limparMensagens()
  try {
    await acao()
    toast.sucesso(mensagemSucesso + '.')
  } catch (err) {
    erro.value = err.response?.data?.message || 'Não foi possível concluir a operação'
  }
}

async function aoEscolherLogo(event) {
  const arquivo = event.target.files?.[0]
  event.target.value = ''
  if (!arquivo) return

  enviando.value = true
  await executar(() => config.enviarLogo(arquivo), 'Logo atualizada')
  enviando.value = false
}

async function remover() {
  enviando.value = true
  await executar(() => config.removerLogo(), 'Logo removida')
  enviando.value = false
}

async function salvarNome() {
  salvando.value = true
  await executar(() => config.salvarNome(nome.value), 'Nome da empresa salvo')
  salvando.value = false
}

onMounted(async () => {
  await config.carregar()
  nome.value = config.empresaNome
})
</script>
