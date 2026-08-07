// legenda.test.mjs — A LEGENDA POR CÓDIGO AINDA DESENHA, E NO LUGAR CERTO.
//
// POR QUE EXISTE: a legenda deixou de ser desenhada pela IA justamente porque texto de IA é
// sorteio de ortografia ("PEDRI PEGO A MOCHILA" saiu num painel aprovado). Trocar por código
// só vale se o código não falhar em silêncio: fonte que some do sistema, glifo com NaN que
// derruba o path inteiro (ver balao.mjs) ou caixa que escapa do quadro entregariam slide sem
// texto com ok:true. Aqui a régua é o PIXEL.
//
//   node scripts/testes/legenda.test.mjs
import { desenharLegendas } from '../../server/lib/legenda.mjs';
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

const dir = await mkdtemp(path.join(tmpdir(), 'legenda-'));
const W = 1080, H = 1350;

async function slide(nome) {
  const abs = path.join(dir, nome);
  await sharp({ create: { width: W, height: H, channels: 3, background: '#cccccc' } }).png().toFile(abs);
  return abs;
}
// fração de pixels que deixaram de ser o cinza do fundo, num recorte
async function mudou(abs, { left, top, w, h }) {
  const { data, info } = await sharp(abs).extract({ left, top, width: w, height: h })
    .raw().toBuffer({ resolveWithObject: true });
  let n = 0, total = 0;
  for (let i = 0; i < data.length; i += info.channels) { total++; if (Math.abs(data[i] - 204) > 12) n++; }
  return n / total;
}
// tinta preta DENTRO da caixa (só o texto: o miolo é creme, então preto ali é glifo)
async function tintaNoTexto(abs, c) {
  const m = Math.round(c.h * 0.18);
  const { data, info } = await sharp(abs)
    .extract({ left: c.x + m, top: c.y + m, width: c.w - m * 2, height: c.h - m * 2 })
    .raw().toBuffer({ resolveWithObject: true });
  let escuro = 0, total = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    total++; if (l < 100) escuro++;
  }
  return escuro / total;
}

console.log('\n== A CAIXA DESENHA ==');

await teste('uma legenda vira uma caixa com texto', async () => {
  const abs = await slide('a.png');
  const caixas = await desenharLegendas({ baseAbs: abs, textos: ['PEDRI PEGOU A MOCHILA E VOLTOU PARA TENERIFE.'] });
  ok_(caixas.length === 1, `devolveu ${caixas.length} caixa(s)`);
  const tinta = await tintaNoTexto(abs, caixas[0]);
  ok_(tinta > 0.04, `quase não desenhou letra dentro da caixa (${(tinta * 100).toFixed(1)}%)`);
});

await teste('duas legendas empilham sem se sobrepor', async () => {
  const abs = await slide('b.png');
  const [c1, c2] = await desenharLegendas({ baseAbs: abs, textos: ['PRIMEIRA LEGENDA DO PAINEL.', 'SEGUNDA LEGENDA DO PAINEL.'] });
  ok_(c1.y + c1.h <= c2.y, `as caixas se sobrepõem (1 termina em ${c1.y + c1.h}, 2 começa em ${c2.y})`);
  for (const c of [c1, c2]) ok_(await tintaNoTexto(abs, c) > 0.04, 'uma das caixas saiu sem letra');
});

