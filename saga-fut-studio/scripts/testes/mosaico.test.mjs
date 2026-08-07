// mosaico.test.mjs — TODO PAINEL ENTRA NO MOSAICO. Roda em segundos, não gera imagem por IA.
//
// POR QUE EXISTE: o mosaico monta a grade com o xstack do ffmpeg, e o parser de layout dele
// NÃO avalia multiplicação (`w0*2`) — descarta a célula em SILÊNCIO, sem aviso, sem código de
// erro. Com 8 painéis (grade 3x3) isso comia a terceira coluna e a terceira linha: sumiam 4
// dos 8 painéis e o que sobrava vazava com listras de lixo, porque a tela nascia menor que o
// conteúdo. O ffmpeg devolvia 0 e o studio dizia "mosaico pronto".
//
// A régua aqui é de RESULTADO, não de string: cada painel entra com uma cor sólida única e o
// teste procura essas cores no mosaico. Painel que não entrou não tem como se esconder.
//
//   node scripts/testes/mosaico.test.mjs
import { montarMosaico, DIM_POST } from '../../server/lib/imagem.mjs';
import sharp from 'sharp';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

let ok = 0, falhou = 0;
const teste = async (nome, fn) => {
  try { await fn(); console.log(`  ok   ${nome}`); ok++; }
  catch (e) { console.log(`  FALHOU ${nome}\n         ${e.message}`); falhou++; }
};
const ok_ = (cond, msg) => { if (!cond) throw new Error(msg); };

const dir = await mkdtemp(path.join(tmpdir(), 'mosaico-'));

// cores bem separadas no espaço RGB, pra vizinhança de compressão não confundir uma com a outra
const CORES = [
  [220, 20, 20], [20, 200, 20], [20, 20, 220], [230, 230, 20],
  [230, 20, 230], [20, 220, 220], [250, 130, 20], [130, 20, 250],
  [20, 130, 90], [120, 60, 20],
];

async function painelDaCor(i) {
  const abs = path.join(dir, `p${i}.png`);
  const [r, g, b] = CORES[i];
  // 3:4, do tamanho de um painel de verdade
  await sharp({ create: { width: 1080, height: 1440, channels: 3, background: { r, g, b } } }).png().toFile(abs);
  return abs;
}

// que fração do mosaico é (aproximadamente) esta cor
async function fracaoDaCor(abs, [r, g, b]) {
  const { data, info } = await sharp(abs).resize(300, null, { fit: 'inside' }).raw().toBuffer({ resolveWithObject: true });
  let n = 0, total = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    total++;
    if (Math.abs(data[i] - r) < 40 && Math.abs(data[i + 1] - g) < 40 && Math.abs(data[i + 2] - b) < 40) n++;
  }
  return n / total;
}

console.log('\n== NENHUM PAINEL SOME DA GRADE ==');

for (const n of [2, 3, 4, 5, 6, 7, 8, 9, 10]) {
  await teste(`mosaico de ${n} painéis mostra os ${n}`, async () => {
    const pngs = [];
    for (let i = 0; i < n; i++) pngs.push(await painelDaCor(i));
    const saida = path.join(dir, `mosaico-${n}.png`);
    await montarMosaico({ pngs, dim: DIM_POST['4:5'], saida, fundo: '0xffffff' });

    const faltando = [];
    for (let i = 0; i < n; i++) {
      // cada célula ocupa ~1/n do quadro; 30% disso já é presença inequívoca
      if (await fracaoDaCor(saida, CORES[i]) < (1 / n) * 0.3) faltando.push(i + 1);
    }
    ok_(!faltando.length, `painéis fora do mosaico: ${faltando.join(', ')} (de ${n})`);
  });
}

console.log('\n== A GRADE TEM O TAMANHO DA GRADE ==');

await teste('o mosaico sai exatamente no formato pedido', async () => {
  const pngs = [];
  for (let i = 0; i < 8; i++) pngs.push(await painelDaCor(i));
  for (const fmt of ['4:5', '1:1', '9:16']) {
    const saida = path.join(dir, `fmt-${fmt.replace(':', 'x')}.png`);
    await montarMosaico({ pngs, dim: DIM_POST[fmt], saida, fundo: '0xffffff' });
    const m = await sharp(saida).metadata();
    ok_(m.width === DIM_POST[fmt].w && m.height === DIM_POST[fmt].h,
      `${fmt} saiu ${m.width}x${m.height}, esperado ${DIM_POST[fmt].w}x${DIM_POST[fmt].h}`);
  }
});

await rm(dir, { recursive: true, force: true });
console.log(`\n${falhou ? 'FALHOU' : 'tudo ok'}: ${ok} passaram, ${falhou} falharam\n`);
process.exit(falhou ? 1 : 0);
