// Ilustracao de MARCA do futgibi, gerada inteira pelo modelo (codex por padrao, grok por flag).
//
// POR QUE ELA NAO PASSA PELO `asset.mjs`: aquilo e a porta dos ASSETS, o que entra em video e em
// quadrinho, e o que justifica a porta unica sao os gates de sprite (ciclo, escala, orientacao,
// recorte no pe). Arte de marca nao e sprite: ela nao e fatiada, nao anima e nao entra em cena
// nenhuma. Os banners e as capas de destaque deste canal ja nascem fora do asset pelo mesmo motivo.
// O que ela HERDA e o que importa: o `stylePrefix` do rabisco-riso, lido do project.json, entao a
// ilustracao de marca e o acervo sao desenhados pela mesma regra e nao divergem com o tempo.
//
// A REFERENCIA E O MASCOTE, e isso vale a linha: o estilo da casa ensina por IMAGEM, nao por
// adjetivo (a ficha do estilo registra tres rodadas de adjetivo que nao seguraram e uma referencia
// que segurou). Mandar `torcedor-12/base.png` junto e o que faz a multidao sair no mesmo traco.
//
//   node futgibi/marca/gerar-ilustracao.mjs [--so=arquibancada] [--modelo=grok]
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, mkdir, copyFile, access } from 'node:fs/promises';
import { MODELOS_IMAGEM, MODELO_IMAGEM_PADRAO } from '../../saga-fut-studio/server/providers/imagem.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const CONTEUDO = path.resolve(AQUI, '../../saga-fut');
const SAIDA = path.join(AQUI, '_ilustracoes');
const REF = 'personagens/torcedor-12/base.png';        // relativa ao CONTEUDO, como o provider espera

const flag = (n, p) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=')[1] ?? p;
const modeloId = flag('modelo', MODELO_IMAGEM_PADRAO);
const so = flag('so');

// A REGRA DO CANAL, dita de forma exaustiva de proposito. A geracao de hoje inventou uma ESTRELA
// no peito do mascote mesmo com a ficha proibindo crest/logo/sponsor: "sem logo" nao cobre estrela
// na cabeca do modelo, e nao existe gate de escudo neste projeto pra pegar depois.
const SEM_CLUBE = `EVERY shirt in this image is a COMPLETELY PLAIN cream-white football shirt with
ONLY a black number 12 on the chest. Absolutely NO club crest, NO badge, NO star, NO emblem, NO
logo, NO sponsor, NO stripes, NO team colours and NO national flag anywhere in the image. No text
and no lettering of any kind anywhere in the image.`;

// As cenas candidatas do post de INAUGURACAO. Todas tem que dizer as tres coisas ao mesmo tempo:
// que esta comecando, que a ambicao e coletiva, e que a pessoa que ve esta convidada.
// PEÇAS DE INTERFACE desenhadas à mão, e o motivo de existirem: balão feito de `border-radius` mais
// um triângulo de CSS é sempre pobre, porque balão de quadrinho de verdade tem contorno IRREGULAR,
// de traço trêmulo. O mesmo vale pra moldura de painel e pra tarja. Elas saem numa folha sobre
// fundo chapado, pra serem recortadas e viradas asset da marca.
const PECAS = {
  baloes: `A clean model sheet on a plain flat white background, showing SIX empty comic speech
balloons arranged in two rows of three, well separated from each other, each drawn with a thick
uneven hand-inked black outline and filled with flat cream-white, completely EMPTY inside with no
text and no lettering at all: (1) a normal rounded speech balloon with a pointed tail at the bottom
left, (2) a wider oval speech balloon with a tail at the bottom right, (3) a spiky burst balloon for
shouting, (4) a soft cloud-shaped thought balloon with three small circles trailing from it, (5) a
rectangular caption box with slightly wobbly edges, (6) a small round balloon with a short tail. No
characters, no background scenery, no colour other than the cream fill and the black outline.`,

  molduras: `A clean model sheet on a plain flat white background, showing FOUR empty comic panel
frames arranged in a two by two grid, well separated from each other, each one an empty rectangle
drawn with a thick uneven hand-inked black outline with slightly wobbly, imperfect edges, as if
inked by hand with a brush: one square, one wide, one tall, one with slightly torn ragged edges.
The inside of every frame is completely EMPTY flat white. No text, no lettering, no characters, no
scenery.`,

  tarjas: `A clean model sheet on a plain flat white background, showing FIVE empty banner and
ribbon shapes stacked vertically, well separated, each drawn with a thick uneven hand-inked black
outline and filled flat cream-white, completely EMPTY with no text: (1) a straight horizontal
banner with folded ends, (2) a slightly curved ribbon, (3) a torn strip of paper with ragged edges,
(4) a bold rectangular strip with a folded corner, (5) a pennant tapering to a point. No characters,
no scenery, no lettering of any kind.`,
};

