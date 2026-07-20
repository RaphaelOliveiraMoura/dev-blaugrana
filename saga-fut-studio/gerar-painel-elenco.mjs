// Gera UM painel de quadrinho com ELENCO GRANDE (4+ personagens) sem travar o Codex.
//
// O problema: o gerar-painel.mjs padrão anexa UMA ficha de referência por personagem
// do elenco. Com 8 fichas o gpt-image-2 estoura o timeout e a fidelidade despenca (a
// prática da casa não passa de ~3 refs, ver APRENDIZADOS.md). A cura: montar as fichas
// numa ÚNICA "cast sheet" (grid rotulado por número) e passar só ELA + o estilo (2 refs).
//
// uso: node gerar-painel-elenco.mjs <quadrinhoId> [painelNumero]
//      CAST_ONLY=1 node gerar-painel-elenco.mjs <quadrinhoId>   # só monta a cast sheet
import path from 'node:path'
import fs from 'node:fs/promises'
import sharp from 'sharp'
import { readDados } from './server/store.mjs'
import { comporPrompt } from './server/prompts.mjs'
import { generateImage } from './server/providers/codex-image.mjs'
import { normalizarImagem } from './server/lib/imagem.mjs'
import { CONTEUDO_DIR } from './server/config.mjs'
import { estiloImagem, fichaImagem } from './shared/caminhos.mjs'

const quadrinhoId = process.argv[2]
const painelNumero = Number(process.argv[3] || 1)
if (!quadrinhoId) {
  console.error('uso: node gerar-painel-elenco.mjs <quadrinhoId> [painelNumero]')
  process.exit(1)
}

const d = await readDados()
const byId = Object.fromEntries((d.personagens || []).map((p) => [p.id, p]))
const q = (d.quadrinhos || []).find((x) => x.id === quadrinhoId)
if (!q) throw new Error(`quadrinho não encontrado: ${quadrinhoId}`)

// número da camisa e nome curto, pra rotular cada célula (a âncora que a IA usa pra
// casar cada jogador do prompt com a cara certa). O número sai do promptFicha ("number 7").
function rotulo(p) {
  const num = (p.promptFicha || '').match(/\bnumber (\d+)/i)?.[1]
  const gk = /goalkeeper|goal-?keeper/i.test(p.promptFicha || '')
  const nome = (p.nome || p.id).split('(')[0].replace(/,.*/, '').trim()
  return `${num ? num + ' ' : ''}${nome}${gk ? ' (GK)' : ''}`
}

// monta a cast sheet: grid de N células, cada uma com a ficha + faixa de rótulo no topo.
async function montarCastSheet(ids, outAbs) {
  const cels = []
  for (const id of ids) {
    const p = byId[id]
    const rel = fichaImagem(id)
    const abs = path.join(CONTEUDO_DIR, rel)
    try { await fs.access(abs) } catch { console.warn('sem ficha em disco, pulando:', id); continue }
    cels.push({ abs, label: rotulo(p) })
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

const pedido = await comporPrompt(d, { tipo: 'painel', quadrinhoId, painelNumero })
const outAbs = path.join(CONTEUDO_DIR, pedido.outRel)

// a cast sheet vive ao lado do painel, como asset de referência do quadrinho
const castRel = `quadrinhos/${quadrinhoId}/_elenco.png`
const castAbs = path.join(CONTEUDO_DIR, castRel)
const info = await montarCastSheet(q.elenco || [], castAbs)
console.log('cast sheet ->', castRel, `(${info.count} personagens, ${info.W}x${info.H})`)
if (process.env.CAST_ONLY) process.exit(0)

const estiloRel = estiloImagem(q.estiloId || 'rabisco-riso')
const refs = [castRel, estiloRel]

const instr = `Use your built-in image generation tool (gpt-image-2) to create ONE image and save it as a PNG at exactly this relative path inside the current workspace: ${pedido.outRel}

You are given 2 input image(s). Pass them to the image tool as INPUT IMAGES with HIGH input fidelity, in this order:
- Image 1 is a CAST SHEET: a labelled grid of characters, each in its own cell with a header giving its shirt NUMBER and short name. Use it ONLY to keep every character in the scene RECOGNIZABLE (same face shape, hair, skin tone and shirt number as the matching cell). Match each character in the prompt to its cell BY SHIRT NUMBER. It is a NEUTRAL identity grid, NOT a pose or layout reference: each character's expression, pose and camera come from the scene described below, and they must be re-dressed as the prompt says. CRITICAL: do NOT draw the grid, the cells, the labels or separate portraits in the output. Draw ONE single unified scene with all of them together.
- Image 2 is a STYLE reference: the TARGET LOOK. Copy ONLY its medium, linework, line weight, palette, shading and character construction, never its subject or layout. If Image 1 and Image 2 ever disagree on HOW to draw, Image 2 wins; Image 1 only says WHO each character is.
${pedido.orient}

IMAGE PROMPT:
${pedido.composed}

Write the final PNG to that exact path (${pedido.outRel}). Overwrite it if it already exists. Do not ask for confirmation.`

console.log('REFS:', refs.join(' | '))
await generateImage({ cwd: CONTEUDO_DIR, prompt: instr, referencias: refs, outAbs, timeoutMs: 900000 })
const norm = await normalizarImagem(outAbs, pedido.dim)
console.log('OK ->', outAbs, '| tamanho:', norm)
