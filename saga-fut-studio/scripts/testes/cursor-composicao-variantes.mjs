#!/usr/bin/env node
// Testes de COMPOSIÇÃO: aproximar Pedri/Guardanapo no Cursor.
// Alvos: capa Abidal (1) e clímax Dani (5).
//
//   A  baseline atual (cópia)
//   B  Cursor + ref de composição (painel Pedri/Guardanapo)
//   C  Cursor + prompt só de staging (sem ref nova)
//   D  Codex controle (mesmo prompt base do painel)
//
// Saída: .../paineis/_testes-composicao/
import { mkdir, writeFile, copyFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateImage as cursorGenerate, instrucaoCursor } from '../../server/providers/cursor-image.mjs'
import { generateImage as codexGenerate } from '../../server/providers/codex-image.mjs'
import { generateImage as grokGenerate, instrucaoGrokImagem } from '../../server/providers/grok-image.mjs'
import { instrucaoCodex, PAPEL_DO_ANEXO, regraDeConflito } from '../../server/prompts.mjs'
import { CONTEUDO_DIR } from '../../server/config.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../../..')
const CONTEUDO = path.join(ROOT, 'saga-fut')

const ESTILO = path.join(CONTEUDO, 'estilos/rabisco-riso.png')
const COMP_PEDRI = path.join(CONTEUDO, 'quadrinhos/o-dia-pedri/paineis/3.png')
const COMP_GUARD = path.join(CONTEUDO, 'quadrinhos/o-dia-guardanapo/paineis/1.png')

const STAGING = `
EDITORIAL COMIC STAGING (overrides default hero centering):
- This is a newspaper-style CHARGE panel, NOT a TV-animation still and NOT a centered character portrait.
- Hierarchy: one clear SUBJECT, big negative space, strong light direction (spotlight OR backlight OR silhouette).
- The main figure may be SMALL or cropped or seen from behind; do NOT default to a centered full-body facing the camera.
- Prefer scale contrast (tiny figure vs huge crowd/trophy/space) and silence over busy detail.
- Flat washed risograph mood like a printed comic page.
`

const PAPEL_COMPOSICAO = (n) =>
  `- Image ${n} is a COMPOSITION / STAGING reference from another comic of the SAME house style. Copy ONLY its editorial staging: framing, camera distance, scale hierarchy, negative space, lighting drama, and how much of the frame the subject occupies. Do NOT copy its characters, faces, outfits, colors of the cast, or the specific story subject. Restage THIS panel's subject with that same compositional intelligence.`

function papeis(refs) {
  return refs.map((r, i) => {
    if (r.papel === 'composicao') return PAPEL_COMPOSICAO(i + 1)
    return (PAPEL_DO_ANEXO[r.papel] || PAPEL_DO_ANEXO.personagem)(i + 1)
  }).join('\n')
}

const ALVOS = {
  abidal1: {
    dir: path.join(CONTEUDO, 'quadrinhos/o-dia-abidal/paineis'),
    atual: '1.png',
    ficha: path.join(CONTEUDO, 'personagens/abidal-riso/base.png'),
    corpo: `crude lazy meme webcomic, drawn carelessly on purpose. EXACTLY the same height and body proportions as the style reference, about 3 heads tall, BIG head on short compact body. Flat colours, washed risograph inks. Cartoon boneco, never a portrait.

comic panel, bled to edges, NO frame, NO star badge, NO caption boxes. Cover: night stadium celebration, curiosity-first. A big silver Champions trophy held HIGH in the UPPER HALF by two dark-skinned arms; the lifter mostly from BELOW/BEHIND so FACE is hidden or only a shaved-head silhouette. Confetti, warm floodlights, packed blurred crowd. Garnet-red and navy-blue striped jersey sleeve visible. Flat cartoon style. NO crests, NO logos, NO readable text.`,
    compRef: COMP_GUARD,
  },
  dani5: {
    dir: path.join(CONTEUDO, 'quadrinhos/o-dia-dani/paineis'),
    atual: '5.png',
    ficha: path.join(CONTEUDO, 'personagens/iniesta-riso/base.png'),
    corpo: `crude lazy meme webcomic, drawn carelessly on purpose. EXACTLY the same height and body proportions as the style reference, about 3 heads tall, BIG head on short compact body. Flat colours, washed risograph inks. Cartoon boneco, never a portrait.

comic panel, bled to edges, NO frame, NO star badge, NO caption boxes. Completely silent. Night pitch celebration. The Spanish number 6 midfielder (light olive skin, short dark hair, lean, bright RED jersey) has pulled his jersey up revealing a plain WHITE undershirt with clear handwritten black capitals: DANI JARQUE SIEMPRE CON NOSOTROS. Soft blurred teammates. The undershirt message is the subject. NO crests, NO logos.`,
    compRef: COMP_PEDRI,
  },
}

