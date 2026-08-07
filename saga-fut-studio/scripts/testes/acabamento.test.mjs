// acabamento.test.mjs — QUEM DESENHA O QUÊ. Roda em segundos, não gera imagem nenhuma.
//
// POR QUE EXISTE: moldura e legenda passaram a ser desenhadas por CÓDIGO nos quadrinhos
// novos (05/08/2026), e o acervo tem 63 peças ANTIGAS cuja arte já nasceu com moldura e
// legenda desenhadas pela IA. Resolver isso errado não dá erro: dá moldura dentro de
// moldura, dois selos sobrepostos ou legenda em cima de legenda, e só se vê olhando.
// A resolução mora em shared/quadrinho-config.mjs e é usada pelo prompt, pelo export e
// pela aba Ajustes — se ela mentir, as três mentem juntas.
//
//   node scripts/testes/acabamento.test.mjs
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from '/Users/raphaeloliveira/projects/dev-blaugrana/saga-fut-studio/node_modules/sharp/dist/index.mjs';
import {
  molduraDe, arteSangra, legendaPorCodigo, temCarimbo, resumoDoAcabamento, MOLDURAS, MOLDURA_PADRAO,
} from '../../shared/quadrinho-config.mjs';
import { blankQuadrinho } from '../../src/lib/scaffold.js';
import { acabarPainel, pngDoAcabamento, precisaAcabamento } from '../../server/lib/acabamento.mjs';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let ok = 0, falhou = 0;
const teste = (nome, fn) => {
  try { fn(); console.log(`  ok   ${nome}`); ok++; }
  catch (e) { console.log(`  FALHOU ${nome}\n         ${e.message}`); falhou++; }
};
const testeAsync = async (nome, fn) => {
  try { await fn(); console.log(`  ok   ${nome}`); ok++; }
  catch (e) { console.log(`  FALHOU ${nome}\n         ${e.message}`); falhou++; }
};
const ok_ = (cond, msg) => { if (!cond) throw new Error(msg); };

console.log('\n== QUADRINHO ANTIGO NÃO MUDA DE ACABAMENTO ==');

teste('sem o campo, a moldura é a da IA', () => {
  const antigo = { id: 'breaking-aranha', paineis: [] };
  ok_(molduraDe(antigo) === 'ia', `resolveu ${molduraDe(antigo)}: a arte antiga já tem moldura desenhada`);
  ok_(arteSangra(antigo) === false, 'mandaria a arte antiga sangrar, criando moldura dentro de moldura');
});

teste('sem o campo, a legenda é a da IA', () => {
  ok_(legendaPorCodigo({ id: 'x' }) === false, 'ligaria legenda por código em arte que já tem legenda desenhada');
});

teste('o campo antigo do primeiro teste continua valendo', () => {
  ok_(molduraDe({ molduraPorCodigo: true }) === 'codigo', 'perdeu o quadrinho que usava o campo booleano antigo');
});

console.log('\n== QUADRINHO NOVO NASCE POR CÓDIGO ==');

teste('o scaffold liga moldura e legenda por código', () => {
  const novo = blankQuadrinho([], 'carrossel', { titulo: 'teste' });
  ok_(molduraDe(novo) === 'codigo', `nasceu com moldura ${molduraDe(novo)}`);
  ok_(legendaPorCodigo(novo) === true, 'nasceu com legenda pela IA');
  ok_(arteSangra(novo) === true, 'a arte não vai nascer sangrada');
});

teste('o scaffold usa um estilo que EXISTE', () => {
  // o padrão antigo era 'comedia-3d', que não está no catálogo: todo quadrinho criado pelo
  // botão nascia sem estilo válido e sem referência de traço
  const novo = blankQuadrinho([], 'tirinha', { titulo: 'teste2' });
  const validos = ['rabisco-riso', 'epico-3d', 'jorel-2d', 'hilda-2d'];
  ok_(validos.includes(novo.estiloId), `nasceu com estiloId "${novo.estiloId}", que não existe no catálogo`);
});

