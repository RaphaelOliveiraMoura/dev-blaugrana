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

console.log(`\n${ok} ok · ${falhou} falhou\n`);
process.exit(falhou ? 1 : 0);
