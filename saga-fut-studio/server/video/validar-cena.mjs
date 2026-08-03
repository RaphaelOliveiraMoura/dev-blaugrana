// validar-cena.mjs — VALIDADOR PRÉ-RENDER. Roda o composer de verdade (montarCena) e devolve
// { ok, erros, avisos } SEM renderizar. Pega a maioria dos erros direto do dado, antes de gastar
// 1min de render: sprite/cenário faltando, sobreposição (personagem "entrando dentro" do outro),
// spot fora do canvas, deslize/estático (warnings do composer) e campos de publicação.
// Usado pela rota de render (trava se houver ERRO) e pelo CLI check-video.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { VIDEO_DIR, videoDir, CONTEUDO_DIR } from '../config.mjs';
import { montarCena, FORMATO_PADRAO } from './montar-cena.mjs';
import { spritesDoRoteiro } from './sprites-do-roteiro.mjs';
// SEM ESTE IMPORT o `invariantes(video)` lá embaixo lançava ReferenceError, o try/catch o convertia
// num aviso ("invariantes não rodaram") e o gate do render seguia aprovando: os INV-1 a INV-9
// estavam DESLIGADOS no caminho do render, e ligados só no check-video da linha de comando. É a
// assinatura da pior classe de defeito daqui, guarda que para de guardar em silêncio, e passou pelo
// vigia porque o teste conferia por GREP que a chamada existia, não que ela funcionava.
import { invariantes } from './invariantes.mjs';
import { candidatosDoSet } from '../../shared/set.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SFX_DIR = path.resolve(__dirname, '../../remotion/assets/sfx');
const existe = (abs) => fs.access(abs).then(() => true).catch(() => false);

// interp linear de trilha [[t,x],...] (mesma convenção do motor), com clamp nas pontas
function interp(track, f) {
  if (!track || !track.length) return 0;
  if (f <= track[0][0]) return track[0][1];
  const last = track[track.length - 1];
  if (f >= last[0]) return last[1];
  for (let i = 1; i < track.length; i++) {
    const [t0, x0] = track[i - 1], [t1, x1] = track[i];
    if (f <= t1) return x0 + (x1 - x0) * ((f - t0) / Math.max(1, t1 - t0));
  }
  return last[1];
}

// nome legível do personagem a partir do primeiro sprite (pra mensagem)
function rotulo(c) {
  const f = c.poses?.[0]?.cycle?.[0] || c.poses?.[0]?.src || c.src || '?';
  return String(f).replace(/\.png$/, '').replace(/-(w|r)\d+$/, '');
}

// fração da largura `w` que conta como CORPO pra colisão (o sprite tem margem; 0.8w é o tronco+pernas)
const BODY = 0.4; // meia-largura do corpo = 0.4*w pra cada lado

