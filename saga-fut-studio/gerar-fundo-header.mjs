// Gera o FUNDO COMPLETO do card de escalacao (campo + arquibancada + faixa de header +
// faixa de footer + moldura, no traco rabisco desenhado a mao), VAZIO de jogadores e de
// texto. Recria o barca-escalado/paineis/1.png sem os elementos que o codigo poe por cima.
// Depois o gerar-escalacao compoe os tokens + TODO o texto sobre este asset.
//
//   node gerar-fundo-header.mjs
import path from 'node:path'
import fs from 'node:fs/promises'
import { generateImage } from './server/providers/codex-image.mjs'
import { normalizarImagem } from './server/lib/imagem.mjs'
import { CONTEUDO_DIR } from './server/config.mjs'
import { estiloImagem } from './shared/caminhos.mjs'

const outRel = 'assets/fundo-escalacao.png'
const outAbs = path.join(CONTEUDO_DIR, outRel)
await fs.mkdir(path.dirname(outAbs), { recursive: true })

const refCard = 'quadrinhos/barca-escalado/paineis/1.png' // o card bom, como referencia de look
const estiloRel = estiloImagem('rabisco-riso')

const instr = `Use your built-in image generation tool (gpt-image-2) to create ONE image and save it as a PNG at exactly this relative path inside the current workspace: ${outRel}

You are given 2 input images:
- Image 1 is a LAYOUT + LOOK reference: a football line-up card in a hand-drawn flat cartoon (rabisco) style. COPY its overall look and layout: the top-down green football pitch with white lines, the dark navy-blue crowd STAND across the very top, the solid GARNET (dark red) HEADER banner strip across the very top edge, the solid GARNET FOOTER banner strip across the very bottom edge, the thin CREAM paper margin, and the bold dark hand-drawn BORDER frame around everything, plus one small golden star. Keep the same warm hand-drawn line quality (slightly irregular, not perfectly straight vector lines).
- Image 2 is the STYLE reference for line and colour.

CRITICAL — this must be an EMPTY BACKGROUND TEMPLATE: remove every player. There are ABSOLUTELY NO players, NO faces, NO heads, NO round player tokens or circles, NO name plates, and NO text, NO letters, NO numbers, NO words anywhere in the image (the header and footer banners are left BLANK, empty coloured strips, because text will be drawn on top later). Just the empty pitch, the crowd stand, the blank garnet header and footer banners, the cream margin and the drawn frame.

The PNG must be exactly 1152 x 1536 pixels, portrait.

Write the final PNG to that exact path (${outRel}). Overwrite it if it already exists. Do not ask for confirmation.`

console.log('gerando fundo+header vazio (recriando o barca-escalado sem jogadores/texto)...')
await generateImage({ cwd: CONTEUDO_DIR, prompt: instr, referencias: [refCard, estiloRel], outAbs, timeoutMs: 600000 })
const norm = await normalizarImagem(outAbs, { w: 1152, h: 1536, texto: 'Portrait vertical orientation (3:4)' })
console.log('OK ->', outAbs, '| tamanho:', norm)
