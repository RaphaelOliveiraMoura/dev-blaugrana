import fs from 'node:fs/promises'
import path from 'node:path'
import { PROJECT_FILE, SAGAS_DIR, QUAD_DIR } from './config.mjs'
import { exists, writeIfChanged, backupFile } from './lib/arquivos.mjs'

// Fonte de verdade: data/project.json (global) + data/sagas/<id>.json + data/quadrinhos/<id>.json,
// um arquivo por item. Aqui é o único lugar que sabe disso: readDados monta o objeto
// completo que o front vê, writeDados distribui de volta.

// carrega uma coleção split (dir com um .json por item), respeitando a ordem dada
async function readColecao(dir, order) {
  const itens = []
  const vistos = new Set()
  for (const id of order || []) {
    const f = path.join(dir, id + '.json')
    if (await exists(f)) { itens.push(JSON.parse(await fs.readFile(f, 'utf-8'))); vistos.add(id) }
  }
  // robustez: inclui itens presentes no dir mas fora da ordem
  for (const f of (await fs.readdir(dir).catch(() => []))) {
    if (!f.endsWith('.json') || vistos.has(f.slice(0, -5))) continue
    itens.push(JSON.parse(await fs.readFile(path.join(dir, f), 'utf-8')))
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
  if (!item.estiloId) return item
  const { stylePrefix, ...resto } = item
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
  const sagas = await readColecao(SAGAS_DIR, sagaOrder)
  const quadrinhos = (await readColecao(QUAD_DIR, quadrinhoOrder)).map(casarTituloComPasta)

  // resolve o estilo centralizado só em memória (o writeDados remove esse cache de volta)
  const estilosById = Object.fromEntries((proj.estilos || []).map((e) => [e.id, e]))
  for (const item of [...sagas, ...quadrinhos, ...(proj.personagens || [])]) {
    resolverEstilo(item, estilosById)
  }
  return { ...proj, sagas, quadrinhos }
}

export async function writeDados(obj) {
  const { sagas = [], quadrinhos = [], ...proj } = obj
  proj.sagaOrder = sagas.map((s) => s.id)
  proj.quadrinhoOrder = quadrinhos.map((q) => q.id)
  if (proj.personagens) proj.personagens = proj.personagens.map(semEstiloResolvido)
  await writeIfChanged(PROJECT_FILE, JSON.stringify(proj, null, 2) + '\n', 20)
  await writeColecao(SAGAS_DIR, sagas)
  await writeColecao(QUAD_DIR, quadrinhos.map(casarTituloComPasta))
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
  if (b.quadrinhos != null) {
    if (!Array.isArray(b.quadrinhos)) return 'Payload inválido: quadrinhos deve ser um array.'
    if (b.quadrinhos.some((q) => !q || typeof q.id !== 'string' || !Array.isArray(q.paineis))) {
      return 'Payload inválido: todo quadrinho precisa de id e paineis[].'
    }
  }
  return null
}
