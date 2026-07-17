// Gera UM painel de quadrinho reusando a lógica de produção do server.
// node gerar-painel.mjs <quadrinhoId> <painelNumero>
import path from 'node:path'
import { readDados } from './server/store.mjs'
import { comporPrompt, instrucaoCodex } from './server/prompts.mjs'
import { generateImage } from './server/providers/codex-image.mjs'
import { normalizarImagem } from './server/lib/imagem.mjs'
import { CONTEUDO_DIR } from './server/config.mjs'

const quadrinhoId = process.argv[2]
const painelNumero = Number(process.argv[3] || 1)
const d = await readDados()
const pedido = await comporPrompt(d, { tipo: 'painel', quadrinhoId, painelNumero })
const outAbs = path.join(CONTEUDO_DIR, pedido.outRel)

console.log('REFS:', pedido.refs.map((r) => `${r.papel}:${r.rel}`).join(' | ') || '(nenhuma)')
await generateImage({
  cwd: CONTEUDO_DIR,
  prompt: instrucaoCodex(pedido),
  referencias: pedido.refs.map((r) => r.rel),
  outAbs,
})
// trava de tamanho do quadrinho (mesmo passo do route /generate/imagem)
const norm = await normalizarImagem(outAbs, pedido.dim)
console.log('OK ->', outAbs, '| tamanho:', norm)