const CENAS = {
  // 1. a multidao: o argumento da comunidade dito pelo NUMERO de gente, que e o que texto nenhum
  //    consegue fazer numa imagem
  arquibancada: `A packed football stadium terrace seen from the pitch, filling the whole frame: a
big cheerful crowd of MANY different supporters, men and women, children and old people, different
skin tones and body types, all of them wearing the same plain cream-white number 12 shirt, cheering
with their arms raised, some holding plain cream-white scarves above their heads. In the middle of
the front row, one supporter with warm brown skin and a flat mop of dark brown hair leans forward
smiling with one arm extended towards the viewer, palm open, inviting the viewer in. Warm evening
light. ${SEM_CLUBE}`,

  // 2. a roda: a comunidade dita pela INTIMIDADE em vez do numero. Aposta oposta a 1.
  roda: `A warm circle of about twelve different football supporters sitting and standing close
together on a grassy pitch, seen slightly from above, all of them wearing the same plain cream-white
number 12 shirt: men and women, kids and grandparents, different skin tones. They are all leaning in
and laughing at an open comic book held in the middle of the circle by a supporter with warm brown
skin and a flat mop of dark brown hair, who is looking up at the viewer and waving them over to
join. One empty gap in the circle, closest to the viewer, left open like a saved seat.
${SEM_CLUBE}`,

  // 3. a banca: INAUGURAR dito literalmente, e o unico jeito de a imagem falar de "abrir" as portas
  banca: `A small friendly street newsstand that has just opened, seen from the front, its shutter
rolled all the way up and its racks full of colourful comic books about football. Behind the counter
stands a cheerful vendor with warm brown skin and a flat mop of dark brown hair, wearing a plain
cream-white number 12 shirt, holding up one comic book towards the viewer with a welcoming open
hand. A happy queue of many different supporters waits along the pavement, all of them in the same
plain cream-white number 12 shirt, chatting with each other. Warm morning light.
${SEM_CLUBE}`,
};


