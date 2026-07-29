// Monta a cena do Remotion (scene.json) e as pistas de áudio a partir do JSON de um
// vídeo (data/videos/<id>.json). É a versão data-driven do antigo build-cena.mjs:
// o roteiro, o elenco e o cenário vêm do dado, não são mais hardcoded.
//
// Estrutura de esteira: Laporta é âncora no centro, os jogadores entram/saem andando,
// o Flick julga. Pivô no meio (Laporta sai e volta com o 1º atacante). Fecho no close.

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { CONTEUDO_DIR } from '../config.mjs'

const DIMS = { '4:5': [1080, 1350], '3:4': [1080, 1440], '9:16': [1080, 1920], '1:1': [1080, 1080] };

// Âncoras por cenário: pontos medidos UMA vez (videos/<id>/cenario/_anchors.json), ex.:
// { "muro": { "chao": 1080, "topo": 900 }, "cela": { "chao": 1300 } }. No roteiro, `spot`/`piso`
// aceitam o NOME da âncora (string) em vez de pixel mágico — a posição referencia o cenário.
function loadAnchors(id) {
  try { return JSON.parse(readFileSync(path.join(CONTEUDO_DIR, `videos/${id}/cenario/_anchors.json`), 'utf8')); }
  catch { return {}; }
}
// resolve spot/piso: número passa direto; string busca a âncora do cenário do shot; senão default.
function resolveAnchor(v, cen, anchors, def) {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const a = anchors[cen]?.[v];
    if (typeof a === 'number') return a;
    console.warn(`[roteiro] âncora "${v}" não encontrada em ${cen} (_anchors.json) — usando ${def}`);
  }
  return def;
}

// posições/tempos (poderiam virar campo do vídeo depois; default cobre o "defesa-barca")
const PLAYER_CX = 235, LAP_CX = 545, FLICK_CX = 875, CY = 665, PW = 520, LW = 470, FW = 470;
const HIDE = -620, LAP_HIDE = -840;
const INTRO_LEAD = 70, PIVOT = 54;
const NO_DUR = 104, YES_DUR = 76;
const BEATS = {
  no:  { walkIn: 24, present: 28, think: 40, verdict: 68, react: 76, walkOut: 88, nameIn: 28, nameOut: 64 },
  yes: { walkIn: 20, present: 22, think: null, verdict: 34, react: 42, walkOut: 52, nameIn: 16, nameOut: 34 },
};

// dispatcher por template: cada formato de vídeo tem seu composer
export function montarCena(video) {
  if (video.template === 'roteiro') return montarRoteiro(video);
  if (video.template === 'gags-sequencia') return montarGags(video);
  if (video.template === 'dupla-briga') return montarDupla(video);
  if (video.template === 'alternado') return montarAlternado(video);
  return montarEsteira(video);
}

// Composer "alternado": cenas em TELA CHEIA que CORTAM entre dois lados (foco alternado).
// REAL: Florentino VAI BUSCAR cada reforço (sai de cena, volta trazendo o jogador) e PARA
// JUNTO da pilha (não vai até a ponta da tela). BARÇA: Laporta SAI CORRENDO procurando e não
// acha; esbarra no Julián PRESO e fica APAIXONADO. FECHO: volta pro Florentino admirando todos
// os reforços com uma RISADA MAQUIAVÉLICA. Texto mínimo. Sprites no canvas 480x620 (pés em 610).
function montarAlternado(video) {
  const fps = video.fps || 30;
  const [W, H] = DIMS[video.formato] || DIMS['9:16'];
  const place = (cx, floorY, w) => ({ cx, cy: Math.round(floorY - 0.625 * w), w });
  const real = video.real || {}, barca = video.barca || {};
  const bgReal = { type: 'image', src: 'cenario-real-hall.png' };
  const bgBarca = { type: 'image', src: 'cenario-barca-room.png' };
  const walk = (s) => [`${s}-w1.png`, `${s}-w2.png`, `${s}-w3.png`, `${s}-w4.png`];
  const refs = real.reforcos || [];
  const floorR = 1300, floorB = 1315, pwR = 285, FBASE = 520, OFFX = -340;
  const GL = 18, RL = 22, PAUSE = 5, GAP = 140;
  const spots = [176, 306, 436, 560, 684, 800];
  const floW = ['florentino-riso-w1.png', 'florentino-riso-w2.png', 'florentino-riso-w3.png', 'florentino-riso-w4.png'];
  const floWL = ['florentino-riso-wL1.png', 'florentino-riso-wL2.png', 'florentino-riso-wL3.png', 'florentino-riso-wL4.png'];
  const flo = 'florentino-riso.png';
  const exitOff = OFFX - FBASE, restOff = (i) => (spots[i] + GAP) - FBASE;

  // shot do REAL: Florentino busca `fetches` (índices) a partir da posição atual; `standing`
  // já estão parados. Ele sai pra esquerda (fora), volta com o reforço e para junto da pilha.
  const buildReal = (fetches, standing, camera) => {
    const chars = [];
    standing.forEach((i) => refs[i] && chars.push({ ...place(spots[i], floorR, pwR), motion: 'idle', src: `${refs[i].slug}-stand.png` }));
    let cur = standing.length ? restOff(standing[standing.length - 1]) : exitOff;
    const mv = [[0, cur]], fposes = [{ src: flo, in: 0 }];
    let t = 6;
    fetches.forEach((i) => {
      if (cur !== exitOff) { mv.push([t, cur], [t + GL, exitOff]); fposes.push({ cycle: floWL, hz: 8, in: t }); t += GL; }
      const tIn = t;
      mv.push([tIn, exitOff], [tIn + RL, restOff(i)]); fposes.push({ cycle: floW, hz: 8, in: tIn }, { src: flo, in: tIn + RL });
      cur = restOff(i); t = tIn + RL + PAUSE;
      const sp = spots[i], pOff = OFFX - sp;
      chars.push({ ...place(sp, floorR, pwR), appear: tIn, motion: 'static',
        moveX: [[0, pOff], [tIn, pOff], [tIn + RL, 0]],
        poses: [{ cycle: walk(refs[i].slug), hz: 8, in: 0 }, { src: `${refs[i].slug}-stand.png`, in: tIn + RL }] });
    });
    for (let k = 1; k < mv.length; k++) if (mv[k][0] <= mv[k - 1][0]) mv[k][0] = mv[k - 1][0] + 1;
    chars.unshift({ ...place(FBASE, floorR, 340), motion: 'static', moveX: mv, poses: fposes });
    return { dur: t + 18, bg: bgReal, dust: false, chars, ...(camera ? { camera } : {}) };
  };

  const shot1 = buildReal([0, 1, 2], []);
  const shot3 = buildReal([3, 4, 5], [0, 1, 2], 'punch');

  // SHOT 2: BARÇA, Laporta entra correndo, procura e não acha, sai correndo
  const shot2 = { dur: 100, transition: 'none', bg: bgBarca, dust: false, chars: [
    { ...place(540, floorB, 360), motion: 'static',
      moveX: [[0, -580], [36, -40], [60, -40], [100, 580]],
      poses: [
        { cycle: ['laporta-run-a.png', 'laporta-run-b.png'], hz: 8, in: 0 },
        { src: 'laporta-procura.png', in: 42 },
        { cycle: ['laporta-run-a.png', 'laporta-run-b.png'], hz: 8, in: 68 } ] } ] };

  // SHOT 4: BARÇA, Laporta entra correndo, VÊ o Julián preso e fica apaixonado (olhando p/ direita); Cholo guarda
  const shot4 = { dur: 124, transition: 'none', bg: bgBarca, dust: false, cages: [{ x: 656, w: 228, top: 906, bottom: 1335, n: 4 }], chars: [
    { ...place(360, floorB, 360), motion: 'static',
      moveX: [[0, -560], [40, 0], [124, 0]],
      poses: [
        { cycle: ['laporta-run-a.png', 'laporta-run-b.png'], hz: 8, in: 0 },
        { src: 'laporta-procura.png', in: 42 },
        { src: 'laporta-apaixonado.png', in: 66 } ] },
    { ...place(770, floorB, 300), motion: 'static', poses: [{ cycle: ['julian-grip.png', 'julian-reach.png'], hz: 3, in: 0 }] },
    { ...place(958, floorB, 320), motion: 'static', poses: [{ cycle: ['cholo-guard-a.png', 'cholo-guard-b.png'], hz: 2, in: 0 }] } ] };

  // SHOT 5: REAL, Florentino admira os 6 reforços e dá a risada maquiavélica -> íris -> @marca
  const s5 = [{ ...place(930, floorR, 360), motion: 'static',
    poses: [{ src: flo, in: 0 }, { cycle: ['florentino-laugh.png', 'florentino-laugh-b.png'], hz: 4, in: 26 }] }];
  [0, 1, 2, 3, 4, 5].forEach((i) => refs[i] && s5.push({ ...place(spots[i], floorR, pwR), motion: 'idle', src: `${refs[i].slug}-stand.png` }));
  const irisAt = 84, endAt = irisAt + 34;
  const shot5 = { dur: endAt + 54, transition: 'none', bg: bgReal, dust: false, chars: s5,
    zooms: [{ at: 28, to: 1.5, origin: '87% 52%', ramp: 16, hold: 44, out: 0 }], // zoom no Florentino rindo
    iris: { start: irisAt, dur: 30, origin: '87% 52%' }, endCard: { text: video.marca || '@devblaugrana', at: endAt, size: 76 } };

  const shots = [shot1, shot2, shot3, shot4, shot5];
  const totalFrames = shots.reduce((a, s) => a + s.dur, 0);
  const scene = { fps, width: W, height: H, font: video.fonte || 'Luckiest Guy', moldura: video.moldura, shots };
  const audio = { durSec: +(totalFrames / fps).toFixed(3), music: null, musicVol: 0, sfx: [] };
  return { scene, audio, totalFrames };
}

