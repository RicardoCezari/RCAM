import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'
import { fileUrl } from '@/utils/arquivos'
import { aplicarTema } from '@/utils/tema'
import { copiarLayoutNota } from '@/utils/layoutNota'

const PADRAO_IMPRESSORA_REDE = Object.freeze({ tipoConexao: 'ethernet', enderecoIp: '' })

export const useConfigStore = defineStore('config', () => {
  const empresaNome = ref('')
  const empresaCnpj = ref('')
  const empresaEndereco = ref('')
  const empresaNumero = ref('')
  const empresaComplemento = ref('')
  const empresaBairro = ref('')
  const empresaTelefone = ref('')
  const empresaWhatsapp = ref('')
  const empresaInstagram = ref('')
  const notaMensagem = ref('')
  const layoutNota = ref(copiarLayoutNota())
  const impressoraRede = ref({ ...PADRAO_IMPRESSORA_REDE })
  const logoUrl = ref(null)
  const pinTamanho = ref(4)
  const temaCor = ref(null)

  const logoSrc = computed(() => (logoUrl.value ? fileUrl(logoUrl.value) : ''))
  const iniciais = computed(() => (empresaNome.value || 'OS').replace(/[^\p{L}\p{N}]/gu, '').slice(0, 2))

  function aplicar(data) {
    empresaNome.value = data?.empresa_nome || ''
    empresaCnpj.value = data?.empresa_cnpj || ''
    empresaEndereco.value = data?.empresa_endereco || ''
    empresaNumero.value = data?.empresa_numero || ''
    empresaComplemento.value = data?.empresa_complemento || ''
    empresaBairro.value = data?.empresa_bairro || ''
    empresaTelefone.value = data?.empresa_telefone || ''
    empresaWhatsapp.value = data?.empresa_whatsapp || ''
    empresaInstagram.value = data?.empresa_instagram || ''
    notaMensagem.value = data?.nota_mensagem || ''
    layoutNota.value = copiarLayoutNota(data?.nota_layout)
    logoUrl.value = data?.logo_url || null
    pinTamanho.value = data?.pin_tamanho || 4
    temaCor.value = data?.tema_cor || null
    aplicarTema(temaCor.value)
  }

  async function carregar() {
    try {
      const { data } = await api.get('/configuracoes')
      aplicar(data)
    } catch {
      // mantém valores atuais; a marca padrão é exibida
    }
  }

  // dados = { empresa_nome, empresa_cnpj, empresa_endereco, empresa_numero, empresa_complemento, empresa_bairro, empresa_telefone,
  //           empresa_whatsapp, empresa_instagram, nota_mensagem }
  async function salvarDados(dados) {
    const { data } = await api.put('/configuracoes', dados)
    aplicar(data)
  }

  async function salvarLayoutNota(layout) {
    const { data } = await api.put('/configuracoes', { nota_layout: layout })
    aplicar(data)
  }

  async function carregarImpressoraRede() {
    const { data } = await api.get('/configuracoes/impressora')
    impressoraRede.value = { ...PADRAO_IMPRESSORA_REDE, ...data }
  }

  async function salvarImpressoraRede(rede) {
    const { data } = await api.put('/configuracoes/impressora', rede)
    impressoraRede.value = { ...PADRAO_IMPRESSORA_REDE, ...data }
  }

  async function enviarLogo(arquivo) {
    const form = new FormData()
    form.append('logo', arquivo)
    const { data } = await api.post('/configuracoes/logo', form)
    aplicar(data)
  }

  async function removerLogo() {
    const { data } = await api.delete('/configuracoes/logo')
    aplicar(data)
  }

  // cor = '#rrggbb' ou vazio para voltar ao padrão
  async function salvarTema(cor) {
    const { data } = await api.put('/configuracoes', { tema_cor: cor || '' })
    aplicar(data)
  }

  return {
    empresaNome, empresaCnpj, empresaEndereco, empresaNumero, empresaComplemento, empresaBairro,
    empresaTelefone, empresaWhatsapp, empresaInstagram, notaMensagem, layoutNota, impressoraRede,
    logoUrl, logoSrc, iniciais, pinTamanho, temaCor, carregar, salvarDados, enviarLogo, removerLogo, salvarTema,
    salvarLayoutNota, carregarImpressoraRede, salvarImpressoraRede,
  }
})
