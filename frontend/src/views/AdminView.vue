<template>
  <AppLayout>
    <div class="mb-3">
      <BasePageTitle
        title="Administração"
        description="Indicadores, empresa, impressão da nota, aparência, usuários, aparelhos e backup."
      />
    </div>

    <!-- Abas -->
    <BaseSegmentedIcons v-model="abaAtiva" :options="abas" class="mb-4" />

    <DashboardPanel v-if="abaAtiva === 'dashboard'" />
    <UsuariosPanel v-else-if="abaAtiva === 'usuarios'" />
    <AparelhosPanel v-else-if="abaAtiva === 'aparelhos'" />
    <BackupPanel v-else-if="abaAtiva === 'backup'" />
    <AparenciaPanel v-else-if="abaAtiva === 'aparencia'" />
    <NotaLayoutPanel v-else-if="abaAtiva === 'nota'" />

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

      <!-- Dados da empresa e nota -->
      <form class="space-y-4 sm:space-y-6" @submit.prevent="salvarDados">
        <section class="rounded-3xl border border-black/10 bg-white p-4 shadow-sm sm:p-6">
          <h2 class="text-base font-semibold text-black">Dados da empresa</h2>
          <p class="mt-1 text-sm text-black/55">
            Aparecem no topo da via do cliente na nota impressa. Campos em branco não são impressos.
          </p>

          <div class="mt-4 grid gap-4 sm:grid-cols-2">
            <BaseFormField label="Nome" optional>
              <input v-model="form.empresa_nome" type="text" maxlength="80" placeholder="Nome da sua empresa" :class="campoClass" />
            </BaseFormField>
            <BaseFormField label="CNPJ" optional>
              <input
                :value="form.empresa_cnpj"
                type="text"
                inputmode="numeric"
                autocomplete="off"
                maxlength="18"
                placeholder="00.000.000/0000-00"
                :class="campoClass"
                @input="aoDigitar('empresa_cnpj', mascaraCnpj, $event)"
              />
            </BaseFormField>
            <BaseFormField label="Endereço" optional class="sm:col-span-2">
              <input v-model="form.empresa_endereco" type="text" maxlength="160" placeholder="Rua ou avenida" :class="campoClass" />
            </BaseFormField>
            <BaseFormField label="Número" optional>
              <input v-model="form.empresa_numero" type="text" maxlength="20" placeholder="123" :class="campoClass" />
            </BaseFormField>
            <BaseFormField label="Complemento" optional>
              <input v-model="form.empresa_complemento" type="text" maxlength="60" placeholder="Sala, loja, andar..." :class="campoClass" />
            </BaseFormField>
            <BaseFormField label="Bairro" optional class="sm:col-span-2">
              <input v-model="form.empresa_bairro" type="text" maxlength="60" placeholder="Centro" :class="campoClass" />
            </BaseFormField>
            <BaseFormField label="Telefone" optional>
              <input
                :value="form.empresa_telefone"
                type="tel"
                inputmode="numeric"
                autocomplete="off"
                maxlength="14"
                placeholder="(00) 0000-0000"
                :class="campoClass"
                @input="aoDigitar('empresa_telefone', mascaraFixo, $event)"
              />
            </BaseFormField>
            <BaseFormField label="WhatsApp" optional>
              <input
                :value="form.empresa_whatsapp"
                type="tel"
                inputmode="numeric"
                autocomplete="off"
                maxlength="15"
                placeholder="(00) 00000-0000"
                :class="campoClass"
                @input="aoDigitar('empresa_whatsapp', mascaraCelular, $event)"
              />
            </BaseFormField>
            <BaseFormField label="Instagram" optional class="sm:col-span-2">
              <input v-model="form.empresa_instagram" type="text" maxlength="60" placeholder="@suaempresa" :class="campoClass" />
            </BaseFormField>
          </div>
        </section>

        <section class="rounded-3xl border border-black/10 bg-white p-4 shadow-sm sm:p-6">
          <h2 class="text-base font-semibold text-black">Mensagem no final da nota</h2>
          <p class="mt-1 text-sm text-black/55">
            Opcional. Se ficar em branco, nenhuma mensagem é impressa. Use para avisos do seu negócio, como prazo de
            retenção de objetos ou garantia do serviço.
          </p>

          <BaseFormField label="Mensagem" optional class="mt-4">
            <textarea
              v-model="form.nota_mensagem"
              rows="3"
              maxlength="300"
              placeholder="Ex: Os objetos deixados por um período superior a 1 ano poderão ser descartados."
              :class="[campoClass, 'resize-none']"
            ></textarea>
            <p class="mt-1 text-right text-xs text-black/40">{{ form.nota_mensagem.length }}/300</p>
          </BaseFormField>
        </section>

        <button
          type="submit"
          :disabled="salvando"
          class="flex items-center gap-2 rounded-2xl bg-black px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-black/80 disabled:opacity-50"
        >
          <span :class="salvando ? 'mdi mdi-loading animate-spin' : 'mdi mdi-content-save-outline'" class="text-[18px]"></span>
          Salvar
        </button>
      </form>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import AppLayout from '@/layouts/AppLayout.vue'
