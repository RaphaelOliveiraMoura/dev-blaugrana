// Monta a cena do Remotion (scene.json) e as pistas de áudio a partir do JSON de um
// vídeo (data/videos/<id>.json). É a versão data-driven do antigo build-cena.mjs:
// o roteiro, o elenco e o cenário vêm do dado, não são mais hardcoded.
//
// Estrutura de esteira: Laporta é âncora no centro, os jogadores entram/saem andando,
// o Flick julga. Pivô no meio (Laporta sai e volta com o 1º atacante). Fecho no close.

import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { CONTEUDO_DIR } from '../config.mjs'
import { dirRig, rigQuadro, PREFIXO_RIG } from '../../shared/personagem.mjs'
import { quadroEm, totalExposicao, temposUniformes, janelaNoAr, alturaNoAr, framesDoQuadro } from '../../shared/exposicao.mjs'
import { nomeMotor, vistaDoPlano, VISTA_PADRAO } from '../../shared/set.mjs'
import { EFEITOS, EFEITOS_IDS } from '../../shared/efeitos.mjs'

// PADRÃO DA CASA = 3:4, o MESMO dos quadrinhos: material do SagaFut sai todo na mesma proporção.
// Exportado porque o tooling (build-video) precisa do tamanho do mundo panorâmico em px.
export const DIMS = { '4:5': [1080, 1350], '3:4': [1080, 1440], '9:16': [1080, 1920], '1:1': [1080, 1080] };
export const FORMATO_PADRAO = '3:4';

// IDLE (personagens/<slug>/rigs/idle -> "<slug>-i1..4.png" no motor): respiração do personagem PARADO.
// Ligado por PRESENÇA DA SPRITE, não por flag no roteiro: gerou a folha do personagem, todo vídeo
// dele ganha vida sem editar roteiro nenhum; não gerou, tudo segue como era. Se fosse default no
// dado, cada vídeo antigo passaria a pedir uma sprite que não existe e quebraria no render.
//
// A PRESENÇA É CONFERIDA NO ACERVO DO PERSONAGEM. Antes olhava `videos/<id>/kf/<slug>-i1.png`, que
// era onde o build copiava tudo — só que o kf/ foi eliminado quando o acervo por personagem virou a
// fonte única, e o render passou a montar a pasta plana direto em remotion/public. Resultado: este
// teste passou a dar SEMPRE falso e a respiração ficou DESLIGADA em todos os vídeos, sem erro
// nenhum: os beats `parado: true` viravam no-op silencioso. Agora a pergunta é feita onde a folha
// realmente mora, com o kf/ mantido só como resto de vídeo antigo.
const _idleCache = new Map();
function temIdle(videoId, slug) {
  const k = `${videoId}/${slug}`;
  if (!_idleCache.has(k)) _idleCache.set(k, existsSync(path.join(CONTEUDO_DIR, rigQuadro(slug, 'idle', 1)))
    || existsSync(path.join(CONTEUDO_DIR, `videos/${videoId}/kf/${slug}-i1.png`)));
  return _idleCache.get(k);
}
const cicloIdle = (slug) => [1, 2, 3, 4].map((n) => `${slug}-i${n}.png`);
const IDLE_HZ = 2.6;   // respiração: ~1,5s por ciclo de 4 quadros

// TAMANHOS DE PLANO (sh.camera.plano). Existir com NOME é o ponto: enquadramento uniforme em todo
// shot é o que mais faz a animação parecer amadora, e ninguém alterna planos se para isso tiver que
// escolher um número de escala a cada cena.
const PLANOS = { geral: 1, medio: 1.34, close: 1.85, detalhe: 2.4 };

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

// ============================================================================
// VELOCIDADE DE DESLOCAMENTO — o ritmo das pernas sai da DISTÂNCIA, não de um número mágico.
// ----------------------------------------------------------------------------
// O ciclo de passada rodava sempre a `hz: 8`, um valor fixo que não sabia nada sobre quanto o
// personagem estava andando. As duas consequências apareceram juntas no piloto:
//   1. PATINAÇÃO: a perna dá N passos enquanto o corpo percorre uma distância que não corresponde a
//      N passos, e o pé desliza no chão (o pecado clássico de animação 2D).
//   2. VELOCIDADE ABSURDA: `entraDur` era escolhido a olho. 940px em 30 frames = 940px/s, que na
//      escala do personagem (400px de largura ≈ 1,75m) é 3,2 m/s — um adversário "andando" mais
//      rápido do que gente corre.
// Agora: o personagem avança PASSO px por ciclo completo (fração da largura dele, então escala com o
// tamanho na tela), e daí sai o `hz`. E quando o roteiro não diz a duração, ela vem de uma
// velocidade humana declarada em vez de um default de 24 frames.
const PASSO = { w: 0.70, r: 1.30 };   // px avançados por ciclo de 4 desenhos, em fração da largura
const VEL = { w: 1.20, r: 2.60 };     // px por SEGUNDO, em fração da largura (andar ~1,5 m/s)

// posições/tempos (poderiam virar campo do vídeo depois; default cobre o "defesa-barca")
const PLAYER_CX = 235, LAP_CX = 545, FLICK_CX = 875, CY = 665, PW = 520, LW = 470, FW = 470;
const HIDE = -620, LAP_HIDE = -840;

// dispatcher por template: cada formato de vídeo tem seu composer
export function montarCena(video) {
  // TEMPLATE ÚNICO: `roteiro` (data-driven). Os composers dedicados (esteira, gags-sequencia,
  // dupla-briga, alternado) foram removidos em 31/07/2026 junto com os vídeos que os usavam:
  // eram ~500 linhas de coreografia fixa que ninguém mais chamava.
  if (video.template === 'roteiro') return montarRoteiro(video);
  return montarRoteiro(video);
}



// ============================================================================
// Composer "roteiro" — GENÉRICO, dirigido por DADOS. Um conceito novo vira `video.roteiro`
// (uma lista de SHOTS/beats), sem código específico do arco. Cada shot tem cenário, personagens
// (cada um com entrada opcional, sequência de poses cronometradas por `hold`, saída opcional),
// balões, zoom, jaula. Convenção de sprite: pose -> `<slug>-<pose>.png`; andar -> `<slug>-w1..4`,
// correr -> `<slug>-r1..4` (uma folha por rig; esquerda é flip). check-video deriva a lista DAQUI,
// então ela é sempre honesta. Coreografia muito específica pode continuar num composer dedicado.
// ----------------------------------------------------------------------------
// Schema do JSON (todos os campos opcionais salvo `slug`):
//   video.roteiro = [ SHOT, ... ]
//   SHOT = { cenario?, blur?, dur?, transicao?, tdur?, cages?, zoom?, zooms?, baloes?[],
//            fundo?({tipo:'chapado'|'gradiente'|'radial'|'listras'|'faixas', cor, cor2, ...}),
//            piscada?(true|{cor:'preto'|'branco', frames}), personagens: [ PERS, ... ] }
//   `fundo` DISPENSA o cenário desenhado (e tira o shot do modo mundo): é o beat de fundo gráfico,
//   que nas referências do gênero muda a cada batida e custa zero geração.
//   PERS = { slug, spot?(cx px OU nome de âncora), piso?(chão y OU nome de âncora; MENOR = mais alto),
//            w?, atraso?(frames até aparecer), bob?({amp,hz,phase} respiro/balanço em loop),
//            olhar?('esquerda'|'direita' — SÓ pra personagem PARADO; quem se move olha pro movimento
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


