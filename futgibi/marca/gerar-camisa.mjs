// A CAMISA 12 COMO LOGO. Decidido pelo Raphael depois de duas rodadas reprovadas.
//
// POR QUE ELA E NAO AS OUTRAS: as doze direções anteriores tentavam achar um símbolo para a marca.
// A camisa 12 não é um símbolo achado, é o CONCEITO que a marca já tinha desde o primeiro dia (o
// décimo segundo jogador é a torcida, e a camisa é lisa porque aqui não existe clube). O logo
// deixa de ilustrar a marca e passa a ser ela.
//
// A rodada anterior tinha uma camisa (6-camisa) e foi reprovada junto: lá ela era um enfeite ao
// lado do nome. Aqui ela é a peça inteira, e o que varia é O DESENHO DA CAMISA, não o arranjo.
//
//   node futgibi/marca/gerar-camisa.mjs
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import { CREME, PRETO, LARANJA, VERDE } from './tokens.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const SAIDA = path.join(AQUI, 'camisa');
const rnd = (s) => { const x = Math.sin(s * 12.9898) * 43758.5453; return x - Math.floor(x); };

// ---- A FORMA DA CAMISA -----------------------------------------------------------------------
// Proporção de camisa de futebol, não de camiseta: ombro largo, manga curta que sai em ângulo,
// corpo que afunila pouco, barra reta. A gola em V é a que lê melhor pequena, porque abre um vão
// escuro no alto e dá o "pescoço" que identifica a peça de longe.
const CAMISA = 'M 152,54 L 118,44 L 46,92 L 78,158 L 116,134 L 116,352 L 284,352 L 284,134 ' +
               'L 322,158 L 354,92 L 282,44 L 248,54 L 200,96 Z';

// a mesma forma com o contorno trêmulo do sistema
const tremida = (s) => CAMISA.replace(/(\d+),(\d+)/g, (m, x, y) =>
  `${(+x + (rnd(s + +x * 1.7) - 0.5) * 8).toFixed(1)},${(+y + (rnd(s + +y * 2.3) - 0.5) * 8).toFixed(1)}`);

// ---- O 12, desenhado (não é fonte) -----------------------------------------------------------
const UM = 'M 150,168 L 176,152 L 190,152 L 190,262 L 208,262 L 208,282 L 152,282 L 152,262 ' +
           'L 172,262 L 172,178 L 156,187 Z';
const DOIS = 'M 216,186 C 216,162 234,151 254,151 C 276,151 292,164 292,187 C 292,209 276,221 ' +
             '257,238 L 232,261 L 293,261 L 293,282 L 215,282 L 215,262 C 236,242 248,233 ' +
             '261,220 C 269,211 272,200 272,188 C 272,175 265,170 254,170 C 243,170 236,176 ' +
             '236,190 Z';

// O 12 desenhado tem centro em (221,216) e largura 143. A camisa útil vai de x=116 a x=284, então
// ele é recentrado em x=200 e descido pro meio do corpo, com margem: sem isso o "2" cruzava a
// borda direita e o vazado rasgava a silhueta.
const DOZE = (fill) => `<g transform="translate(200,236) scale(0.92) translate(-221,-216)"
    fill="${fill}"><path d="${UM}"/><path d="${DOIS}"/></g>`;

