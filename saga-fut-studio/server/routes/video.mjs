import { Router } from 'express'
import fs from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { renderVideo } from '../video/render-video.mjs'
import { validarCena } from '../video/validar-cena.mjs'
import { montarCena } from '../video/montar-cena.mjs'
import { videoDir, VIDEO_DIR, CONTEUDO_DIR } from '../config.mjs'
import { statusSet } from '../../scripts/sprites/contratos.mjs'
import { VISTAS, VISTAS_VALIDAS, arquivoVista, arquivoVariacao } from '../../shared/set.mjs'
import { OBJETOS, OBJETOS_VALIDOS } from '../../shared/objeto.mjs'
import { ESTILOS_TESTE, ESTILOS_TESTE_IDS, dirTestes } from '../../scripts/sprites/estilos.mjs'
import * as rel from '../../shared/caminhos.mjs'

export const videoRouter = Router()

const SCRIPTS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../scripts')
const sanId = (v) => (/^[a-zA-Z0-9_-]+$/.test(String(v || '')) ? String(v) : null)

// GET /api/video/assets?videoId= -> lista TUDO que compõe o vídeo: sprites (kf/*.png),
// animações transparentes/Grok (kf/*.webm) e cenários (cenario/*.png|mp4). A UI mostra tudo.
videoRouter.get('/video/assets', async (req, res) => {
  const id = sanId(req.query?.videoId)
  if (!id) return res.status(400).json({ error: 'videoId inválido' })
  try {
    const base = videoDir(id)
    const listar = async (sub, exts) => (await fs.readdir(path.join(base, sub)).catch(() => []))
      .filter((f) => !f.startsWith('_') && exts.some((e) => f.toLowerCase().endsWith(e)))
      .sort()
      .map((f) => ({ nome: f.replace(/\.[^.]+$/, ''), arquivo: `videos/${id}/${sub}/${f}`, ext: f.split('.').pop().toLowerCase() }))
    const kfAll = await listar('kf', ['.png', '.webm'])
    const kf = kfAll.filter((a) => a.ext === 'png')
    const animacoes = kfAll.filter((a) => a.ext === 'webm')
    const cenarios = await listar('cenario', ['.png', '.mp4'])
    res.json({ kf, animacoes, cenarios, cenario: { base: rel.videoCenarioBase(id), anim: rel.videoCenarioAnim(id) } })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// GET /api/video/validar?videoId= -> roda o validador pré-render (montarCena) SEM renderizar.
// Devolve { ok, erros, avisos }: sprite/cenário faltando, sobreposição, spot fora do canvas, etc.
videoRouter.get('/video/validar', async (req, res) => {
  const id = sanId(req.query?.videoId)
  if (!id) return res.status(400).json({ error: 'videoId inválido' })
  try { res.json(await validarCena(id)) }
  catch (e) { res.status(500).json({ error: e.message }) }
})

// interp linear de trilha [[t,x],...] (mesma convenção do motor), clamp nas pontas
const _interp = (tr, f) => {
  if (!tr || !tr.length) return 0
  if (f <= tr[0][0]) return tr[0][1]
  const last = tr[tr.length - 1]; if (f >= last[0]) return last[1]
  for (let i = 1; i < tr.length; i++) { const [t0, x0] = tr[i - 1], [t1, x1] = tr[i]; if (f <= t1) return x0 + (x1 - x0) * ((f - t0) / Math.max(1, t1 - t0)) }
  return last[1]
}

// GET /api/video/palco?videoId=&shot=&frame= -> LAYOUT de uma cena pro editor visual: canvas, cenário,
// personagens, balões e origem do zoom. Sem `frame` = POSIÇÃO DE DESCANSO (spot/piso). Com `frame` =
// posição naquele instante (aplica moveX/moveY e a pose ativa). A UI mostra em cima do cenário e deixa
// arrastar (personagem->spot/piso ou sobrepor; balão->x/y) e clicar pra origem do zoom.
videoRouter.get('/video/palco', async (req, res) => {
  const id = sanId(req.query?.videoId)
  const si = Number(req.query?.shot) || 0
  const frame = req.query?.frame != null && req.query.frame !== '' ? Number(req.query.frame) : null
  if (!id) return res.status(400).json({ error: 'videoId inválido' })
  try {
    const video = JSON.parse(await fs.readFile(path.join(VIDEO_DIR, id + '.json'), 'utf-8'))
    const { scene } = montarCena(video)
    const W = scene.width, H = scene.height
    const shot = (scene.shots || [])[si]
    if (!shot) return res.status(404).json({ error: 'cena não existe' })
    const fileUrl = (f) => '/files/videos/' + id + '/kf/' + f
    const cenName = (shot.bg?.src || 'cenario-base.png').replace(/^cenario-/, '')
    const pers = video.roteiro?.[si]?.personagens || []
    const chars = (shot.chars || []).map((c, i) => {
      // sprite: no frame = última pose com in<=frame; em descanso = a pose final
      let src
      if (frame != null) {
        const ativa = [...(c.poses || [])].filter((p) => (p.in ?? 0) <= frame).pop() || (c.poses || [])[0]
        src = ativa?.src || ativa?.cycle?.[0]
      } else {
        const rep = [...(c.poses || [])].reverse().find((p) => p.src) || (c.poses || []).find((p) => p.cycle)
        src = rep?.src || rep?.cycle?.[0]
      }
      src = src || c.src
      const dx = frame != null ? _interp(c.moveX, frame) : 0
      const dy = frame != null ? _interp(c.moveY || [[0, 0]], frame) : 0
      const vis = frame == null || frame >= (c.appear || 0)
      // cx/cy = posição exibida (no frame); cxRest/cyRest = descanso (pra converter arraste em spot/piso)
      return { idx: i, slug: pers[i]?.slug ?? null, cx: Math.round(c.cx + dx), cy: Math.round(c.cy + dy), cxRest: c.cx, cyRest: c.cy, w: c.w, flip: !!c.flip, visible: vis, src: src ? fileUrl(src) : null }
    })
    const balloons = (shot.balloons || []).map((b, i) => ({ idx: i, text: b.text, x: b.x, y: b.y, size: b.size, visible: frame == null || (frame >= (b.in ?? 0) && frame <= (b.out ?? 1e9)) }))
    const z = (shot.zooms || [])[0]
    res.json({ w: W, h: H, dur: shot.dur, cenario: '/files/videos/' + id + '/cenario/' + cenName, zoom: z ? { origin: z.origin || '50% 50%' } : null, chars, balloons })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// trava serial por vídeo: render é pesado (Remotion + ffmpeg), não deixa dois do mesmo.
const emAndamento = new Set()

// GET /api/acervo/cenarios -> as FICHAS DE LUGAR do acervo, com o status de cada vista.
// O studio precisava disso pra existir uma tela de cenário: até aqui cenário era um PNG escondido
// dentro da pasta de um vídeo, e a única forma de saber o que existia era listar diretório na mão.
videoRouter.get('/acervo/cenarios', async (req, res) => {
  try {
    const base = path.join(CONTEUDO_DIR, 'cenarios');
    const slugs = (await fs.readdir(base, { withFileTypes: true }).catch(() => []))
      .filter((e) => e.isDirectory()).map((e) => e.name).sort();
    const itens = [];
    for (const slug of slugs) {
      const st = await statusSet(slug);
      itens.push({
        slug, ...st,
        variacoesArt: (st.variacoes || []).map((nome) => ({ nome, arquivo: arquivoVariacao(slug, nome) })),
        vistas: VISTAS_VALIDAS.map((v) => ({
          nome: v, rotulo: VISTAS[v].rotulo, guia: VISTAS[v].guia, derivada: !!VISTAS[v].derivada,
          tem: st.tem.includes(v), arquivo: st.tem.includes(v) ? arquivoVista(slug, v) : null,
        })),
      });
    }
    res.json({ itens, vistas: VISTAS });
  } catch (e) { res.status(500).json({ error: e.message }) }
});

// GET /api/acervo/objetos -> os PROPS: os de código (a bola, desenhada pelo motor) e os de arte.
videoRouter.get('/acervo/objetos', async (req, res) => {
  try {
    const base = path.join(CONTEUDO_DIR, 'objetos');
    const noDisco = (await fs.readdir(base, { withFileTypes: true }).catch(() => []))
      .filter((e) => e.isDirectory()).map((e) => e.name);
    const nomes = [...new Set([...OBJETOS_VALIDOS, ...noDisco])].sort();
    const itens = [];
    for (const slug of nomes) {
      const cat = OBJETOS[slug] || null;
      const dir = path.join(base, slug);
      const arquivos = (await fs.readdir(dir).catch(() => [])).filter((f) => f.endsWith('.png'));
      itens.push({
        slug, tipo: cat?.tipo || 'arte', nome: cat?.nome || slug,
        catalogado: !!cat, comoUsar: cat?.comoUsar || null, porQue: cat?.porQueCodigo || null,
        desenhadaPor: cat?.desenhadaPor || null,
        arquivos: arquivos.map((f) => `objetos/${slug}/${f}`),
      });
    }
    res.json({ itens });
  } catch (e) { res.status(500).json({ error: e.message }) }
});

// GET /api/acervo/estilos -> os CANDIDATOS de linguagem visual e os estudos já feitos.
// Estudo de estilo não é asset: mora em `estilos/testes/` e nenhum vídeo enxerga. A tela existe
// porque a escolha do estilo se faz OLHANDO, lado a lado, e trocar o estilo depois custa o acervo
// inteiro (model sheet, folha de movimento, pose e cenário de todo mundo saem do estilo vigente).
videoRouter.get('/acervo/estilos', async (req, res) => {
  try {
    const dirAbs = path.join(CONTEUDO_DIR, dirTestes)
    const arqs = (await fs.readdir(dirAbs).catch(() => [])).filter((f) => f.endsWith('.png'))
    const estudos = arqs.filter((f) => !f.startsWith('_') && f.includes('__')).map((f) => ({
      slug: f.split('__')[0], estilo: f.split('__')[1].replace(/\.png$/, ''), arquivo: `${dirTestes}/${f}`,
    }))
    const folhas = arqs.filter((f) => f.startsWith('_folha')).map((f) => `${dirTestes}/${f}`).sort()
    // elenco apto a servir de cobaia: só quem tem base.png (o estudo parte da caricatura existente)
    const persBase = path.join(CONTEUDO_DIR, 'personagens')
    const slugs = []
    for (const e of (await fs.readdir(persBase, { withFileTypes: true }).catch(() => []))) {
      if (!e.isDirectory()) continue
      if (await fs.access(path.join(persBase, e.name, 'base.png')).then(() => true).catch(() => false)) slugs.push(e.name)
    }
    res.json({
      candidatos: Object.entries(ESTILOS_TESTE).map(([id, e]) => ({ id, rotulo: e.rotulo, nota: e.nota })),
      estudos, folhas, personagens: slugs.sort(),
      vigente: 'rabisco-riso',
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST /api/acervo/estilo/teste {slug, estilo?|todos?, cena?} -> gera estudo(s) pela PORTA ÚNICA.
videoRouter.post('/acervo/estilo/teste', async (req, res) => {
  const slug = sanId(req.body?.slug)
  const estilo = String(req.body?.estilo || '')
  const todos = !!req.body?.todos
  const cena = String(req.body?.cena || '').trim()
  if (!slug) return res.status(400).json({ error: 'slug inválido' })
  if (!todos && !ESTILOS_TESTE_IDS.includes(estilo)) return res.status(400).json({ error: `estilo inválido (use ${ESTILOS_TESTE_IDS.join(', ')})` })
  try {
    const argv = [path.resolve(SCRIPTS_DIR, 'asset.mjs'), 'estilo', slug, todos ? '--todos' : `--como=${estilo}`]
    if (cena) argv.push(`--cena=${cena}`)
    const log = await new Promise((resolve, reject) => {
      const p = spawn('node', argv, { cwd: path.resolve(SCRIPTS_DIR, '..') })
      let out = ''
      p.stdout.on('data', (d) => { out += d }); p.stderr.on('data', (d) => { out += d })
      p.on('error', reject)
      p.on('close', (c) => (c === 0 ? resolve(out) : reject(new Error(out.split('\n').slice(-6).join('\n')))))
    })
    res.json({ ok: true, log })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST /api/acervo/cenario/vista {slug, vista, desc} -> gera UMA vista da ficha, pela PORTA ÚNICA.
// Roda o asset.mjs em processo separado de propósito (geração leva minutos e seguraria a UI), e é o
// asset que decide se a vista é derivada e precisa do panorama como referência.
videoRouter.post('/acervo/cenario/vista', async (req, res) => {
  const slug = sanId(req.body?.slug)
  const vista = String(req.body?.vista || '')
  const variacao = String(req.body?.variacao || '')
  const desc = String(req.body?.desc || '').trim()
  if (!slug) return res.status(400).json({ error: 'slug inválido' })
  if (!variacao && !VISTAS_VALIDAS.includes(vista)) return res.status(400).json({ error: `vista inválida (use ${VISTAS_VALIDAS.join(', ')})` })
  if (variacao && !/^[a-z0-9-]+$/.test(variacao)) return res.status(400).json({ error: 'nome de variação inválido (minúsculas, números e hífen)' })
  if (!desc) return res.status(400).json({ error: 'descrição obrigatória' })
  try {
    const log = await new Promise((resolve, reject) => {
      const p = spawn('node', [path.resolve(SCRIPTS_DIR, 'asset.mjs'), 'cenario', slug, variacao ? `--variacao=${variacao}` : `--vista=${vista}`, `--desc=${desc}`],
        { cwd: path.resolve(SCRIPTS_DIR, '..') })
      let out = ''
      p.stdout.on('data', (d) => { out += d }); p.stderr.on('data', (d) => { out += d })
      p.on('error', reject)
      p.on('close', (c) => (c === 0 ? resolve(out) : reject(new Error(out.split('\n').slice(-6).join('\n')))))
    })
    res.json({ ok: true, ...(await statusSet(slug)), log })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST /api/video/animatic {videoId, n?, cena?, tudo?} -> STORYBOARD ANTES DO ASSET: roda o motor
// de verdade com boneco no lugar do sprite que ainda não existe e grade com régua de x no lugar do
// cenário, e devolve a folha de contato + a lista de compras.
//
// Roda em PROCESSO SEPARADO de propósito: o animatic faz o bundle do Remotion (esbuild) e um
// renderStill por quadro, que dentro do servidor seguraria o event loop e travaria a UI inteira
// enquanto isso. O resultado volta pelo `_animatic.json` que o script grava, não por stdout.
videoRouter.post('/video/animatic', async (req, res) => {
  const id = sanId(req.body?.videoId)
  if (!id) return res.status(400).json({ error: 'videoId inválido' })
  const n = Math.max(2, Math.min(24, Number(req.body?.n) || 12))
  const script = path.resolve(SCRIPTS_DIR, 'video/animatic.mjs')
  const args = [script, id, `--n=${n}`]
  if (req.body?.cena) args.push(`--cena=${Number(req.body.cena)}`)
  if (req.body?.tudo) args.push('--tudo')
  try {
    const log = await new Promise((resolve, reject) => {
      const p = spawn('node', args, { cwd: path.resolve(SCRIPTS_DIR, '..') })
      let out = ''
      p.stdout.on('data', (d) => { out += d })
      p.stderr.on('data', (d) => { out += d })
      p.on('error', reject)
      p.on('close', (c) => (c === 0 ? resolve(out) : reject(new Error(out.split('\n').slice(-8).join('\n')))))
    })
    const resumo = JSON.parse(await fs.readFile(path.join(videoDir(id), '_animatic.json'), 'utf8'))
    res.json({ ...resumo, log })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST /api/video/render {videoId} -> monta a cena a partir do dado, renderiza (Remotion),
// mixa o áudio e grava videos/<id>/final.mp4. Bloqueia até terminar (pode levar minutos).
videoRouter.post('/video/render', async (req, res) => {
  const { videoId } = req.body || {}
  if (!videoId) return res.status(400).json({ error: 'videoId obrigatório' })
  if (emAndamento.has(videoId)) return res.status(429).json({ error: 'Este vídeo já está renderizando.' })
  // GATE: valida antes de gastar render. Se houver ERRO (sprite faltando, sobreposição forte, etc),
  // barra e devolve a lista. `?forcar=1` pula o gate (pra casos que eu sei que são falso-positivo).
  if (req.query?.forcar !== '1') {
    const chk = await validarCena(videoId).catch(() => null)
    if (chk && !chk.ok) return res.status(422).json({ error: 'validação falhou', erros: chk.erros, avisos: chk.avisos })
  }
  emAndamento.add(videoId)
  try {
    const r = await renderVideo(videoId)
    res.json(r)
  } catch (e) {
    res.status(500).json({ error: e.message })
  } finally {
    emAndamento.delete(videoId)
  }
})
