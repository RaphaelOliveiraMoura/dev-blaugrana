// LOGOTIPO PELO MODELO (15/08/2026). As rodadas anteriores foram todas desenhadas por código, e o
// Raphael pediu pra ver o que o Codex e o Grok fazem com o mesmo briefing.
//
// O QUE ESPERAR, pra ler a folha com o olho certo: modelo de imagem erra LETRA. Ele acerta forma,
// peso e atmosfera, e escreve "Fut Gibl", "FutGibl" ou inventa uma terceira letra. Por isso os
// prompts vêm em duas famílias:
//
//   · SÍMBOLO (sem texto nenhum): é onde o modelo é forte de verdade. O que sair daqui pode virar
//     a marca com o nome escrito por código do lado, que é como a maioria das marcas funciona.
//   · COMPLETO (com o nome desenhado): arriscado, mas quando acerta traz um lettering que nenhum
//     código nosso desenharia. Sai com o nome pedido letra a letra pra dar alguma chance.
//
// Os dois modelos rodam OS MESMOS prompts, porque a comparação é entre eles e não entre briefings.
//
// O QUE A PRIMEIRA RODADA ENSINOU SOBRE OS DOIS (15/08/2026), e vale pra toda geração futura:
//
//   · O CODEX OBEDECE O BRIEFING e o GROK INTERPRETA. Pedido "flat, fundo branco, sem gradiente",
//     o Codex entrega exatamente isso; o Grok põe fundo verde, textura e volume, e fica com cara
//     de e-sports. Pra LOGO o Codex ganha; pra cena e ilustração o Grok continua melhor, que é o
//     oposto e é por isso que os dois seguem no páreo.
//   · "FOOTBALL" NO GROK VIRA FUTEBOL AMERICANO. Duas das seis saíram com bola oval, porque o
//     modelo puxa o sentido dos Estados Unidos. Escreva SOCCER BALL, sempre, e diga "round" junto.
//   · A CAIXA DAS LETRAS ESCORREGA. O Grok escreveu "FuT GiBi" mesmo com a grafia dita letra a
//     letra. Texto de modelo é sempre rascunho: o nome definitivo entra por código depois.
//
//   node futgibi/marca/gerar-logo-ia.mjs [--so=simbolo-bola-balao] [--modelo=grok|codex]
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, copyFile, access } from 'node:fs/promises';
import { MODELOS_IMAGEM, MODELO_IMAGEM_PADRAO } from '../../saga-fut-studio/server/providers/imagem.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const CONTEUDO = path.resolve(AQUI, '../../saga-fut');
const SAIDA = path.join(AQUI, '_logo-ia');

const flag = (n, p) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=')[1] ?? p;
const modeloId = flag('modelo', MODELO_IMAGEM_PADRAO);
const so = flag('so');

// A REGRA DA CASA, dita pro modelo em caixa alta porque é o que ele obedece: a marca não tem
// clube, então não tem escudo, não tem estrela e não tem par de cores de time. E logo não tem
// sombra suave nem degradê: o acabamento é traço grosso e cor chapada.
const REGRA = `FLAT VECTOR LOGO design, thick bold black outlines, completely FLAT solid colours
with NO gradients, NO 3D, NO drop shadows, NO glow, NO photographic texture. The only colours
allowed are: deep grass green, warm cream off-white, bright orange and near-black. Clean, simple,
memorable, readable when very small. Centred on a plain flat white background with generous empty
margin around it. Absolutely NO club crest, NO shield, NO heraldic badge, NO five-pointed star, NO
national flag, NO sponsor mark.`;

const SEM_TEXTO = `The image must contain NO text, NO letters, NO words and NO numbers of any kind,
except where explicitly described.`;

// A bola tem que ser dita por extenso: "football" sozinho o Grok lê como futebol AMERICANO, e duas
// das seis primeiras saíram com bola oval.
const SOCCER = `The ball must be a ROUND association football (soccer ball) with classic hexagon
panels. It is NEVER an American football and never an oval ball.`;

