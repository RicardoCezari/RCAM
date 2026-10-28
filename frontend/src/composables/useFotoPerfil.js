import { ref, computed, onBeforeUnmount } from 'vue'
import { prepararFoto } from '@/utils/imagem'
import { enviarFotoUsuario, removerFotoUsuario } from '@/services/usuarios'

const LADO_MAXIMO = 512

// Foto de perfil opcional: guarda a escolha na tela e só grava no servidor ao chamar `aplicar`
export function useFotoPerfil() {
  const gravada = ref(null)
  const arquivo = ref(null)
  const previa = ref('')
  const removida = ref(false)

  const src = computed(() => previa.value || (removida.value ? '' : gravada.value || ''))

  function liberarPrevia() {
    if (previa.value) URL.revokeObjectURL(previa.value)
    previa.value = ''
  }

  function iniciar(fotoUrl = null) {
    liberarPrevia()
    arquivo.value = null
    removida.value = false
    gravada.value = fotoUrl
  }

  async function escolher(file) {
    const reduzida = await prepararFoto(file, { maxLado: LADO_MAXIMO })
    liberarPrevia()
    arquivo.value = reduzida
    previa.value = URL.createObjectURL(reduzida)
    removida.value = false
  }

  function remover() {
    liberarPrevia()
    arquivo.value = null
    removida.value = Boolean(gravada.value)
  }

  async function aplicar(usuarioId) {
    if (arquivo.value) await enviarFotoUsuario(usuarioId, arquivo.value)
    else if (removida.value) await removerFotoUsuario(usuarioId)
  }

  onBeforeUnmount(liberarPrevia)

  return { src, iniciar, escolher, remover, aplicar }
}
