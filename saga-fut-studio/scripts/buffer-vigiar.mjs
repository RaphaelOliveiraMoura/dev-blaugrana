// Confere a fila do Buffer: título do Photo Mode > 90 (o TikTok recusa na hora H)
// e falha transiente de mídia. Encurta o título SEM mexer no horário; republica
// só quem já caiu.
//
//   node scripts/buffer-vigiar.mjs
//
// Lê os JSON em data/quadrinhos/ só pra achar o postId.

import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { QUAD_DIR } from '../server/config.mjs'
import {
  lerConfig, gql, lerPostBuffer, falhaTransitoriaDeMidia, republicarPostAgora,
  tituloTiktokEstoura, encurtarTituloTiktokNoBuffer, TITULO_TIKTOK_MAX,
} from '../server/lib/buffer.mjs'

const arquivos = (await readdir(QUAD_DIR)).filter((f) => f.endsWith('.json'))
const pecas = []
for (const arq of arquivos) {
  const q = JSON.parse(await readFile(path.join(QUAD_DIR, arq), 'utf8'))
  if (q.tiktokBuffer?.postId) pecas.push({ id: q.id, onde: 'tiktok', postId: q.tiktokBuffer.postId })
  for (const modo of ['carrossel', 'reel']) {
    const f = q.instagramBuffer?.[modo]
    if (f?.postId) pecas.push({ id: q.id, onde: `instagram.${modo}`, postId: f.postId })
  }
}

const vistos = new Set(pecas.filter((p) => p.onde === 'tiktok').map((p) => p.postId))
try {
  const cfg = await lerConfig()
  const org = cfg.organizationId
  const channelIds = Object.values(cfg.tiktok || {}).map((x) => x.channelId).filter(Boolean)
  if (org && channelIds.length) {
    const d = await gql(cfg, `
      query Fila($org: OrganizationId!, $channelIds: [ChannelId!]) {
        posts(first: 50, input: {
          organizationId: $org
          filter: { status: [scheduled, error, sending], channelIds: $channelIds }
        }) {
          edges { node { id } }
        }
      }`, { org, channelIds })
    for (const e of d?.posts?.edges || []) {
      const id = e.node?.id
      if (id && !vistos.has(id)) {
        pecas.push({ id: `(fora do json)`, onde: 'tiktok', postId: id })
        vistos.add(id)
      }
    }
  }
} catch (e) {
  console.log(`  ? fila extra do Buffer: ${e.message}`)
}

let olhou = 0, sent = 0, fila = 0, titulos = 0, ok = 0, falhou = 0

console.log(`== títulos Photo Mode (teto ${TITULO_TIKTOK_MAX}) ==\n`)
for (const p of pecas.filter((x) => x.onde === 'tiktok')) {
  olhou++
  let post
  try { post = await lerPostBuffer(p.postId) }
  catch (e) { console.log(`  ? ${p.id}: ${e.message}`); falhou++; continue }
  const titulo = post.metadata?.title || ''
  const n = [...titulo].length
  const marca = tituloTiktokEstoura(titulo) ? 'LONGO' : 'ok'
  console.log(`  ${marca} ${n}  ${post.status.padEnd(10)}  ${p.id}  ${titulo || '(sem título)'}`)
  if (post.status === 'sent') { sent++; continue }
  if (!tituloTiktokEstoura(titulo)) continue
  try {
    const r = await encurtarTituloTiktokNoBuffer(p.postId)
    console.log(`    → ${r.ja ? 'já estava certo' : `cortado: ${r.titulo}`}`)
    if (!r.ja) titulos++
  } catch (e) {
    console.log(`    x ${e.message}`)
    falhou++
  }
}

console.log(`\n== falhas de mídia ==\n`)
for (const p of pecas) {
  let post
  try { post = await lerPostBuffer(p.postId) }
  catch { continue }
  if (post.status === 'sent') continue
  if (post.status !== 'error' && !(post.status === 'sending' && post.error)) {
    if (p.onde === 'tiktok' || p.onde.startsWith('instagram')) fila++
    continue
  }
  if (!falhaTransitoriaDeMidia(post.error)) {
    console.log(`  x ${p.id} ${p.onde}: ${post.error?.rawError || post.error?.message || post.status}`)
    falhou++
    continue
  }
  try {
    const r = await republicarPostAgora(p.postId)
    console.log(`  ${r.ja ? '=' : '+'} ${p.id} ${p.onde} → ${r.post.status}`)
    ok++
  } catch (e) {
    console.log(`  x ${p.id} ${p.onde}: ${e.message}`)
    falhou++
  }
}

console.log(`\n${olhou} tiktoks · ${sent} no ar · ${titulos} títulos cortados · ${ok} republicados · ${falhou} falhou`)
if (falhou) process.exit(1)
