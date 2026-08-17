// OUTROS CONCEITOS DE SÍMBOLO, no acabamento aprovado (17/08/2026).
//
// A rodada 2 achou o ACABAMENTO: traço inkado da casa, sombra dura laranja e meio-tom ben-day nos
// claros (a `meio-tom.png`, que o Raphael aprovou). O que ainda não foi explorado é o OBJETO: até
// aqui todo símbolo era a bola-balão, e a pergunta agora é se outro assunto do vocabulário da
// casa não diz "futebol em quadrinhos" melhor que ela.
//
// A REFERÊNCIA AQUI É DE ACABAMENTO, e só. Image 1 é a meio-tom, e o hint diz para copiar dela o
// tratamento e NÃO o assunto: sem essa frase o modelo desenha uma bola em cima de qualquer
// briefing, que é o modo de falhar de quem passa referência sem nomear o papel dela.
//
// O QUE NÃO PODE, e vale pra qualquer símbolo desta marca: escudo, brasão, estrela de cinco
// pontas, bandeira de país e par de cores de clube. O número 12 pode: é o do mascote, não o de
// um time.
//
//   node futgibi/marca/gerar-icone-conceitos.mjs [--so=<id>]
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, copyFile, access } from 'node:fs/promises';
import { MODELOS_IMAGEM } from '../../saga-fut-studio/server/providers/imagem.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const CONTEUDO = path.resolve(AQUI, '../../saga-fut');
const SAIDA = path.join(AQUI, '_icone-conceitos');

const flag = (n, p) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=')[1] ?? p;
const so = flag('so');

const REFS_DIR = path.join(CONTEUDO, '_marca-futgibi');
await mkdir(REFS_DIR, { recursive: true });
await copyFile(path.join(AQUI, '_bola-variantes/meio-tom.png'), path.join(REFS_DIR, 'ref-acabamento.png'));
const REFS = [{ rel: '_marca-futgibi/ref-acabamento.png' }];

const HINT = `Image 1 is a FINISH reference only. Copy from it: the thick hand-inked black
contour, the flat warm cream off-white fill, the visible BEN-DAY HALFTONE dot pattern on the light
areas, the solid orange hard shadow offset behind the silhouette with no blur, and the exact
cream/orange/black palette. Do NOT copy its subject — do not draw a soccer ball unless the brief
below asks for one.`;

const REGRA = `FLAT colours, NO gradients, NO 3D, NO photographic texture. Comic book ink, not
corporate vector icon. Single iconic logo mark, one clear silhouette, readable at 28 pixels.
Centred on a plain flat white background with generous empty margin. Absolutely NO club crest, NO
shield, NO heraldic badge, NO five-pointed star, NO national flag. The image must contain NO text
and NO letters. Square, 1:1.`;

// Oito assuntos do vocabulário da casa. Cada um responde "futebol em quadrinhos" por um caminho
// diferente: o objeto do futebol, o objeto do quadrinho, ou o cruzamento dos dois.
const CONCEITOS = {
  // o quadrinho como CONTINENTE: o painel é a unidade do formato, e a bola é o que está dentro
  'painel-bola': `${HINT} ${REGRA} SUBJECT: a single comic book PANEL — a rectangle with a thick
black border and slightly rounded corners — seen straight on, with a round soccer ball inside it
and three short diagonal speed lines behind the ball.`,

  // a rede é a textura mais reconhecível do futebol depois da bola, e vira balão sem esforço
  'rede-balao': `${HINT} ${REGRA} SUBJECT: a comic speech balloon whose inside is filled with the
DIAMOND MESH of a goal net, with a small pointed tail at the bottom left.`,

  // o apito é quem MANDA no jogo, e soprar é falar: o cruzamento é direto
  'apito-balao': `${HINT} ${REGRA} SUBJECT: a referee's whistle seen from the side, with a small
comic speech balloon coming out of its mouthpiece.`,

  // o mascote reduzido ao número: identifica sem citar clube nenhum
  'camisa-12': `${HINT} ${REGRA} SUBJECT: a plain football shirt seen from the front, short
sleeves, with a large number 12 on the chest. No crest, no stripes, no sponsor. This is the only
brief where a NUMBER is allowed.`,

  // o objeto que dá nome ao canal: a revista
  'gibi-dobrado': `${HINT} ${REGRA} SUBJECT: a folded comic magazine seen at a slight angle, its
cover facing us, with a small round soccer ball resting in front of its bottom corner.`,

  // o campo visto de cima é uma forma geométrica que ninguém confunde com outra coisa
  'campo-balao': `${HINT} ${REGRA} SUBJECT: a comic speech balloon whose inside shows a football
pitch seen from above — the centre circle and the halfway line drawn in cream on green — with a
small pointed tail at the bottom left.`,

  // a chuteira é o objeto mais pessoal do jogo
  'chuteira': `${HINT} ${REGRA} SUBJECT: a football boot seen from the side, simplified to a bold
pictogram, with its studs visible underneath and two short motion lines behind the heel.`,

  // a bandeirinha de escanteio: um dos poucos objetos do campo que não é de time nenhum
  'bandeirinha': `${HINT} ${REGRA} SUBJECT: a corner flag planted in the ground, the flag waving
to the right, drawn as a bold simple pictogram with a small tuft of grass at its base.`,
};

const modelo = MODELOS_IMAGEM.codex;
if (so && !CONCEITOS[so]) {
  console.error(`FAIL "${so}" nao existe (tem: ${Object.keys(CONCEITOS).join(', ')})`);
  process.exit(1);
}

await mkdir(SAIDA, { recursive: true });

const alvo = so ? { [so]: CONCEITOS[so] } : CONCEITOS;
for (const [id, prompt] of Object.entries(alvo)) {
  const outRel = `_marca-futgibi/icone-${id}.png`;
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
