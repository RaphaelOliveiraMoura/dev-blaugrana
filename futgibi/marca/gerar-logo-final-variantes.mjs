// A RODADA FINAL: cor, tonalidade e detalhe dos TRÊS finalistas (17/08/2026).
//
// O funil até aqui: oito conceitos no acabamento aprovado (meio-tom) → o Raphael escolheu três
// (apito-balão, painel-bola, camisa-12) → esta rodada varia COR, TOM e UM DETALHE de cada um,
// pra decidir qual combina mais com o wordmark. A pergunta desta folha não é forma nem
// acabamento: é PALETA e temperatura ao lado do lettering.
//
// Quatro variações por finalista, as mesmas quatro perguntas pros três (senão a folha não
// compara): 1) o corpo em VERDE-CAMPO, que é a cor da marca e ainda não apareceu em símbolo
// nenhum; 2) o corpo em LARANJA, a temperatura do lettering; 3) a SOMBRA em verde, mantendo o
// corpo creme (a variação mais sutil: só tonalidade); 4) UM DETALHE próprio do conceito, porque
// cor não é o único parafuso que existe.
//
// Referência: a própria peça, uma imagem só, com papel nomeado (ela já carrega forma E
// acabamento). A lição das rodadas anteriores continua valendo: sem referência sai ícone de
// biblioteca, e referência sem papel nomeado sai misturada.
//
//   node futgibi/marca/gerar-logo-final-variantes.mjs [--so=<icone--variante>]
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, copyFile, access } from 'node:fs/promises';
import { MODELOS_IMAGEM } from '../../saga-fut-studio/server/providers/imagem.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const CONTEUDO = path.resolve(AQUI, '../../saga-fut');
const SAIDA = path.join(AQUI, '_logo-final');

const flag = (n, p) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=')[1] ?? p;
const so = flag('so');

const REFS_DIR = path.join(CONTEUDO, '_marca-futgibi');
await mkdir(REFS_DIR, { recursive: true });

const hint = (oQue) => `Image 1 is the mark to REDRAW EXACTLY: same silhouette, same hand-inked
black contour, same ben-day halftone dots on the light areas, same hard offset shadow with no
blur. ${oQue} Everything else stays identical to Image 1.`;

const REGRA = `FLAT colours, NO gradients, NO 3D, NO photographic texture. The only colours
allowed are: warm cream off-white, near-black, bright orange and deep grass green. Centred on a
plain flat white background with generous empty margin. NO club crest, NO shield, NO five-pointed
star, NO flag. No text and no letters beyond what Image 1 already has. Square, 1:1.`;

// as quatro perguntas, por finalista
const RODADA = {
  'apito-balao': {
    'verde': hint(`CHANGE ONE THING: the whistle BODY becomes deep grass green (keep the halftone
dots visible on it); the balloon stays cream.`),
    'laranja': hint(`CHANGE ONE THING: the whistle BODY becomes bright orange (keep the halftone
dots visible on it); the balloon stays cream.`),
    'sombra-verde': hint(`CHANGE ONE THING: the hard offset shadow becomes deep grass green
instead of orange. All fills stay as in Image 1.`),
    'bolinha': hint(`CHANGE ONE THING: inside the small speech balloon, add a tiny round soccer
ball with classic pentagon panels.`),
  },
  'painel-bola': {
    'verde': hint(`CHANGE ONE THING: the panel BACKGROUND behind the ball becomes deep grass
green, so the panel reads as a piece of pitch; the ball stays cream with black panels.`),
    'laranja': hint(`CHANGE ONE THING: the panel BACKGROUND behind the ball becomes bright
orange; the ball stays cream with black panels.`),
    'sombra-verde': hint(`CHANGE ONE THING: the hard offset shadow becomes deep grass green
instead of orange. All fills stay as in Image 1.`),
    'torto': hint(`CHANGE ONE THING: the whole panel is slightly TILTED (about 4 degrees), like a
comic panel pasted by hand, shadow following it.`),
  },
  'camisa-12': {
    'verde': hint(`CHANGE ONE THING: the SHIRT becomes deep grass green (keep the halftone dots
visible on it); the number 12 becomes cream so it stays readable.`),
    'laranja': hint(`CHANGE ONE THING: the SHIRT becomes bright orange (keep the halftone dots
visible on it); the number 12 stays black.`),
    'sombra-verde': hint(`CHANGE ONE THING: the hard offset shadow becomes deep grass green
instead of orange. All fills stay as in Image 1.`),
    'gola-laranja': hint(`CHANGE ONE THING: the collar and the sleeve cuffs become bright orange,
like a classic kit trim; the shirt stays cream and the 12 stays black.`),
  },
};

const modelo = MODELOS_IMAGEM.codex;
await mkdir(SAIDA, { recursive: true });

for (const [icone, variantes] of Object.entries(RODADA)) {
  // a referência é a peça PREPARADA da reserva, não o rascunho do modelo
  await copyFile(path.join(AQUI, `icones-reserva/${icone}.png`),
    path.join(REFS_DIR, `ref-${icone}.png`));
  for (const [varId, prompt] of Object.entries(variantes)) {
    const id = `${icone}--${varId}`;
    if (so && so !== id) continue;
    const outRel = `_marca-futgibi/final-${id}.png`;
    const outAbs = path.join(CONTEUDO, outRel);
    console.log(`\n>>> ${id}`);
    try {
      await modelo.gerar({
        composed: `${prompt} ${REGRA}`.replace(/\s+/g, ' ').trim(),
        outRel,
        orient: '\nThe image must be SQUARE, 1:1 aspect ratio.',
        refs: [{ rel: `_marca-futgibi/ref-${icone}.png` }],
      }, outAbs);
      await access(outAbs);
      const destino = path.join(SAIDA, `${id}.png`);
      await copyFile(outAbs, destino);
      console.log('OK ->', destino);
    } catch (e) {
      console.error(`FALHOU ${id}: ${e.message.slice(0, 90)}`);
    }
  }
}
