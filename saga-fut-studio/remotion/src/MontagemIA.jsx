// MONTAGEM SOBRE CLIPES GERADOS (teste da estratégia A, 03/08/2026): o Grok anima o still que
// o motor compôs, e ESTA composição devolve a edição da casa por cima — cortes com impact flash,
// legenda-fala no alto (texto com contorno, sem balão), ken burns leve e a moldura de quadrinho.
// A moldura entra AQUI, e não no still, de propósito: moldura dentro do frame gerado seria
// animada (e derretida) junto pela IA.
//
// Entrada: src/montagem.json = { fps, width, height, clips: [{ src, frames, texto?, textoIn?, textoOut? }] }
// `src` é relativo a public/ (staticFile). `frames` é a duração do clipe NA montagem.
import { AbsoluteFill, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig, interpolate, spring, delayRender, continueRender } from 'remotion';
import { useState, useEffect } from 'react';
import montagem from './montagem.json';

const FONT_FILES = { 'Luckiest Guy': 'font-luckiest-guy.woff2' };
const FONT = `'Luckiest Guy', 'Chalkboard SE', sans-serif`;

export const montagemDuration = () => (montagem.clips || []).reduce((a, c) => a + (c.frames || 0), 0) || 30;

// mesmo desenho do Cena.jsx (margem creme + moldura escura + selo de estrela)
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

// fala-legenda da casa: texto com contorno e sombra, pop de entrada, sem balão
const Fala = ({ texto, inF, outF }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < inF || frame >= outF) return null;
  const pop = spring({ frame: frame - inF, fps, config: { damping: 12, stiffness: 170 } });
  const scale = interpolate(pop, [0, 1], [0.55, 1], { extrapolateLeft: 'clamp' });
  return (
    <div style={{ position: 'absolute', left: '50%', top: 210, transform: `translate(-50%, -50%) scale(${scale}) rotate(-2deg)` }}>
      <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 58, color: '#fff', WebkitTextStroke: '8px #1c1c1c', paintOrder: 'stroke fill', textShadow: '3px 4px 0 rgba(0,0,0,0.28)', whiteSpace: 'nowrap', display: 'block', lineHeight: 1 }}>{texto}</span>
    </div>
  );
};

// flash branco de 3 frames na abertura do clipe: o impact frame que esconde a emenda do corte
const Flash = ({ n = 3 }) => {
  const frame = useCurrentFrame();
  if (frame >= n) return null;
  const op = interpolate(frame, [0, n], [1, 0.35], { extrapolateRight: 'clamp' });
  return <AbsoluteFill style={{ background: '#ffffff', opacity: op, zIndex: 60 }} />;
};

const Clip = ({ clip, comFlash }) => {
  const frame = useCurrentFrame();
  // ken burns leve: o clipe respira 1 -> 1.05 ao longo da própria duração
  const z = interpolate(frame, [0, clip.frames], [1, 1.05], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transform: `scale(${z})` }}>
        <OffthreadVideo src={staticFile(clip.src)} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </AbsoluteFill>
      {clip.texto ? <Fala texto={clip.texto} inF={clip.textoIn ?? 8} outF={clip.textoOut ?? clip.frames - 6} /> : null}
      {comFlash ? <Flash /> : null}
    </AbsoluteFill>
  );
};

export const MontagemIA = () => {
  const [handle] = useState(() => delayRender('fonts'));
  useEffect(() => {
    Promise.all(Object.entries(FONT_FILES).map(([fam, file]) => {
      const f = new FontFace(fam, `url(${staticFile(file)})`);
      return f.load().then((ff) => document.fonts.add(ff));
    })).then(() => continueRender(handle)).catch(() => continueRender(handle));
  }, [handle]);

  let at = 0;
  return (
    <AbsoluteFill style={{ background: '#20201c' }}>
      {(montagem.clips || []).map((c, i) => {
        const from = at; at += c.frames;
        return (
          <Sequence key={i} from={from} durationInFrames={c.frames}>
            <Clip clip={c} comFlash={i > 0} />
          </Sequence>
        );
      })}
      <ComicFrame />
    </AbsoluteFill>
  );
};