// Composer "dupla-briga": esquete de DOIS personagens interagindo, em DUAS cenas com
// transição. Os keyframes são COMPOSTOS (os dois no mesmo render, framing travado) e
// entram como UM sprite full-frame (o mais estável pra interação apertada). Arco:
// CENA 1 (festa/gramado) comemoram campeões com confete + torcida; TRANSIÇÃO de lugar;
// CENA 2 (vestiário) vestem camisas de clubes rivais -> se olham -> brigam (nuvem cartoon).
// Easter egg: um bicho (o gato do Cucurella) observando ao lado do banco (animado via webm).
function montarDupla(video) {
  const fps = video.fps || 30;
  const [W, H] = DIMS[video.formato] || DIMS['9:16'];
  const f = video.falas || {};

  // ---------- CENA 1: comemoração (gramado, confete, torcida pulando) ----------
  // torcida ao fundo = jogadores genéricos comemorando, cada um PULANDO em loop (bob),
  // com fases diferentes pra não pular em uníssono. Ficam ATRÁS da dupla (entram antes).
  const CROWD = [
    { s: 'jog3', cx: 320, cy: 628, w: 232, amp: 26, hz: 1.5, ph: 0.0 },
    { s: 'jog1', cx: 760, cy: 606, w: 210, amp: 22, hz: 1.2, ph: 1.1 },
    { s: 'jog2', cx: 150, cy: 712, w: 240, amp: 30, hz: 1.35, ph: 2.0 },
    { s: 'jog2', cx: 560, cy: 660, w: 206, amp: 20, hz: 1.6, ph: 0.6 },
    { s: 'jog1', cx: 930, cy: 690, w: 236, amp: 28, hz: 1.25, ph: 2.6 },
    { s: 'jog3', cx: 990, cy: 792, w: 196, amp: 24, hz: 1.45, ph: 1.6 },
  ];
  const festaChars = CROWD.map((c) => ({ cx: c.cx, cy: c.cy, w: c.w, motion: 'static', src: `${c.s}.png`, bob: { amp: c.amp, hz: c.hz, phase: c.ph } }));
  // a dupla (menor, na frente): abraço ANIMADO (ciclo com balanço) -> pulo -> taça -> saem andando
  const walkOut = 152;
  festaChars.push({ cx: W / 2, cy: H / 2, w: W, motion: 'static',
    moveX: [[0, 0], [walkOut, 0], [192, 900]],   // ficam no centro e depois saem pela direita
    poses: [
      { cycle: ['abraco.png', 'abraco2.png', 'abraco3.png'], hz: 2.6, in: 0 },
      { src: 'pulo.png', in: 60 },
      { src: 'trofeu.png', in: 108 },
      { cycle: ['walkA.png', 'walkB.png'], hz: 6, in: walkOut },
    ] });
  const festaBalloons = [];
  if (video.gancho) festaBalloons.push({ text: video.gancho, x: W / 2, y: 1230, size: 62, rot: -2, in: 12, out: 150 });
  const festaDur = 192;
  const festaBg = video.cenario?.festa ? { type: 'image', src: 'cenario-festa.png' } : { type: 'image', src: 'cenario-base.png' };
  const shot1 = { dur: festaDur, bg: festaBg, dust: false, confetti: true, chars: festaChars, balloons: festaBalloons };

  // ---------- CENA 2: vestiário (troca + briga) ----------
  const B = { camisas: 0, vestindo: 36, notam: 72, bravos: 118, briga: 158 };
  const brigaEnd = 230, catAt = 236, irisAt = 274, endAt = 308, dur2 = 360;
  const chars = [], balloons = [], zooms = [];

  // easter egg (gato) ao lado do banco, ao fundo; animado (webm) se easterEgg.anim
  const eg = video.easterEgg || {};
  const egx = eg.cx ?? 930, egy = eg.cy ?? 620;
  if (eg.slug) {
    chars.push({ cx: egx, cy: egy, w: eg.w ?? 150, motion: eg.anim ? 'static' : 'idle',
      src: eg.anim ? `${eg.slug}.webm` : `${eg.slug}.png` });
  }
  // a dupla, sprite full-frame de keyframes (agora com camisa de clube)
  chars.push({ cx: W / 2, cy: H / 2, w: W, motion: 'static', poses: [
    { src: 'camisas.png', in: B.camisas },
    { src: 'vestindo.png', in: B.vestindo },
    { src: 'notam.png', in: B.notam },
    { src: 'bravos.png', in: B.bravos },
    { cycle: ['briga-a.png', 'briga-b.png'], hz: 8, in: B.briga },
  ] });

  // balões (sem nomes, sem travessão)
  balloons.push({ text: f.notam || 'peraí...', x: W / 2, y: 300, size: 60, in: B.notam + 6, out: B.bravos - 6 });
  // balão do "bravos" é opcional (sem default): só aparece se o vídeo definir falas.bravos
  if (f.bravos) balloons.push({ text: f.bravos, x: W / 2, y: 300, size: 72, color: '#c62020', in: B.bravos + 6, out: B.briga - 4 });
  balloons.push({ text: 'POW!', x: W * 0.30, y: 560, size: 96, color: '#f2c531', rot: -8, in: B.briga + 10, out: B.briga + 34 });
  balloons.push({ text: 'BAM!', x: W * 0.70, y: 500, size: 92, color: '#f2c531', rot: 7, in: B.briga + 40, out: B.briga + 64 });
  balloons.push({ text: 'POW!', x: W * 0.52, y: 600, size: 100, color: '#f2c531', rot: -5, in: B.briga + 66, out: B.briga + 90 });
  balloons.push({ text: f.gato || '😼', x: egx - 120, y: egy - 130, size: 76, in: catAt + 8, out: irisAt - 6 });

  // câmera: double-take ao notar, tremida na briga (shakeWin) e zoom revelando o gato
  zooms.push({ at: B.notam + 2, to: 1.12, origin: '50% 40%', ramp: 5, hold: 20, out: 12 });
  zooms.push({ at: catAt, to: 1.7, origin: `${Math.round((egx / W) * 100)}% ${Math.round((egy / H) * 100)}%`, ramp: 10, hold: 22, out: 12 });

  const iris = { start: irisAt, dur: 30, origin: '50% 48%' };
  const endCard = { text: video.marca || '@devblaugrana', at: endAt, size: 76 };
  const shot2 = { dur: dur2, transition: video.transicao || 'slideL', tdur: 14,
    bg: { type: 'image', src: 'cenario-base.png' }, dust: false, chars, balloons, zooms,
    shakeWin: [B.briga, brigaEnd, 9], iris, endCard };

  const totalFrames = festaDur + dur2 - shot2.tdur;
  const scene = { fps, width: W, height: H, font: video.fonte || 'Luckiest Guy', shots: [shot1, shot2] };
  // semAudio: montagem muda (o Raphael põe som depois). Sem trilha/sfx.
  const audio = { durSec: +(totalFrames / fps).toFixed(3), music: null, musicVol: 0, sfx: [] };
  return { scene, audio, totalFrames };
}

