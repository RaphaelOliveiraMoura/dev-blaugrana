// YOUTUBE: subir o vídeo do quadrinho já AGENDADO, e sair da frente.
//
// POR QUE SÓ O YOUTUBE TEM ISTO, e não as outras três redes: ele é o único em que a API publica
// de verdade E agenda sozinha (`status.publishAt`), sem nada rodando na sua máquina na hora certa.
// No Instagram e no TikTok a biblioteca de áudio não é exposta por API nenhuma (a licença vale só
// dentro do app), e som em alta é o que dá alcance nos dois: automatizar lá custaria justamente o
// que se ganha. No X não existe endpoint de agendamento, então sobraria um cron seu ligado às
// 12h30. Aqui não: você sobe hoje e o YouTube vira a chave sozinho daqui a três semanas.
//
// SEM DEPENDÊNCIA NOVA. O `googleapis` traz centenas de módulos pra usar dois endpoints; aqui é
// fetch nativo, upload resumable em duas chamadas.
//
// ONDE MORAM AS CREDENCIAIS: um arquivo por canal da casa, FORA do repositório, permissão 600.
// `~/.sagafut/youtube-devblaugrana.json` e `youtube-futgibi.json`. Um token só mandaria o Short
// do @futgibi pro canal do Barça (ou o contrário) sem erro nenhum: o upload funciona, o vídeo
// só nasce no lugar errado. O `youtube.json` antigo ainda vale como legado do @devblaugrana.
//
// O arquivo guarda client_id, client_secret e o refresh_token; o access_token é descartável.
//
// COTA: 10.000 unidades por dia e o upload custa 1.600, ou seja SEIS por dia. Não é limite de
// quantos você agenda (dá pra deixar meses na fila), é de quantos você SOBE por dia. O erro de
// cota estourada vem com mensagem própria porque ele é o único que exige esperar até amanhã.
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { createReadStream } from 'node:fs'
import { Readable } from 'node:stream'
import { CANAL_PADRAO, CANAIS, canalValido, fichaDoCanal } from '../../shared/canais.mjs'

const DIR = path.join(os.homedir(), '.sagafut')
const ARQ_LEGADO = path.join(DIR, 'youtube.json')

export function arquivoYoutube(canal) {
  const id = canalValido(canal) ? canal : CANAL_PADRAO
  return path.join(DIR, `youtube-${id}.json`)
}

const AUTH = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN = 'https://oauth2.googleapis.com/token'
const UPLOAD = 'https://www.googleapis.com/upload/youtube/v3/videos'
// `youtube.upload` sozinho sobe o vídeo; `youtube` (leitura+escrita) é preciso pro publishAt
// pegar e pra conseguir ler de volta o estado do vídeo depois.
const ESCOPO = 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube'

export async function lerCredenciais(canal) {
  const id = canalValido(canal) ? canal : CANAL_PADRAO
  try { return JSON.parse(await fs.readFile(arquivoYoutube(id), 'utf8')) } catch { /* tenta o legado */ }
  // UM arquivo só existia antes dos dois canais. Quem já autorizou o @devblaugrana continua
  // funcionando sem relogar; o futgibi NÃO herda esse token (iria pro canal errado em silêncio).
  if (id === CANAL_PADRAO) {
    try { return JSON.parse(await fs.readFile(ARQ_LEGADO, 'utf8')) } catch { return null }
  }
  return null
}

