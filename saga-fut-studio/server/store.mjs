import fs from 'node:fs/promises'
import { problemaNasSugestoes } from '../shared/musica-quadrinho.mjs'
import path from 'node:path'
import { PROJECT_FILE, SAGAS_DIR, QUAD_DIR, VIDEO_DIR } from './config.mjs'
import { exists, writeIfChanged, backupFile } from './lib/arquivos.mjs'
import { comLock } from './lib/lock.mjs'

// Fonte de verdade: data/project.json (global) + data/sagas/<id>.json + data/quadrinhos/<id>.json,
// um arquivo por item. Aqui é o único lugar que sabe disso: readDados monta o objeto
// completo que o front vê, writeDados distribui de volta.

// carrega uma coleção split (dir com um .json por item), respeitando a ordem dada
// `_criadoEm` VEM DO DISCO, não do dado: nenhum item tem data de criação gravada, e o campo é
// derivável (a data de nascimento do arquivo). Deriva evita migrar 68 quadrinhos e evita o campo
// nascer errado em quem for criado por script. Começa com `_` e é apagado no write: é leitura.
async function lerItemComData(f) {
  const item = JSON.parse(await fs.readFile(f, 'utf-8'))
  const st = await fs.stat(f).catch(() => null)
  // birthtime não existe em todo sistema de arquivos; onde não existe vem 0 e o mtime serve
  const nasc = st ? (st.birthtimeMs || st.mtimeMs) : 0
  return { ...item, _criadoEm: nasc }
}

async function readColecao(dir, order) {
  const itens = []
  const vistos = new Set()
  for (const id of order || []) {
    const f = path.join(dir, id + '.json')
    if (await exists(f)) { itens.push(await lerItemComData(f)); vistos.add(id) }
  }
  // robustez: inclui itens presentes no dir mas fora da ordem
  for (const f of (await fs.readdir(dir).catch(() => []))) {
    if (!f.endsWith('.json') || vistos.has(f.slice(0, -5))) continue
    itens.push(await lerItemComData(path.join(dir, f)))
  }
  return itens
}

// Grava uma coleção split, atômico e com backup, só o que mudou → editar um item
// não churna os arquivos dos outros.
async function writeColecao(dir, itens) {
  await fs.mkdir(dir, { recursive: true })
  const idsAtuais = new Set()
  for (const it of itens) {
    idsAtuais.add(it.id)
    await writeIfChanged(path.join(dir, it.id + '.json'), JSON.stringify(semEstiloResolvido(it), null, 2) + '\n', 10)
  }
  // remove (com backup) arquivos de itens que não existem mais
  for (const f of (await fs.readdir(dir).catch(() => []))) {
    if (!f.endsWith('.json') || idsAtuais.has(f.slice(0, -5))) continue
    await backupFile(path.join(dir, f), 10)
    await fs.rm(path.join(dir, f), { force: true })
  }
}

// stylePrefix é cache: quem aponta para um estilo do catálogo não persiste o resolvido.
function semEstiloResolvido(item) {
  // `_criadoEm` é derivado do disco na leitura e não pode voltar pro arquivo: gravado, ele
  // passaria a mentir no primeiro `cp` ou restauração de backup.
  const { _criadoEm, ...limpo } = item
  if (!limpo.estiloId) return limpo
  const { stylePrefix, ...resto } = limpo
  return resto
}

// estilo resolvido = prefixo do catálogo + o detalhe de arte próprio do item
function resolverEstilo(item, estilosById) {
  const est = item.estiloId && estilosById[item.estiloId]
  if (est) item.stylePrefix = [est.stylePrefix, item.estiloExtra].filter(Boolean).join(', ')
}

// O TÍTULO DO QUADRINHO É O NOME DA PASTA (o id), sempre.
//
// Eram dois campos independentes e viviam divergindo: nascia "Não sei" com a pasta
// "rei-nao-sei", e depois ninguém achava a charge a partir do diretório. Agora o id é
// fonte única de verdade e o título é derivado dele, então divergir é impossível, não
// importa por onde o quadrinho nasceu (UI, script, ou arquivo solto no dir).
//
// Não se perde nada: o nome bonito do post vive em publicacao.titulo, na aba Publicar.
// Normalizamos na LEITURA (a UI já mostra certo antes de qualquer save) e na ESCRITA
// (persiste), que são os dois únicos caminhos por onde os dados passam.
const casarTituloComPasta = (q) => { if (q && q.id) q.titulo = q.id; return q }

