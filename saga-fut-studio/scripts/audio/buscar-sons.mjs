#!/usr/bin/env node
// BUSCA DE SOM LIVRE — a única porta pra achar áudio pro acervo.
//
// POR QUE EXISTE: som é o material mais fácil de trazer problema jurídico pra dentro do projeto,
// e o estrago não aparece no render, aparece meses depois num vídeo desmonetizado ou mutado. Este
// script só enxerga o que é CC0 (domínio público, sem exigência de crédito), então o caminho fácil
// e o caminho seguro são o MESMO caminho. Quem quiser CC-BY passa `--licenca=cc0,by` de propósito,
// e aí assume o crédito obrigatório.
//
// A fonte é a API pública do Openverse (buscador oficial da Creative Commons), que agrega
// Freesound, Wikimedia e Jamendo. Não precisa de conta nem de chave: foi por isso que ela venceu o
// Freesound direto, cuja API exige cadastro e token.
//
//   node scripts/audio/buscar-sons.mjs "crowd boo"                 # lista candidatos
//   node scripts/audio/buscar-sons.mjs "crowd boo" --n=10          # mais resultados
//   node scripts/audio/buscar-sons.mjs "crowd boo" --json          # pra script
//   node scripts/audio/buscar-sons.mjs --kit                       # roda a lista de termos do kit
//
// O termo vai em INGLÊS. O acervo é internacional e "vaia" devolve nada enquanto "crowd boo"
// devolve 31 resultados. A tabela de termos que funcionam está em saga-fut/docs/AUDIO.md.

const API = 'https://api.openverse.org/v1/audio/'
const UA = { 'User-Agent': 'sagafut/1.0 (acervo de som do @devblaugrana)' }

// Os termos do kit base. Cada linha é `termo em inglês | pra que serve aqui`, e a segunda metade é
// o que faz o acervo ser reusável: som sem descrição de USO vira pasta que ninguém abre.
export const TERMOS_KIT = [
  ['stadium crowd ambience', 'leito de fundo de qualquer cena em estádio'],
  ['crowd cheer', 'gol, entrada em campo, comemoração'],
  ['crowd boo', 'vaia: dirigente, arbitragem, jogador saindo'],
  ['applause', 'aplauso educado, apresentação, coletiva'],
  ['referee whistle', 'apito: início, fim, falta'],
  ['air horn', 'buzina de torcida, pontuação cômica'],
  ['vuvuzela', 'torcida caricata'],
  ['door knock', 'alguém chegando, batida na porta'],
  ['door creak open', 'porta abrindo, revelação'],
  ['phone ringtone', 'celular tocando no meio da cena'],
  ['camera shutter', 'fotógrafo, coletiva, flash'],
  ['footsteps walking', 'chegada e saída de personagem'],
  ['cash register', 'dinheiro, preço, negociação'],
  ['clock ticking', 'espera, silêncio constrangedor'],
  ['wind ambience', 'vazio, abandono, deserto'],
  ['rain ambience', 'melancolia, derrota'],
  ['boing cartoon', 'pontuação cômica'],
  ['swoosh whoosh', 'transição, entrada rápida'],
]

function args () {
  const a = process.argv.slice(2)
  const flags = Object.fromEntries(a.filter(x => x.startsWith('--')).map(x => {
    const [k, v] = x.replace(/^--/, '').split('=')
    return [k, v ?? true]
  }))
  return { termo: a.filter(x => !x.startsWith('--')).join(' '), flags }
}

export async function buscar (termo, { n = 5, licenca = 'cc0' } = {}) {
  const url = `${API}?q=${encodeURIComponent(termo)}&license=${licenca}&page_size=${n}`
  const r = await fetch(url, { headers: UA })
  if (!r.ok) throw new Error(`openverse ${r.status} em "${termo}"`)
  const d = await r.json()
  return (d.results || []).map(x => ({
    id: x.id,
    titulo: x.title,
    licenca: x.license + (x.license_version ? ' ' + x.license_version : ''),
    autor: x.creator || '',
    // duração vem em MILISSEGUNDOS na API, e já passou batido uma vez: um "8193" lido como
    // segundos vira 2h de ambiência num vídeo de 40s.
    seg: x.duration ? +(x.duration / 1000).toFixed(1) : null,
    url: x.url,
    pagina: x.foreign_landing_url,
    fonte: x.source,
  })).filter(x => x.url)
}

async function main () {
  const { termo, flags } = args()
  const n = +(flags.n || 5)
  const licenca = flags.licenca || 'cc0'

  if (flags.kit) {
    const saida = []
    for (const [t, uso] of TERMOS_KIT) {
      const res = await buscar(t, { n, licenca }).catch(e => { console.error(`  ! ${t}: ${e.message}`); return [] })
      saida.push({ termo: t, uso, candidatos: res })
      if (!flags.json) {
        console.log(`\n== ${t}  (${uso})`)
        res.forEach((x, i) => console.log(`  ${i}. [${x.seg ?? '?'}s] ${x.titulo}  · ${x.licenca} · ${x.fonte}`))
      }
    }
    if (flags.json) console.log(JSON.stringify(saida, null, 2))
    return
  }

  if (!termo) {
    console.log('uso: node scripts/audio/buscar-sons.mjs "<termo em INGLES>" [--n=5] [--licenca=cc0] [--json]')
    console.log('     node scripts/audio/buscar-sons.mjs --kit')
    process.exit(1)
  }

  const res = await buscar(termo, { n, licenca })
  if (flags.json) return console.log(JSON.stringify(res, null, 2))
  if (!res.length) return console.log(`nada em CC0 pra "${termo}". Tente outro termo em inglês, ou --licenca=cc0,by (crédito vira obrigatório).`)
  res.forEach((x, i) => {
    console.log(`${i}. [${x.seg ?? '?'}s] ${x.titulo}`)
    console.log(`   ${x.licenca} · ${x.autor || 'sem autor declarado'} · ${x.fonte}`)
    console.log(`   ${x.url}`)
  })
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch(e => { console.error(e.message); process.exit(1) })
