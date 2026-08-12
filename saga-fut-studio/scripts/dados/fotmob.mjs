// Coletor de DADO REAL, jogo a jogo, para as peças de dado (corrida). Fonte: FotMob.
//
// POR QUE ESTE ARQUIVO EXISTE: número errado num post de futebol vira tribunal nos comentários,
// e a coleta na mão erra de um jeito que NÃO parece erro. Os dois modos de falhar já aconteceram
// aqui e estão fechados por construção:
//
//   1. TEMPORADA ERRADA. O `seasonId` do FotMob (`entryId`) é um índice RELATIVO ao jogador:
//      "1-0" é a La Liga 25/26 do Pedri e a La Liga 24/25 do Joan García (que estava no
//      Espanyol). Pedir pelo número devolve dado plausível de OUTRA temporada, sem erro nenhum.
//      Aqui ninguém passa seasonId: você pede liga + temporada por NOME e o índice é resolvido.
//   2. GRADE DESALINHADA. `recentMatches` só traz os jogos em que o jogador foi relacionado
//      (Pedri tem 30 jogos de La Liga 25/26, Joan García 32). Alinhar por índice põe o gol de um
//      na rodada do outro. Aqui a grade é o CALENDÁRIO (por data), e cada jogador é casado nela.
//
// A conferência é obrigatória: a soma dos jogos coletados tem que bater com o total oficial da
// temporada (endpoint de stats). Divergiu, para. O opt-out é explícito (`--aceitar-divergencia`),
// porque aviso ninguém lê.
//
//   node scripts/dados/fotmob.mjs elenco <teamId>              # nome -> id de cada jogador
//   node scripts/dados/fotmob.mjs temporadas <playerId>        # que ligas/temporadas ele tem
//   node scripts/dados/fotmob.mjs jogos <playerId> --liga=LaLiga --temporada=2025/2026
//   node scripts/dados/fotmob.mjs corrida <videoId>            # preenche corrida.jogos do vídeo
//
// O `corrida` lê `corrida.fonte` e `corrida.corredores[].fotmobId` do JSON do vídeo, monta a
// grade e salva PELA API do studio (nunca escrevendo em data/ direto, ver CLAUDE.md §1).
//
import path from 'node:path'
import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CACHE_DIR = path.resolve(__dirname, '../../.cache/fotmob')
const API = 'https://www.fotmob.com/api/data'
const STUDIO = process.env.SAGAFUT_STUDIO || 'http://localhost:4600'

// ---------------------------------------------------------------- rede + cache
//
// CACHE EM DISCO porque uma corrida bate no mesmo jogador várias vezes enquanto você ajusta o
// recorte, e porque martelar a API de graça é a melhor forma de tomar bloqueio no meio do
// trabalho. Temporada encerrada não muda mais; temporada em curso pede `--recarregar`.
async function pegar(rota, { recarregar = false } = {}) {
  await fs.mkdir(CACHE_DIR, { recursive: true })
  const arq = path.join(CACHE_DIR, rota.replace(/[^a-z0-9]+/gi, '_') + '.json')
  if (!recarregar) {
    const cache = await fs.readFile(arq, 'utf8').catch(() => null)
    if (cache) return JSON.parse(cache)
  }
  const r = await fetch(`${API}/${rota}`, { headers: { 'User-Agent': 'Mozilla/5.0' } })
  if (!r.ok) throw new Error(`FotMob respondeu ${r.status} em ${rota}`)
  const j = await r.json()
  await fs.writeFile(arq, JSON.stringify(j))
  return j
}

export const jogador = (id, o) => pegar(`playerData?id=${id}`, o)
export const time = (id, o) => pegar(`teams?id=${id}`, o)
const statsBrutos = (id, entryId, o) => pegar(`playerStats?playerId=${id}&seasonId=${entryId}`, o)

// ---------------------------------------------------------------- temporada
//
// A JANELA DE DATAS é o que separa uma temporada da outra no `recentMatches`, que não carrega
// nenhum campo de temporada: só data e nome da liga. "2025/2026" é jul/25 a jun/26; "2026"
// (Copa, Mundial de Clubes) é o ano civil.
export function janela(temporada) {
  const m = /^(\d{4})\/(\d{4})$/.exec(temporada)
  if (m) return [`${m[1]}-07-01`, `${m[2]}-06-30`]
  if (/^\d{4}$/.test(temporada)) return [`${temporada}-01-01`, `${temporada}-12-31`]
  throw new Error(`temporada "${temporada}" não entendida (use 2025/2026 ou 2026)`)
}