const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7)
const alvos = only
  ? Object.entries(ALVOS).filter(([k]) => k === only || k.startsWith(only))
  : Object.entries(ALVOS)

async function runCursor({ id, prompt, refs, outAbs }) {
  const refsAbs = refs.map((r) => r.abs)
  const texto = instrucaoCursor({
    prompt: [prompt, papeis(refs), regraDeConflito(refs.filter((r) => r.papel !== 'composicao'))].filter(Boolean).join('\n'),
    referencias: refsAbs,
    outAbs,
    formato: '1152:1585',
  })
  // reforço: a instrução do Cursor lista paths; papéis de composição já estão no prompt
  console.log(`→ cursor ${id}`)
  const t0 = Date.now()
  await cursorGenerate({ cwd: CONTEUDO, prompt: texto, referencias: refsAbs, outAbs, timeoutMs: 600000 })
  console.log(`OK cursor ${id} ${Math.round((Date.now() - t0) / 1000)}s`)
}

async function runGrok({ id, prompt, refs, outAbs }) {
  const pedido = {
    composed: prompt,
    outRel: path.relative(CONTEUDO, outAbs),
    orient: 'Portrait vertical orientation: the PNG must be exactly 1152 x 1585 pixels. Never any other size.',
    refs: refs.map((r) => ({
      rel: path.relative(CONTEUDO, r.abs),
      papel: r.papel === 'composicao' ? 'cenario' : r.papel,
    })),
    dim: { w: 1152, h: 1585 },
  }
  const texto = instrucaoGrokImagem(pedido, outAbs, CONTEUDO)
  console.log(`→ grok ${id}`)
  const t0 = Date.now()
  await grokGenerate({ cwd: CONTEUDO, prompt: texto, outAbs, timeoutMs: 600000 })
  console.log(`OK grok ${id} ${Math.round((Date.now() - t0) / 1000)}s`)
}

async function runCodex({ id, prompt, refs, outAbs }) {
  const refsRel = refs.map((r) => path.relative(CONTEUDO, r.abs))
  const pedido = {
    composed: prompt,
    outRel: path.relative(CONTEUDO, outAbs),
    orient: 'Portrait vertical orientation: the PNG must be exactly 1152 x 1585 pixels. Never any other size.',
    refs: refs.map((r) => ({ rel: path.relative(CONTEUDO, r.abs), papel: r.papel === 'composicao' ? 'cenario' : r.papel })),
  }
  // composição via papel cenario (já descreve staging); reforço no composed
  const extra = refs.some((r) => r.papel === 'composicao')
    ? `\n${PAPEL_COMPOSICAO(refs.findIndex((r) => r.papel === 'composicao') + 1)}`
    : ''
  const texto = instrucaoCodex({
    ...pedido,
    composed: prompt + extra,
  })
  console.log(`→ codex ${id}`)
  const t0 = Date.now()
  await codexGenerate({
    cwd: CONTEUDO,
    prompt: texto,
    referencias: refsRel,
    outAbs,
    timeoutMs: 600000,
  })
  console.log(`OK codex ${id} ${Math.round((Date.now() - t0) / 1000)}s`)
}

