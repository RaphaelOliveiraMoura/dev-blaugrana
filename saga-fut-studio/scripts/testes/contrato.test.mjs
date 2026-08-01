// contrato.test.mjs — SUÍTE DE REGRESSÃO DO CONTRATO. Roda em segundos, não gera imagem nenhuma.
//
// POR QUE EXISTE: as travas criadas em 30/07/2026 (classes, ficha, porta única, invariantes de
// encenação) só valem se continuarem reprovando. Validador que para de reprovar em silêncio é pior
// que validador nenhum — foi exatamente o caso do gate de escala, que media 22% de variação e
// executava `anyFail = anyFail`, um no-op. Cada teste aqui é um erro REAL que passou batido no
// vídeo mbappe-ditador.
//
//   node scripts/testes/contrato.test.mjs
import { validarManifesto, CLASSES, gridDaClasse, statusPersonagem } from '../sprites/contratos.mjs';
import { invariantes } from '../../server/video/invariantes.mjs';

let ok = 0, falhou = 0;
// AWAIT no resultado: sem isso um teste `async` sempre "passa" (a promise rejeitada some e o
// try/catch nunca vê a falha). Teste que passa sempre é pior que teste nenhum.
const teste = async (nome, fn) => {
  try { await fn(); console.log(`  ok   ${nome}`); ok++; }
  catch (e) { console.log(`  FALHOU ${nome}\n         ${e.message}`); falhou++; }
};
const ok_ = (cond, msg) => { if (!cond) throw new Error(msg); };
const pega = (lista, tipo) => lista.some((x) => x.tipo === tipo);

// silencia os warn do composer (os casos são propositalmente tortos)
const semRuido = (fn) => { const w = console.warn; console.warn = () => {}; try { return fn(); } finally { console.warn = w; } };

const cena = (roteiro, extra = {}) => ({ id: 't', formato: '3:4', fps: 30, template: 'roteiro', ...extra, roteiro });
const p = (slug, spot, poses = [{ pose: 'p', hold: 90 }], mais = {}) => ({ slug, spot, piso: 1300, w: 300, poses, ...mais });

console.log('\n== SCHEMA DO MANIFESTO (recusa antes de gastar geração) ==');

await teste('ação sem "classe" é recusada', () => {
  const e = validarManifesto({ video: 'x', acoes: [{ slug: 'a', nome: 'b', desc: 'c', fases: ['1', '2', '3', '4'], muda: 'm', travado: 't' }] });
  ok_(e.some((m) => m.includes('classe')), 'devia exigir classe');
});

await teste('ação sem "muda" é recusada (folha sai pulsando)', () => {
  const e = validarManifesto({ video: 'x', acoes: [{ slug: 'a', nome: 'b', desc: 'c', classe: 'secundaria', fases: ['1', '2', '3', '4'], travado: 't' }] });
  ok_(e.some((m) => m.includes('muda')), 'devia exigir muda');
});

await teste('número de fases tem que bater com o grid da classe', () => {
  const e = validarManifesto({ video: 'x', acoes: [{ slug: 'a', nome: 'b', desc: 'c', classe: 'primaria', muda: 'm', travado: 't', fases: ['1', '2', '3', '4'] }] });
  ok_(e.some((m) => m.includes('9 fases') || m.includes('exige 9')), 'classe primaria exige 9 fases');
});

await teste('cenário não panorâmico é recusado', () => {
  const e = validarManifesto({ video: 'x', cenarios: [{ nome: 'c', desc: 'd' }] });
  ok_(e.some((m) => m.includes('panoramico')), 'devia exigir panorâmico');
});

await teste('manifesto correto passa limpo', () => {
  const e = validarManifesto({ video: 'x',
    acoes: [{ slug: 'a', nome: 'b', desc: 'c', classe: 'complexa', muda: 'm', travado: 't', fases: Array.from({ length: 16 }, (_, i) => 's' + i) }],
    cenarios: [{ nome: 'c', desc: 'd', panoramico: true }] });
  ok_(e.length === 0, 'não devia ter erro, veio: ' + e.join(' | '));
});

console.log('\n== CLASSES (o grid sai da classe, não da escolha de quem escreve) ==');

await teste('as três classes têm grid e contagem coerentes', () => {
  for (const [id, c] of Object.entries(CLASSES)) {
    ok_(c.grid[0] * c.grid[1] === c.celulas, `${id}: grid ${c.grid} não bate com ${c.celulas} células`);
  }
});

await teste('classe inexistente explode em vez de virar 2x2 silencioso', () => {
  let deu = false;
  try { gridDaClasse('inventada'); } catch { deu = true; }
  ok_(deu, 'devia lançar erro');
});

console.log('\n== FICHA DO PERSONAGEM (status derivado do disco) ==');

await teste('personagem inexistente nunca é apto', async () => {
  const st = await statusPersonagem('nao-existe-slug-xyz');
  ok_(!st.apto, 'não devia ser apto');
  ok_(st.faltando.length > 0, 'devia listar o que falta');
});

console.log('\n== INVARIANTES DE ENCENAÇÃO (os erros que passaram batido no mbappe-ditador) ==');

await teste('fala de personagem fora do enquadramento reprova', () => {
  const r = semRuido(() => invariantes(cena([{ cenario: 'x', dur: 120, camera: { em: 1700, plano: 'medio' },
    baloes: [{ texto: 'EU FALO', de: 'a', in: 10, out: 100 }],
    personagens: [p('a', 100), p('b', 1700)] }], { mundo: { cenario: 'x', telas: 2 } })));
  ok_(pega(r.erros, 'fala-fora'), 'devia acusar fala fora do quadro');
});

