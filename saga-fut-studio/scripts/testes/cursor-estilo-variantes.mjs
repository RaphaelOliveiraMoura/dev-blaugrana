#!/usr/bin/env node
// Lote A/B do provider Cursor no painel 3 do o-dia-bernabeu.
// Hipóteses de maior impacto (uma variável por variante quando der):
//   B  anexar ref de ESTILO (hoje o painel só leva a ficha)
//   C  reforço anti-pose (a ficha não pode ditar o gesto)
//   D  B + C juntos
// Saída: saga-fut/quadrinhos/o-dia-bernabeu/paineis/_testes/
import { mkdir, writeFile, copyFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
import { generateImage, instrucaoCursor } from '../../server/providers/cursor-image.mjs'
import { PAPEL_DO_ANEXO } from '../../server/prompts.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../../..')
const CONTEUDO = path.join(ROOT, 'saga-fut')
const OUT_DIR = path.join(CONTEUDO, 'quadrinhos/o-dia-bernabeu/paineis/_testes')
const FICHA = path.join(CONTEUDO, 'personagens/ronaldinho-riso/base.png')
const ESTILO = path.join(CONTEUDO, 'estilos/rabisco-riso.png')
const ATUAL = path.join(CONTEUDO, 'quadrinhos/o-dia-bernabeu/paineis/3.png')

const CORPO = `crude lazy meme webcomic, drawn carelessly on purpose. CONSTRUCTION, follow exactly: EXACTLY the same height and body proportions as the STYLE reference, about 3 heads tall, a BIG head on a short compact body, short arms with small simple hands. Never taller and never lankier than the style reference. FACE, always built the same way: large plain white eyes with small dot pupils and heavy angular eyelid lines; simple thick eyebrows; a small simple nose of one or two strokes; the mouth does the acting. Hair and any facial hair are ONE solid flat silhouette shape: never individual strands, never drawn hairs, never stubble or beard texture. Skin and clothes are FLAT areas of colour. The only shading allowed is a flat block of grey tone like the style reference: never soft gradients, never airbrushed or rendered shading, never photographic texture, never rendered highlights. An even dark outline of uniform weight throughout. No cast shadow on the ground. Soft washed risograph inks throughout in dusty garnet, faded blue-gray and warm skin tones, flat and slightly faded, gentle off-register printing feel. This is a cartoon boneco, NEVER a portrait.

comic panel. On the pitch at night, floodlights. The Brazilian number 10 star is mid solo run on the VIEWER'S LEFT drifting toward goal on the VIEWER'S RIGHT. He has just skipped past TWO opposing defenders in plain white kits with dark shorts (generic extras with simple faces, NO crests). The ball is at his feet with motion lines. Packed blurred stands behind. Flat cartoon style. NO club crests, NO badges, NO logos, NO readable text anywhere. EMOTION: playful focus, slight smile, body loose like he is dancing, not straining. a caption box reads: "AOS 59, RONALDINHO RECEBEU NA ESQUERDA.". a caption box reads: "PASSOU POR DOIS E MANDOU NO CANTO: 0 A 2."

COMIC PANEL: expressive exaggerated meme faces, punchy readable staging. BRAND FRAMING (every panel, follow exactly): the ENTIRE artwork sits INSIDE a single CLOSED panel frame, a thick bold black border with ROUNDED corners on ALL FOUR sides, with a small even margin of cream paper between the frame and the edge of the image. A small circular badge stamp holding a plain golden star sits ALWAYS fully INSIDE the top-RIGHT corner of the framed artwork. Portrait vertical orientation: the PNG must be exactly 1152 x 1536 pixels.`

const ANTI_POSE = `
CRITICAL ACTION CONSTRAINT (overrides the identity sheet pose): the number 10 MUST be shown mid-dribble / mid-run with the ball at his feet, body angled, one leg pushing off. NEVER standing straight, NEVER frontal T-pose, NEVER arms hanging symmetrically at his sides. The identity sheet is ONLY for who he is (face, hair, headband, goatee, jersey number 10). The ACTION comes only from this prompt.
`

