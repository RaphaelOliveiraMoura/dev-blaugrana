// cadeia.test.mjs — A CADEIA DE UMA FOLHA RESPEITA A CLASSE DO COMEÇO AO FIM?
//
// A classe define o grid (2x2, 3x3, 4x4) e esse número atravessa CINCO elos: o contrato, o
// validador do manifesto, o gerador (quantas fases exige), o prompt (o que é pedido ao modelo) e o
// slicer (quantas células corta). Basta um elo discordar pra folha sair com célula sobrando ou
// faltando — e o defeito só apareceria depois de pagar a geração. Aqui os cinco são conferidos de
// graça, sem gerar imagem nenhuma.
//
//   node scripts/testes/cadeia.test.mjs
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CLASSES, gridDaClasse, validarManifesto } from '../sprites/contratos.mjs';
import { promptAcao } from '../sprites/config.mjs';
import { gestoPara, GESTOS, GESTOS_VALIDOS } from '../sprites/gestos.mjs';
import { quadroEm, totalExposicao, janelaNoAr, alturaNoAr, inicioDoQuadro, framesDoQuadro } from '../../shared/exposicao.mjs';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let ok = 0, falhou = 0;
const teste = async (nome, fn) => {
  try { await fn(); console.log(`  ok   ${nome}`); ok++; }
  catch (e) { console.log(`  FALHOU ${nome}\n         ${e.message}`); falhou++; }
};
const ok_ = (c, m) => { if (!c) throw new Error(m); };

console.log('\n== O NÚMERO DE SPRITES ATRAVESSA A CADEIA INTEIRA ==\n');

for (const [classe, cfg] of Object.entries(CLASSES)) {
  const n = cfg.celulas;
  const fases = Array.from({ length: n }, (_, i) => `fase ${i + 1}`);

  await teste(`${classe}: grid ${cfg.grid.join('x')} = ${n} sprites (contrato)`, () => {
    ok_(cfg.grid[0] * cfg.grid[1] === n, `grid não multiplica pra ${n}`);
  });

  await teste(`${classe}: o manifesto exige exatamente ${n} fases`, () => {
    const faltando = validarManifesto({ video: 'x', acoes: [{ slug: 'a', nome: 'b', desc: 'c', classe, muda: 'm', fases: fases.slice(0, -1) }] });
    ok_(faltando.some((e) => e.includes(`${n} fases`)), `devia reclamar de ${n} fases`);
    const certo = validarManifesto({ video: 'x', acoes: [{ slug: 'a', nome: 'b', desc: 'c', classe, muda: 'm', fases }] });
    ok_(certo.length === 0, `com ${n} fases devia passar, veio: ${certo.join(' | ')}`);
  });

  await teste(`${classe}: o PROMPT pede ${n} células no grid ${cfg.grid.join('x')}`, async () => {
    const p = await promptAcao('x.png', { desc: 'd', fases, muda: 'm', grid: cfg.grid });
    ok_(p.includes(`${n}-CELL`), `prompt não diz ${n}-CELL`);
    ok_(p.includes(`${cfg.grid[0]}x${cfg.grid[1]} grid`), `prompt não diz grid ${cfg.grid.join('x')}`);
    const linhas = (p.match(/^Cell \d+:/gm) || []).length;
    ok_(linhas === n, `prompt lista ${linhas} células, esperado ${n}`);
  });
}

console.log('\n== GERADOR E SLICER LEEM A MESMA REGRA ==\n');

// só o CÓDIGO: comentário pode (e deve) citar "2x2" ao documentar a tabela de classes
const semComentarios = (s) => s.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

