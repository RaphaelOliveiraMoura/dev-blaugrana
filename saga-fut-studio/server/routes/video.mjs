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
import { VISTAS, VISTAS_VALIDAS, arquivoVista, arquivoVariacao, candidatosDoSet, doNomeMotor } from '../../shared/set.mjs'
import { spritesDoRoteiro } from '../video/sprites-do-roteiro.mjs'
import { readDados } from '../store.mjs'
import { OBJETOS, OBJETOS_VALIDOS } from '../../shared/objeto.mjs'
import { bolaPreview } from '../../shared/bola-svg.mjs'
import { gerarFala } from '../../scripts/audio/falar.mjs'

// Objeto de CÓDIGO não tem PNG no disco: quem sabe desenhá-lo é o motor. Este mapa é a ponte pro
// studio conseguir mostrar um, e ele aponta pro MESMO módulo que o vídeo usa. Objeto de código novo
// entra aqui junto com a entrada em OBJETOS, senão a ficha dele nasce vazia na tela.
const PREVIEW_DE_CODIGO = { bola: () => bolaPreview({ r: 110 }) }
import { ESTILOS_TESTE, ESTILOS_TESTE_IDS, dirTestes } from '../../scripts/sprites/estilos.mjs'
import * as rel from '../../shared/caminhos.mjs'

export const videoRouter = Router()

const SCRIPTS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../scripts')
const RAIZ_STUDIO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const sanId = (v) => (/^[a-zA-Z0-9_-]+$/.test(String(v || '')) ? String(v) : null)

// CARDS ANIMADOS: video montado por codigo, um gerador por template. Template novo entra aqui
// junto com o arquivo, senao o botao de render cai no motor de cena e reprova por ausencia.
const GERADOR_DE_CARD = { corrida: 'gerar-corrida.mjs' }

// devolve o nome do gerador se o video for um card, ou null se for animacao normal
async function cardDoVideo(videoId) {
  const id = sanId(videoId)
  if (!id) return null
  const arq = path.join(CONTEUDO_DIR, 'data', 'videos', `${id}.json`)
  const dado = await fs.readFile(arq, 'utf8').then(JSON.parse).catch(() => null)
  if (dado?.tipo !== 'card') return null
  const gerador = GERADOR_DE_CARD[dado.template]
  if (!gerador) throw new Error(`o card "${id}" declara template "${dado.template}", que não tem gerador`)
  return gerador
}

function renderCard(videoId, gerador) {
  return new Promise((resolve, reject) => {
    const p = spawn('node', [path.join(RAIZ_STUDIO, gerador), videoId], { cwd: RAIZ_STUDIO })
    let log = ''
    p.stdout.on('data', (d) => { log += d })
    p.stderr.on('data', (d) => { log += d })
    p.on('error', reject)
    p.on('close', (c) => (c === 0
      ? resolve({ ok: true, video: rel.videoFinal(videoId), log })
      : reject(new Error(log.split('\n').slice(-8).join('\n')))))
  })
}