// CLIENT_ID/SECRET do APP, não o token do canal.
//
// O segundo perfil da casa (contas Google diferentes) não tem `youtube-futgibi.json` ainda, e o
// JSON baixado do Cloud já foi apagado. Sem isto o login pedia o download de novo, sendo que o
// app OAuth é o MESMO: o que muda entre canais é só o refresh_token. Pegar o token do outro
// arquivo publicaria no canal errado; pegar só as chaves do app é o que permite autorizar o
// segundo Google.
export async function chavesDoApp(canal) {
  const id = canalValido(canal) ? canal : CANAL_PADRAO
  const desta = await lerCredenciais(id)
  if (desta?.client_id && desta?.client_secret) {
    return { client_id: desta.client_id, client_secret: desta.client_secret, origem: id }
  }
  for (const c of CANAIS) {
    if (c.id === id) continue
    const outra = await lerCredenciais(c.id)
    if (outra?.client_id && outra?.client_secret) {
      return { client_id: outra.client_id, client_secret: outra.client_secret, origem: c.id }
    }
  }
  return null
}

export async function gravarCredenciais(dados, canal) {
  const dest = arquivoYoutube(canal)
  await fs.mkdir(DIR, { recursive: true, mode: 0o700 })
  await fs.writeFile(dest, JSON.stringify(dados, null, 2), { mode: 0o600 })
  return dest
}

export const CAMINHO_CREDENCIAIS = ARQ_LEGADO
export { ARQ_LEGADO }

// O JSON QUE O GOOGLE CLOUD ENTREGA no download da credencial, lido direto.
//
// Ele vem com nome fixo (`client_secret_<id>.apps.googleusercontent.com.json`) e traz client_id e
// client_secret prontos, então copiar e colar as duas chaves na linha de comando é trabalho que
// não precisa existir. Só o formato "installed" serve: é o de "App para computador", o único em
// que o Google aceita loopback em qualquer porta. Se vier "web", o login avisa em vez de tentar
// e morrer num redirect_uri_mismatch obscuro.
//
// ELE NÃO DEVERIA MORAR NO REPOSITÓRIO. O .gitignore cobre o padrão do nome, mas arquivo de
// segredo dentro da árvore de código é acidente esperando um `git add -f` ou um zip do projeto.
// Depois do login, tudo que importa está em ~/.sagafut/youtube.json e este pode ser apagado.
const PASTAS_BUSCA = [
  path.resolve(process.cwd()),
  path.resolve(process.cwd(), '..'),
  DIR,
]

export async function credencialBaixadaDoGoogle() {
  const achados = []
  for (const pasta of PASTAS_BUSCA) {
    let arquivos = []
    try { arquivos = await fs.readdir(pasta) } catch { continue }
    for (const f of arquivos.filter((x) => /^client_secret.*\.json$/i.test(x))) {
      const caminho = path.join(pasta, f)
      try {
        const [j, st] = await Promise.all([
          fs.readFile(caminho, 'utf8').then(JSON.parse),
          fs.stat(caminho),
        ])
        const raiz = j.installed ? 'installed' : j.web ? 'web' : null
        if (!raiz) continue
        const c = j[raiz]
        if (!c?.client_id || !c?.client_secret) continue
        achados.push({
          caminho, tipo: raiz, mtime: st.mtimeMs,
          client_id: c.client_id, client_secret: c.client_secret, project_id: c.project_id,
        })
      } catch { /* json quebrado: segue procurando */ }
    }
  }
  if (!achados.length) return null
  // MAIS DE UM ARQUIVO: vence o MAIS RECENTE, e o chamador avisa que havia outros. Trocar de
  // projeto (foi o que aconteceu aqui em 12/08/2026, quando o canal mudou de conta) deixa o
  // antigo pra trás na pasta, e pegar "o primeiro que aparecer" autorizaria no projeto errado
  // sem dizer nada — que é o mesmo erro que já custou uma rodada inteira de configuração.
  achados.sort((a, b) => b.mtime - a.mtime)
  return { ...achados[0], outros: achados.slice(1).map((x) => x.caminho) }
}