export async function validarCena(id) {
  const erros = [], avisos = [];
  let video;
  try { video = JSON.parse(await fs.readFile(path.join(VIDEO_DIR, id + '.json'), 'utf-8')); }
  catch (e) { return { ok: false, erros: [{ msg: `não li data/videos/${id}.json: ${e.message}` }], avisos: [] }; }

  // roda o composer capturando os console.warn dele (deslize/estático/balão órfão)
  const orig = console.warn, capturados = [];
  console.warn = (...a) => capturados.push(a.join(' '));
  let scene, audio;
  try { ({ scene, audio } = montarCena(video)); }
  catch (e) { console.warn = orig; return { ok: false, erros: [{ msg: `composer quebrou: ${e.message}` }], avisos: [] }; }
  console.warn = orig;
  for (const w of capturados) if (w.includes('[roteiro]')) avisos.push({ tipo: 'composer', msg: w.replace(/^\[roteiro\]\s*/, '') });

  const base = videoDir(id);
  const W = scene?.width || 1080;
  const kf = (f) => path.join(base, 'kf', f);
  const cenFromBg = (src) => src === 'cenario.mp4'
    ? path.join(base, 'cenario', 'anim.mp4')
    : path.join(base, 'cenario', src.replace(/^cenario-/, ''));

  // --- assets referenciados existem? ---
  const sprites = new Set(), cenarios = new Set();
  for (const shot of scene?.shots || []) {
    if (shot.bg?.src) cenarios.add(shot.bg.src);
    for (const c of shot.chars || []) {
      if (c.src) sprites.add(c.src);
      for (const p of c.poses || []) { if (p.src) sprites.add(p.src); for (const fr of p.cycle || []) sprites.add(fr); }
    }
  }
  // SPRITE VEM DO ACERVO DO PERSONAGEM: o kf/ do vídeo virou derivado (o render monta a pasta
  // plana na hora). Validar contra kf/ reprovava vídeo íntegro assim que a cópia deixou de existir.
  {
    const origemDe = new Map(spritesDoRoteiro(video).map((s) => [s.nome, s.origem]))
    for (const s of [...sprites].sort()) {
      const acervo = origemDe.get(s)
      if (acervo && await existe(path.join(CONTEUDO_DIR, acervo))) continue
      if (await existe(kf(s))) continue
      erros.push({ tipo: 'sprite', msg: acervo ? `sprite faltando: ${acervo}` : `sprite faltando: kf/${s}` })
    }
  };
  // MESMA RESOLUÇÃO DO STAGING: acervo primeiro (cenarios/<slug>/<vista>.png), pasta do vídeo como
  // legado. O gate e o render têm que procurar no mesmo lugar, senão um aprova o que o outro não acha.
  for (const c of [...cenarios].sort()) {
    if (c === 'cenario.mp4') continue;
    let achou = false;
    for (const cand of candidatosDoSet(CONTEUDO_DIR, id, c)) if (await existe(cand)) { achou = true; break; }
    if (!achou) erros.push({ tipo: 'cenario', msg: `cenário faltando: ${c} — procurei em ${candidatosDoSet(CONTEUDO_DIR, id, c).map((x) => path.relative(CONTEUDO_DIR, x)).join(' , ')}` });
  }

  // --- geometria por shot: sobreposição + spot fora do canvas ---
  (scene?.shots || []).forEach((shot, si) => {
    // REGRA (vídeo nunca é imagem parada): shot precisa de personagem ANIMADO — ou de um elemento
    // animado por código (relógio/board). Cena com fundo estático e nada se mexendo é reprovada.
    if (!(shot.chars || []).length && !shot.clock && !shot.board) erros.push({ tipo: 'estatico', msg: `cena ${si + 1} sem personagens nem elemento animado (imagem parada é proibida em vídeo)` });
    const chars = (shot.chars || []).map((c) => ({ c, nome: rotulo(c) }));
    // spot fora do canvas (posição de descanso, ignora entra/sai que saem de propósito)
    for (const { c, nome } of chars) {
      const half = BODY * c.w;
      if (c.cx - half < 0 || c.cx + half > W) avisos.push({ tipo: 'canvas', msg: `cena ${si + 1}: "${nome}" com spot ${c.cx} encosta/passa da borda (canvas 0..${W}, corpo ~${Math.round(half)}px)` });
    }
    // sobreposição: amostra o shot e acha a MAIOR invasão entre cada par (só quando ambos on-screen).
    // `contato:true` no shot, OU algum personagem com `junto` (encaixe relativo de propósito), desliga
    // a checagem de overlap desse shot — o encosto é intencional.
    const rshot = video.roteiro?.[si];
    // `contato` pode vir do ROTEIRO (template `roteiro`) ou do SHOT montado: composer com
    // coreografia fixa (a pilha de reforços do `alternado`) encosta os personagens DE PROPÓSITO e
    // sinaliza isso no shot, senão cada pilha vira uma dezena de erros que ninguém vai ler.
    const contatoOk = rshot?.contato === true || shot.contato === true || (rshot?.personagens || []).some((p) => p.junto);
    const D = contatoOk ? -1 : (shot.dur || 0);
    for (let i = 0; i < chars.length; i++) for (let j = i + 1; j < chars.length; j++) {
      const A = chars[i], B = chars[j];
      let pior = 0, quando = 0;
      for (let f = 0; f <= D; f += 6) {
        if (f < (A.c.appear || 0) || f < (B.c.appear || 0)) continue;
        const ax = A.c.cx + interp(A.c.moveX, f), bx = B.c.cx + interp(B.c.moveX, f);
        const aH = BODY * A.c.w, bH = BODY * B.c.w;
        const aL = ax - aH, aR = ax + aH, bL = bx - bH, bR = bx + bH;
        const onA = aR > 0 && aL < W, onB = bR > 0 && bL < W;
        if (!onA || !onB) continue; // alguém fora da tela naquele frame: não é sobreposição visível
        const inv = Math.min(aR, bR) - Math.max(aL, bL); // >0 = invadindo
        if (inv > pior) { pior = inv; quando = f; }
      }
      if (pior > 0) {
        const fps = scene.fps || 30;
        // PROFUNDIDADE: a checagem só olhava o eixo X, então acusava como colisão a OCLUSÃO normal
        // entre quem está no fundo e quem está na frente (é assim que a cena ganha profundidade).
        // Isso disparava em quase toda cena com gente em dois planos, e um validador que grita em
        // tudo passa a ser ignorado — aí ele deixa de pegar a colisão de verdade. A linha do chão
        // de cada um (cy + 0.625*w, a mesma conta do `place`) diz em que plano ele está: pisos bem
        // diferentes = planos diferentes = sobreposição legítima.
        const pisoA = A.c.cy + 0.625 * A.c.w, pisoB = B.c.cy + 0.625 * B.c.w;
        const menorAlt = 1.25 * Math.min(A.c.w, B.c.w);
        const planosDistintos = Math.abs(pisoA - pisoB) > 0.25 * menorAlt;
        if (planosDistintos) {
          // um plano tapando o outro por inteiro ainda merece nota (o de trás pode desaparecer)
          if (pior > 0.85 * Math.min(A.c.w, B.c.w)) {
            avisos.push({ tipo: 'overlap', msg: `cena ${si + 1}: "${A.nome}" cobre quase todo "${B.nome}" (planos diferentes, ${Math.round(pior)}px) — confira se o de trás ainda aparece` });
          }
          continue;
        }
        const forte = pior > 0.25 * Math.min(A.c.w, B.c.w);
        (forte ? erros : avisos).push({ tipo: 'overlap', msg: `cena ${si + 1}: "${A.nome}" e "${B.nome}" se sobrepõem ${Math.round(pior)}px em ~${(quando / fps).toFixed(1)}s${forte ? ' (forte — parecem um dentro do outro)' : ''} (mesmo plano)` });
      }
    }
  });

  // --- publicação / formato (regras fixas do projeto) ---
  // INVARIANTES DE ENCENAÇÃO (fala fora do quadro, gesto pro lado errado, personagem nunca enquadrado)
  try { const inv = invariantes(video); erros.push(...inv.erros); avisos.push(...inv.avisos) } catch (e) { avisos.push({ tipo: 'invariantes', msg: 'invariantes não rodaram: ' + e.message }) }

  if (!video.publicacao?.titulo?.trim()) erros.push({ tipo: 'pub', msg: 'publicacao.titulo vazio (obrigatório)' });
  if (!video.publicacao?.legenda?.trim()) erros.push({ tipo: 'pub', msg: 'publicacao.legenda vazia (obrigatória)' });
  if (video.formato && video.formato !== FORMATO_PADRAO) avisos.push({ tipo: 'formato', msg: `formato "${video.formato}" (o padrão da casa é ${FORMATO_PADRAO}, o MESMO dos quadrinhos)` });

  // --- áudio (só se não for mudo) ---
  if (video.semAudio !== true && audio) {
    if (audio.music && !(await existe(path.join(CONTEUDO_DIR, audio.music)))) erros.push({ tipo: 'audio', msg: `trilha faltando: ${audio.music}` });
    for (const s of audio.sfx || []) if (!(await existe(path.join(SFX_DIR, s.src)))) erros.push({ tipo: 'audio', msg: `sfx faltando: ${s.src}` });
  }

  return { ok: erros.length === 0, erros, avisos };
}
