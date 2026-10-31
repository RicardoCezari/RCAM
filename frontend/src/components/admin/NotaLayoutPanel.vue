<template>
  <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] xl:items-start">
    <div class="space-y-4">
      <BaseAlert :message="erro" />

      <section class="rounded-3xl border border-black/10 bg-white p-4 shadow-sm sm:p-6">
        <h2 class="text-base font-semibold text-black">Papel e espaçamento</h2>

        <div class="mt-5 grid gap-4 sm:grid-cols-2">
          <BaseFormField label="Largura do papel" optional>
            <div class="flex items-center gap-3">
              <input
                v-model.number="rascunho.larguraMm"
                type="range"
                min="48"
                max="100"
                step="1"
                aria-label="Largura do papel em milímetros"
                class="min-w-0 flex-1 accent-black"
              />
              <div class="relative w-24 shrink-0">
                <input
                  v-model.number="rascunho.larguraMm"
                  type="number"
                  min="48"
                  max="100"
                  step="1"
                  aria-label="Largura do papel em milímetros"
                  class="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 pr-9 text-sm outline-none focus:border-black/30 focus:ring-2 focus:ring-black/10"
                />
                <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-black/45">mm</span>
              </div>
            </div>
            <div class="mt-2 flex gap-2">
              <button v-for="mm in [58, 80]" :key="mm" type="button" :class="atalhoClass(rascunho.larguraMm === mm)" @click="rascunho.larguraMm = mm">{{ mm }} mm</button>
            </div>
          </BaseFormField>

          <fieldset>
            <legend class="mb-1.5 text-sm font-medium text-slate-700">Espaçamento</legend>
            <div class="flex rounded-xl border border-black/10 p-1" role="group" aria-label="Espaçamento da nota">
              <button v-for="opcao in espacamentos" :key="opcao.valor" type="button" :aria-pressed="rascunho.espacamento === opcao.valor" :class="modoClass(rascunho.espacamento === opcao.valor)" @click="rascunho.espacamento = opcao.valor">{{ opcao.label }}</button>
            </div>
          </fieldset>
        </div>
      </section>

      <section class="rounded-3xl border border-black/10 bg-white p-4 shadow-sm sm:p-6">
        <h2 class="text-base font-semibold text-black">Impressora térmica</h2>
        <p class="mt-1 text-sm text-black/55">
          Defina como a impressora está conectada à rede local. Cabo de rede fica selecionado por padrão.
        </p>

        <fieldset class="mt-4">
          <legend class="mb-1.5 text-sm font-medium text-slate-700">Tipo de conexão</legend>
          <div class="grid gap-2 sm:grid-cols-2" role="group" aria-label="Tipo de conexão da impressora">
            <button
              type="button"
              :aria-pressed="redeRascunho.tipoConexao === 'ethernet'"
              :class="conexaoClass(redeRascunho.tipoConexao === 'ethernet')"
              @click="redeRascunho.tipoConexao = 'ethernet'"
            >
              <span class="mdi mdi-ethernet-cable text-lg" aria-hidden="true"></span>
              <span>Cabo de rede</span>
              <span class="ml-auto text-xs opacity-75">Padrão</span>
            </button>
            <button
              type="button"
              :aria-pressed="redeRascunho.tipoConexao === 'wifi'"
              :class="conexaoClass(redeRascunho.tipoConexao === 'wifi')"
              @click="redeRascunho.tipoConexao = 'wifi'"
            >
              <span class="mdi mdi-wifi text-lg" aria-hidden="true"></span>
              <span>Wi-Fi</span>
            </button>
          </div>
        </fieldset>

        <BaseFormField id="impressora-ip-local" label="Endereço IPv4 local da impressora" optional class="mt-4">
          <input
            id="impressora-ip-local"
            v-model.trim="redeRascunho.enderecoIp"
            type="text"
            inputmode="decimal"
            autocomplete="off"
            maxlength="15"
            placeholder="192.168.1.100"
            :aria-invalid="!enderecoIpValido"
            class="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-black/30 focus:ring-2 focus:ring-black/10"
          />
        </BaseFormField>
        <p v-if="!enderecoIpValido" role="alert" class="mt-1 text-sm text-red-600">
          Informe um IPv4 válido, por exemplo 192.168.1.100.
        </p>
        <p class="mt-2 text-xs text-black/50">
          O IP é opcional e pode ser consultado no painel da impressora ou no roteador. Salvar esta preferência não testa a conexão nem confirma que a impressora está acessível.
        </p>

        <BaseAlert :message="erroRede" class="mt-3" />
        <div class="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            :disabled="carregandoRede || salvandoRede || !redeCarregada || !redeAlterada || !enderecoIpValido"
            class="flex min-h-11 items-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-black/80 disabled:opacity-50"
            @click="salvarRede"
          >
            <span :class="salvandoRede ? 'mdi mdi-loading animate-spin' : 'mdi mdi-content-save-outline'" class="text-lg"></span>
            Salvar conexão
          </button>
          <button
            v-if="redeAlterada && redeCarregada"
            type="button"
            :disabled="carregandoRede || salvandoRede"
            class="min-h-11 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-medium text-black/70 transition hover:bg-black/5 disabled:opacity-50"
            @click="descartarRede"
          >
            Descartar
          </button>
          <button
            v-if="erroRede && !redeCarregada"
            type="button"
            :disabled="carregandoRede"
            class="min-h-11 rounded-xl px-3 py-2.5 text-sm font-medium text-black/60 transition hover:text-black disabled:opacity-50"
            @click="carregarConfiguracaoImpressora"
          >
            {{ carregandoRede ? 'Carregando...' : 'Tentar novamente' }}
          </button>
          <span v-if="carregandoRede" class="text-sm text-black/50">Carregando configuração...</span>
        </div>

        <div class="mt-4 border-t border-black/5 pt-4">
          <button
            type="button"
            class="flex min-h-11 items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-black/75 transition hover:bg-black/5"
            @click="imprimirTeste"
          >
            <span class="mdi mdi-printer-outline text-lg" aria-hidden="true"></span>
            Imprimir teste
          </button>
          <p class="mt-2 text-xs text-black/50">Abre uma via de exemplo no diálogo de impressão do navegador.</p>
        </div>
      </section>

      <section v-for="via in vias" :key="via.id" class="rounded-3xl border border-black/10 bg-white p-4 shadow-sm sm:p-6">
        <div>
          <h2 class="text-base font-semibold text-black">{{ via.titulo }}</h2>
        </div>

        <ol class="mt-4 divide-y divide-black/5">
          <li
            v-for="bloco in blocosOrdenados(via.id)"
            :key="bloco.id"
            :data-via-row="via.id"
            :data-block-id="bloco.id"
            :class="[
              'relative flex min-h-12 items-center gap-3 rounded-lg py-2 transition-colors',
              estaArrastando(via.id, bloco.id) ? 'bg-black/5 opacity-60' : '',
              arraste.sobre === bloco.id && arraste.via === via.id ? 'bg-black/5' : '',
            ]"
          >
            <label class="flex min-w-0 flex-1 cursor-pointer items-center gap-3 py-1">
              <input
                type="checkbox"
                :checked="rascunho[via.id].includes(bloco.id)"
                :aria-label="`${bloco.label} na via ${via.rotulo}`"
                class="h-4 w-4 shrink-0 accent-black"
                @change="alternarBloco(via.id, bloco.id, $event.target.checked)"
              />
              <span class="min-w-0 flex-1 text-sm" :class="rascunho[via.id].includes(bloco.id) ? 'text-black' : 'text-black/45'">{{ bloco.label }}</span>
            </label>
            <template v-if="rascunho[via.id].includes(bloco.id)">
              <button
                type="button"
                :aria-label="`Arrastar ${bloco.label} na via ${via.rotulo}`"
                aria-keyshortcuts="ArrowUp ArrowDown"
                title="Arraste para reorganizar"
                class="flex h-9 w-9 shrink-0 touch-none cursor-grab items-center justify-center rounded-lg text-black/45 transition hover:bg-black/5 hover:text-black active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30"
                @pointerdown="iniciarArraste(via.id, bloco.id, $event)"
                @keydown.up.prevent="moverBloco(via.id, bloco.id, -1)"
                @keydown.down.prevent="moverBloco(via.id, bloco.id, 1)"
              >
                <span class="mdi mdi-drag-vertical text-xl"></span>
              </button>
            </template>
            <span
              v-if="arraste.via === via.id && arraste.sobre === bloco.id"
              class="pointer-events-none absolute left-0 right-0 h-0.5 bg-black"
              :class="arraste.apos ? 'bottom-0' : 'top-0'"
            ></span>
          </li>
        </ol>
      </section>

      <div class="flex flex-wrap gap-2">
        <button type="button" :disabled="salvando || !alterado || !larguraValida" class="flex items-center gap-2 rounded-2xl bg-black px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-black/80 disabled:opacity-50" @click="salvar">
          <span :class="['mdi text-[18px]', salvando ? 'mdi-loading animate-spin' : 'mdi-content-save-outline']"></span>
          Salvar layout
        </button>
        <button v-if="alterado" type="button" class="rounded-2xl border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-black/70 transition hover:bg-black/5" @click="descartar">Descartar</button>
        <button type="button" :disabled="salvando || !alteradoDoPadrao" class="rounded-2xl px-3 py-3 text-sm font-medium text-black/60 transition hover:text-black disabled:opacity-40" @click="restaurarPadrao">Restaurar padrão</button>
      </div>
      <p v-if="!larguraValida" role="alert" class="text-sm text-red-600">A largura deve ficar entre 48 e 100 mm.</p>
    </div>

    <section class="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-sm xl:sticky xl:top-4">
      <div class="border-b border-black/5 p-4">
        <h2 class="text-base font-semibold text-black">Pré-visualização</h2>
      </div>
      <iframe ref="iframePreview" :srcdoc="htmlPrevio" title="Pré-visualização das vias da nota" sandbox="allow-same-origin" class="block h-[32rem] w-full bg-[#ececec]" @load="ajustarAlturaPreview"></iframe>
    </section>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import BaseAlert from '@/components/base/BaseAlert.vue'
