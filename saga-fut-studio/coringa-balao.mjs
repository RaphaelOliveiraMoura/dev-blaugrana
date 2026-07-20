// Desenha um BALÃO rabiscado com texto por cima de um painel (arte base MUDA).
// A arte é gerada uma vez; aqui você só troca o texto, sem regerar a imagem.
// Mesma lógica da aba "Balão" do studio (server/lib/balao.mjs).
//
//   node coringa-balao.mjs <quadrinhoId> <painelNumero> "TEXTO DO BALÃO"
//   node coringa-balao.mjs coringas-torcedor 1 "sei não..."
//
// Saída: quadrinhos/<id>/posts/balao-<painel>.png  (não sobrescreve a arte base)
import path from 'node:path'
import fs from 'node:fs'
import { readDados } from './server/store.mjs'
import { CONTEUDO_DIR } from './server/config.mjs'
import { renderBalao } from './server/lib/balao.mjs'
import { painelImagem, painelBalao } from './shared/caminhos.mjs'

const quadrinhoId = process.argv[2]
const painelNumero = Number(process.argv[3] || 1)
const texto = (process.argv[4] || '').trim()
if (!quadrinhoId || !texto) {
  console.error('uso: node coringa-balao.mjs <quadrinhoId> <painelNumero> "TEXTO"')
  process.exit(1)
}

const d = await readDados()
const q = d.quadrinhos.find((x) => x.id === quadrinhoId)
if (!q) throw new Error(`quadrinho não encontrado: ${quadrinhoId}`)
if (!q.paineis.some((p) => p.numero === painelNumero)) throw new Error(`painel ${painelNumero} não existe em ${quadrinhoId}`)

const baseAbs = path.join(CONTEUDO_DIR, painelImagem(quadrinhoId, painelNumero))
if (!fs.existsSync(baseAbs)) throw new Error(`arte base não gerada ainda: ${baseAbs}`)
const outAbs = path.join(CONTEUDO_DIR, painelBalao(quadrinhoId, painelNumero))

const { fontSize, lines } = await renderBalao({ baseAbs, texto, outAbs })
console.log(`OK -> ${outAbs}`)
console.log(`   fonte ${fontSize}px, ${lines.length} linha(s): ${JSON.stringify(lines)}`)
