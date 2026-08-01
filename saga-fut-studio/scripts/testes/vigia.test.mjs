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
import sharp from '/Users/raphaeloliveira/projects/dev-blaugrana/saga-fut-studio/node_modules/sharp/dist/index.mjs';
import { CONTEUDO_DIR } from '../../server/config.mjs';
import { montarCena } from '../../server/video/montar-cena.mjs';
import { invariantes } from '../../server/video/invariantes.mjs';
import { rigQuadro, dirRig, TIPOS_RIG } from '../../shared/personagem.mjs';
import { canvasNormalizado, CANVAS_ESPERADO } from '../sprites/config.mjs';

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
  // desde 01/08/2026 quem tem número PODE espelhar (o número sai invertido e tudo bem), então o
  // caso ruim do INV-4 passou a ser o `preOrientado`: a sprite dele já foi desenhada virada, e
  // espelhar por cima a desfaz — esse é o que continua andando de costas se ninguém olhar.
  ['INV-4 anda pro lado oposto da folha', 'orientacao', [{
    cenario: 'x', dur: 90, camera: { em: 1080, plano: 'geral' },
    personagens: [{ slug: 'vini-riso', preOrientado: true, spot: 1080, w: 400, de: 'direita', entra: 'correr' }],
  }]],
  ['INV-6 cena longa em que ninguém age', 'cena-sem-acao', [{
    cenario: 'x', dur: 150, camera: { em: 1080, plano: 'geral' },
    personagens: [{ slug: 'a', spot: 1080, w: 400, poses: [{ pose: 'parado', hold: 140 }] }],
  }]],
  ['INV-7 vídeo sem direção nenhuma (plano único, sem zoom, ritmo chapado)', 'direcao-plano-unico', [
    { cenario: 'x', dur: 120, camera: { em: 1080, plano: 'geral' }, personagens: [{ slug: 'a', spot: 1080, w: 400, poses: [{ pose: 'p', hold: 110 }] }] },
    { cenario: 'x', dur: 120, camera: { em: 1080, plano: 'geral' }, personagens: [{ slug: 'a', spot: 1080, w: 400, poses: [{ pose: 'p', hold: 110 }] }] },
    { cenario: 'x', dur: 120, camera: { em: 1080, plano: 'geral' }, personagens: [{ slug: 'a', spot: 1080, w: 400, poses: [{ pose: 'p', hold: 110 }] }] },
  ]],
  ['INV-8 vídeo inteiro na mesma faixa de escala', 'direcao-escala-chata', [
    { cenario: 'x', dur: 120, camera: { em: 1080, plano: 'geral' }, personagens: [{ slug: 'a', spot: 1080, w: 300, poses: [{ pose: 'p', hold: 110 }] }] },
    { cenario: 'x', dur: 90, camera: { em: 1080, plano: 'medio' }, personagens: [{ slug: 'a', spot: 1080, w: 340, poses: [{ pose: 'p', hold: 80 }] }] },
    { cenario: 'x', dur: 150, camera: { em: 1080, plano: 'geral' }, personagens: [{ slug: 'a', spot: 1080, w: 380, poses: [{ pose: 'p', hold: 140 }] }] },
  ]],
  // o personagem cresce e o cenário não: foi o "por que ele muda de tamanho no mesmo lugar?" do
  // ditador-copia. Mesmo cenário, mesmo piso (mesma profundidade), w saltando sem a câmera fechar.
  ['INV-10 personagem muda de tamanho sem a câmera mudar', 'escala-incoerente', [
    { cenario: 'x', dur: 90, camera: { em: 1080, plano: 'geral' }, personagens: [{ slug: 'a', spot: 1080, piso: 1300, w: 260, poses: [{ pose: 'p', hold: 80 }] }] },
    { cenario: 'x', dur: 70, camera: { em: 1080, plano: 'geral' }, personagens: [{ slug: 'a', spot: 1080, piso: 1300, w: 700, poses: [{ pose: 'p', hold: 60 }] }] },
  ]],
  ['INV-9 as cenas todas no mesmo fundo', 'direcao-fundo-unico', [
    { cenario: 'x', dur: 120, camera: { em: 1080, plano: 'geral' }, personagens: [{ slug: 'a', spot: 1080, w: 200, poses: [{ pose: 'p', hold: 110 }] }] },
    { cenario: 'x', dur: 90, camera: { em: 1080, plano: 'close' }, personagens: [{ slug: 'a', spot: 1080, w: 800, poses: [{ pose: 'p', hold: 80 }] }] },
    { cenario: 'x', dur: 150, camera: { em: 1080, plano: 'geral' }, personagens: [{ slug: 'a', spot: 1080, w: 620, poses: [{ pose: 'p', hold: 140 }] }] },
  ]],
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
  // GREP NÃO BASTA, E ISSO CUSTOU CARO: a chamada estava lá, o import NÃO, e o try/catch em volta
  // transformava o ReferenceError num aviso. Este teste passava enquanto os INV-1..9 estavam
  // desligados no caminho do render. Agora o invariante tem que EXECUTAR de verdade.
  ok_(/import \{[^}]*invariantes[^}]*\} from '\.\/invariantes\.mjs'/.test(s),
    'validar-cena não IMPORTA invariantes — a chamada existe e lança ReferenceError, que o catch engole');
  const rota = await readFile(path.resolve(raiz, '../server/routes/video.mjs'), 'utf8');
  ok_(/validarCena\(/.test(rota), 'a rota de render não chama validarCena — dá pra renderizar sem passar por gate nenhum');
});