// ---------------------------------------------------------------- CENAS DIRECIONADAS ---------
// A arte é gerada JÁ COM A COMPOSIÇÃO EM MENTE. As primeiras cenas eram genéricas e o texto
// entrava depois, brigando: escurecer a arte pra caber texto é conserto, não projeto. Aqui a
// distribuição dos elementos é pedida no prompt, e cada cena nasce pro seu modo.
const DIRIGIDAS = {
  // pro modo RESPIRO: gente no ALTO, chão vazio embaixo pra receber o texto
  topo: `A group of many different football supporters gathered CLOSE TOGETHER IN THE UPPER THIRD
of the image, all of them wearing the same plain cream-white number 12 shirt: men and women,
children and old people, different skin tones, smiling and leaning towards the viewer, some with
arms raised. In the middle of the group one supporter with warm brown skin and a flat mop of dark
brown hair holds an open comic book. The ENTIRE LOWER HALF of the image is EMPTY: just flat open
grass with nothing on it, no people, no objects, no horizon line. Composition weighted heavily to
the top. ${SEM_CLUBE}`,

  // pro modo FAIXA: gente EMBAIXO, céu limpo em cima
  base: `A row of many different football supporters seen from the chest up, packed ALONG THE
BOTTOM EDGE of the image like a crowd leaning on a barrier, all wearing the same plain cream-white
number 12 shirt: men and women, children and old people, different skin tones, all looking up and
smiling towards the viewer. The ENTIRE UPPER TWO THIRDS of the image is EMPTY OPEN SKY, plain and
uncluttered, with nothing in it. Composition weighted heavily to the bottom. ${SEM_CLUBE}`,

  // pro modo RECORTE: fundo chapado pra remover, personagens agrupados no centro
  recorte: `A compact group of about eight different football supporters standing close together as
one single cluster in the CENTRE of the frame, all wearing the same plain cream-white number 12
shirt: men and women, children and old people, different skin tones, cheerful, some waving at the
viewer, one holding an open comic book. They are on a COMPLETELY PLAIN FLAT WHITE BACKGROUND with
absolutely nothing else: no ground, no shadow, no scenery, no horizon, no grass. The group must not
touch the edges of the image. ${SEM_CLUBE}`,
};

// ---------------------------------------------------------------- RODADA 2 (15/08/2026) -------
// O Raphael reprovou as duas artes dirigidas da rodada 1 ("mto estranhas"), e olhando dá pra dizer
// POR QUÊ: a `topo` era um paredão de vinte rostos minúsculos cortado ao meio, e a `base` era uma
// fileira dura de bustos flutuando na borda. As duas diziam "multidão" pelo NÚMERO, e número em
// escala pequena vira ruído. A rodada 2 diz o mesmo com MENOS gente MAIOR, e dá pra cada cena um
// apoio físico (a mureta, o gramado) pra ninguém flutuar.
const DIRIGIDAS2 = {
  // respiro v2: poucos, grandes, em arco, e o chão nasce contínuo pra receber o texto
  'topo2': `About seven different football supporters gathered in a friendly arc in the UPPER THIRD
of the image, seen from the waist up, LARGE in the frame: men and women, one child on a shoulder,
one old man, different skin tones, ALL of them without exception wearing the same plain cream-white
football shirt with a black number 12 visible on the chest, nobody in any other clothing colour, no
hats, no jackets, no sweaters, smiling warmly at the viewer. In the middle one supporter with warm brown skin and a flat mop of dark brown
hair holds up an open comic book. Below them the ENTIRE LOWER HALF of the image is one smooth
continuous field of flat green grass with NOTHING on it: no people, no objects, no horizon line, no
texture details. Composition weighted to the top, lower half completely empty. ${SEM_CLUBE}`,

  // faixa v2: a mureta dá o apoio físico que a fileira solta não tinha
  'base2': `Five different football supporters leaning on a low concrete stadium wall along the
BOTTOM EDGE of the image, seen from the chest up, LARGE in the frame: a woman, a man with a beard,
a child, an old woman, and in the middle a supporter with warm brown skin and a flat mop of dark
brown hair waving happily at the viewer. All wear the same plain cream-white number 12 shirt. Their
elbows rest on the wall, relaxed, like neighbours watching the street. The ENTIRE UPPER TWO THIRDS
of the image is EMPTY flat cream sky with nothing in it. Composition weighted to the bottom.
${SEM_CLUBE}`,

  // o herói: UM personagem grande com espaço negativo planejado, pro texto morar do lado
  'heroi': `One single football supporter with warm brown skin and a flat mop of dark brown hair,
wearing a plain cream-white number 12 shirt, standing LARGE on the RIGHT THIRD of the image on flat
green grass, seen full body, smiling and pointing with his whole arm towards the LEFT side of the
image, inviting. The LEFT TWO THIRDS of the image are completely EMPTY flat green grass and flat
cream sky, nothing else. ${SEM_CLUBE}`,

  // a leitura: o gesto mais literal do canal (futebol + gibi), pro canto de uma composição
  'leitura': `One single football supporter with warm brown skin and a flat mop of dark brown hair,
wearing a plain cream-white number 12 shirt, lying on his belly on flat green grass in the BOTTOM
RIGHT CORNER of the image, propped on his elbows, feet up crossed behind him, completely absorbed
reading an open comic book, smiling. The REST of the image is empty flat green grass with nothing
on it. ${SEM_CLUBE}`,
};