// ============================================================================
// Composer "roteiro" — GENÉRICO, dirigido por DADOS. Um conceito novo vira `video.roteiro`
// (uma lista de SHOTS/beats), sem código específico do arco. Cada shot tem cenário, personagens
// (cada um com entrada opcional, sequência de poses cronometradas por `hold`, saída opcional),
// balões, zoom, jaula. Convenção de sprite: pose -> `<slug>-<pose>.png`; andar -> `<slug>-w1..4`,
// correr -> `<slug>-r1..4` (esquerda usa `-wL1..4`). check-video deriva a lista de compras DAQUI,
// então ela é sempre honesta. Coreografia muito específica pode continuar num composer dedicado.
// ----------------------------------------------------------------------------
// Schema do JSON (todos os campos opcionais salvo `slug`):
//   video.roteiro = [ SHOT, ... ]
//   SHOT = { cenario?, blur?, dur?, transicao?, tdur?, cages?, zoom?, zooms?, baloes?[],
//            personagens: [ PERS, ... ] }
//   PERS = { slug, spot?(cx px OU nome de âncora), piso?(chão y OU nome de âncora; MENOR = mais alto),
//            w?, atraso?(frames até aparecer), bob?({amp,hz,phase} respiro/balanço em loop),
//            olhar?('esquerda'|'direita' — SÓ pra personagem PARADO; quem se move olha pro movimento
//              automático), numerado?(true = jogador com número, nunca espelha; sprites já orientados),
//            de?('esquerda'|'direita'), entra?('andar'|'correr'), entraDur?, poses?: [BEAT,...],
//            sai?('andar'|'correr'), saiPara?, saiDur?,
//            poseChute?('<nome>')+chutaEm?([frames]) = TOQUE NA BOLA: nesses frames faz a pose de
//              chute (perna estende) e volta pro repouso (1ª pose) ~9f depois — pé mexe junto ao passe }
//   BEAT = { pose?('<nome>' -> <slug>-<nome>.png) | andar?:true | correr?:true, hold?, move?(dX px),
//            moveY?(dY px no intervalo; NEGATIVO = sobe — escalar muro/pendurar/cair) }
//   BALAO = { texto, de?('<slug>' ancora o balão em cima do falante — PREFIRA isto), dy?(sobe/desce),
//             x?(0..1 fração, override), y?(override), size?, cor?, rot?, in?, out? }
// ============================================================================
// PROP BOLA (reutilizável): traduz uma lista declarativa de LANCES em trilhas x/y contínuas que o
// componente <Ball> do motor interpola. Cada lance começa onde o anterior parou (posição e frame),
// então o toca-toca/chute/gol vira uma sequência legível no roteiro, sem contar frame na mão.
//   sh.bola = { r?, groundY?(y do chão), inicio?(x px), em?(frame de entrada), some?(frame vanish),
//               spin?, lances: [LANCE,...] }
//   LANCE (um por vez):
//     { parada: <frames> }                         // fica onde está (mantém altura/escala atuais)
//     { passe: <xDestino>, dur?, escala? }         // rasteiro reto (rola no chão)
//     { arco:  <xDestino>, pico?, dur?, escala? }  // parábola: sobe `pico` e VOLTA ao chão (rebote)
//     { quique:<xDestino>, pico?, saltos?, dur? }  // série de quiques decrescentes
//     { chute: <xDestino>, alturaFim?, pico?, dur?, escala? } // CHUTE A GOL: arqueia e TERMINA
//        elevado (alturaFim = altura final acima do chão, ex.: boca do gol), encolhendo pela
//        perspectiva (escala ~0.4) — não volta ao chão, fica "na rede".
// `escala` (qualquer lance) = tamanho-alvo no fim do lance (bola indo ao fundo encolhe).
// Retorna { ball, end }; `end` alimenta o shotEnd pra o shot durar o suficiente pra bola.
function montarBola(sh, W, PISO) {
  const b = sh.bola;
  if (!b) return null;
  const r = b.r ?? 34;

  // MODO PLANO (rondo/visto de cima): a bola anda no PLANO 2D da tela (x, cy absolutos), sem física
  // de altura. Lances `{para:[x,y], dur, escala}` (passe rasteiro de vértice a vértice) e `{parada:f}`.
  // `sh.bola.inicio` é [x,y]. Reutilizável pra qualquer jogada com passes em várias direções.
  if (b.modo === 'plano') {
    const x = [], cy = [], sT = [];
    let t = b.em || 0, px = b.inicio?.[0] ?? Math.round(W / 2), pcy = b.inicio?.[1] ?? 700, ps = b.escalaIni ?? 1;
    let usaEscala = ps !== 1;
    x.push([t, px]); cy.push([t, pcy]); sT.push([t, ps]);
    for (const ln of (b.lances || [])) {
      if (ln.parada != null) { const d = ln.parada; x.push([t + d, px]); cy.push([t + d, pcy]); sT.push([t + d, ps]); t += d; }
      else if (ln.para) {
        const d = ln.dur || 18, [dx, dy] = ln.para, es = ln.escala ?? ps;
        x.push([t + d, dx]); cy.push([t + d, dy]); sT.push([t + d, es]); px = dx; pcy = dy; ps = es; if (ln.escala != null) usaEscala = true; t += d;
      }
    }
    const ball = { x, cy, r, spin: b.spin ?? 1 };
    if (usaEscala) ball.s = sT;
    if (b.em) ball.appear = b.em;
    if (b.some != null) ball.vanish = b.some;
    return { ball, end: t };
  }

  const groundY = b.groundY ?? Math.round(PISO - r);   // bola encosta o chão logo abaixo dos pés
  const M = 8;                                          // amostras por arco (curva suave)
  const x = [], y = [], sT = [];
  let t = b.em || 0;
  let px = b.inicio ?? Math.round(W / 2), py = 0, ps = b.escalaIni ?? 1;
  let usaEscala = ps !== 1;
  x.push([t, px]); y.push([t, py]); sT.push([t, ps]);
  for (const ln of (b.lances || [])) {
    if (ln.parada != null) {
      const dur = ln.parada; x.push([t + dur, px]); y.push([t + dur, py]); sT.push([t + dur, ps]); t += dur;
    } else if (ln.passe != null) {
      const dur = ln.dur || 18, es = ln.escala ?? ps; x.push([t + dur, ln.passe]); py = 0; y.push([t + dur, 0]); sT.push([t + dur, es]); px = ln.passe; ps = es; if (ln.escala != null) usaEscala = true; t += dur;
    } else if (ln.arco != null) {
      const dur = ln.dur || 26, pico = ln.pico ?? 180, dest = ln.arco, es = ln.escala ?? ps;
      for (let k = 1; k <= M; k++) { const f = k / M; x.push([t + dur * f, Math.round(px + (dest - px) * f)]); y.push([t + dur * f, Math.round(pico * 4 * f * (1 - f))]); sT.push([t + dur * f, ps + (es - ps) * f]); }
      px = dest; py = 0; ps = es; if (ln.escala != null) usaEscala = true; t += dur;
    } else if (ln.quique != null) {
      const dur = ln.dur || 34, pico = ln.pico ?? 150, saltos = ln.saltos || 3, dest = ln.quique;
      const seg = dur / saltos;
      for (let j = 0; j < saltos; j++) {
        const p = pico * Math.pow(0.5, j);
        for (let k = 1; k <= M; k++) { const f = k / M; const gt = t + seg * (j + f), frac = (j + f) / saltos; x.push([Math.round(gt), Math.round(px + (dest - px) * frac)]); y.push([Math.round(gt), Math.round(p * 4 * f * (1 - f))]); sT.push([Math.round(gt), ps]); }
      }
      px = dest; py = 0; t += dur;
    } else if (ln.chute != null) {
      const dur = ln.dur || 40, dest = ln.chute, alt = ln.alturaFim ?? 400, pico = ln.pico ?? 160, es = ln.escala ?? 0.45;
      for (let k = 1; k <= M; k++) { const f = k / M; x.push([t + dur * f, Math.round(px + (dest - px) * f)]); y.push([t + dur * f, Math.round(alt * f + pico * 4 * f * (1 - f))]); sT.push([t + dur * f, ps + (es - ps) * f]); }
      px = dest; py = alt; ps = es; usaEscala = true; t += dur;
    }
  }
  const ball = { x, y, r, groundY, spin: b.spin ?? 1 };
  if (usaEscala) ball.s = sT;
  if (b.em) ball.appear = b.em;
  if (b.some != null) ball.vanish = b.some;
  return { ball, end: t };
}

