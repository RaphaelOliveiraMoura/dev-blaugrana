// Gera um AVATAR (busto/headshot) de escalacao pra um personagem, desenhado sob medida
// pro token do card (cabeca + ombros preenchendo o quadro) -> sem "sensacao de recorte".
// Usa a ficha como referencia de identidade + o estilo. Salvo em personagens/<id>/avatar.png.
// Feito UMA vez por personagem; o gerar-escalacao usa esse avatar quando existe.
//
//   node gerar-avatar.mjs <id> [<id> ...]
import path from 'node:path'
import { avatarImagem } from './shared/personagem.mjs'
import fs from 'node:fs/promises'
import { readDados } from './server/store.mjs'
import { generateImage } from './server/providers/codex-image.mjs'
import { CONTEUDO_DIR } from './server/config.mjs'
import { estiloImagem } from './shared/caminhos.mjs'

const ids = process.argv.slice(2)
if (!ids.length) { console.error('uso: node gerar-avatar.mjs <id> [<id> ...]'); process.exit(1) }

const d = await readDados()
const byId = Object.fromEntries((d.personagens || []).map((p) => [p.id, p]))
const estiloRel = estiloImagem('rabisco-riso')

for (const id of ids) {
  const p = byId[id]
  if (!p) { console.warn('sem personagem:', id); continue }
  const fichaRel = p.imagem
  const outRel = avatarImagem(id)
  const outAbs = path.join(CONTEUDO_DIR, outRel)
  await fs.mkdir(path.dirname(outAbs), { recursive: true })

  const instr = `Use your built-in image generation tool (gpt-image-2) to create ONE image and save it as a PNG at exactly this relative path inside the current workspace: ${outRel}

You are given 2 input images, pass them to the image tool as INPUT IMAGES with HIGH input fidelity:
- Image 1 is the CHARACTER: keep his EXACT identity (same face shape, hair, skin tone, facial hair, shirt colour and shirt NUMBER). Do NOT copy his full-body pose.
- Image 2 is the STYLE reference: copy its medium, linework, palette and shading.

The PNG must be exactly 1024 x 1024 pixels, square.

IMAGE PROMPT:
A HEAD-AND-SHOULDERS BUST PORTRAIT of this same character, seen from the upper chest up, facing the viewer straight on and CENTERED, the head and shoulders LARGE and FILLING the frame (like a profile-picture / player card headshot), wearing the same jersey and the same shirt number as image 1 clearly visible on the chest, a calm confident lively expression. Flat rabisco cartoon style, bold clean outline, flat colours. The BACKGROUND is a single PLAIN FLAT solid BRIGHT MAGENTA (#ff00ff) fill, completely uniform, no scenery, no pattern, no text, no logos, so it can be keyed out later.

Write the final PNG to that exact path (${outRel}). Overwrite it if it already exists. Do not ask for confirmation.`

  console.log('gerando avatar:', id)
  await generateImage({ cwd: CONTEUDO_DIR, prompt: instr, referencias: [fichaRel, estiloRel], outAbs, timeoutMs: 600000 })
  console.log('OK ->', outRel)
}
