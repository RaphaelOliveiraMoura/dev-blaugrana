// Gera UM painel de quadrinho pelo terminal, com o MESMO caminho do botão da interface.
//
// A lógica de elenco grande (funde as fichas numa cast sheet quando passam do limite, em
// vez de anexar ficha a ficha e travar o Codex) agora vive no comporPrompt do servidor,
// então UI e CLI se comportam igual. Este script é só um atalho de terminal.
//
// uso: node gerar-painel-elenco.mjs <quadrinhoId> [painelNumero]
//      CAST_ONLY=1 node gerar-painel-elenco.mjs <quadrinhoId>   # só (re)monta a cast sheet
import path from 'node:path'
import { readDados } from './server/store.mjs'
import { comporPrompt } from './server/prompts.mjs'
import { resolverModeloImagem } from './server/providers/imagem.mjs'
import { normalizarImagem } from './server/lib/imagem.mjs'
import { CONTEUDO_DIR } from './server/config.mjs'

const quadrinhoId = process.argv[2]
const painelNumero = Number(process.argv[3] || 1)
if (!quadrinhoId) {
  console.error('uso: node gerar-painel-elenco.mjs <quadrinhoId> [painelNumero]')
  process.exit(1)
}

const d = await readDados()
// comporPrompt já monta a cast sheet como efeito colateral quando o elenco é grande.
const pedido = await comporPrompt(d, { tipo: 'painel', quadrinhoId, painelNumero })
const outAbs = path.join(CONTEUDO_DIR, pedido.outRel)

console.log('REFS:', pedido.refs.map((r) => `${r.papel}:${r.rel}`).join(' | '))
if (process.env.CAST_ONLY) process.exit(0)

const modelo = resolverModeloImagem(d)
await modelo.gerar(pedido, outAbs)
const norm = await normalizarImagem(outAbs, pedido.dim)
console.log('OK ->', outAbs, '| tamanho:', norm)