function montarRoteiro(video) {
  const fps = video.fps || 30;
  const [W, H] = DIMS[video.formato] || DIMS['9:16'];
  const place = (cx, floorY, w) => ({ cx, cy: Math.round(floorY - 0.625 * w), w });
  const PISO = Math.round(H * 0.9);
  const cyc = (slug, kind) => [1, 2, 3, 4].map((n) => `${slug}-${kind}${n}.png`); // 'w' | 'r' | 'wL'
  const roteiro = video.roteiro || [];
  const anchors = loadAnchors(video.id);
  const shots = [];

  roteiro.forEach((sh) => {
    const cen = sh.cenario || 'base';
    const bg = { type: sh.blur ? 'blur' : 'image', src: `cenario-${cen}.png` };
    const chars = [], charPos = {};
    let shotEnd = 0;

    (sh.personagens || []).forEach((pc) => {
      const slug = pc.slug;
      let cx = resolveAnchor(pc.spot ?? Math.round(W / 2), cen, anchors, Math.round(W / 2));
      const piso = resolveAnchor(pc.piso ?? PISO, cen, anchors, PISO);
      const w = pc.w ?? 320;
      // POSICIONAMENTO RELATIVO (contato garantido): `junto:"<slug>"` encaixa este personagem na BORDA
      // de outro (já resolvido antes no shot), `lado:'direita'|'esquerda'`, `sobrepor:<px>` (positivo =
      // invade pra encostar/agarrar; 0 = encosta a borda; negativo = deixa folga). Evita chutar `spot`
      // e garante que pose de segurar/abraçar caia no alvo mesmo se o outro mudar de lugar. BODY=0.4*w
      // = meia-largura do "corpo" (mesma do validador). Só a POSIÇÃO DE DESCANSO; entra/anda ainda vale.
      if (pc.junto && charPos[pc.junto]) {
        const nb = charPos[pc.junto], BODY = 0.4;
        const sep = nb.w * BODY + w * BODY - (pc.sobrepor || 0);
        cx = Math.round(pc.lado === 'esquerda' || pc.lado === 'esq' ? nb.cx - sep : nb.cx + sep);
      } else if (pc.junto) console.warn(`[roteiro] "${slug}": junto:"${pc.junto}" — alvo não resolvido antes neste shot (ordene o alvo primeiro); usando spot.`);
      const fromRight = pc.de === 'direita';
      const offIn = fromRight ? (W - cx + w) : -(cx + w);
      // ORIENTAÇÃO AUTOMÁTICA (regra fixa): quem se MOVE olha pra DIREÇÃO DO MOVIMENTO; quem fica
      // PARADO usa `olhar` (mira o alvo). Base dos sprites olha pra DIREITA → espelha (flip) pra
      // esquerda. Personagem `numerado:true` (jogador com número) NUNCA espelha (inverteria o
      // número) — as sprites dele já vêm geradas na direção certa (ex.: andar dir=left).
      // não espelhar: jogador com número (`numerado`) OU sprite já gerado na direção (`preOrientado`,
      // ex.: andar dir=left do Laporta disfarçado — cabeça+pernas já concordam, flipar quebraria).
      const numerado = pc.numerado === true || pc.preOrientado === true;
      let netMove = 0;
      if (pc.entra) netMove += fromRight ? -1 : 1;              // entra da direita = anda pra esquerda
      if (pc.sai) netMove += (pc.saiPara === 'direita') ? 1 : -1;
      for (const b of (pc.poses || [])) if (b.move) netMove += Math.sign(b.move);
      const moves = !!(pc.entra || pc.sai || (pc.poses || []).some((b) => b.move));
      let flip = false;
      if (!numerado) flip = (moves && netMove !== 0) ? (netMove < 0) : (pc.olhar === 'esquerda' || pc.olhar === 'esq');
      // ENCARA: vira a pose PRA um alvo (ex.: quem é pego encara o captor). Alvo à esquerda -> olha pra
      // esquerda (base direita = flip). Vence o auto-facing. Só serve pra pose de perfil/3-4 (frontal
      // não muda). Não flipa numerado (inverteria o número). Alvo tem que vir ANTES no shot.
      if (pc.encara && !numerado && charPos[pc.encara]) flip = charPos[pc.encara].cx < cx;
      else if (pc.encara && !charPos[pc.encara]) console.warn(`[roteiro] "${slug}": encara:"${pc.encara}" — alvo não resolvido antes neste shot (ordene o alvo primeiro).`);
      if (typeof pc.flip === 'boolean') flip = pc.flip; // override manual (toggle do Palco) vence tudo
      // só aparece depois de `atraso` frames (escalona entradas). GUARDA ANTI-BLEED: quem ENTRA num
      // shot com transição espera o slide terminar por padrão (senão a posição de entrada dele vaza pra
      // tela durante a transição). Pode sobrepor com `atraso` maior.
      const guardaTransicao = (pc.entra && sh.transicao && sh.transicao !== 'none') ? (sh.tdur || 14) : 0;
      const t0 = Math.max(pc.atraso || 0, guardaTransicao);
      const poses = [];
      const moveX = [];
      const moveY = [[0, 0]]; // eixo vertical (negativo = SOBE): escalar muro, pendurar, cair
      let t = t0;

      // entrada andando/correndo (de fora da tela até o spot), respeitando o atraso
      if (pc.entra) {
        const kind = pc.entra === 'correr' ? 'r' : 'w'; // base direita; a direção vem do flip
        // `chegaEm:<frame>` = composer calcula a velocidade pra CHEGAR nesse frame (sincroniza com o
        // agarrão/fala sem eu contar na mão); senão usa `entraDur` (default 24).
        const wIn = pc.chegaEm != null ? Math.max(6, pc.chegaEm - t0) : (pc.entraDur || 24);
        moveX.push([0, offIn], [t0, offIn], [t0 + wIn, 0]);
        poses.push({ cycle: cyc(slug, kind), hz: 8, in: t0 });
        t = t0 + wIn;
      } else {
        moveX.push([0, 0]); // parado no spot; a visibilidade vem do `appear`
      }

      // poses cronometradas (cada uma segura `hold` frames; `move` desloca dX no intervalo)
      (pc.poses || []).forEach((b) => {
        const hold = b.hold || 20;
        if (b.andar || b.correr) poses.push({ cycle: cyc(slug, b.correr ? 'r' : 'w'), hz: 8, in: t });
        else if (b.pose) poses.push({ src: `${slug}-${b.pose}.png`, in: t });
        if (b.move) { const last = moveX[moveX.length - 1][1]; moveX.push([t, last], [t + hold, last + b.move]); }
        if (b.moveY) { const last = moveY[moveY.length - 1][1]; moveY.push([t, last], [t + hold, last + b.moveY]); }
        t += hold;
      });

      // TOQUE NA BOLA (pé mexe): nos frames `chutaEm`, dispara a pose `poseChute` (perna estende) e
      // volta pro repouso (1ª pose) ~9 frames depois. Sincroniza o passe/chute com a bola sem contar
      // frame à mão em cada pose. Ordem não importa (o motor mostra a pose de maior `in` <= frame).
      if (pc.chutaEm && pc.poseChute) {
        const rep = (pc.poses && pc.poses[0] && pc.poses[0].pose) || null;
        for (const cf of pc.chutaEm) {
          poses.push({ src: `${slug}-${pc.poseChute}.png`, in: cf });
          if (rep) poses.push({ src: `${slug}-${rep}.png`, in: cf + 9 });
          if (cf + 9 > shotEnd) shotEnd = cf + 9;
        }
      }

      // saída andando/correndo (do spot pra fora da tela)
      if (pc.sai) {
        const saiRight = pc.saiPara === 'direita';
        const offOut = saiRight ? (W - cx + w) : -(cx + w);
        const kind = pc.sai === 'correr' ? 'r' : 'w'; // base direita; direção vem do flip
        const wOut = pc.saiDur || 24;
        poses.push({ cycle: cyc(slug, kind), hz: 8, in: t });
        const last = moveX[moveX.length - 1][1];
        moveX.push([t, last], [t + wOut, offOut]);
        t += wOut;
      }

      // trilhas precisam ser CRESCENTES em frame
      for (let k = 1; k < moveX.length; k++) if (moveX[k][0] <= moveX[k - 1][0]) moveX[k][0] = moveX[k - 1][0] + 1;
      for (let k = 1; k < moveY.length; k++) if (moveY[k][0] <= moveY[k - 1][0]) moveY[k][0] = moveY[k - 1][0] + 1;
      // GUARDA anti-gap (aparece no check-video): personagem que desloca precisa de CICLO de pernas
      // (não pose parada deslizando), e personagem parado precisa de ALGUMA animação (ciclo/bob).
      const _hasCycle = poses.some((p) => p.cycle);
      const _slides = (pc.poses || []).some((b) => b.move && b.pose && !b.andar && !b.correr && Math.abs(b.move) > 80);
      const _frozen = (pc.poses || []).length <= 1 && !_hasCycle && !pc.bob && !pc.entra && !pc.sai && moveY.length <= 1 && !(pc.poses || []).some((b) => b.move) && !(pc.chutaEm && pc.chutaEm.length);
      if (_slides) console.warn(`[roteiro] "${slug}": DESLIZA (pose parada com move) — deslocamento deve usar andar/correr (folha de ciclo), não pose estática arrastada.`);
      if (_frozen && (pc.poses || []).length) console.warn(`[roteiro] "${slug}": ESTÁTICO (sem ciclo de caminhada, bob nem movimento) — dê um bob ou ação animada.`);

      const ch = { ...place(cx, piso, w), motion: 'static', moveX, poses };
      if (moveY.length > 1) ch.moveY = moveY;
      if (flip) ch.flip = true;      // orientação por dado (base direita → olha pra esquerda)
      if (pc.bob) ch.bob = pc.bob;   // respiro/balanço em loop (ex.: dormindo, torcida pulando)
      if (t0 > 0) ch.appear = t0;
      if (pc.some != null) ch.vanish = pc.some;   // some da tela a partir deste frame (ex.: chutado que vira sprite voando)
      chars.push(ch);
      charPos[slug] = { cx, cy: ch.cy, w }; // pra balão `de` ancorar em cima da cabeça do falante
      if (t > shotEnd) shotEnd = t;
    });

    // REGRA: fala fica PERTO de quem fala. `de:'<slug>'` ancora o balão em cima da cabeça do
    // personagem (x/y automáticos); `dy` sobe/desce; x/y explícitos ainda mandam se você quiser.
    const balloons = (sh.baloes || []).map((b) => {
      const p = b.de ? charPos[b.de] : null;
      if (b.de && !p) console.warn(`[roteiro] balão de:"${b.de}" — personagem não está nesse shot; balão fica no default.`);
      const x = b.x != null ? Math.round(b.x * W) : (p ? p.cx : Math.round(W / 2));
      const y = b.y != null ? b.y : (p ? Math.max(90, Math.round(p.cy - p.w * 0.72) - (b.dy || 0)) : 300);
      return { text: b.texto, x, y, size: b.size || 56, color: b.cor, rot: b.rot || 0, in: b.in ?? 6, out: b.out ?? Math.max(10, shotEnd - 4) };
    });
    // PROP BOLA: gera as trilhas a partir dos lances declarativos e estende o shot pra ela caber
    const bolaRes = montarBola(sh, W, PISO);
    if (bolaRes && bolaRes.end > shotEnd) shotEnd = bolaRes.end;
    const zooms = (sh.zoom ? [sh.zoom] : []).concat(sh.zooms || []);
    const dur = sh.dur || (shotEnd + 24);
    const shot = { dur, bg, dust: false, chars, balloons, zooms };
    if (bolaRes) shot.balls = [bolaRes.ball];
    if (sh.confetti) shot.confetti = true;
    if (sh.relogio) shot.clock = sh.relogio;   // relógio girando (tempo passando)
    if (sh.transicao) { shot.transition = sh.transicao; shot.tdur = sh.tdur || 14; }
    if (sh.cages) shot.cages = sh.cages;
    shots.push(shot);
  });

  // fecho padrão: íris fechando + @marca no preto, no último shot
  if (video.fecho !== false && shots.length) {
    const last = shots[shots.length - 1];
    const at = last.dur;
    last.dur += 60;
    last.iris = { start: at + 6, dur: 30, origin: '50% 48%' };
    last.endCard = { text: video.marca || '@devblaugrana', at: at + 40, size: 76 };
  }

  const overlap = shots.reduce((a, s, i) => a + (i > 0 && s.transition && s.transition !== 'none' ? (s.tdur || 0) : 0), 0);
  const totalFrames = shots.reduce((a, s) => a + s.dur, 0) - overlap;
  const scene = { fps, width: W, height: H, font: video.fonte || 'Luckiest Guy', moldura: video.moldura, shots };
  const audio = { durSec: +(totalFrames / fps).toFixed(3), music: null, musicVol: 0, sfx: [] };
  return { scene, audio, totalFrames };
}

