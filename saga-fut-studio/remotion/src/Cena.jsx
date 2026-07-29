import { AbsoluteFill, OffthreadVideo, Img, staticFile, useCurrentFrame, useVideoConfig, interpolate, spring, delayRender, continueRender } from 'remotion';
import { useState, useEffect } from 'react';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { slide } from '@remotion/transitions/slide';
import { fade } from '@remotion/transitions/fade';
import { wipe } from '@remotion/transitions/wipe';
import scene from './scene.json';

// fontes cartoon (Google Fonts, baixadas em public/). Trocar ACTIVE_FONT pra testar.
const FONT_FILES = { 'Luckiest Guy': 'font-luckiest-guy.woff2', 'Bangers': 'font-bangers.woff2', 'Fredoka': 'font-fredoka.woff2' };
const ACTIVE_FONT = scene.font || 'Luckiest Guy';   // vem do scene.json (definido pelo vídeo)
const FONT = `'${ACTIVE_FONT}', 'Chalkboard SE', sans-serif`;

const Rays = ({ variant = 'loud' }) => {
  const frame = useCurrentFrame();
  const soft = variant === 'soft';
  const spin = frame * (soft ? 0.3 : 0.55);
  const cA = soft ? '#5c1c25' : '#7a1f2b';
  const cB = soft ? '#233257' : '#2a3f7a';
  const bg = `repeating-conic-gradient(from ${spin}deg at 50% 48%, ${cA} 0deg 15deg, ${cB} 15deg 30deg)`;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: bg }} />
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 46%, rgba(0,0,0,0) ${soft ? 22 : 34}%, rgba(0,0,0,${soft ? 0.5 : 0.32}) 100%)` }} />
    </AbsoluteFill>
  );
};

const BgBlur = ({ src }) => (
  <AbsoluteFill>
    <Img src={staticFile(src)} style={{ width: '110%', height: '110%', left: '-5%', top: '-5%', position: 'absolute', objectFit: 'cover', filter: 'blur(14px) brightness(0.82)' }} />
    <AbsoluteFill style={{ background: 'radial-gradient(circle at 50% 46%, rgba(0,0,0,0) 30%, rgba(0,0,0,0.28) 100%)' }} />
  </AbsoluteFill>
);

const Caption = ({ text }) => (
  <div style={{ position: 'absolute', top: 64, width: '100%', textAlign: 'center', padding: '0 40px' }}>
    <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 66, color: '#fff', WebkitTextStroke: '10px #1c1c1c', paintOrder: 'stroke fill', textShadow: '4px 5px 0 rgba(0,0,0,0.28)', lineHeight: 1.1 }}>{text}</span>
  </div>
);

// fala = SÓ TEXTO (sem balão), com contorno forte pra ler sobre a cena + pop sutil
const Balloon = ({ b }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inF = b.in ?? b.at ?? 0;
  if (frame < inF || frame >= (b.out ?? 1e9)) return null;
  const pop = spring({ frame: frame - inF, fps, config: { damping: 12, stiffness: 170 } });
  const scale = interpolate(pop, [0, 1], [0.55, 1], { extrapolateLeft: 'clamp' });
  const fill = b.color ?? '#fff';
  const stroke = b.color ? '#fffdf5' : '#1c1c1c';   // colorido -> contorno claro; branco -> contorno escuro
  return (
    <div style={{ position: 'absolute', left: b.x, top: b.y, transform: `translate(-50%, -50%) scale(${scale}) rotate(${b.rot ?? -2}deg)` }}>
      <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: b.size ?? 64, color: fill, WebkitTextStroke: `${b.stroke ?? 8}px ${stroke}`, paintOrder: 'stroke fill', textShadow: '3px 4px 0 rgba(0,0,0,0.28)', whiteSpace: 'nowrap', display: 'block', lineHeight: 1 }}>{b.text}</span>
    </div>
  );
};

// ficha de scout: nome + posição (ZAGUEIRO azul / ATACANTE verde), com pop
const Card = ({ c }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inF = c.in ?? c.at ?? 0;
  if (frame < inF || frame >= (c.out ?? 1e9)) return null;
  const pop = spring({ frame: frame - inF, fps, config: { damping: 12, stiffness: 140 } });
  const s = interpolate(pop, [0, 1], [0, 1], { extrapolateLeft: 'clamp' });
  const isAta = c.pos === 'ATACANTE';
  const badge = isAta ? '#1f8a3b' : '#2a3f7a';
  return (
    <div style={{ position: 'absolute', left: c.x ?? 540, top: c.y ?? 330, transform: `translate(-50%, -50%) scale(${s}) rotate(-3deg)` }}>
      <div style={{ width: 360, background: '#fffdf5', border: '10px solid #151515', borderRadius: 26, padding: '24px 20px', textAlign: 'center' }}>
        <div style={{ width: 150, height: 150, margin: '0 auto 14px', borderRadius: 18, background: badge, border: '6px solid #151515', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: 'Arial Black, sans-serif', fontWeight: 900, fontSize: 58, color: '#fff' }}>{isAta ? 'ATA' : 'ZAG'}</span>
        </div>
        <div style={{ fontFamily: 'Arial Black, sans-serif', fontWeight: 900, fontSize: 42, color: '#151515', lineHeight: 1 }}>{c.name}</div>
        <div style={{ marginTop: 12, display: 'inline-block', padding: '6px 18px', borderRadius: 18, background: badge, color: '#fff', fontFamily: 'Arial Black, sans-serif', fontWeight: 900, fontSize: 26 }}>{c.pos}</div>
      </div>
    </div>
  );
};

// carimbo REPROVADO/CONTRATADO que "bate" (spring de escala grande -> 1)
const Stamp = ({ s }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inF = s.in ?? s.at ?? 0;
  if (frame < inF || frame >= (s.out ?? 1e9)) return null;
  const p = spring({ frame: frame - inF, fps, config: { damping: 8, stiffness: 200 } });
  const sc = interpolate(p, [0, 1], [2.6, 1]);
  const op = interpolate(p, [0, 0.35], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', left: s.x ?? 540, top: s.y ?? 330, transform: `translate(-50%, -50%) rotate(-14deg) scale(${sc})`, opacity: op, color: s.color, border: `10px solid ${s.color}`, borderRadius: 12, padding: '8px 24px', fontFamily: 'Arial Black, sans-serif', fontWeight: 900, fontSize: 58, letterSpacing: 2, background: 'rgba(255,255,255,0.85)' }}>{s.text}</div>
  );
};

// quadro tático 0-0-10: campo vertical emoldurado, 10 atacantes em cima, defesa vazia
const Board = ({ cfg = {} }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 13 } });
  const s = interpolate(pop, [0, 1], [0.8, 1]) * (cfg.scale ?? 1);
  const atk = [];
  for (let r = 0; r < 2; r++) for (let col = 0; col < 5; col++) atk.push([90 + col * 110, 150 + r * 120]);
  return (
    <div style={{ position: 'absolute', left: cfg.x ?? 540, top: cfg.y ?? 660, transform: `translate(-50%, -50%) scale(${s}) rotate(${cfg.rot ?? -3}deg)`, background: '#20130e', border: '14px solid #3a2418', borderRadius: 14, padding: 12, boxShadow: '6px 8px 0 rgba(0,0,0,0.3)' }}>
      <svg width="620" height="820" viewBox="0 0 620 820">
        <rect x="6" y="6" width="608" height="808" rx="20" fill="#2f7d3f" stroke="#eee" strokeWidth="8" />
        <line x1="6" y1="410" x2="614" y2="410" stroke="#eee" strokeWidth="6" />
        <circle cx="310" cy="410" r="60" fill="none" stroke="#eee" strokeWidth="6" />
        <rect x="210" y="6" width="200" height="70" fill="none" stroke="#eee" strokeWidth="6" />
        <rect x="210" y="744" width="200" height="70" fill="none" stroke="#eee" strokeWidth="6" />
        {atk.map((p, i) => (<g key={i}><circle cx={p[0]} cy={p[1]} r="30" fill="#7a1f2b" stroke="#fff" strokeWidth="4" /><text x={p[0]} y={p[1] + 9} fontFamily="Arial Black" fontSize="26" fill="#fff" textAnchor="middle">9</text></g>))}
        <g><circle cx="310" cy="770" r="26" fill="#e0a92e" stroke="#fff" strokeWidth="4" /><text x="310" y="778" fontFamily="Arial Black" fontSize="22" fill="#151515" textAnchor="middle">1</text></g>
      </svg>
      <div style={{ position: 'absolute', bottom: -6, left: '50%', transform: 'translate(-50%, 100%)', marginTop: 10, background: '#151515', color: '#fff', fontFamily: 'Arial Black, sans-serif', fontWeight: 900, fontSize: 60, padding: '8px 30px', borderRadius: 16, border: '5px solid #f5efe0', whiteSpace: 'nowrap' }}>0 - 0 - 10</div>
    </div>
  );
};

// papel de scout na mao do Laporta: folha branca com lista de nomes, pop + in/out
const Note = ({ n }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inF = n.in ?? 0;
  if (frame < inF || frame >= (n.out ?? 1e9)) return null;
  const pop = spring({ frame: frame - inF, fps, config: { damping: 13, stiffness: 160 } });
  const s = interpolate(pop, [0, 1], [0.4, 1], { extrapolateLeft: 'clamp' });
  return (
    <div style={{ position: 'absolute', left: n.x, top: n.y, transform: `translate(-50%, -50%) scale(${s}) rotate(${n.rot ?? -4}deg)`, width: n.w ?? 190 }}>
      <div style={{ background: '#fffdf5', border: '5px solid #151515', borderRadius: 8, padding: '14px 10px 16px', boxShadow: '3px 5px 0 rgba(0,0,0,0.25)' }}>
        {(n.lines || []).map((l, i) => (
          <div key={i} style={{ fontFamily: 'Arial Black, sans-serif', fontWeight: 900, fontSize: n.size ?? 26, color: '#1b2a5a', lineHeight: 1.25, textAlign: 'center', borderBottom: i < n.lines.length - 1 ? '2px dotted #b9b190' : 'none', padding: '2px 0' }}>{l}</div>
        ))}
      </div>
    </div>
  );
};

// interpola uma trilha [[frame,valor],...], tolerando frames NÃO-crescentes (o interpolate do
// Remotion exige input estritamente crescente e quebra o render inteiro se receber [.,58],[.,58]).
// Aqui a gente força o eixo x a ser monotônico (empurra +epsilon), então dado torto não derruba.
const interpTrack = (track, frame) => {
  const xs = [], ys = [];
  for (const [x, y] of track) { xs.push(xs.length && x <= xs[xs.length - 1] ? xs[xs.length - 1] + 1e-3 : x); ys.push(y); }
  return interpolate(frame, xs, ys, { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
};

// poeira/atmosfera flutuante: motes determinísticos que sobem devagar (dá vida ao ar do set)
const Dust = ({ w = 1080, h = 1350, n = 20 }) => {
  const frame = useCurrentFrame();
  const motes = [];
  for (let i = 0; i < n; i++) {
    const seed = i * 63.7;
    const bx = (Math.sin(seed) * 0.5 + 0.5) * w;
    const y = (h + 60) - (((frame * 0.18) + i * 90) % (h + 120));
    const x = bx + Math.sin(frame / 40 + i) * 22;
    const op = 0.08 + 0.10 * (Math.sin(frame / 25 + i * 1.3) * 0.5 + 0.5);
    const r = 2 + (i % 3);
    motes.push(<div key={i} style={{ position: 'absolute', left: x, top: y, width: r * 2, height: r * 2, borderRadius: '50%', background: `rgba(255,244,214,${op})`, filter: 'blur(1px)' }} />);
  }
  return <AbsoluteFill>{motes}</AbsoluteFill>;
};

// confete de festa: papeizinhos coloridos caindo, balançando e girando (determinístico)
const Confetti = ({ w = 1080, h = 1350, n = 46 }) => {
  const frame = useCurrentFrame();
  const cores = ['#e23b3b', '#2a4bd7', '#f2c531', '#f5f0e6', '#2f9e44', '#e879b9'];
  const bits = [];
  for (let i = 0; i < n; i++) {
    const seed = i * 51.3;
    const bx = (Math.sin(seed) * 0.5 + 0.5) * w;
    const speed = 1.1 + ((i % 5) * 0.5);
    const y = (((frame * speed) + i * 57) % (h + 80)) - 40;
    const x = bx + Math.sin(frame / 22 + i) * 34;
    const rot = (frame * (3 + (i % 4)) + i * 40) % 360;
    const wgt = 8 + (i % 3) * 4, hgt = 12 + (i % 2) * 6;
    bits.push(<div key={i} style={{ position: 'absolute', left: x, top: y, width: wgt, height: hgt, background: cores[i % cores.length], transform: `rotate(${rot}deg)`, borderRadius: 2 }} />);
  }
  return <AbsoluteFill style={{ overflow: 'hidden' }}>{bits}</AbsoluteFill>;
};

// split-screen: divisória horizontal + rótulos dos dois lados
const SplitOverlay = ({ cfg }) => {
  const y = cfg.y ?? 690;
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', left: 0, top: y - 7, width: '100%', height: 14, background: '#151515' }} />
      {cfg.top ? <div style={{ position: 'absolute', left: 34, top: 18, fontFamily: FONT, fontWeight: 700, fontSize: 58, color: '#e9c84b', WebkitTextStroke: '7px #151515', paintOrder: 'stroke fill' }}>{cfg.top}</div> : null}
      {cfg.bottom ? <div style={{ position: 'absolute', left: 34, top: y + 16, fontFamily: FONT, fontWeight: 700, fontSize: 58, color: '#8a1c34', WebkitTextStroke: '7px #fffdf5', paintOrder: 'stroke fill' }}>{cfg.bottom}</div> : null}
    </AbsoluteFill>
  );
};

// jaula: barras verticais (+ travessas) sobre uma região (o alvo "preso")
const Cage = ({ c }) => {
  const bars = [];
  const n = c.n ?? 4;
  for (let i = 0; i < n; i++) { const x = c.x + (c.w * i) / (n - 1); bars.push(<div key={i} style={{ position: 'absolute', left: x - 5, top: c.top, width: 10, height: c.bottom - c.top, background: '#3a3a3a', borderRadius: 4 }} />); }
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', left: c.x - 8, top: c.top, width: c.w + 16, height: 12, background: '#3a3a3a', borderRadius: 4 }} />
      <div style={{ position: 'absolute', left: c.x - 8, top: c.bottom - 12, width: c.w + 16, height: 12, background: '#3a3a3a', borderRadius: 4 }} />
      {bars}
    </AbsoluteFill>
  );
};

// bola de futebol cartoon desenhada por CÓDIGO (sem asset/IA): círculo branco, contorno grosso
// e gomos pretos. Gira via `rotate` no wrapper. Reutilizável em qualquer vídeo com bola.
const BallSVG = ({ r }) => (
  <svg width={r * 2} height={r * 2} viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="46" fill="#fdfdfa" stroke="#1c1c1c" strokeWidth="5" />
    <polygon points="50,33 64,43 59,60 41,60 36,43" fill="#1c1c1c" />
    <path d="M50,3 L59,17 L50,25 L41,17 Z" fill="#1c1c1c" />
    <path d="M7,45 L23,40 L29,53 L17,63 Z" fill="#1c1c1c" />
    <path d="M93,45 L77,40 L71,53 L83,63 Z" fill="#1c1c1c" />
    <path d="M33,85 L43,74 L52,80 L45,93 Z" fill="#1c1c1c" />
    <path d="M67,87 L57,76 L66,71 L79,80 Z" fill="#1c1c1c" />
  </svg>
);

// PROP BOLA: objeto animado independente dos personagens. `x`/`y` são trilhas [[frame,px],...]
// (x = centro horizontal; y = ALTURA acima do chão, 0 = rolando, positivo = no ar). Desenha uma
// SOMBRA no chão que encolhe/clareia conforme a bola sobe (vende o "está no ar"), e um GIRO
// proporcional à distância horizontal rolada (rola sem escorregar). As trajetórias (passe/arco/
// quique) são só formatos de trilha, geradas no composer — o motor só interpola.
const Ball = ({ b }) => {
  const frame = useCurrentFrame();
  if (b.appear != null && frame < b.appear) return null;
  if (b.vanish != null && frame >= b.vanish) return null;
  const r0 = b.r ?? 34;
  const sc = b.s ? interpTrack(b.s, frame) : 1;            // escala (perspectiva: bola que vai ao fundo encolhe)
  const r = r0 * sc;
  const x = interpTrack(b.x, frame);
  const yOff = b.y ? interpTrack(b.y, frame) : 0;          // altura acima do chão (modo "altura")
  const groundY = b.groundY ?? 1000;
  // modo PLANO (rondo/visto de cima): `cy` é a posição vertical ABSOLUTA na tela (bola no chão em 2D);
  // senão é a física de altura padrão (cy = chão - altura). A sombra segue o modo.
  const plano = !!b.cy;
  const cy = plano ? interpTrack(b.cy, frame) : (groundY - yOff);
  const shadowY = plano ? cy + r * 0.9 : groundY + r * 0.34;
  const x0 = b.x?.[0]?.[1] ?? x;
  const spinDeg = ((x - x0) / r0) * (180 / Math.PI) * (b.spin ?? 1);   // rolagem sem escorregar
  const shScale = interpolate(yOff, [0, 340], [1, 0.5], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const shOp = interpolate(yOff, [0, 340], [0.30, 0.06], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <>
      <div style={{ position: 'absolute', left: x, top: shadowY, width: r * 2 * shScale, height: r * 0.7 * shScale, transform: 'translate(-50%, -50%)', background: '#000', opacity: shOp, borderRadius: '50%', filter: 'blur(2px)' }} />
      <div style={{ position: 'absolute', left: x, top: cy, width: r * 2, height: r * 2, transform: `translate(-50%, -50%) rotate(${spinDeg}deg)` }}>
        <BallSVG r={r} />
      </div>
    </>
  );
};

// RELÓGIO de estádio: mostrador analógico cartoon com os ponteiros GIRANDO rápido + o MARCADOR DE
// MINUTO do jogo subindo veloz (0' → 45' → intervalo → 90'), estilo placar de futebol. Vende "o tempo
// voou". cfg = {at, x, y, size, speed(giro), dur(frames da corrida do relógio)}. Reutilizável.
const Clock = ({ cfg = {} }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const at = cfg.at ?? 0;
  if (frame < at) return null;
  const t = frame - at;
  const pop = spring({ frame: t, fps, config: { damping: 12, stiffness: 160 } });
  const s = interpolate(pop, [0, 1], [0.3, 1], { extrapolateLeft: 'clamp' });
  const min = t * (cfg.speed ?? 30), hr = min / 12;
  const rad = (d) => (d * Math.PI) / 180;
  const ticks = [];
  for (let i = 0; i < 12; i++) { const a = rad(i * 30); ticks.push(<line key={i} x1={50 + 38 * Math.sin(a)} y1={50 - 38 * Math.cos(a)} x2={50 + 44 * Math.sin(a)} y2={50 - 44 * Math.cos(a)} stroke="#1c1c1c" strokeWidth={i % 3 ? 1.5 : 3} />); }
  // minuto do jogo: 0→45 no 1º trecho, PAUSA em 45' (intervalo), 45→90 no 2º trecho, trava em 90'
  const dur = cfg.dur ?? 80, p = Math.min(1, t / dur);
  let minute;
  if (p < 0.42) minute = Math.round((p / 0.42) * 45);
  else if (p < 0.55) minute = 45;
  else minute = Math.round(45 + Math.min(1, (p - 0.55) / 0.45) * 45);
  minute = Math.min(90, minute);
  const size = cfg.size ?? 380;
  return (
    <div style={{ position: 'absolute', left: cfg.x ?? 540, top: cfg.y ?? 760, transform: `translate(-50%, -50%) scale(${s})` }}>
      <div style={{ filter: 'drop-shadow(5px 7px 0 rgba(0,0,0,0.25))' }}>
        <svg width={size} height={size} viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="47" fill="#fffdf5" stroke="#1c1c1c" strokeWidth="4.5" />
          {ticks}
          <line x1="50" y1="50" x2={50 + 24 * Math.sin(rad(hr))} y2={50 - 24 * Math.cos(rad(hr))} stroke="#1c1c1c" strokeWidth="4.5" strokeLinecap="round" />
          <line x1="50" y1="50" x2={50 + 38 * Math.sin(rad(min))} y2={50 - 38 * Math.cos(rad(min))} stroke="#b02020" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="50" cy="50" r="3.2" fill="#1c1c1c" />
        </svg>
      </div>
      {/* marcador de minuto estilo placar (badge escuro), logo abaixo do mostrador */}
      <div style={{ position: 'absolute', top: size * 1.02, left: '50%', transform: 'translateX(-50%)', background: '#151515', border: `${size * 0.02}px solid #f5efe0`, borderRadius: size * 0.06, padding: `${size * 0.03}px ${size * 0.11}px`, whiteSpace: 'nowrap', boxShadow: '4px 6px 0 rgba(0,0,0,0.3)' }}>
        <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: size * 0.3, color: minute >= 90 ? '#e6b800' : '#fff', letterSpacing: 1, lineHeight: 1 }}>{minute}&#39;</span>
      </div>
    </div>
  );
};