export async function readDados() {
  const proj = JSON.parse(await fs.readFile(PROJECT_FILE, 'utf-8'))
  const sagaOrder = proj.sagaOrder || []; delete proj.sagaOrder
  const quadrinhoOrder = proj.quadrinhoOrder || []; delete proj.quadrinhoOrder
  const videoOrder = proj.videoOrder || []; delete proj.videoOrder
  const sagas = await readColecao(SAGAS_DIR, sagaOrder)
  const quadrinhos = (await readColecao(QUAD_DIR, quadrinhoOrder)).map(casarTituloComPasta)
  const videos = (await readColecao(VIDEO_DIR, videoOrder)).map(casarTituloComPasta)

  // resolve o estilo centralizado só em memória (o writeDados remove esse cache de volta)
  const estilosById = Object.fromEntries((proj.estilos || []).map((e) => [e.id, e]))
  for (const item of [...sagas, ...quadrinhos, ...videos, ...(proj.personagens || [])]) {
    resolverEstilo(item, estilosById)
  }
  return { ...proj, sagas, quadrinhos, videos }
}

export async function writeDados(obj) {
  const { sagas = [], quadrinhos = [], videos = [], ...proj } = obj
  proj.sagaOrder = sagas.map((s) => s.id)
  proj.quadrinhoOrder = quadrinhos.map((q) => q.id)
  proj.videoOrder = videos.map((v) => v.id)
  if (proj.personagens) proj.personagens = proj.personagens.map(semEstiloResolvido)
  await writeIfChanged(PROJECT_FILE, JSON.stringify(proj, null, 2) + '\n', 20)
  await writeColecao(SAGAS_DIR, sagas)
  await writeColecao(QUAD_DIR, quadrinhos.map(casarTituloComPasta))
  await writeColecao(VIDEO_DIR, videos.map(casarTituloComPasta))
}

// ---------------------------------------------------------------------------
// ESCRITA GRANULAR (um item por vez) — pra vários agentes trabalharem em PARALELO.
//
// `writeDados` recebe o mundo inteiro e `writeColecao` APAGA todo arquivo que não veio na
// lista. Com dois produtores isso perde trabalho: A e B leem o estado, A cria o vídeo X e
// salva, B (que leu antes de X existir) salva e o X SOME. As funções abaixo escrevem só o
// arquivo do item e só ACRESCENTAM na ordem, então nunca apagam o que não conhecem.
// ---------------------------------------------------------------------------

const ORDEM_DE = { saga: 'sagaOrder', quadrinho: 'quadrinhoOrder', video: 'videoOrder' }
const DIR_DE = { saga: SAGAS_DIR, quadrinho: QUAD_DIR, video: VIDEO_DIR }

export async function lerItem(tipo, id) {
  const f = path.join(DIR_DE[tipo], id + '.json')
  if (!(await exists(f))) return null
  const item = JSON.parse(await fs.readFile(f, 'utf-8'))
  const proj = JSON.parse(await fs.readFile(PROJECT_FILE, 'utf-8'))
  const estilosById = Object.fromEntries((proj.estilos || []).map((e) => [e.id, e]))
  resolverEstilo(item, estilosById)
  return tipo === 'saga' ? item : casarTituloComPasta(item)
}

// Grava UM item e garante que ele está na ordem do projeto. Serializado por lock de arquivo:
// dois processos acrescentando ao mesmo `<tipo>Order` liam-e-escreviam o project.json em
// corrida, e um dos dois perdia a entrada.
export async function salvarItem(tipo, item) {
  const dir = DIR_DE[tipo]
  if (!dir || !item?.id) throw new Error(`salvarItem: tipo/id inválido (${tipo}/${item?.id})`)
  const pronto = tipo === 'saga' ? item : casarTituloComPasta(item)
  await fs.mkdir(dir, { recursive: true })
  await writeIfChanged(path.join(dir, pronto.id + '.json'), JSON.stringify(semEstiloResolvido(pronto), null, 2) + '\n', 10)
  await comLock('project-json', async () => {
    const proj = JSON.parse(await fs.readFile(PROJECT_FILE, 'utf-8'))
    const chave = ORDEM_DE[tipo]
    const ordem = proj[chave] || []
    if (!ordem.includes(pronto.id)) {
      proj[chave] = [...ordem, pronto.id]
      await writeIfChanged(PROJECT_FILE, JSON.stringify(proj, null, 2) + '\n', 20)
    }
  })
  return pronto
}

// Remove UM item (com backup) e tira ele da ordem. Não toca em mais nada.
export async function removerItem(tipo, id) {
  const f = path.join(DIR_DE[tipo], id + '.json')
  if (await exists(f)) { await backupFile(f, 10); await fs.rm(f, { force: true }) }
  await comLock('project-json', async () => {
    const proj = JSON.parse(await fs.readFile(PROJECT_FILE, 'utf-8'))
    const chave = ORDEM_DE[tipo]
    if ((proj[chave] || []).includes(id)) {
      proj[chave] = proj[chave].filter((x) => x !== id)
      await writeIfChanged(PROJECT_FILE, JSON.stringify(proj, null, 2) + '\n', 20)
    }
  })
  return { ok: true }
}

