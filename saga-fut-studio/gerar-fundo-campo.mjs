// Gera UMA vez o fundo de campo rabisco (asset fixo) pro card de escalacao.
// Campo vazio top-down no traco da casa; depois o gerar-escalacao.mjs compoe
// tokens + texto por cima dele. Assim junta o charme desenhado com a consistencia.
//
//   node gerar-fundo-campo.mjs
import path from 'node:path'
import fs from 'node:fs/promises'
import { readDados } from './server/store.mjs'
import { generateImage } from './server/providers/codex-image.mjs'
import { normalizarImagem } from './server/lib/imagem.mjs'
import { CONTEUDO_DIR } from './server/config.mjs'
import { estiloImagem } from './shared/caminhos.mjs'

// uso: node gerar-fundo-campo.mjs [sufixo] ["descricao extra do gramado"]
const sufixo = process.argv[2] ? '-' + process.argv[2] : ''
const extra = process.argv[3] || 'lush green grass with subtle darker mowing stripes'
const outRel = `assets/campo-rabisco${sufixo}.png`
const outAbs = path.join(CONTEUDO_DIR, outRel)
await fs.mkdir(path.dirname(outAbs), { recursive: true })

const d = await readDados()
const estilo = (d.estilos || []).find((e) => e.id === 'rabisco-riso')
const stylePrefix = estilo.stylePrefix
const estiloRel = estiloImagem('rabisco-riso')

const instr = `Use your built-in image generation tool (gpt-image-2) to create ONE image and save it as a PNG at exactly this relative path inside the current workspace: ${outRel}

You are given 1 input image: a STYLE reference. Copy ONLY its medium, linework, line weight, palette and shading, never any subject from it.

The PNG must be exactly 1152 x 1536 pixels. Never any other size.

IMAGE PROMPT:
${stylePrefix}, an EMPTY football pitch seen from directly ABOVE (top-down bird's-eye view), portrait orientation, ${extra}, with clean off-white pitch lines (outer boundary, a halfway line across the middle, a centre circle, and a large penalty box at the top and at the bottom), the field fills the ENTIRE frame edge to edge. Absolutely NO players, NO people, NO ball, NO text, NO numbers, NO letters, NO logos, NO badges, NO scoreboard, nothing but the empty green pitch with plenty of open space.

Write the final PNG to that exact path (${outRel}). Overwrite it if it already exists. Do not ask for confirmation.`

console.log('gerando fundo de campo rabisco...')
await generateImage({ cwd: CONTEUDO_DIR, prompt: instr, referencias: [estiloRel], outAbs, timeoutMs: 600000 })
const norm = await normalizarImagem(outAbs, { w: 1152, h: 1536, texto: 'Portrait vertical orientation (3:4)' })
console.log('OK ->', outAbs, '| tamanho:', norm)