import BaseFormField from '@/components/base/BaseFormField.vue'
import { useConfigStore } from '@/stores/config'
import { useToastStore } from '@/stores/toast'
import { equalizarAlturaPadrao, gerarHtmlNota, useImpressao } from '@/composables/useImpressao'
import { BLOCOS_NOTA, PADRAO_LAYOUT_NOTA, copiarLayoutNota } from '@/utils/layoutNota'

const config = useConfigStore()
const toast = useToastStore()
const { imprimir } = useImpressao()
const rascunho = ref(copiarLayoutNota(config.layoutNota))
const redeRascunho = ref({ ...config.impressoraRede })
const salvando = ref(false)
const salvandoRede = ref(false)
const carregandoRede = ref(false)
const redeCarregada = ref(false)
const erro = ref('')
const erroRede = ref('')
const iframePreview = ref(null)
const arraste = ref({ via: '', id: '', sobre: '', apos: false, pointerId: null })

const vias = [
  { id: 'cliente', titulo: 'Via do cliente', rotulo: 'cliente' },
  { id: 'loja', titulo: 'Via da loja', rotulo: 'loja' },
]
const espacamentos = [
  { valor: 'compacto', label: 'Compacto' },
  { valor: 'normal', label: 'Normal' },
  { valor: 'amplo', label: 'Amplo' },
]
const blocosPorVia = {
  cliente: BLOCOS_NOTA.filter((bloco) => PADRAO_LAYOUT_NOTA.cliente.includes(bloco.id)),
  loja: BLOCOS_NOTA,
}
const larguraValida = computed(() => Number.isInteger(rascunho.value.larguraMm) && rascunho.value.larguraMm >= 48 && rascunho.value.larguraMm <= 100)
const alterado = computed(() => JSON.stringify(rascunho.value) !== JSON.stringify(config.layoutNota))
const alteradoDoPadrao = computed(() => JSON.stringify(rascunho.value) !== JSON.stringify(PADRAO_LAYOUT_NOTA))
const redeAlterada = computed(() => JSON.stringify(redeRascunho.value) !== JSON.stringify(config.impressoraRede))
const enderecoIpValido = computed(() => {
  const ip = redeRascunho.value.enderecoIp.trim()
  if (!ip) return true
  const octetos = ip.split('.')
  return octetos.length === 4 && octetos.every((octeto) => /^(0|[1-9]\d{0,2})$/.test(octeto) && Number(octeto) <= 255)
})