const Shot = ({ shot }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const push = interpolate(frame, [0, shot.dur], [1.0, 1.045]);
  let camScale = push;
  if (shot.camera === 'punch') {
    const s = spring({ frame, fps, config: { damping: 9, stiffness: 120 } });
    camScale = interpolate(s, [0, 1], [1.12, 1.0]);
  }
  // camera viva: deriva lenta continua (nunca 100% parada)
  const driftX = Math.sin(frame / 46) * 7;
  const driftY = Math.cos(frame / 58) * 5;
  const flash = shot.fx === 'flash' ? interpolate(frame, [0, 7], [1, 0], { extrapolateRight: 'clamp' }) : 0;
  let amp = shot.shake ? interpolate(frame, [0, 12], [shot.shake, 0], { extrapolateRight: 'clamp' }) : 0;
  // tremor SUSTENTADO por janela (ex: briga): [start, end, amplitude], com ramp de entrada/saída
  if (shot.shakeWin) {
    const [ss, se, sa] = shot.shakeWin;
    if (frame >= ss && frame < se) {
      const env = Math.min(1, (frame - ss) / 6) * Math.min(1, (se - frame) / 6);
      amp = Math.max(amp, sa * env);
    }
  }
  const jx = amp ? Math.sin(frame * 8.3) * amp : 0;
  const jy = amp ? Math.cos(frame * 7.1) * amp : 0;
  // parallax: fundo deriva em sentido oposto a camera (profundidade)
  const bgPar = Math.sin(frame / 46) * -13;
  // punch-in nos vereditos: zoom rápido em direção ao Flick e volta
  let zoomScale = 1, zoomOrigin = '50% 50%';
  for (const z of (shot.zooms || [])) {
    const to = z.to ?? 1.07;
    const at = z.at, ramp = z.ramp ?? 5, hold = z.hold ?? 0;
    const out = z.out ?? (z.dur != null ? Math.max(1, z.dur - ramp - hold) : 15);
    const peak = at + ramp, holdEnd = peak + hold, end = holdEnd + out;
    if (frame >= at && frame < end) {
      zoomScale = frame <= peak ? interpolate(frame, [at, peak], [1, to])
        : frame <= holdEnd ? to
        : interpolate(frame, [holdEnd, end], [to, 1], { extrapolateRight: 'clamp' });
      zoomOrigin = z.origin ?? '50% 50%';
    }
  }

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transformOrigin: zoomOrigin, transform: `translate(${driftX + jx}px, ${driftY + jy}px) scale(${camScale * zoomScale})` }}>
        <AbsoluteFill style={{ transform: `translateX(${bgPar}px) scale(1.09)` }}>
          {shot.bg.type === 'rays' ? <Rays variant={shot.bg.variant} />
            : shot.bg.type === 'blur' ? <BgBlur src={shot.bg.src} />
            : shot.bg.type === 'video' ? <OffthreadVideo src={staticFile(shot.bg.src)} muted loop style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <Img src={staticFile(shot.bg.src)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
        </AbsoluteFill>
        {shot.dust !== false ? <Dust /> : null}
        {shot.confetti ? <Confetti /> : null}
        {(shot.chars || []).map((c, i) => {
          // não renderiza o personagem antes/depois da janela dele (evita vazar na tela)
          if (c.appear != null && frame < c.appear) return null;
          if (c.vanish != null && frame >= c.vanish) return null;
          let tx = 0, ty = 0;
          if (c.moveX) tx = interpTrack(c.moveX, frame);
          else if (c.enter === 'left') {
            const s = spring({ frame, fps, config: { damping: 14 } });
            tx = interpolate(s, [0, 1], [-760, 0]);
          }
          if (c.moveY) ty = interpTrack(c.moveY, frame);
          const idle = c.motion === 'static' ? 0 : Math.sin(frame / 9) * (c.motion === 'idle' ? 1.8 : 2.4);
          // pulo de comemoração (ex: torcida/jogadores ao fundo): quica pra cima em loop
          let bobY = 0;
          if (c.bob) { const { amp = 20, hz = 1.2, phase = 0 } = c.bob; bobY = -Math.abs(Math.sin((frame / fps) * Math.PI * hz + phase)) * amp; }
          // flip: espelha o personagem no eixo X (orientação por DADO, não por flop no arquivo).
          // Convenção: sprite base olha pra DIREITA; flip=true faz olhar pra esquerda.
          const style = { position: 'absolute', left: c.cx, top: c.cy, width: c.w, transform: `translate(-50%, -50%) translateX(${tx}px) translateY(${idle + ty + bobY}px) scaleX(${c.flip ? -1 : 1})` };
          // poses: keyframes cronometrados (pose a pose). mostra a pose com maior `in` <= frame
          if (c.poses) {
            let cur = c.poses[0], curIn = c.poses[0].in ?? 0;
            for (const p of c.poses) { const pin = p.in ?? 0; if (frame >= pin && pin >= curIn) { cur = p; curIn = pin; } }
            const since = frame - curIn;
            // pose com `cycle` = ciclo de caminhada (2+ quadros alternando na direcao do movimento)
            let src = cur.src;
            if (cur.cycle) { const hz = cur.hz ?? 6; src = cur.cycle[Math.floor((frame * hz) / fps) % cur.cycle.length]; }
            // squash-and-settle leve na troca de pose parada (nao aplica em caminhada)
            const set = cur.cycle ? 1 : interpolate(since, [0, 5, 12], [0.975, 1.015, 1], { extrapolateRight: 'clamp' });
            const poseStyle = { ...style, transformOrigin: '50% 96%', transform: style.transform + ` scale(${2 - set}, ${set})` };
            return <Img key={i} src={staticFile(src)} style={poseStyle} />;
          }
          // swap: alterna quadros PNG da MESMA base (limited animation "on twos")
          if (c.frames) {
            const hz = c.swapHz ?? 5;
            const idx = Math.floor((frame * hz) / fps) % c.frames.length;
            return <Img key={i} src={staticFile(c.frames[idx])} style={style} />;
          }
          // clip Grok (webm transparente)
          if (c.src && c.src.endsWith('.webm')) {
            return <OffthreadVideo key={i} src={staticFile(c.src)} transparent muted loop style={style} />;
          }
          // static / idle: PNG transparente
          return <Img key={i} src={staticFile(c.src)} style={style} />;
        })}
        {(shot.balls || []).map((b, i) => <Ball key={'ball' + i} b={b} />)}
      </AbsoluteFill>
      {shot.caption ? <Caption text={shot.caption} /> : null}
      {(shot.cards || (shot.card ? [shot.card] : [])).map((c, i) => <Card key={i} c={c} />)}
      {(shot.stamps || []).map((st, i) => <Stamp key={i} s={st} />)}
      {(shot.notes || []).map((n, i) => <Note key={i} n={n} />)}
      {shot.board ? <Board cfg={typeof shot.board === 'object' ? shot.board : {}} /> : null}
      {shot.clock ? <Clock cfg={typeof shot.clock === 'object' ? shot.clock : {}} /> : null}
      {(shot.cages || []).map((c, i) => <Cage key={i} c={c} />)}
      {shot.split ? <SplitOverlay cfg={shot.split} /> : null}
      {(shot.balloons || []).map((b, i) => <Balloon key={i} b={b} />)}
      {flash > 0 ? <AbsoluteFill style={{ background: `rgba(255,255,255,${flash})` }} /> : null}
      {shot.iris && frame >= (shot.iris.start ?? 0) ? (() => {
        const p = Math.min(1, (frame - (shot.iris.start ?? 0)) / (shot.iris.dur ?? 24));
        const R = interpolate(p, [0, 1], [Math.hypot(width, height) * 0.55, 0]);
        const mask = `radial-gradient(circle at ${shot.iris.origin ?? '50% 50%'}, rgba(0,0,0,0) ${Math.max(0, R - 2)}px, #000 ${R}px)`;
        return <AbsoluteFill style={{ background: '#000', WebkitMaskImage: mask, maskImage: mask }} />;
      })() : null}
      {shot.endCard && frame >= (shot.endCard.at ?? 0) ? (
        <AbsoluteFill style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: shot.endCard.size ?? 72, color: '#fff', letterSpacing: 1, opacity: interpolate(frame, [shot.endCard.at ?? 0, (shot.endCard.at ?? 0) + 10], [0, 1], { extrapolateRight: 'clamp' }) }}>{shot.endCard.text}</span>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};

const presFor = (t) => t === 'fade' ? fade() : t === 'wipe' ? wipe({ direction: 'from-left' }) : t === 'slideL' ? slide({ direction: 'from-left' }) : slide({ direction: 'from-right' });

// moldura de QUADRINHO (padrão do SagaFut): margem creme + moldura arredondada escura em
// volta da cena + selo de ESTRELA dourada no canto superior direito. Overlay persistente.
const ComicFrame = () => {
  const { width: W, height: H } = useVideoConfig();
  const M = 22, R = 26, SW = 7, cream = '#f1dec0', dark = '#20201c', gold = '#c8912f';
  const inner = `M${M},${M + R} a${R},${R} 0 0 1 ${R},-${R} H${W - M - R} a${R},${R} 0 0 1 ${R},${R} V${H - M - R} a${R},${R} 0 0 1 -${R},${R} H${M + R} a${R},${R} 0 0 1 -${R},-${R} Z`;
  const matte = `M0,0 H${W} V${H} H0 Z ${inner}`;
  const scx = W - M - 66, scy = M + 66, ro = 31, ri = 13;
  let star = '';
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? ri : ro; star += `${i ? 'L' : 'M'}${(scx + r * Math.cos(a)).toFixed(1)},${(scy + r * Math.sin(a)).toFixed(1)} `; }
  star += 'Z';
  return (
    <AbsoluteFill>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', top: 0, left: 0 }}>
        <path d={matte} fill={cream} fillRule="evenodd" />
        <rect x={M} y={M} width={W - 2 * M} height={H - 2 * M} rx={R} fill="none" stroke={dark} strokeWidth={SW} />
        <circle cx={scx} cy={scy} r={45} fill={cream} stroke={dark} strokeWidth={4} />
        <path d={star} fill={gold} stroke={dark} strokeWidth={2} strokeLinejoin="round" />
      </svg>
    </AbsoluteFill>
  );
};

