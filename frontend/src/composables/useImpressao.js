import { parseMoeda } from './useItens'
import { formatarTelefone } from './useClienteForm'
import { formatarDataBR, dataISO, horaCurta } from '@/utils/ordem'
import { useConfigStore } from '@/stores/config'

const SEM_VALOR = '—'

// Endereço + número + complemento + bairro, ignorando o que não foi preenchido: "Rua X, 123 - Sala 2 - Centro"
function enderecoCompleto({ endereco, numero, complemento, bairro }) {
  const rua = [endereco, numero].filter(Boolean).join(', ')
  return [rua, complemento, bairro].filter(Boolean).join(' - ')
}

// Linhas de contato impressas no topo da via do cliente (somente o que foi preenchido na Administração)
function linhasContato(empresa) {
  const instagram = empresa.instagram
    ? (/^(@|https?:)/i.test(empresa.instagram) ? empresa.instagram : `@${empresa.instagram}`)
    : ''
  return [
    empresa.cnpj && `CNPJ: ${empresa.cnpj}`,
    enderecoCompleto(empresa),
    [
      empresa.telefone && `Telefone: ${empresa.telefone}`,
      empresa.whatsapp && `WhatsApp: ${empresa.whatsapp}`,
    ].filter(Boolean).join(' · '),
    instagram && `Instagram: ${instagram}`,
  ].filter(Boolean)
}

function esc(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ))
}

const ESTILOS = `
  @page{size:80mm auto;margin:0}
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#000;background:#ececec}
  .via{display:flex;flex-direction:column;width:80mm;margin:8px auto;padding:8px 10px 10px;background:#fff}
  .fim{margin-top:auto}
  @media print{
    body{background:#fff}
    .via{margin:0;page-break-after:always}
    .via:last-child{page-break-after:auto}
  }
  .topo{text-align:center}
  .logo-img{max-width:60mm;max-height:22mm;object-fit:contain}
  .empresa{font-size:16px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
  .contato{margin-top:4px;font-size:9px;line-height:1.5;color:#222}
  .id{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:10px}
  .id .cli{min-width:0}
  .id .cli b{display:block;font-size:12px;text-transform:uppercase;word-break:break-word}
  .id .cli span{display:block;margin-top:8px;font-size:11px}
  .caixa{position:relative;flex:none;min-width:27mm;padding:3px 8px 4px;border:1px solid #000;text-align:center}
  .caixa small{display:block;text-align:left;font-size:10px}
  .caixa em{position:absolute;top:2px;right:5px;font-size:8px;font-style:normal;color:#333}
  .caixa b{display:block;font-size:22px;line-height:1.1}
  .cab{display:flex;align-items:baseline;justify-content:space-between;margin-top:10px;padding-bottom:2px;border-bottom:1px solid #000;font-size:10px}
  .cab b{font-size:11px}
  .obj{margin-top:7px;font-size:11px;font-weight:700}
  .sv{margin:3px 0 0 8px}
  .sv .nome{font-size:10px;font-weight:700}
  .sv .linha{display:flex;align-items:flex-end;gap:5px;font-size:9px;color:#222}
  .sv .fio{flex:1;margin-bottom:3px;border-bottom:1px solid #666}
  .sv .linha b{font-size:11px;color:#000;white-space:nowrap}
  .total{margin-top:8px;text-align:right;font-size:12px;font-weight:700}
  .total .tracos{width:35%;margin:0 0 4px auto;border-top:1px solid #000}
  .nota{margin-top:4px;font-size:8px;color:#444;font-style:italic;text-align:right}
  .obs{margin-top:8px;padding:3px 6px;border-left:2px solid #000;font-size:9px;line-height:1.4}
  .rodape{margin-top:12px;text-align:center;font-size:8.5px;line-height:1.55;color:#222}
  .rodape b{display:block;font-size:9px;color:#000}
  .assinatura{margin-top:28px;padding-top:3px;border-top:1px solid #000;text-align:center;font-size:9px;color:#222}
  .assinatura b{display:block;font-size:11px;color:#000;text-transform:uppercase}
`