// A LIGA PODE SER O NOME OU O ID, e em peça histórica tem que ser o ID: a mesma competição
// TROCA DE NOME ao longo dos anos. A La Liga (id 87) aparece como "LaLiga" em 2012/13 e como
// "Primera Division" em 2013/14 — casando por nome, a temporada 13/14 de Messi e Cristiano saía
// como "não jogou", e a corrida ia ao ar com um ano zerado no meio da era dos dois.
const acharTorneio = (torneios, liga) => (/^\d+$/.test(String(liga))
  ? torneios.find((x) => x.tournamentId === Number(liga))
  : torneios.find((x) => x.name === liga))

// Resolve liga+temporada no entryId DAQUELE jogador. Erra alto e mostra o que existe, porque o
// modo de falhar aqui é silencioso: um índice errado devolve dado de outra temporada.
export function resolverEntry(pd, liga, temporada) {
  const t = (pd.statSeasons || []).find((s) => s.seasonName === temporada)
  if (!t) {
    const tem = (pd.statSeasons || []).map((s) => s.seasonName).join(', ')
    throw new Error(`${pd.name} não tem a temporada "${temporada}". Tem: ${tem}`)
  }
  const torneio = acharTorneio(t.tournaments, liga)
  if (!torneio) {
    const tem = t.tournaments.map((x) => x.name).join(', ')
    throw new Error(`${pd.name} não jogou "${liga}" em ${temporada}. Jogou: ${tem}`)
  }
  return { entryId: torneio.entryId, ligaId: torneio.tournamentId }
}

// ---------------------------------------------------------------- partidas
//
// Normaliza uma partida do `recentMatches` no vocabulário da casa. `golsSofridos` sai do placar
// pelo lado do time (é o que o goleiro leva), e não existe campo de defesas aqui: essa métrica
// vem do keeperShotmap, casada por matchId.
function normalizar(m) {
  const gc = m.isHomeTeam ? m.awayScore : m.homeScore
  return {
    matchId: m.id,
    teamId: m.teamId,
    data: m.matchDate.utcTime.slice(0, 10),
    adversario: m.opponentTeamName,
    casa: !!m.isHomeTeam,
    liga: m.leagueName,
    fase: m.stage || null,          // null na fase de grupos; "1/8", "1/2", "bronze", "final"...
    minutos: m.minutesPlayed || 0,
    jogou: !!m.playedInMatch,
    gols: m.goals || 0,
    assistencias: m.assists || 0,
    amarelos: m.yellowCards || 0,
    vermelhos: m.redCards || 0,
    golsSofridos: gc,
    // clean sheet exige o jogo inteiro: goleiro que entrou aos 80 com 0 a 0 não "fechou o gol"
    cleanSheet: gc === 0 && (m.minutesPlayed || 0) >= 90 ? 1 : 0,
    participacoes: (m.goals || 0) + (m.assists || 0),
  }
}

// O CASAMENTO É PELO ID DA COMPETIÇÃO, não pelo nome. Cada fase vem com o nome próprio no
// recentMatches ("World Cup" e "World Cup Grp. H" são a mesma competição, id 77), e casar por
// prefixo de nome engolia junto a ELIMINATÓRIA ("World Cup Qualification UEFA...", id 10195):
// a Copa do Mundo do jogador viraria Copa + eliminatórias somadas, com gols que não existiram
// no Mundial. O id resolve os dois casos de uma vez.
export function partidasDe(pd, { liga, temporada, ligaId }) {
  const [ini, fim] = janela(temporada)
  const daLiga = (m) => (ligaId ? m.leagueId === ligaId
    : m.leagueName === liga || m.leagueName.startsWith(liga + ' '))
  return (pd.recentMatches || [])
    .filter(daLiga)
    .map(normalizar)
    .filter((m) => m.data >= ini && m.data <= fim)
    .sort((a, b) => a.data.localeCompare(b.data))
}