// ============================================================================
// COMPOSERS RESTAURADOS (montarEsteira, montarGags) — foram apagados por engano
// num splice; texto restaurado do estado original. NÃO remover.
// ============================================================================

// Estrutura de esteira (defesa-barca): Laporta âncora no centro, jogadores entram/saem
// andando, o Flick julga. Pivô no meio (Laporta sai e volta com o 1º atacante). Fecho no close.
function montarEsteira(video) {
  const fps = video.fps || 30;
  const [W, H] = DIMS[video.formato] || DIMS['9:16'];
  const rounds = video.roteiro || [];
  const lapSlug = video.elenco?.laporta?.slug || 'lap';
  const flickSlug = video.elenco?.flick?.slug || 'flick';
  const verd = video.vereditos || { no: 'NÃO', yes: 'SIM!' };
  const pivotAfter = video.pivotDepois ?? 2;
  const lapWalkR = [`${lapSlug}-wR-a.png`, `${lapSlug}-wR-b.png`];
  const lapWalkL = [`${lapSlug}-wL-a.png`, `${lapSlug}-wL-b.png`];
  const dr = (r) => (r.veredito === 'no' ? NO_DUR : YES_DUR);

  // starts cumulativos (lead do gancho + gap do pivô)
  const starts = []; let t = INTRO_LEAD;
  rounds.forEach((r, i) => { starts.push(t); t += dr(r); if (i === pivotAfter) t += PIVOT; });
  const pivotEnter = starts[pivotAfter + 1] ?? (t);
  const exitStart = pivotEnter - PIVOT;
  const lastDur = rounds.length ? dr(rounds[rounds.length - 1]) : 0;
  const roundsDur = (starts[rounds.length - 1] ?? INTRO_LEAD) + lastDur + 12;

  const chars = [], balloons = [], zooms = [], sfx = [];

  // jogadores (cada um só aparece na sua janela)
  rounds.forEach((r, i) => {
    const T = starts[i], b = BEATS[r.veredito], dur = dr(r), s = r.slug;
    const moveX = [];
    if (T - 40 > 0) moveX.push([Math.max(0, T - 40), HIDE]);
    moveX.push([T, HIDE], [T + b.walkIn, 0], [T + b.walkOut - 2, 0], [T + dur, HIDE]);
    chars.push({ cx: PLAYER_CX, cy: CY, w: PW, moveX, poses: [
      { cycle: [`${s}-wR-a.png`, `${s}-wR-b.png`], hz: 7, in: T },
      { src: `${s}-conf.png`, in: T + b.present },
      { src: `${s}-${r.veredito === 'yes' ? 'happy' : 'sad'}.png`, in: T + b.react },
      { cycle: [`${s}-wL-a.png`, `${s}-wL-b.png`], hz: 7, in: T + b.walkOut },
    ] });
  });

  // Laporta âncora (entra no gancho, sai/volta no pivô)
  const lapPoses = [{ cycle: lapWalkR, hz: 7, in: 0 }, { src: `${lapSlug}-kf-present.png`, in: 28 }];
  rounds.forEach((r, i) => {
    const T = starts[i], b = BEATS[r.veredito];
    if (i === pivotAfter + 1) lapPoses.push({ cycle: lapWalkR, hz: 7, in: T }, { src: `${lapSlug}-kf-present.png`, in: T + 24 });
    else if (i > 0) lapPoses.push({ src: `${lapSlug}-kf-present.png`, in: T + 2 });
    lapPoses.push({ src: (r.veredito === 'yes' ? `${lapSlug}-happy.png` : `${lapSlug}-kf-sad.png`), in: T + b.react });
  });
  lapPoses.push({ cycle: lapWalkL, hz: 7, in: exitStart });
  chars.push({ cx: LAP_CX, cy: CY, w: LW, poses: lapPoses,
    moveX: [[0, LAP_HIDE], [24, 0], [exitStart, 0], [exitStart + 24, LAP_HIDE], [pivotEnter, LAP_HIDE], [pivotEnter + 24, 0]] });

  // Flick âncora
  const flickPoses = [{ src: `${flickSlug}-kf-neutral.png`, in: 0 }];
  rounds.forEach((r, i) => {
    const T = starts[i], b = BEATS[r.veredito];
    flickPoses.push({ src: `${flickSlug}-kf-neutral.png`, in: T });
    if (b.think != null) flickPoses.push({ src: `${flickSlug}-kf-think.png`, in: T + b.think });
    flickPoses.push({ src: (r.veredito === 'yes' ? `${flickSlug}-kf-yes.png` : `${flickSlug}-kf-no.png`), in: T + b.verdict });
  });
  flickPoses.push({ src: `${flickSlug}-kf-neutral.png`, in: exitStart });
  chars.push({ cx: FLICK_CX, cy: CY, w: FW, poses: flickPoses });

  // balões: gancho + nome + veredito
  if (video.gancho) balloons.push({ text: video.gancho, x: W / 2, y: 150, size: 46, rot: 0, in: 6, out: 62 });
  rounds.forEach((r, i) => {
    const T = starts[i], b = BEATS[r.veredito], dur = dr(r);
    balloons.push({ text: r.nome, x: LAP_CX, y: 468, size: 46, in: T + b.nameIn, out: T + b.nameOut });
    const vb = r.veredito === 'yes' ? verd.yes : verd.no;
    const cor = r.veredito === 'yes' ? '#1f8a3b' : '#b02020';
    balloons.push({ text: vb, x: 820, y: 418, size: 50, color: cor, in: T + b.verdict + 2, out: T + dur - 2 });
    zooms.push({ at: T + b.verdict, to: 1.07, origin: '80% 46%', ramp: 5, dur: 22 });
  });
  // pivô: Laporta tem uma ideia e sai buscar atacantes
  balloons.push({ text: 'TIVE UMA IDEIA...', x: LAP_CX, y: 468, size: 44, in: exitStart - 8, out: exitStart + 26 });

  // SFX (tempos em segundos)
  const S = (f) => +(f / fps).toFixed(3);
  sfx.push({ src: 'sfx-whoosh.wav', at: S(24), vol: 0.4 });
  rounds.forEach((r, i) => {
    const T = starts[i], b = BEATS[r.veredito];
    sfx.push({ src: 'sfx-whoosh.wav', at: S(T), vol: 0.45 });
    sfx.push({ src: (r.veredito === 'yes' ? 'sfx-ding.wav' : 'sfx-buzz.wav'), at: S(T + b.verdict), vol: 0.75 });
  });
  sfx.push({ src: 'sfx-stinger.wav', at: S(roundsDur + 2), vol: 0.8 });

  // fecho: close no Flick + quadro tático
  const endDur = 120;
  const fechoPose = video.fecho?.pose || `${flickSlug}-lg-1.png`;
  const endShot = {
    dur: endDur, bg: { type: 'blur', src: 'cenario-base.png' }, camera: 'punch', dust: false,
    chars: [{ cx: 770, cy: 760, w: 1080, motion: 'static', poses: [{ src: fechoPose.endsWith('.png') ? fechoPose : fechoPose + '.png', in: 0 }] }],
    board: { x: 300, y: 690, scale: 0.52, rot: -4 },
    caption: video.fecho?.fala || '',
  };

  const totalFrames = roundsDur + endDur;
  const scene = {
    fps, width: W, height: H, font: video.fonte || 'Luckiest Guy',
    shots: [
      { dur: roundsDur, bg: { type: 'video', src: 'cenario.mp4' }, dust: false, chars, balloons, zooms },
      endShot,
    ],
  };
  const audio = {
    durSec: +(totalFrames / fps).toFixed(3),
    music: video.trilha?.arquivo || null,   // relativo a CONTEUDO_DIR
    musicVol: video.trilha?.vol ?? 0.2,
    sfx,
  };
  return { scene, audio, totalFrames };
}

