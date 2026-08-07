// carimbo.test.mjs — O CARIMBO DE PROGRESSO AINDA CARIMBA. Roda em segundos, não gera imagem por IA.
//
// POR QUE EXISTE: o carimbo "3/8" é overlay por código no export do carrossel. O modo de falhar
// dele é o mesmo do gate de escala que virou no-op por meses: parar de desenhar EM SILÊNCIO (a
// fonte muda de lugar no sistema, o sharp troca de API, alguém mexe no canto) e o export continuar
// devolvendo ok:true com slides sem número nenhum. Aqui a gente MEDE o pixel: se o canto não mudou,
// não carimbou.
//
//   node scripts/testes/carimbo.test.mjs
import { carimbarCopias, carimbarProgresso, CANTOS, CANTO_PADRAO } from '../../server/lib/carimbo.mjs';
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

const dir = await mkdtemp(path.join(tmpdir(), 'carimbo-'));
const W = 1080, H = 1350;

// slide de mentira: chapado, pra qualquer pixel diferente ser obra do carimbo
async function slide(nome) {
  const abs = path.join(dir, nome);
  await sharp({ create: { width: W, height: H, channels: 3, background: '#cccccc' } }).png().toFile(abs);
  return abs;
}
// quanto do recorte deixou de ser cinza. O PASSO SAI DO info.channels: depois do composite
// o PNG ganha canal alfa, e ler com passo fixo de 3 desalinha e acusa mudança onde não houve
// (foi o que reprovou este teste na primeira rodada).
async function mudou(abs, { left, top, w, h }) {
  const { data, info } = await sharp(abs).extract({ left, top, width: w, height: h })
    .raw().toBuffer({ resolveWithObject: true });
  const passo = info.channels;
  let n = 0, total = 0;
  for (let i = 0; i < data.length; i += passo) { total++; if (Math.abs(data[i] - 204) > 12) n++; }
  return n / total;
}
const cantoPadrao = { left: Math.round(W * 0.01), top: Math.round(H * 0.01), w: Math.round(W * 0.19), h: Math.round(H * 0.11) };
const outroCanto = { left: Math.round(W * 0.80), top: Math.round(H * 0.88), w: Math.round(W * 0.19), h: Math.round(H * 0.11) };

console.log('\n== O CARIMBO DESENHA (e no canto pedido) ==');

await teste('carimba 3/8 no canto padrão (superior esquerdo)', async () => {
  const abs = await slide('a.png');
  const antes = await mudou(abs, cantoPadrao);
  const r = await carimbarProgresso({ abs, indice: 3, total: 8 });
  ok_(r && r.texto === '3/8', `devolveu ${JSON.stringify(r)}`);
  const depois = await mudou(abs, cantoPadrao);
  ok_(antes === 0, 'o slide de teste já vinha sujo');
  ok_(depois > 0.05, `o canto quase não mudou (${(depois * 100).toFixed(1)}%): provavelmente não desenhou`);
});

await teste('o canto escolhido é o canto usado', async () => {
  const abs = await slide('b.png');
  await carimbarProgresso({ abs, indice: 2, total: 6, canto: 'inferior-direito' });
  const noAlvo = await mudou(abs, outroCanto);
  const noPadrao = await mudou(abs, cantoPadrao);
  ok_(noAlvo > 0.05, `nada desenhado no inferior direito (${(noAlvo * 100).toFixed(1)}%)`);
  ok_(noPadrao === 0, 'desenhou também no canto padrão: o parâmetro de canto foi ignorado');
});

await teste('o padrão é o superior esquerdo', async () => {
  ok_(CANTO_PADRAO === 'superior-esquerdo', `padrão virou ${CANTO_PADRAO}: o selo da estrela mora no superior direito`);
});

await teste('a imagem continua íntegra e do mesmo tamanho', async () => {
  const abs = await slide('c.png');
  await carimbarProgresso({ abs, indice: 1, total: 4 });
  const m = await sharp(abs).metadata();
  ok_(m.width === W && m.height === H, `virou ${m.width}x${m.height}`);
});

console.log('\n== NÃO CARIMBA QUANDO NÃO FAZ SENTIDO ==');

await teste('carrossel de 1 slide não leva "1/1"', async () => {
  const abs = await slide('d.png');
  const r = await carimbarProgresso({ abs, indice: 1, total: 1 });
  ok_(r === null, 'devolveu carimbo pra carrossel de um slide só');
  ok_((await mudou(abs, cantoPadrao)) === 0, 'desenhou mesmo assim');
});

await teste('índice ou total inválido não desenha nada', async () => {
  const abs = await slide('e.png');
  ok_((await carimbarProgresso({ abs, indice: null, total: 8 })) === null, 'aceitou índice nulo');
  ok_((await carimbarProgresso({ abs, indice: 2, total: '8' })) === null, 'aceitou total como string');
  ok_((await mudou(abs, cantoPadrao)) === 0, 'desenhou com entrada inválida');
});

await teste('todos os cantos do catálogo desenham', async () => {
  for (const canto of Object.keys(CANTOS)) {
    const abs = await slide(`f-${canto}.png`);
    const r = await carimbarProgresso({ abs, indice: 5, total: 9, canto });
    ok_(r !== null, `canto ${canto} não carimbou`);
    ok_(r.x >= 0 && r.y >= 0 && r.x + r.w <= W && r.y + r.h <= H, `canto ${canto} saiu da imagem: ${JSON.stringify(r)}`);
  }
});

console.log('\n== NENHUM NÚMERO SOME (o bug do glifo NaN) ==');

