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

const estilos = JSON.parse(await readFile(path.join(CONTEUDO, 'data/project.json'), 'utf8')).estilos;
const prefixo = estilos.find((e) => e.id === 'rabisco-riso').stylePrefix;

const modelo = MODELOS_IMAGEM[modeloId];
if (!modelo) { console.error(`FAIL modelo "${modeloId}" nao existe`); process.exit(1); }

await mkdir(SAIDA, { recursive: true });
await mkdir(path.join(CONTEUDO, '_marca-futgibi'), { recursive: true });

const alvo = so ? { [so]: CENAS[so] } : CENAS;
if (so && !CENAS[so]) { console.error(`FAIL cena "${so}" nao existe (tem: ${Object.keys(CENAS).join(', ')})`); process.exit(1); }

for (const [id, cena] of Object.entries(alvo)) {
  const outRel = `_marca-futgibi/${id}.png`;
  const outAbs = path.join(CONTEUDO, outRel);
  console.log(`\n>>> ${id} (${modelo.curto})`);
  try {
    await modelo.gerar({
      composed: `${prefixo}\n\nSCENE: ${cena.replace(/\s+/g, ' ').trim()}`,
      outRel,
      // 3:4 e o formato da casa e o que o Instagram mostra inteiro
      orient: '\nThe image must be in PORTRAIT orientation with a 3:4 aspect ratio.',
      refs: [{ rel: REF, papel: 'estilo' }],
    }, outAbs);
    await access(outAbs);
    await copyFile(outAbs, path.join(SAIDA, `${id}.png`));
    console.log('OK ->', path.join(SAIDA, `${id}.png`));
  } catch (e) {
    console.error(`FALHOU ${id}: ${e.message}`);
  }
}
