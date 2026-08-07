// lances.mjs — CATÁLOGO DE LANCES: a interação entre personagem e bola, montada.
//
// POR QUE EXISTE: o `gestos.mjs` guarda como UM personagem se move, e isso já se reusa — a
// cronometragem do carrinho vale em qualquer vídeo. Mas um LANCE é outra coisa: é o encontro entre
// o gesto e o prop, e nada disso viajava. Ficava tudo no JSON de um vídeo só:
//
//   · em que frame a bola sai do pé (o gesto começa em f10, mas o pé só toca a bola em f26)
//   · a bola vive À FRENTE do pé, não no centro do corpo (o `spot` é o meio dele)
//   · condução e embaixadinha precisam da bola em X E Y; passe e chute querem física de altura
//   · o carrinho tem que ser ancorado no frame do desvio, senão erra por atraso e não por drible
//
// Cada um desses custou uma rodada de animatic pra descobrir. Sem este arquivo, o próximo vídeo com
// bola recomeça do zero — e é isso que a bancada `lances-referencia` existiu pra evitar.
//
// COMO USAR: cada lance devolve `{ bola, personagens, dur }`, que é o pedaço de um shot. O roteiro
// compõe com o resto (cenário, câmera, balões).
import { GESTOS, gestoPara } from '../sprites/gestos.mjs';

// ---------------------------------------------------------------------------
// AS DUAS RÉGUAS que todo lance usa
// ---------------------------------------------------------------------------

// FRAMES ATÉ O CONTATO: quantos frames depois do gesto começar o pé (ou a luva) encontra a bola.
// Sai da soma da folha de exposição até o desenho marcado como `contato` — o mesmo dado que o
// slicer grava no `_meta.json`. Contar isso na mão em cada roteiro é o que faz "o pé passa e a
// bola sai depois" aparecer só no render.
export function contatoDoGesto(nome, classe = null) {
  const g = GESTOS[nome];
  if (!g) throw new Error(`lance: gesto "${nome}" não está no catálogo`);
  const c = classe || (g.fases16 ? 'complexa' : g.fases9 ? 'primaria' : 'secundaria');
  const { tempos, contato } = gestoPara(nome, c);
  if (!tempos || !contato?.length) return 0;
  return tempos.slice(0, contato[0]).reduce((a, b) => a + b, 0);
}

// DURAÇÃO DO CICLO: quanto o gesto inteiro leva na tela. É o `hold` natural de um beat que executa
// o gesto uma vez, e o compasso de um gesto em loop (a embaixadinha bate uma vez por ciclo).
export function cicloDoGesto(nome, classe = null) {
  const g = GESTOS[nome];
  const c = classe || (g?.fases16 ? 'complexa' : g?.fases9 ? 'primaria' : 'secundaria');
  const { tempos } = gestoPara(nome, c);
  return (tempos || []).reduce((a, b) => a + b, 0);
}

// A BOLA FICA JUNTO AO PÉ, e o `spot` do personagem é o CENTRO do corpo dele. Bola desenhada no
// spot fica entre as pernas; ela tem que estar à frente do pé de apoio. A fração sai da largura,
// então funciona pra qualquer tamanho de personagem em cena.
export const offsetDoPe = (w) => Math.round(w * 0.29);

// altura em que o pé encontra a bola numa embaixadinha (o toque é na altura do joelho)
export const alturaDoToque = (w) => Math.round(w * 0.44);

const R = 34;   // raio padrão da bola (Ball em Cena.jsx)

// ONDE O PROP ENCONTRA A MÃO/PÉ, em pixels de tela.
//
// O gesto declara o ponto em FRAÇÃO do canvas normalizado (`propEm` em gestos.mjs, medido no
// sprite), e aqui ele vira coordenada de cena. Sem isso, cada roteiro chuta onde a bola deve parar
// e ela fica PERTO da luva do goleiro — que na tela lê como bola flutuando ao lado dele.
//
// A conta usa o mesmo modelo do motor: o sprite é desenhado com largura `w` e a altura sai da
// proporção do canvas (620/480), com o pé ancorado no piso.
const CANVAS_W = 480, CANVAS_H = 620, FEET_Y = 610;
export function pontoDoProp(gesto, quadro, { cx, piso, w, classe = null, flip = false }) {
  const g = GESTOS[gesto];
  const c = classe || (g?.fases16 ? 'complexa' : g?.fases9 ? 'primaria' : 'secundaria');
  const { propEm } = gestoPara(gesto, c);
  const p = propEm?.[quadro];
  if (!p) return null;
  const [fx, fy] = p;
  const esc = w / CANVAS_W;                      // px de tela por px de canvas
  const alturaSprite = CANVAS_H * esc;
  const topo = piso - FEET_Y * esc;              // onde o topo do canvas cai na tela
  // `flip`: o motor espelha quem olha pra esquerda, então o x do ponto espelha junto
  const dx = (flip ? 1 - fx : fx) - 0.5;
  return [Math.round(cx + dx * CANVAS_W * esc), Math.round(topo + fy * alturaSprite)];
}

