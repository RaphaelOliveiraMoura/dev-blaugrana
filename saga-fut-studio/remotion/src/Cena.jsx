import { AbsoluteFill, OffthreadVideo, Img, staticFile, useCurrentFrame, useVideoConfig, interpolate, spring, delayRender, continueRender, Easing } from 'remotion';
import { useState, useEffect, Fragment } from 'react';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { slide } from '@remotion/transitions/slide';
import { fade } from '@remotion/transitions/fade';
import { wipe } from '@remotion/transitions/wipe';
import { bolaCorpo, bolaLuz } from '../../shared/bola-svg.mjs';
import scene from './scene-atual';
import { quadroEm } from '../../shared/exposicao.mjs';
import { EFEITOS } from '../../shared/efeitos.mjs';

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

// FUNDO GRÁFICO — fundo que NÃO é cenário desenhado: cor chapada, gradiente, explosão radial,
// faixa de patrocínio, listras.
//
// POR QUE EXISTE: a análise das referências (Omar Momani, Hamid Sahari, 01/08/2026) mostrou que o
// fundo delas muda A CADA BEAT e quase nunca é um cenário desenhado: amarelo chapado com uma curva,
// vermelho sólido, radial laranja no momento do impacto, verde com placas de patrocínio repetidas,
// preto total. Nossos vídeos usavam UM cenário gerado do começo ao fim, e era a causa número um do
// "parece tudo igual". Aqui trocar de fundo custa uma linha no roteiro e nenhuma geração.
const FundoGrafico = ({ cfg = {} }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const { tipo = 'chapado', cor = '#e8b93a', cor2 = '#f2d478', angulo = 160, gira = 0 } = cfg;
  if (tipo === 'radial') {
    // explosão radial: o fundo do momento da virada. `gira` faz os raios rodarem devagar.
    const spin = frame * (gira || 0.25);
    const bg = `repeating-conic-gradient(from ${spin}deg at 50% ${cfg.foco ?? 46}%, ${cor} 0deg ${cfg.faixa ?? 14}deg, ${cor2} ${cfg.faixa ?? 14}deg ${(cfg.faixa ?? 14) * 2}deg)`;
    return (
      <AbsoluteFill>
        <AbsoluteFill style={{ background: bg }} />
        <AbsoluteFill style={{ background: `radial-gradient(circle at 50% ${cfg.foco ?? 46}%, rgba(0,0,0,0) 26%, rgba(0,0,0,0.3) 100%)` }} />
      </AbsoluteFill>
    );
  }
  if (tipo === 'gradiente') return <AbsoluteFill style={{ background: `linear-gradient(${angulo}deg, ${cor} 0%, ${cor2} 100%)` }} />;
  if (tipo === 'listras') {
    const larg = cfg.larguraFaixa ?? 90;
    return <AbsoluteFill style={{ background: `repeating-linear-gradient(${angulo}deg, ${cor} 0 ${larg}px, ${cor2} ${larg}px ${larg * 2}px)` }} />;
  }
  if (tipo === 'faixas') {
    // FAIXA DE PATROCÍNIO: a placa repetida que faz o olho ler "estádio" sem desenhar arquibancada.
    // O texto é o do patrocinador fictício; o padrão rola de leve, como quem passa por ela.
    const y = cfg.y ?? Math.round(H * 0.58), alt = cfg.alt ?? Math.round(H * 0.075);
    const desl = (frame * (cfg.rola ?? 0.5)) % 260;
    const placas = [];
    for (let x = -260; x < W + 260; x += 260) placas.push(x);
    return (
      <AbsoluteFill style={{ background: cor }}>
        <AbsoluteFill style={{ top: y + alt, background: cor2 }} />
        <AbsoluteFill style={{ top: y, height: alt, background: '#1c1c22', overflow: 'hidden' }}>
          {placas.map((x, i) => (
            <div key={i} style={{ position: 'absolute', left: x + desl, top: 0, width: 250, height: alt, background: i % 2 ? '#f1dec0' : '#e8e2d4', borderRight: '6px solid #1c1c22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontSize: alt * 0.5, color: '#20201c' }}>
              {cfg.texto || 'SAGAFUT'}
            </div>
          ))}
        </AbsoluteFill>
      </AbsoluteFill>
    );
  }
  // chapado (default): uma cor só, com uma curva mais clara opcional — o fundo do Momani
  return (
    <AbsoluteFill style={{ background: cor }}>
      {cfg.curva === false ? null : (
        <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ position: 'absolute' }}>
          <path d={`M0,${H * 0.42} C${W * 0.3},${H * 0.3} ${W * 0.7},${H * 0.56} ${W},${H * 0.36} L${W},${H} L0,${H} Z`} fill={cor2} opacity={cfg.forcaCurva ?? 0.55} />
        </svg>
      )}
    </AbsoluteFill>
  );
};

