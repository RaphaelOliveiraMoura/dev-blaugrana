// Confere posts do Buffer que já deveriam ter saído e republica os que
// caíram na falha transiente de mídia (CDN/timeout, não arquivo grande).
//
//   node scripts/buffer-vigiar.mjs
//
// Lê os JSON em data/quadrinhos/ só pra achar o postId. A republicação é no
// Buffer; se o studio estiver aberto, a aba Publicar também tenta sozinha.

import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { QUAD_DIR } from '../server/config.mjs'
import { lerPostBuffer, falhaTransitoriaDeMidia, republicarPostAgora } from '../server/lib/buffer.mjs'

const arquivos = (await readdir(QUAD_DIR)).filter((f) => f.endsWith('.json'))
let olhou = 0, sent = 0, pulou = 0, ok = 0, falhou = 0

for (const arq of arquivos) {
  const q = JSON.parse(await readFile(path.join(QUAD_DIR, arq), 'utf8'))
  const fichas = []
  if (q.tiktokBuffer?.postId) fichas.push({ onde: 'tiktok', ...q.tiktokBuffer })
  for (const modo of ['carrossel', 'reel']) {
    const f = q.instagramBuffer?.[modo]
    if (f?.postId) fichas.push({ onde: `instagram.${modo}`, ...f })
  }
  for (const f of fichas) {
    olhou++
    let post
    try { post = await lerPostBuffer(f.postId) }
    catch (e) { console.log(`  ? ${q.id} ${f.onde}: ${e.message}`); falhou++; continue }
    if (post.status === 'sent') { sent++; continue }
    if (post.status !== 'error') { pulou++; continue }
    if (!falhaTransitoriaDeMidia(post.error)) {
      console.log(`  x ${q.id} ${f.onde}: erro que não é timeout (${post.error?.message || post.status})`)
      falhou++
      continue
    }
    try {
      const r = await republicarPostAgora(f.postId)
      console.log(`  ${r.ja ? '=' : '+'} ${q.id} ${f.onde} → ${r.post.status}`)
      ok++
    } catch (e) {
      console.log(`  x ${q.id} ${f.onde}: ${e.message}`)
      falhou++
    }
  }
}

console.log(`\n${olhou} posts · ${sent} no ar · ${ok} republicados · ${pulou} ainda na fila · ${falhou} falhou`)
if (falhou) process.exit(1)