// DEFESAS POR JOGO: o keeperShotmap é a lista de finalizações que o goleiro enfrentou na
// temporada, cada uma com matchId. Contar `eventType === 'Save'` por partida é a única forma de
// ter defesa jogo a jogo (o recentMatches não traz).
export async function defesasPorPartida(playerId, entryId, o) {
  const st = await statsBrutos(playerId, entryId, o)
  const por = {}
  for (const ev of st.keeperShotmap || []) {
    if (ev.eventType === 'Save' || ev.eventType === 'AttemptSaved') {
      por[ev.matchId] = (por[ev.matchId] || 0) + 1
    }
  }
  return por
}

// Totais oficiais da temporada, pra dupla conferência contra a soma dos jogos.
//
// LÊ AS DUAS SEÇÕES. `statsSection` é o quadro completo e só existe em temporada recente;
// `topStatCard` é o resumo e existe até em 2011/12. Sem o fallback, toda peça histórica ficava
// sem número de conferência — e é justamente a histórica que ninguém consegue recontar na mão.
export async function totaisOficiais(playerId, entryId, o) {
  const st = await statsBrutos(playerId, entryId, o)
  const flat = {}
  for (const it of st.topStatCard?.items || []) flat[it.title] = Number(it.statValue)
  for (const g of st.statsSection?.items || []) {
    for (const it of g.items || []) flat[it.title] = Number(it.statValue)
  }
  return {
    gols: flat['Goals'],
    assistencias: flat['Assists'],
    defesas: flat['Saves'],
    cleanSheet: flat['Clean sheets'],
    golsSofridos: flat['Goals conceded'],
    amarelos: flat['Yellow cards'],
    vermelhos: flat['Red cards'],
  }
}

// ---------------------------------------------------------------- grade
//
// A GRADE É O CALENDÁRIO, não a lista de um jogador. Cada etapa junta as partidas que
// aconteceram na mesma janela de dias (uma rodada acontece entre sexta e segunda, e jogo
// adiado cai fora). Assim três corredores de TIMES diferentes correm na mesma linha do tempo,
// e quem não jogou a rodada simplesmente não avança.
export function agrupar(partidasPorCorredor, { dias = 4 } = {}) {
  const todas = partidasPorCorredor.flat().map((p) => p.data).sort()
  const grupos = []
  for (const d of todas) {
    const ultimo = grupos[grupos.length - 1]
    if (ultimo && (Date.parse(d) - Date.parse(ultimo[0])) / 86400000 <= dias) ultimo.push(d)
    else grupos.push([d])
  }
  return grupos.map((g) => ({ inicio: g[0], fim: g[g.length - 1] }))
}

// EM TORNEIO DE MATA-MATA A ETAPA É A FASE, não a data. Seleções diferentes jogam a mesma fase
// em dias diferentes, e agrupar por janela de dias funde fases vizinhas: na Copa 2026 os 8 jogos
// de cada um viravam 7 etapas, e a disputa de terceiro (onde Mbappé fez 2 gols) caía junto com a
// final. Como bônus, o rótulo deixa de ser "RODADA 6" e vira "SEMIFINAL", que é o que prende.
const NOME_FASE = {
  '1/16': '16 AVOS', '1/8': 'OITAVAS', '1/4': 'QUARTAS', '1/2': 'SEMIFINAL',
  bronze: '3º LUGAR', final: 'FINAL',
}
export function porFase(partidasPorCorredor) {
  const chaves = new Map()   // chave -> { rotulo, data mínima }
  for (const partidas of partidasPorCorredor) {
    let nGrupo = 0
    for (const p of partidas) {
      const chave = p.fase || `grupo-${++nGrupo}`
      const rotulo = p.fase ? (NOME_FASE[p.fase] || p.fase.toUpperCase()) : `GRUPOS · ${nGrupo}`
      const atual = chaves.get(chave)
      if (!atual || p.data < atual.inicio) chaves.set(chave, { chave, rotulo, inicio: p.data })
    }
  }
  return [...chaves.values()].sort((a, b) => a.inicio.localeCompare(b.inicio))
}

const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
export const dataBr = (iso) => `${Number(iso.slice(8, 10))} ${MES[Number(iso.slice(5, 7)) - 1]}`

