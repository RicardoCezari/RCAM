export function useImpressao() {
  function formatarData(d) {
    if (!d) return '—'
    const [y, m, dd] = d.split('-')
    return `${dd}/${m}/${y}`
  }

  function imprimir({ osNum, cliente, os, nomeServico, vias }) {
    const n    = Number(vias) || 1
    const hoje = new Date().toLocaleDateString('pt-BR')

    const estilos = `
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:Arial,sans-serif;font-size:12px;color:#000;background:#fff}
      .via{width:80mm;padding:12px;border:1px solid #000;margin:8px auto}
      @media print{.via{page-break-after:always;margin:0}.via:last-child{page-break-after:avoid}}
      .logo{font-size:22px;font-weight:900;letter-spacing:-1px;margin-bottom:6px}
      .title{font-size:11px;font-weight:bold;text-transform:uppercase;border-top:1px solid #000;border-bottom:1px solid #000;padding:4px 0;margin:8px 0;text-align:center}
      .row{display:flex;justify-content:space-between;margin-bottom:3px;gap:8px}
      .lbl{color:#555;flex-shrink:0}.val{font-weight:600;text-align:right;word-break:break-word}
      .sep{border-top:1px dashed #bbb;margin:8px 0}
      .assinatura{margin-top:24px;border-top:1px solid #000;padding-top:4px;text-align:center;font-size:10px;color:#555}
      .via-lbl{text-align:right;font-size:10px;color:#aaa;margin-top:6px}
    `

    const viaHtml = (i) => `
      <div class="via">
        <div class="logo">Az</div>
        <div class="title">Ordem de Serviço #${osNum}</div>
        <div class="row"><span class="lbl">Emissão:</span><span class="val">${hoje}</span></div>
        <div class="row"><span class="lbl">Entrega:</span><span class="val">${formatarData(os.dataEntrega)}</span></div>
        <div class="sep"></div>
        <div class="row"><span class="lbl">Cliente:</span><span class="val">${cliente.nome}</span></div>
        <div class="row"><span class="lbl">Telefone:</span><span class="val">${cliente.telefone || '—'}</span></div>
        <div class="sep"></div>
        <div class="row"><span class="lbl">Serviço:</span><span class="val">${nomeServico}</span></div>
        <div class="row"><span class="lbl">Qtd.:</span><span class="val">${os.quantidade}</span></div>
        <div class="row"><span class="lbl">Valor:</span><span class="val">${os.valor || 'A definir'}</span></div>
        ${os.observacoes ? `<div class="row" style="margin-top:6px"><span class="lbl">Obs:</span><span class="val" style="font-weight:400">${os.observacoes}</span></div>` : ''}
        <div class="assinatura">Assinatura do cliente</div>
        ${n > 1 ? `<div class="via-lbl">Via ${i}/${n}</div>` : ''}
      </div>
    `

    const html = `<!DOCTYPE html><html lang="pt-BR"><head>
      <meta charset="UTF-8"><title>O.S. #${osNum}</title>
      <style>${estilos}</style>
    </head><body>
      ${Array.from({ length: n }, (_, i) => viaHtml(i + 1)).join('')}
    </body></html>`

    const w = window.open('', '_blank', 'width=720,height=900')
    if (!w) { alert('Permita popups nesta página para imprimir.'); return }
    w.document.write(html)
    w.document.close()
    w.focus()
    setTimeout(() => w.print(), 350)
  }

  return { formatarData, imprimir }
}