// META DE UM GESTO: o _meta.json que o slice-acao grava ao lado da folha. Traz a altura MEDIDA de
// cada desenho (px no canvas do sprite) e a FOLHA DE EXPOSIÇÃO do gesto (quantos frames cada desenho
// segura, e em quais deles o pé está no chão). Sem meta (folha antiga), devolve null e o composer
// cai no comportamento anterior.
const _metaCache = new Map()
function metaDoGesto(slug, gesto) {
  const chave = slug + ':' + gesto
  if (_metaCache.has(chave)) return _metaCache.get(chave)
  let m = null
  try {
    const f = path.join(CONTEUDO_DIR, 'personagens', slug, 'acoes', gesto, '_meta.json')
    if (existsSync(f)) m = JSON.parse(readFileSync(f, 'utf8'))
  } catch { m = null }
  _metaCache.set(chave, m)
  return m
}
function montarRoteiro(video) {
  const fps = video.fps || 30;
  const [W, H] = DIMS[video.formato] || DIMS[FORMATO_PADRAO];
  const place = (cx, floorY, w) => ({ cx, cy: Math.round(floorY - 0.625 * w), w });
  const PISO = Math.round(H * 0.9);
  // FOLHA DE PASSADA: UMA SÓ, sempre olhando pra direita. Ir pra esquerda é o motor espelhando
  // (scaleX -1), e ponto. Existiu aqui uma variante `rigs/andar-esq` gerada à parte, pra não
  // inverter o número da camisa de quem tem número; em 02/08/2026 ficou decidido que número
  // invertido não é problema, e a escolha entre folhas saiu junto. Espelhar vira cabeça e pernas
  // JUNTAS, que é justamente o que a folha própria errava de vez em quando.
  const cyc = (slug, kind) => [1, 2, 3, 4].map((n) => `${slug}-${kind}${n}.png`);
  const rigTipo = (kind) => (kind === 'r' ? 'correr' : 'andar');
  // quantos frames pra cobrir `dist` px andando/correndo numa velocidade humana
  const durDaDistancia = (kind, w, dist) => Math.max(6, Math.round(Math.abs(dist) / ((VEL[kind] || VEL.w) * w / fps)));
  // e o hz do ciclo que faz o pé NÃO patinar nessa velocidade: um ciclo completo por PASSO px
  // PISO E TETO DO CICLO. Sincronizar a passada com o deslocamento evita patinação, mas sozinho ele
  // produz absurdos nas pontas: um personagem que anda 120px em 3 segundos (o treino "devagar" do
  // Real) ganhava um ciclo de ~0,3Hz, ou seja, o mesmo desenho por mais de um segundo — na tela isso
  // não lê como lentidão, lê como TRAVAMENTO. E no outro extremo a perna vira hélice. Andar devagar
  // é dar passo curto, não é congelar entre desenhos.
  const HZ_MIN = 1.6, HZ_MAX = 9;
  const hzDaPassada = (kind, w, dist, dur) => {
    const passo = (PASSO[kind] || PASSO.w) * w;
    const vel = Math.abs(dist) / Math.max(1, dur);              // px por frame
    const cicloFrames = Math.max(4, passo / Math.max(0.05, vel));
    const hz = (4 * fps) / cicloFrames;
    return +Math.min(HZ_MAX, Math.max(HZ_MIN, hz)).toFixed(2);
  };
  const roteiro = video.roteiro || [];
  const anchors = loadAnchors(video.id);
  const shots = [];

  // ==========================================================================
  // MUNDO PANORÂMICO (video.mundo) — um cenário LARGO em que a câmera navega.
  // --------------------------------------------------------------------------
  //   video.mundo = { cenario:'<nome>', telas?:2, frente?:{nome,z}, fundo?:{nome,z} }
  // `telas` = largura do mundo em múltiplos da tela (2 telas num 3:4 = 2160x1440 = cenário 3:2,
  // o mais largo que o gerador entrega). Trocar de cena passa a ser MOVER a câmera: sem corte, sem
  // pisco, e um render de cenário serve 3 ou 4 enquadramentos em vez de um.
  // REGRA das camadas: a que tem o CHÃO é sempre z=1 (é o plano onde o personagem pisa; z≠1 ali faz
  // ele escorregar em relação ao cenário durante o pan). z<1 = fundo distante, z>1 = primeiro plano.
  const mw = video.mundo || null;
  const mundo = mw ? { w: Math.round(W * (mw.telas || 2)), h: H } : null;
  // O CENÁRIO ESTÁ NO ACERVO? `video.set` nomeia a FICHA do lugar em cenarios/<slug>/. Sem ele,
  // o vídeo é dos antigos e segue lendo o PNG da própria pasta — legado que renderiza não é dívida.
  const setSlug = video.set || mw?.set || null;
  let camadas = null;
  if (mundo) {
    camadas = [];
    if (mw.fundo) camadas.push({ src: `cenario-${mw.fundo.nome}.png`, z: mw.fundo.z ?? 0.55 });
    // A CAMADA DO CHÃO É A VISTA DO SET. Antes era um nome solto resolvido num PNG da pasta do
    // vídeo; agora aponta pra ficha do lugar no acervo, e a VISTA muda por shot conforme o plano da
    // câmera. `setSlug` diz se este vídeo já usa a ficha (os antigos seguem no caminho de sempre).
    camadas.push({ src: setSlug ? nomeMotor(setSlug, VISTA_PADRAO) : `cenario-${mw.cenario || 'panorama'}.png`, z: 1 });
    // PROPS: elementos plantados NO CHÃO em pontos específicos do mundo (um portão na fronteira, um
    // poste, um banco). Ficam no MESMO plano do chão (z=1) e são desenhados depois do cenário e
    // ANTES dos personagens, então o personagem passa na frente deles — que é como se atravessa um
    // portão. Diferente de `frente` (z>1), que passa por cima de todo mundo.
    for (const pr of (mw.props || [])) camadas.push({ src: `cenario-${pr.nome}.png`, z: pr.z ?? 1 });
    if (mw.frente) camadas.push({ src: `cenario-${mw.frente.nome}.png`, z: mw.frente.z ?? 1.18 });
  }
  // enquadramento corrente da câmera (percorre os shots): começa no centro do mundo, plano geral
  let camAtual = mundo ? { x: Math.round(mundo.w / 2), y: Math.round(H / 2), z: 1 } : null;
  // frame ABSOLUTO em que cada shot começa. Mesma fórmula do motor (Cena.jsx), pra as trilhas de
  // câmera caírem no frame certo — é o que permite o pan atravessar a fronteira entre shots.
  let absStart = 0;

  roteiro.forEach((sh, si) => {
    const cen = sh.cenario || 'base';
    // FUNDO GRÁFICO (`sh.fundo`): a cena não usa cenário desenhado, usa cor/gradiente/radial/faixas
    // por código. Um shot assim sai do modo MUNDO de propósito: ele não tem panorama pra a câmera
    // navegar, e `spot` volta a ser coordenada de TELA — é o beat de impacto que corta o pan.
    const grafico = sh.fundo ? { type: 'grafico', fundo: sh.fundo } : null;
    // VISTA DO SET PELO PLANO DA CÂMERA. `geral` usa o panorama (o mundo que a câmera navega);
    // `medio` usa o ângulo e `close`/`detalhe` usam o perto — e essas duas SAEM DO MUNDO, porque
    // não são um pedaço do panorama, são outro enquadramento do mesmo lugar, com perspectiva
    // própria. Quem sai do mundo volta a posicionar em coordenada de TELA, igual ao fundo gráfico.
    // `vista:` no shot vence o plano, pra cortar de ângulo sem mudar o tamanho do plano.
    // `variacao` é outro PEDAÇO do mesmo lugar (mesma linha de chão, vista lateral): troca o fundo
    // sem mexer na escala de ninguém. Vence o plano, porque é escolha de encenação, não de câmera.
    const vista = setSlug ? (sh.variacao ? `var-${sh.variacao}` : (sh.vista || vistaDoPlano(sh.camera?.plano))) : null;
    const vistaPropria = vista && vista !== VISTA_PADRAO ? vista : null;
    const noMundo = mundo && !grafico && !vistaPropria;
    const bg = grafico ? grafico
      : vistaPropria ? { type: sh.blur ? 'blur' : 'image', src: nomeMotor(setSlug, vistaPropria) }
      : noMundo ? { type: 'image', src: camadas[0].src, camadas }
      : { type: sh.blur ? 'blur' : 'image', src: setSlug ? nomeMotor(setSlug, VISTA_PADRAO) : `cenario-${cen}.png` };
    const chars = [], charPos = {};
    const charEmotes = {};   // pictograma preso ao personagem (segue o deslocamento dele)
    let shotEnd = 0;

    (sh.personagens || []).forEach((pc) => {
      const slug = pc.slug;
      // ESCALA CANÔNICA DO ELENCO (`video.elenco[slug] = { w, piso }`).
      //
      // POR QUE EXISTE: o tamanho de cada personagem era escolhido CENA A CENA, e num cenário sem
      // perspectiva (o nosso panorama tem o muro na mesma altura de ponta a ponta e o gramado numa
      // faixa plana) isso não lê como profundidade, lê como o mesmo jogador encolhendo e crescendo
      // no mesmo lugar. Foi a queixa: "uma hora está de um tamanho, outra hora de outro, não faz
      // sentido". Cenário chapado tem UMA linha de chão válida, e nela cada personagem tem UM
      // tamanho. A variação de plano passa a vir da CÂMERA, que amplia cenário e gente juntos.
      //
      // Declarar no vídeo em vez de repetir no beat é a diferença entre um dado e seis cópias dele:
      // com seis cópias, cada cena nova é uma chance de divergir. Quem precisa mesmo variar (um
      // personagem propositalmente lá no fundo) escreve `w`/`piso` no beat e vence o padrão.
      const canon = (video.elenco || {})[pc.slug] || {};
      const meio = Math.round((noMundo ? mundo.w : W) / 2);
      let cx = resolveAnchor(pc.spot ?? meio, cen, anchors, meio);
      const piso = resolveAnchor(pc.piso ?? canon.piso ?? PISO, cen, anchors, canon.piso ?? PISO);
      const w = pc.w ?? canon.w ?? 320;
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
      // "fora de cena": sem mundo, cx é coordenada de TELA e o personagem desloca até passar da
      // borda. Com mundo, a tela é uma JANELA que se move, então não existe borda fixa: desloca
      // meia-tela + a própria largura a partir do spot, o que o tira do enquadramento em que ele
      // entra (que é o enquadramento centrado nele, o caso normal).
      const foraDaTela = Math.round(W / 2) + w;
      const offIn = noMundo ? (fromRight ? foraDaTela : -foraDaTela) : (fromRight ? (W - cx + w) : -(cx + w));
      // ORIENTAÇÃO AUTOMÁTICA (regra fixa): quem se MOVE olha pra DIREÇÃO DO MOVIMENTO; quem fica
      // PARADO usa `olhar` (mira o alvo). Toda folha olha pra DIREITA, então ir pra esquerda é
      // espelhar (flip). Número invertido é aceito desde 01/08/2026, e desde 02/08 não existe mais
      // folha própria pra esquerda: espelhar é o único caminho, o que torna esta regra inteira uma
      // linha só. `preOrientado` continua sendo a exceção: ali a sprite JÁ foi desenhada virada
      // (uma pose, não um rig), e espelhar por cima desfaria.
      const naoEspelha = pc.preOrientado === true;
      let netMove = 0;
      if (pc.entra) netMove += fromRight ? -1 : 1;              // entra da direita = anda pra esquerda
      if (pc.sai) netMove += (pc.saiPara === 'direita') ? 1 : -1;
      for (const b of (pc.poses || [])) if (b.move) netMove += Math.sign(b.move);
      const moves = !!(pc.entra || pc.sai || (pc.poses || []).some((b) => b.move));
      let flip = false;
      if (!naoEspelha) flip = (moves && netMove !== 0) ? (netMove < 0) : (pc.olhar === 'esquerda' || pc.olhar === 'esq');
      // FLIP AO LONGO DO SHOT (segmentos). O flip era UM valor pro shot inteiro, somando entra+sai:
      // quem entrava por um lado e saía pelo mesmo lado somava ZERO (virava pro lado errado ao
      // apresentar), e quem entrava por um lado e saía pelo OUTRO andava DE COSTAS na volta. Agora
      // cada trecho de movimento tem seu flip e o motor troca no frame certo (ch.flips).
      // Preenchido durante a montagem das poses abaixo; com um segmento só, cai no flip antigo.
      const flipSegs = [];
      const marcaFlip = (frame, val) => {
        if (naoEspelha) return;                                  // sprite já desenhada virada: espelhar desfaz
        if (!flipSegs.length || flipSegs[flipSegs.length - 1][1] !== val) flipSegs.push([Math.max(0, frame), val]);
      };
      // ENCARA: vira a pose PRA um alvo (ex.: quem é pego encara o captor). Alvo à esquerda -> olha pra
      // esquerda (base direita = flip). Vence o auto-facing. Só serve pra pose de perfil/3-4 (frontal
      // não muda). Alvo tem que vir ANTES no shot.
      if (pc.encara && !naoEspelha && charPos[pc.encara]) flip = charPos[pc.encara].cx < cx;
      else if (pc.encara && !charPos[pc.encara]) console.warn(`[roteiro] "${slug}": encara:"${pc.encara}" — alvo não resolvido antes neste shot (ordene o alvo primeiro).`);
      if (typeof pc.flip === 'boolean') flip = pc.flip; // override manual (toggle do Palco) vence tudo
      // só aparece depois de `atraso` frames (escalona entradas). GUARDA ANTI-BLEED: quem ENTRA num
      // shot com transição espera o slide terminar por padrão (senão a posição de entrada dele vaza pra
      // tela durante a transição). Pode sobrepor com `atraso` maior.
      const guardaTransicao = (pc.entra && sh.transicao && sh.transicao !== 'none') ? (sh.tdur || 14) : 0;
      const t0 = Math.max(pc.atraso || 0, guardaTransicao);
      const poses = [];
      // CONTATO COM O CHÃO. `alturaPe` = a que altura o PÉ está do chão em cada frame (px de tela,
      // já somando o que a arte levanta e o que o código levanta). É o dado que a sombra precisa pra
      // encolher e clarear conforme o personagem sobe — sem ela a sombra ficaria do mesmo tamanho no
      // ápice e no chão, que é pior do que não ter sombra. `impactos` = os frames em que o pé BATE,
      // que é onde entram o squash, a poeira e o tremor. Os dois saem da mesma folha de exposição.
      const alturaPe = [];
      const impactos = [];      // tudo que bate: tremor + squash
      const impactosPe = [];    // subconjunto que bate NO CHÃO: também levanta poeira
      const moveX = [];
      const moveY = [[0, 0]]; // eixo vertical (negativo = SOBE): escalar muro, pendurar, cair
      // PERSPECTIVA: `escala` por beat, pra quem se afasta ou se aproxima da câmera. A bola já
      // encolhia indo ao fundo (`escala` nos lances dela) e o personagem não tinha equivalente —
      // então um lance FRONTAL, com o jogador correndo pro gol lá no fundo, não era montável: ele
      // atravessava o campo do mesmo tamanho. 1 = tamanho de cena; 0.5 = metade (mais longe).
      const escalaTr = [[0, 1]];
      // grava um ponto da trilha vertical SOBRESCREVENDO se já existe um no mesmo frame. Sem isso, o
      // último frame de um beat e o primeiro do seguinte colidiam, a guarda de monotonia empurrava
      // TODO o resto em +1 frame, e cada repetição do salto ficava um frame mais atrasada que a arte.
      const pushY = (frame, val) => {
        const last = moveY[moveY.length - 1];
        if (last && last[0] === frame) last[1] = val; else moveY.push([frame, val]);
      };
      let t = t0;

      // IDLE: ciclo de respiração pro personagem em REPOUSO. Liga por presença da sprite (ver
      // temIdle); `idle:false` no roteiro desliga caso a folha exista mas atrapalhe naquele beat.
      const idleOn = pc.idle !== false && temIdle(video.id, slug);
      const pushIdle = (frame) => { if (idleOn) poses.push({ cycle: cicloIdle(slug), hz: pc.idleHz ?? IDLE_HZ, in: frame }); };

      // entrada andando/correndo (de fora da tela até o spot), respeitando o atraso
      if (pc.entra) {
        const kind = pc.entra === 'correr' ? 'r' : 'w'; // base direita; a direção vem do flip
        // `chegaEm:<frame>` = composer calcula a velocidade pra CHEGAR nesse frame (sincroniza com o
        // agarrão/fala sem eu contar na mão); senão usa `entraDur` (default 24).
        // sem `entraDur`/`chegaEm`, a duração vem da DISTÂNCIA numa velocidade humana — o default
        // fixo de 24 frames fazia o personagem entrar voando quanto mais longe estivesse
        const wIn = pc.chegaEm != null ? Math.max(6, pc.chegaEm - t0) : (pc.entraDur || durDaDistancia(kind, w, offIn));
        moveX.push([0, offIn], [t0, offIn], [t0 + wIn, 0]);
        poses.push({ cycle: cyc(slug, kind), hz: hzDaPassada(kind, w, offIn, wIn), in: t0 });
        marcaFlip(0, fromRight);
        t = t0 + wIn;
        // parado no spot depois de chegar: mira o alvo (`olhar`), senão mantém a direção da entrada
        if (pc.olhar) marcaFlip(t, pc.olhar === 'esquerda' || pc.olhar === 'esq');
        // sem pose depois de chegar, o ciclo de CAMINHADA seguia rodando: o personagem chegava ao
        // spot e ficava andando no lugar até o fim do shot. Entra em repouso.
        if (!(pc.poses || []).length) pushIdle(t);
      } else {
        moveX.push([0, 0]); // parado no spot; a visibilidade vem do `appear`
      }

      // poses cronometradas (cada uma segura `hold` frames; `move` desloca dX no intervalo)
      (pc.poses || []).forEach((b) => {
        // HOLD DERIVADO: num beat de ciclo sem `hold`, a duração é a do PRÓPRIO gesto (a soma da
        // folha de exposição). Antes o default era 20 frames, um número que não tem relação com
        // gesto nenhum: cortava um empurrão de 30 frames no meio e deixava uma respiração de 17
        // rodando pela metade. Quem quiser N repetições declara `hold` (ou `repete: N`).
        const mCiclo = b.ciclo ? metaDoGesto(slug, b.ciclo) : null;
        const nQ = b.quadros ?? mCiclo?.quadros ?? 4;
        const temposB = b.ciclo
          ? (b.tempos || (mCiclo?.tempos?.length === nQ ? mCiclo.tempos : temposUniformes(nQ, fps, b.hz ?? 8)))
          : null;
        const cicloFrames = temposB ? totalExposicao(temposB) : 0;
        const hold = b.hold ?? (cicloFrames ? cicloFrames * (b.repete || 1) : 20);
        const kindB = b.correr ? 'r' : 'w';
        // A PASSADA SAI DA DISTÂNCIA PERCORRIDA NA TELA, não só do X. Num plano frontal (gol no
        // topo, jogador subindo) quase todo o deslocamento é `moveY`, e medindo só o X o ciclo caía
        // no piso de 1,6Hz: o corpo atravessava meia tela com o mesmo desenho de perna. Era o defeito
        // de "pose parada deslizando" reaparecendo pelo eixo que ninguém media.
        const distB = Math.hypot(b.move || 0, b.moveY || 0);
        if (b.andar || b.correr) poses.push({ cycle: cyc(slug, kindB), in: t, hz: distB ? hzDaPassada(kindB, w, distB, hold) : 8 });
        // `parado:true` = beat de REPOUSO VIVO (respiração). É o beat que faltava: sem ele, "esperar"
        // só podia ser uma pose congelada, e cena com personagem congelado é reprovada.
        else if (b.parado) pushIdle(t);
        // `ciclo:'<nome>'` = folha de AÇÃO (gen-acao/slice-acao): cicla <slug>-<nome>1..4 no lugar de
        // uma pose parada. É o jeito de um GESTO (acenar não, chacoalhar) virar animação de verdade;
        // duas poses geradas separadas não casam entre si e o "ciclo" treme em vez de animar.
        else if (b.ciclo) {
          // EXPOSIÇÃO VARIÁVEL: `tempos` (frames de tela por desenho) vem do gesto e é o que dá
          // peso — a antecipação segura, o ápice flutua, o meio passa voando.
          const m = mCiclo, n = nQ, tempos = temposB;
          const p = { cycle: Array.from({ length: n }, (_, k) => `${slug}-${b.ciclo}${k + 1}.png`), holds: tempos, in: t };
          // APERTO: gesto amplo (carrinho, espalmar) sai da folha DESENHADO MENOR, porque a escala do
          // canvas é uma só e o quadro mais largo a puxa pra baixo — o corpo em pé mede 580px no idle
          // e 363px no carrinho, o mesmo personagem 37% menor. O slicer mede isso e grava; aqui o
          // número viaja com a pose e o motor desfaz o encolhimento na hora de desenhar. Sem isso, o
          // personagem MUDA DE TAMANHO ao trocar de animação, e nenhum roteiro tem como saber disso.
          if (mCiclo?.aperto > 1.03) p.aperto = mCiclo.aperto;
          // LOOP OU UMA VEZ: vem do catálogo pelo _meta.json (`loop`), e o roteiro sobrescreve com
          // `loop:` no beat. `null` no meta = folha antiga que não declarou, e essa continua
          // repetindo como sempre repetiu. `fim` diz o que sobra na tela: 'segura' congela no ÚLTIMO
          // desenho (que nos gestos do catálogo é a pose de consequência: ele em pé de novo, ele
          // sentado zonzo) e 'volta' retorna ao primeiro.
          const repete = b.loop ?? (m?.loop == null ? true : m.loop);
          if (!repete) { p.loop = false; p.fim = b.fim || m?.fim || 'segura'; }
          poses.push(p);
          // CONTATO SEM VOO: o impacto estava amarrado ao pulo, então um empurrão ou um tombo tinham
          // o momento de batida DESENHADO e o mundo não reagia. `contato` (catálogo -> _meta.json)
          // marca os desenhos em que algo bate; `contatoPe` os que batem NO CHÃO (levantam poeira).
          // Num gesto de UMA VEZ só a primeira passada conta — senão o tremor dispararia de novo num
          // contato que não está mais acontecendo na tela.
          const ate = repete ? hold : Math.min(hold, totalExposicao(tempos) - 1);
          for (const i of (b.contato || m?.contato || [])) impactos.push(...framesDoQuadro(i, tempos, t, ate));
          for (const i of (b.contatoPe || m?.contatoPe || [])) impactosPe.push(...framesDoQuadro(i, tempos, t, ate));
        }
        // `mantem: '<gesto>'` = CONTINUA no estado em que o gesto terminou, sem reexecutá-lo. Cada
        // shot recomeça a lista de beats do zero, então repetir `ciclo: 'assustar'` no shot
        // seguinte faz o personagem se assustar DE NOVO, do desenho neutro — foi o que pareceu um
        // "reset" quando a câmera fechou no Vini. Aqui o beat mostra direto o desenho final da
        // folha (o primeiro, se o gesto tem `fim: 'volta'`), que é o que "ele continua assustado"
        // quer dizer. Sem contar número de desenho na mão.
        else if (b.mantem) {
          const mm = metaDoGesto(slug, b.mantem);
          const nn = b.quadros ?? mm?.quadros ?? 4;
          const qual = b.qual ?? ((b.fim || mm?.fim) === 'volta' ? 1 : nn);
          // MESMO APERTO DO CICLO: sem isto o personagem encolhe de volta no beat de `mantem`,
          // que é justamente onde ele fica MAIS tempo parado na tela (o goleiro caído, o zagueiro
          // no chão depois do carrinho).
          const pm = { src: `${slug}-${b.mantem}${qual}.png`, in: t };
          if (mm?.aperto > 1.03) pm.aperto = mm.aperto;
          poses.push(pm);
        }
        else if (b.pose) poses.push({ src: `${slug}-${b.pose}.png`, in: t });
        // `mira:'<slug>'` = este beat é DIRIGIDO a alguém (medir a altura de, apontar para, entregar
        // algo a). O facing sai da posição do ALVO no momento do beat, não da direção em que o
        // personagem estava andando. Sem isso, quem vinha andando pra esquerda e parava pra
        // inspecionar alguém à direita executava o gesto virado pro lado errado — foi o que fez o
        // Ditador medir a altura do jogador errado no mbappe-ditador. Alvo tem que vir ANTES no shot.
        if (b.mira) {
          if (charPos[b.mira]) marcaFlip(t, charPos[b.mira].cx < cx);
          else console.warn(`[roteiro] "${slug}": mira:"${b.mira}" — alvo não resolvido antes neste shot (ordene o alvo primeiro).`);
        }
        // QUEM SE MOVE OLHA PRA ONDE VAI. O `usaEsq` que ficava aqui era resto da variante `-esq`
        // (a folha desenhada já virada), removida em 02/08/2026: com ela, mover pra esquerda NÃO
        // espelhava, porque a arte já estava virada. Hoje existe UMA folha por rig, sempre olhando
        // pra direita, e ir pra esquerda é sempre o motor espelhando.
        //
        // A variável sumiu junto com a variante e esta linha ficou apontando pra ela — um
        // ReferenceError latente em QUALQUER beat com `move`. Não estourava porque os vídeos do
        // acervo deslocam por `entra`/`sai`, não por `move` dentro do beat; apareceu no primeiro
        // roteiro que fez alguém correr conduzindo a bola.
        if (b.move) { const last = moveX[moveX.length - 1][1]; moveX.push([t, last], [t + hold, last + b.move]); marcaFlip(t, b.move < 0); }
        else if (b.olhar) marcaFlip(t, b.olhar === 'esquerda' || b.olhar === 'esq');   // vira parado, no meio do shot
        if (b.moveY) { const last = moveY[moveY.length - 1][1]; pushY(t, last); pushY(t + hold, last + b.moveY); }
        // a escala INTERPOLA ao longo do beat, como o move: quem corre pro fundo encolhe enquanto
        // corre, não de um frame pro outro
        if (b.escala != null) { const last = escalaTr[escalaTr.length - 1][1]; escalaTr.push([t, last], [t + hold, b.escala]); }
        // PULO POR CÓDIGO: `pulo:{altura, ini, fim}` (frações do beat) desenha um ARCO no eixo Y.
        // A folha primária guarda o salto DENTRO da célula, mas isso rende poucos pixels (medido:
        // 56px num personagem de 620), longe de ler como pulo. Quem tira o personagem do chão é o
        // deslocamento por código; a folha entra com a POSE certa (agachar, esticar, aterrissar).
        // O arco usa amostras (sobe rápido, flutua no topo, desce) em vez de subir e descer reto.
        if (b.pulo) {
          const base = moveY[moveY.length - 1][1];
          const altura = b.pulo.altura ?? 140;
          // O ARCO SAI DA FOLHA DE EXPOSIÇÃO, NÃO DA ARTE. A tentativa anterior usava a altura
          // MEDIDA em cada desenho como curva do deslocamento, e isso desincronizava por dois
          // motivos: (1) a medida não fecha o ciclo — na comemoração ela sai 0→56→…→40 e volta a 0
          // no loop, ou seja o personagem CAÍA 40px num frame só, todo ciclo; (2) o composer contava
          // o quadro por `hz` e o motor contava pelo frame ABSOLUTO do shot, então as duas contas só
          // batiam por sorte. Agora as duas leem a MESMA tabela de exposição:
          //   ANTES do voo  -> código não mexe; a subida desenhada é a impulsão, e cancelá-la seria
          //                    apagar a antecipação que a folha tem de melhor
          //   NO VOO        -> código levanta pela parábola da janela declarada em `chao`
          //   DEPOIS do voo -> código COMPENSA pra baixo o resíduo da arte, colando o pé no chão nos
          //                    desenhos de aterrissagem e recuperação. É isso que faz o ciclo FECHAR:
          //                    o último desenho termina na mesma linha de chão do primeiro, e o
          //                    tranco de 40px no fim de cada repetição some.
          const m = mCiclo;
          const tempos = temposB;
          const janela = tempos ? janelaNoAr(tempos, b.chao || m?.chao) : null;
          // gesto de UMA VEZ: o arco não pode reiniciar junto com um ciclo que não vai reiniciar —
          // o personagem saltaria de novo com o sprite já congelado no chão
          const repeteArco = b.loop ?? (m?.loop == null ? true : m.loop);
          if (janela) {
            const ciclo = totalExposicao(tempos);
            const escSprite = w / (m?.canvasW || 480);   // sprite -> px de tela (o PNG é escalado pra `w`)
            const arte = m?.alturaDoSoloPx || [];
            for (let f = 0; f <= hold; f++) {
              const fc = repeteArco ? f % ciclo : Math.min(f, ciclo - 1), idx = quadroEm(fc, tempos);
              const dy = idx < janela.i0 ? 0                                            // antes do voo
                : idx <= janela.i1 ? -Math.round(alturaNoAr(fc, janela, altura))        // no voo
                  : Math.round((arte[idx] || 0) * escSprite);                           // depois do voo
              pushY(t + f, base + dy);
              alturaPe.push([t + f, Math.max(0, Math.round((arte[idx] || 0) * escSprite) - dy)]);
            }
            // o pé BATE no primeiro frame do desenho de aterrissagem, uma vez por repetição do ciclo
            for (let k = 0; k * ciclo + janela.fim <= hold; k++) { const f = t + k * ciclo + janela.fim; impactos.push(f); impactosPe.push(f); }
          } else if (b.ciclo && (m?.curvaAltura || []).some((v) => v > 0)) {
            // folha SEM `chao` declarado (gesto fora do catálogo): mantém o comportamento anterior,
            // agora ao menos contando o quadro pela mesma tabela que o motor usa.
            const curva = m.curvaAltura;
            for (let f = 0; f <= hold; f++) pushY(t + f, base - Math.round(altura * curva[quadroEm(repeteArco ? f : Math.min(f, totalExposicao(tempos) - 1), tempos)]));
          } else {
            // fallback pra beat SEM ciclo (pose única saltando): parábola no trecho declarado
            const { ini = 0.25, fim = 0.8 } = b.pulo;
            const t0 = t + Math.round(hold * ini), t1 = t + Math.round(hold * fim);
            const dur = Math.max(2, t1 - t0);
            pushY(t0, base);
            for (let k = 1; k <= 8; k++) {
              const p = k / 8;
              pushY(t0 + Math.round(dur * p), base - Math.round(altura * 4 * p * (1 - p)));
            }
            pushY(t1, base);
          }
        }
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
        const offOut = noMundo ? (saiRight ? foraDaTela : -foraDaTela) : (saiRight ? (W - cx + w) : -(cx + w));
        const kind = pc.sai === 'correr' ? 'r' : 'w'; // base direita; direção vem do flip
        const distOut = offOut - (moveX[moveX.length - 1][1] || 0);
        const wOut = pc.saiDur || durDaDistancia(kind, w, distOut);
        poses.push({ cycle: cyc(slug, kind), hz: hzDaPassada(kind, w, distOut, wOut), in: t });
        const last = moveX[moveX.length - 1][1];
        moveX.push([t, last], [t + wOut, offOut]);
        marcaFlip(t, !saiRight);
        t += wOut;
      }

      // trilhas precisam ser CRESCENTES em frame
      for (let k = 1; k < moveX.length; k++) if (moveX[k][0] <= moveX[k - 1][0]) moveX[k][0] = moveX[k - 1][0] + 1;
      for (let k = 1; k < moveY.length; k++) if (moveY[k][0] <= moveY[k - 1][0]) moveY[k][0] = moveY[k - 1][0] + 1;
      // GUARDA anti-gap (aparece no check-video): personagem que desloca precisa de CICLO de pernas
      // (não pose parada deslizando), e personagem parado precisa de ALGUMA animação (ciclo/bob).
      // personagem sem NENHUMA pose: o motor lê `poses[0].in` e estourava. Com idle ele entra em
      // repouso vivo (o caso "só está em cena"); sem idle não há o que desenhar, então avisa alto.
      if (!poses.length) {
        pushIdle(0);
        if (!poses.length) console.warn(`[roteiro] "${slug}": sem pose NENHUMA e sem folha de idle — gere o idle (gen-idle/slice-idle) ou declare ao menos uma pose.`);
      }
      const _hasCycle = poses.some((p) => p.cycle);
      // `voando: true` = o personagem NÃO está se deslocando por vontade própria, foi ARREMESSADO.
      // A regra de "todo deslocamento usa ciclo de passada" existe pra impedir pose parada deslizando
      // (que flutua); um corpo chutado no ar é justamente uma pose parada em translação, e é o
      // desenho certo. Exceção DECLARADA em vez de aviso rebaixado: quem arremessa alguém diz que
      // arremessou, e quem esqueceu o ciclo de passada continua sendo avisado.
      const _slides = (pc.poses || []).some((b) => b.move && b.pose && !b.andar && !b.correr && !b.voando && Math.abs(b.move) > 80);
      // `pc.efeito` CONTA COMO MOVIMENTO. A guarda nasceu quando a única forma de um personagem se
      // mexer era ter folha de ciclo, e nessa época sprite sem ciclo era mesmo um poster colado na
      // tela. Com a deformação da arte, um personagem parado RESPIRA, treme de medo ou infla de
      // raiva sem sprite nenhuma — e é justamente o beat que a animação limitada persegue. Sem esta
      // linha o guarda reclamaria exatamente do que o vídeo está fazendo de certo.
      const _frozen = (pc.poses || []).length <= 1 && !_hasCycle && !pc.bob && !pc.efeito && !pc.entra && !pc.sai && moveY.length <= 1 && !(pc.poses || []).some((b) => b.move) && !(pc.chutaEm && pc.chutaEm.length);
      if (_slides) console.warn(`[roteiro] "${slug}": DESLIZA (pose parada com move) — deslocamento deve usar andar/correr (folha de ciclo), não pose estática arrastada.`);
      if (_frozen && (pc.poses || []).length) console.warn(`[roteiro] "${slug}": ESTÁTICO (sem ciclo de caminhada, bob nem movimento) — gere o idle (gen-idle) ou use um beat "parado:true"/bob/ação animada.`);

      // NINGUÉM SAI DAQUI SEM POSE. Personagem cujo único beat é `parado:true` e que ainda não tem
      // folha de idle produzia `poses: []`, e o motor estourava lendo `poses[0].in` — um TypeError
      // no render, longe da causa. O gate já exige idle pra renderizar, então o fallback aponta pro
      // quadro de repouso que VAI existir: no animatic ele vira boneco e entra na lista de compras
      // (buraco vira fila de trabalho), em vez de derrubar o processo.
      if (!poses.length) poses.push({ src: `${slug}-i1.png`, in: t0 });
      const ch = { ...place(cx, piso, w), motion: 'static', moveX, poses };
      if (moveY.length > 1) ch.moveY = moveY;
      // PEÇA ARTICULADA (experimental, teste de 04/08/2026): uma parte do corpo desenhada como
      // POSE separada (mesmo canvas 480x620) girando sobre a pose base com easing. É a técnica da
      // referência sitcom: a cena segura numa pose boa e UMA peça se move por interpolação, em vez
      // de redesenhar o personagem. `pecas: [{ pose:'<nome>', pivo:[fx,fy], rot:[[frame,graus],...] }]`
      // — pivô em fração do canvas, rot em frames do shot.
      if (pc.pecas) ch.pecas = pc.pecas.map((pz) => ({ src: `${slug}-${pz.pose}.png`, pivo: pz.pivo, rot: pz.rot }));
      if (escalaTr.length > 1) ch.escala = escalaTr;   // perspectiva: encolhe indo pro fundo
      // SOMBRA DE CONTATO: `chao` é a linha em que o pé pisa. Sem ela o motor teria que redescobrir o
      // chão a partir de cy e da geometria do canvas, e a sombra sairia errada em qualquer personagem
      // com piso diferente. `sombra:false` no roteiro desliga (personagem no ar, em cima de algo).
      if (pc.sombra !== false) ch.chao = piso;
      if (alturaPe.length > 1) {
        for (let k = 1; k < alturaPe.length; k++) if (alturaPe[k][0] <= alturaPe[k - 1][0]) alturaPe[k][0] = alturaPe[k - 1][0] + 1;
        ch.alturaPe = alturaPe;
      }
      if (impactos.length) ch.impactos = [...new Set(impactos)].sort((a, b) => a - b);
      if (impactosPe.length) ch.impactosPe = [...new Set(impactosPe)].sort((a, b) => a - b);
      // 2+ segmentos = a direção MUDA no meio do shot (entra por um lado, sai pelo outro): manda a
      // trilha e o motor troca no frame. 1 segmento = comportamento antigo, um flip pro shot todo.
      // `flip` explícito no dado (toggle do Palco) e `encara` continuam vencendo tudo.
      if (flipSegs.length > 1 && typeof pc.flip !== 'boolean' && !pc.encara) ch.flips = flipSegs;
      else if (flip) ch.flip = true;
      if (pc.bob) ch.bob = pc.bob;   // respiro/balanço em loop (ex.: dormindo, torcida pulando)
      // DEFORMAÇÃO DA ARTE (`pers.efeito`): o desenho inteiro comprime, treme ou sacode, sem ser
      // cortado em peça nenhuma. É o que dá ATUAÇÃO a quem não tem folha de gesto — e quase todo o
      // elenco não tem: são 97 personagens para 13 folhas de ação no acervo. Catálogo em
      // `shared/efeitos.mjs`; os fortes (riso-forte, medo, raiva, espanto) são beat, entram e saem.
      if (pc.efeito) {
        const e = typeof pc.efeito === 'string' ? { tipo: pc.efeito } : pc.efeito;
        if (!EFEITOS[e.tipo]) throw new Error(`efeito "${e.tipo}" não existe (use ${EFEITOS_IDS.join(', ')})`);
        ch.efeito = { tipo: e.tipo, em: e.em ?? 0, dur: e.dur ?? 1e9, periodo: e.periodo ?? 40, forca: e.forca ?? 1, entra: e.entra ?? 8, sai: e.sai ?? 8 };
      }
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
      const larguraRef = noMundo ? mundo.w : W;
      const x = b.x != null ? Math.round(b.x * larguraRef) : (p ? p.cx : Math.round(larguraRef / 2));
      const y = b.y != null ? b.y : (p ? Math.max(90, Math.round(p.cy - p.w * 0.72) - (b.dy || 0)) : 300);
      const bal = { text: b.texto, x, y, size: b.size || 56, color: b.cor, rot: b.rot || 0, in: b.in ?? 6, out: b.out ?? Math.max(10, shotEnd - 4) };
      // no mundo, a fala vive em coordenada de MUNDO e o motor a desenha dentro da câmera, senão
      // ela ficaria plantada na tela enquanto o falante desliza no pan.
      if (noMundo) bal.mundo = true;
      return bal;
    });
    // PICTOGRAMA DE EMOÇÃO (`pers.emote` ou `sh.emotes[]`): fogo, notas, estrelas, gotas, moedas,
    // "?" e "!" por código, ancorados ACIMA DA CABEÇA de quem sente. Vale pra qualquer personagem,
    // inclusive os que não têm folha de reação nenhuma — que é o ponto: emoção sem custar geração.
    // ELE SEGUE QUEM SENTE. A primeira versão ancorava na posição de REPOUSO e eu documentei isso
    // como "serve pra personagem parado", que é contornar em vez de resolver: no primeiro uso real
    // (o 11 suando enquanto corre) as gotas ficaram paradas no ar e o personagem saiu de baixo
    // delas. Agora o emote vai preso ao CHAR, e o motor aplica nele o mesmo deslocamento do
    // personagem — inclusive a trilha de corrida e o `bob`.
    // INDEXADO POR ÍNDICE NO SHOT, não por slug: um vídeo pode ter o MESMO slug em vários papéis
    // (a bancada usa o personagem-padrão nos quatro), e por slug o pictograma de um caía sobre todos.
    const emotes = [];
    (sh.personagens || []).forEach((pc, pi) => {
      const es = pc.emote ? [pc.emote] : [];
      const doChar = [];
      for (const e0 of es.concat(pc.emotes || [])) {
        const e = typeof e0 === 'string' ? { tipo: e0 } : e0;
        const p = charPos[pc.slug];
        if (!p) continue;
        const item = { tipo: e.tipo || 'exclamacao', in: e.em ?? e.in ?? 6, dur: e.dur ?? 40,
          size: e.size ?? Math.round(p.w * 0.2), cor: e.cor,
          // deslocamento em relação ao personagem (topo da cabeça), não posição absoluta
          dx: e.dx ?? 0, dy: e.dy ?? -Math.round(p.w * 0.78) };
        if (e.x != null || e.y != null) { item.x = e.x; item.y = e.y; emotes.push(item); }  // âncora fixa: opt-in
        else doChar.push(item);
      }
      if (doChar.length) (charEmotes[pi] = charEmotes[pi] || []).push(...doChar);
    });
    for (const e of (sh.emotes || [])) {
      const p = e.de ? charPos[e.de] : null;
      emotes.push({ tipo: e.tipo || 'exclamacao', x: e.x ?? (p ? p.cx : Math.round(W / 2)),
        y: e.y ?? (p ? Math.round(p.cy - p.w * 0.78) : 300),
        in: e.em ?? e.in ?? 6, dur: e.dur ?? 40, size: e.size ?? (p ? Math.round(p.w * 0.2) : 70), cor: e.cor });
    }
    // PROP BOLA: gera as trilhas a partir dos lances declarativos e estende o shot pra ela caber
    const bolaRes = montarBola(sh, noMundo ? mundo.w : W, PISO);
    if (bolaRes && bolaRes.end > shotEnd) shotEnd = bolaRes.end;
    // ENQUADRAMENTO base do shot (`sh.enquadramento:{escala,origem}`): a cena inteira vive nessa
    // escala e os zooms partem dela. Antes isso era um zoom de hold longo, e o zoom SEGUINTE
    // voltava pra 1 no meio da cena (pisco). Ver zoomBase no Cena.jsx.
    const enq = sh.enquadramento || null;
    const zooms = (sh.zoom ? [sh.zoom] : []).concat(sh.zooms || []);
    const dur = sh.dur || (shotEnd + 24);
    const shot = { dur, bg, dust: false, chars, balloons, zooms };
    if (enq) { shot.zoomBase = enq.escala ?? 1; if (enq.origem) shot.zoomOrigem = enq.origem; }
    if (bolaRes) shot.balls = [bolaRes.ball];
    if (emotes.length) shot.emotes = emotes;
    // pendura no char o que é dele: o motor desenha junto, com o mesmo deslocamento
    (sh.personagens || []).forEach((pc, i) => { if (charEmotes[i] && chars[i]) chars[i].emotes = charEmotes[i]; });
    if (sh.confetti) shot.confetti = true;
    // TREMOR DE IMPACTO: cada aterrissagem sacode a câmera por ~6 frames. É o que faz o salto ter
    // PESO — sem isso o personagem toca o chão e o mundo não toma conhecimento. Amplitude pequena
    // de propósito (default 3px); `sh.tremorImpacto: 0` desliga, número maior exagera.
    const impactosShot = [...new Set(chars.flatMap((c) => c.impactos || []))].sort((a, b) => a - b);
    const forcaTremor = sh.tremorImpacto ?? 3;
    if (impactosShot.length && forcaTremor > 0) shot.impactos = impactosShot.map((f) => [f, forcaTremor]);
    // GRADE DE COR do shot: { cor, op, vinheta } — véu de cor + vinheta por código. Diferencia
    // noite/pôr do sol/tensão sem gerar cenário nenhum, e é o jeito mais barato de dois shots no
    // MESMO cenário panorâmico não parecerem o mesmo plano repetido.
    if (sh.grade) shot.grade = sh.grade;
    // DESFOQUE DO FUNDO no plano fechado: automático em `close`/`detalhe` (é onde o cenário nítido
    // atrás de um personagem enorme denuncia a colagem), e `desfoque: <px>|false` manda no roteiro.
    // o desfoque é aplicado na imagem em tamanho de MUNDO (2160px de largura), e a câmera ainda
    // amplia por cima: 5px ali viram quase nada na tela. Estes valores são os que se veem.
    const desfoquePadrao = { close: 12, detalhe: 18 }[sh.camera?.plano] || 0;
    const desfoque = sh.desfoque === false ? 0 : (sh.desfoque ?? desfoquePadrao);
    if (desfoque) shot.desfoqueFundo = desfoque;
    // PISCADA: quadro preto (ou branco) nos primeiros frames do shot. Pontuação de montagem, não
    // transição — não mexe na duração nem no overlap, então pode entrar e sair sem recontar frame.
    if (sh.piscada) shot.piscada = sh.piscada === true ? {} : sh.piscada;
    if (sh.relogio) shot.clock = sh.relogio;   // relógio girando (tempo passando)
    if (sh.transicao) { shot.transition = sh.transicao; shot.tdur = sh.tdur || 14; }
    if (sh.cages) shot.cages = sh.cages;
    // AMBIENTE: camadas de vida desenhadas por código (torcida, bandeiras, chuva). Custo zero de
    // geração, e é o que tira o cenário do estado de "PNG parado atrás de gente que se move".
    if (sh.ambiente) shot.ambiente = sh.ambiente;

    // ------------------------------------------------------------------------
    // CÂMERA do shot (só no modo mundo):
    //   sh.camera = { em:'<slug>'|<x px>, y?, plano?:'geral'|'medio'|'close'|'detalhe',
    //                 espera?(frames antes de começar a mover), dur?(frames de viagem) }
    // A trilha sai em frame ABSOLUTO e parte do enquadramento do shot ANTERIOR, então a "troca de
    // cena" é um movimento contínuo de câmera em vez de um corte. Fora da janela de viagem a trilha
    // é clampada, ou seja a câmera fica firme no enquadramento até a hora de andar.
    // ------------------------------------------------------------------------
    if (noMundo) {
      const c = sh.camera || {};
      // ----------------------------------------------------------------------
      // CÂMERA QUE SEGUE (`camera.segue: '<slug>'`): em vez de viajar de um enquadramento fixo pro
      // outro num tempo arbitrário, a câmera copia a TRILHA DE MOVIMENTO do personagem. O cenário
      // passa a deslizar no ritmo do passo dele, que é o que dá sensação de deslocamento de verdade
      // (com a câmera parada, quem anda "atravessa o quadro"; com ela seguindo, o MUNDO é que anda).
      // Sai em frame absoluto e é clampada na borda do mundo, igual ao resto.
      if (c.segue) {
        const alvo = chars.find((_, i) => (sh.personagens || [])[i]?.slug === c.segue);
        const pc = (sh.personagens || []).find((x) => x.slug === c.segue);
        if (!alvo || !pc) {
          console.warn(`[roteiro] camera segue:"${c.segue}" — personagem não está neste shot; câmera fica onde estava.`);
        } else {
          const z = c.plano ? (PLANOS[c.plano] ?? camAtual.z) : camAtual.z;
          // o shot 0 ABRE já no plano final (senão a câmera começa em z=1, mais aberta do que o
          // clamp previu, e revela a borda do mundo — tarja preta no primeiro frame)
          const zIni = si === 0 && c.dur == null ? z : camAtual.z;
          // clampa pelo MENOR z da trilha: é nele que o viewport é mais LARGO, logo o que exige a
          // margem maior. Clampando pelo z final, o começo da viagem ainda estouraria a borda.
          const zMin = Math.min(z, zIni);
          const meiaX = W / (2 * zMin), meiaY = H / (2 * zMin);
          const limX = (v) => (mundo.w > W / zMin ? Math.min(Math.max(v, meiaX), mundo.w - meiaX) : mundo.w / 2);
          const yFixo = Math.round(c.y != null ? c.y : (mundo.h > H / zMin ? Math.min(Math.max(alvo.cy, meiaY), mundo.h - meiaY) : mundo.h / 2));
          // trilha do personagem = spot + moveX; a câmera olha pra ele (com `folga` opcional, pra
          // ele não ficar cravado no centro do quadro o tempo todo)
          const folga = c.folga ?? 0;
          const camX = (alvo.moveX || [[0, 0]]).map(([f, dx]) => [absStart + f, Math.round(limX(alvo.cx + dx + folga))]);
          for (let k = 1; k < camX.length; k++) if (camX[k][0] <= camX[k - 1][0]) camX[k][0] = camX[k - 1][0] + 1;
          shot.cam = {
            x: camX,
            y: [[absStart, yFixo], [absStart + 1, yFixo]],
            z: [[absStart, zIni], [absStart + (c.dur ?? 24), z]],
          };
          shot.mundo = mundo;
          camAtual = { x: camX[camX.length - 1][1], y: yFixo, z };
          shots.push(shot);
          absStart += dur - (si > 0 && shot.transition && shot.transition !== 'none' ? (shot.tdur || 10) : 0);
          return;
        }
      }
      const p = typeof c.em === 'string' ? charPos[c.em] : null;
      if (typeof c.em === 'string' && !p) console.warn(`[roteiro] camera em:"${c.em}" — personagem não está neste shot; câmera fica onde estava.`);
      const plano = c.plano || (c.em != null ? 'medio' : null);
      let alvoZ = plano ? (PLANOS[plano] ?? camAtual.z) : camAtual.z;
      if (plano && !PLANOS[plano]) console.warn(`[roteiro] camera plano:"${plano}" desconhecido (use ${Object.keys(PLANOS).join('/')}).`);
      let alvoX = typeof c.em === 'number' ? c.em : (p ? p.cx : camAtual.x);
      // plano geral quer o quadro cheio (centro vertical); plano fechado quer o personagem no meio
      let alvoY = c.y != null ? c.y : (plano === 'geral' || !p ? Math.round(H / 2) : p.cy);
      // não deixa a câmera passar da borda do mundo (mostraria vazio ao lado do cenário)
      const meiaX = W / (2 * alvoZ), meiaY = H / (2 * alvoZ);
      if (mundo.w > W / alvoZ) alvoX = Math.min(Math.max(alvoX, meiaX), mundo.w - meiaX);
      else alvoX = mundo.w / 2;
      if (mundo.h > H / alvoZ) alvoY = Math.min(Math.max(alvoY, meiaY), mundo.h - meiaY);
      else alvoY = mundo.h / 2;
      alvoX = Math.round(alvoX); alvoY = Math.round(alvoY);
      const mudou = alvoX !== camAtual.x || alvoY !== camAtual.y || alvoZ !== camAtual.z;
      // o primeiro shot ABRE já enquadrado (senão o vídeo começaria com um pan que ninguém pediu,
      // vindo do centro do mundo). `dur` explícito no shot 0 força a viagem de abertura.
      const instantaneo = !mudou || (si === 0 && c.dur == null);
      if (instantaneo) {
        shot.cam = { x: [[0, alvoX], [1, alvoX]], y: [[0, alvoY], [1, alvoY]], z: [[0, alvoZ], [1, alvoZ]] };
      } else {
        const ini = absStart + (c.espera ?? 0), fim = ini + (c.dur ?? 34);
        shot.cam = {
          x: [[ini, camAtual.x], [fim, alvoX]],
          y: [[ini, camAtual.y], [fim, alvoY]],
          z: [[ini, camAtual.z], [fim, alvoZ]],
        };
      }
      shot.mundo = mundo;
      camAtual = { x: alvoX, y: alvoY, z: alvoZ };
    }
    shots.push(shot);
    // mesma fórmula de acumulação do motor (Cena.jsx), pra as trilhas de câmera baterem com o frame
    absStart += dur - (si > 0 && shot.transition && shot.transition !== 'none' ? (shot.tdur || 10) : 0);
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
  // CENA CONTÍNUA: shots do `roteiro` costumam ser o MESMO lugar em beats seguidos (corte seco,
  // não troca de locação). Sem isso a câmera reiniciava o push/deriva a cada corte e dava um pisco
  // de "mudou de cenário". `video.continuo: false` desliga (ex.: roteiro que troca mesmo de lugar).
  const scene = { fps, width: W, height: H, font: video.fonte || 'Luckiest Guy', moldura: video.moldura,
    continuo: video.continuo !== false, shots };
  const audio = { durSec: +(totalFrames / fps).toFixed(3), music: null, musicVol: 0, sfx: [] };
  return { scene, audio, totalFrames };
}



