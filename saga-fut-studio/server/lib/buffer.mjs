// BUFFER → TikTok Photo Mode e Instagram (carrossel ou Reel).
//
// A API nativa das duas redes não entrega a biblioteca de áudio. O Buffer publica e o
// TikTok/Instagram põem som pelo lado deles. Inventar campo GraphQL que não existe quebra a mutation.
//
// Buffer NÃO ACEITA UPLOAD: só URL HTTPS pública, viva até a hora do post. PNG vira JPEG em
// `buffer/` (fora de posts/, senão a cópia pro celular leva o JPG junto). A URL sai do Cloudinary
// unsigned ou de `BUFFER_PUBLIC_BASE`.
//
// O TOKEN MORA EM `~/.sagafut/buffer.json`. Os mapas `tiktok` e `instagram` casam o canal da casa
// com o channelId pelo HANDLE: postar no perfil errado não dá 400, só publica no vizinho.

import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { existsSync } from 'node:fs'
import sharp from 'sharp'
import { CANAIS, canalValido, fichaDoCanal, CANAL_PADRAO } from '../../shared/canais.mjs'
import { quadrinhoSlide, quadrinhoSlideJpeg, quadrinhoVideo } from '../../shared/caminhos.mjs'
import { CONTEUDO_DIR } from '../config.mjs'

const DIR = path.join(os.homedir(), '.sagafut')
export const arquivoBuffer = () => path.join(DIR, 'buffer.json')
const GQL = 'https://api.buffer.com'