// ---------------------------------------------------------------- CLI
const [, , cmd, alvo, ...resto] = process.argv
const opt = Object.fromEntries(resto.filter((a) => a.startsWith('--'))
  .map((a) => { const [k, v = true] = a.slice(2).split('='); return [k, v] }))
const RECARREGAR = { recarregar: !!opt.recarregar }

async function cmdElenco() {
  const t = await time(alvo, RECARREGAR)
  for (const g of t.squad.squad || t.squad) {
    if (!g.members) continue
    console.log(`-- ${g.title}`)
    for (const m of g.members) console.log(`   ${String(m.id).padStart(8)}  ${m.name}`)
  }
}

async function cmdTemporadas() {
  const pd = await jogador(alvo, RECARREGAR)
  console.log(`${pd.name} (${alvo})`)
  for (const s of pd.statSeasons || []) {
    console.log(`  ${s.seasonName}: ${s.tournaments.map((x) => x.name).join(' · ')}`)
  }
}

async function cmdJogos() {
  const pd = await jogador(alvo, RECARREGAR)
  const { liga, temporada } = opt
  if (!liga || !temporada) throw new Error('uso: jogos <playerId> --liga=LaLiga --temporada=2025/2026')
  const { entryId: entry, ligaId } = resolverEntry(pd, liga, temporada)
  const ps = partidasDe(pd, { liga, temporada, ligaId })
  const defesas = pd.primaryTeam && /keeper|goalkeeper/i.test(pd.positionDescription?.primaryPosition?.label || '')
    ? await defesasPorPartida(alvo, entry, RECARREGAR) : {}
  // "Jogos" aqui é RELACIONADO, não jogado: o recentMatches lista também as partidas em que o
  // jogador ficou no banco (minutos 0). Szczesny aparecia com "35 jogos" numa temporada inteira
  // de reserva, o que faz um corredor parecer titular na hora de escolher o trio.
  const jogou = ps.filter((p) => p.minutos > 0).length
  console.log(`${pd.name} · ${liga} ${temporada} · ${jogou} jogados de ${ps.length} relacionados (entryId ${entry})`)
  for (const p of ps) {
    const d = defesas[p.matchId]
    console.log(`  ${p.data}  ${p.casa ? 'x' : '@'} ${p.adversario.padEnd(18)} ` +
      `${p.minutos}'  G${p.gols} A${p.assistencias}` +
      (d !== undefined ? `  def ${d}` : '') + (p.cleanSheet ? '  CS' : ''))
  }
  const soma = (c) => ps.reduce((a, p) => a + p[c], 0)
  const of = await totaisOficiais(alvo, entry, RECARREGAR)
  console.log(`  SOMA   gols ${soma('gols')} · assist ${soma('assistencias')} · ` +
    `CS ${soma('cleanSheet')} · defesas ${Object.values(defesas).reduce((a, b) => a + b, 0)}`)
  console.log(`  OFICIAL gols ${of.gols} · assist ${of.assistencias} · CS ${of.cleanSheet} · defesas ${of.defesas}`)
}

