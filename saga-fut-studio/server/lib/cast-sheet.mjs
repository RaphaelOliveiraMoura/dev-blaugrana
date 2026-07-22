// Monta a CAST SHEET de um elenco: as fichas dos personagens fundidas num único grid
// rotulado por número. É a cura pro elenco grande: em vez de anexar UMA ficha por
// personagem (o gpt-image-2 estoura com muitas refs, ver APRENDIZADOS), passa-se ESTE
// grid como referência única, e o modelo casa cada personagem do prompt pela camisa.
//
// Fonte única: o comporPrompt (caminho da UI) e a CLI gerar-painel-elenco.mjs usam esta
// mesma montagem, pra não divergirem.
import path from 'node:path'
import fs from 'node:fs/promises'
import sharp from 'sharp'
import { CONTEUDO_DIR } from '../config.mjs'
import { fichaImagem } from '../../shared/caminhos.mjs'

// Rótulo de cada célula: número da camisa + nome curto. É a âncora que a IA usa pra
// casar cada jogador do prompt com a cara certa. O número sai do promptFicha ("number 7").
export function rotuloElenco(p) {
  const num = (p.promptFicha || '').match(/\bnumber (\d+)/i)?.[1]
  const gk = /goalkeeper|goal-?keeper/i.test(p.promptFicha || '')
  const nome = (p.nome || p.id).split('(')[0].replace(/,.*/, '').trim()
  return `${num ? num + ' ' : ''}${nome}${gk ? ' (GK)' : ''}`
}

// Monta a cast sheet no arquivo `outAbs`. Só entra a ficha que JÁ existe em disco
// (referência inexistente não ajuda). Lança se nenhuma existe. Retorna { count, W, H }.
export async function montarCastSheet({ ids, byId, outAbs }) {
  const cels = []
  for (const id of ids || []) {
    const p = byId[id]
    if (!p) continue
    const abs = path.join(CONTEUDO_DIR, fichaImagem(id))
    try { await fs.access(abs) } catch { continue }
    cels.push({ abs, label: rotuloElenco(p) })
  }
  if (!cels.length) throw new Error('nenhuma ficha do elenco existe em disco')

  const CW = 420, CH = 700, LH = 58, PAD = 10, BG = '#efe6d3'
  const COLS = Math.min(4, cels.length)
  const rows = Math.ceil(cels.length / COLS)
  const W = CW * COLS, H = CH * rows
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const comps = []
  for (let i = 0; i < cels.length; i++) {
    const col = i % COLS, row = Math.floor(i / COLS)
    const x = col * CW, y = row * CH
    const imgBuf = await sharp(cels[i].abs)
      .resize(CW - 2 * PAD, CH - LH - 2 * PAD, { fit: 'contain', background: BG })
      .toBuffer()
    comps.push({ input: imgBuf, left: x + PAD, top: y + LH + PAD })
    const svg = Buffer.from(
      `<svg width="${CW}" height="${LH}"><rect width="100%" height="100%" fill="#7a1b26"/>` +
      `<text x="14" y="40" font-family="Arial, sans-serif" font-size="30" font-weight="bold" fill="#fff">${esc(cels[i].label)}</text></svg>`
    )
    comps.push({ input: svg, left: x, top: y })
  }
  await fs.mkdir(path.dirname(outAbs), { recursive: true })
  await sharp({ create: { width: W, height: H, channels: 3, background: BG } })
    .composite(comps).png().toFile(outAbs)
  return { count: cels.length, W, H }
}
