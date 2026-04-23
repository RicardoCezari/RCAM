export function useImpressao() {
  function formatarData(d) {
    if (!d) return '—'
    const [y, m, dd] = d.split('-')
    return `${dd}/${m}/${y}`
  }

  function imprimir({ osNum, cliente, os, nomeServico, tipo = 'ambas', qtdFotos = 0 }) {
    const hoje = new Date().toLocaleDateString('pt-BR')

    const estilos = `
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:Arial,sans-serif;font-size:12px;color:#000;background:#fff}
      .via{width:80mm;padding:14px;border:1px solid #000;margin:8px auto}
      @media print{
        body{margin:0}
        .via{page-break-after:always;margin:0;border:none;padding:10px}
        .via:last-child{page-break-after:avoid}
      }
      .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px}
      .logo{font-size:24px;font-weight:900;letter-spacing:-1px}
      .os-num{text-align:right}
      .os-num .label{font-size:9px;text-transform:uppercase;color:#888;display:block}
      .os-num .num{font-size:20px;font-weight:900;letter-spacing:-1px}
      .divider{border-top:1px solid #000;margin:6px 0}
      .divider-dashed{border-top:1px dashed #ccc;margin:6px 0}
      .section-title{font-size:9px;font-weight:bold;text-transform:uppercase;letter-spacing:.5px;color:#888;margin:8px 0 4px}
      .row{display:flex;justify-content:space-between;margin-bottom:3px;gap:8px;line-height:1.4}
      .lbl{color:#555;flex-shrink:0;font-size:11px}
      .val{font-weight:600;text-align:right;word-break:break-word;font-size:11px}
      .obs-block{margin-top:6px;padding:6px;background:#f5f5f5;border-radius:3px;font-size:11px;line-height:1.5}
      .obs-lbl{font-size:9px;text-transform:uppercase;color:#888;margin-bottom:2px}
      .badge{display:inline-block;font-size:9px;font-weight:bold;text-transform:uppercase;letter-spacing:.5px;
             padding:2px 6px;border-radius:3px;margin-bottom:6px}
      .badge-entrada{background:#000;color:#fff}
      .badge-orcamento{background:#f5f0e0;color:#7a5c00;border:1px solid #e8d99a}
      .assinatura{margin-top:20px;border-top:1px solid #000;padding-top:5px;text-align:center;font-size:10px;color:#555}
      .via-tag{text-align:right;font-size:9px;color:#bbb;margin-top:8px;font-style:italic}
    `

    // ── Via do cliente: o que fica com ele (recibo simples) ───────────────
    const viaCliente = `
      <div class="via">
        <div class="header">
          <div class="logo">Az</div>
          <div class="os-num">
            <span class="label">O.S.</span>
            <span class="num">#${osNum}</span>
          </div>
        </div>
        <div class="divider"></div>

        <div class="section-title">Cliente</div>
        <div class="row"><span class="lbl">Nome:</span><span class="val">${cliente.nome}</span></div>
        ${cliente.telefone ? `<div class="row"><span class="lbl">Telefone:</span><span class="val">${cliente.telefone}</span></div>` : ''}

        <div class="divider-dashed"></div>

        <div class="section-title">Serviço</div>
        <span class="badge badge-${os.estado === 'ORCAMENTO' ? 'orcamento' : 'entrada'}">${os.estado === 'ORCAMENTO' ? 'Orçamento' : 'Entrada'}</span>
        <div class="row"><span class="lbl">Serviço:</span><span class="val">${nomeServico}</span></div>
        <div class="row"><span class="lbl">Qtd.:</span><span class="val">${os.quantidade}</span></div>
        <div class="row"><span class="lbl">Valor:</span><span class="val">${os.valor || 'A confirmar'}</span></div>

        <div class="divider-dashed"></div>

        <div class="section-title">Prazo</div>
        <div class="row"><span class="lbl">Emissão:</span><span class="val">${hoje}</span></div>
        <div class="row"><span class="lbl">Entrega:</span><span class="val">${formatarData(os.dataEntrega)}${os.horaEntrega ? ' às ' + os.horaEntrega : ''}</span></div>

        <div class="assinatura">Assinatura do cliente</div>
        <div class="via-tag">Via do cliente</div>
      </div>
    `

    // ── Via da loja: completa, com observações e detalhes internos ─────────
    const viaLoja = `
      <div class="via">
        <div class="header">
          <div class="logo">Az</div>
          <div class="os-num">
            <span class="label">O.S.</span>
            <span class="num">#${osNum}</span>
          </div>
        </div>
        <div class="divider"></div>

        <div class="section-title">Cliente</div>
        <div class="row"><span class="lbl">Nome:</span><span class="val">${cliente.nome}</span></div>
        ${cliente.telefone ? `<div class="row"><span class="lbl">Telefone:</span><span class="val">${cliente.telefone}</span></div>` : ''}
        ${cliente.cpf ? `<div class="row"><span class="lbl">CPF:</span><span class="val">${cliente.cpf}</span></div>` : ''}
        ${cliente.email ? `<div class="row"><span class="lbl">E-mail:</span><span class="val">${cliente.email}</span></div>` : ''}

        <div class="divider-dashed"></div>

        <div class="section-title">Ordem de Serviço</div>
        <span class="badge badge-${os.estado === 'ORCAMENTO' ? 'orcamento' : 'entrada'}">${os.estado === 'ORCAMENTO' ? 'Orçamento — aguarda aprovação' : 'Entrada — autorizado'}</span>
        <div class="row"><span class="lbl">Serviço:</span><span class="val">${nomeServico}</span></div>
        <div class="row"><span class="lbl">Qtd.:</span><span class="val">${os.quantidade}</span></div>
        <div class="row"><span class="lbl">Valor:</span><span class="val">${os.valor || 'A definir'}</span></div>
        ${qtdFotos > 0 ? `<div class="row"><span class="lbl">Fotos:</span><span class="val">${qtdFotos} foto${qtdFotos !== 1 ? 's' : ''} registrada${qtdFotos !== 1 ? 's' : ''}</span></div>` : ''}

        <div class="divider-dashed"></div>

        <div class="section-title">Prazo</div>
        <div class="row"><span class="lbl">Emissão:</span><span class="val">${hoje}</span></div>
        <div class="row"><span class="lbl">Entrega:</span><span class="val">${formatarData(os.dataEntrega)}${os.horaEntrega ? ' às ' + os.horaEntrega : ''}</span></div>

        ${(os.observacoes || cliente.observacoes) ? `
        <div class="divider-dashed"></div>
        ${os.observacoes ? `<div class="obs-block"><div class="obs-lbl">Observações do serviço</div>${os.observacoes}</div>` : ''}
        ${cliente.observacoes ? `<div class="obs-block" style="margin-top:4px"><div class="obs-lbl">Observações do cliente</div>${cliente.observacoes}</div>` : ''}
        ` : ''}

        <div class="assinatura">Recebido por</div>
        <div class="via-tag">Via da loja</div>
      </div>
    `

    const vias = tipo === 'cliente' ? viaCliente
               : tipo === 'loja'    ? viaLoja
               :                      viaCliente + viaLoja

    const html = `<!DOCTYPE html><html lang="pt-BR"><head>
      <meta charset="UTF-8"><title>O.S. #${osNum}</title>
      <style>${estilos}</style>
    </head><body>${vias}</body></html>`

    const w = window.open('', '_blank', 'width=720,height=900')
    if (!w) { alert('Permita popups nesta página para imprimir.'); return }
    w.document.write(html)
    w.document.close()
    w.focus()
    setTimeout(() => w.print(), 350)
  }

  return { formatarData, imprimir }
}