// A URL que o navegador abre pra você autorizar.
//
// `access_type=offline` + `prompt=consent` é o par que faz o Google devolver o REFRESH token; sem
// os dois, você reautoriza toda semana.
//
// `select_account` JUNTO DO CONSENT existe por causa das CONTAS DE MARCA, e sem ele a integração
// conecta no canal errado sem dar erro nenhum. Quando a conta Google gerencia um canal de marca
// (o caso do @devblaugrana, gerenciado pela conta pessoal), o Google mostra um SELETOR DE CANAL
// entre a escolha da conta e o consentimento. Só com `prompt=consent` esse seletor é pulado e o
// token fica amarrado ao canal PESSOAL, que costuma estar vazio: o upload funciona, não reclama
// de nada, e o vídeo aparece num canal com zero inscritos. Medido aqui em 12/08/2026, na primeira
// autorização deste projeto.
export function urlDeConsentimento(clientId, redirect) {
  const p = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirect,
    response_type: 'code',
    scope: ESCOPO,
    access_type: 'offline',
    prompt: 'consent select_account',
  })
  return `${AUTH}?${p}`
}

export async function trocarCodigo({ clientId, clientSecret, code, redirect }) {
  const r = await fetch(TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId, client_secret: clientSecret,
      code, grant_type: 'authorization_code', redirect_uri: redirect,
    }),
  })
  const j = await r.json()
  if (!r.ok) throw new Error(`troca do código falhou: ${j.error_description || j.error || r.status}`)
  if (!j.refresh_token) {
    throw new Error('o Google não devolveu refresh_token. Revogue o acesso do app em '
      + 'myaccount.google.com/permissions e autorize de novo (ele só manda o refresh na PRIMEIRA vez).')
  }
  return j
}

async function accessToken(canal) {
  const c = await lerCredenciais(canal)
  const arq = arquivoYoutube(canal)
  if (!c?.refresh_token) {
    throw new Error(`sem autorização do YouTube para ${fichaDoCanal(canal).nome}. `
      + `Rode: node scripts/youtube-login.mjs --canal=${canalValido(canal) ? canal : CANAL_PADRAO}  (grava em ${arq})`)
  }
  const r = await fetch(TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: c.client_id, client_secret: c.client_secret,
      refresh_token: c.refresh_token, grant_type: 'refresh_token',
    }),
  })
  const j = await r.json()
  if (!r.ok) {
    // `invalid_grant` aqui é quase sempre A MESMA COISA, e não é senha trocada: app com a tela de
    // consentimento em "Teste" tem TODO refresh token expirado pelo Google em 7 dias. A automação
    // funciona uma semana e morre sem aviso. A cura é publicar o app ("Em produção"), que pra uso
    // próprio não exige verificação nenhuma. Ver saga-fut/docs/YOUTUBE.md §3.
    if (/invalid_grant/i.test(j.error || '')) {
      throw new Error('o YouTube recusou o token (invalid_grant). A causa mais comum: o app está '
        + 'como "Teste" na tela de consentimento, e nesse modo o Google expira o refresh token a '
        + 'cada 7 DIAS. Publique o app (Google Auth Platform → Público-alvo → PUBLICAR APLICATIVO) '
        + 'e rode node scripts/youtube-login.mjs --canal=<canal> de novo. Ver saga-fut/docs/YOUTUBE.md.')
    }
    throw new Error(`o token do YouTube não renovou (${j.error || r.status}). `
      + `Se você revogou o acesso, rode node scripts/youtube-login.mjs --canal=${canalValido(canal) ? canal : CANAL_PADRAO} de novo.`)
  }
  return j.access_token
}