// ---------------------------------------------------------------------------
// OS LANCES
// ---------------------------------------------------------------------------
// Cada função devolve `{ bola, personagens, dur }` pra entrar num shot. `piso` é a linha de chão do
// cenário; `w` o tamanho do personagem em cena.

// PASSE RASTEIRO de A pra B, com B devolvendo. A bola SAI no frame do contato de quem chuta e
// CHEGA no frame do contato de quem recebe — é a sincronia que o lance existe pra garantir.
export function passe({ slug, de, para, piso, w = 330, comeca = 10, viagem = 30, devolve = true }) {
  const C = contatoDoGesto('chutar-bola');
  const PE = offsetDoPe(w);
  const saida = comeca + C;
  const bComeca = saida + viagem - C;                 // pra o pé DELE encontrar a bola na chegada
  const lances = [{ parada: saida }, { passe: para + PE - w, dur: viagem }];
  if (devolve) lances.push({ passe: de + PE, dur: viagem + 4 });
  lances.push({ parada: 24 });
  const dur = saida + viagem + (devolve ? viagem + 28 : 28) + 40;
  return {
    dur,
    bola: { groundY: piso - R, inicio: de + PE, em: 0, lances },
    personagens: [
      { slug, spot: de, piso, w, poses: [{ parado: true, hold: comeca }, { ciclo: 'chutar-bola', quadros: 9, denovo: true }, { parado: true, hold: dur - comeca - cicloDoGesto('chutar-bola') }] },
      { slug, spot: para, piso, w, olhar: 'esquerda', poses: devolve
        ? [{ parado: true, hold: bComeca }, { ciclo: 'chutar-bola', quadros: 9, denovo: true }, { parado: true, hold: Math.max(1, dur - bComeca - cicloDoGesto('chutar-bola')) }]
        : [{ parado: true, hold: dur }] },
    ],
  };
}

// CHUTE A GOL com o goleiro ESPALMANDO. A bola não some: bate na luva e sai pro outro lado, que é
// o único jeito de montar rebote — `defender` prende a bola na mão e encerra a jogada.
export function chuteEspalmada({ slug, de, gol, piso, w = 330, comeca = 15, voo = 34 }) {
  const C = contatoDoGesto('chutar-bola'), E = contatoDoGesto('espalmar');
  const PE = offsetDoPe(w);
  const chega = comeca + C + voo;                     // frame em que a bola encontra a luva
  const dur = chega + 90;
  return {
    dur,
    bola: { groundY: piso - R, inicio: de + PE, em: 0, lances: [
      { parada: comeca + C },
      { chute: gol - 60, alturaFim: 260, pico: 150, dur: voo, escala: 0.7 },
      { arco: de + 200, pico: 120, dur: 30, escala: 0.9 },      // a luva empurra: a bola volta
      { quique: de, pico: 90, saltos: 2, dur: 30 },
      { parada: 20 },
    ] },
    personagens: [
      { slug, spot: de, piso, w, poses: [{ parado: true, hold: comeca }, { ciclo: 'chutar-bola', quadros: 9, denovo: true }, { parado: true, hold: dur - comeca - cicloDoGesto('chutar-bola') }] },
      { slug, spot: gol, piso, w: w + 20, olhar: 'esquerda', poses: [
        { parado: true, hold: chega - E },
        { ciclo: 'espalmar', quadros: 9, denovo: true },
        { mantem: 'espalmar', hold: Math.max(1, dur - (chega - E) - cicloDoGesto('espalmar')) },
      ] },
    ],
  };
}