await teste('o GATE DE RENDER reprova de verdade um caso ruim (não só o check da linha de comando)', async () => {
  // exercita o caminho inteiro do gate: validarCena -> invariantes -> erro. É o que teria pego o
  // import faltando no dia em que ele sumiu, em vez de meses depois.
  const { validarCena } = await import('../../server/video/validar-cena.mjs');
  const fs2 = await import('node:fs/promises');
  const alvo = path.join(CONTEUDO_DIR, 'data/videos/__vigia_gate__.json');
  const ruim = {
    id: '__vigia_gate__', formato: '3:4', fps: 30, template: 'roteiro', semAudio: true,
    publicacao: { titulo: 't', legenda: 'l' },
    // fala de quem está fora do enquadramento: o INV-1, o mais antigo da casa
    roteiro: [{ cenario: 'x', dur: 90, camera: { em: 300, plano: 'close' },
      personagens: [{ slug: 'a', spot: 300, w: 300 }, { slug: 'b', spot: 3000, w: 300 }],
      baloes: [{ texto: 'oi', de: 'b' }] }],
    mundo: { cenario: 'x', telas: 2 },
  };
  await fs2.writeFile(alvo, JSON.stringify(ruim));
  try {
    const r = semRuido(() => validarCena('__vigia_gate__'));
    const res = await r;
    ok_((res.erros || []).some((e) => e.tipo === 'fala-fora'),
      `o gate não reprovou fala fora do quadro — os invariantes não estão rodando dentro do validar-cena. Veio: ${JSON.stringify((res.erros || []).map((e) => e.tipo))}`);
  } finally { await fs2.rm(alvo, { force: true }); }
});