await teste('gesto dirigido pro lado errado reprova', () => {
  const r = semRuido(() => invariantes(cena([{ cenario: 'x', dur: 90,
    personagens: [p('alvo', 800), p('ator', 400, [{ pose: 'aponta', hold: 90 }], { flip: true, encara: 'alvo' })] }])));
  ok_(pega(r.erros, 'gesto-invertido'), 'devia acusar gesto invertido');
});

await teste('`mira` CORRIGE o facing (não só detecta)', () => {
  const r = semRuido(() => invariantes(cena([{ cenario: 'x', dur: 120,
    personagens: [p('alvo', 1200), p('ator', 900, [{ andar: true, move: -100, hold: 40 }, { pose: 'mede', mira: 'alvo', hold: 60 }])] }])));
  ok_(!pega(r.erros, 'gesto-invertido'), 'com mira, o composer vira o personagem sozinho');
});

await teste('personagem que nunca entra no quadro é avisado', () => {
  const r = semRuido(() => invariantes(cena([{ cenario: 'x', dur: 120, camera: { em: 1900, plano: 'close' },
    personagens: [p('fantasma', 60), p('onstage', 1900)] }], { mundo: { cenario: 'x', telas: 2 } })));
  ok_(pega(r.avisos, 'nunca-enquadrado'), 'devia avisar personagem nunca enquadrado');
});

await teste('cena bem encenada passa sem erro', () => {
  const r = semRuido(() => invariantes(cena([{ cenario: 'x', dur: 120,
    baloes: [{ texto: 'oi', de: 'a', in: 10, out: 100 }],
    personagens: [p('a', 500), p('b', 700)] }])));
  ok_(r.erros.length === 0, 'não devia ter erro, veio: ' + r.erros.map((e) => e.msg).join(' | '));
});

console.log('\n== INV-4: QUEM ANDA OLHA PRA ONDE VAI ==\n');

await teste('preOrientado indo pro lado oposto da folha é REPROVADO (andava de costas em silêncio)', () => {
  // raphinha-riso/rigs/correr está declarado olhando pra DIREITA.
  // `numerado` deixou de bloquear em 01/08/2026: o número invertido é aceito e o motor espelha.
  // Quem continua sem saída é o `preOrientado`, cuja sprite já foi desenhada virada.
  const r = semRuido(() => invariantes(cena([{
    cenario: 'x', dur: 120, camera: { em: 1080, plano: 'geral' },
    // vini-riso não tem folha correr-esq: é o caso em que o preOrientado fica sem saída, porque
    // ele também não pode espelhar. Com raphinha o caso nem existe mais (a folha -esq dele existe).
    personagens: [{ slug: 'vini-riso', preOrientado: true, spot: 1080, w: 400, de: 'direita', entra: 'correr' }],
  }])));
  const e = r.erros.find((x) => x.tipo === 'orientacao');
  ok_(e, `esperava erro de orientação, veio: ${JSON.stringify(r.erros.map((x) => x.tipo))}`);
  ok_(/de costas/.test(e.msg), 'a mensagem devia dizer que ele anda de costas');
  ok_(/--dir=left/.test(e.msg), 'a mensagem devia trazer o conserto (gerar a folha na outra direção)');
});

await teste('numerado indo pro lado oposto PASSA: o motor espelha (número invertido é aceito)', () => {
  // era o caso bloqueado até 01/08/2026, e o desbloqueio é o ponto: ir pra esquerda deixou de
  // exigir geração de folha. Quem tem a folha -esq continua usando ela (arte melhor).
  const r = semRuido(() => invariantes(cena([{
    cenario: 'x', dur: 120, camera: { em: 1080, plano: 'geral' },
    personagens: [{ slug: 'vini-riso', numerado: true, spot: 1080, w: 400, de: 'direita', entra: 'correr' }],
  }])));
  ok_(!r.erros.some((x) => x.tipo === 'orientacao'), 'não devia reprovar por orientação: o motor espelha');
});

await teste('numerado indo pro lado DA folha passa', () => {
  const r = semRuido(() => invariantes(cena([{
    cenario: 'x', dur: 120, camera: { em: 1080, plano: 'geral' },
    personagens: [{ slug: 'raphinha-riso', numerado: true, spot: 1080, w: 400, de: 'esquerda', entra: 'correr' }],
  }])));
  ok_(!r.erros.some((x) => x.tipo === 'orientacao'), `não devia reclamar: ${JSON.stringify(r.erros)}`);
});

// ERRO, não aviso: sem a declaração o INV-4 não tem o que comparar, e o buraco que fez o Cucurella
// andar de costas se reabre a cada personagem novo. O conserto é um comando de uma linha.
await teste('folha SEM direção declarada BLOQUEIA, com o comando pronto', () => {
  const r = semRuido(() => invariantes(cena([{
    cenario: 'x', dur: 120, camera: { em: 1080, plano: 'geral' },
    personagens: [{ slug: '__inexistente', numerado: true, spot: 1080, w: 400, entra: 'andar' }],
  }])));
  const e = r.erros.find((x) => x.tipo === 'orientacao-nao-declarada');
  ok_(e && /asset\.mjs dir/.test(e.msg), `esperava ERRO com o comando, veio: ${JSON.stringify(r.erros)}`);
});

console.log(`\n${ok} ok · ${falhou} falhou\n`);
process.exit(falhou ? 1 : 0);
