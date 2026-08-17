// VARIANTES DA BOLA-BALÃO · RODADA 2, COM REFERÊNCIA (16/08/2026).
//
// POR QUE A RODADA 1 FOI REPROVADA, e é a lição que fica: ela rodou com `refs: []`, e sem
// referência o modelo devolve ÍCONE FLAT DE BIBLIOTECA. As seis saíram corretas e sem estilo
// nenhum, e o Raphael leu isso na hora ("parece que está fugindo do estilo visual"). É o mesmo
// princípio que o CLAUDE.md já registra para sprite: descrever o traço em inglês não substitui
// MOSTRAR uma peça que presta. A rodada 1 fica em `_bola-variantes/_rodada1/`.
//
// AS DUAS IMAGENS, na ordem que o hint descreve, e é a mesma gramática das folhas de personagem:
//   Image 1 = o TRAÇO da casa (o lettering oficial). Dela vem o acabamento: peso de contorno,
//             irregularidade da linha, sombra dura, a cor exata do creme e do laranja.
//   Image 2 = a FORMA a variar (a bola-balão oficial). Dela vem a silhueta, que não se discute
//             mais: bola de gomos com rabicho de balão saindo embaixo à esquerda.
// Cada prompt muda UMA coisa em cima disso, porque variante que muda três não ensina qual delas
// fez diferença.
//
//   node futgibi/marca/gerar-bola-variantes.mjs [--so=<id>]
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, copyFile, access } from 'node:fs/promises';
import { MODELOS_IMAGEM } from '../../saga-fut-studio/server/providers/imagem.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const CONTEUDO = path.resolve(AQUI, '../../saga-fut');
const SAIDA = path.join(AQUI, '_bola-variantes');

const flag = (n, p) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=')[1] ?? p;
const so = flag('so');

// as referências precisam morar DENTRO do conteúdo: o provider passa `rel` pra CLI
const REFS_DIR = path.join(CONTEUDO, '_marca-futgibi');
await mkdir(REFS_DIR, { recursive: true });
await copyFile(path.join(AQUI, 'logo/wordmark-cor.png'), path.join(REFS_DIR, 'ref-traco.png'));
await copyFile(path.join(AQUI, 'logo/simbolo-bola-cor.png'), path.join(REFS_DIR, 'ref-bola.png'));
const REFS = [
  { rel: '_marca-futgibi/ref-traco.png' },
  { rel: '_marca-futgibi/ref-bola.png' },
];

// O QUE AS DUAS IMAGENS SÃO, dito ao modelo: sem isso ele mistura as duas e devolve a bola com
// letras dentro, que foi o modo de falhar clássico das folhas de personagem quando a referência
// não vinha nomeada.
const HINT = `Image 1 is the brand's LETTERING, and it is here ONLY as a drawing-style reference:
copy its INKING from it — the thick slightly irregular hand-inked black contour, the flat cream
off-white fill, the hard offset shadow, the exact cream and orange tones. Do NOT copy any letter,
word or shape from Image 1. Image 2 is the SHAPE to redraw: a round soccer ball that is also a
comic speech balloon, with the balloon tail at the bottom left. Keep that silhouette.`;

const REGRA = `Redraw the mark of Image 2 in the drawing style of Image 1. FLAT colours, NO
gradients, NO 3D, NO photographic texture. Comic book ink, not corporate vector icon. The only
colours allowed are: warm cream off-white, near-black, bright orange and deep grass green.
Centred on a plain flat white background with generous empty margin. The image must contain NO
text, NO letters and NO numbers. Square, 1:1.`;

const VARIANTES = {
  // o traço da casa é uma linha de CANETA: engrossa na curva, afina na ponta
  'inking': `${HINT} ${REGRA} CHANGE ONE THING vs Image 2: the outline must have VARYING WEIGHT
like a real inked comic drawing (thicker on the outer silhouette and on the bottom of shapes,
thinner elsewhere), instead of a uniform vector stroke.`,

  // a sombra dura é a assinatura do lettering: é o que mais amarra o símbolo ao wordmark
  'sombra-dura': `${HINT} ${REGRA} CHANGE ONE THING vs Image 2: add the same HARD OFFSET SHADOW
that Image 1 has — a solid orange copy of the whole silhouette, offset down and to the right, with
no blur at all.`,

  // o rabisco-riso: a mão da casa treme um pouco, e é isso que separa nosso desenho de um ícone
  'rabisco': `${HINT} ${REGRA} CHANGE ONE THING vs Image 2: the contour is HAND-DRAWN with slight
wobble and imperfection, as if inked with a brush pen — the circle is not geometrically perfect
and the panel edges are slightly uneven.`,

  // as cores da marca no lugar do preto e branco de bola genérica
  'verde-marca': `${HINT} ${REGRA} CHANGE ONE THING vs Image 2: the ball's dark panels are DEEP
GRASS GREEN instead of black, keeping the black only for the outline.`,

  // o gibi impresso barato: meio-tom, que é a textura declarada da marca
  'meio-tom': `${HINT} ${REGRA} CHANGE ONE THING vs Image 2: the cream panels carry a visible
BEN-DAY HALFTONE dot pattern, like cheap comic book printing. Dots must be big enough to read as
dots, not as noise.`,

  // o balão de fala de quadrinho tem contorno mais grosso que o miolo: reforça a leitura de balão
  'balao-forte': `${HINT} ${REGRA} CHANGE ONE THING vs Image 2: make the SPEECH BALLOON reading
stronger — the outer contour and the tail are noticeably thicker and rounder, like a comic speech
bubble, while the ball panels inside are drawn with thinner lines.`,
};

const modelo = MODELOS_IMAGEM.codex;
if (so && !VARIANTES[so]) {
  console.error(`FAIL "${so}" nao existe (tem: ${Object.keys(VARIANTES).join(', ')})`);
  process.exit(1);
}

await mkdir(SAIDA, { recursive: true });

const alvo = so ? { [so]: VARIANTES[so] } : VARIANTES;
for (const [id, prompt] of Object.entries(alvo)) {
  const outRel = `_marca-futgibi/bola2-${id}.png`;
  const outAbs = path.join(CONTEUDO, outRel);
  console.log(`\n>>> ${id}`);
  try {
    await modelo.gerar({
      composed: prompt.replace(/\s+/g, ' ').trim(),
      outRel,
      orient: '\nThe image must be SQUARE, 1:1 aspect ratio.',
      refs: REFS,
    }, outAbs);
    await access(outAbs);
    const destino = path.join(SAIDA, `${id}.png`);
    await copyFile(outAbs, destino);
    console.log('OK ->', destino);
  } catch (e) {
    console.error(`FALHOU ${id}: ${e.message.slice(0, 90)}`);
  }
}
