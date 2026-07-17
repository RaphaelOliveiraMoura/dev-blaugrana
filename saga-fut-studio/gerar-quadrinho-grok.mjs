// TESTE: regenera os painéis de um quadrinho usando o GROK (image_gen/image_edit),
// gravando numa pasta à parte para comparar com o resultado do Codex/ChatGPT. Não
// toca nos arquivos reais do projeto.
//
//   node gerar-quadrinho-grok.mjs <quadrinhoId> <outDir> [painelNumero]
//
// Reusa exatamente o mesmo pedido do pipeline (comporPrompt) e o mesmo registro de
// modelos da rota, só forçando modelo=grok e redirecionando a saída pro outDir.
import path from 'node:path'
import fs from 'node:fs/promises'
import { readDados } from './server/store.mjs'
import { comporPrompt } from './server/prompts.mjs'
import { getModeloImagem } from './server/providers/imagem.mjs'

const quadrinhoId = process.argv[2]
const outDir = process.argv[3]
const painelArg = process.argv[4] ? Number(process.argv[4]) : null

if (!quadrinhoId || !outDir) {
  console.error('uso: node gerar-quadrinho-grok.mjs <quadrinhoId> <outDir> [painelNumero]')
  process.exit(1)
}

const d = await readDados()
const q = (d.quadrinhos || []).find((x) => x.id === quadrinhoId)
if (!q) { console.error('quadrinho não encontrado:', quadrinhoId); process.exit(1) }

const modelo = getModeloImagem('grok')
await fs.mkdir(outDir, { recursive: true })
const paineis = (q.paineis || []).filter((p) => painelArg == null || p.numero === painelArg)

console.log(`quadrinho: ${q.id} | formato: ${q.formato} | modelo: ${modelo.nome}`)
console.log(`saída: ${outDir}\n`)

for (const painel of paineis) {
  const pedido = await comporPrompt(d, { tipo: 'painel', quadrinhoId, painelNumero: painel.numero })
  const outAbs = path.join(outDir, `${painel.numero}.png`)
  const refs = pedido.refs.map((r) => `${r.papel}:${r.rel.split('/').pop()}`).join(', ') || '(sem referência)'
  console.log(`painel ${painel.numero}: refs [${refs}] -> gerando...`)
  const t0 = Date.now()
  try {
    await modelo.gerar(pedido, outAbs)
    const st = await fs.stat(outAbs)
    console.log(`  OK ${((Date.now() - t0) / 1000).toFixed(0)}s | ${(st.size / 1024).toFixed(0)}KB -> ${outAbs}\n`)
  } catch (e) {
    console.log(`  FALHOU: ${e.message}\n`)
  }
}
console.log('fim.')