// QUAL CANAL ESTÁ CONECTADO. Custa 1 unidade das 10.000 e evita a pior falha possível desta
// integração: subir a fila inteira no canal ERRADO.
//
// Uma conta Google costuma ter o canal pessoal (criado sozinho, vazio) MAIS as contas de marca. O
// OAuth conecta na identidade escolhida na tela do Google, e se você passar rápido pelo seletor de
// canal ele fica no pessoal. Tudo funciona, nada dá erro, e os vídeos vão pra um canal com zero
// inscritos. Por isso o studio mostra o nome do canal ao lado do botão, antes de agendar.
export async function canalConectado(canal) {
  const token = await accessToken(canal)
  const r = await fetch(
    'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true',
    { headers: { Authorization: `Bearer ${token}` } })
  const j = await r.json()
  if (!r.ok) {
    const msg = j?.error?.message || `HTTP ${r.status}`
    if (/has not been used in project|is disabled/i.test(msg)) {
      const proj = /project (\d+)/.exec(msg)?.[1]
      throw new Error('a YouTube Data API v3 não está ativada neste projeto. Abra '
        + `https://console.cloud.google.com/apis/library/youtube.googleapis.com${proj ? `?project=${proj}` : ''} e ative.`)
    }
    throw new Error(msg)
  }
  const c = (j.items || [])[0]
  if (!c) throw new Error('nenhum canal nesta conta do Google')
  return {
    id: c.id,
    titulo: c.snippet.title,
    handle: c.snippet.customUrl || null,
    inscritos: c.statistics?.subscriberCount ?? null,
    videos: c.statistics?.videoCount ?? null,
  }
}

// TÍTULO E DESCRIÇÃO têm limite duro (100 e 5000) e o upload falha inteiro se estourar, depois de
// mandar o arquivo. Cortar antes é mais barato que descobrir no fim.
const corta = (s, n) => {
  const t = String(s || '').replace(/\r/g, '').trim()
  return t.length <= n ? t : t.slice(0, n - 1).trimEnd() + '…'
}