export const Cena = () => {
  const [handle] = useState(() => delayRender('fonts'));
  useEffect(() => {
    Promise.all(Object.entries(FONT_FILES).map(([fam, file]) => {
      const f = new FontFace(fam, `url(${staticFile(file)})`);
      return f.load().then((ff) => document.fonts.add(ff));
    })).then(() => continueRender(handle)).catch(() => continueRender(handle));
  }, [handle]);

  const items = [];
  scene.shots.forEach((shot, i) => {
    if (i > 0 && shot.transition && shot.transition !== 'none') {
      items.push(<TransitionSeries.Transition key={'t' + i} presentation={presFor(shot.transition)} timing={linearTiming({ durationInFrames: shot.tdur ?? 10 })} />);
    }
    items.push(<TransitionSeries.Sequence key={'s' + i} durationInFrames={shot.dur}><Shot shot={shot} /></TransitionSeries.Sequence>);
  });
  return (
    <AbsoluteFill>
      <TransitionSeries>{items}</TransitionSeries>
      {scene.moldura ? <ComicFrame /> : null}
    </AbsoluteFill>
  );
};

export const sceneDuration = () => scene.shots.reduce((a, s, i) => a + s.dur - (i > 0 && s.transition && s.transition !== 'none' ? (s.tdur ?? 10) : 0), 0);
