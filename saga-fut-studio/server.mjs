import express from 'express'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { generateImage } from './providers/codex-image.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CONTEUDO_DIR = path.resolve(__dirname, '../saga-fut')
const DATA_DIR = path.join(CONTEUDO_DIR, 'data')          // fonte de verdade: split por saga
const PROJECT_FILE = path.join(DATA_DIR, 'project.json')
const SAGAS_DIR = path.join(DATA_DIR, 'sagas')
const QUAD_DIR = path.join(DATA_DIR, 'quadrinhos')       // uma por quadrinho
const PORT = 4600
const AUDIO_EXTS = ['mp3', 'wav', 'm4a', 'aac']

// --- helpers de ffmpeg ---------------------------------------------------
function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args)
    let err = ''
    p.stderr.on('data', (d) => (err += d))
    p.on('error', (e) => reject(new Error(`${cmd} não encontrado: ${e.message}`)))
    p.on('close', (code) => (code === 0 ? resolve(err) : reject(new Error(err.slice(-800)))))
  })
}

async function probeDuration(file) {
  let out = ''
  await new Promise((resolve, reject) => {
    const p = spawn('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file])
    p.stdout.on('data', (d) => (out += d))
    p.on('error', reject)
    p.on('close', () => resolve())
  })
  return parseFloat(out.trim()) || 0
}

async function firstExisting(paths) {
  for (const p of paths) {
    try { await fs.access(p); return p } catch {}
  }
  return null
}

async function exists(p) {
  try { await fs.access(p); return true } catch { return false }
}

// Backup antes de sobrescrever: copia o arquivo atual para _backups/<caminho>.<ts>.<ext>
// e mantém só as últimas `keep` versões daquele arquivo. Nunca lança (best-effort).
async function backupFile(absPath, keep = 5) {
  try {
    await fs.access(absPath)
  } catch { return null } // não existe ainda → nada a preservar
  try {
    const rel = path.relative(CONTEUDO_DIR, absPath)
    const ext = path.extname(rel)
    const base = path.basename(rel, ext)
    const dir = path.join(CONTEUDO_DIR, '_backups', path.dirname(rel))
    await fs.mkdir(dir, { recursive: true })
    const ts = new Date().toISOString().replace(/[:.]/g, '-')
    await fs.copyFile(absPath, path.join(dir, `${base}.${ts}${ext}`))
    // poda: mantém só as `keep` mais recentes desse arquivo
    const irmaos = (await fs.readdir(dir))
      .filter((f) => f.startsWith(base + '.') && f.endsWith(ext))
      .sort()
    for (const velho of irmaos.slice(0, Math.max(0, irmaos.length - keep))) {
      await fs.rm(path.join(dir, velho), { force: true })
    }
    return dir
  } catch { return null } // backup é best-effort: nunca bloqueia a operação
}

async function atomicWrite(absPath, str) {
  await fs.mkdir(path.dirname(absPath), { recursive: true })
  const tmp = absPath + '.tmp'
  await fs.writeFile(tmp, str, 'utf-8')
  await fs.rename(tmp, absPath) // rename é atômico no mesmo FS
}

// Fonte de verdade = data/project.json (global) + data/sagas/<id>.json (uma por saga).
// Monta o objeto completo a partir deles.
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

async function readDados() {
  const proj = JSON.parse(await fs.readFile(PROJECT_FILE, 'utf-8'))
  const sagaOrder = proj.sagaOrder || []; delete proj.sagaOrder
  const quadrinhoOrder = proj.quadrinhoOrder || []; delete proj.quadrinhoOrder
  const sagas = await readColecao(SAGAS_DIR, sagaOrder)
  const quadrinhos = await readColecao(QUAD_DIR, quadrinhoOrder)
  // resolve o estilo centralizado: stylePrefix = estilo base (+ detalhe de arte próprio).
  // Só em memória (não persiste); o writeDados remove esse cache dos itens com estiloId.
  const estilosById = Object.fromEntries((proj.estilos || []).map((e) => [e.id, e]))
  for (const s of sagas) {
    const est = s.estiloId && estilosById[s.estiloId]
    if (est) s.stylePrefix = [est.stylePrefix, s.estiloExtra].filter(Boolean).join(', ')
  }
  for (const q of quadrinhos) {
    const est = q.estiloId && estilosById[q.estiloId]
    if (est) q.stylePrefix = [est.stylePrefix, q.estiloExtra].filter(Boolean).join(', ')
  }
  // personagem herda o estilo do catálogo e complementa com o detalhe próprio (mesma regra da saga/quadrinho)
  for (const c of (proj.personagens || [])) {
    const est = c.estiloId && estilosById[c.estiloId]
    if (est) c.stylePrefix = [est.stylePrefix, c.estiloExtra].filter(Boolean).join(', ')
  }
  return { ...proj, sagas, quadrinhos }
}

// grava só se o conteúdo mudou (com backup do anterior). Retorna true se escreveu.
async function writeIfChanged(absPath, str, keep) {
  let atual = null
  try { atual = await fs.readFile(absPath, 'utf-8') } catch {}
  if (atual === str) return false
  await backupFile(absPath, keep)
  await atomicWrite(absPath, str)
  return true
}

// Grava uma coleção split (um .json por item), atômico e com backup, só o que mudou.
// Item com estilo centralizado não guarda stylePrefix (é resolvido do catálogo no read).
async function writeColecao(dir, itens) {
  await fs.mkdir(dir, { recursive: true })
  const idsAtuais = new Set()
  for (const it of itens) {
    idsAtuais.add(it.id)
    let toWrite = it
    if (it.estiloId) { const { stylePrefix, ...rest } = it; toWrite = rest }
    await writeIfChanged(path.join(dir, it.id + '.json'), JSON.stringify(toWrite, null, 2) + '\n', 10)
  }
  // remove (com backup) arquivos de itens que não existem mais
  for (const f of (await fs.readdir(dir).catch(() => []))) {
    if (!f.endsWith('.json') || idsAtuais.has(f.slice(0, -5))) continue
    await backupFile(path.join(dir, f), 10)
    await fs.rm(path.join(dir, f), { force: true })
  }
}

// Distribui o objeto completo em arquivos separados por saga e por quadrinho.
// Só reescreve o que mudou → editar um item não churna os outros.
async function writeDados(obj) {
  const { sagas = [], quadrinhos = [], ...proj } = obj
  proj.sagaOrder = sagas.map((s) => s.id)
  proj.quadrinhoOrder = quadrinhos.map((q) => q.id)
  // personagem com estilo centralizado não guarda stylePrefix (é resolvido do catálogo no read)
  if (proj.personagens) {
    proj.personagens = proj.personagens.map((c) => {
      if (!c.estiloId) return c
      const { stylePrefix, ...rest } = c
      return rest
    })
  }
  await writeIfChanged(PROJECT_FILE, JSON.stringify(proj, null, 2) + '\n', 20)
  await writeColecao(SAGAS_DIR, sagas)
  await writeColecao(QUAD_DIR, quadrinhos)
}

const app = express()
app.use(express.json({ limit: '30mb' })) // PNGs de legenda por cena podem somar alguns MB

// Mídia do projeto (fichas, cenas, assets) servida direto da pasta de conteúdo
app.use('/files', express.static(CONTEUDO_DIR))

app.get('/api/dados', async (_req, res) => {
  try {
    res.json(await readDados())
  } catch (err) {
    res.status(500).json({ error: `Não foi possível ler os dados: ${err.message}` })
  }
})

app.put('/api/dados', async (req, res) => {
  try {
    const b = req.body
    // validação de sanidade: impede gravar um payload truncado/corrompido por cima do bom
    if (!b || typeof b !== 'object' || !b.projeto || !Array.isArray(b.personagens) || !Array.isArray(b.sagas)) {
      return res.status(400).json({ error: 'Payload inválido: esperado o objeto completo (projeto + personagens + sagas).' })
    }
    const semId = b.sagas.find((s) => !s || typeof s.id !== 'string' || !Array.isArray(s.episodios))
    if (semId) return res.status(400).json({ error: 'Payload inválido: toda saga precisa de id e episodios[].' })
    if (b.quadrinhos != null) {
      if (!Array.isArray(b.quadrinhos)) return res.status(400).json({ error: 'Payload inválido: quadrinhos deve ser um array.' })
      const qRuim = b.quadrinhos.find((q) => !q || typeof q.id !== 'string' || !Array.isArray(q.paineis))
      if (qRuim) return res.status(400).json({ error: 'Payload inválido: todo quadrinho precisa de id e paineis[].' })
    }
    await writeDados(b) // split por saga/quadrinho, atômico e com backup
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Checa quais arquivos de mídia existem (para o front esconder o que falta)
app.post('/api/media-exists', async (req, res) => {
  const paths = Array.isArray(req.body?.paths) ? req.body.paths : []
  const result = {}
  for (const rel of paths) {
    const safe = path.normalize(rel).replace(/^(\.\.[/\\])+/, '')
    try {
      await fs.access(path.join(CONTEUDO_DIR, safe))
      result[rel] = true
    } catch {
      result[rel] = false
    }
  }
  res.json(result)
})

// Status dos arquivos necessários para montar o rascunho de um episódio
async function epFiles(epId, nCenas) {
  const cenas = []
  for (let i = 1; i <= nCenas; i++) {
    const video = path.join(CONTEUDO_DIR, 'episodios', epId, 'cenas', `${i}.mp4`)
    const audio = await firstExisting(AUDIO_EXTS.map((e) => path.join(CONTEUDO_DIR, 'episodios', epId, 'audio', `${i}.${e}`)))
    let hasVideo = true
    try { await fs.access(video) } catch { hasVideo = false }
    cenas.push({ numero: i, video: hasVideo ? video : null, audio })
  }
  return cenas
}

// Progresso de todos os episódios com base nos ARQUIVOS em disco (imagem/vídeo/áudio)
app.get('/api/progress', async (_req, res) => {
  try {
    const d = await readDados()
    const out = {}
    for (const s of d.sagas || []) {
      for (const ep of s.episodios || []) {
        const total = ep.cenas.length
        let img = 0, vid = 0, audio = 0
        for (const c of ep.cenas) {
          if (c.imagem && await exists(path.join(CONTEUDO_DIR, c.imagem))) img++
          if (c.video && await exists(path.join(CONTEUDO_DIR, c.video))) vid++
          const a = await firstExisting(AUDIO_EXTS.map((e) => path.join(CONTEUDO_DIR, 'episodios', ep.id, 'audio', `${c.numero}.${e}`)))
          if (a) audio++
        }
        out[ep.id] = { img, vid, audio, total }
      }
    }
    // progresso dos quadrinhos: painéis com arte em disco
    const quadrinhos = {}
    for (const q of d.quadrinhos || []) {
      const total = (q.paineis || []).length
      let img = 0
      for (const p of q.paineis || []) {
        if (p.imagem && await exists(path.join(CONTEUDO_DIR, p.imagem))) img++
      }
      quadrinhos[q.id] = { img, total }
    }
    out.quadrinhos = quadrinhos
    res.json(out)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Geração de imagem via Codex (gpt-image-2 pela assinatura Plus). Até N em paralelo.
const MAX_CONCURRENT = 4
let emGeracao = 0
app.post('/api/generate/imagem', async (req, res) => {
  if (emGeracao >= MAX_CONCURRENT) return res.status(429).json({ error: `Limite de ${MAX_CONCURRENT} gerações simultâneas atingido — aguarde uma terminar.` })
  emGeracao++
  try {
    const { tipo, sagaId, epId, cenaNumero, personagemId, estiloId, quadrinhoId, painelNumero } = req.body || {}
    const d = await readDados()
    const promptRules = d.projeto?.promptRules || ''
    const quadRules = d.projeto?.quadrinhoRules || 'comic book panel, bold clean speech balloons with short legible text, expressive exaggerated faces; no real brand logos, no official crests, plain golden star instead; keep each character identical to their reference sheet.'
    const byId = Object.fromEntries((d.personagens || []).map((p) => [p.id, p]))
    const estilosById = Object.fromEntries((d.estilos || []).map((e) => [e.id, e]))

    let composed, outRel
    let orient = 'Portrait vertical orientation (tall 2:3).'
    const referencias = []

    // anexa as fichas JÁ EXISTENTES dos personagens indicados como referência de consistência
    async function anexarFichas(ids) {
      for (const pid of ids || []) {
        const p = byId[pid]
        if (p?.imagem && await exists(path.join(CONTEUDO_DIR, p.imagem))) referencias.push(p.imagem)
      }
    }

    if (tipo === 'ficha') {
      const p = byId[personagemId]
      if (!p) return res.status(400).json({ error: 'Personagem não encontrado.' })
      // estilo, em ordem de precedência:
      //   1. override explícito na request (estiloId) — o detalhe de arte do personagem continua valendo
      //   2. o estilo DO PRÓPRIO personagem (p.stylePrefix, já resolvido no readDados = base + estiloExtra)
      //   3. herdado da saga (legado, para fichas antigas sem estiloId)
      let stylePrefix = ''
      if (estiloId && estilosById[estiloId]) stylePrefix = [estilosById[estiloId].stylePrefix, p.estiloExtra].filter(Boolean).join(', ')
      else if (p.stylePrefix) stylePrefix = p.stylePrefix
      else { const saga = (d.sagas || []).find((s) => s.id === sagaId); stylePrefix = saga?.stylePrefix || '' }
      composed = `${stylePrefix}, ${p.promptFicha}\n\n${promptRules}`
      outRel = p.imagem
    } else if (tipo === 'cena') {
      const saga = (d.sagas || []).find((s) => s.id === sagaId)
      const ep = saga?.episodios.find((e) => e.id === epId)
      const cena = ep?.cenas.find((c) => c.numero === Number(cenaNumero))
      if (!saga || !ep || !cena) return res.status(400).json({ error: 'Cena não encontrada.' })
      composed = `${saga.stylePrefix}, ${cena.promptImagem}\n\n${promptRules}`
      outRel = cena.imagem
      await anexarFichas(cena.personagens)
    } else if (tipo === 'painel') {
      const q = (d.quadrinhos || []).find((x) => x.id === quadrinhoId)
      const painel = q?.paineis.find((p) => p.numero === Number(painelNumero))
      if (!q || !painel) return res.status(400).json({ error: 'Painel não encontrado.' })
      // a IA desenha os balões: as falas viram instruções de speech balloon no prompt
      const falas = (painel.falas || []).filter((f) => (f.texto || '').trim()).map((f) => {
        const nome = byId[f.personagem]?.nome
        return nome
          ? `${nome} says in a comic speech balloon: "${f.texto.trim()}"`
          : `a caption box reads: "${f.texto.trim()}"`
      })
      const corpo = [painel.promptImagem, falas.join('. ')].filter(Boolean).join('. ')
      composed = `${q.stylePrefix || ''}, comic panel. ${corpo}\n\n${quadRules}`
      outRel = painel.imagem
      orient = q.formato === '9:16' ? 'Vertical 9:16 orientation (tall).'
        : q.formato === '1:1' ? 'Square 1:1 orientation.'
        : 'Portrait 4:5 orientation.'
      await anexarFichas(q.elenco)
    } else {
      return res.status(400).json({ error: 'tipo inválido (use ficha|cena|painel).' })
    }

    const outAbs = path.join(CONTEUDO_DIR, outRel)
    const refHint = referencias.length
      ? `\nYou are given ${referencias.length} reference image(s) showing the canonical look of the character(s) in this image. Pass them to the image tool as INPUT IMAGES with HIGH input fidelity, so each character stays IDENTICAL to their reference (same face, same hair, same outfit).\n`
      : ''
    const prompt = `Use your built-in image generation tool (gpt-image-2) to create ONE image and save it as a PNG at exactly this relative path inside the current workspace: ${outRel}
${refHint}${orient}

IMAGE PROMPT:
${composed}

Write the final PNG to that exact path (${outRel}). Overwrite it if it already exists. Do not ask for confirmation.`

    await backupFile(outAbs) // preserva a imagem anterior antes de sobrescrever
    await generateImage({ cwd: CONTEUDO_DIR, prompt, referencias, outAbs })
    res.json({ ok: true, path: outRel, referencias })
  } catch (err) {
    res.status(500).json({ error: err.message })
  } finally {
    emGeracao--
  }
})

app.get('/api/render-status/:epId/:n', async (req, res) => {
  try {
    const cenas = await epFiles(req.params.epId, Number(req.params.n))
    const rough = path.join(CONTEUDO_DIR, 'episodios', req.params.epId, 'rough-cut.mp4')
    let temRough = true
    try { await fs.access(rough) } catch { temRough = false }
    res.json({
      cenas: cenas.map((c) => ({ numero: c.numero, video: !!c.video, audio: !!c.audio })),
      roughCut: temRough ? `episodios/${req.params.epId}/rough-cut.mp4` : null,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// distribui os blocos de legenda ao longo da fala, proporcional ao tamanho do texto.
// startAt > 0 (cena 1 com hook): atrasa o início das legendas até o hook sair.
function capWindows(capList, speakDur, totalDur, startAt = 0) {
  const totalChars = capList.reduce((s, c) => s + Math.max(1, (c.text || '').length), 0) || 1
  let acc = 0
  if (startAt > 0) {
    const span = Math.max(0.1, totalDur - startAt)
    return capList.map((c, i) => {
      const start = startAt + span * (acc / totalChars)
      acc += Math.max(1, (c.text || '').length)
      const end = i === capList.length - 1 ? totalDur : startAt + span * (acc / totalChars)
      return { start, end }
    })
  }
  return capList.map((c, i) => {
    const start = speakDur * (acc / totalChars)
    acc += Math.max(1, (c.text || '').length)
    const end = i === capList.length - 1 ? totalDur : speakDur * (acc / totalChars)
    return { start, end }
  })
}

// grava os PNGs de legenda no tmp e monta a cadeia de overlays (base = [vbase])
async function prepCaptions(capList, tmp, cNum, speakDur, totalDur, capInputStart, capStartAt = 0) {
  if (!capList || !capList.length) return { inputs: [], segs: [], out: '[vbase]' }
  const windows = capWindows(capList, speakDur, totalDur, capStartAt)
  const inputs = []
  const segs = []
  let prev = '[vbase]'
  let idx = 0 // posição do input entre os PNGs efetivamente adicionados
  for (let k = 0; k < capList.length; k++) {
    if (!capList[k].png || !capList[k].png.startsWith('data:image/png;base64,')) continue
    const p = path.join(tmp, `cap${cNum}_${k}.png`)
    await fs.writeFile(p, Buffer.from(capList[k].png.split(',')[1], 'base64'))
    inputs.push('-i', p)
    const out = `[vc${idx}]`
    const w = windows[k]
    segs.push(`${prev}[${capInputStart + idx}:v]overlay=0:0:enable='between(t,${w.start.toFixed(2)},${w.end.toFixed(2)})'${out}`)
    prev = out
    idx++
  }
  return { inputs, segs, out: prev }
}

// Ponto de início (segundos) de cada faixa: onde o tema entra, pra pular a intro quieta.
// Propriedade GLOBAL da faixa (vale em qualquer cena/episódio). Sidecar em assets/musica/.
const INICIOS_FILE = path.join(CONTEUDO_DIR, 'assets', 'musica', 'inicios.json')
async function readInicios() { try { return JSON.parse(await fs.readFile(INICIOS_FILE, 'utf-8')) } catch { return {} } }

// Lista as trilhas disponíveis em assets/musica + o início salvo de cada uma
app.get('/api/musicas', async (req, res) => {
  try {
    const dir = path.join(CONTEUDO_DIR, 'assets', 'musica')
    let files = []
    try { files = await fs.readdir(dir) } catch {}
    const musicas = files.filter((f) => /\.(mp3|m4a|wav|ogg)$/i.test(f)).sort()
    res.json({ musicas, inicios: await readInicios() })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Salva o ponto de início (segundos) de uma faixa
app.post('/api/musica-inicio', async (req, res) => {
  try {
    const { file, inicio } = req.body || {}
    if (!file) return res.status(400).json({ error: 'Falta file.' })
    const inicios = await readInicios()
    const v = Math.max(0, Math.round(Number(inicio) || 0))
    if (v) inicios[path.basename(String(file))] = v
    else delete inicios[path.basename(String(file))]
    await fs.mkdir(path.dirname(INICIOS_FILE), { recursive: true })
    await fs.writeFile(INICIOS_FILE, JSON.stringify(inicios, null, 2) + '\n', 'utf-8')
    res.json({ ok: true, inicios })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Monta o rascunho: concatena os clipes + narração por cena + ambiência baixa
app.post('/api/render', async (req, res) => {
  const { epId, nCenas, endCardPng, hookCardPng, captions, musica, musicaVol, trilhaPorCena } = req.body || {}
  if (!epId || !nCenas) return res.status(400).json({ error: 'Faltam epId/nCenas.' })
  try {
    const cenas = await epFiles(epId, nCenas)
    const faltando = cenas.filter((c) => !c.video).map((c) => c.numero)
    if (faltando.length) return res.status(400).json({ error: `Faltam clipes de vídeo das cenas: ${faltando.join(', ')}` })

    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'saga-render-'))
    const segs = []
    const ajustes = []
    let comLegenda = false
    let comMusica = false
    let musTrocas = 0
    const HOOK_DUR = 2.8 // segundos que o hook fica na tela; a legenda da cena 1 espera esse tempo
    const hasHook = !!(hookCardPng && hookCardPng.startsWith('data:image/png;base64,'))
    const MAX_TEMPO = 1.35 // acelera a narração até aqui para caber no clipe (acima disso, som degrada)
    for (const c of cenas) {
      const seg = path.join(tmp, `seg${c.numero}.mp4`)
      const vfBase = 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,fps=30'
      const capList = captions && captions[c.numero]
      if (capList && capList.length) comLegenda = true
      if (c.audio) {
        const clipDur = await probeDuration(c.video)
        const narrDur = await probeDuration(c.audio)
        // se a narração passa do clipe, acelera levemente (preserva o tom) em vez de congelar
        let tempo = 1.0
        if (narrDur > clipDur + 0.1) tempo = Math.min(narrDur / clipDur, MAX_TEMPO)
        const narrEfetiva = narrDur / tempo
        const total = Math.max(clipDur, narrEfetiva)
        const extra = Math.max(0, total - clipDur) // congela só o resíduo se o teto de tempo foi atingido (~0)
        const narFilter = tempo > 1.001 ? `atempo=${tempo.toFixed(3)},volume=1.0` : 'volume=1.0'
        if (tempo > 1.001) ajustes.push(`cena ${c.numero}: narração ${tempo.toFixed(2)}x`)
        // legendas sincronizam com a fala (narrEfetiva); na cena 1 com hook, esperam o hook sair
        const capStartAt = hasHook && c === cenas[0] ? HOOK_DUR : 0
        const cap = await prepCaptions(capList, tmp, c.numero, narrEfetiva, total, 2, capStartAt)
        await run('ffmpeg', [
          '-y', '-i', c.video, '-i', c.audio, ...cap.inputs,
          '-filter_complex',
          [
            `[0:v]${vfBase},tpad=stop_mode=clone:stop_duration=${extra.toFixed(2)}[vbase]`,
            ...cap.segs,
            '[0:a]volume=0.15[amb]',
            `[1:a]${narFilter}[nar]`,
            '[amb][nar]amix=inputs=2:duration=longest:normalize=0[a]',
          ].join(';'),
          '-map', cap.out, '-map', '[a]', '-t', total.toFixed(2),
          '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-ar', '48000', seg,
        ])
      } else if (capList && capList.length) {
        // sem narração, mas com legenda: distribui pela duração do clipe
        const clipDur = await probeDuration(c.video)
        const capStartAt = hasHook && c === cenas[0] ? HOOK_DUR : 0
        const cap = await prepCaptions(capList, tmp, c.numero, clipDur, clipDur, 1, capStartAt)
        await run('ffmpeg', [
          '-y', '-i', c.video, ...cap.inputs,
          '-filter_complex', [`[0:v]${vfBase}[vbase]`, ...cap.segs].join(';'),
          '-map', cap.out, '-map', '0:a?',
          '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-ar', '48000', seg,
        ])
      } else {
        // sem narração e sem legenda: usa o clipe como está (áudio do Grok)
        await run('ffmpeg', [
          '-y', '-i', c.video,
          '-vf', vfBase, '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p',
          '-c:a', 'aac', '-ar', '48000', seg,
        ])
      }
      segs.push(seg)
    }

    // duração de cada segmento de cena (para posicionar a troca de trilha por cena)
    const segDur = []
    for (const s of segs) segDur.push(await probeDuration(s))

    // Gancho de abertura — texto grande sobre a 1ª cena nos primeiros segundos (PNG do navegador).
    // Sobrepõe no segmento já pronto da cena 1, então independe de ela ter narração/legenda.
    if (hasHook && segs.length) {
      const hookPng = path.join(tmp, 'hook.png')
      await fs.writeFile(hookPng, Buffer.from(hookCardPng.split(',')[1], 'base64'))
      const seg0 = segs[0]
      const seg0Hook = path.join(tmp, 'seg1_hook.mp4')
      await run('ffmpeg', [
        '-y', '-i', seg0, '-i', hookPng,
        '-filter_complex', `[0:v][1:v]overlay=0:0:enable='between(t,0,${HOOK_DUR})'[v]`,
        '-map', '[v]', '-map', '0:a?',
        '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-ar', '48000', seg0Hook,
      ])
      segs[0] = seg0Hook
    }

    // Card final "continua..." — o navegador desenhou o PNG (ffmpeg aqui não tem drawtext)
    if (endCardPng && endCardPng.startsWith('data:image/png;base64,')) {
      const pngPath = path.join(tmp, 'endcard.png')
      await fs.writeFile(pngPath, Buffer.from(endCardPng.split(',')[1], 'base64'))
      const endSeg = path.join(tmp, 'seg_end.mp4')
      // card curto (~1,3s): sem segundos de tela preta morta no fim (mata o último segundo e o loop)
      await run('ffmpeg', [
        '-y', '-loop', '1', '-i', pngPath, '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo',
        '-t', '1.3', '-vf', 'scale=1080:1920,setsar=1,fps=30,fade=t=in:st=0:d=0.3',
        '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-ar', '48000', endSeg,
      ])
      segs.push(endSeg)
    }

    const listFile = path.join(tmp, 'list.txt')
    await fs.writeFile(listFile, segs.map((s) => `file '${s}'`).join('\n'))
    const outAbs = path.join(CONTEUDO_DIR, 'episodios', epId, 'rough-cut.mp4')
    await backupFile(outAbs, 3) // preserva o rascunho anterior (últimos 3)
    const concatOut = path.join(tmp, 'concat.mp4')
    await run('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', concatOut])

    // ——— Trilha musical (por cena, com crossfade na troca) ———
    // Cenas contíguas com a mesma faixa viram um bloco; a troca de faixa é um crossfade.
    // Aceita trilhaPorCena (array por cena) ou, retrocompat, musica (faixa única do episódio).
    const musDir = path.join(CONTEUDO_DIR, 'assets', 'musica')
    const vol = Math.min(0.6, Math.max(0.01, Number(musicaVol) || 0.08))
    const faixaOk = async (nome) => { if (!nome) return false; try { await fs.access(path.join(musDir, path.basename(String(nome)))); return true } catch { return false } }
    const porCena = Array.isArray(trilhaPorCena) && trilhaPorCena.length
      ? segDur.map((_, i) => trilhaPorCena[i] || '')
      : segDur.map((_, i) => (i === 0 && musica ? String(musica) : ''))
    for (let i = 0; i < porCena.length; i++) if (porCena[i] && !(await faixaOk(porCena[i]))) porCena[i] = ''

    if (porCena.some(Boolean)) {
      // agrupa cenas contíguas com a mesma faixa em blocos { faixa, dur }
      const blocos = []
      for (let i = 0; i < porCena.length; i++) {
        const d = segDur[i] || 0
        if (blocos.length && blocos[blocos.length - 1].faixa === porCena[i]) blocos[blocos.length - 1].dur += d
        else blocos.push({ faixa: porCena[i], dur: d })
      }
      const X = 0.9 // duração do crossfade entre blocos
      const musTotal = segDur.reduce((a, b) => a + (b || 0), 0) + 0.5
      const inicios = await readInicios()
      const inputs = []
      const filtros = []
      blocos.forEach((b, i) => {
        const Li = b.dur + (i === blocos.length - 1 ? 0.5 : X)
        // começa a faixa no ponto onde o tema entra (pula intro quieta); com loop, cobre cenas longas
        const start = b.faixa ? Math.max(0, Number(inicios[path.basename(b.faixa)]) || 0) : 0
        if (b.faixa) inputs.push('-stream_loop', '-1', '-i', path.join(musDir, path.basename(b.faixa)))
        else inputs.push('-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo')
        const volPart = b.faixa ? `,volume=${vol}` : ''
        filtros.push(`[${i + 1}:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,atrim=${start.toFixed(3)}:${(start + Li).toFixed(3)},asetpts=PTS-STARTPTS${volPart}[b${i}]`)
      })
      let prev = '[b0]'
      for (let i = 1; i < blocos.length; i++) {
        const out = i === blocos.length - 1 ? '[mixmus]' : `[x${i}]`
        filtros.push(`${prev}[b${i}]acrossfade=d=${X}:c1=tri:c2=tri${out}`)
        prev = out
      }
      const musLabel = blocos.length === 1 ? '[b0]' : '[mixmus]'
      filtros.push(`${musLabel}afade=t=in:st=0:d=0.6,afade=t=out:st=${Math.max(0, musTotal - 0.8).toFixed(2)}:d=0.8[musf]`)
      filtros.push(`[0:a][musf]amix=inputs=2:duration=first:normalize=0[a]`)
      await run('ffmpeg', [
        '-y', '-i', concatOut, ...inputs,
        '-filter_complex', filtros.join(';'),
        '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-ar', '48000', '-shortest', outAbs,
      ])
      comMusica = true
      musTrocas = blocos.filter((b) => b.faixa).length
    } else {
      await run('ffmpeg', ['-y', '-i', concatOut, '-c', 'copy', outAbs])
    }
    await fs.rm(tmp, { recursive: true, force: true })

    const semNarr = cenas.filter((c) => !c.audio).map((c) => c.numero)
    const avisos = []
    if (comMusica) avisos.push(musTrocas > 1 ? `Trilha por cena com crossfade (${musTrocas} trechos)` : 'Trilha musical mixada por baixo da narração')
    if (comLegenda) avisos.push('Legendas queimadas a partir da narração (sync aproximado)')
    if (ajustes.length) avisos.push(`Narração acelerada para caber no clipe → ${ajustes.join(', ')}`)
    if (semNarr.length) avisos.push(`Cenas sem narração (usaram o áudio do clipe): ${semNarr.join(', ')}`)
    res.json({
      ok: true,
      roughCut: `episodios/${epId}/rough-cut.mp4`,
      aviso: avisos.length ? avisos.join(' · ') : null,
    })
  } catch (err) {
    res.status(500).json({ error: 'Falha no ffmpeg: ' + err.message })
  }
})

// ---------------------------------------------------------------------------
// FASE 2 (planejado): harness de geração via API.
// A ideia é o painel disparar as gerações direto, sem copiar/colar:
//   POST /api/generate/imagem  { prompt, referencias[] } -> provider de imagem
//   POST /api/generate/video   { imagem, prompt }        -> provider de vídeo
//   POST /api/generate/audio   { texto, vozId }          -> provider de TTS
// Cada provider vive em ./providers/<nome>.mjs com uma interface comum
// (generate(input) -> { file, custo }), chaves em variáveis de ambiente,
// e o resultado é salvo direto em saga-fut/.
// ---------------------------------------------------------------------------

const server = app.listen(PORT, () => {
  console.log(`[saga-fut-studio] API em http://localhost:${PORT} — fonte: ${DATA_DIR}`)
})
// gerações de imagem podem levar vários minutos — desliga o corte padrão (300s) do Node
server.requestTimeout = 0
