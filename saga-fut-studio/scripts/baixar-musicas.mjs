// Acervo de trilha dos quadrinhos: o CATÁLOGO é versionado, os MP3 não.
//
// POR QUE ESTE ARQUIVO EXISTE: `*.mp3` está no .gitignore (mídia pesada), então o que estava em
// `assets/musica-quadrinhos/` era acervo invisível: cinco arquivos que ninguém sabia de onde
// vieram, sob que licença, nem como recuperar num clone novo. Baixar na mão resolve uma vez e
// deixa o mesmo buraco pro próximo. Aqui a lista mora no código, com a licença de cada faixa, e
// `node scripts/baixar-musicas.mjs` reconstrói a pasta inteira do zero.
//
//   node scripts/baixar-musicas.mjs           # baixa o que falta (pula o que já existe)
//   node scripts/baixar-musicas.mjs --lista   # só imprime o catálogo, sem baixar
//   node scripts/baixar-musicas.mjs --refazer # rebaixa tudo, por cima
//
// SOBRE "MÚSICA VIRAL SEM DIREITO AUTORAL": as trends do TikTok (artista comercial) são
// protegidas SEMPRE, e o que a rede te deixa usar no editor dela não vale fora dela: o vídeo
// exportado do studio é upload, não remix na plataforma, então a licença tem que vir do arquivo.
// O que é viral E livre ao mesmo tempo é uma lista curta e específica: as faixas do Kevin MacLeod
// que viraram meme sound por conta própria. "Monkeys Spinning Monkeys" passou de 31 bilhões de
// plays só no primeiro semestre de 2021; "Fluffing a Duck" foi ao Globo de Ouro de 2024. São essas.
//
// ATRIBUIÇÃO É OBRIGATÓRIA (CC BY 4.0). O `CREDITOS.md` gerado ao lado dos arquivos traz a linha
// pronta pra colar na descrição do post. Sem ela o uso é irregular, por mais que ninguém reclame.
//
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { CATALOGO, TONS, arquivoDe, creditoDe } from '../shared/musica-quadrinho.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DESTINO = path.resolve(__dirname, '../../saga-fut/assets/musica-quadrinhos')
const BASE = 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/'

// O catálogo (ficha de cada faixa) mora em shared/musica-quadrinho.mjs, porque o studio precisa
// dele também: é o que o modal de escolha mostra. Duas cópias da mesma lista seria a ficha da
// tela discordando do que o script baixou.

async function baixar(m, refazer) {
  const destino = path.join(DESTINO, arquivoDe(m))
  if (!refazer) {
    const ja = await fs.stat(destino).catch(() => null)
    if (ja?.size > 0) return { estado: 'existe', bytes: ja.size }
  }
  const res = await fetch(BASE + encodeURIComponent(m.arquivo || `${m.titulo}.mp3`))
  if (!res.ok) throw new Error(`HTTP ${res.status} em "${m.titulo}"`)
  const buf = Buffer.from(await res.arrayBuffer())
  // Servidor que responde 200 com página de erro em vez de áudio é o modo de falhar silencioso
  // aqui: o arquivo aparece na lista do studio e só quebra na hora do render.
  if (buf.length < 20000 || buf.subarray(0, 5).toString() === '<!DOC') {
    throw new Error(`resposta não é MP3 em "${m.titulo}" (${buf.length} bytes)`)
  }
  await fs.writeFile(destino, buf)
  return { estado: 'baixou', bytes: buf.length }
}

async function main() {
  const args = process.argv.slice(2)
  const refazer = args.includes('--refazer')

  if (args.includes('--lista')) {
    let tomAtual = null
    for (const m of CATALOGO) {
      if (m.tom !== tomAtual) {
        tomAtual = m.tom
        console.log(`\n[${tomAtual}] ${TONS[tomAtual]?.desc || ''}`)
      }
      console.log(`  ${m.viral ? '★' : ' '} ${arquivoDe(m).padEnd(42)} ${m.dur.padStart(5)}  ${m.nota}`)
    }
    console.log(`\n${CATALOGO.length} faixas, ${CATALOGO.filter((m) => m.viral).length} marcadas como meme reconhecível (★).`)
    return
  }

  await fs.mkdir(DESTINO, { recursive: true })
  let baixadas = 0, existentes = 0, bytes = 0
  const falhas = []

  for (const m of CATALOGO) {
    try {
      const r = await baixar(m, refazer)
      bytes += r.bytes
      if (r.estado === 'baixou') { baixadas++; console.log(`  ✓ ${arquivoDe(m)}  (${(r.bytes / 1048576).toFixed(1)} MB)`) }
      else { existentes++; console.log(`  · ${arquivoDe(m)}  já existe`) }
    } catch (e) {
      falhas.push({ m, erro: e.message })
      console.log(`  ✗ ${arquivoDe(m)}  ${e.message}`)
    }
  }

  const creditos = [
    '# Créditos da trilha dos quadrinhos',
    '',
    'GERADO por `node scripts/baixar-musicas.mjs`. Não edite na mão: a ficha de cada faixa mora',
    'em `saga-fut-studio/shared/musica-quadrinho.mjs`.',
    '',
    'Todas as faixas são de **Kevin MacLeod** (incompetech.com), sob **Creative Commons: By',
    'Attribution 4.0**. A licença permite uso comercial em qualquer rede social, e **exige crédito**.',
    '',
    'Cole na descrição do post a linha da faixa que você usou. Uma linha basta, ela cobre a',
    'exigência inteira:',
    '',
    ...CATALOGO.map((m) => `- \`${arquivoDe(m)}\`\n  ${creditoDe(m)}`),
    '',
    '## Se der claim de Content ID',
    '',
    'Acontece, e não quer dizer que o uso é irregular: terceiros registraram faixas do MacLeod em',
    'agregadores antes dele ter acesso direto ao Content ID. A licença CC BY 4.0 é a defesa, e o',
    'link dela é a prova. Conteste com o link da faixa no incompetech.com.',
    '',
    'Para eliminar o risco de vez numa peça importante, o MacLeod vende uma licença sem atribuição',
    'em incompetech.com, e Pixabay Music é a alternativa sem crédito obrigatório (mas sem as faixas',
    'que viraram meme, que é justamente o que este acervo tem).',
    '',
  ].join('\n')
  await fs.writeFile(path.join(DESTINO, 'CREDITOS.md'), creditos, 'utf-8')

  console.log(`\n${baixadas} baixadas, ${existentes} já existiam, ${(bytes / 1048576).toFixed(0)} MB no total.`)
  console.log('CREDITOS.md atualizado (a atribuição é obrigatória, ver o arquivo).')
  if (falhas.length) {
    console.log(`\n${falhas.length} falharam:`)
    falhas.forEach((f) => console.log(`  ${f.m.titulo}: ${f.erro}`))
    process.exitCode = 1
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