// ---------------------------------------------------------------- A ARTE DE CAPA --------------
// A capa do manual estava usando a arte da MULTIDÃO, que é retrato 3:4 com doze rostos, dentro de
// uma faixa larga: o corte comia metade das cabeças e o que sobrava era uma parede de gente
// pequena. Duas correções, e as duas são de composição, não de qualidade de desenho:
//
//   1. NASCE LARGA. A faixa da capa é ~2:1, e arte de retrato cortada nela nunca vai encaixar.
//   2. POUCOS ELEMENTOS, GRANDES. Capa boa tem UM assunto, e o resto é espaço. Multidão é o que
//      se usa quando se quer dizer "muita gente"; aqui o que se quer é dizer "gibi de futebol".
//
// O TERÇO DE BAIXO fica calmo em todas: é onde o cartucho da capa pousa.
const CAPAS = {
  // 1. o objeto: a bola parada na linha branca, sombra longa de fim de tarde. O mais icônico e o
  //    que menos depende de o modelo acertar rosto nenhum
  'capa-bola': `A single classic black and cream panelled football resting still on the white line
of a green grass pitch, seen from a low angle close to the ground, LARGE and centred slightly to
the left. Long soft shadow stretching to the right in warm late afternoon light. An open comic book
lies flat on the grass next to the ball. Nothing else in the frame: no people, no stadium, no
goal, just grass, the ball, the comic and the empty green space to the right. Wide calm
composition, the lower third of the image is plain empty grass. ${SEM_CLUBE}`,

  // 2. o mascote SOZINHO, de costas, na arquibancada vazia lendo. Poético e é a cena do canal
  'capa-leitor': `One single football supporter with warm brown skin and a flat mop of dark brown
hair, wearing a plain cream-white number 12 shirt, sitting alone on an empty stadium terrace bench
seen from BEHIND and slightly to the side, reading an open comic book on his lap, relaxed. He is
positioned on the RIGHT THIRD of the image. The empty green pitch stretches away to the LEFT under
warm evening light, wide and calm, with nothing on it. No crowd, no other people anywhere.
${SEM_CLUBE}`,

  // 3. a natureza-morta: os objetos da casa arrumados no gramado, sem ninguém
  'capa-objetos': `A simple still life arranged on flat green grass, seen from directly above:
a classic black and cream panelled football, an open comic book, a black football boot and a
silver referee whistle, all spaced apart from each other in a relaxed horizontal row across the
middle of the frame. Warm daylight, soft shadows. No people at all, no stadium, nothing else. The
grass around and below the objects is completely empty. ${SEM_CLUBE}`,

  // 4. a banca fechando o dia: objeto grande, um personagem pequeno de costas, muito ar
  'capa-banca': `A small friendly street newsstand seen from across the street, standing on the
RIGHT side of the image, its racks full of colourful comic books about football. One single small
figure with warm brown skin and a flat mop of dark brown hair, wearing a plain cream-white number
12 shirt, stands with his back to the viewer looking at the comics. The LEFT HALF of the image is
a calm empty street and warm evening sky with nothing in it. Wide, quiet composition, few
elements, lots of empty space. ${SEM_CLUBE}`,
};