await teste('gen-acao deriva o grid de gridDaClasse (não hardcoda)', async () => {
  const s = await readFile(path.join(raiz, 'sprites/gen-acao.mjs'), 'utf8');
  ok_(s.includes('gridDaClasse(CLASSE)'), 'gen-acao não usa gridDaClasse');
  ok_(s.includes('fases.length !== celulas'), 'gen-acao não valida a contagem de fases');
  ok_(!/\[2, 2\]|grid = \[|celulas = 4/.test(semComentarios(s)), 'gen-acao tem grid hardcodado no código');
});

await teste('slice-acao corta pelo grid da classe (não 2x2 fixo)', async () => {
  const s = await readFile(path.join(raiz, 'sprites/slice-acao.mjs'), 'utf8');
  ok_(s.includes('gridDaClasse(CLASSE)'), 'slice-acao não usa gridDaClasse');
  ok_(s.includes('quadros.length !== celulas'), 'slice-acao não confere a contagem');
  ok_(!/const cells = \[\[/.test(s), 'slice-acao ainda tem as 4 células fixas');
});

await teste('build-video repassa a classe pro gerador E pro slicer', async () => {
  const s = await readFile(path.join(raiz, 'video/build-video.mjs'), 'utf8');
  ok_(/gen-acao[^\n]*a\.classe/.test(s), 'build não passa classe pro gen-acao');
  ok_(/slice-acao[^\n]*a\.classe/.test(s), 'build não passa classe pro slice-acao');
});

console.log('\n== BIBLIOTECAS DE MOVIMENTO SÃO SEMPRE 2x2 (4 quadros) ==\n');

await teste('idle/andar/correr geram e fatiam 4 quadros', async () => {
  for (const [gen, sli] of [['gen-idle', 'slice-idle'], ['gen-walk', 'slice-walk'], ['gen-run', 'slice-run']]) {
    const g = await readFile(path.join(raiz, `sprites/${gen}.mjs`), 'utf8');
    ok_(/promptSheet|promptIdle/.test(g), `${gen} não usa o prompt padrão`);
    const s = await readFile(path.join(raiz, `sprites/${sli}.mjs`), 'utf8');
    ok_(/[^\d]4[^\d]/.test(s), `${sli} não parece fatiar 4 quadros`);
  }
});

console.log('\n== VOCABULÁRIO DE GESTOS BATE COM AS CLASSES ==\n');

await teste('todo gesto do catálogo entrega o número certo de fases', () => {
  for (const nome of GESTOS_VALIDOS) {
    for (const [classe, cfg] of Object.entries(CLASSES)) {
      let r = null;
      try { r = gestoPara(nome, classe); } catch { continue; }   // gesto sem fases pra essa classe: ok
      ok_(r.fases.length === cfg.celulas, `gesto "${nome}" em ${classe}: ${r.fases.length} fases, esperado ${cfg.celulas}`);
      ok_(!!r.muda, `gesto "${nome}" sem "muda"`);
    }
  }
});

await teste('gesto pedido numa classe que ele não tem é RECUSADO com instrução', () => {
  const semNove = GESTOS_VALIDOS.find((g) => GESTOS[g].fases4 && !GESTOS[g].fases9);
  ok_(semNove, 'esperava algum gesto só com fases4');
  let msg = '';
  try { gestoPara(semNove, 'primaria'); } catch (e) { msg = e.message; }
  ok_(msg.includes('fases9') || msg.includes('9 fases'), `mensagem não orienta: "${msg}"`);
});

console.log('\n== FOLHA DE EXPOSIÇÃO: COMPOSER E MOTOR CONTAM O MESMO QUADRO ==\n');

await teste('tempos/chao têm uma entrada por desenho em todo gesto do catálogo', () => {
  for (const nome of GESTOS_VALIDOS) {
    for (const classe of Object.keys(CLASSES)) {
      let r = null;
      try { r = gestoPara(nome, classe); } catch { continue; }
      if (r.tempos) ok_(r.tempos.length === r.fases.length, `"${nome}"/${classe}: ${r.tempos.length} tempos pra ${r.fases.length} desenhos`);
      if (r.chao) ok_(r.chao.length === r.fases.length, `"${nome}"/${classe}: ${r.chao.length} chao pra ${r.fases.length} desenhos`);
      if (r.chao) ok_(r.chao.some((c) => c === false), `"${nome}"/${classe}: chao sem NENHUM desenho no ar não delimita voo nenhum`);
    }
  }
});

await teste('quadroEm respeita o tempo de cada desenho e volta ao 1º no loop', () => {
  const tempos = [4, 5, 2, 2, 6, 2, 4, 3, 5];   // comemorar
  const total = totalExposicao(tempos);
  ok_(total === 33, `total ${total}, esperado 33`);
  ok_(quadroEm(0, tempos) === 0 && quadroEm(3, tempos) === 0, 'o 1º desenho devia segurar 4 frames');
  ok_(quadroEm(4, tempos) === 1, 'o 2º desenho devia entrar no frame 4');
  ok_(quadroEm(total, tempos) === 0, 'o ciclo devia voltar ao 1º desenho');
  ok_(quadroEm(total + 4, tempos) === 1, 'a 2ª volta devia repetir a mesma cadência');
});

await teste('o MOTOR usa a mesma função de exposição do composer (não uma cópia)', async () => {
  const cena = await readFile(path.join(raiz, '../remotion/src/Cena.jsx'), 'utf8');
  ok_(/from '\.\.\/\.\.\/shared\/exposicao\.mjs'/.test(cena), 'Cena.jsx não importa shared/exposicao.mjs');
  ok_(/quadroEm\(rel, cur\.holds\)/.test(cena), 'Cena.jsx não indexa o ciclo pela folha de exposição');
  ok_(!/cycle\[Math\.floor\(\(frame \* hz\)/.test(cena), 'Cena.jsx ainda conta o ciclo pelo frame ABSOLUTO do shot');
  const comp = await readFile(path.join(raiz, '../server/video/montar-cena.mjs'), 'utf8');
  ok_(/from '\.\.\/\.\.\/shared\/exposicao\.mjs'/.test(comp), 'montar-cena não importa shared/exposicao.mjs');
});

await teste('a janela de voo fecha o ciclo: último desenho na MESMA linha de chão do primeiro', () => {
  const tempos = [4, 5, 2, 2, 6, 2, 4, 3, 5];
  const chao = [true, true, true, false, false, false, true, true, true];
  const j = janelaNoAr(tempos, chao);
  ok_(j && j.i0 === 3 && j.i1 === 5, `janela errada: ${JSON.stringify(j)}`);
  ok_(alturaNoAr(j.ini, j, 150) === 0, 'o arco devia começar no chão');
  ok_(alturaNoAr(j.fim, j, 150) === 0, 'o arco devia TERMINAR no chão (senão o ciclo dá um tranco ao repetir)');
  ok_(alturaNoAr((j.ini + j.fim) / 2, j, 150) > 149, 'o ápice devia bater a altura pedida');
  ok_(janelaNoAr(tempos, null) === null, 'sem `chao` não existe janela de voo');
});

await teste('contato vira evento cronometrado, uma vez por repetição do ciclo', () => {
  const tempos = [4, 4, 5, 2, 1, 5, 2, 3, 4];   // empurrar, ciclo = 30
  ok_(totalExposicao(tempos) === 30, 'ciclo do empurrar devia ser 30');
  ok_(inicioDoQuadro(5, tempos) === 16, 'o CONTATO (desenho 6) devia entrar no frame 16 do ciclo');
  // beat de 65 frames a partir de 100: contatos em 16 e 46 do ciclo; o terceiro cairia em 76,
  // além do beat, e não deve ser emitido (senão o tremor dispara com o gesto já encerrado)
  const fs = framesDoQuadro(5, tempos, 100, 65);
  ok_(fs.length === 2, `esperava 2 contatos em 65 frames, veio ${fs.length} (${fs.join(',')})`);
  ok_(fs[0] === 116 && fs[1] === 146, `contatos nos frames errados: ${fs.join(',')}`);
  ok_(framesDoQuadro(5, tempos, 0, 10).length === 0, 'beat curto demais não devia ter contato nenhum');
});

await teste('contatoPe é SUBCONJUNTO de contato (senão levanta poeira sem batida)', () => {
  const g = { desc: 'x', muda: 'y', fases4: ['a', 'b', 'c', 'd'], contato4: [1], contatoPe4: [2] };
  GESTOS.__teste = g;
  let msg = '';
  try { gestoPara('__teste', 'secundaria'); } catch (e) { msg = e.message; }
  delete GESTOS.__teste;
  ok_(msg.includes('SUBCONJUNTO') || msg.includes('não está em contato'), `mensagem não orienta: "${msg}"`);
});

await teste('gesto HORIZONTAL desliga a régua da cabeça (ela mede o topo do desenho)', () => {
  const r = gestoPara('cair', 'primaria');
  ok_(r.horizontal === true, 'cair devia estar marcado como horizontal (o corpo vai ao chão)');
  ok_(gestoPara('comemorar', 'primaria').horizontal === false, 'comemorar NÃO é horizontal');
});

console.log('\n== LOOP: O QUE REPETE E O QUE ACONTECE UMA VEZ ==\n');

await teste('todo gesto do catálogo declara loop e um fim válido', () => {
  for (const nome of GESTOS_VALIDOS) {
    for (const classe of Object.keys(CLASSES)) {
      let r = null;
      try { r = gestoPara(nome, classe); } catch { continue; }
      ok_(typeof r.loop === 'boolean', `"${nome}": loop devia ser booleano`);
      ok_(['segura', 'volta'].includes(r.fim), `"${nome}": fim "${r.fim}" inválido`);
    }
  }
});

await teste('gesto de AÇÃO física não repete (era o empurrão reiniciando sozinho)', () => {
  for (const nome of ['empurrar', 'cair', 'assustar', 'apontar', 'correr_parar']) {
    const classe = GESTOS[nome].fases9 ? 'primaria' : 'secundaria';
    ok_(gestoPara(nome, classe).loop === false, `"${nome}" não devia repetir`);
  }
  for (const nome of ['rir', 'negar', 'sentido', 'esperar']) {
    ok_(gestoPara(nome, 'secundaria').loop === true, `"${nome}" devia repetir (é ciclo de espera)`);
  }
});

await teste('loop + fim juntos é RECUSADO (o que repete nunca termina)', () => {
  GESTOS.__teste = { desc: 'x', muda: 'y', fases4: ['a', 'b', 'c', 'd'], loop: true, fim: 'volta' };
  let msg = '';
  try { gestoPara('__teste', 'secundaria'); } catch (e) { msg = e.message; }
  delete GESTOS.__teste;
  ok_(msg.includes('nunca termina'), `mensagem não orienta: "${msg}"`);
});

await teste('o MOTOR para o ciclo de uma vez em vez de repetir', async () => {
  const cena = await readFile(path.join(raiz, '../remotion/src/Cena.jsx'), 'utf8');
  ok_(/cur\.loop === false/.test(cena), 'Cena.jsx não trata loop:false');
  ok_(/cur\.fim === 'volta'/.test(cena), 'Cena.jsx não trata fim:volta');
});

console.log('\n== VELOCIDADE DE PASSADA SAI DA DISTÂNCIA ==\n');

await teste('composer deriva hz e duração do deslocamento (não usa 8 fixo)', async () => {
  const s = await readFile(path.join(raiz, '../server/video/montar-cena.mjs'), 'utf8');
  ok_(/const PASSO = /.test(s) && /const VEL = /.test(s), 'faltam as constantes de passada/velocidade');
  ok_(/hzDaPassada\(kind, w, offIn, wIn\)/.test(s), 'a ENTRADA não deriva o hz da distância');
  ok_(/durDaDistancia\(kind, w, offIn\)/.test(s), 'a ENTRADA ainda usa duração fixa quando não declarada');
  const semComent = semComentarios(s);
  ok_(!/cyc\(slug, kind\), hz: 8/.test(semComent), 'ainda existe ciclo de passada com hz 8 fixo');
});

console.log(`\n${ok} ok · ${falhou} falhou\n`);
process.exit(falhou ? 1 : 0);