import BasePageTitle from '@/components/base/BasePageTitle.vue'
import BaseFormField from '@/components/base/BaseFormField.vue'
import BaseAlert from '@/components/base/BaseAlert.vue'
import BaseSegmentedIcons from '@/components/base/BaseSegmentedIcons.vue'
import UsuariosPanel from '@/components/admin/UsuariosPanel.vue'
import AparelhosPanel from '@/components/admin/AparelhosPanel.vue'
import DashboardPanel from '@/components/admin/DashboardPanel.vue'
import BackupPanel from '@/components/admin/BackupPanel.vue'
import AparenciaPanel from '@/components/admin/AparenciaPanel.vue'
import NotaLayoutPanel from '@/components/admin/NotaLayoutPanel.vue'
import { useConfigStore } from '@/stores/config'
import { useToastStore } from '@/stores/toast'

const config = useConfigStore()
const toast = useToastStore()

const abas = [
  { value: 'dashboard', label: 'Dashboard', icon: 'mdi-chart-box-outline' },
  { value: 'empresa', label: 'Empresa', icon: 'mdi-domain' },
  { value: 'nota', label: 'Impressão', icon: 'mdi-receipt-text-edit-outline' },
  { value: 'aparencia', label: 'Aparência', icon: 'mdi-palette-outline' },
  { value: 'usuarios', label: 'Usuários', icon: 'mdi-account-group-outline' },
  { value: 'aparelhos', label: 'Aparelhos', icon: 'mdi-cellphone-lock' },
  { value: 'backup', label: 'Backup', icon: 'mdi-database-arrow-down-outline' },
]
const abaAtiva = ref('dashboard')

const inputLogo = ref(null)
const form = reactive({
  empresa_nome: '',
  empresa_cnpj: '',
  empresa_endereco: '',
  empresa_numero: '',
  empresa_complemento: '',
  empresa_bairro: '',
  empresa_telefone: '',
  empresa_whatsapp: '',
  empresa_instagram: '',
  nota_mensagem: '',
})
const campoClass = 'w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-black/30 focus:ring-2 focus:ring-black/10'
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

// Fixo: (00) 0000-0000 (10 dígitos). Celular: (00) 00000-0000 (11 dígitos, começando com 9 após o DDD).
function somenteDigitos(valor, max) {
  return (valor || '').replace(/\D/g, '').slice(0, max)
}

function aplicarMascara(d, tamanhoPrefixo) {
  if (!d) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length <= 2 + tamanhoPrefixo) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 2 + tamanhoPrefixo)}-${d.slice(2 + tamanhoPrefixo)}`
}

const mascaraFixo = (valor) => aplicarMascara(somenteDigitos(valor, 10), 4)
const mascaraCelular = (valor) => aplicarMascara(somenteDigitos(valor, 11), 5)

// CNPJ: 00.000.000/0000-00
function mascaraCnpj(valor) {
  const d = somenteDigitos(valor, 14)
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

function cnpjValido(valor) {
  const d = somenteDigitos(valor, 14)
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false
  const digito = (tamanho) => {
    let soma = 0
    let peso = tamanho - 7
    for (let i = 0; i < tamanho; i++) {
      soma += Number(d[i]) * peso
      peso = peso === 2 ? 9 : peso - 1
    }
    const resto = soma % 11
    return resto < 2 ? 0 : 11 - resto
  }
  return digito(12) === Number(d[12]) && digito(13) === Number(d[13])
}
function aoDigitar(campo, mascara, event) {
  const formatado = mascara(event.target.value)
  form[campo] = formatado
  event.target.value = formatado
}

function validarCampos() {
  if (form.empresa_cnpj && !cnpjValido(form.empresa_cnpj)) return 'CNPJ inválido. Confira os 14 dígitos.'
  const fixo = somenteDigitos(form.empresa_telefone, 10)
  if (fixo && (fixo.length !== 10 || fixo[2] === '9')) return 'Telefone inválido. Use o formato (00) 0000-0000.'
  const celular = somenteDigitos(form.empresa_whatsapp, 11)
  if (celular && (celular.length !== 11 || celular[2] !== '9')) return 'WhatsApp inválido. Use o formato (00) 90000-0000.'
  return ''
}

async function salvarDados() {
  limparMensagens()
  const problema = validarCampos()
  if (problema) {
    erro.value = problema
    return
  }
  salvando.value = true
  await executar(() => config.salvarDados({ ...form }), 'Dados salvos')
  salvando.value = false
}

function preencherForm() {
  form.empresa_nome = config.empresaNome
  form.empresa_cnpj = mascaraCnpj(config.empresaCnpj)
  form.empresa_endereco = config.empresaEndereco
  form.empresa_numero = config.empresaNumero
  form.empresa_complemento = config.empresaComplemento
  form.empresa_bairro = config.empresaBairro
  form.empresa_telefone = mascaraFixo(config.empresaTelefone)
  form.empresa_whatsapp = mascaraCelular(config.empresaWhatsapp)
  form.empresa_instagram = config.empresaInstagram
  form.nota_mensagem = config.notaMensagem
}

onMounted(async () => {
  await config.carregar()
  preencherForm()
})
</script>
