// vigia.test.mjs — OS VALIDADORES AINDA ESTÃO VALIDANDO?
//
// POR QUE EXISTE: a classe de defeito mais perigosa que este projeto teve não foi código errado, foi
// GUARDA QUE PAROU DE GUARDAR — e em silêncio, porque um validador que não encontra nada devolve
// "tudo ok". Aconteceu duas vezes em 31/07/2026, as duas por mudança de pasta:
//
//   · `check-sprite` agrupava os sprites pelo NOME do arquivo (`<slug>-w1.png`). Quando o acervo
//     virou pasta por personagem, o arquivo passou a se chamar só `w1.png`, cada grupo ficou com um
//     sprite só e a régua de escala virou NO-OP. Meses medindo nada e imprimindo OK.
//   · A respiração (`parado: true`) era ligada testando `videos/<id>/kf/<slug>-i1.png`. O kf/ deixou
//     de existir, o teste passou a dar sempre falso e a respiração ficou DESLIGADA em todo vídeo.
//     Nenhum erro, nenhum aviso: só personagens mais mortos do que deviam.
//
// As suítes normais provam que o código faz o que promete. Esta prova que ele AINDA ESTÁ LIGADO no
// pipeline: alimenta cada guarda com um caso sabidamente ruim e exige que ele reclame. Se alguém
// mover uma pasta de novo, aqui fica vermelho em vez de ficar quieto.
//
//   node scripts/testes/vigia.test.mjs
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { CONTEUDO_DIR } from '../../server/config.mjs';
import { montarCena } from '../../server/video/montar-cena.mjs';
import { invariantes } from '../../server/video/invariantes.mjs';
import { rigQuadro, dirRig, TIPOS_RIG } from '../../shared/personagem.mjs';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let ok = 0, falhou = 0;
const teste = async (nome, fn) => {
  try { await fn(); console.log(`  ok   ${nome}`); ok++; }
  catch (e) { console.log(`  FALHOU ${nome}\n         ${e.message}`); falhou++; }
};
const ok_ = (c, m) => { if (!c) throw new Error(m); };
const semRuido = (fn) => {
  const w = console.warn, l = console.log;
  console.warn = () => {}; console.log = () => {};
  try { return fn(); } finally { console.warn = w; console.log = l; }
};

// um personagem REAL do acervo que sirva de cobaia pra cada guarda (o vigia precisa de arte de
// verdade: é justamente o encontro com o disco que quebrou nas duas vezes)
async function personagemCom(tipo) {
  for (const slug of await readdir(path.join(CONTEUDO_DIR, 'personagens')).catch(() => [])) {
    if (existsSync(path.join(CONTEUDO_DIR, rigQuadro(slug, tipo, 1)))) return slug;
  }
  return null;
}

console.log('\n== A PORTA ÚNICA AINDA BARRA ==\n');

await teste('gen-* recusa execução fora do asset.mjs', () => {
  const r = spawnSync('node', [path.join(raiz, 'sprites/gen-walk.mjs'), '__cobaia__'],
    { encoding: 'utf8', env: { ...process.env, SAGAFUT_VIA_ASSET: '' } });
  ok_(r.status !== 0, 'gen-walk RODOU sem passar pela porta — a trava caiu');
  ok_(/asset/i.test((r.stderr || '') + (r.stdout || '')), 'a recusa devia dizer por onde entrar');
});

console.log('\n== A RÉGUA DE ESCALA AINDA MEDE (agrupou por personagem?) ==\n');

await teste('check-sprite avalia a escala de um personagem real, não devolve silêncio', async () => {
  const slug = await personagemCom('andar');
  ok_(slug, 'nenhum personagem com folha de andar no acervo — cobaia indisponível');
  const arquivos = [1, 2, 3, 4].map((n) => path.join(CONTEUDO_DIR, rigQuadro(slug, 'andar', n)));
  const r = spawnSync('node', [path.join(raiz, 'sprites/check-sprite.mjs'), ...arquivos], { encoding: 'utf8' });
  const saida = (r.stdout || '') + (r.stderr || '');
  // o defeito silencioso: NÃO imprimir linha de escala nenhuma (cada grupo com 1 sprite)
  ok_(new RegExp(`escala de "${slug}"`).test(saida),
    `check-sprite não avaliou a escala de "${slug}" — provavelmente voltou a agrupar pelo nome do arquivo (era NO-OP assim)`);
});

console.log('\n== A RESPIRAÇÃO AINDA LIGA PRA QUEM TEM A FOLHA ==\n');

await teste('personagem com folha de idle respira num beat "parado"', async () => {
  const slug = await personagemCom('idle');
  ok_(slug, 'nenhum personagem com folha de idle no acervo — cobaia indisponível');
  const { scene } = semRuido(() => montarCena({
    id: '__vigia__', formato: '3:4', fps: 30, template: 'roteiro',
    roteiro: [{ cenario: 'x', dur: 90, personagens: [{ slug, spot: 540, w: 400, poses: [{ parado: true, hold: 60 }] }] }],
  }));
  const ciclos = (scene.shots[0].chars[0].poses || []).filter((p) => p.cycle && /-i\d+\.png$/.test(p.cycle[0]));
  ok_(ciclos.length > 0,
    `"${slug}" tem folha de idle no acervo mas o composer não ligou a respiração — o caminho conferido por temIdle saiu do lugar (foi assim que ela ficou desligada em TODO vídeo)`);
});

console.log('\n== A CRONOMETRAGEM AINDA VIAJA COM O ASSET ==\n');

