// TODO CARROSSEL QUE NÃO DIZ DE QUEM ELE É.
//
// A régua mora em shared/nome-na-arte.mjs (leia lá o porquê e a calibragem). Este script é a
// FOLHA DE TRABALHO: mostra os painéis lado a lado com o laudo, porque o conserto é editorial e
// ninguém reescreve legenda olhando só para um id.
//
//   ANÔNIMO   nenhum nome da legenda do post aparece em painel nenhum. Barrado no PUT, porque
//             é o caso inequívoco: 3 apontamentos no acervo, os 3 reais.
//   SÓ-CAPA   o nome está na capa e some do painel 2 em diante. Apontamento: a capa PODE
//             guardar o nome (§3 da série), mas do 2 em diante "ELE" só depois de o nome ter
//             aparecido. Confira olhando se o miolo se sustenta.
//
// `--fora` LISTA BRUTA, E ELA É RUIDOSA DE PROPÓSITO: todo nome citado na descrição e ausente
// da arte. É onde mora a perífrase evitável ("o adversário", "o outro lado"), e foi assim que
// se achou que o `o-dia-fabio` nomeava Rogério Ceni, o SEGUNDO colocado, e nunca o Fábio, dono
// do recorde. Mas 95 dos 123 episódios caem nela, quase sempre por nome secundário que não
// precisa estar no painel. Tentei fechá-la e não fecha: filtrar por perífrase no miolo
// ("O CLUBE", "O TÉCNICO") não separa a perífrase da ANÁFORA legítima, que é dizer "o clube"
// depois de já ter escrito o nome dele. Fica como leitura humana, fora do padrão e declarada.
//
//   node scripts/varrer-nomes.mjs              # o acervo inteiro
//   node scripts/varrer-nomes.mjs --nao-pub    # só o que ainda não foi publicado
//   node scripts/varrer-nomes.mjs --fora       # inclui a lista bruta, para leitura humana
//   node scripts/varrer-nomes.mjs <id> ...     # quadrinhos escolhidos
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { laudoDeNomes, problemaNoAnonimato } from '../shared/nome-na-arte.mjs'

const AQUI = path.dirname(fileURLToPath(import.meta.url))
const QUAD = path.resolve(AQUI, '../../saga-fut/data/quadrinhos')

const args = process.argv.slice(2)
const soNaoPub = args.includes('--nao-pub')
const comFora = args.includes('--fora')
const ids = args.filter((a) => !a.startsWith('--'))

const arquivos = (await readdir(QUAD)).filter((f) => f.endsWith('.json'))
  .filter((f) => !ids.length || ids.includes(f.slice(0, -5)))

let medidos = 0, anonimos = 0, capas = 0, foras = 0, dispensados = 0

for (const arq of arquivos.sort()) {
  const quad = JSON.parse(await readFile(path.join(QUAD, arq), 'utf-8'))
  if (soNaoPub && quad.postado === true) continue
  const laudo = laudoDeNomes(quad)
  if (!laudo) continue
  medidos++
  if (laudo.dispensado) { dispensados++; continue }

  const linhas = []
  if (problemaNoAnonimato(quad)) {
    anonimos++
    linhas.push(`  ANÔNIMO  nenhum destes aparece em painel nenhum: ${laudo.citados.slice(0, 6).join(', ')}`)
  } else {
    if (laudo.soNaCapa.length) { capas++; linhas.push(`  SÓ-CAPA  ${laudo.soNaCapa.join(', ')} — some do painel 2 em diante`) }
    if (laudo.foraDaArte.length) {
      foras++
      if (comFora) linhas.push(`  FORA     citado na descrição e ausente da arte: ${laudo.foraDaArte.join(', ')}`)
    }
  }
  if (!linhas.length) continue

  console.log(`\n${quad.id}${quad.postado === true ? ' (PUBLICADO)' : ''}  ${quad.publicacao?.titulo || ''}`)
  console.log(linhas.join('\n'))
  for (const p of quad.paineis || []) {
    const texto = (p.legendas || []).map((t) => `[${t}]`).join(' ')
    if (texto) console.log(`    p${p.numero}: ${texto}`)
  }
}

console.log(`\n${medidos} quadrinhos medidos, ${dispensados} com \`protagonistaSemNome\` declarado`)
console.log(`ANÔNIMO: ${anonimos}   SÓ-CAPA: ${capas}   FORA: ${foras}${comFora ? '' : ' (lista bruta e ruidosa: --fora)'}`)
if (anonimos) console.log('\nO conserto é editorial e não custa geração: o nome quase sempre já está no `contexto`.')
process.exit(anonimos ? 1 : 0)