const empresaPreview = computed(() => ({
  nome: config.empresaNome || 'Sua empresa',
  logo: config.logoSrc,
  endereco: config.empresaEndereco,
  numero: config.empresaNumero,
  complemento: config.empresaComplemento,
  bairro: config.empresaBairro,
  cnpj: config.empresaCnpj,
  telefone: config.empresaTelefone,
  whatsapp: config.empresaWhatsapp,
  instagram: config.empresaInstagram,
  mensagem: config.notaMensagem,
  layoutNota: rascunho.value,
}))

const htmlPrevio = computed(() => gerarHtmlNota({
  osNum: '123',
  cliente: { nome: 'Maria de Oliveira', telefone: '(11) 99999-1234', observacoes: 'Exemplo de observação do cliente.' },
  os: { dataEntrega: '2026-10-27', horaEntrega: '16:00', observacoes: 'Exemplo de observação interna.' },
  itens: [{ nomeObjeto: 'Relógio', servicos: [{ nome: 'Revisão do mecanismo', quantidade: 1, valor: '85,00', dataEntrega: '2026-10-27', horaEntrega: '16:00' }] }],
  empresa: empresaPreview.value,
  agora: '27/10/2026, 16:00:00',
}))

watch(() => config.layoutNota, (layout) => { rascunho.value = copiarLayoutNota(layout) }, { deep: true })
watch(() => config.impressoraRede, (rede) => { redeRascunho.value = { ...rede } }, { deep: true })