// Composer "gags-sequencia" (data-fifa): gags independentes com escalada. Cada jogador chega,
// veste a camisa da seleção, tenta andar e CAI (pilha). Fecho: Yamal chega, vê a pilha e foge.
function montarGags(video) {
  const fps = video.fps || 30;
  const [W, H] = DIMS[video.formato] || DIMS['9:16'];
  const rounds = video.roteiro || [];
  const CY = 650, PW = 440;
  const SPOTS = [850, 630, 410, 200]; // 1º jogador na direita, os próximos à esquerda (pilha)
  const chars = [], balloons = [], zooms = [], sfx = [];
  const S = (f) => +(f / fps).toFixed(3);

  if (video.gancho) balloons.push({ text: video.gancho, x: W / 2, y: 150, size: 58, rot: 0, in: 6, out: 52 });

  // entrada = walk cycle de 4 quadros (só as pernas mexem), todos virados pra direita
  const walk = (slug) => [`${slug}-w1.png`, `${slug}-w2.png`, `${slug}-w3.png`, `${slug}-w4.png`];
  let T = 54;
  rounds.forEach((r, i) => {
    const f = 1 - i * 0.12;                 // escalada: cada um mais rápido
    const b = (o) => Math.round(o * f);
    const cx = SPOTS[i] ?? (850 - i * 200);
    const walkDur = b(30);
    const off = -(cx + 260);                // começa fora da tela pela esquerda
    const inj = T + b(92);
    chars.push({ cx, cy: CY, w: PW, appear: T - 4,
      moveX: [[0, off], [T, off], [T + walkDur, 0]],
      poses: [
        { cycle: walk(r.slug), hz: 4, in: T },
        { src: `${r.slug}-3-veste.png`, in: T + b(36) },
        { src: `${r.slug}-4-head.png`, in: T + b(52) },
        { src: `${r.slug}-5-ready.png`, in: T + b(66) },
        { src: `${r.slug}-6-step.png`, in: T + b(82) },
        { src: `${r.slug}-7-hurt.png`, in: inj },
        { src: `${r.slug}-8-down.png`, in: T + b(104) },
      ] });
    balloons.push({ text: 'AI!', x: Math.min(W - 90, cx + 130), y: CY - 150, size: 84, color: '#b02020', in: inj + 2, out: inj + 40 });
    zooms.push({ at: inj, to: 1.06, origin: `${Math.round((cx / W) * 100)}% 46%`, ramp: 4, dur: 18 });
    sfx.push({ src: 'sfx-whoosh.wav', at: S(T), vol: 0.4 });
    sfx.push({ src: 'sfx-buzz.wav', at: S(inj), vol: 0.7 });
    T += b(100) + 8;
  });

  // fecho: Yamal chega (frente), pega a camisa, fica pensativo (ZOOM segurado), olha pro lado,
  // vê a pilha de machucados, se apavora e foge correndo pra esquerda.
  const y = video.fecho?.slug || 'yamal';
  const Ty = T + 10, yCx = 340;
  chars.push({ cx: yCx, cy: 740, w: 500, appear: Ty - 4,
    moveX: [[0, -900], [Ty, -900], [Ty + 28, 0], [Ty + 136, 0], [Ty + 178, -900]],
    poses: [
      { cycle: walk(y), hz: 4, in: Ty },
      { src: `${y}-2-pega.png`, in: Ty + 30 },
      { src: `${y}-3-pensativo.png`, in: Ty + 50 },
      { src: `${y}-4-olha.png`, in: Ty + 94 },
      { src: `${y}-5-scared.png`, in: Ty + 110 },
      { src: `${y}-6-flee.png`, in: Ty + 128 },
      { cycle: [`${y}-7-runL-a.png`, `${y}-8-runL-b.png`], hz: 8, in: Ty + 138 },
    ] });
  // zoom segurado no Yamal enquanto ele pensa
  zooms.push({ at: Ty + 48, to: 1.14, origin: '31% 42%', ramp: 8, hold: 36, out: 14 });
  sfx.push({ src: 'sfx-buzz.wav', at: S(Ty + 110), vol: 0.5 });
  sfx.push({ src: 'sfx-whoosh.wav', at: S(Ty + 138), vol: 0.55 });
  sfx.push({ src: 'sfx-stinger.wav', at: S(Ty + 176), vol: 0.7 });

  // fecho estilo desenho: íris preta fechando a tela, depois o @ da marca no preto
  const iris = { start: Ty + 188, dur: 30, origin: '50% 48%' };
  const endCard = { text: video.marca || '@devblaugrana', at: Ty + 222, size: 76 };
  const dur = endCard.at + 54;
  const bg = video.cenario?.anim ? { type: 'video', src: 'cenario.mp4' } : { type: 'image', src: 'cenario-base.png' };
  const scene = { fps, width: W, height: H, font: video.fonte || 'Luckiest Guy',
    shots: [{ dur, bg, dust: false, chars, balloons, zooms, iris, endCard }] };
  const audio = { durSec: +(dur / fps).toFixed(3), music: video.trilha?.arquivo || null, musicVol: video.trilha?.vol ?? 0.2, sfx };
  return { scene, audio, totalFrames: dur };
}
