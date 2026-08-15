// BUFFER → TIKTOK PHOTO MODE. Só isso, de propósito.
//
// A API do TikTok (e a do Instagram) não expõe a biblioteca de áudio. Sem som o Photo Mode
// perde o alcance; com Buffer a faixa entra pelo lado do TikTok (som automático / recomendado),
// que é o que a UI já faz e o GraphQL NÃO tem campo pra pedir (`TikTokPostMetadataInput` só
// tem `title` e `isAiGenerated`). Inventar `autoAddMusic` quebraria a mutation.
//
// Buffer NÃO ACEITA UPLOAD: só URL HTTPS pública, viva até a hora do post. PNG o TikTok recusa,
// então o slide vira JPEG aqui. A URL sai do Cloudinary (unsigned) ou de `BUFFER_PUBLIC_BASE`
// apontando pro `/files` do studio, se ele estiver alcançável de fora até o publish.
//
// O TOKEN MORA EM `~/.sagafut/buffer.json`, fora do repo, permissão 600. O mapa `tiktok` casa
// o canal da casa (`devblaugrana` / `futgibi`) com o `channelId` do Buffer pelo HANDLE: postar
// no canal errado aqui não dá 400, só publica no perfil vizinho.

import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { existsSync } from 'node:fs'
import sharp from 'sharp'
import { CANAIS, canalValido, fichaDoCanal, CANAL_PADRAO } from '../../shared/canais.mjs'
import { quadrinhoSlide, quadrinhoSlideJpeg } from '../../shared/caminhos.mjs'
import { CONTEUDO_DIR } from '../config.mjs'

const DIR = path.join(os.homedir(), '.sagafut')
export const arquivoBuffer = () => path.join(DIR, 'buffer.json')
const GQL = 'https://api.buffer.com'

export function handleDeTexto(s) {
  return String(s || '')
    .replace(/^https?:\/\/(www\.)?tiktok\.com\/@?/i, '')
    .replace(/^@/, '')
    .split(/[/?#]/)[0]
    .trim()
    .toLowerCase()
}

export function ehTiktok(ch) {
  return String(ch?.service || '').toLowerCase() === 'tiktok'
}

// Casa o canal da CASA com o canal do Buffer pelo handle. Nome e displayName e o path da URL
// do perfil: o Buffer chama isso de `name` ("the handle name"), mas na prática já veio
// `@devblaugrana` num campo e `devblaugrana` no outro, então normaliza os dois.
export function casarTiktok(canaisBuffer, canalCasa) {
  const handle = fichaDoCanal(canalCasa).handle.toLowerCase()
  const tiktoks = (canaisBuffer || []).filter(ehTiktok)
  return tiktoks.find((c) => [c.name, c.displayName, c.externalLink]
    .some((x) => handleDeTexto(x) === handle)) || null
}

export async function lerConfig() {
  try { return JSON.parse(await fs.readFile(arquivoBuffer(), 'utf8')) } catch { return null }
}

export async function gravarConfig(dados) {
  await fs.mkdir(DIR, { recursive: true, mode: 0o700 })
  const dest = arquivoBuffer()
  await fs.writeFile(dest, JSON.stringify(dados, null, 2), { mode: 0o600 })
  return dest
}

export function tokenDe(cfg) {
  return process.env.BUFFER_ACCESS_TOKEN || cfg?.access_token || ''
}

export function hospedagemDe(cfg) {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME || cfg?.cloudinary?.cloudName
  const preset = process.env.CLOUDINARY_UPLOAD_PRESET || cfg?.cloudinary?.uploadPreset
  if (cloud && preset) return { tipo: 'cloudinary', cloud, preset }
  const base = (process.env.BUFFER_PUBLIC_BASE || cfg?.publicBase || '').replace(/\/+$/, '')
  if (base) return { tipo: 'public_base', base }
  return null
}

export async function gql(cfg, query, variables) {
  const token = tokenDe(cfg)
  if (!token) throw new Error('sem token do Buffer. Rode: BUFFER_ACCESS_TOKEN=… node scripts/buffer-conectar.mjs')
  const r = await fetch(GQL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query, variables }),
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(`Buffer HTTP ${r.status}: ${JSON.stringify(j).slice(0, 300)}`)
  if (j.errors?.length) throw new Error(j.errors.map((e) => e.message).join('; '))
  return j.data
}

export async function listarOrganizacoes(cfg) {
  const d = await gql(cfg, `query { account { organizations { id name } } }`)
  return d?.account?.organizations || []
}

export async function listarCanais(cfg, organizationId) {
  const d = await gql(cfg, `
    query Canais($organizationId: OrganizationId!) {
      channels(input: { organizationId: $organizationId }) {
        id name displayName service externalLink isDisconnected isLocked
      }
    }`, { organizationId })
  return d?.channels || []
}

export function canalTiktokDaCasa(cfg, canal) {
  const id = canalValido(canal) ? canal : CANAL_PADRAO
  const info = cfg?.tiktok?.[id]
  if (!info?.channelId) {
    throw new Error(`o TikTok de ${fichaDoCanal(id).nome} ainda não está mapeado no Buffer. `
      + 'Conecte os dois perfis no Buffer e rode node scripts/buffer-conectar.mjs')
  }
  return info
}

export async function jpegDoSlide(quadId, numero) {
  const png = path.join(CONTEUDO_DIR, quadrinhoSlide(quadId, numero))
  const jpgRel = quadrinhoSlideJpeg(quadId, numero)
  const jpg = path.join(CONTEUDO_DIR, jpgRel)
  if (!existsSync(png)) throw new Error(`falta o slide ${numero} em PNG (monte o carrossel na aba Publicar)`)
  await fs.mkdir(path.dirname(jpg), { recursive: true })
  // lado longo ≤ 1080: Photo Mode recusa PNG e não ganha nada com 4K. Flatten no branco porque
  // JPEG não tem alfa e o fundo transparente viraria preto no TikTok.
  await sharp(png)
    .rotate()
    .resize({ width: 1080, height: 1080, fit: 'inside', withoutEnlargement: true })
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: 85, mozjpeg: true })
    .toFile(jpg)
  return { abs: jpg, rel: jpgRel }
}