// ---- corrida com eixo TEMPORADAS: cada etapa é um ano, não uma partida.
//
// EXISTE PORQUE A PEÇA RETRÔ NÃO TEM JOGO A JOGO. O FotMob só serve evento por partida a partir
// de ~2020 (`hasDeepStats` marca 2016/17 como detalhada, mas o shotmap dela volta VAZIO, e o
// recentMatches guarda só os 60 últimos jogos). Medido em Messi e Cristiano: nada por partida em
// nenhuma temporada em que os dois dividiram a La Liga. O que existe, e existe até 2006, é o
// TOTAL de cada temporada — então a corrida troca a unidade do eixo e continua sendo dado real,
// conferido, sem uma linha digitada na mão.
async function etapasPorTemporada(corredores, F) {
  const linhas = []
  for (const c of corredores) {
    const pd = await jogador(c.fotmobId, RECARREGAR)
    const porTemporada = {}
    for (const t of F.temporadas) {
      const alvo = (pd.statSeasons || []).find((s) => s.seasonName === t)
      const torneio = alvo && acharTorneio(alvo.tournaments, F.liga)
      // BURACO VIRA ERRO, não zero. Uma temporada faltando desenharia o corredor parado naquele
      // ano, que é uma afirmação falsa sobre um jogador real, e ninguém enxerga a diferença entre
      // "não jogou" e "a fonte não tem". Se for mesmo pra pular, tire a temporada da lista.
      if (!torneio) {
        throw new Error(`${pd.name} não tem "${F.liga}" em ${t} na fonte ` +
          `(a liga ali se chama: ${alvo?.tournaments.map((x) => x.name).join(', ') || 'nenhuma'}).\n` +
          `conserto: use o ID da liga em fonte.liga (a La Liga é 87), ou tire ${t} de fonte.temporadas.`)
      }
      porTemporada[t] = await totaisOficiais(c.fotmobId, torneio.entryId, RECARREGAR)
    }
    const campos = F.metricas.map((m) => m.campo)
    console.log(`  ${pd.name.padEnd(20)} ` + F.temporadas.map((t) => {
      const v = porTemporada[t]
      return `${t.slice(2, 4)}/${t.slice(-2)} ${v ? campos.map((k) => v[k] ?? '-').join('+') : '—'}`
    }).join(' · '))
    linhas.push({ corredor: c, porTemporada })
  }
  return linhas
}