const manifest = []

for (const [chave, alvo] of alvos) {
  const outDir = path.join(alvo.dir, '_testes-composicao')
  await mkdir(outDir, { recursive: true })
  const atual = path.join(alvo.dir, alvo.atual)
  if (existsSync(atual)) await copyFile(atual, path.join(outDir, 'A-baseline-atual.png'))

  const variantes = [
    {
      id: 'B-comp-ref-cursor',
      modelo: 'cursor',
      desc: 'ficha + estilo + ref composição (painel da casa)',
      staging: false,
      refs: [
        { abs: alvo.ficha, papel: 'personagem' },
        { abs: ESTILO, papel: 'estilo' },
        { abs: alvo.compRef, papel: 'composicao' },
      ],
    },
    {
      id: 'C-prompt-staging-cursor',
      modelo: 'cursor',
      desc: 'ficha + estilo + staging textual (sem ref composição)',
      staging: true,
      refs: [
        { abs: alvo.ficha, papel: 'personagem' },
        { abs: ESTILO, papel: 'estilo' },
      ],
    },
    {
      id: 'D-codex-controle',
      modelo: 'codex',
      desc: 'Codex com o mesmo prompt base (controle de motor)',
      staging: false,
      refs: [
        { abs: alvo.ficha, papel: 'personagem' },
        { abs: ESTILO, papel: 'estilo' },
      ],
    },
    {
      id: 'D2-grok-controle',
      modelo: 'grok',
      desc: 'Grok controle de motor (fallback se Codex estiver no limite)',
      staging: false,
      refs: [
        { abs: alvo.ficha, papel: 'personagem' },
        { abs: ESTILO, papel: 'estilo' },
      ],
    },
  ]

  // sequencial: evita estourar teto paralelo / cota
  for (const v of variantes) {
    if (process.env.SKIP_CODEX === '1' && v.modelo === 'codex') {
      console.log(`skip ${chave}/${v.id} (SKIP_CODEX=1)`)
      continue
    }
    const outAbs = path.join(outDir, `${v.id}.png`)
    const prompt = [alvo.corpo, v.staging ? STAGING : ''].filter(Boolean).join('\n')
    try {
      if (v.modelo === 'cursor') await runCursor({ id: `${chave}/${v.id}`, prompt, refs: v.refs, outAbs })
      else if (v.modelo === 'grok') await runGrok({ id: `${chave}/${v.id}`, prompt, refs: v.refs, outAbs })
      else await runCodex({ id: `${chave}/${v.id}`, prompt, refs: v.refs, outAbs })
      manifest.push({ alvo: chave, ...v, ok: true, out: path.relative(ROOT, outAbs) })
    } catch (e) {
      console.error(`FAIL ${chave}/${v.id}:`, e.message)
      manifest.push({ alvo: chave, ...v, ok: false, error: e.message })
    }
  }

  await writeFile(path.join(outDir, 'manifest.json'), JSON.stringify({
    quando: new Date().toISOString(),
    alvo: chave,
    hipotese: [
      'B: falta ref de COMPOSIÇÃO (estilo/ficha não ensinam staging)',
      'C: staging textual basta no Cursor?',
      'D: se Codex já parece Pedri, o gap é o motor',
    ],
    olhar: 'julgue SÓ composição: escala, luz, silêncio, hierarquia — ignore se o rosto mudou um pouco',
  }, null, 2))
}

await writeFile(path.join(CONTEUDO, 'quadrinhos/_testes-composicao-manifest.json'), JSON.stringify(manifest, null, 2))
console.log('>>> fim', manifest.filter((m) => m.ok).length, 'ok /', manifest.length)