// AGENDA É SEMPRE 'YYYY-MM-DD', e isso é barrado, não avisado.
//
// POR QUE EXISTE: o cronograma casa `item.agenda` com a chave do dia (`2026-11-19`). Data em
// qualquer outro formato não bate com dia nenhum E não conta como pendente (é string
// preenchida), então o item some das DUAS listas da tela, sem erro em lugar nenhum. Aconteceu
// com 58 quadrinhos de uma vez: a skill /o-dia-em-que pede "agenda no aniversário do fato", e
// "aniversário" leu como 19/11, que é o jeito natural de escrever aniversário em português.
//
// O ano faz parte do formato justamente porque o aniversário se repete: sem ele não dá pra
// saber se 28/05 é o deste ano (que já passou) ou o do ano que vem.
const AGENDA_ISO = /^\d{4}-\d{2}-\d{2}$/
export function problemaNaAgenda(item, quem) {
  const a = item?.agenda
  if (a == null || a === '') return null // sem data é legítimo: é a fila de Pendentes
  if (typeof a !== 'string' || !AGENDA_ISO.test(a)) {
    return `${quem} tem agenda ${JSON.stringify(a)}, fora do formato. Use 'YYYY-MM-DD' (ex: "2026-11-19"), com ano: sem ele o item some do cronograma sem avisar.`
  }
  // formato certo mas data que não existe (2026-02-31, 2026-13-01) passaria no regex
  const [ano, mes, dia] = a.split('-').map(Number)
  const d = new Date(ano, mes - 1, dia)
  if (d.getFullYear() !== ano || d.getMonth() !== mes - 1 || d.getDate() !== dia) {
    return `${quem} tem agenda "${a}", que não é uma data real.`
  }
  // A HORA é campo À PARTE da agenda (o cronograma casa a agenda com a chave do DIA, e hora
  // dentro dela sumiria com o item das duas listas). Aqui só se confere o formato: o
  // agendamento do YouTube monta o `publishAt` a partir dela, e "19h" ou "7:00 PM" derrubaria
  // o upload DEPOIS de o arquivo já ter subido.
  const h = item?.hora
  if (h != null && h !== '' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(String(h))) {
    return `${quem} tem hora ${JSON.stringify(h)}, fora do formato. Use 'HH:MM' em 24h (ex: "19:00").`
  }
  return null
}

// Recusa um payload truncado/corrompido antes de ele sobrescrever o bom.
// Retorna a mensagem do problema, ou null se está tudo certo.
export function validarPayload(b) {
  if (!b || typeof b !== 'object' || !b.projeto || !Array.isArray(b.personagens) || !Array.isArray(b.sagas)) {
    return 'Payload inválido: esperado o objeto completo (projeto + personagens + sagas).'
  }
  if (b.sagas.some((s) => !s || typeof s.id !== 'string' || !Array.isArray(s.episodios))) {
    return 'Payload inválido: toda saga precisa de id e episodios[].'
  }
  for (const s of b.sagas) {
    for (const ep of s.episodios) {
      const p = problemaNaAgenda(ep, `Episódio "${ep?.id}" da saga "${s.id}"`)
      if (p) return p
    }
  }
  if (b.quadrinhos != null) {
    if (!Array.isArray(b.quadrinhos)) return 'Payload inválido: quadrinhos deve ser um array.'
    if (b.quadrinhos.some((q) => !q || typeof q.id !== 'string' || !Array.isArray(q.paineis))) {
      return 'Payload inválido: todo quadrinho precisa de id e paineis[].'
    }
    for (const q of b.quadrinhos) {
      const p = problemaNaAgenda(q, `Quadrinho "${q.id}"`) || problemaNasSugestoes(q)
      if (p) return p
    }
  }
  if (b.videos != null) {
    if (!Array.isArray(b.videos)) return 'Payload inválido: videos deve ser um array.'
    if (b.videos.some((v) => !v || typeof v.id !== 'string')) {
      return 'Payload inválido: todo vídeo precisa de id.'
    }
    // título e descrição (publicacao) são OBRIGATÓRIOS: sem eles não dá pra criar/salvar
    // um vídeo (evita o caso de vídeo publicado sem legenda, como aconteceu no data-fifa).
    const semPub = b.videos.find((v) => !v.publicacao || !String(v.publicacao.titulo || '').trim() || !String(v.publicacao.legenda || '').trim())
    if (semPub) {
      return `Vídeo "${semPub.id}" precisa de título e descrição preenchidos (aba Publicar) para ser criado ou salvo.`
    }
  }
  return null
}
