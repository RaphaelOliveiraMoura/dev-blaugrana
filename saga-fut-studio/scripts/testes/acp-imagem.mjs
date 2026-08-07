#!/usr/bin/env node
// Smoke do provider Cursor (ACP / GenerateImage).
// Uso:
//   node scripts/testes/acp-imagem.mjs
//   node scripts/testes/acp-imagem.mjs --ref=/caminho/base.png --out=/tmp/x.png
import path from 'node:path'
import { mkdirSync, existsSync, statSync } from 'node:fs'
import { generateImage, instrucaoCursor } from '../../server/providers/cursor-image.mjs'

const args = Object.fromEntries(
  process.argv.slice(2)
    .filter((a) => a.startsWith('--'))
    .map((a) => {
      const [k, ...rest] = a.slice(2).split('=')
      return [k, rest.join('=') || true]
    }),
)

const cwd = process.cwd()
const outAbs = path.resolve(String(args.out || path.join(cwd, 'tmp', 'cursor-acp-teste.png')))
const ref = args.ref ? path.resolve(String(args.ref)) : null
const timeoutMs = Number(args.timeout || 240_000)
const referencias = ref ? [ref] : []

mkdirSync(path.dirname(outAbs), { recursive: true })
if (ref && !existsSync(ref)) {
  console.error(`referência não existe: ${ref}`)
  process.exit(1)
}

const prompt = [
  'caricatura de jogador de futebol em estilo cartoon flat, camisa azul e grená,',
  'fundo branco limpo, corpo inteiro, olhando para a direita, pose idle simples.',
].join(' ')

try {
  const r = await generateImage({
    cwd,
    prompt: instrucaoCursor({ prompt, referencias, outAbs, formato: '3:4' }),
    referencias,
    outAbs,
    timeoutMs,
  })
  const st = statSync(outAbs)
  console.log(JSON.stringify({ ok: true, out: outAbs, bytes: st.size, logTail: String(r.log || '').split('\n').slice(-6) }, null, 2))
} catch (e) {
  console.error(e.message || e)
  process.exit(1)
}
