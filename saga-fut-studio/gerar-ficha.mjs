// Gera a FICHA (character sheet) de UM personagem, reusando a lógica do server.
// node gerar-ficha.mjs <personagemId>
import path from 'node:path'
import { readDados } from './server/store.mjs'
import { comporPrompt, instrucaoCodex } from './server/prompts.mjs'
import { generateImage } from './server/providers/codex-image.mjs'
import { CONTEUDO_DIR } from './server/config.mjs'

const personagemId = process.argv[2]
if (!personagemId) {
  console.error('uso: node gerar-ficha.mjs <personagemId>')
  process.exit(1)
}
const d = await readDados()
const pedido = await comporPrompt(d, { tipo: 'ficha', personagemId })
const outAbs = path.join(CONTEUDO_DIR, pedido.outRel)

console.log('REFS:', pedido.refs.map((r) => `${r.papel}:${r.rel}`).join(' | ') || '(nenhuma)')
await generateImage({
  cwd: CONTEUDO_DIR,
  prompt: instrucaoCodex(pedido),
  referencias: pedido.refs.map((r) => r.rel),
  outAbs,
})
console.log('OK ->', outAbs)