// As hashtags que já estão na legenda viram TAGS de verdade. O YouTube ignora hashtag no meio do
// texto pra fins de busca, mas usa o campo `tags`.
function tagsDaLegenda(legenda, extras = []) {
  const achadas = (String(legenda || '').match(/#[\wÀ-ÿ]{2,30}/g) || [])
    .map((t) => t.slice(1))
  const todas = [...new Set([...extras, ...achadas])]
  // o campo inteiro é limitado a 500 caracteres somados
  const out = []
  let n = 0
  for (const t of todas) { if (n + t.length + 1 > 480) break; out.push(t); n += t.length + 1 }
  return out
}

// O vídeo VIRA Short pelo formato (vertical, curto), não por um campo da API: não existe
// `isShort`. O "#Shorts" na descrição é o resto de uma época em que ajudava, e mantê-lo não
// custa nada. O que decide de fato é o 9:16 que o studio já monta.
export function montarMetadados({ quad, quando }) {
  const titulo = corta(quad.publicacao?.titulo || quad.titulo || quad.id, 100)
  // o VÍDEO guarda a legenda em `publicacao.legenda`; o quadrinho, em `legenda` na raiz. Ler os
  // dois aqui evita que o Short do vídeo suba com a descrição vazia, que é o tipo de defeito que
  // só aparece no canal.
  const corpo = String(quad.legenda || quad.publicacao?.legenda || '').trim()
  const descricao = corta(corpo.includes('#Shorts') ? corpo : `${corpo}\n\n#Shorts`, 5000)
  return {
    snippet: {
      title: titulo,
      description: descricao,
      tags: tagsDaLegenda(corpo, fichaDoCanal(quad.canal).youtubeTags),
      categoryId: '17', // Esportes
      defaultLanguage: 'pt-BR',
      defaultAudioLanguage: 'pt-BR',
    },
    status: {
      // PRIVATE + publishAt é o par que agenda. Só um dos dois não funciona: `public` com
      // publishAt publica na hora e ignora a data, e `private` sem publishAt fica privado pra
      // sempre esperando alguém lembrar.
      privacyStatus: 'private',
      publishAt: quando,
      selfDeclaredMadeForKids: false,
      license: 'youtube',
    },
  }
}

// Upload RESUMABLE: uma chamada abre a sessão com o JSON dos metadados e devolve uma URL, a
// segunda manda os bytes. Multipart seria uma chamada só, mas quebra em vídeo grande e o erro
// aparece depois de o arquivo inteiro já ter subido.
export async function subirVideo({ arquivo, metadados, canal, aoProgresso }) {
  const token = await accessToken(canal)
  const { size } = await fs.stat(arquivo)

  const inicio = await fetch(`${UPLOAD}?uploadType=resumable&part=snippet,status`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Length': String(size),
      'X-Upload-Content-Type': 'video/mp4',
    },
    body: JSON.stringify(metadados),
  })
  if (!inicio.ok) {
    const t = await inicio.text()
    if (/quotaExceeded|dailyLimitExceeded/i.test(t)) {
      throw new Error('cota diária do YouTube estourada (10.000 unidades; cada upload custa 1.600, '
        + 'ou seja 6 por dia). Os que já subiram continuam agendados. Tente amanhã.')
    }
    // "API não ativada" vem como 403 com um texto longo e uma URL no meio. É o erro de quem
    // autorizou antes de ligar a API no projeto (passo 2 do docs/YOUTUBE.md) e, como a autorização
    // funciona normalmente, dá a impressão de que o problema é o token.
    const proj = /project (\d+)/.exec(t)?.[1]
    if (/has not been used in project|is disabled/i.test(t)) {
      throw new Error('a YouTube Data API v3 não está ativada neste projeto do Google Cloud. '
        + 'A autorização está certa; falta ligar a API. Abra '
        + `https://console.cloud.google.com/apis/library/youtube.googleapis.com${proj ? `?project=${proj}` : ''} `
        + 'e clique em ATIVAR. Leva alguns minutos pra valer. (docs/YOUTUBE.md §2)')
    }
    throw new Error(`YouTube recusou abrir o upload (${inicio.status}): ${t.slice(0, 300)}`)
  }
  const destino = inicio.headers.get('location')
  if (!destino) throw new Error('o YouTube não devolveu a URL de upload')

  aoProgresso?.({ fase: 'enviando', bytes: size })
  const corpo = Readable.toWeb(createReadStream(arquivo))
  const envio = await fetch(destino, {
    method: 'PUT',
    headers: { 'Content-Type': 'video/mp4', 'Content-Length': String(size) },
    body: corpo,
    duplex: 'half', // exigido pelo fetch do Node quando o corpo é stream
  })
  const j = await envio.json().catch(() => ({}))
  if (!envio.ok) throw new Error(`falha no envio (${envio.status}): ${JSON.stringify(j).slice(0, 300)}`)
  return { id: j.id, url: `https://youtu.be/${j.id}`, status: j.status }
}

// Monta o `publishAt` a partir da data do cronograma (YYYY-MM-DD) e de uma hora local (HH:MM).
//
// O ISO SAI DOS COMPONENTES, nunca de `new Date("2026-08-13")`: essa forma é interpretada como
// UTC e, no fuso do Brasil, agenda o vídeo pras 21h do dia ANTERIOR. É o mesmo motivo pelo qual
// o cronograma monta a chave do dia na mão (ver lib/agenda.js).
export function instanteDePublicacao(dia, hora) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dia || ''))
  if (!m) throw new Error(`data "${dia}" fora do formato YYYY-MM-DD`)
  const h = /^(\d{1,2}):(\d{2})$/.exec(String(hora || ''))
  if (!h) throw new Error(`hora "${hora}" fora do formato HH:MM`)
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(h[1]), Number(h[2]), 0, 0)
  if (Number.isNaN(d.getTime())) throw new Error(`data/hora inválida: ${dia} ${hora}`)
  // o YouTube recusa publishAt no passado, e a mensagem dele não diz isso claramente
  if (d.getTime() < Date.now() + 60_000) {
    throw new Error(`${dia} ${hora} já passou (ou é daqui a menos de um minuto). O YouTube só aceita agendamento no futuro.`)
  }
  return d.toISOString()
}
