import { parseMoeda } from './useItens'
import { formatarTelefone } from './useClienteForm'
import { estadoInfo, formatarDataBR, dataISO, horaCurta } from '@/utils/ordem'
import { useConfigStore } from '@/stores/config'

const MOEDA = { style: 'currency', currency: 'BRL' }
const SEM_VALOR = '—'

function esc(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ))
}

const ESTILOS = `
  @page{size:80mm auto;margin:0}
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:"Segoe UI",Arial,sans-serif;font-size:11px;color:#111;background:#ececec}
  .via{width:80mm;margin:8px auto;padding:10px 12px 12px;background:#fff}
  @media print{
    body{background:#fff}
    .via{margin:0;page-break-after:always}
    .via:last-child{page-break-after:auto}
  }
  small{font-size:8px;text-transform:uppercase;letter-spacing:.08em;color:#777;font-weight:600}
  .head{display:flex;align-items:center;justify-content:space-between;padding-bottom:7px;border-bottom:2px solid #111}
  .brand{display:flex;align-items:center;gap:7px}
  .logo{display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:8px;background:#111;color:#fff;font-size:12px;font-weight:700}
  .logo-img{max-width:90px;max-height:36px;object-fit:contain}
  .brand small{display:block;line-height:1.3}
  .brand b{font-size:11px}
  .num{text-align:right}
  .num small{display:block}
  .num b{font-size:19px;line-height:1;letter-spacing:-.5px}
  .meta{display:flex;align-items:center;justify-content:space-between;margin:7px 0 5px;font-size:10px;color:#555}
  .tag{padding:2px 8px;border-radius:999px;background:#111;color:#fff;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em}
  .cli{line-height:1.4}
  .cli strong{font-size:12px}
  .cli span{color:#555}
  h4{margin:9px 0 3px;font-size:8px;text-transform:uppercase;letter-spacing:.1em;color:#777}
  table{width:100%;border-collapse:collapse}
  td{padding:2px 0;vertical-align:top}
  td.v{padding-left:8px;text-align:right;white-space:nowrap;font-weight:600}
  tr.obj td{padding-top:6px;border-top:1px dotted #bbb;font-weight:700}
  tr.obj:first-child td{border-top:0;padding-top:0}
  tr.sv td:first-child{padding-left:8px;color:#333}
  .total{display:flex;align-items:baseline;justify-content:space-between;margin-top:6px;padding-top:5px;border-top:2px solid #111;font-weight:700}
  .total b{font-size:15px}
  .note{margin-top:3px;font-size:9px;color:#777;font-style:italic}
  .entrega{display:flex;align-items:center;justify-content:space-between;margin-top:8px;padding:5px 8px;border:1px solid #111;border-radius:6px}
  .entrega b{font-size:12px}
  .obs{margin-top:6px;padding:4px 7px;border-left:3px solid #111;background:#f3f3f3;font-size:10px;line-height:1.4}
  .obs small{display:block;margin-bottom:1px}
  .sign{margin-top:24px;padding-top:3px;border-top:1px solid #111;text-align:center;font-size:9px;color:#555}
  .foot{margin-top:7px;text-align:center;font-size:8px;color:#999;text-transform:uppercase;letter-spacing:.08em}
`