onMounted(() => {
  document.addEventListener('pointermove', acompanharArraste)
  document.addEventListener('pointerup', finalizarArraste)
  document.addEventListener('pointercancel', finalizarArraste)
  void carregarConfiguracaoImpressora()
})

onBeforeUnmount(() => {
  document.removeEventListener('pointermove', acompanharArraste)
  document.removeEventListener('pointerup', finalizarArraste)
  document.removeEventListener('pointercancel', finalizarArraste)
})

function ajustarAlturaPreview() {
  equalizarAlturaPadrao(iframePreview.value?.contentDocument)
}

const modoClass = (selecionado) => [
  'min-h-9 flex-1 rounded-lg px-2 text-xs font-medium transition',
  selecionado ? 'bg-black text-white' : 'text-black/60 hover:bg-black/5',
]
const atalhoClass = (selecionado) => [
  'rounded-lg border px-2.5 py-1.5 text-xs font-medium transition',
  selecionado ? 'border-black bg-black text-white' : 'border-black/10 text-black/60 hover:bg-black/5',
]
const conexaoClass = (selecionado) => [
  'flex min-h-12 items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition',
  selecionado ? 'border-black bg-black text-white' : 'border-black/10 bg-white text-black/70 hover:bg-black/5',
]

async function carregarConfiguracaoImpressora() {
  carregandoRede.value = true
  erroRede.value = ''
  try {
    await config.carregarImpressoraRede()
    redeRascunho.value = { ...config.impressoraRede }
    redeCarregada.value = true
  } catch (err) {
    erroRede.value = err.response?.data?.message || 'Não foi possível carregar a configuração da impressora.'
  } finally {
    carregandoRede.value = false
  }
}

function descartarRede() {
  erroRede.value = ''
  redeRascunho.value = { ...config.impressoraRede }
}

async function salvarRede() {
  if (!enderecoIpValido.value || !redeCarregada.value) return
  salvandoRede.value = true
  erroRede.value = ''
  try {
    await config.salvarImpressoraRede(redeRascunho.value)
    toast.sucesso('Configuração da impressora atualizada.')
  } catch (err) {
    erroRede.value = err.response?.data?.message || 'Não foi possível salvar a configuração da impressora.'
  } finally {
    salvandoRede.value = false
  }
}