// Tinta DENTRO da pílula (sem o contorno): é aqui que o dígito aparece. Medir a pílula
// inteira não serve — o contorno preto responde pela maior parte dos pixels e mascara um
// glifo que sumiu (foi assim que a primeira versão deste teste passou com o bug presente).
async function tintaNoMiolo(abs, r) {
  const inset = Math.round(r.h * 0.22);
  const { data, info } = await sharp(abs)
    .extract({ left: r.x + inset, top: r.y + inset, width: r.w - inset * 2, height: r.h - inset * 2 })
    .raw().toBuffer({ resolveWithObject: true });
  let escuro = 0, total = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    total++; if (l < 100) escuro++;
  }
  return escuro / total;
}

await teste('todo par índice/total de 2 a 10 slides desenha o número inteiro', async () => {
  // O opentype cospe NaN em certos glifos/posições e um só NaN faz o renderizador abortar
  // o path INTEIRO, sem erro nenhum: no episódio do guardanapo o "2/6" virou um tracinho.
  // Os pares que reproduzem hoje são 3/3, 4/4, 2/6, 5/8, 2/10 — mas a lista muda com a
  // fonte e com o tamanho, então o teste varre todos em vez de fixar os conhecidos.
  const medidas = [];
  for (let total = 2; total <= 10; total++) {
    for (let i = 1; i <= total; i++) {
      const abs = await slide(`n-${i}-${total}.png`);
      const r = await carimbarProgresso({ abs, indice: i, total });
      ok_(r !== null, `${i}/${total} não carimbou`);
      medidas.push({ nome: `${i}/${total}`, v: await tintaNoMiolo(abs, r) });
    }
  }
  const ordenado = medidas.map((m) => m.v).sort((a, b) => a - b);
  const mediana = ordenado[Math.floor(ordenado.length / 2)];
  const fracos = medidas.filter((m) => m.v < mediana * 0.6);
  ok_(!fracos.length,
    `número(s) com tinta muito abaixo da mediana (glifo sumiu): ` +
    fracos.map((m) => `${m.nome}=${(m.v * 100).toFixed(1)}%`).join(', ') +
    ` · mediana=${(mediana * 100).toFixed(1)}%`);
});

console.log('\n== A SEQUÊNCIA DO VÍDEO (carimbarCopias) ==');

// O vídeo do quadrinho monta a partir da arte ORIGINAL do painel, não de um slide derivado.
// Os dois modos de falhar aqui são opostos e igualmente ruins: não carimbar nada (o vídeo
// sai sem o progresso que o carrossel tem) ou carimbar bem demais, escrevendo na arte do
// disco (o "2/5" grudaria no PNG que também vira mosaico, story e print).

await teste('N painéis viram N cópias carimbadas, na ordem', async () => {
  const pngs = [];
  for (let i = 1; i <= 4; i++) pngs.push(await slide(`seq-${i}.png`));
  const trabalho = await mkdtemp(path.join(tmpdir(), 'carimbo-seq-'));

  const { usar, carimbo } = await carimbarCopias({ pngs, dir: trabalho });
  ok_(usar.length === 4, `devolveu ${usar.length} caminhos pra 4 painéis`);
  ok_(carimbo && carimbo.total === 4, `resumo veio ${JSON.stringify(carimbo)}`);
  for (const [i, u] of usar.entries()) {
    ok_(u !== pngs[i], `painel ${i + 1} voltou o original: não carimbou`);
    ok_((await mudou(u, cantoPadrao)) > 0.05, `a cópia do painel ${i + 1} está sem número`);
  }
  await rm(trabalho, { recursive: true, force: true });
});

await teste('a arte do painel no disco continua limpa', async () => {
  const pngs = [await slide('limpo-1.png'), await slide('limpo-2.png')];
  const trabalho = await mkdtemp(path.join(tmpdir(), 'carimbo-seq-'));
  await carimbarCopias({ pngs, dir: trabalho });
  for (const p of pngs) ok_((await mudou(p, cantoPadrao)) === 0, `${path.basename(p)} foi carimbado no lugar`);
  await rm(trabalho, { recursive: true, force: true });
});

await teste('painel sozinho não carimba e devolve o próprio original', async () => {
  const pngs = [await slide('solo.png')];
  const trabalho = await mkdtemp(path.join(tmpdir(), 'carimbo-seq-'));
  const { usar, carimbo } = await carimbarCopias({ pngs, dir: trabalho });
  ok_(carimbo === null, 'devolveu carimbo pra painel único');
  ok_(usar[0] === pngs[0], 'trocou o caminho do painel único por uma cópia');
  ok_((await mudou(pngs[0], cantoPadrao)) === 0, 'desenhou "1/1" mesmo assim');
  await rm(trabalho, { recursive: true, force: true });
});

await teste('o canto pedido vale pra sequência inteira', async () => {
  const pngs = [await slide('canto-1.png'), await slide('canto-2.png'), await slide('canto-3.png')];
  const trabalho = await mkdtemp(path.join(tmpdir(), 'carimbo-seq-'));
  const { usar } = await carimbarCopias({ pngs, dir: trabalho, canto: 'inferior-direito' });
  for (const [i, u] of usar.entries()) {
    ok_((await mudou(u, outroCanto)) > 0.05, `painel ${i + 1} não carimbou no inferior direito`);
    ok_((await mudou(u, cantoPadrao)) === 0, `painel ${i + 1} carimbou também no canto padrão`);
  }
  await rm(trabalho, { recursive: true, force: true });
});

await rm(dir, { recursive: true, force: true });
console.log(`\n${falhou ? 'FALHOU' : 'tudo ok'}: ${ok} passaram, ${falhou} falharam\n`);
process.exit(falhou ? 1 : 0);