console.log('\n== SEM MOLDURA (cards de jogo) ==');

teste('sem moldura também pede arte sangrada', () => {
  const card = { moldura: 'nenhuma' };
  ok_(arteSangra(card) === true, 'a arte sairia com borda desenhada num card que não quer borda');
  ok_(molduraDe(card) === 'nenhuma', 'não respeitou a escolha');
});

teste('todo modo do catálogo resolve pra ele mesmo', () => {
  for (const id of Object.keys(MOLDURAS)) {
    ok_(molduraDe({ moldura: id }) === id, `o modo ${id} não resolveu pra ele mesmo`);
  }
  ok_(MOLDURAS[MOLDURA_PADRAO], 'o padrão não está no catálogo');
});

teste('modo inválido não derruba nem inventa: cai no acabamento antigo', () => {
  ok_(molduraDe({ moldura: 'roxo' }) === 'ia', 'aceitou um modo que não existe');
});

console.log('\n== CARIMBO ==');

teste('carimbo é ligado salvo opt-out declarado', () => {
  ok_(temCarimbo({}) === true, 'nasceu sem numeração');
  ok_(temCarimbo({ carimboProgresso: false }) === false, 'ignorou o opt-out');
});

teste('o resumo diz a verdade sobre a peça', () => {
  const r = resumoDoAcabamento({ moldura: 'nenhuma', legendaPorCodigo: true, carimboProgresso: false });
  ok_(r.includes('sem moldura'), `resumo não menciona a moldura: "${r}"`);
  ok_(r.includes('legendas por código'), `resumo não menciona as legendas: "${r}"`);
  ok_(!r.includes('carimbo'), `resumo promete carimbo desligado: "${r}"`);
});

console.log('\n== TODO MONTADOR RECEBE A ARTE ACABADA ==');

