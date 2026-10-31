import { parseMoeda } from './useItens'
import { formatarTelefone } from './useClienteForm'
import { formatarDataBR, dataISO, horaCurta } from '@/utils/ordem'
import { useConfigStore } from '@/stores/config'
import { PADRAO_LAYOUT_NOTA, normalizarLayoutNota } from '@/utils/layoutNota'

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
  @page{size:__LARGURA_NOTA__mm auto;margin:0}
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#000;background:#ececec}
  .via{display:flex;flex-direction:column;width:var(--nota-largura);margin:8px auto;padding:8px 10px 10px;background:#fff}
  @media print{
    body{background:#fff}
    .via{margin:0;page-break-after:always}
    .via:last-child{page-break-after:auto}
  }
  .fim{margin-top:auto}
  .topo{text-align:center}
  .logo-img{max-width:calc(var(--nota-largura) - 20mm);max-height:22mm;object-fit:contain}
  .empresa{font-size:16px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
  .contato{margin-top:4px;font-size:9px;line-height:1.5;color:#222}
  .id{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:10px}
  .id .cli{min-width:0}
  .id .cli b{display:block;font-size:12px;text-transform:uppercase;word-break:break-word}
  .id .cli span{display:block;margin-top:8px;font-size:11px}
  .cliente-nome{font-size:12px;font-weight:700;text-transform:uppercase;word-break:break-word}
  .cliente-telefone{margin-top:8px;font-size:11px}
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
  .obj-obs{margin:3px 0 0 8px;font-size:9.5px;color:#000;line-height:1.35}
  .total{margin-top:8px;text-align:right;font-size:12px;font-weight:700}
  .total .tracos{width:35%;margin:0 0 4px auto;border-top:1px solid #000}
  .nota{margin-top:4px;font-size:8px;color:#444;font-style:italic;text-align:right}
  .obs{margin-top:8px;padding:3px 6px;border-left:2px solid #000;font-size:9px;line-height:1.4}
  .mensagem{text-align:center;font-size:8.5px;line-height:1.55;color:#222}
  .rodape{margin-top:12px;text-align:center;font-size:8.5px;line-height:1.55;color:#222}
  .rodape b{display:block;font-size:9px;color:#000}
  .assinatura{margin-top:28px;padding-top:3px;border-top:1px solid #000;text-align:center;font-size:9px;color:#222}
  .assinatura b{display:block;font-size:11px;color:#000;text-transform:uppercase}
  .espacamento-compacto .id{margin-top:6px}
  .espacamento-compacto .cab{margin-top:7px}
  .espacamento-compacto .obj{margin-top:4px}
  .espacamento-compacto .sv{margin-top:1px}
  .espacamento-compacto .total{margin-top:5px}
  .espacamento-compacto .obs{margin-top:5px}
  .espacamento-compacto .contato{margin-top:2px}
  .espacamento-compacto .cliente-telefone{margin-top:4px}
  .espacamento-compacto .assinatura{margin-top:14px}
  .espacamento-compacto .rodape{margin-top:8px}
  .espacamento-compacto .mensagem{margin-top:0}
  .espacamento-amplo .id{margin-top:15px}
  .espacamento-amplo .cab{margin-top:15px}
  .espacamento-amplo .obj{margin-top:11px}
  .espacamento-amplo .sv{margin-top:6px}
  .espacamento-amplo .total{margin-top:13px}
  .espacamento-amplo .obs{margin-top:13px}
  .espacamento-amplo .contato{margin-top:8px}
  .espacamento-amplo .cliente-telefone{margin-top:14px}
  .espacamento-amplo .assinatura{margin-top:36px}
  .espacamento-amplo .rodape{margin-top:18px}
  .espacamento-amplo .mensagem{margin-top:13px}
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

    if (obj.observacoes && obj.observacoes.trim()) {
      html += `<div class="obj-obs">Obs: ${esc(obj.observacoes.trim())}</div>`
    }
  }

  return { html, total, aOrcar }
}

function montarVia({ osNum, cliente, os, itens, loja, agora, empresa }) {
  const layout = normalizarLayoutNota(empresa.layoutNota || PADRAO_LAYOUT_NOTA)
  if (JSON.stringify(layout) === JSON.stringify(PADRAO_LAYOUT_NOTA)) {
    return montarViaPadrao({ osNum, cliente, os, itens, loja, agora, empresa })
  }

  const { html, total, aOrcar } = montarItens(itens, os)

  const contato = linhasContato(empresa)
  const blocos = {
    logo: empresa.logo
      ? `<div class="topo"><img class="logo-img" src="${esc(empresa.logo)}" alt="${esc(empresa.nome)}"></div>`
      : (empresa.nome ? `<div class="empresa topo">${esc(empresa.nome)}</div>` : ''),
    dadosEmpresa: contato.length ? `<div class="contato topo">${contato.map(esc).join('<br>')}</div>` : '',
    cliente: `<div class="cliente-nome">${esc(cliente.nome)}</div>`,
    telefone: cliente.telefone ? `<div class="cliente-telefone">${esc(cliente.telefone)}</div>` : '',
    numeroOs: `<div class="caixa"><small>O.S.:</small>${loja ? '<em>2ª Via</em>' : ''}<b>${esc(osNum)}</b></div>`,
    itens: `<div class="cab"><span>Item:</span><b>Valor do Serviço:</b></div>${html}${aOrcar ? '<p class="nota">Itens "a orçar" terão o valor informado após a avaliação.</p>' : ''}`,
    total: `<div class="total"><div class="tracos"></div>TOTAL: R$ ${formatarValor(total)}</div>`,
    observacoes: loja ? [
      os.observacoes && `<div class="obs">${esc(os.observacoes)}</div>`,
      cliente.observacoes && `<div class="obs">${esc(cliente.observacoes)}</div>`,
    ].filter(Boolean).join('') : '',
    mensagem: empresa.mensagem
      ? `<div class="mensagem">${esc(empresa.mensagem).replace(/\r?\n/g, '<br>')}</div>`
      : '',
    assinatura: loja ? `<div class="assinatura"><b>${esc(cliente.nome)}</b>Recebi os itens descritos nesta nota.</div>` : '',
    rodape: `<div class="rodape">Data de emissão: ${esc(agora)}${loja ? '' : '<b>ESTE NÃO É UM DOCUMENTO FISCAL.</b>'}</div>`,
  }
  const ordem = layout[loja ? 'loja' : 'cliente']
  const conteudo = ordem.filter((id) => blocos[id]).map((id) => `<div class="bloco">${blocos[id]}</div>`).join('')
  return `<section class="via espacamento-${layout.espacamento}">${conteudo}</section>`
}

function montarViaPadrao({ osNum, cliente, os, itens, loja, agora, empresa }) {
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

export function gerarHtmlNota({ osNum, cliente, os, itens = [], tipo = 'ambas', empresa = {}, agora = new Date().toLocaleString('pt-BR') }) {
  const layout = normalizarLayoutNota(empresa.layoutNota || PADRAO_LAYOUT_NOTA)
  const layoutPadrao = JSON.stringify(layout) === JSON.stringify(PADRAO_LAYOUT_NOTA)
  const vias = [
    tipo !== 'loja' ? montarVia({ osNum, cliente, os, itens, agora, empresa }) : '',
    tipo !== 'cliente' ? montarVia({ osNum, cliente, os, itens, agora, empresa, loja: true }) : '',
  ].join('')

  return `<!DOCTYPE html><html lang="pt-BR"><head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>O.S. ${esc(osNum)}</title>
    <style>:root{--nota-largura:${layout.larguraMm}mm} ${ESTILOS.replaceAll('__LARGURA_NOTA__', layout.larguraMm)}</style>
  </head><body data-layout-padrao="${layoutPadrao}">${vias}</body></html>`
}

export function equalizarAlturaPadrao(doc) {
  if (doc?.body?.dataset.layoutPadrao !== 'true') return
  const folhas = Array.from(doc.querySelectorAll('.via'))
  if (!folhas.length) return
  const altura = Math.max(...folhas.map((folha) => folha.offsetHeight))
  folhas.forEach((folha) => { folha.style.minHeight = `${altura}px` })
}

export function useImpressao() {
  const config = useConfigStore()

  function formatarData(valor) {
    return formatarDataBR(valor) || SEM_VALOR
  }

  // cliente = { nome, telefone, observacoes }
  // os      = { dataEntrega: 'YYYY-MM-DD', horaEntrega, observacoes }
  // tipo    = 'cliente' | 'loja' | 'ambas'
  function imprimir({ osNum, cliente, os, itens = [], tipo = 'ambas', layoutNota = config.layoutNota }) {
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
      layoutNota,
    }
    const html = gerarHtmlNota({ osNum, cliente, os, itens, tipo, empresa, agora })

    const w = window.open('', '_blank', 'width=420,height=800')
    if (!w) { alert('Permita popups nesta página para imprimir.'); return }
    w.document.write(html)
    w.document.close()
    w.focus()
    // Aguarda a logo antes de abrir a impressão para evitar uma via sem imagem.
    const carregamentos = Array.from(w.document.images).map((img) =>
      img.complete ? null : new Promise((ok) => { img.onload = img.onerror = ok })
    )
    Promise.all(carregamentos).then(() => {
      equalizarAlturaPadrao(w.document)
      setTimeout(() => w.print(), 200)
    })
  }

  // Imprime a partir do formato da API: { numero, data_entrega, hora_entrega, observacoes, cliente_*, itens[] }
  function imprimirOrdem(ordem, tipo = 'ambas') {
    const grupos = []
    for (const item of (ordem.itens ?? []).filter((i) => i.estado !== 'CANCELADO')) {
      let grupo = grupos[grupos.length - 1]
      const novoGrupo = !grupo
        ? true
        : item.objeto_indice != null
          ? grupo.objeto_indice !== item.objeto_indice
          : grupo.tipoId !== item.tipo_objeto_id

      if (novoGrupo) {
        grupo = {
          objeto_indice: item.objeto_indice,
          tipoId: item.tipo_objeto_id,
          nomeObjeto: item.tipo_objeto_nome,
          observacoes: item.observacoes || '',
          servicos: [],
        }
        grupos.push(grupo)
      } else if (!grupo.observacoes && item.observacoes) {
        grupo.observacoes = item.observacoes
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
