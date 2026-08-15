// CONECTA O BUFFER AOS DOIS TIKTOKS DA CASA, uma vez só.
//
//   BUFFER_ACCESS_TOKEN=… node scripts/buffer-conectar.mjs
//
// O token sai de Buffer → API settings (chave pessoal, não OAuth de app). Ele grava
// `~/.sagafut/buffer.json` com o mapa handle → channelId. Sem esse mapa, o studio não tem
// como saber qual canal do Buffer é o @futgibi: publicaria no primeiro TikTok da lista.
//
// Passo a passo: saga-fut/docs/BUFFER.md

import { CANAIS, fichaDoCanal } from '../shared/canais.mjs'
import {
  lerConfig, gravarConfig, tokenDe, listarOrganizacoes, listarCanais,
  casarTiktok, ehTiktok, handleDeTexto, arquivoBuffer, hospedagemDe,
} from '../server/lib/buffer.mjs'

const token = process.env.BUFFER_ACCESS_TOKEN
if (!token) {
  const velho = await lerConfig()
  if (!tokenDe(velho)) {
    console.error(`
Falta o token. Crie em Buffer → API settings e rode:

  BUFFER_ACCESS_TOKEN=cole-aqui node scripts/buffer-conectar.mjs

Não passe como --token=: argumento fica no histórico do shell.
Passo a passo em saga-fut/docs/BUFFER.md.
`)
    process.exit(1)
  }
}

const anterior = (await lerConfig()) || {}
const cfg = {
  ...anterior,
  access_token: token || anterior.access_token,
}

if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_UPLOAD_PRESET) {
  cfg.cloudinary = {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET,
  }
}
if (process.env.BUFFER_PUBLIC_BASE) {
  cfg.publicBase = process.env.BUFFER_PUBLIC_BASE.replace(/\/+$/, '')
}

const orgs = await listarOrganizacoes(cfg)
if (!orgs.length) {
  console.error('esta conta Buffer não tem organização. Confira o token.')
  process.exit(1)
}
if (orgs.length > 1) {
  console.log('Mais de uma organização. Usando a primeira:')
  for (const o of orgs) console.log(`  ${o.id}  ${o.name || ''}`)
}
cfg.organizationId = orgs[0].id

const canais = await listarCanais(cfg, cfg.organizationId)
const tiktoks = canais.filter(ehTiktok)
console.log(`\nTikToks no Buffer (${tiktoks.length}):`)
for (const c of tiktoks) {
  const h = handleDeTexto(c.name) || handleDeTexto(c.displayName) || handleDeTexto(c.externalLink)
  console.log(`  ${c.id}  @${h || '?'}  ${c.isDisconnected ? 'DESCONECTADO' : ''} ${c.isLocked ? 'TRAVADO' : ''}`)
}

cfg.tiktok = { ...(anterior.tiktok || {}) }
for (const casa of CANAIS) {
  const match = casarTiktok(canais, casa.id)
  if (!match) {
    console.error(`\nNÃO ACHEI o TikTok ${casa.nome} no Buffer.`)
    console.error(`Conecte @${casa.handle} em Buffer → Channels e rode de novo.`)
    continue
  }
  if (match.isDisconnected) {
    console.error(`\n${casa.nome} está DESCONECTADO no Buffer. Reautorize o canal lá e rode de novo.`)
    continue
  }
  cfg.tiktok[casa.id] = {
    channelId: match.id,
    handle: handleDeTexto(match.name) || casa.handle,
  }
  console.log(`\n${fichaDoCanal(casa.id).nome} → Buffer ${match.id}`)
}

const dest = await gravarConfig(cfg)
const hosp = hospedagemDe(cfg)
console.log(`\nGravado em ${dest} (permissão 600, fora do repositório).`)
if (!hosp) {
  console.log(`
AINDA FALTA hospedar as imagens (Buffer não aceita upload de arquivo).
Uma das duas:

  a) Cloudinary unsigned: crie um upload preset e rode de novo com
     CLOUDINARY_CLOUD_NAME=… CLOUDINARY_UPLOAD_PRESET=… BUFFER_ACCESS_TOKEN=… node scripts/buffer-conectar.mjs

  b) URL pública HTTPS do studio até a hora do post:
     BUFFER_PUBLIC_BASE=https://seu-tunel.exemplo node scripts/buffer-conectar.mjs
`)
} else {
  console.log(`Hospedagem: ${hosp.tipo}`)
}

const faltando = CANAIS.filter((c) => !cfg.tiktok?.[c.id]?.channelId)
if (faltando.length) {
  console.error(`\nAinda sem mapa: ${faltando.map((c) => c.nome).join(', ')}`)
  process.exit(1)
}
console.log('\nOs dois TikToks estão mapeados. Na aba Publicar o Photo Mode usa o canal da peça.')