// PICTOGRAMA DE EMOÇÃO — fogo na cabeça, notas musicais, estrelas de tontura, gotas de suor,
// moedas, interrogação, exclamação. Desenhado por CÓDIGO e ancorado no personagem.
//
// POR QUE EXISTE: nas referências é isso que transforma uma pose numa piada. A alternativa era
// gerar uma folha de gesto por emoção, e folha custa geração; o pictograma custa uma linha e vale
// pra qualquer personagem, inclusive os que ainda não têm reação nenhuma no acervo.
const Emote = ({ e }) => {
  const frame = useCurrentFrame();
  const t = frame - (e.in ?? 0);
  const dur = e.dur ?? 40;
  if (t < 0 || t > dur) return null;
  const entra = interpolate(t, [0, 6], [0, 1], { extrapolateRight: 'clamp' });
  const sai = interpolate(t, [dur - 8, dur], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const op = Math.min(entra, sai);
  const s = e.size ?? 70;
  const x = e.x, y = e.y;
  const bal = Math.sin(t / 5) * 6;                       // balanço comum a todos
  const cor = e.cor;
  const item = (conteudo, dx, dy, rot = 0, esc = 1, o = 1) => (
    <div style={{ position: 'absolute', left: x + dx, top: y + dy, transform: `translate(-50%,-50%) rotate(${rot}deg) scale(${esc})`, opacity: o * op, fontSize: s, lineHeight: 1, fontFamily: FONT, color: cor || '#ffffff', textShadow: '0 3px 0 rgba(0,0,0,0.35)' }}>{conteudo}</div>
  );
  if (e.tipo === 'estrelas') {
    // tontura: estrelas girando em torno da cabeça
    const n = 3, R = s * 0.9;
    return <AbsoluteFill>{Array.from({ length: n }, (_, i) => {
      const a = (t / 9) + (i * 2 * Math.PI) / n;
      return <Fragment key={i}>{item('★', Math.cos(a) * R, Math.sin(a) * R * 0.42, (a * 40) % 360, 1, 1)}</Fragment>;
    })}</AbsoluteFill>;
  }
  if (e.tipo === 'notas') {
    // notas musicais subindo, cada uma no seu tempo
    return <AbsoluteFill>{[0, 1, 2].map((i) => {
      const tt = (t + i * 13) % 40;
      return <Fragment key={i}>{item(i % 2 ? '♪' : '♫', (i - 1) * s * 0.75 + Math.sin(tt / 4) * 8, -tt * 2.4, (i - 1) * 12, 1, 1 - tt / 46)}</Fragment>;
    })}</AbsoluteFill>;
  }
  if (e.tipo === 'gotas') {
    // gotas de suor saltando pros lados (susto, nervoso)
    return <AbsoluteFill>{[-1, 1].map((d, i) => {
      const tt = (t + i * 9) % 30;
      return <Fragment key={i}>{item('💧', d * (s * 0.6 + tt * 1.6), -tt * 0.9, d * 18, 1, 1 - tt / 34)}</Fragment>;
    })}</AbsoluteFill>;
  }
  if (e.tipo === 'moedas') {
    return <AbsoluteFill>{[0, 1, 2].map((i) => {
      const tt = (t + i * 11) % 42;
      return <Fragment key={i}>{item('🪙', (i - 1) * s * 0.8, -tt * 2.2, tt * 6, 1 - tt / 90, 1 - tt / 50)}</Fragment>;
    })}</AbsoluteFill>;
  }
  if (e.tipo === 'fogo') {
    // fogo na cabeça: duas línguas de chama pulsando fora de fase
    return <AbsoluteFill>{[0, 1].map((i) => (
      <Fragment key={i}>{item('🔥', (i ? 1 : -1) * s * 0.28, -Math.abs(Math.sin(t / 4 + i)) * 10, (i ? 8 : -8), 1 + Math.sin(t / 3.5 + i) * 0.12, 1)}</Fragment>
    ))}</AbsoluteFill>;
  }
  // interrogacao / exclamacao: o balãozinho de pensamento sem balão
  const glifo = e.tipo === 'exclamacao' ? '!' : '?';
  const pop = interpolate(t, [0, 5, 9], [0.4, 1.25, 1], { extrapolateRight: 'clamp' });
  return <AbsoluteFill>{item(glifo, bal, -6, bal * 0.6, pop, 1)}</AbsoluteFill>;
};

// PISCADA DE CORTE — quadro cheio de preto (ou branco) nos primeiros frames do shot.
// É pontuação de montagem, não transição: o Momani usa um blackout de poucos frames entre beats e
// isso separa duas ideias sem gastar nada. Fica POR CIMA de tudo, inclusive da moldura.
const Piscada = ({ cfg = {} }) => {
  const frame = useCurrentFrame();
  const n = cfg.frames ?? 3;
  if (frame >= n) return null;
  const cor = cfg.cor === 'branco' ? '#ffffff' : '#000000';
  const op = cfg.saida === false ? 1 : interpolate(frame, [0, n], [1, 0.35], { extrapolateRight: 'clamp' });
  return <AbsoluteFill style={{ background: cor, opacity: op, zIndex: 99 }} />;
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
// `inv` = contra-escala. No modo MUNDO a fala vive DENTRO do container da câmera pra seguir o
// personagem no pan; sem o inv ela cresceria junto com o zoom e um close viraria texto gigante.
const Balloon = ({ b, inv = 1 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inF = b.in ?? b.at ?? 0;
  if (frame < inF || frame >= (b.out ?? 1e9)) return null;
  const pop = spring({ frame: frame - inF, fps, config: { damping: 12, stiffness: 170 } });
  const scale = interpolate(pop, [0, 1], [0.55, 1], { extrapolateLeft: 'clamp' }) * inv;
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

// SOMBRA DE CONTATO — o personagem estava POR CIMA do cenário, não DENTRO dele.
// Só a bola tinha sombra; personagem nenhum tinha. Sprite recortado sem sombra flutua: não existe
// nada dizendo onde o pé encosta, e num salto isso fica gritante (o personagem sobe e nada no chão
// reage). A elipse é desenhada na linha `chao` do personagem e ENCOLHE + CLAREIA conforme ele sobe,
// usando a trilha `alturaPe` que o composer deriva da mesma folha de exposição do pulo.
const SombraContato = ({ c, frame }) => {
  if (c.chao == null) return null;
  if (c.appear != null && frame < c.appear) return null;
  if (c.vanish != null && frame >= c.vanish) return null;
  const tx = c.moveX ? interpTrack(c.moveX, frame) : 0;
  // altura do pé: a trilha exata quando existe (pulo); senão o que o moveY levantou (escalar muro)
  const alt = c.alturaPe ? Math.max(0, interpTrack(c.alturaPe, frame))
    : c.moveY ? Math.max(0, -interpTrack(c.moveY, frame)) : 0;
  const k = 1 / (1 + alt / 210);            // quanto mais alto, menor e mais fraca
  const w = c.w * 0.46 * k, h = c.w * 0.115 * k;
  return (
    <div style={{ position: 'absolute', left: c.cx + tx, top: c.chao, width: w, height: h,
                  transform: 'translate(-50%, -50%)', background: '#000', opacity: 0.3 * k,
                  borderRadius: '50%', filter: 'blur(6px)' }} />
  );
};

// POEIRA DE IMPACTO: baforada curta nos pés quando o personagem aterrissa. É a reação do chão que
// faltava — sem ela o pé bate e o mundo não toma conhecimento. Determinística (mesmo frame, mesmo
// desenho), como todo efeito por código aqui.
// SPRITE COM DEFORMAÇÃO — o desenho inteiro ganha vida sem ser cortado em peça nenhuma.
//
// POR QUE EXISTE: até aqui um personagem parado era um PNG parado, e a única forma de dar vida a
// ele era gerar mais desenhos. A tentativa de resolver isso montando o corpo em peças articuladas
// foi reprovada (virava colagem). Deformar a arte INTEIRA resolve o mesmo problema sem cortar nada:
// não existe junta, então não existe emenda.
//
// COMO: a imagem é desenhada em N tiras horizontais, cada uma mostrando a sua faixa da arte
// (`clip` por overflow) e deslocada segundo a mesma função que a prova em Node usa. Comprimir as
// tiras de uma região faz aquela parte encolher (o peito no riso), deslocar em onda faz o corpo
// balançar. É squash-and-stretch clássico, aplicado por cima da arte que já existe.
//
// `efeito.entra`/`sai` fazem a intensidade subir e descer nas pontas: efeito que liga de uma vez
// denuncia o truque, parece corte e não movimento.
const TIRAS = 44;
const Sprite = ({ c, src, style, frame, fps }) => {
  const ef = c.efeito;
  const fn = ef && EFEITOS[ef.tipo];
  if (!fn) return <Img src={staticFile(src)} style={style} />;

  const t0 = ef.em ?? 0;
  const rel = Math.max(0, frame - t0);
  const periodo = ef.periodo ?? 40;
  const t = (rel % periodo) / periodo;
  const dur = ef.dur ?? 1e9;
  const rampa = Math.min(1, rel / (ef.entra ?? 8), (dur - rel) / (ef.sai ?? 8), 1) * (ef.forca ?? 1);
  if (rel > dur || rampa <= 0) return <Img src={staticFile(src)} style={style} />;

  const tiras = [];
  for (let s = 0; s < TIRAS; s++) {
    const u = (s + 0.5) / TIRAS;
    const { dy = 0, dx = 0 } = fn(u, t, rampa);
    // dy é em pixels do canvas normalizado (620 de altura); aqui vira fração da altura do sprite
    const fy = dy / 620, fx = dx / 480;
    tiras.push(
      <div key={s} style={{ position: 'absolute', left: 0, top: `${(s / TIRAS) * 100}%`, width: '100%', height: `${100 / TIRAS + 0.12}%`, overflow: 'hidden' }}>
        <img src={staticFile(src)} style={{ position: 'absolute', width: '100%', height: `${TIRAS * 100}%`, left: `${fx * 100}%`, top: `${-(s / TIRAS) * TIRAS * 100 + fy * TIRAS * 100}%` }} />
      </div>,
    );
  }
  // ALTURA EXPLÍCITA. O `style` do personagem só define a LARGURA — a altura de um <img> vem sozinha
  // do aspecto do arquivo. Num <div> não vem: sem `height` o container fica com altura zero, as
  // tiras (que são `height: X%`) colapsam e o personagem SOME da tela, deixando só a sombra, que é
  // desenhada à parte. Todo sprite do acervo é 480x620 (ou o dobro disso), então o aspecto é fixo.
  const ASPECTO = 620 / 480;
  return <div style={{ ...style, height: style.width * ASPECTO, overflow: 'visible' }}>{tiras}</div>;
};

const PoeiraImpacto = ({ c, frame }) => {
  // só `impactosPe`: um empurrão bate na altura das mãos, e poeira nos pés ali leria como erro
  if (!c.impactosPe || c.chao == null) return null;
  const hit = c.impactosPe.filter((f) => frame >= f && frame < f + 12).pop();
  if (hit == null) return null;
  const p = (frame - hit) / 12;                        // 0 -> 1 ao longo da baforada
  const tx = c.moveX ? interpTrack(c.moveX, frame) : 0;
  const puffs = [];
  for (let i = 0; i < 6; i++) {
    const dir = i % 2 ? 1 : -1;
    const espalha = (0.4 + (i * 0.17) % 0.6) * c.w * 0.34 * p;
    const r = c.w * (0.05 + (i % 3) * 0.014) * (0.6 + p);
    puffs.push(
      <div key={i} style={{ position: 'absolute', left: c.cx + tx + dir * espalha,
        top: c.chao - c.w * 0.03 - p * c.w * 0.07 * ((i % 3) + 1) / 3, width: r, height: r,
        transform: 'translate(-50%, -50%)', background: '#e9e2d2', opacity: 0.5 * (1 - p),
        borderRadius: '50%', filter: 'blur(3px)' }} />,
    );
  }
  return <>{puffs}</>;
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

// ============================================================================
// AMBIENTE — camadas de VIDA no cenário, desenhadas por CÓDIGO (custo zero de geração).
// O cenário gerado é uma foto parada: sem isso, o fundo de um vídeo nosso é um PNG imóvel atrás
// de personagens que se mexem, e a cena inteira lê como slide. Estes componentes são
// determinísticos (nada de random, senão cada frame do render sorteia de novo) e reutilizáveis
// em qualquer vídeo. Entram via `shot.ambiente`.
// ============================================================================

// TORCIDA: faixa de silhuetas na arquibancada, cada uma pulando/balançando em fase própria.
// De propósito são SILHUETAS: ao fundo ninguém repara em rosto, e sprite gerado pra isso seria
// dinheiro jogado fora. `n` cabeças distribuídas na largura, dentro da banda [y, y+h].
const Torcida = ({ w = 1080, y = 700, h = 150, n = 34, cores = ['#2b2f3a', '#3a2b33', '#232833', '#3d3630'], amp = 12, hz = 1.1 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const gente = [];
  for (let i = 0; i < n; i++) {
    const seed = i * 37.9;
    const jx = (Math.sin(seed) * 0.5 + 0.5);
    const x = jx * w;
    const esc = 0.78 + (Math.sin(seed * 1.7) * 0.5 + 0.5) * 0.44;   // fileiras: uns maiores, uns menores
    const fase = (Math.sin(seed * 2.3) * 0.5 + 0.5) * Math.PI * 2;
    const dy = -Math.abs(Math.sin((frame / fps) * Math.PI * hz + fase)) * amp * esc;
    const cor = cores[i % cores.length];
    const cab = 26 * esc, corpo = 46 * esc, larg = 40 * esc;
    const topo = y + (Math.sin(seed * 3.1) * 0.5 + 0.5) * (h - corpo - cab) + dy;
    gente.push(
      <div key={i} style={{ position: 'absolute', left: x - larg / 2, top: topo, width: larg, height: cab + corpo }}>
        <div style={{ position: 'absolute', left: (larg - cab) / 2, top: 0, width: cab, height: cab, borderRadius: '50%', background: cor }} />
        <div style={{ position: 'absolute', left: 0, top: cab * 0.86, width: larg, height: corpo, borderRadius: `${larg * 0.4}px ${larg * 0.4}px 0 0`, background: cor }} />
      </div>
    );
  }
  return <AbsoluteFill style={{ overflow: 'hidden' }}>{gente}</AbsoluteFill>;
};

// BANDEIRAS: panos em mastro ondulando (skew oscilante). Dá movimento no alto do quadro, onde
// cenário costuma ser parede/céu vazio.
const Bandeiras = ({ w = 1080, y = 300, n = 5, cores = ['#8a1c34', '#1b2a5a', '#e0a92e', '#f5f0e6'], size = 90 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fl = [];
  for (let i = 0; i < n; i++) {
    const seed = i * 53.1;
    const x = ((i + 0.5) / n) * w + Math.sin(seed) * (w / n) * 0.22;
    const esc = 0.8 + (Math.sin(seed * 1.3) * 0.5 + 0.5) * 0.5;
    const fase = (Math.sin(seed * 2.7) * 0.5 + 0.5) * Math.PI * 2;
    const onda = Math.sin((frame / fps) * Math.PI * 1.6 + fase);
    const yy = y + Math.sin(seed * 3.7) * 40;
    fl.push(
      <div key={i} style={{ position: 'absolute', left: x, top: yy }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: 6 * esc, height: size * 1.5 * esc, background: '#2a241c', borderRadius: 3 }} />
        <div style={{ position: 'absolute', left: 5 * esc, top: 6 * esc, width: size * esc, height: size * 0.66 * esc, background: cores[i % cores.length], border: '3px solid #1c1c1c', borderRadius: 3, transform: `skewY(${onda * 7}deg) scaleX(${1 - Math.abs(onda) * 0.12})`, transformOrigin: '0% 50%' }} />
      </div>
    );
  }
  return <AbsoluteFill style={{ overflow: 'hidden' }}>{fl}</AbsoluteFill>;
};

// CHUVA: riscos diagonais caindo + leve véu. Fica na frente de tudo (é atmosfera entre a câmera
// e a cena), então não entra no mundo nem sofre o parallax.
const Chuva = ({ w = 1080, h = 1920, n = 90, vel = 46, incl = 12 }) => {
  const frame = useCurrentFrame();
  const pingos = [];
  for (let i = 0; i < n; i++) {
    const seed = i * 41.3;
    const bx = (Math.sin(seed) * 0.5 + 0.5) * (w + 200) - 100;
    const comp = 26 + (i % 4) * 14;
    const v = vel * (0.8 + (i % 5) * 0.1);
    const y = ((frame * v + i * 97) % (h + comp * 2)) - comp;
    pingos.push(<div key={i} style={{ position: 'absolute', left: bx + (y / h) * incl * 4, top: y, width: 2.5, height: comp, background: 'rgba(214,232,246,0.5)', transform: `rotate(${incl}deg)`, borderRadius: 2 }} />);
  }
  return <AbsoluteFill style={{ overflow: 'hidden' }}><AbsoluteFill style={{ background: 'rgba(90,110,140,0.13)' }} />{pingos}</AbsoluteFill>;
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
// A BOLA, DESENHADA POR CÓDIGO. O markup mora em shared/bola-svg.mjs, num lugar só, porque a mesma
// bola aparece no vídeo e no preview da tela de Objetos — e um desenho copiado é um desenho que
// diverge. Preview que mostra bola diferente da que o vídeo desenha é pior que preview nenhum.
//
// DUAS CAMADAS: o corpo GIRA com a rolagem (é a superfície) e a luz NÃO (vem do mundo). Juntar as
// duas faria a mancha de luz girar junto, e a bola cintilaria em vez de rolar.
const BallSVG = ({ r }) => <div style={{ width: r * 2, height: r * 2 }} dangerouslySetInnerHTML={{ __html: bolaCorpo({ r }) }} />;
const BallShade = ({ r }) => <div style={{ width: r * 2, height: r * 2 }} dangerouslySetInnerHTML={{ __html: bolaLuz({ r }) }} />;

// PROP BOLA: objeto animado independente dos personagens. `x`/`y` são trilhas [[frame,px],...]
// (x = centro horizontal; y = ALTURA acima do chão, 0 = rolando, positivo = no ar). Desenha uma
// SOMBRA no chão que encolhe/clareia conforme a bola sobe (vende o "está no ar"), e um GIRO
// proporcional à distância horizontal rolada (rola sem escorregar). As trajetórias (passe/arco/
// quique) são só formatos de trilha, geradas no composer — o motor só interpola.
// Profundidade da bola NESTE frame: 'back' = atrás dos personagens, 'front' = na frente.
// Critério = a própria escala da bola (perspectiva). Encolheu além do limiar, está lá no fundo,
// logo tem que ser ocluída por quem está na frente. `zLimite` sobrescreve por bola.
const ballDepth = (b, frame) => {
  if (!b.s) return 'front';
  return interpTrack(b.s, frame) < (b.zLimite ?? 0.85) ? 'back' : 'front';
};

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
      {/* a bola GIRA (é a superfície rolando) */}
      <div style={{ position: 'absolute', left: x, top: cy, width: r * 2, height: r * 2, transform: `translate(-50%, -50%) rotate(${spinDeg}deg)` }}>
        <BallSVG r={r} />
      </div>
      {/* a luz NÃO gira: vem do mundo, e girando junto faria a bola cintilar em vez de rolar */}
      <div style={{ position: 'absolute', left: x, top: cy, width: r * 2, height: r * 2, transform: 'translate(-50%, -50%)' }}>
        <BallShade r={r} />
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

const Shot = ({ shot, t0 = 0, total = 0 }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // CÂMERA CONTÍNUA (scene.continuo): o push lento e a deriva usavam o frame LOCAL do shot, então
  // no corte a escala despencava de 1.045 pra 1.0 e a deriva voltava ao zero — dava um PISCO como
  // se o cenário tivesse trocado, mesmo em cena contínua no mesmo lugar. Com o frame ABSOLUTO
  // (t0 + frame) a câmera atravessa o corte sem saltar. Sem a flag, comportamento antigo intacto.
  const cont = !!scene.continuo;
  const fCam = cont ? t0 + frame : frame;
  const push = cont ? interpolate(fCam, [0, total || shot.dur], [1.0, 1.045])
                    : interpolate(frame, [0, shot.dur], [1.0, 1.045]);
  let camScale = push;
  if (shot.camera === 'punch') {
    const s = spring({ frame, fps, config: { damping: 9, stiffness: 120 } });
    camScale = interpolate(s, [0, 1], [1.12, 1.0]);
  }
  // camera viva: deriva lenta continua (nunca 100% parada)
  const driftX = Math.sin(fCam / 46) * 7;
  const driftY = Math.cos(fCam / 58) * 5;
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
  // TREMOR DE IMPACTO (shot.impactos = [[frame, força],...]): cada aterrissagem sacode a câmera por
  // ~6 frames e decai. É o que dá PESO ao salto; entra no mesmo `amp` do shake pra não somar dois
  // tremores independentes na mesma janela.
  for (const [fi, forca] of (shot.impactos || [])) {
    if (frame >= fi && frame < fi + 7) amp = Math.max(amp, forca * (1 - (frame - fi) / 7));
  }
  const jx = amp ? Math.sin(frame * 8.3) * amp : 0;
  const jy = amp ? Math.cos(frame * 7.1) * amp : 0;
  // parallax FALSO (sem mundo): o fundo inteiro deriva em sentido oposto à câmera. É só uma
  // insinuação de profundidade num plano único. No modo MUNDO quem faz isso é o parallax REAL das
  // camadas (cada uma com seu fator z), então este é desligado pra não somar dois deslocamentos.
  const bgPar = shot.mundo ? 0 : Math.sin(fCam / 46) * -13;   // fCam: contínuo entre shots, senão o fundo saltava no corte
  // punch-in nos vereditos: zoom rápido em direção ao Flick e volta
  // ENQUADRAMENTO BASE (shot.zoomBase/zoomOrigem): a escala fora de qualquer janela de zoom era
  // sempre 1, então um shot que vive fechado (ex.: 1.15 pra tirar céu vazio do 9:16) tinha que
  // fingir isso com um zoom de hold infinito — e aí um SEGUNDO zoom, ao começar, despencava de
  // volta pra 1 e piscava. Agora a base é do shot e o zoom parte dela (`de` sobrescreve).
  let zoomScale = shot.zoomBase ?? 1, zoomOrigin = shot.zoomOrigem ?? '50% 50%';
  for (const z of (shot.zooms || [])) {
    const to = z.to ?? 1.07;
    const from = z.de ?? shot.zoomBase ?? 1;
    const at = z.at, ramp = z.ramp ?? 5, hold = z.hold ?? 0;
    const out = z.out ?? (z.dur != null ? Math.max(1, z.dur - ramp - hold) : 15);
    const peak = at + ramp, holdEnd = peak + hold, end = holdEnd + out;
    if (frame >= at && frame < end) {
      zoomScale = frame <= peak ? interpolate(frame, [at, peak], [from, to])
        : frame <= holdEnd ? to
        : interpolate(frame, [holdEnd, end], [to, from], { extrapolateRight: 'clamp' });
      zoomOrigin = z.origin ?? shot.zoomOrigem ?? '50% 50%';
    }
  }

  // ==========================================================================
  // MUNDO + CÂMERA (shot.mundo / shot.cam)
  // --------------------------------------------------------------------------
  // Sem `mundo`, o cenário é do TAMANHO EXATO do quadro (cover) e a câmera só sabe dar zoom e
  // derivar em volta do centro: cada novo enquadramento exigia CORTAR pra outro shot, e cada
  // locação exigia gerar outro cenário (que sai com estilo levemente diferente do anterior).
  //
  // Com `mundo`, o cenário é PANORÂMICO (mais largo que o quadro) e existe um espaço de MUNDO em
  // pixels. `cam.x/y` = para onde a câmera aponta (centro do quadro no mundo), `cam.z` = quão
  // fechado é o plano. Trocar de "cena" passa a ser MOVER a câmera no mesmo cenário: não há corte,
  // logo não há como piscar, e um render de cenário serve 3 ou 4 enquadramentos.
  //
  // As trilhas de cam vêm em frame ABSOLUTO da cena (não local do shot), justamente pra o
  // movimento atravessar a fronteira entre shots sem saltar — é o mesmo motivo do fCam.
  // Personagens e bola passam a viver em coordenada de MUNDO; nada muda no código deles porque o
  // container inteiro é que se desloca.
  const mundo = shot.mundo || null;
  const fAbs = t0 + frame;
  const camX = mundo ? (shot.cam?.x ? interpTrack(shot.cam.x, fAbs) : mundo.w / 2) : 0;
  const camY = mundo ? (shot.cam?.y ? interpTrack(shot.cam.y, fAbs) : height / 2) : 0;
  const camZ = mundo && shot.cam?.z ? interpTrack(shot.cam.z, fAbs) : 1;
  const worldTx = mundo ? width / 2 - camX : 0;
  const worldTy = mundo ? height / 2 - camY : 0;
  // scale ANTES do translate: com zoom 2x, andar 100px de mundo tem que andar 200px de tela.
  const worldStyle = mundo
    ? { transformOrigin: '50% 50%', transform: `scale(${camZ}) translate(${worldTx}px, ${worldTy}px)` }
    : null;
  // escala acumulada de tudo que envolve a cena: o que NÃO deve crescer com o zoom (fala) se
  // contra-escala por isto.
  const escalaTotal = camScale * zoomScale * camZ;
  const amb = shot.ambiente || {};
  // Camadas do cenário. REGRA: a camada que contém o CHÃO é sempre z=1 — é o plano em que os
  // personagens pisam, e um chão com z≠1 faz o personagem escorregar em relação ao cenário no pan.
  // z<1 = fundo distante (céu, arquibancada longe), z>1 = primeiro plano.
  const camadas = mundo ? (shot.bg.camadas || [{ src: shot.bg.src, z: 1 }]) : null;
  // PROFUNDIDADE DE CAMPO NO PLANO FECHADO. Num close o personagem ocupa meia tela e o cenário
  // atrás continua nítido e do mesmo tamanho de sempre: o olho lê como recorte colado num fundo
  // errado, e foi exatamente a queixa. As referências do gênero resolvem assim — o Sahari desfoca o
  // corredor atrás do close, o Momani troca o fundo por gráfico. Aqui o desfoque sai por CÓDIGO, do
  // plano declarado, sem gerar nada.
  const camadaImg = (c, i) => (
    <Img key={'bgl' + i} src={staticFile(c.src)}
      style={{ position: 'absolute', left: 0, top: 0, width: mundo.w, height: mundo.h, objectFit: 'cover',
               filter: shot.desfoqueFundo ? `blur(${shot.desfoqueFundo}px)` : undefined,
               transform: `translateX(${((c.z ?? 1) - 1) * worldTx}px)` }} />
  );
  // z>1 é PRIMEIRO PLANO: tem que ser desenhado DEPOIS dos personagens, senão a grade/o poste que
  // deveria passar na frente deles fica atrás e o parallax não lê como profundidade, lê como erro.
  const bgMundo = mundo ? <AbsoluteFill>{camadas.filter((c) => (c.z ?? 1) <= 1).map(camadaImg)}</AbsoluteFill> : null;
  const frenteMundo = mundo && camadas.some((c) => (c.z ?? 1) > 1)
    ? <AbsoluteFill>{camadas.filter((c) => (c.z ?? 1) > 1).map(camadaImg)}</AbsoluteFill> : null;

  const cena = (
    <>
      {mundo ? bgMundo : (
        <AbsoluteFill style={{ transform: `translateX(${bgPar}px) scale(1.09)` }}>
          {shot.bg.type === 'rays' ? <Rays variant={shot.bg.variant} />
            : shot.bg.type === 'grafico' ? <FundoGrafico cfg={shot.bg.fundo} />
            : shot.bg.type === 'blur' ? <BgBlur src={shot.bg.src} />
            : shot.bg.type === 'video' ? <OffthreadVideo src={staticFile(shot.bg.src)} muted loop style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <Img src={staticFile(shot.bg.src)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
        </AbsoluteFill>
      )}
      {/* ambiente ATRÁS dos personagens (torcida, bandeiras): vive no mundo, então acompanha o pan */}
      {amb.torcida ? <Torcida w={mundo ? mundo.w : width} {...(typeof amb.torcida === 'object' ? amb.torcida : {})} /> : null}
      {amb.bandeiras ? <Bandeiras w={mundo ? mundo.w : width} {...(typeof amb.bandeiras === 'object' ? amb.bandeiras : {})} /> : null}
      {shot.dust !== false ? <Dust w={mundo ? mundo.w : width} h={mundo ? mundo.h : undefined} /> : null}
      {shot.confetti ? <Confetti w={mundo ? mundo.w : width} h={mundo ? mundo.h : undefined} /> : null}
        {/* BOLA ATRÁS: a bola era sempre desenhada DEPOIS dos personagens, então um passe pra
            quem está lá no FUNDO passava por CIMA de quem está na frente. Quando ela encolhe
            (escala = perspectiva, está longe), ela vai pra ESTA camada, antes dos personagens.
            Bola sem trilha de escala (a maioria) segue na frente, como sempre. */}
        {(shot.balls || []).map((b, i) => (ballDepth(b, frame) === 'back' ? <Ball key={'bb' + i} b={b} /> : null))}
        {/* SOMBRAS numa passada ANTES dos personagens: desenhadas junto de cada um, a sombra de quem
            vem depois cairia POR CIMA de quem está na frente. Aqui todas ficam sob todo mundo. */}
        {(shot.chars || []).map((c, i) => <SombraContato key={'sh' + i} c={c} frame={frame} />)}
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
          // `flips` = trilha [[frame, bool]] pra direção MUDAR no meio do shot (entra por um lado,
          // sai pelo outro). Sem ela, `flip` continua valendo pro shot inteiro, como sempre.
          let flipNow = !!c.flip;
          if (c.flips) for (const [f0, v] of c.flips) if (frame >= f0) flipNow = v;
          // PERSPECTIVA: ancorada no PÉ (transformOrigin 50% 96%), porque quem se afasta encolhe
          // em direção ao chão — encolher pelo centro faria o personagem flutuar enquanto corre.
          const persp = c.escala ? interpTrack(c.escala, frame) : 1;
          const style = { position: 'absolute', left: c.cx, top: c.cy, width: c.w, transformOrigin: '50% 96%', transform: `translate(-50%, -50%) translateX(${tx}px) translateY(${idle + ty + bobY}px) scale(${persp}) scaleX(${flipNow ? -1 : 1})` };
          // PICTOGRAMA PRESO AO PERSONAGEM: usa o MESMO deslocamento (tx/ty/bob) e o mesmo ponto de
          // ancoragem, então acompanha quem corre em vez de ficar boiando onde a cena começou. Fora
          // do scaleX de propósito: o glifo não espelha junto com a arte.
          const emotesDoChar = (c.emotes || []).map((e, k) => (
            <Emote key={'ce' + i + '_' + k} e={{ ...e, x: c.cx + tx + (e.dx || 0), y: c.cy + idle + ty + bobY + (e.dy || 0) }} />
          ));
          // poses: keyframes cronometrados (pose a pose). mostra a pose com maior `in` <= frame
          if (c.poses) {
            let cur = c.poses[0], curIn = c.poses[0].in ?? 0;
            for (const p of c.poses) { const pin = p.in ?? 0; if (frame >= pin && pin >= curIn) { cur = p; curIn = pin; } }
            const since = frame - curIn;
            // pose com `cycle` = ciclo de quadros (caminhada, respiração, gesto animado).
            // `holds` = FOLHA DE EXPOSIÇÃO: quantos frames de tela cada desenho segura (exposição
            // VARIÁVEL — antecipação segura, ápice flutua). O composer monta o deslocamento vertical
            // a partir da MESMA tabela, então arte e código andam nos mesmos frames.
            // O índice conta de `in` (início do beat), não do frame absoluto do shot: com o frame
            // absoluto o desenho em que o gesto COMEÇAVA dependia da hora em que o beat caía no
            // shot, e a sincronia com o pulo por código só acontecia por coincidência aritmética.
            let src = cur.src;
            if (cur.cycle) {
              const rel = Math.max(0, frame - curIn);
              // GESTO DE UMA VEZ (`loop:false`): o ciclo roda UMA passada e para. Sem isso, um
              // empurrão reinicia sozinho e um susto pisca em loop — que é como um defeito, não
              // como uma cena. `fim` decide o que fica: 'segura' congela no último desenho (a pose
              // de consequência), 'volta' devolve ao primeiro (o repouso).
              if (cur.loop === false && cur.holds) {
                const total = cur.holds.reduce((a, b) => a + Math.max(1, Math.round(b)), 0);
                src = rel >= total
                  ? (cur.fim === 'volta' ? cur.cycle[0] : cur.cycle[cur.cycle.length - 1])
                  : cur.cycle[quadroEm(rel, cur.holds)];
              } else if (cur.holds) src = cur.cycle[quadroEm(rel, cur.holds)];
              else src = cur.cycle[Math.floor((rel * (cur.hz ?? 6)) / fps) % cur.cycle.length];
            }
            // squash-and-settle leve na troca de pose parada (nao aplica em caminhada)
            let set = cur.cycle ? 1 : interpolate(since, [0, 5, 12], [0.975, 1.015, 1], { extrapolateRight: 'clamp' });
            // SQUASH DE ATERRISSAGEM: no frame em que o pé bate, o corpo achata e volta em ~7 frames.
            // O desenho de aterrissagem já tem o joelho dobrado; o squash é o que transforma isso em
            // IMPACTO em vez de uma pose a mais. Ancorado nos pés (transformOrigin 50% 96%).
            const bateu = (c.impactos || []).filter((f) => frame >= f && frame < f + 7).pop();
            if (bateu != null) set = Math.min(set, 1 - 0.11 * (1 - (frame - bateu) / 7));
            // `aperto` desfaz o encolhimento que a folha sofreu pra caber na largura do canvas
            // (ver slice-acao). Ancorado nos PÉS, igual ao squash: crescer a partir do centro
            // levantaria o personagem do chão.
            const ap = cur.aperto || 1;
            const poseStyle = { ...style, transformOrigin: '50% 96%', transform: style.transform + ` scale(${(2 - set) * ap}, ${set * ap})` };
            // PEÇA ARTICULADA (experimental): pose separada no MESMO canvas do personagem, girando
            // sobre a base com easing. O wrapper repete o poseStyle (posição/escala/flip), então a
            // peça acompanha deslocamento, bob e espelhamento; só a rotação é dela, com origem no
            // pivô declarado em fração do canvas. É rotação interpolada, não troca de desenho — o
            // movimento sai contínuo mesmo com UMA imagem.
            const pecasDoChar = (c.pecas || []).map((pz, k) => {
              const fs = (pz.rot || []).map((r) => r[0]), angs = (pz.rot || []).map((r) => r[1]);
              const ang = fs.length > 1
                ? interpolate(frame, fs, angs, { easing: Easing.inOut(Easing.ease), extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
                : (angs[0] || 0);
              const [px, py] = pz.pivo || [0.5, 0.5];
              return (
                <div key={'pz' + i + '_' + k} style={poseStyle}>
                  <Img src={staticFile(pz.src)} style={{ width: '100%', transformOrigin: `${px * 100}% ${py * 100}%`, transform: `rotate(${ang}deg)` }} />
                </div>
              );
            });
            return <Fragment key={i}><PoeiraImpacto c={c} frame={frame} /><Sprite c={c} src={src} style={poseStyle} frame={frame} fps={fps} />{pecasDoChar}{emotesDoChar}</Fragment>;
          }
          // swap: alterna quadros PNG da MESMA base (limited animation "on twos")
          if (c.frames) {
            const hz = c.swapHz ?? 5;
            const idx = Math.floor((frame * hz) / fps) % c.frames.length;
            return <Fragment key={i}><Img src={staticFile(c.frames[idx])} style={style} />{emotesDoChar}</Fragment>;
          }
          // clip Grok (webm transparente)
          if (c.src && c.src.endsWith('.webm')) {
            return <OffthreadVideo key={i} src={staticFile(c.src)} transparent muted loop style={style} />;
          }
          // static / idle: PNG transparente
          return <Fragment key={i}><Sprite c={c} src={c.src} style={style} frame={frame} fps={fps} />{emotesDoChar}</Fragment>;
        })}
        {(shot.balls || []).map((b, i) => (ballDepth(b, frame) === 'back' ? null : <Ball key={'ball' + i} b={b} />))}
      {(shot.emotes || []).map((e, i) => <Emote key={'em' + i} e={e} />)}
      {/* PRIMEIRO PLANO (camadas z>1): depois dos personagens, pra passar na FRENTE deles */}
      {frenteMundo}
      {/* FALA NO MUNDO: no pan, uma fala presa à TELA fica parada enquanto o personagem se move.
          Marcada com `mundo`, ela mora aqui dentro (herda o deslocamento e acompanha o falante) e
          se contra-escala pra o texto não crescer com o zoom. */}
      {mundo ? (shot.balloons || []).filter((b) => b.mundo).map((b, i) => <Balloon key={'bw' + i} b={b} inv={1 / escalaTotal} />) : null}
    </>
  );

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transformOrigin: zoomOrigin, transform: `translate(${driftX + jx}px, ${driftY + jy}px) scale(${camScale * zoomScale})` }}>
        {mundo ? <AbsoluteFill style={worldStyle}>{cena}</AbsoluteFill> : cena}
        {/* chuva é atmosfera ENTRE a câmera e a cena: fica fora do mundo (não sofre parallax) */}
        {amb.chuva ? <Chuva w={width} h={height} {...(typeof amb.chuva === 'object' ? amb.chuva : {})} /> : null}
      </AbsoluteFill>
      {/* GRADE DE COR (shot.grade = { cor, op, vinheta, mistura }): véu de cor + vinheta por CÓDIGO.
          Dois shots no mesmo cenário panorâmico liam como o mesmo plano repetido; com grade, um vira
          fim de tarde e o outro vira noite sem gerar cenário nenhum. Fica FORA do mundo (a atmosfera
          está entre a câmera e a cena) e ANTES das falas — texto não deve ser tingido. */}
      {shot.grade ? (
        <AbsoluteFill style={{ pointerEvents: 'none' }}>
          {shot.grade.cor ? <AbsoluteFill style={{ background: shot.grade.cor, opacity: shot.grade.op ?? 0.22, mixBlendMode: shot.grade.mistura ?? 'multiply' }} /> : null}
          {shot.grade.vinheta ? <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 42%, rgba(0,0,0,${shot.grade.vinheta}) 100%)` }} /> : null}
        </AbsoluteFill>
      ) : null}
      {shot.caption ? <Caption text={shot.caption} /> : null}
      {(shot.cards || (shot.card ? [shot.card] : [])).map((c, i) => <Card key={i} c={c} />)}
      {(shot.stamps || []).map((st, i) => <Stamp key={i} s={st} />)}
      {(shot.notes || []).map((n, i) => <Note key={i} n={n} />)}
      {shot.board ? <Board cfg={typeof shot.board === 'object' ? shot.board : {}} /> : null}
      {shot.clock ? <Clock cfg={typeof shot.clock === 'object' ? shot.clock : {}} /> : null}
      {(shot.cages || []).map((c, i) => <Cage key={i} c={c} />)}
      {shot.split ? <SplitOverlay cfg={shot.split} /> : null}
      {/* falas presas à TELA. As marcadas com `mundo` já foram desenhadas dentro do mundo. */}
      {(shot.balloons || []).filter((b) => !(mundo && b.mundo)).map((b, i) => <Balloon key={i} b={b} />)}
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
      {/* PISCADA: por último de propósito, tem que cobrir inclusive o endCard e a íris */}
      {shot.piscada ? <Piscada cfg={typeof shot.piscada === 'object' ? shot.piscada : {}} /> : null}
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
  // frame ABSOLUTO em que cada shot começa, pra câmera atravessar o corte sem saltar (ver Shot)
  const totalCena = sceneDuration();
  let t0 = 0;
  scene.shots.forEach((shot, i) => {
    if (i > 0 && shot.transition && shot.transition !== 'none') {
      items.push(<TransitionSeries.Transition key={'t' + i} presentation={presFor(shot.transition)} timing={linearTiming({ durationInFrames: shot.tdur ?? 10 })} />);
    }
    items.push(<TransitionSeries.Sequence key={'s' + i} durationInFrames={shot.dur}><Shot shot={shot} t0={t0} total={totalCena} /></TransitionSeries.Sequence>);
    t0 += shot.dur - (i > 0 && shot.transition && shot.transition !== 'none' ? (shot.tdur ?? 10) : 0);
  });
  return (
    <AbsoluteFill>
      <TransitionSeries>{items}</TransitionSeries>
      {scene.moldura ? <ComicFrame /> : null}
    </AbsoluteFill>
  );
};

export const sceneDuration = () => scene.shots.reduce((a, s, i) => a + s.dur - (i > 0 && s.transition && s.transition !== 'none' ? (s.tdur ?? 10) : 0), 0);