// GET /api/video/assets?videoId= -> TUDO que compõe o vídeo, DERIVADO DO ROTEIRO.
//
// POR QUE MUDOU (14/08/2026): esta rota listava os arquivos de `videos/<id>/kf/` e
// `videos/<id>/cenario/`, e desde a migração pro acervo essas duas pastas estão VAZIAS na maioria
// dos vídeos: sprite vem de `personagens/<slug>/`, cenário vem da ficha em `cenarios/<slug>/`, e o
// `kf/` só existe durante o render. A aba de Assets mostrava um vídeo inteiro como se não tivesse
// asset nenhum, que é pior do que não ter a aba.
//
// Agora a fonte é a CENA MONTADA: o que o motor referencia é o que aparece aqui, sem exceção, e
// cada peça vem com a origem no acervo e um `existe` medido no disco. Peça que falta aparece na
// lista em vez de sumir dela, que é o ponto de uma tela de composição.
videoRouter.get('/video/assets', async (req, res) => {
  const id = sanId(req.query?.videoId)
  if (!id) return res.status(400).json({ error: 'videoId inválido' })
  try {
    const video = JSON.parse(await fs.readFile(path.join(VIDEO_DIR, id + '.json'), 'utf-8'))
    const existe = (abs) => fs.access(abs).then(() => true).catch(() => false)
    const roteiro = video.roteiro || []

    // ---- PERSONAGENS, na ordem em que ENTRAM (é assim que se lê um elenco)
    const slugs = []
    for (const sh of roteiro) for (const p of (sh.personagens || [])) {
      if (p.slug && !slugs.includes(p.slug)) slugs.push(p.slug)
    }
    const dados = await readDados().catch(() => ({ personagens: [] }))
    const fichaDe = Object.fromEntries((dados.personagens || []).map((p) => [p.id, p]))

    // ---- SPRITES: o que a cena referencia, com a origem no acervo
    const sprites = []
    for (const s of spritesDoRoteiro(video)) {
      sprites.push({ ...s, existe: s.origem ? await existe(path.join(CONTEUDO_DIR, s.origem)) : false })
    }
    // agrupa por DONO usando o slug mais longo que casa: "julian-atletico-muro" só se separa
    // sabendo quem está em cena, e por isso o dono sai da lista de slugs, não de um split por hífen
    const porSlug = [...slugs].sort((a, b) => b.length - a.length)
    const donoDe = (nome) => porSlug.find((sl) => nome.startsWith(sl)) || null

    const personagens = slugs.map((slug) => {
      const f = fichaDe[slug] || null
      const meus = sprites.filter((s) => donoDe(s.nome.replace(/\.png$/, '')) === slug)
      const cenas = roteiro.reduce((n, sh) => n + ((sh.personagens || []).some((p) => p.slug === slug) ? 1 : 0), 0)
      return {
        slug,
        nome: f?.nome || slug,
        imagem: f?.imagem || null,
        noAcervo: !!f,
        cenas,
        sprites: meus.sort((a, b) => a.nome.localeCompare(b.nome)),
        faltando: meus.filter((s) => !s.existe).length,
      }
    })
    // sprite sem dono (keyframe composto, clipe .webm) não pode sumir da tela
    const soltos = sprites.filter((s) => !donoDe(s.nome.replace(/\.png$/, '')))

    // ---- CENÁRIOS: as vistas que a cena referencia, resolvidas como o staging resolve
    const { scene } = montarCena(video)
    const usados = new Set()
    for (const shot of scene.shots || []) {
      if (shot.bg?.src?.startsWith?.('cenario-')) usados.add(shot.bg.src)
      for (const cam of shot.bg?.camadas || []) if (cam.src?.startsWith?.('cenario-')) usados.add(cam.src)
    }
    const cenarios = []
    for (const nome of [...usados].sort()) {
      const cands = candidatosDoSet(CONTEUDO_DIR, id, nome)
      let arquivo = null
      for (const c of cands) if (await existe(c)) { arquivo = path.relative(CONTEUDO_DIR, c); break }
      const { slug, vista } = doNomeMotor(nome)
      cenarios.push({ nome, slug, vista, arquivo, existe: !!arquivo, ext: (arquivo || nome).split('.').pop().toLowerCase() })
    }

    // ---- O QUE É DESENHADO POR CÓDIGO: não tem arquivo, mas É elemento visual da composição, e
    // some de qualquer tela que liste só arquivo. Aqui aparece com o beat em que entra.
    const porCodigo = []
    roteiro.forEach((sh, i) => {
      const cena = i + 1
      if (sh.fundo?.tipo) porCodigo.push({ tipo: 'fundo gráfico', detalhe: sh.fundo.tipo, cena })
      if (sh.piscada) porCodigo.push({ tipo: 'piscada', detalhe: (sh.piscada.cor || 'preto'), cena })
      if (sh.ambiente?.torcida) porCodigo.push({ tipo: 'torcida', detalhe: `${sh.ambiente.torcida.n || '?'} pessoas`, cena })
      if (sh.ambiente?.bandeiras) porCodigo.push({ tipo: 'bandeiras', detalhe: `${sh.ambiente.bandeiras.n || '?'}`, cena })
      if (sh.confetti) porCodigo.push({ tipo: 'confete', detalhe: '', cena })
      if (sh.bola) porCodigo.push({ tipo: 'bola', detalhe: `${(sh.bola.lances || []).length} lance(s)`, cena })
      for (const p of (sh.personagens || [])) {
        const ef = p.efeito && (typeof p.efeito === 'string' ? p.efeito : p.efeito.tipo)
        if (ef) porCodigo.push({ tipo: 'efeito', detalhe: `${ef} (${p.slug})`, cena })
        const em = p.emote && (typeof p.emote === 'string' ? p.emote : p.emote.tipo)
        if (em) porCodigo.push({ tipo: 'pictograma', detalhe: `${em} (${p.slug})`, cena })
      }
    })

    // ---- SOM: não é visual, mas é o resto da composição e vive no mesmo roteiro
    const { audio } = montarCena(video)
    const som = {
      mudo: video.semAudio === true,
      ambiente: video.ambiente || null,
      efeitos: (audio.sfx || []).length,
      falas: (audio.falas || []).length,
    }

    const faltando = [
      ...sprites.filter((s) => !s.existe).map((s) => ({ o_que: 'sprite', nome: s.nome, onde: s.origem })),
      ...cenarios.filter((c) => !c.existe).map((c) => ({ o_que: 'cenário', nome: c.nome, onde: `cenarios/${c.slug}/` })),
      ...personagens.filter((p) => !p.noAcervo).map((p) => ({ o_que: 'personagem', nome: p.slug, onde: 'não existe no acervo' })),
    ]
    res.json({ personagens, cenarios, soltos, porCodigo, som, faltando, total: sprites.length })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// GET /api/video/audio?videoId= -> A LINHA DO TEMPO DO SOM, frame a frame.
//
// POR QUE EXISTE (14/08/2026): o áudio era a única camada do vídeo sem representação nenhuma na
// tela. Cenário, sprite e encenação se conferem olhando (aba Assets, Animatic, folha de revisão);
// som só se conferia ASSISTINDO o MP4 pronto, com fone, prestando atenção — e um erro de som não
// tem sintoma visual. O passo do `ferran-amor` continuou 3,6s depois de o personagem parar e
// atravessou o render inteiro, a validação inteira e a revisão inteira sem que nada apontasse.
//
// O dado já existia dentro do composer; o que faltava era alguém poder VER. Esta rota devolve
// exatamente o que vai pro mux (mesma `montarCena`, mesmos segundos), então a tela não é uma
// aproximação do áudio: é o áudio.
//
// A duração das falas sai do `say` de verdade (cacheado por conteúdo), e não de uma estimativa por
// número de letras: é a diferença entre saber se a fala CABE no shot e achar que cabe.
videoRouter.get('/video/audio', async (req, res) => {
  const id = sanId(req.query?.videoId)
  if (!id) return res.status(400).json({ error: 'videoId inválido' })
  try {
    const video = JSON.parse(await fs.readFile(path.join(VIDEO_DIR, id + '.json'), 'utf-8'))
    const { scene, audio, totalFrames } = montarCena(video)
    const fps = scene.fps || 30

    // limites de cada shot em segundos (mesma acumulação do motor: transição sobrepõe)
    const shots = []; let acc = 0
    ;(scene.shots || []).forEach((s, i) => {
      const ov = (i > 0 && s.transition && s.transition !== 'none') ? (s.tdur || 0) : 0
      const ini = Math.max(0, acc - ov)
      shots.push({ i, ini: +(ini / fps).toFixed(3), fim: +((ini + s.dur) / fps).toFixed(3),
        set: video.roteiro?.[i]?.set || video.set || video.mundo?.set || null,
        beat: (video.roteiro?.[i]?._beat || '').slice(0, 70) })
      acc = ini + s.dur
    })

    // A VOZ COM A DURAÇÃO REAL. Falha de síntese não derruba a tela: a fala aparece sem duração,
    // que já diz o que precisa ser dito (o render vai passar mudo naquele trecho).
    const falas = []
    for (const f of audio.falas || []) {
      let seg = null
      try { seg = (await gerarFala(f.texto, { quem: f.quem })).seg } catch { seg = null }
      falas.push({ ...f, seg, fim: seg ? +(f.at + seg).toFixed(3) : null })
    }

    const sfx = (audio.sfx || []).map((s) => ({
      id: s.id || path.basename(s.src), si: s.si ?? null, at: s.at, vol: s.vol,
      dur: s.dur ?? s.seg, seg: s.seg, continuo: !!s.continuo, derivado: !!s.derivado,
      cortado: s.dur != null && s.seg != null && s.dur < s.seg - 0.05,
      fim: +(s.at + (s.dur ?? s.seg ?? 0)).toFixed(3),
    })).sort((a, b) => a.at - b.at)

    // O MP4 É MAIS VELHO QUE O ROTEIRO?
    //
    // A tela põe o player em cima da linha do tempo, e é justamente essa junção que cria o risco:
    // as duas metades vêm de fontes diferentes. A linha do tempo é recalculada a cada abertura; o
    // MP4 é de quando alguém apertou renderizar. Editar o roteiro e voltar aqui daria um som velho
    // embaixo de uma linha do tempo nova, com todo o ar de estarem de acordo — e a tela existe
    // justamente pra ser confiada. Confiança sem base é pior que tela nenhuma.
    const mtime = (p) => fs.stat(p).then((s) => s.mtimeMs).catch(() => null)
    const tJson = await mtime(path.join(VIDEO_DIR, id + '.json'))
    const tMp4 = await mtime(path.join(videoDir(id), 'final.mp4'))

    const amb = video.ambiente || null
    res.json({
      id, fps, durSec: +(totalFrames / fps).toFixed(3), totalFrames, shots, sfx, falas,
      ambiente: amb ? { id: amb, vol: audio.musicVol } : null,
      semAudio: video.semAudio === true,
      renderizado: tMp4 != null,
      // 2s de folga: o próprio render toca o JSON (grava `youtube`, marca gerado) logo depois de
      // fechar o MP4, e sem a folga todo vídeo recém-renderizado nasceria "desatualizado"
      desatualizado: tMp4 != null && tJson != null && tJson > tMp4 + 2000,
    })
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
    // O SPRITE VEM DO ACERVO, NÃO DE `kf/`.
    //
    // Esta rota montava `/files/videos/<id>/kf/<nome>.png` na unha, e desde a migração pro acervo
    // essa pasta só existe DURANTE o render: o Palco abria com um retângulo preto no lugar de cada
    // personagem (404 em toda imagem) e parecia quebrado. Mesmo defeito que a aba de Assets tinha,
    // sobrevivendo aqui porque cada tela resolvia caminho por conta própria.
    //
    // Agora a origem sai do `spritesDoRoteiro`, que é a MESMA fonte que o staging do render usa,
    // com `kf/` como fallback pros vídeos anteriores à migração. Nome de sprite que o motor pede é
    // nome que o Palco acha, por construção.
    const origemDe = new Map(spritesDoRoteiro(video).map((s) => [s.nome, s.origem]))
    const fileUrl = (f) => (origemDe.has(f) ? '/files/' + origemDe.get(f) : '/files/videos/' + id + '/kf/' + f)
    // CENÁRIO PELA MESMA RESOLUÇÃO DO STAGING (ficha do lugar primeiro, pasta do vídeo como legado).
    // Vale a mesma história: `videos/<id>/cenario/` está vazia na maioria dos vídeos, e o Palco
    // pintava o fundo de preto sem dizer por quê.
    let cenarioUrl = null
    {
      const nome = shot.bg?.src || 'cenario-base.png'
      for (const cand of candidatosDoSet(CONTEUDO_DIR, id, nome)) {
        if (await fs.access(cand).then(() => true).catch(() => false)) {
          cenarioUrl = '/files/' + path.relative(CONTEUDO_DIR, cand); break
        }
      }
    }
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
    // `cenarioEhVideo`: com fundo animado a camada do chão é um .mp4, e um <img> apontando pra ele
    // renderiza NADA (foi outra fatia do "tudo preto"). A tela precisa saber que ali vai um <video>.
    res.json({ w: W, h: H, dur: shot.dur, cenario: cenarioUrl,
      cenarioEhVideo: !!cenarioUrl && /\.mp4$/i.test(cenarioUrl),
      zoom: z ? { origin: z.origin || '50% 50%' } : null, chars, balloons })
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
        // OBJETO DE CÓDIGO NÃO TEM ARQUIVO, e é por isso que a bola aparecia na tela como uma ficha
        // vazia: `arquivos` é [] e não havia mais nada pra mostrar. O preview vem do MESMO módulo que
        // o motor usa pra desenhar (shared/bola-svg.mjs), então o que se vê aqui é o que o vídeo
        // desenha — um preview redesenhado à parte mentiria com confiança.
        svg: cat?.tipo === 'codigo' ? (PREVIEW_DE_CODIGO[slug]?.() || null) : null,
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
  // PREVIEW ANIMADO: a folha de contato aprova composição, mas ritmo e sincronismo (o pé
  // encontrando a bola, o goleiro reagindo a tempo) só se julgam vendo rodar.
  if (req.body?.video) args.push('--video')
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

  // CARD ANIMADO desvia do motor de cena. Ele e da familia do card de gol e do de escalacao:
  // montado inteiro por codigo, sem roteiro em shots, sem sprites.json e sem cena pra validar.
  // Mandar ele pro caminho normal so faria o validar-cena reprovar por AUSENCIA, que e o
  // buraco que o `asset doutor` existe pra evitar em outro lugar.
  const card = await cardDoVideo(videoId)
  if (card) {
    emAndamento.add(videoId)
    try {
      res.json(await renderCard(videoId, card))
    } catch (e) {
      res.status(500).json({ error: e.message })
    } finally {
      emAndamento.delete(videoId)
    }
    return
  }
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