const svg = (corpo, fundo) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
${fundo ? `  <rect width="400" height="400" fill="${fundo}"/>\n` : ''}${corpo}
</svg>
`;

const LOGOS = {
  // 1. LIMPA: a silhueta cheia e o 12 VAZADO nela. Sem contorno, sem moldura. É a que mais
  //    sobrevive à redução, porque é uma mancha só.
  '1-limpa': (c) => svg(`
  <path d="${CAMISA}" fill="${c.tinta}"/>
  ${DOZE(c.papel)}`, c.fundo),

  // 2. TRAÇO: a camisa com o mesmo tremor das peças da marca. É a que amarra o logo ao sistema,
  //    porque o contorno é literalmente o mesmo dos balões.
  '2-traco': (c) => svg(`
  <path d="${tremida(7)}" fill="${c.papel}" stroke="${c.tinta}" stroke-width="13"
    stroke-linejoin="round"/>
  ${DOZE(c.tinta)}`, c.fundo),

  // 3. SELO: a camisa dentro do burst, que é o carimbo da marca. Junta os dois ativos num só.
  '3-selo': (c) => {
    const pts = [];
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2 - Math.PI / 2;
      const k = (i % 2 ? 0.78 : 1) * (1 + (rnd(11 + i * 4.7) - 0.5) * 0.1);
      pts.push(`${(200 + Math.cos(a) * 194 * k).toFixed(1)},${(200 + Math.sin(a) * 194 * k).toFixed(1)}`);
    }
    return svg(`
  <path d="M ${pts.join(' L ')} Z" fill="${c.acento}" stroke="${c.tinta}" stroke-width="11"
    stroke-linejoin="round"/>
  <g transform="translate(200,206) scale(0.74) translate(-200,-200)">
    <path d="${CAMISA}" fill="${c.papel}" stroke="${c.tinta}" stroke-width="14" stroke-linejoin="round"/>
    ${DOZE(c.tinta)}
  </g>`, c.fundo);
  },

  // 4. NO VARAL: a camisa pendurada, que é como ela aparece em quintal de casa depois da pelada.
  //    Traz uma cena inteira num desenho só.
  '4-varal': (c) => svg(`
  <path d="M 20,74 L 380,60" stroke="${c.tinta}" stroke-width="10" fill="none" stroke-linecap="round"/>
  <path d="M 176,64 L 200,44 L 224,62" stroke="${c.tinta}" stroke-width="9" fill="none"
    stroke-linecap="round" stroke-linejoin="round"/>
  <g transform="translate(200,220) scale(0.92) translate(-200,-200)">
    <path d="${CAMISA}" fill="${c.papel}" stroke="${c.tinta}" stroke-width="13" stroke-linejoin="round"/>
    ${DOZE(c.tinta)}
  </g>`, c.fundo),

  // 5. BLOCO: a camisa com a sombra dura do sistema. A leitura mais neobrutalista.
  '5-bloco': (c) => svg(`
  <g transform="translate(16,16)"><path d="${CAMISA}" fill="${c.tinta}"/></g>
  <path d="${CAMISA}" fill="${c.acento}" stroke="${c.tinta}" stroke-width="12" stroke-linejoin="round"/>
  ${DOZE(c.tinta)}`, c.fundo),

  // 6. RECORTADA: a camisa vazada dentro de um quadrado cheio. Vira ícone de app sem esforço.
  // a camisa vazada no quadrado. `vazio` é a cor que aparece DENTRO do número, e ela não pode ser
  // igual à da camisa: no mono e no invertido as duas caíam na mesma cor e a peça sumia inteira.
  '6-recortada': (c) => {
    const bloco = c.acento === c.papel ? c.tinta : c.acento;
    return svg(`
  <rect x="14" y="14" width="372" height="372" rx="30" fill="${bloco}"
    stroke="${c.tinta}" stroke-width="13"/>
  <g transform="translate(200,208) scale(0.82) translate(-200,-200)">
    <path d="${CAMISA}" fill="${c.papel}"/>
    ${DOZE(bloco)}
  </g>`, c.fundo);
  },
};

const TESTES = {
  cor:       { tinta: PRETO, papel: CREME, acento: LARANJA, fundo: CREME },
  mono:      { tinta: PRETO, papel: CREME, acento: CREME, fundo: CREME },
  invertido: { tinta: CREME, papel: VERDE, acento: VERDE, fundo: VERDE },
};

await mkdir(SAIDA, { recursive: true });
for (const [id, fn] of Object.entries(LOGOS)) {
  for (const [teste, c] of Object.entries(TESTES)) {
    await writeFile(path.join(SAIDA, `${id}-${teste}.svg`), fn(c));
  }
}
console.log(`OK -> ${SAIDA} (${Object.keys(LOGOS).length} camisas)`);