// POR QUE ESTE GUARDA: quando moldura e legenda saíram do prompt e viraram export (05/08/2026),
// o desenho foi parar DENTRO do caminho do carrossel. Os outros três montadores (mosaico, vídeo
// do quadrinho, quadrinho animado) continuaram lendo `painel.imagem` — que nesses quadrinhos é
// arte sangrada e MUDA. Resultado: o vídeo do o-dia-pedri-legenda-codigo saiu sem moldura e sem
// legenda nenhuma, e nenhum validador reclamou, porque não há erro ali: o ffmpeg monta o PNG que
// existe. É ausência, e ausência não aparece em relatório de FAIL.
//
// O guarda é SINTÁTICO de propósito: ele lê as rotas e exige que toda rota que monta painel peça
// a arte ao lib/acabamento.mjs. Um teste que só montasse vídeo não pegaria o consumidor NOVO, que
// é justamente como este defeito nasceu.
const MONTADORES = ['montarMosaico', 'segmentoParado', 'segmentoKenBurns', 'carimbarCopias', 'generateVideo'];
const ACABAMENTO = /artesParaMontar\(|acabarPainel\(|acabarClipe\(/;

teste('nenhuma rota monta painel a partir da arte crua', () => {
  const src = readFileSync(path.resolve(raiz, '../server/routes/render.mjs'), 'utf8');
  const rotas = src.split(/renderRouter\.(?:post|get)\(/).slice(1);
  ok_(rotas.length >= 3, 'não achei as rotas de render — o arquivo mudou de forma e este guarda parou de guardar');
  const cruas = [];
  for (const bloco of rotas) {
    const nome = (bloco.match(/^'([^']+)'/) || [])[1] || '?';
    const monta = MONTADORES.filter((m) => new RegExp(`${m}\\(`).test(bloco));
    if (!monta.length) continue;
    if (!ACABAMENTO.test(bloco)) cruas.push(`${nome} (usa ${monta.join(', ')})`);
  }
  ok_(!cruas.length, `estas rotas montam sem passar pelo acabamento: ${cruas.join(' · ')}\n`
    + '         peça a arte a lib/acabamento.mjs (artesParaMontar/acabarPainel/acabarClipe)');
});

teste('a rota não redesenha moldura e legenda por conta própria', () => {
  const src = readFileSync(path.resolve(raiz, '../server/routes/render.mjs'), 'utf8');
  ok_(!/from '\.\.\/lib\/moldura\.mjs'/.test(src) && !/from '\.\.\/lib\/legenda\.mjs'/.test(src),
    'a rota voltou a importar moldura/legenda direto — a regra passa a viver em dois lugares, e foi assim que só o carrossel ficou com ela');
});

console.log('\n== O ACABAMENTO DESENHA MESMO ==');

const CREME = [244, 234, 211];
const ehCreme = (r, g, b) => Math.abs(r - CREME[0]) < 12 && Math.abs(g - CREME[1]) < 12 && Math.abs(b - CREME[2]) < 12;

// a arte que o modelo entrega num quadrinho de moldura por código: sangrada, na razão INTERNA
async function arteFalsa(dir) {
  const f = path.join(dir, 'cru.png');
  await sharp({ create: { width: 1152, height: 1585, channels: 3, background: { r: 20, g: 60, b: 160 } } })
    .png().toFile(f);
  return f;
}

const tmp = mkdtempSync(path.join(os.tmpdir(), 'acabamento-test-'));
const QUAD = { id: 'x', formato: '3:4', moldura: 'codigo', legendaPorCodigo: true };

await testeAsync('a moldura entra e a arte cabe dentro dela', async () => {
  const cru = await arteFalsa(tmp);
  const out = path.join(tmp, 'com-moldura.png');
  await acabarPainel({ quad: QUAD, painel: { numero: 1, legendas: [] }, baseAbs: cru, dim: { w: 1080, h: 1440 }, outAbs: out });
  const { data, info } = await sharp(out).raw().toBuffer({ resolveWithObject: true });
  ok_(info.width === 1080 && info.height === 1440, `saiu ${info.width}x${info.height}, não no tamanho do post`);
  const px = (x, y) => { const i = (y * info.width + x) * info.channels; return [data[i], data[i + 1], data[i + 2]]; };
  ok_(ehCreme(...px(6, 6)), `a margem não saiu creme (${px(6, 6)}) — a moldura não foi desenhada`);
  ok_(!ehCreme(...px(540, 500)), 'o meio do painel saiu creme: a arte não pousou dentro da moldura');
});

await testeAsync('a legenda entra por cima da arte', async () => {
  const cru = await arteFalsa(tmp);
  const dim = { w: 1080, h: 1440 };
  const conta = async (nome, legendas) => {
    const out = path.join(tmp, nome);
    await acabarPainel({ quad: QUAD, painel: { numero: 1, legendas }, baseAbs: cru, dim, outAbs: out });
    // só a faixa de baixo, que é onde as caixas pousam
    const { data, info } = await sharp(out).extract({ left: 0, top: 1150, width: 1080, height: 200 })
      .raw().toBuffer({ resolveWithObject: true });
    let n = 0;
    for (let i = 0; i < data.length; i += info.channels) if (ehCreme(data[i], data[i + 1], data[i + 2])) n++;
    return n;
  };
  const sem = await conta('sem-legenda.png', []);
  const com = await conta('com-legenda.png', ['O QUE O REAL MADRID DISSE SOBRE PEDRI EM 2018.']);
  ok_(com > sem * 1.5 + 1000, `a caixa de legenda não apareceu na base (creme: ${sem} sem legenda, ${com} com)`);
});

await testeAsync('o acabamento do VÍDEO é transparente onde a arte aparece', async () => {
  // o clipe animado entra por baixo deste PNG: se ele for opaco no meio, tapa a animação
  const out = path.join(tmp, 'mobilia.png');
  const r = await pngDoAcabamento({ quad: QUAD, painel: { numero: 1, legendas: ['UMA LEGENDA'] }, dim: { w: 1080, h: 1440 }, outAbs: out });
  ok_(r, 'não gerou o acabamento do clipe');
  const { data, info } = await sharp(out).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  ok_(info.channels === 4, 'o acabamento saiu sem canal alfa: vai cobrir o clipe inteiro');
  const alpha = (x, y) => data[(y * info.width + x) * info.channels + 3];
  ok_(alpha(540, 500) === 0, `o meio do acabamento está opaco (alfa ${alpha(540, 500)}) — taparia a animação`);
  ok_(alpha(6, 6) > 250, 'a margem do acabamento está transparente — a moldura não seria vista no vídeo');
});

teste('quadrinho antigo não recebe acabamento nenhum', () => {
  // a arte dele já nasceu com moldura e legenda desenhadas: acabar de novo é moldura sobre moldura
  ok_(precisaAcabamento({ id: 'breaking-aranha' }, { numero: 1, legendas: [] }) === false,
    'ia acabar por cima de arte que já vem acabada da IA');
  ok_(precisaAcabamento(QUAD, { numero: 1, legendas: [] }) === true, 'deixou de acabar a moldura por código');
});

await testeAsync('a saída nunca é a própria arte do painel', async () => {
  // o PNG do painel é ORIGINAL (também vira story, print e outro post): gravar por cima gruda a
  // moldura no que precisa seguir limpo, e não há como desfazer
  const cru = await arteFalsa(tmp);
  let barrou = false;
  await acabarPainel({ quad: QUAD, painel: { numero: 1, legendas: [] }, baseAbs: cru, dim: { w: 1080, h: 1440 }, outAbs: cru })
    .catch(() => { barrou = true; });
  ok_(barrou, 'aceitou gravar o acabamento por cima da arte original do painel');
});

rmSync(tmp, { recursive: true, force: true });

console.log('\n== CARD DE JOGO NÃO LEVA MOLDURA DE HISTÓRIA ==');

// POR QUE ESTE GUARDA: escalação, gol, substituição e fim de jogo são montados INTEIROS por
// código (gerar-*.mjs) e já saem prontos. A moldura e as legendas que o studio desenha nos
// quadrinhos de história estragariam o layout deles. Hoje eles estão certos porque DECLARAM
// `moldura: 'nenhuma'` — não por ausência de campo, que amanhã pode passar a significar outra
// coisa. Este teste lê os geradores de verdade: se alguém criar um card novo esquecendo a
// declaração, ele reprova antes de o card entrar no acervo.
const SELOS_CARD = ['Escalação', 'Gol', 'Fim de jogo', 'Substituição'];

teste('todo gerador de card declara o próprio acabamento', () => {
  const geradores = ['gerar-escalacao.mjs', 'gerar-gol.mjs', 'gerar-fim-de-jogo.mjs', 'gerar-substituicao.mjs'];
  const faltando = [];
  for (const g of geradores) {
    const src = readFileSync(path.resolve(raiz, '..', g), 'utf8');
    if (!/moldura:\s*'nenhuma'/.test(src)) faltando.push(g);
  }
  ok_(!faltando.length, `estes geradores criam card sem declarar o acabamento: ${faltando.join(', ')}`);
});

teste('card declarado não recebe moldura nem legenda por código', () => {
  for (const selo of SELOS_CARD) {
    const card = { selo, moldura: 'nenhuma', legendaPorCodigo: false };
    ok_(molduraDe(card) === 'nenhuma', `o card "${selo}" resolveu pra ${molduraDe(card)}`);
    ok_(legendaPorCodigo(card) === false, `o card "${selo}" levaria legenda por código por cima do layout dele`);
  }
});

console.log(`\n${falhou ? 'FALHOU' : 'tudo ok'}: ${ok} passaram, ${falhou} falharam\n`);
// exitCode em vez de process.exit(): esta suíte é toda SÍNCRONA, e no Node 24 chamar
// process.exit() no mesmo tick em que o import resolve derruba o processo com SIGSEGV —
// o teste passava e mesmo assim devolvia 139, que em automação lê como falha.
process.exitCode = falhou ? 1 : 0;
