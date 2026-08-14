#!/usr/bin/env node
// GRAVA `olhaPara` NO ACERVO — a orientação de cada folha, medida da própria arte.
//
//   node scripts/sprites/medir-orientacao.mjs <slug>       # um personagem
//   node scripts/sprites/medir-orientacao.mjs --acervo     # todo mundo
//   node scripts/sprites/medir-orientacao.mjs --acervo --so-listar
//
// O motor lê esse campo pra decidir o espelho (montar-cena) e o invariante compara com a direção
// do movimento. Enquanto o campo não existir, vale a convenção antiga (toda folha olha pra direita),
// que é o comportamento de sempre — então rodar isto só melhora, nunca quebra.
//
// Roda de graça e sem gerar nada. É barato o bastante pra chamar depois de todo slice.

import fs from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { orientacaoDe, orientacaoDaFolha } from './orientacao.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CONTEUDO = path.resolve(__dirname, '../../../saga-fut')
const PERS = path.join(CONTEUDO, 'personagens')

const flags = process.argv.slice(2).filter((a) => a.startsWith('--'))
const soListar = flags.includes('--so-listar')
const alvo = process.argv.slice(2).find((a) => !a.startsWith('--'))

async function lerJson (f) { try { return JSON.parse(await fs.readFile(f, 'utf8')) } catch { return null } }
async function gravar (f, obj) { if (!soListar) await fs.writeFile(f, JSON.stringify(obj, null, 2)) }

async function medirPersonagem (slug) {
  const base = path.join(PERS, slug)
  const linhas = []

  // --- rigs (andar, correr, idle): folha inteira, voto majoritário
  for (const tipo of ['andar', 'correr', 'idle']) {
    const dir = path.join(base, 'rigs', tipo)
    if (!existsSync(dir)) continue
    const quadros = (await fs.readdir(dir)).filter((f) => /\.png$/.test(f) && !f.startsWith('_')).sort()
    if (!quadros.length) continue
    const r = await orientacaoDaFolha(quadros.map((q) => path.join(dir, q)))
    const metaF = path.join(dir, '_meta.json')
    const meta = (await lerJson(metaF)) || {}
    meta.olhaPara = r.lado
    await gravar(metaF, meta)
    linhas.push({ peca: `rig/${tipo}`, lado: r.lado, votos: r.votos, divergente: r.divergente })
  }

  // --- ações (folhas de gesto)
  const dirAcoes = path.join(base, 'acoes')
  if (existsSync(dirAcoes)) {
    for (const gesto of await fs.readdir(dirAcoes)) {
      const dir = path.join(dirAcoes, gesto)
      const quadros = (await fs.readdir(dir).catch(() => [])).filter((f) => /\.png$/.test(f) && !f.startsWith('_')).sort()
      if (!quadros.length) continue
      const r = await orientacaoDaFolha(quadros.map((q) => path.join(dir, q)))
      const metaF = path.join(dir, '_meta.json')
      const meta = (await lerJson(metaF)) || {}
      meta.olhaPara = r.lado
      await gravar(metaF, meta)
      linhas.push({ peca: `acao/${gesto}`, lado: r.lado, votos: r.votos, divergente: r.divergente })
    }
  }

  // --- poses únicas: um `_meta.json` na pasta, mapa nome -> { olhaPara }
  const dirPoses = path.join(base, 'poses')
  if (existsSync(dirPoses)) {
    const metaF = path.join(dirPoses, '_meta.json')
    const meta = (await lerJson(metaF)) || {}
    let mudou = false
    for (const f of await fs.readdir(dirPoses)) {
      if (!/\.png$/.test(f) || f.startsWith('_')) continue
      const nome = f.replace(/\.png$/, '')
      const r = await orientacaoDe(path.join(dirPoses, f)).catch(() => null)
      if (!r) continue
      // PRESERVA O QUE NÃO É MEU. Este `_meta.json` é compartilhado: o `medir-escala-pose` grava
      // `aperto` no mesmo arquivo, e substituir o objeto inteiro apagava a correção de escala de
      // todas as poses do acervo de uma vez, em silêncio. O vigia pegou; um olho humano não pegaria.
      meta[nome] = { ...(meta[nome] || {}), olhaPara: r.lado, desvio: r.desvio, confianca: r.confianca }
      mudou = true
      linhas.push({ peca: `pose/${nome}`, lado: r.lado, confianca: r.confianca })
    }
    if (mudou) await gravar(metaF, meta)
  }
  return linhas
}

async function main () {
  const slugs = alvo ? [alvo] : (await fs.readdir(PERS)).filter((d) => existsSync(path.join(PERS, d, 'base.png')))
  let viradas = 0, divergentes = 0, total = 0
  for (const slug of slugs) {
    const linhas = await medirPersonagem(slug).catch((e) => { console.error(`  ! ${slug}: ${e.message}`); return [] })
    if (!linhas.length) continue
    const fora = linhas.filter((l) => l.lado === 'esquerda')
    const div = linhas.filter((l) => l.divergente)
    total += linhas.length; viradas += fora.length; divergentes += div.length
    if (alvo || fora.length || div.length) {
      console.log(`\n${slug}`)
      for (const l of linhas) {
        const marca = l.divergente ? ' <- QUADROS DIVERGEM DENTRO DA FOLHA' : (l.lado === 'esquerda' ? ' <- desenhada VIRADA (o motor compensa)' : '')
        console.log(`  ${l.peca.padEnd(22)} ${String(l.lado).padEnd(11)}${l.confianca ? ' ' + l.confianca : ''}${marca}`)
      }
    }
  }
  console.log(`\n${total} peça(s) medida(s) · ${viradas} desenhada(s) virada(s) pra esquerda · ${divergentes} com quadros divergentes${soListar ? '  (nada gravado: --so-listar)' : ''}`)
  if (divergentes) console.log('quadro divergente dentro da MESMA folha é defeito de arte: refaça a folha (o motor não tem como compensar meia folha).')
}

main().catch((e) => { console.error(e); process.exit(1) })