// ---------------------------------------------------------------- OS OBJETOS DE APOIO ---------
// Assets AUXILIARES: os objetos pequenos que decoram uma composição sem pedir atenção (a bola no
// canto, o apito ao lado do selo, o radinho da Memória). Saem numa folha sobre fundo branco e o
// `recortar-objetos.mjs` fatia cada um em PNG transparente. São o vocabulário de DETALHE que
// faltava entre a ilustração grande e o ícone de 48px.
const OBJETOS = {
  objetos: `A clean model sheet on a plain flat white background, showing NINE separate objects
arranged in a three by three grid, well separated from each other, never touching, each drawn as a
cheerful comic doodle with a thick uneven hand-inked black outline and flat colours: (1) a classic
black and cream panelled football, (2) a silver referee whistle, (3) a plain cream scarf with a
black number 12, (4) a black football boot, (5) an open comic book seen from the front, (6) a
closed comic book, (7) an orange traffic cone, (8) a corner flag, (9) a small old portable radio.
No characters, no scenery, no text and no lettering of any kind anywhere. ${''}`,

  detalhes: `A clean model sheet on a plain flat white background, showing EIGHT separate small
comic emphasis doodles arranged in two rows of four, well separated, never touching, each drawn
with a thick uneven hand-inked black line: (1) three short curved motion lines, (2) a small spiral,
(3) a spiky impact burst with many irregular points, (4) two small drops of sweat, (5) a small
puff of dust cloud, (6) three little confetti strips, (7) a small musical note shape made of
curved lines, (8) four short straight emphasis dashes radiating outward. All black line only, no
fill, no characters, no text, no lettering, no five-pointed stars anywhere.`,
};

const estilos = JSON.parse(await readFile(path.join(CONTEUDO, 'data/project.json'), 'utf8')).estilos;
const prefixo = estilos.find((e) => e.id === 'rabisco-riso').stylePrefix;

const modelo = MODELOS_IMAGEM[modeloId];
if (!modelo) { console.error(`FAIL modelo "${modeloId}" nao existe`); process.exit(1); }

await mkdir(SAIDA, { recursive: true });
await mkdir(path.join(CONTEUDO, '_marca-futgibi'), { recursive: true });

const TUDO = { ...CENAS, ...DIRIGIDAS, ...DIRIGIDAS2, ...CAPAS, ...OBJETOS, ...PECAS };
// folha de objetos é QUADRADA e sem referência de personagem, como as peças
const SEM_REF = (id) => PECAS[id] || OBJETOS[id];
const alvo = so ? { [so]: TUDO[so] } : TUDO;
if (so && !TUDO[so]) { console.error(`FAIL "${so}" nao existe (tem: ${Object.keys(TUDO).join(', ')})`); process.exit(1); }

for (const [id, cena] of Object.entries(alvo)) {
  const outRel = `_marca-futgibi/${id}.png`;
  const outAbs = path.join(CONTEUDO, outRel);
  console.log(`\n>>> ${id} (${modelo.curto})`);
  try {
    await modelo.gerar({
      composed: `${prefixo}\n\nSCENE: ${cena.replace(/\s+/g, ' ').trim()}`,
      outRel,
      // 3:4 e o formato da casa e o que o Instagram mostra inteiro
      // a capa nasce LARGA porque a faixa dela é larga: retrato cortado em faixa nunca encaixa
      orient: CAPAS[id]
        ? '\nThe image must be in WIDE LANDSCAPE orientation, 2:1 aspect ratio.'
        : SEM_REF(id)
        ? '\nThe image must be SQUARE, 1:1 aspect ratio.'
        : '\nThe image must be in PORTRAIT orientation with a 3:4 aspect ratio.',
      // peça de interface e objeto não levam referência de personagem: não há rosto pra herdar
      refs: SEM_REF(id) ? [] : [{ rel: REF, papel: 'estilo' }],
    }, outAbs);
    await access(outAbs);
    await copyFile(outAbs, path.join(SAIDA, `${id}.png`));
    console.log('OK ->', path.join(SAIDA, `${id}.png`));
  } catch (e) {
    console.error(`FALHOU ${id}: ${e.message}`);
  }
}