// EMBAIXADINHA. A bola vive na ALTURA DO PÉ entre os toques e só cai no chão quando ele para — por
// isso o lance usa o modo PLANO: no modo de altura existe um `groundY` só pro shot inteiro, e aí ou
// ela quica pra sempre na altura do pé ou cai no gramado desde o primeiro toque.
export function embaixadinha({ slug, x, piso, w = 340, comeca = 12, toques = 10 }) {
  const CICLO = cicloDoGesto('embaixadinha', 'secundaria');
  const T = contatoDoGesto('embaixadinha', 'secundaria');
  const PE = offsetDoPe(w), yPe = piso - alturaDoToque(w), sobe = Math.round(CICLO / 2);
  const lances = [{ parada: comeca + T }];
  for (let i = 0; i < toques; i++) {
    lances.push({ para: [x + PE, yPe - 210 - R], dur: sobe });
    lances.push({ para: [x + PE, yPe - R], dur: CICLO - sobe });
  }
  // e no fim ela CAI: assenta em dois quiques curtos, senão some no ar quando ele para
  lances.push({ para: [x + PE + 20, piso - R], dur: 16 },
    { para: [x + PE + 45, piso - R - 60], dur: 9 }, { para: [x + PE + 70, piso - R], dur: 9 },
    { para: [x + PE + 85, piso - R - 22], dur: 6 }, { para: [x + PE + 100, piso - R], dur: 6 },
    { parada: 40 });
  const dur = comeca + CICLO * toques + 100;
  return {
    dur,
    bola: { modo: 'plano', inicio: [x + PE, yPe - R], em: 0, lances },
    personagens: [{ slug, spot: x, piso, w, poses: [
      { parado: true, hold: comeca },
      { ciclo: 'embaixadinha', quadros: 4, hold: CICLO * toques },
      { parado: true, hold: dur - comeca - CICLO * toques },
    ] }],
  };
}

// DRIBLE com CARRINHO errado. É o lance mais completo: locomoção, prop e dois personagens.
//
// O QUE NÃO É ÓBVIO, e custou três rodadas de animatic:
//   · a bola precisa do modo PLANO pra acompanhar o pé quando o condutor desvia no Y
//   · o `move` vale DENTRO de um beat de `ciclo`, e é ele que faz o carrinho deslizar em vez de
//     patinar parado
//   · o bote se ancora no frame do DESVIO. Ancorado em qualquer outro ponto, o carrinho erra por
//     atraso — o zagueiro escorrega enquanto o outro ainda vem reto, e some a leitura de drible
//   · o beat depois do carrinho é `mantem`, não `parado`: `parado` devolve a pose neutra e o
//     zagueiro LEVANTA logo depois de escorregar
export function dribleCarrinho({ slug, x0, x1, piso, w = 330, desvio = 230, tempos = [24, 26, 34] }) {
  const B = contatoDoGesto('carrinho');
  const PE = offsetDoPe(w);
  const [t1, t2, t3] = tempos;
  const fDesvio = t1 + t2;                      // auge do desvio: é aqui que o bote tem que bater
  const xDesvio = x0 + Math.round((x1 - x0) * 0.6);
  const zagDe = x1 + 240, zagBote = x1;
  const dur = t1 + t2 + t3 + 130;
  return {
    dur,
    bola: { modo: 'plano', inicio: [x0 + PE, piso - R], em: 0, lances: [
      { parada: 4 },
      { para: [x0 + Math.round((xDesvio - x0) * 0.55) + PE, piso - R], dur: t1 },
      { para: [xDesvio + PE, piso - desvio - R], dur: t2 },
      { para: [x1 + PE, piso - R], dur: t3 },
      { parada: 90 },
    ] },
    personagens: [
      // O ZAGUEIRO VEM PRIMEIRO: quem é desenhado antes fica ATRÁS, e o condutor precisa passar
      // na frente dele pra leitura do drible funcionar.
      { slug, spot: zagDe, piso, w: w + 10, poses: [
        { correr: true, hold: fDesvio - B, move: zagBote - zagDe },
        { ciclo: 'carrinho', quadros: 9, denovo: true, move: -340 },
        { mantem: 'carrinho', hold: Math.max(1, dur - (fDesvio - B) - cicloDoGesto('carrinho')) },
      ] },
      { slug, spot: x0, piso, w, poses: [
        { correr: true, hold: t1, move: Math.round((xDesvio - x0) * 0.55) },
        { correr: true, hold: t2, move: Math.round((xDesvio - x0) * 0.45), moveY: -desvio },
        { correr: true, hold: t3, move: x1 - xDesvio, moveY: desvio },
        { parado: true, hold: dur - t1 - t2 - t3 },
      ] },
    ],
  };
}

export const LANCES = { passe, chuteEspalmada, embaixadinha, dribleCarrinho };
export const LANCES_VALIDOS = Object.keys(LANCES);