function papeis(refs) {
  return refs.map((r, i) => (PAPEL_DO_ANEXO[r.papel] || PAPEL_DO_ANEXO.personagem)(i + 1)).join('\n')
}

function regraEstilo(refs) {
  const estilo = refs.findIndex((r) => r.papel === 'estilo') + 1
  const personagem = refs.findIndex((r) => r.papel === 'personagem') + 1
  if (!estilo || !personagem) return ''
  return `
The two references answer DIFFERENT questions:
- HOW this image is drawn comes ONLY from Image ${estilo}: medium, line work, color, shading, proportions, eye construction. The result must look hand-drawn in exactly that style.
- WHO the star is comes ONLY from Image ${personagem}: face shape, curly hair, headband, goatee, earring, jersey number 10.
If they disagree on HOW to draw, Image ${estilo} wins. Never copy the standing neutral pose of Image ${personagem}.
`
}

const VARIANTES = [
  {
    id: 'B-estilo-ultimo',
    desc: 'ficha + estilo (estilo por último, manda no COMO)',
    refs: [
      { abs: FICHA, papel: 'personagem' },
      { abs: ESTILO, papel: 'estilo' },
    ],
    extra: '',
  },
  {
    id: 'C-anti-pose',
    desc: 'só ficha + reforço anti-pose (sem estilo)',
    refs: [{ abs: FICHA, papel: 'personagem' }],
    extra: ANTI_POSE,
  },
  {
    id: 'D-estilo-mais-anti-pose',
    desc: 'ficha + estilo + anti-pose (combo)',
    refs: [
      { abs: FICHA, papel: 'personagem' },
      { abs: ESTILO, papel: 'estilo' },
    ],
    extra: ANTI_POSE,
  },
]

const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7)
const lista = only ? VARIANTES.filter((v) => v.id === only || v.id.startsWith(only)) : VARIANTES

await mkdir(OUT_DIR, { recursive: true })
if (existsSync(ATUAL)) {
  await copyFile(ATUAL, path.join(OUT_DIR, 'A-baseline-atual.png'))
}

const manifest = []
console.log(`>>> ${lista.length} variantes → ${OUT_DIR}`)

// paralelo: o provider já tem teto de 4
await Promise.all(lista.map(async (v) => {
  const outAbs = path.join(OUT_DIR, `${v.id}.png`)
  const refsAbs = v.refs.map((r) => r.abs)
  for (const r of refsAbs) {
    if (!existsSync(r)) throw new Error(`ref ausente: ${r}`)
  }
  const prompt = [
    CORPO,
    v.extra,
    papeis(v.refs),
    regraEstilo(v.refs),
  ].filter(Boolean).join('\n')

  const texto = instrucaoCursor({
    prompt,
    referencias: refsAbs,
    outAbs,
    formato: '1152:1536',
  })

  console.log(`→ ${v.id}: ${v.desc}`)
  const t0 = Date.now()
  try {
    await generateImage({
      cwd: CONTEUDO,
      prompt: texto,
      referencias: refsAbs,
      outAbs,
      timeoutMs: 600000,
    })
    const secs = Math.round((Date.now() - t0) / 1000)
    console.log(`OK ${v.id} ${secs}s`)
    manifest.push({ id: v.id, desc: v.desc, ok: true, secs, out: path.relative(ROOT, outAbs) })
  } catch (e) {
    console.error(`FAIL ${v.id}:`, e.message)
    manifest.push({ id: v.id, desc: v.desc, ok: false, error: e.message })
  }
}))

await writeFile(path.join(OUT_DIR, 'manifest.json'), JSON.stringify({
  quando: new Date().toISOString(),
  alvo: 'painel 3 · o-dia-bernabeu · modelo cursor',
  hipotese: [
    'B: falta a ref de estilo no painel (hoje só a ficha)',
    'C: a ficha está ditando pose neutra; reforço textual basta?',
    'D: as duas juntas',
  ],
  variantes: manifest,
}, null, 2))

console.log('>>> manifesto em', path.join(OUT_DIR, 'manifest.json'))
