// Gera um AVATAR (busto/headshot) de escalacao pra um personagem, desenhado sob medida
// pro token do card (cabeca + ombros preenchendo o quadro) -> sem "sensacao de recorte".
// Usa a ficha como referencia de identidade + o estilo. Salvo em personagens/<id>/avatar.png.
// Feito UMA vez por personagem; o gerar-escalacao usa esse avatar quando existe.
//
//   node gerar-avatar.mjs <id> [<id> ...]
import path from 'node:path'
import { existsSync } from 'node:fs'
import { avatarImagem } from './shared/personagem.mjs'
import fs from 'node:fs/promises'
import { readDados } from './server/store.mjs'
import { gerarImagem as generateImage } from './scripts/sprites/modelo.mjs'   // roteia pro modelo efetivo (seletor do studio ou --modelo=)
import { duasReferencias, linhaDoPar } from './scripts/sprites/referencia.mjs'
import { CONTEUDO_DIR } from './server/config.mjs'

const ids = process.argv.slice(2)
if (!ids.length) { console.error('uso: node gerar-avatar.mjs <id> [<id> ...]'); process.exit(1) }

const d = await readDados()
const byId = Object.fromEntries((d.personagens || []).map((p) => [p.id, p]))

for (const id of ids) {
  const p = byId[id]
  if (!p) { console.warn('sem personagem:', id); continue }
  // MESMO PAR DO RESTO DA CASA: o avatar do personagem-padrão (enquadramento do busto, tamanho da
  // cabeça no quadro, corte dos ombros) + a identidade deste personagem. Ver referencia.mjs.
  const { refs, poseDe, identidadeEh } = duasReferencias('avatar', id,
    (rel) => existsSync(path.join(CONTEUDO_DIR, rel)))
  const outRel = avatarImagem(id)
  const outAbs = path.join(CONTEUDO_DIR, outRel)
  await fs.mkdir(path.dirname(outAbs), { recursive: true })

  const instr = `Use your built-in image generation tool (gpt-image-2) to create ONE image and save it as a PNG at exactly this relative path inside the current workspace: ${outRel}

${linhaDoPar({ temPose: !!poseDe, oQueCopiar: 'the FRAMING of the bust: how much of the chest and shoulders is in frame, how large the head sits inside the square, and where the crop falls' })}

The PNG must be exactly 1024 x 1024 pixels, square.

IMAGE PROMPT:
A HEAD-AND-SHOULDERS BUST PORTRAIT of the character described above, seen from the upper chest up, facing the viewer straight on and CENTERED, the head and shoulders LARGE and FILLING the frame (like a profile-picture / player card headshot), wearing his own jersey with his own shirt number clearly visible on the chest, keeping every accessory he wears on his head or face, a calm confident lively expression. Flat rabisco cartoon style, bold clean outline, flat colours. The BACKGROUND is a single PLAIN FLAT solid BRIGHT MAGENTA (#ff00ff) fill, completely uniform, no scenery, no pattern, no text, no logos, so it can be keyed out later.

Write the final PNG to that exact path (${outRel}). Overwrite it if it already exists. Do not ask for confirmation.`

  console.log(`gerando avatar: ${id} · refs: ${poseDe ? `ENQUADRAMENTO de ${poseDe.slug} + ` : ''}${identidadeEh}`)
  await generateImage({ cwd: CONTEUDO_DIR, prompt: instr, referencias: refs, outAbs, timeoutMs: 600000 })
  console.log('OK ->', outRel)
}
