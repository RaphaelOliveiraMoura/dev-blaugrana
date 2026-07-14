// Desenho de overlays de VÍDEO no canvas do navegador → PNG (data URL).
// Usado no "Montar" do episódio: card final, gancho de abertura e legendas queimadas.

// desenha o card final "continua..." no canvas → PNG (data URL)
export function drawEndCard(text) {
  const c = document.createElement('canvas')
  c.width = 1080; c.height = 1920
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#08090d'; ctx.fillRect(0, 0, 1080, 1920)
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  try { ctx.letterSpacing = '6px' } catch {}
  // linha decorativa dourada
  ctx.strokeStyle = '#edbb00'; ctx.lineWidth = 3
  ctx.beginPath(); ctx.moveTo(440, 860); ctx.lineTo(640, 860); ctx.stroke()
  ctx.fillStyle = '#f0ece0'
  ctx.font = '700 96px Georgia, "Times New Roman", serif'
  ctx.fillText(text || 'CONTINUA...', 540, 970)
  return c.toDataURL('image/png')
}

// desenha o gancho de abertura (pergunta/afirmação forte) no terço superior → PNG transparente
// sobreposto à 1ª cena. Sempre com faixa: precisa ser legível sobre qualquer footage.
export function drawHook(text) {
  const W = 1080, H = 1920
  const c = document.createElement('canvas')
  c.width = W; c.height = H
  const ctx = c.getContext('2d')
  ctx.font = '800 76px -apple-system, "Segoe UI", Roboto, Arial, sans-serif'
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'
  const maxW = W - 130
  const words = (text || '').trim().split(/\s+/)
  const lines = []
  let line = ''
  for (const w of words) {
    const test = line ? line + ' ' + w : w
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w }
    else line = test
  }
  if (line) lines.push(line)
  const lineH = 92
  const firstY = Math.round(H * 0.24) - ((lines.length - 1) * lineH) / 2 // terço superior (não colide com legenda)

  // faixa semitransparente atrás (legibilidade sobre qualquer cena)
  let maxLine = 0
  for (const ln of lines) maxLine = Math.max(maxLine, ctx.measureText(ln).width)
  const halfLine = 46, padX = 48, padY = 28
  const bandW = Math.min(W - 24, maxLine + padX * 2)
  const bandH = (lines.length - 1) * lineH + halfLine * 2 + padY * 2
  const bandX = (W - bandW) / 2
  const bandY = firstY - halfLine - padY
  ctx.fillStyle = 'rgba(0,0,0,0.62)'
  ctx.beginPath()
  if (ctx.roundRect) ctx.roundRect(bandX, bandY, bandW, bandH, 28)
  else ctx.rect(bandX, bandY, bandW, bandH)
  ctx.fill()

  // filete dourado (marca da casa) acima do texto
  ctx.strokeStyle = '#edbb00'; ctx.lineWidth = 4
  ctx.beginPath(); ctx.moveTo(W / 2 - 70, bandY - 18); ctx.lineTo(W / 2 + 70, bandY - 18); ctx.stroke()

  let y = firstY
  for (const ln of lines) {
    ctx.lineWidth = 10; ctx.strokeStyle = 'rgba(0,0,0,0.92)'; ctx.strokeText(ln, W / 2, y)
    ctx.fillStyle = '#ffffff'; ctx.fillText(ln, W / 2, y)
    y += lineH
  }
  return c.toDataURL('image/png')
}

// quebra a narração em blocos curtos: nas batidas "..." e depois em ~6 palavras
export function splitNarracao(text) {
  const beats = (text || '').split(/\.{3}|…/).map((s) => s.trim()).filter(Boolean)
  const chunks = []
  const MAXW = 6
  for (const b of beats) {
    const limpo = b.replace(/^["“”']+|["“”']+$/g, '').trim()
    const words = limpo.split(/\s+/).filter(Boolean)
    for (let i = 0; i < words.length;) {
      const rest = words.length - (i + MAXW)
      // se depois deste bloco sobrar só 1-2 palavras, junta tudo aqui (evita legenda órfã)
      const take = rest > 0 && rest <= 2 ? words.length - i : MAXW
      chunks.push(words.slice(i, i + take).join(' '))
      i += take
    }
  }
  return chunks
}

// desenha um bloco de legenda estilo TikTok (texto grande + contorno) → PNG
// comFaixa: adiciona uma faixa semitransparente atrás do texto (melhora leitura)
export function drawCaption(text, comFaixa) {
  const W = 1080, H = 1920
  const c = document.createElement('canvas')
  c.width = W; c.height = H
  const ctx = c.getContext('2d')
  ctx.font = '800 66px -apple-system, "Segoe UI", Roboto, Arial, sans-serif'
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'
  // quebra de linha respeitando a largura
  const maxW = W - 160
  const words = (text || '').trim().split(/\s+/)
  const lines = []
  let line = ''
  for (const w of words) {
    const test = line ? line + ' ' + w : w
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w }
    else line = test
  }
  if (line) lines.push(line)
  const lineH = 84
  const firstY = Math.round(H * 0.76) - ((lines.length - 1) * lineH) / 2 // terço inferior

  if (comFaixa) {
    let maxLine = 0
    for (const ln of lines) maxLine = Math.max(maxLine, ctx.measureText(ln).width)
    const halfLine = 42, padX = 44, padY = 22
    const bandW = Math.min(W - 40, maxLine + padX * 2)
    const bandH = (lines.length - 1) * lineH + halfLine * 2 + padY * 2
    const bandX = (W - bandW) / 2
    const bandY = firstY - halfLine - padY
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.beginPath()
    if (ctx.roundRect) ctx.roundRect(bandX, bandY, bandW, bandH, 26)
    else ctx.rect(bandX, bandY, bandW, bandH)
    ctx.fill()
  }

  let y = firstY
  for (const ln of lines) {
    ctx.lineWidth = comFaixa ? 8 : 16; ctx.strokeStyle = 'rgba(0,0,0,0.92)'; ctx.strokeText(ln, W / 2, y)
    ctx.fillStyle = '#ffffff'; ctx.fillText(ln, W / 2, y)
    y += lineH
  }
  return c.toDataURL('image/png')
}