// ---- corrida: preenche corrida.jogos do vídeo a partir de corrida.fonte
async function cmdCorrida() {
  const r = await fetch(`${STUDIO}/api/videos/${alvo}`)
  if (!r.ok) {
    throw new Error(`não consegui ler o vídeo "${alvo}" no studio (${r.status}).\n` +
      `o studio está no ar? npm run dev --prefix saga-fut-studio`)
  }
  const video = await r.json()
  const C = video.corrida
  const F = C?.fonte
  if (!F) throw new Error(`o vídeo "${alvo}" não tem corrida.fonte (provedor, liga, temporada, metricas)`)

  const campos = F.metricas.map((m) => m.campo)

  if (F.eixo === 'temporadas') {
    if (!F.temporadas?.length) throw new Error('eixo "temporadas" precisa de fonte.temporadas: ["2016/2017", ...]')
    const linhas = await etapasPorTemporada(C.corredores, F)
    video.corrida.jogos = F.temporadas.map((t) => [
      `${t.slice(2, 4)}/${t.slice(-2)}`,
      'TEMPORADA',
      linhas.map((l) => campos.map((k) => l.porTemporada[t]?.[k] ?? 0)),
    ])
    video.corrida.metricas = F.metricas.map((m) => ({ icone: m.icone }))
    const r2 = await fetch(`${STUDIO}/api/videos/${alvo}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(video),
    })
    if (!r2.ok) throw new Error(`falhou ao salvar no studio: ${r2.status} ${await r2.text()}`)
    console.log(`\n${F.temporadas.length} temporadas gravadas em corrida.jogos de "${alvo}".`)
    return
  }

  const linhas = []
  for (const c of C.corredores) {
    if (!c.fotmobId) throw new Error(`corredor "${c.nome}" sem fotmobId`)
    const pd = await jogador(c.fotmobId, RECARREGAR)
    const { entryId: entry, ligaId } = resolverEntry(pd, F.liga, F.temporada)
    const ps = partidasDe(pd, { liga: F.liga, temporada: F.temporada, ligaId })
    const defesas = campos.includes('defesas')
      ? await defesasPorPartida(c.fotmobId, entry, RECARREGAR) : {}
    for (const p of ps) p.defesas = defesas[p.matchId] || 0

    // DUPLA CONFERÊNCIA: a soma do que vamos animar contra o total oficial da temporada.
    const of = await totaisOficiais(c.fotmobId, entry, RECARREGAR)
    for (const campo of campos) {
      const nosso = ps.reduce((a, p) => a + (p[campo] || 0), 0)
      const oficial = of[campo]
      // TOLERÂNCIA DECLARADA, e declarada NO VÍDEO (não num flag de linha de comando que some do
      // histórico). Ela existe por uma razão medida: `defesas` sai do keeperShotmap, que é a lista
      // de finalizações COM COORDENADA, e ela fica 0 a 1 abaixo do total oficial de Saves (Joan
      // García 73 de 74, Oblak 74 de 75, Courtois 70 de 70). Gols e assistências batem exato e
      // devem seguir com tolerância 0.
      const tol = Number(F.tolerancia || 0)
      const dif = Math.abs(nosso - (oficial ?? nosso))
      if (oficial !== undefined && !Number.isNaN(oficial) && dif > tol && !opt['aceitar-divergencia']) {
        throw new Error(`${pd.name}: ${campo} somou ${nosso} nos jogos mas o oficial da temporada ` +
          `é ${oficial}. Confira o recorte antes de animar ` +
          `(fonte.tolerancia no JSON, se a diferença for conhecida e aceita).`)
      }
      if (dif > 0) console.log(`     nota: ${campo} ${nosso} contra ${oficial} oficial (dentro da tolerância ${tol})`)
    }
    console.log(`  ${pd.name.padEnd(20)} ${ps.length} jogos · ` +
      campos.map((k) => `${k} ${ps.reduce((a, p) => a + (p[k] || 0), 0)}`).join(' · ') + '  ✓ confere')
    linhas.push({ corredor: c, partidas: ps })
  }

  // A GRADE: uma etapa por PARTIDA quando todos os corredores são do mesmo time (é o caso mais
  // comum aqui, três jogadores do Barça), e por JANELA DE DATAS quando são de times diferentes.
  // A diferença não é cosmética: agrupando três companheiros por data, as duas rodadas de uma
  // semana cheia caem na mesma etapa e a temporada perde 4 das 38 rodadas.
  const mesmoTime = new Set(linhas.flatMap((l) => l.partidas.map((p) => p.teamId))).size === 1
  const etapas = F.eixo === 'fases'
    ? porFase(linhas.map((l) => l.partidas))
    : mesmoTime
      ? [...new Map(linhas.flatMap((l) => l.partidas).map((p) => [p.matchId, p])).values()]
        .sort((a, b) => a.data.localeCompare(b.data))
        .map((p) => ({ inicio: p.data, fim: p.data, matchId: p.matchId }))
      : agrupar(linhas.map((l) => l.partidas), { dias: Number(F.diasPorEtapa || 4) })
  const naEtapa = (partidas, e) => {
    if (e.chave) {
      let nGrupo = 0
      return partidas.filter((p) => (p.fase || `grupo-${++nGrupo}`) === e.chave)
    }
    return e.matchId
      ? partidas.filter((p) => p.matchId === e.matchId)
      : partidas.filter((p) => p.data >= e.inicio && p.data <= e.fim)
  }
  const jogos = etapas.map((e, i) => {
    const eventos = linhas.map((l) => {
      const ps = naEtapa(l.partidas, e)
      return campos.map((k) => ps.reduce((a, p) => a + (p[k] || 0), 0))
    })
    // O RÓTULO diz o adversário quando os corredores são do mesmo time (a leitura fica muito
    // melhor: "23 mai · VALENCIA"); com times diferentes vira o número da rodada, porque não
    // existe UM adversário da etapa.
    const advs = new Set(linhas.flatMap((l) => naEtapa(l.partidas, e).map((p) => p.adversario)))
    const rotulo = e.rotulo
      || (F.eixo === 'rodadas' || advs.size > 1
        ? `RODADA ${i + 1}` : (advs.values().next().value || `RODADA ${i + 1}`).toUpperCase())
    return [dataBr(e.inicio), rotulo, eventos]
  })

  video.corrida.jogos = jogos
  video.corrida.metricas = F.metricas.map((m) => ({ icone: m.icone }))
  const put = await fetch(`${STUDIO}/api/videos/${alvo}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(video),
  })
  if (!put.ok) throw new Error(`falhou ao salvar no studio: ${put.status} ${await put.text()}`)
  console.log(`\n${jogos.length} etapas gravadas em corrida.jogos de "${alvo}".`)
}

const COMANDOS = { elenco: cmdElenco, temporadas: cmdTemporadas, jogos: cmdJogos, corrida: cmdCorrida }
if (!COMANDOS[cmd]) {
  console.error(`uso: node scripts/dados/fotmob.mjs <${Object.keys(COMANDOS).join('|')}> <alvo> [--opções]`)
  process.exit(1)
}
await COMANDOS[cmd]().catch((e) => { console.error(e.message || e); process.exit(1) })