function formatarValor(numero) {
  return Number(numero).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const dois = (n) => String(n ?? 1).padStart(2, '0')

// 'YYYY-MM-DD' + 'HH:MM' -> '24/10/2026 09:00:00'
function formatarEntrega(data, hora) {
  const dataBR = formatarDataBR(data)
  if (!dataBR) return ''
  const h = horaCurta(hora)
  return h ? `${dataBR} ${h}:00` : dataBR
}

// itens = [{ nomeObjeto, servicos: [{ nome, quantidade, valor, dataEntrega?, horaEntrega? }] }]
function montarItens(itens, os) {
  let total = 0
  let aOrcar = false
  let html = ''

  for (const obj of itens) {
    html += `<div class="obj">${dois(1)} ${esc(obj.nomeObjeto || 'Objeto')}</div>`

    for (const sv of obj.servicos) {
      const qtd = sv.quantidade ?? 1
      const unitario = parseMoeda(sv.valor)
      const subtotal = unitario * qtd
      if (unitario > 0) total += subtotal
      else aOrcar = true

      const entrega = formatarEntrega(sv.dataEntrega || os.dataEntrega, sv.horaEntrega || os.horaEntrega)
      html += `
        <div class="sv">
          <div class="nome">${dois(qtd)} ${esc(sv.nome || SEM_VALOR)}</div>
          <div class="linha"><span>${esc(entrega)}</span><span class="fio"></span><b>${unitario > 0 ? `R$ ${formatarValor(subtotal)}` : 'a orçar'}</b></div>
        </div>`
    }
  }

  return { html, total, aOrcar }
}

function montarVia({ osNum, cliente, os, itens, loja, agora, empresa }) {
  const { html, total, aOrcar } = montarItens(itens, os)

  const contato = linhasContato(empresa)
  const topo = loja
    ? ''
    : `<div class="topo">
        ${empresa.logo
          ? `<img class="logo-img" src="${esc(empresa.logo)}" alt="${esc(empresa.nome)}">`
          : (empresa.nome ? `<div class="empresa">${esc(empresa.nome)}</div>` : '')}
        ${contato.length ? `<div class="contato">${contato.map(esc).join('<br>')}</div>` : ''}
      </div>`

  const observacoes = loja
    ? [
        os.observacoes && `<div class="obs">${esc(os.observacoes)}</div>`,
        cliente.observacoes && `<div class="obs">${esc(cliente.observacoes)}</div>`,
      ].filter(Boolean).join('')
    : ''

  const rodape = loja
    ? `<div class="assinatura"><b>${esc(cliente.nome)}</b>Recebi os itens descritos nesta nota.</div>
       <div class="rodape">Data de emissão: ${esc(agora)}</div>`
    : `<div class="rodape">
         Data de emissão: ${esc(agora)}
         <b>ESTE NÃO É UM DOCUMENTO FISCAL.</b>
         ${empresa.mensagem ? esc(empresa.mensagem).replace(/\r?\n/g, '<br>') : ''}
       </div>`

  return `
    <section class="via">
      ${topo}
      <div class="id">
        <div class="cli">
          <b>${esc(cliente.nome)}</b>
          ${cliente.telefone ? `<span>${esc(cliente.telefone)}</span>` : ''}
        </div>
        <div class="caixa">
          <small>O.S.:</small>
          ${loja ? '<em>2ª Via</em>' : ''}
          <b>${esc(osNum)}</b>
        </div>
      </div>

      <div class="cab"><span>Item:</span><b>Valor do Serviço:</b></div>
      ${html}

      <div class="total"><div class="tracos"></div>TOTAL: R$ ${formatarValor(total)}</div>
      ${aOrcar ? '<p class="nota">Itens "a orçar" terão o valor informado após a avaliação.</p>' : ''}
      ${observacoes}
      <div class="fim">${rodape}</div>
    </section>
  `
}

export function useImpressao() {
  const config = useConfigStore()

  function formatarData(valor) {
    return formatarDataBR(valor) || SEM_VALOR
  }

  // cliente = { nome, telefone, observacoes }
  // os      = { dataEntrega: 'YYYY-MM-DD', horaEntrega, observacoes }
  // tipo    = 'cliente' | 'loja' | 'ambas'
  function imprimir({ osNum, cliente, os, itens = [], tipo = 'ambas' }) {
    const agora = new Date().toLocaleString('pt-BR')
    const empresa = {
      nome: config.empresaNome,
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
    }
    const dados = { osNum, cliente, os, itens, agora, empresa }

    const vias = [
      tipo !== 'loja' ? montarVia({ ...dados, loja: false }) : '',
      tipo !== 'cliente' ? montarVia({ ...dados, loja: true }) : '',
    ].join('')

    const html = `<!DOCTYPE html><html lang="pt-BR"><head>
      <meta charset="UTF-8"><title>O.S. ${esc(osNum)}</title>
      <style>${ESTILOS}</style>
    </head><body>${vias}</body></html>`

    const w = window.open('', '_blank', 'width=420,height=800')
    if (!w) { alert('Permita popups nesta página para imprimir.'); return }
    w.document.write(html)
    w.document.close()
    w.focus()
    // Aguarda a logo carregar; depois deixa todas as vias com a mesma altura (papel igual) e imprime
    const carregamentos = Array.from(w.document.images).map((img) =>
      img.complete ? null : new Promise((ok) => { img.onload = img.onerror = ok })
    )
    Promise.all(carregamentos).then(() => {
      const folhas = Array.from(w.document.querySelectorAll('.via'))
      const altura = Math.max(...folhas.map((f) => f.offsetHeight))
      folhas.forEach((f) => { f.style.minHeight = `${altura}px` })
      setTimeout(() => w.print(), 200)
    })
  }

  // Imprime a partir do formato da API: { numero, data_entrega, hora_entrega, observacoes, cliente_*, itens[] }
  function imprimirOrdem(ordem, tipo = 'ambas') {
    const grupos = []
    for (const item of (ordem.itens ?? []).filter((i) => i.estado !== 'CANCELADO')) {
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
        dataEntrega: dataISO(item.data_entrega),
        horaEntrega: horaCurta(item.hora_entrega),
      })
    }

    imprimir({
      osNum: ordem.numero ?? ordem.id,
      cliente: {
        nome: ordem.cliente_nome,
        telefone: formatarTelefone(ordem.cliente_telefone),
      },
      os: {
        dataEntrega: dataISO(ordem.data_entrega),
        horaEntrega: horaCurta(ordem.hora_entrega),
        observacoes: ordem.observacoes,
      },
      itens: grupos,
      tipo,
    })
  }

  return { formatarData, imprimir, imprimirOrdem }
}