await teste('o gate confere o CANVAS do sprite, não só a existência', async () => {
  const s = await readFile(path.join(raiz, 'video/check-video.mjs'), 'utf8');
  ok_(/conferirCanvas\(/.test(s), 'check-video não confere o canvas — sprite CRU volta a passar batido');
  ok_(/canvasNormalizado\(/.test(s), 'a conferência não usa a regra de canvas do contrato (config.mjs)');
});

await teste(`nenhum sprite do acervo está CRU (fora de ${CANVAS_ESPERADO})`, async () => {
  const base = path.join(CONTEUDO_DIR, 'personagens');
  const crus = [];
  for (const slug of await readdir(base).catch(() => [])) {
    for (const sub of ['rigs', 'acoes', 'poses']) {
      const anda = async (d) => { for (const e of await readdir(d, { withFileTypes: true }).catch(() => [])) {
        const f = path.join(d, e.name);
        if (e.isDirectory()) { await anda(f); continue; }
        if (!e.name.endsWith('.png') || e.name.startsWith('_')) continue;
        const m = await sharp(f).metadata().catch(() => null);
        if (!m || !canvasNormalizado(m.width, m.height)) crus.push(path.relative(base, f));
      } };
      await anda(path.join(base, slug, sub));
    }
  }
  ok_(!crus.length, `${crus.length} sprite(s) nunca fatiado(s) no acervo: ${crus.slice(0, 5).join(', ')}${crus.length > 5 ? '…' : ''}\n         normalize: node scripts/sprites/slice-pose.mjs <arquivo> <arquivo>`);
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

// GERAÇÃO QUE CAI FORA DO ACERVO. O `gen-char` continuou gravando em `personagens/<slug>.png`
// (o caminho anterior à migração pra pasta por personagem) depois que todo o resto passou a ler
// `personagens/<slug>/base.png`. O comando dizia OK, o PNG existia, e a base do personagem seguia
// sendo a antiga: dois minutos de geração jogados fora sem uma linha de erro. O sintoma é sempre o
// mesmo e é fácil de ver daqui: PNG solto na raiz de personagens/.
// A DECLARAÇÃO NÃO É PROVA. O `_meta.json` da folha -esq dizia `dir: "left"` porque foi o que
// pediram ao gerador; ele devolveu o personagem virado pra DIREITA e ninguém conferiu. O INV-4
// compara o movimento com a declaração, então aprovou, e três jogadores voltaram de costas no vídeo
// inteiro. Este teste exige que a checagem OLHE A ARTE e saiba distinguir os dois casos.
await teste('a checagem de folha -esq compara ARTE, não a declaração', async () => {
  const { folhaEsqEstaVirada } = await import('../sprites/contratos.mjs');
  const sharp2 = sharp;
  const fs2 = await import('node:fs/promises');
  let par = null;
  for (const slug of await readdir(path.join(CONTEUDO_DIR, 'personagens')).catch(() => [])) {
    for (const tipo of ['correr', 'andar']) {
      const r = await folhaEsqEstaVirada(slug, tipo).catch(() => null);
      if (r) { par = { slug, tipo, r }; break; }
    }
    if (par) break;
  }
  ok_(par, 'nenhum par folha/folha-esq no acervo — cobiaia indisponível pra este guarda');
  ok_(par.r.virada, `${par.slug}/${par.tipo}-esq está no acervo mas a arte NÃO está virada (direta ${par.r.direta} vs espelho ${par.r.espelho})`);
  // e o guarda tem que REPROVAR quando a folha -esq é uma cópia da de direita (o defeito real)
  const dirEsq = path.join(CONTEUDO_DIR, dirRig(par.slug, par.tipo, true));
  const alvo = path.join(dirEsq, `${{ correr: 'r', andar: 'w' }[par.tipo]}L1.png`);
  const bkp = await fs2.readFile(alvo);
  try {
    await fs2.copyFile(path.join(CONTEUDO_DIR, rigQuadro(par.slug, par.tipo, 1)), alvo);
    const r2 = await folhaEsqEstaVirada(par.slug, par.tipo);
    ok_(r2 && !r2.virada, 'a checagem APROVOU uma folha -esq que é cópia da de direita — ela voltou a olhar a declaração em vez da arte');
  } finally { await fs2.writeFile(alvo, bkp); }
});

await teste('nenhuma geração caiu FORA do acervo (png solto em personagens/)', async () => {
  const base = path.join(CONTEUDO_DIR, 'personagens');
  const soltos = (await readdir(base, { withFileTypes: true }).catch(() => []))
    .filter((e) => e.isFile() && e.name.endsWith('.png'))
    .map((e) => e.name);
  ok_(!soltos.length, `${soltos.length} png(s) na raiz de personagens/: ${soltos.slice(0, 6).join(', ')}\n`
    + '         é geração que gravou no caminho pré-migração. O lugar é personagens/<slug>/base.png');
});

console.log(`\n${ok} ok · ${falhou} falhou\n`);
process.exit(falhou ? 1 : 0);