async function urlPublica({ abs, rel, quadId, numero, canal, cfg }) {
  const hosp = hospedagemDe(cfg)
  if (!hosp) {
    throw new Error('Buffer precisa de URL pública HTTPS (não aceita upload). '
      + 'Configure CLOUDINARY_CLOUD_NAME + CLOUDINARY_UPLOAD_PRESET ou BUFFER_PUBLIC_BASE. '
      + 'Ver saga-fut/docs/BUFFER.md')
  }
  if (hosp.tipo === 'public_base') return `${hosp.base}/files/${rel}`

  const bytes = await fs.readFile(abs)
  const form = new FormData()
  form.append('file', new Blob([bytes], { type: 'image/jpeg' }), path.basename(abs))
  form.append('upload_preset', hosp.preset)
  form.append('public_id', `${canal}_${quadId}_slide_${numero}`)
  form.append('overwrite', 'true')
  const r = await fetch(`https://api.cloudinary.com/v1_1/${hosp.cloud}/image/upload`, {
    method: 'POST', body: form,
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok || !j.secure_url) {
    throw new Error(`Cloudinary recusou o slide ${numero}: ${j.error?.message || r.status}`)
  }
  return j.secure_url
}

function textoDoPost(quad) {
  const tk = String(quad.publicacao?.tiktok || '').trim()
  const corpo = tk && !/^https?:/i.test(tk) ? tk : String(quad.legenda || '').trim()
  // 2200 é o teto do TikTok; estourar aqui falha a mutation DEPOIS de hospedar as imagens
  return corpo.length <= 2200 ? corpo : corpo.slice(0, 2199).trimEnd() + '…'
}

export async function agendarTiktok({ quad, dia, hora, quando }) {
  const cfg = await lerConfig()
  const canal = canalValido(quad.canal) ? quad.canal : CANAL_PADRAO
  const tk = canalTiktokDaCasa(cfg, canal)
  const paineis = (quad.paineis || []).map((p) => p.numero).filter((n) => n != null)
  if (!paineis.length) throw new Error('este quadrinho não tem painéis')

  const urls = []
  for (const numero of paineis) {
    const slide = await jpegDoSlide(quad.id, numero)
    urls.push(await urlPublica({ ...slide, quadId: quad.id, numero, canal, cfg }))
  }

  const titulo = String(quad.publicacao?.titulo || quad.titulo || quad.id).slice(0, 150)
  const data = await gql(cfg, `
    mutation Criar($input: CreatePostInput!) {
      createPost(input: $input) {
        ... on PostActionSuccess { post { id dueAt status } }
        ... on MutationError { message }
      }
    }`, {
    input: {
      text: textoDoPost(quad) || titulo,
      channelId: tk.channelId,
      schedulingType: 'automatic',
      mode: 'customScheduled',
      dueAt: quando,
      needsApproval: false,
      assets: urls.map((url) => ({ image: { url } })),
      metadata: { tiktok: { title: titulo } },
    },
  })

  const out = data?.createPost
  if (out?.message) throw new Error(out.message)
  if (!out?.post?.id) throw new Error(`Buffer não devolveu o post: ${JSON.stringify(out).slice(0, 300)}`)
  return {
    postId: out.post.id,
    dueAt: out.post.dueAt || quando,
    channelId: tk.channelId,
    handle: tk.handle || fichaDoCanal(canal).handle,
    canal,
    slides: urls.length,
  }
}

export function statusDoCanal(cfg, canal) {
  const id = canalValido(canal) ? canal : CANAL_PADRAO
  const ficha = fichaDoCanal(id)
  const tk = cfg?.tiktok?.[id]
  const hosp = hospedagemDe(cfg)
  const token = !!tokenDe(cfg)
  const mapeado = !!tk?.channelId
  return {
    pronto: token && mapeado && !!hosp,
    canalStudio: id,
    handle: ficha.nome,
    comando: 'BUFFER_ACCESS_TOKEN=… node scripts/buffer-conectar.mjs',
    arquivo: arquivoBuffer(),
    token,
    mapeado,
    tiktok: tk || null,
    hospedagem: hosp ? hosp.tipo : null,
    falta: [
      !token && 'token do Buffer (buffer-conectar.mjs)',
      !mapeado && `TikTok ${ficha.nome} conectado no Buffer`,
      !hosp && 'CLOUDINARY_CLOUD_NAME+UPLOAD_PRESET ou BUFFER_PUBLIC_BASE',
    ].filter(Boolean),
    canaisCasa: CANAIS.map((c) => ({
      id: c.id, handle: c.nome, mapeado: !!cfg?.tiktok?.[c.id]?.channelId,
    })),
  }
}