await teste('texto longo encolhe a fonte em vez de virar parede', async () => {
  // A garantia NÃO é um número fixo de linhas (texto arbitrário sempre acha um jeito de
  // estourar): é que a caixa encolha a letra e NUNCA vire uma parede que tampa a arte.
  const abs = await slide('c.png');
  const longa = 'OS OLHEIROS DO REAL MADRID O CHAMARAM PARA UMA SEMANA DE TESTES EM VALDEBEBAS EM FEVEREIRO DE 2018.';
  const [c] = await desenharLegendas({ baseAbs: abs, textos: [longa] });
  ok_(c.x >= 0 && c.x + c.w <= W, `a caixa vazou na horizontal (x=${c.x}, w=${c.w})`);
  ok_(c.h < H * 0.20, `a caixa virou parede: ${c.h}px de ${H} (${(c.h/H*100).toFixed(0)}% do painel)`);

  // e a legenda curta continua no corpo cheio: o encolhimento é exceção, não padrão
  const abs2 = await slide('c2.png');
  const [curta] = await desenharLegendas({ baseAbs: abs2, textos: ['NEVOU. ELE TREINOU TRES.'] });
  ok_(curta.fontSize > c.fontSize, `o corpo não encolheu na longa (curta ${curta.fontSize}px, longa ${c.fontSize}px)`);
  ok_(curta.linhas.length <= 2, 'a legenda curta também quebrou demais');
});

console.log('\n== A CAIXA FICA DENTRO DO QUADRO ==');

await teste('nunca encosta na borda da imagem', async () => {
  const abs = await slide('d.png');
  const caixas = await desenharLegendas({ baseAbs: abs, textos: ['UMA.', 'DUAS.', 'TRES LEGENDAS NO MESMO PAINEL PRA TESTAR A PILHA.'] });
  const margem = Math.round(W * 0.04);
  for (const c of caixas) {
    ok_(c.x >= margem, `caixa colada na esquerda (x=${c.x})`);
    ok_(c.x + c.w <= W - margem, `caixa colada na direita (x+w=${c.x + c.w})`);
    ok_(c.y + c.h <= H - margem, `caixa colada na base (y+h=${c.y + c.h}, H=${H})`);
  }
});

await teste('a área da arte acima das caixas fica intocada', async () => {
  const abs = await slide('e.png');
  const caixas = await desenharLegendas({ baseAbs: abs, textos: ['LEGENDA UNICA.'] });
  const topo = await mudou(abs, { left: 0, top: 0, w: W, h: caixas[0].y - 4 });
  ok_(topo === 0, `a legenda sujou ${(topo * 100).toFixed(2)}% da arte acima dela`);
});

console.log('\n== NÃO DESENHA O QUE NÃO EXISTE ==');

await teste('lista vazia não desenha nada', async () => {
  const abs = await slide('f.png');
  ok_((await desenharLegendas({ baseAbs: abs, textos: [] })).length === 0, 'devolveu caixa pra lista vazia');
  ok_((await mudou(abs, { left: 0, top: 0, w: W, h: H })) === 0, 'sujou o slide mesmo sem texto');
});

await teste('string em branco é ignorada', async () => {
  const abs = await slide('g.png');
  const caixas = await desenharLegendas({ baseAbs: abs, textos: ['   ', '', 'A UNICA DE VERDADE.'] });
  ok_(caixas.length === 1, `desenhou ${caixas.length} caixas com duas vazias na lista`);
});

await teste('acento sai desenhado (o motivo de sair da IA)', async () => {
  // "AVALIAÇÃO" tem Ç e Ã: se a fonte não vetorizar isso, a legenda perde o que a IA errava
  const abs = await slide('h.png');
  const [comAcento] = await desenharLegendas({ baseAbs: abs, textos: ['AVALIAÇÃO'] });
  const abs2 = await slide('i.png');
  const [semAcento] = await desenharLegendas({ baseAbs: abs2, textos: ['AVALIACAO'] });
  ok_(comAcento.w >= semAcento.w * 0.9, 'a versão com acento encolheu demais: glifo faltando?');
  ok_(await tintaNoTexto(abs, comAcento) > 0.04, 'a palavra acentuada saiu sem tinta');
});

await rm(dir, { recursive: true, force: true });
console.log(`\n${falhou ? 'FALHOU' : 'tudo ok'}: ${ok} passaram, ${falhou} falharam\n`);
process.exit(falhou ? 1 : 0);