function imprimirTeste() {
  const agora = new Date()
  const dataEntrega = [agora.getFullYear(), String(agora.getMonth() + 1).padStart(2, '0'), String(agora.getDate()).padStart(2, '0')].join('-')
  const horaEntrega = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`

  imprimir({
    osNum: 'TESTE',
    cliente: { nome: 'Teste de impressão' },
    os: { dataEntrega, horaEntrega },
    itens: [{
      nomeObjeto: 'Impressora térmica',
      servicos: [{ nome: 'Teste de impressão', quantidade: 1, valor: '1,00', dataEntrega, horaEntrega }],
    }],
    tipo: 'cliente',
    layoutNota: rascunho.value,
  })
}

function blocosOrdenados(via) {
  const ativos = rascunho.value[via]
  return [...blocosPorVia[via]].sort((a, b) => {
    const posA = ativos.indexOf(a.id)
    const posB = ativos.indexOf(b.id)
    if (posA === -1) return posB === -1 ? 0 : 1
    if (posB === -1) return -1
    return posA - posB
  })
}

function alternarBloco(via, id, ativo) {
  const blocos = [...rascunho.value[via]]
  if (ativo && !blocos.includes(id)) blocos.push(id)
  if (!ativo) blocos.splice(blocos.indexOf(id), 1)
  rascunho.value[via] = blocos
}

function estaArrastando(via, id) {
  return arraste.value.via === via && arraste.value.id === id
}

function moverBloco(via, id, direcao) {
  const blocos = [...rascunho.value[via]]
  const indice = blocos.indexOf(id)
  const destino = indice + direcao
  if (indice < 0 || destino < 0 || destino >= blocos.length) return
  ;[blocos[indice], blocos[destino]] = [blocos[destino], blocos[indice]]
  rascunho.value[via] = blocos
}

function iniciarArraste(via, id, event) {
  if (event.button !== 0) return
  event.preventDefault()
  event.currentTarget.setPointerCapture(event.pointerId)
  arraste.value = { via, id, sobre: id, apos: false, pointerId: event.pointerId }
}

function acompanharArraste(event) {
  if (event.pointerId !== arraste.value.pointerId) return
  const alvo = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-via-row]')
  if (!alvo || alvo.dataset.viaRow !== arraste.value.via) {
    arraste.value.sobre = ''
    return
  }

  const destinoId = alvo.dataset.blockId
  if (!rascunho.value[arraste.value.via].includes(destinoId)) {
    arraste.value.sobre = ''
    return
  }
  arraste.value.sobre = destinoId
  arraste.value.apos = event.clientY > alvo.getBoundingClientRect().top + alvo.offsetHeight / 2
}

function finalizarArraste(event) {
  if (event.pointerId !== arraste.value.pointerId) return
  const atual = arraste.value
  if (event.type === 'pointerup' && atual.sobre && atual.sobre !== atual.id) {
    const blocos = [...rascunho.value[atual.via]]
    const origem = blocos.indexOf(atual.id)
    const indiceAlvo = blocos.indexOf(atual.sobre)
    const [bloco] = blocos.splice(origem, 1)
    let destino = indiceAlvo + (atual.apos ? 1 : 0)
    if (origem < destino) destino--
    blocos.splice(destino, 0, bloco)
    rascunho.value[atual.via] = blocos
  }
  arraste.value = { via: '', id: '', sobre: '', apos: false, pointerId: null }
}

function descartar() {
  erro.value = ''
  rascunho.value = copiarLayoutNota(config.layoutNota)
}

function restaurarPadrao() {
  rascunho.value = copiarLayoutNota(PADRAO_LAYOUT_NOTA)
}

async function salvar() {
  if (!larguraValida.value) return
  salvando.value = true
  erro.value = ''
  try {
    await config.salvarLayoutNota(rascunho.value)
    toast.sucesso('Layout da nota atualizado.')
  } catch (err) {
    erro.value = err.response?.data?.message || 'Não foi possível salvar o layout da nota.'
  } finally {
    salvando.value = false
  }
}
</script>