export function handleDeTexto(s) {
  return String(s || '')
    .replace(/^https?:\/\/(www\.)?(tiktok\.com|instagram\.com)\//i, '')
    .replace(/^@/, '')
    .split(/[/?#]/)[0]
    .trim()
    .toLowerCase()
}

export function ehServico(ch, servico) {
  return String(ch?.service || '').toLowerCase() === servico
}

export function ehTiktok(ch) {
  return ehServico(ch, 'tiktok')
}

export function ehInstagram(ch) {
  return ehServico(ch, 'instagram')
}

export function casarCanal(canaisBuffer, canalCasa, servico) {
  const handle = fichaDoCanal(canalCasa).handle.toLowerCase()
  return (canaisBuffer || []).filter((c) => ehServico(c, servico)).find((c) => [c.name, c.displayName, c.externalLink]
    .some((x) => handleDeTexto(x) === handle)) || null
}

export function casarTiktok(canaisBuffer, canalCasa) {
  return casarCanal(canaisBuffer, canalCasa, 'tiktok')
}

export function casarInstagram(canaisBuffer, canalCasa) {
  return casarCanal(canaisBuffer, canalCasa, 'instagram')
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

export function canalDaRede(cfg, canal, rede) {
  const id = canalValido(canal) ? canal : CANAL_PADRAO
  const info = cfg?.[rede]?.[id]
  const nomeRede = rede === 'instagram' ? 'Instagram' : 'TikTok'
  if (!info?.channelId) {
    throw new Error(`o ${nomeRede} de ${fichaDoCanal(id).nome} ainda não está mapeado no Buffer. `
      + 'Conecte os dois perfis no Buffer e rode node scripts/buffer-conectar.mjs')
  }
  return info
}

export function canalTiktokDaCasa(cfg, canal) {
  return canalDaRede(cfg, canal, 'tiktok')
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

const dormir = (ms) => new Promise((r) => setTimeout(r, ms))

function transitorioCloudinary(status) {
  return status === 420 || status === 429 || status === 500
    || status === 502 || status === 503 || status === 504
}

async function subirCloudinary({ abs, quadId, numero, canal, hosp, recurso = 'image' }) {
  const bytes = await fs.readFile(abs)
  const video = recurso === 'video'
  const endpoint = `https://api.cloudinary.com/v1_1/${hosp.cloud}/${video ? 'video' : 'image'}/upload`
  const tentativas = 5
  let ultimo = ''
  for (let i = 0; i < tentativas; i++) {
    const form = new FormData()
    form.append('file', new Blob([bytes], { type: video ? 'video/mp4' : 'image/jpeg' }),
      video ? `${quadId}.mp4` : `slide-${numero}.jpg`)
    form.append('upload_preset', hosp.preset)
    form.append('folder', `${canal}/${quadId}`)
    form.append('public_id', video ? `reel-${Date.now()}` : `slide-${numero}-${Date.now()}`)
    let r
    try {
      r = await fetch(endpoint, {
        method: 'POST', body: form, signal: AbortSignal.timeout(video ? 180_000 : 60_000),
      })
    } catch (e) {
      ultimo = e.message
      if (i < tentativas - 1) { await dormir(700 * 2 ** i); continue }
      break
    }
    const raw = await r.text()
    let j = {}
    try { j = JSON.parse(raw) } catch { /* 503 às vezes vem HTML, sem JSON */ }
    if (r.ok && j.secure_url) return j.secure_url
    ultimo = r.headers.get('x-cld-error') || j.error?.message || raw.slice(0, 180) || String(r.status)
    if (transitorioCloudinary(r.status) && i < tentativas - 1) {
      await dormir(700 * 2 ** i)
      continue
    }
    break
  }
  throw new Error(`Cloudinary recusou ${recurso === 'video' ? 'o vídeo' : `o slide ${numero}`}: ${ultimo}`)
}

async function urlPublica({ abs, rel, quadId, numero, canal, cfg, recurso = 'image' }) {
  const hosp = hospedagemDe(cfg)
  if (!hosp) {
    throw new Error('Buffer precisa de URL pública HTTPS (não aceita upload). '
      + 'Configure CLOUDINARY_CLOUD_NAME + CLOUDINARY_UPLOAD_PRESET ou BUFFER_PUBLIC_BASE. '
      + 'Ver saga-fut/docs/BUFFER.md')
  }
  if (hosp.tipo === 'public_base') return `${hosp.base}/files/${rel}`
  return subirCloudinary({ abs, quadId, numero, canal, hosp, recurso })
}

function textoDoPost(quad, rede) {
  const campo = rede === 'instagram' ? quad.publicacao?.instagram : quad.publicacao?.tiktok
  const tk = String(campo || '').trim()
  const corpo = tk && !/^https?:/i.test(tk) ? tk : String(quad.legenda || '').trim()
  return corpo.length <= 2200 ? corpo : corpo.slice(0, 2199).trimEnd() + '…'
}

async function criarPost(cfg, input) {
  const data = await gql(cfg, `
    mutation Criar($input: CreatePostInput!) {
      createPost(input: $input) {
        ... on PostActionSuccess { post { id dueAt status } }
        ... on MutationError { message }
      }
    }`, { input })
  const out = data?.createPost
  if (out?.message) throw new Error(out.message)
  if (!out?.post?.id) throw new Error(`Buffer não devolveu o post: ${JSON.stringify(out).slice(0, 300)}`)
  return out.post
}

async function urlsDosSlides({ quad, canal, cfg }) {
  const paineis = (quad.paineis || []).map((p) => p.numero).filter((n) => n != null)
  if (!paineis.length) throw new Error('este quadrinho não tem painéis')
  const urls = []
  for (const numero of paineis) {
    if (urls.length) await dormir(400)
    const slide = await jpegDoSlide(quad.id, numero)
    urls.push(await urlPublica({ ...slide, quadId: quad.id, numero, canal, cfg }))
  }
  return urls
}

export async function agendarTiktok({ quad, quando }) {
  const cfg = await lerConfig()
  const canal = canalValido(quad.canal) ? quad.canal : CANAL_PADRAO
  const tk = canalTiktokDaCasa(cfg, canal)
  const urls = await urlsDosSlides({ quad, canal, cfg })
  const titulo = String(quad.publicacao?.titulo || quad.titulo || quad.id).slice(0, 150)
  const post = await criarPost(cfg, {
    text: textoDoPost(quad, 'tiktok') || titulo,
    channelId: tk.channelId,
    schedulingType: 'automatic',
    mode: 'customScheduled',
    dueAt: quando,
    needsApproval: false,
    assets: urls.map((url) => ({ image: { url } })),
    metadata: { tiktok: { title: titulo } },
  })
  return {
    postId: post.id, dueAt: post.dueAt || quando, channelId: tk.channelId,
    handle: tk.handle || fichaDoCanal(canal).handle, canal, slides: urls.length,
  }
}

export async function agendarInstagram({ quad, quando, modo }) {
  const cfg = await lerConfig()
  const canal = canalValido(quad.canal) ? quad.canal : CANAL_PADRAO
  const ig = canalDaRede(cfg, canal, 'instagram')
  const titulo = String(quad.publicacao?.titulo || quad.titulo || quad.id).slice(0, 150)
  const texto = textoDoPost(quad, 'instagram') || titulo
  let assets
  if (modo === 'reel') {
    const rel = quadrinhoVideo(quad.id)
    const abs = path.join(CONTEUDO_DIR, rel)
    if (!existsSync(abs)) {
      throw new Error('Não existe vídeo deste quadrinho ainda. Monte na aba Vídeo (Montar o quadrinho inteiro) e volte.')
    }
    const url = await urlPublica({ abs, rel, quadId: quad.id, numero: 'reel', canal, cfg, recurso: 'video' })
    assets = [{ video: { url } }]
  } else if (modo === 'carrossel') {
    const urls = await urlsDosSlides({ quad, canal, cfg })
    assets = urls.map((url) => ({ image: { url } }))
  } else {
    throw new Error(`modo "${modo}" não existe (use carrossel ou reel)`)
  }
  const post = await criarPost(cfg, {
    text: texto,
    channelId: ig.channelId,
    schedulingType: 'automatic',
    mode: 'customScheduled',
    dueAt: quando,
    needsApproval: false,
    assets,
    metadata: {
      instagram: {
        type: modo === 'reel' ? 'reel' : 'post',
        shouldShareToFeed: true,
        isAiGenerated: true,
      },
    },
  })
  return {
    postId: post.id, dueAt: post.dueAt || quando, channelId: ig.channelId,
    handle: ig.handle || fichaDoCanal(canal).handle, canal, modo,
    slides: modo === 'carrossel' ? assets.length : 1,
  }
}

export function statusDoCanal(cfg, canal) {
  const id = canalValido(canal) ? canal : CANAL_PADRAO
  const ficha = fichaDoCanal(id)
  const tk = cfg?.tiktok?.[id]
  const ig = cfg?.instagram?.[id]
  const hosp = hospedagemDe(cfg)
  const token = !!tokenDe(cfg)
  const mapeadoTk = !!tk?.channelId
  const mapeadoIg = !!ig?.channelId
  const comando = 'node scripts/buffer-conectar.mjs'
  return {
    pronto: token && mapeadoTk && !!hosp,
    canalStudio: id,
    handle: ficha.nome,
    comando,
    arquivo: arquivoBuffer(),
    token,
    mapeado: mapeadoTk,
    tiktok: tk || null,
    instagram: {
      pronto: token && mapeadoIg && !!hosp,
      mapeado: mapeadoIg,
      channelId: ig?.channelId || null,
      handle: ig?.handle || null,
      falta: [
        !token && 'token do Buffer (buffer-conectar.mjs)',
        !mapeadoIg && `Instagram ${ficha.nome} conectado no Buffer`,
        !hosp && 'CLOUDINARY_CLOUD_NAME+UPLOAD_PRESET ou BUFFER_PUBLIC_BASE',
      ].filter(Boolean),
    },
    hospedagem: hosp ? hosp.tipo : null,
    falta: [
      !token && 'token do Buffer (buffer-conectar.mjs)',
      !mapeadoTk && `TikTok ${ficha.nome} conectado no Buffer`,
      !hosp && 'CLOUDINARY_CLOUD_NAME+UPLOAD_PRESET ou BUFFER_PUBLIC_BASE',
    ].filter(Boolean),
    canaisCasa: CANAIS.map((c) => ({
      id: c.id, handle: c.nome,
      tiktok: !!cfg?.tiktok?.[c.id]?.channelId,
      instagram: !!cfg?.instagram?.[c.id]?.channelId,
    })),
  }
}
