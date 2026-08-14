#!/usr/bin/env node
// RECONSTRÓI O ACERVO DE SOM a partir de shared/sfx-video.mjs. Os arquivos estão no .gitignore;
// o que se versiona é a ficha.
//
//   node scripts/audio/baixar-sons.mjs            # baixa o que falta
//   node scripts/audio/baixar-sons.mjs --refazer  # baixa tudo de novo
//   node scripts/audio/baixar-sons.mjs --so=apito,buzina
//
// ## Por que normaliza em vez de só baixar
//
// Som de banco vem em qualquer nível: a vaia chega estourando e o vento chega inaudível. Sem
// nivelar, escrever roteiro vira caça ao `vol` certo por tentativa, e o vídeo sai em montanha-russa
// de volume, que é o defeito de áudio que mais denuncia amadorismo. Todo arquivo entra no acervo
// medido e alinhado em -20 LUFS (abaixo do alvo de streaming de propósito: estes são efeitos, e
// precisam de espaço pra a voz passar por cima). Depois disso o `vol` da ficha é ajuste fino de
// intenção, não conserto de nível.

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { SONS } from '../../shared/sfx-video.mjs'

const run = promisify(execFile)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DESTINO = path.resolve(__dirname, '../../../saga-fut/assets/sons')
const LUFS_ALVO = -20

const flags = Object.fromEntries(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
  const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]
}))

async function baixarUm (som) {
  const destino = path.join(DESTINO, som.arquivo)
  if (!flags.refazer && await fs.stat(destino).catch(() => null)) return { id: som.id, pulado: true }

  const r = await fetch(som.url, { headers: { 'User-Agent': 'sagafut/1.0' } })
  if (!r.ok) throw new Error(`${som.id}: HTTP ${r.status}`)
  const bruto = path.join(DESTINO, `.tmp-${som.arquivo}`)
  await fs.writeFile(bruto, Buffer.from(await r.arrayBuffer()))

  // loudnorm em uma passada: bom o bastante pra efeito, e evita medir o arquivo duas vezes.
  await run('ffmpeg', ['-v', 'error', '-y', '-i', bruto,
    '-af', `loudnorm=I=${LUFS_ALVO}:TP=-1.5:LRA=11`,
    '-ar', '44100', '-ac', '2', '-b:a', '160k', destino])
  await fs.rm(bruto, { force: true })

  const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
    '-of', 'csv=p=0', destino])
  return { id: som.id, seg: +(+stdout.trim()).toFixed(1) }
}

async function creditos (lista) {
  // Só CC0 hoje, então nada aqui é obrigatório. O arquivo existe assim mesmo, porque no dia em que
  // entrar o primeiro CC-BY o crédito tem que já ter um lugar, e não virar decisão de última hora.
  const linhas = ['# Créditos de som', '',
    'Acervo em `saga-fut/assets/sons/`, reconstruído por `node scripts/audio/baixar-sons.mjs`.',
    'Fichas em `saga-fut-studio/shared/sfx-video.mjs`.', '']
  const porLic = {}
  for (const s of lista) (porLic[s.licenca] ||= []).push(s)
  for (const [lic, sons] of Object.entries(porLic)) {
    linhas.push(`## ${lic.toUpperCase()}`, '')
    if (lic === 'cc0') linhas.push('Domínio público. Crédito NÃO é obrigatório; a lista existe pra rastreabilidade.', '')
    else linhas.push('**Crédito OBRIGATÓRIO na descrição do post.**', '')
    for (const s of sons) linhas.push(`- **${s.id}** · "${s.titulo}" por ${s.autor} · ${s.pagina}`)
    linhas.push('')
  }
  await fs.writeFile(path.join(DESTINO, 'CREDITOS.md'), linhas.join('\n'))
}

async function main () {
  await fs.mkdir(DESTINO, { recursive: true })
  const so = flags.so ? String(flags.so).split(',') : null
  // `local: true` = arquivo que já vive no repo (as trilhas do Kevin MacLeod, baixadas pelo
  // baixar-musicas). Não tem url e não deve ser buscado.
  const lista = SONS.filter(s => !s.local && (!so || so.includes(s.id)))

  let ok = 0, pulados = 0
  for (const som of lista) {
    try {
      const r = await baixarUm(som)
      if (r.pulado) { pulados++; process.stdout.write(`  = ${som.id}\n`) }
      else { ok++; process.stdout.write(`  + ${som.id}  (${r.seg}s, ${LUFS_ALVO} LUFS)\n`) }
    } catch (e) { console.error(`  ! ${som.id}: ${e.message}`) }
  }
  await creditos(lista)
  console.log(`\n${ok} baixado(s), ${pulados} já existia(m). Acervo em ${path.relative(process.cwd(), DESTINO)}`)
}

main().catch(e => { console.error(e); process.exit(1) })