const PROMPTS = {
  // ---------------------------------------------------------------- SÍMBOLOS (sem texto) -----
  // 1. o cruzamento exato do canal: bola e balão de fala são a mesma forma
  'simbolo-bola-balao': `A single iconic logo mark: a ROUND soccer ball that is ALSO a comic
speech balloon, seen from the front. The round ball shape has the classic black pentagon panels on
a cream white body, and a small pointed speech-balloon tail coming out of its bottom left, so the
ball reads as a balloon someone is speaking from. One shape, instantly readable. ${REGRA} ${SEM_TEXTO}`,

  // 2. o mascote reduzido a emblema: só o número, na camisa
  'simbolo-camisa-12': `A single iconic logo mark: a simple front view of a plain football shirt
with short sleeves, drawn as a bold flat symbol in cream white with a thick black outline, with a
large black number 12 on the chest. Nothing else on the shirt: no crest, no stripes, no sponsor.
The shirt shape is simplified and geometric, like a pictogram. ${REGRA}`,

  // 3. o objeto: a revista, dita pela forma
  'simbolo-gibi-bola': `A single iconic logo mark: an open comic book seen from the front, its two
pages forming a shape like a rounded letter shape, with a small ROUND soccer ball resting in the middle of
the fold. ${SOCCER} Bold flat pictogram, thick black outline, cream pages, green cover, orange ball accent.
Very simple and geometric, readable at small size. ${REGRA} ${SEM_TEXTO}`,

  // 4. o gesto: o que o canal faz é contar, e contar tem cara
  'simbolo-cabeca-balao': `A single iconic logo mark: an extremely simplified side profile of a
football supporter's head as a flat geometric pictogram in cream white with thick black outline,
with a small round speech balloon coming from the mouth, and inside the balloon a tiny ROUND soccer ball. ${SOCCER}
Minimal, bold, symmetrical, like an app icon. ${REGRA} ${SEM_TEXTO}`,

  // ---------------------------------------------------------------- COMPLETOS (com o nome) ---
  // 5. lettering de quadrinho: o que só um desenhista faria
  'completo-lettering': `A bold comic book style hand-lettered wordmark reading exactly
"Fut Gibi" (two separate words, capital F and capital G, all other letters lowercase, never all
caps). The letters are chunky, slightly irregular, hand-inked, with a thick black outline and flat
cream white fill, with a solid orange block shadow offset behind them. Under the wordmark, a thin
orange rule. ${REGRA}`,

  // 6. o nome dentro do objeto: a revista como suporte do lettering
  'completo-capa': `A logo shaped like a small comic magazine cover: a rectangle with a thick black
outline and a deep green field, and inside it the hand-lettered words "Fut Gibi" in cream white
(two separate words, capital F and capital G, the rest lowercase). A small ROUND soccer ball sits in the
bottom right corner inside the rectangle. ${SOCCER} ${REGRA}`,
};

const modelo = MODELOS_IMAGEM[modeloId];
if (!modelo) { console.error(`FAIL modelo "${modeloId}" nao existe`); process.exit(1); }
if (so && !PROMPTS[so]) { console.error(`FAIL "${so}" nao existe (tem: ${Object.keys(PROMPTS).join(', ')})`); process.exit(1); }

await mkdir(SAIDA, { recursive: true });
await mkdir(path.join(CONTEUDO, '_marca-futgibi'), { recursive: true });

const alvo = so ? { [so]: PROMPTS[so] } : PROMPTS;
for (const [id, prompt] of Object.entries(alvo)) {
  const outRel = `_marca-futgibi/logo-${modeloId}-${id}.png`;
  const outAbs = path.join(CONTEUDO, outRel);
  console.log(`\n>>> ${id} (${modelo.curto})`);
  try {
    await modelo.gerar({
      // SEM o stylePrefix do rabisco-riso de propósito: aquele estilo é de PERSONAGEM (traço de
      // caneta, textura de papel, cena) e logo é o oposto disso. Pedir os dois juntos dava
      // ilustração bonita e marca impossível de reduzir.
      composed: prompt.replace(/\s+/g, ' ').trim(),
      outRel,
      orient: '\nThe image must be SQUARE, 1:1 aspect ratio.',
      refs: [],
    }, outAbs);
    await access(outAbs);
    const destino = path.join(SAIDA, `${modeloId}-${id}.png`);
    await copyFile(outAbs, destino);
    console.log('OK ->', destino);
  } catch (e) {
    console.error(`FALHOU ${id}: ${e.message.slice(0, 90)}`);
  }
}