await teste('folha de gesto do catálogo carrega tempos/loop no _meta.json', async () => {
  const base = path.join(CONTEUDO_DIR, 'personagens');
  let achou = null;
  for (const slug of await readdir(base).catch(() => [])) {
    for (const g of await readdir(path.join(base, slug, 'acoes')).catch(() => [])) {
      const f = path.join(base, slug, 'acoes', g, '_meta.json');
      if (!existsSync(f)) continue;
      const m = JSON.parse(await readFile(f, 'utf8'));
      if (m.tempos) { achou = { slug, g, m }; break; }
    }
    if (achou) break;
  }
  ok_(achou, 'nenhuma folha do acervo tem `tempos` no _meta.json — o slice-acao parou de gravar a cronometragem');
  ok_(achou.m.tempos.length === achou.m.quadros, `${achou.slug}/${achou.g}: ${achou.m.tempos.length} tempos pra ${achou.m.quadros} desenhos`);
  ok_(typeof achou.m.loop === 'boolean', `${achou.slug}/${achou.g}: _meta sem "loop" — o composer não saberia se o gesto repete`);
});

console.log('\n== CADA INVARIANTE AINDA DISPARA NUM CASO RUIM ==\n');

const cena = (shots) => ({ id: '__vigia__', formato: '3:4', fps: 30, template: 'roteiro', mundo: { cenario: 'x', telas: 2 }, roteiro: shots });

// Um caso ruim POR invariante. Se um deles parar de disparar, foi desligado por acidente — que é
// exatamente o que ninguém percebe olhando um relatório cheio de "sem FAIL".
const CASOS = [
  ['INV-1 fala fora do quadro', 'fala-fora', [{
    cenario: 'x', dur: 90, camera: { em: 300, plano: 'close' },
    personagens: [{ slug: 'a', spot: 300, w: 300 }, { slug: 'b', spot: 3000, w: 300 }],
    baloes: [{ texto: 'oi', de: 'b' }],
  }]],
  ['INV-2 gesto dirigido pro lado errado', 'gesto-invertido', [{
    cenario: 'x', dur: 90, camera: { em: 900, plano: 'geral' },
    // "b" mira "a", que está à DIREITA dele, mas está virado pra ESQUERDA: o gesto sai pro vazio
    personagens: [{ slug: 'a', spot: 1000, w: 300 }, { slug: 'b', spot: 800, w: 300, flip: true, poses: [{ pose: 'x', mira: 'a', hold: 30 }] }],
  }]],
  ['INV-4 anda pro lado oposto da folha', 'orientacao', [{
    cenario: 'x', dur: 90, camera: { em: 1080, plano: 'geral' },
    personagens: [{ slug: 'raphinha-riso', numerado: true, spot: 1080, w: 400, de: 'direita', entra: 'correr' }],
  }]],
  ['INV-6 cena longa em que ninguém age', 'cena-sem-acao', [{
    cenario: 'x', dur: 150, camera: { em: 1080, plano: 'geral' },
    personagens: [{ slug: 'a', spot: 1080, w: 400, poses: [{ pose: 'parado', hold: 140 }] }],
  }]],
  ['INV-5 gesto de uma vez reiniciando no corte', 'gesto-reinicia', [
    { cenario: 'x', dur: 60, camera: { em: 1080, plano: 'geral' }, personagens: [{ slug: 'vini-riso', spot: 1080, w: 400, poses: [{ ciclo: 'assustar', quadros: 4 }] }] },
    { cenario: 'x', dur: 60, camera: { em: 1080, plano: 'geral' }, personagens: [{ slug: 'vini-riso', spot: 1080, w: 400, poses: [{ ciclo: 'assustar', quadros: 4 }] }] },
  ]],
];

for (const [nome, tipo, shots] of CASOS) {
  await teste(`${nome} continua sendo pego`, () => {
    const r = semRuido(() => invariantes(cena(shots)));
    const achou = [...r.erros, ...r.avisos].some((x) => x.tipo === tipo);
    ok_(achou, `nenhum "${tipo}" no caso ruim — este invariante parou de disparar. Veio: ${JSON.stringify([...r.erros, ...r.avisos].map((x) => x.tipo))}`);
  });
}

console.log('\n== O GATE DE RENDER AINDA CONSULTA OS INVARIANTES ==\n');

await teste('validar-cena chama invariantes (senão o render passa por cima de tudo)', async () => {
  const s = await readFile(path.resolve(raiz, '../server/video/validar-cena.mjs'), 'utf8');
  ok_(/invariantes\(/.test(s), 'validar-cena não chama invariantes — o gate de render ficou cego');
  const rota = await readFile(path.resolve(raiz, '../server/routes/video.mjs'), 'utf8');
  ok_(/validarCena\(/.test(rota), 'a rota de render não chama validarCena — dá pra renderizar sem passar por gate nenhum');
});

await teste('todo rig do acervo declara pra que lado olha', async () => {
  const base = path.join(CONTEUDO_DIR, 'personagens');
  const semDir = [];
  for (const slug of await readdir(base).catch(() => [])) {
    for (const tipo of TIPOS_RIG) {
      for (const esq of [false, true]) {
        const pasta = path.join(CONTEUDO_DIR, dirRig(slug, tipo, esq));
        if (!existsSync(pasta)) continue;
        if (!existsSync(path.join(pasta, '_meta.json'))) semDir.push(`${slug}/${tipo}${esq ? '-esq' : ''}`);
      }
    }
  }
  ok_(!semDir.length, `${semDir.length} rig(s) sem direção declarada (o INV-4 fica cego neles): ${semDir.slice(0, 6).join(', ')}${semDir.length > 6 ? '…' : ''}\n         conserte com: node scripts/asset.mjs dir <slug> <rig> <left|right>`);
});

console.log(`\n${ok} ok · ${falhou} falhou\n`);
process.exit(falhou ? 1 : 0);