function formatarValor(numero) {
  return Number(numero).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatarCpf(valor) {
  const d = String(valor ?? '').replace(/\D/g, '')
  return d.length === 11 ? d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : String(valor ?? '')
}

// itens = [{ nomeObjeto, servicos: [{ nome, quantidade, valor }] }]
function montarItens(itens) {
  let total = 0
  let aOrcar = false
  let html = ''

  itens.forEach((obj, idx) => {
    html += `<tr class="obj"><td colspan="2">${idx + 1}. ${esc(obj.nomeObjeto || 'Objeto')}</td></tr>`

    obj.servicos.forEach((sv) => {
      const qtd = sv.quantidade ?? 1
      const valor = parseMoeda(sv.valor)
      if (valor > 0) total += valor * qtd
      else aOrcar = true

      const nome = qtd > 1 ? `${qtd}\u00d7 ${sv.nome || SEM_VALOR}` : (sv.nome || SEM_VALOR)
      html += `<tr class="sv"><td>${esc(nome)}</td><td class="v">${valor > 0 ? esc(sv.valor) : 'a orçar'}</td></tr>`
    })
  })

  return { html: `<table>${html}</table>`, total, aOrcar }
}

function montarVia({ osNum, cliente, os, itens, qtdFotos, completa, hoje, empresa }) {
  const { html, total, aOrcar } = montarItens(itens)
  const estado = estadoInfo(os.estado).label
  const entrega = `${esc(formatarDataBR(os.dataEntrega) || SEM_VALOR)}${os.horaEntrega ? ` às ${esc(os.horaEntrega)}` : ''}`

  const detalhesCliente = [
    cliente.telefone,
    completa && cliente.cpf ? `CPF ${formatarCpf(cliente.cpf)}` : '',
    completa ? cliente.email : '',
  ].filter(Boolean).map(esc).join(' · ')

  const observacoes = completa
    ? [
        os.observacoes && `<div class="obs"><small>Observações do serviço</small>${esc(os.observacoes)}</div>`,
        cliente.observacoes && `<div class="obs"><small>Observações do cliente</small>${esc(cliente.observacoes)}</div>`,
      ].filter(Boolean).join('')
    : ''

  return `
    <section class="via">
      <div class="head">
        <div class="brand">
          ${empresa.logo ? `<img class="logo-img" src="${esc(empresa.logo)}" alt="">` : '<span class="logo">Az</span>'}
          <div><small>${completa ? 'Via da loja' : 'Via do cliente'}</small><b>${esc(empresa.nome || 'Ordem de serviço')}</b></div>
        </div>
        <div class="num"><small>O.S.</small><b>#${esc(osNum)}</b></div>
      </div>

      <div class="meta"><span class="tag">${esc(estado)}</span><span>Emissão ${hoje}</span></div>

      <div class="cli"><strong>${esc(cliente.nome)}</strong>${detalhesCliente ? `<br><span>${detalhesCliente}</span>` : ''}</div>

      <h4>Serviços</h4>
      ${html}
      <div class="total"><span>Total</span><b>${total.toLocaleString('pt-BR', MOEDA)}</b></div>
      ${aOrcar ? '<p class="note">Itens "a orçar" terão o valor informado após a avaliação.</p>' : ''}

      <div class="entrega"><small>Entrega</small><b>${entrega}</b></div>

      ${observacoes}
      ${completa && qtdFotos > 0 ? `<p class="note">${qtdFotos} foto${qtdFotos !== 1 ? 's' : ''} registrada${qtdFotos !== 1 ? 's' : ''}.</p>` : ''}

      <div class="sign">${completa ? 'Recebido por' : 'Assinatura do cliente'}</div>
      <div class="foot">Obrigado pela preferência</div>
    </section>
  `
}

export function useImpressao() {
  const config = useConfigStore()

  function formatarData(valor) {
    return formatarDataBR(valor) || SEM_VALOR
  }

  // cliente = { nome, telefone, cpf, email, observacoes }
  // os      = { estado, dataEntrega: 'YYYY-MM-DD', horaEntrega, observacoes }
  function imprimir({ osNum, cliente, os, itens = [], tipo = 'ambas', qtdFotos = 0 }) {
    const hoje = new Date().toLocaleDateString('pt-BR')
    const empresa = { nome: config.empresaNome, logo: config.logoSrc }
    const dados = { osNum, cliente, os, itens, qtdFotos, hoje, empresa }

    const vias = [
      tipo !== 'loja' ? montarVia({ ...dados, completa: false }) : '',
      tipo !== 'cliente' ? montarVia({ ...dados, completa: true }) : '',
    ].join('')

    const html = `<!DOCTYPE html><html lang="pt-BR"><head>
      <meta charset="UTF-8"><title>O.S. #${esc(osNum)}</title>
      <style>${ESTILOS}</style>
    </head><body>${vias}</body></html>`

    const w = window.open('', '_blank', 'width=420,height=800')
    if (!w) { alert('Permita popups nesta página para imprimir.'); return }
    w.document.write(html)
    w.document.close()
    w.focus()
    // Aguarda a logo carregar antes de abrir o diálogo de impressão
    const carregamentos = Array.from(w.document.images).map((img) =>
      img.complete ? null : new Promise((ok) => { img.onload = img.onerror = ok })
    )
    Promise.all(carregamentos).then(() => setTimeout(() => w.print(), 200))
  }

  // Imprime a partir do formato da API: { numero, estado, data_entrega, hora_entrega, observacoes, cliente_*, itens[] }
  function imprimirOrdem(ordem, tipo = 'ambas') {
    const grupos = []
    for (const item of ordem.itens ?? []) {
      let grupo = grupos[grupos.length - 1]
      if (!grupo || grupo.tipoId !== item.tipo_objeto_id) {
        grupo = { tipoId: item.tipo_objeto_id, nomeObjeto: item.tipo_objeto_nome, servicos: [] }
        grupos.push(grupo)
      }
      const valor = Number(item.valor_unitario)
      grupo.servicos.push({
        nome: item.servico_nome,
        quantidade: item.quantidade,
        valor: valor > 0 ? formatarValor(valor) : SEM_VALOR,
      })
    }

    imprimir({
      osNum: ordem.numero ?? ordem.id,
      cliente: {
        nome: ordem.cliente_nome,
        telefone: formatarTelefone(ordem.cliente_telefone),
        cpf: ordem.cliente_cpf,
      },
      os: {
        estado: ordem.estado,
        dataEntrega: dataISO(ordem.data_entrega),
        horaEntrega: horaCurta(ordem.hora_entrega),
        observacoes: ordem.observacoes,
      },
      itens: grupos,
      tipo,
      qtdFotos: ordem.fotos?.length ?? 0,
    })
  }

  return { formatarData, imprimir, imprimirOrdem }
}
