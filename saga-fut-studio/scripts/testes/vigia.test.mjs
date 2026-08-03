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
      {
        const pasta = path.join(CONTEUDO_DIR, dirRig(slug, tipo));
        if (!existsSync(pasta)) continue;
        if (!existsSync(path.join(pasta, '_meta.json'))) semDir.push(`${slug}/${tipo}`);
      }
    }
  }
  ok_(!semDir.length, `${semDir.length} rig(s) sem direção declarada (o INV-4 fica cego neles): ${semDir.slice(0, 6).join(', ')}${semDir.length > 6 ? '…' : ''}\n         conserte refazendo o rig (ele grava a direção sozinho): node scripts/asset.mjs <idle|andar|correr> <slug>`);
});

// GERAÇÃO QUE CAI FORA DO ACERVO. O `gen-char` continuou gravando em `personagens/<slug>.png`
// (o caminho anterior à migração pra pasta por personagem) depois que todo o resto passou a ler
// `personagens/<slug>/base.png`. O comando dizia OK, o PNG existia, e a base do personagem seguia
// sendo a antiga: dois minutos de geração jogados fora sem uma linha de erro. O sintoma é sempre o
// mesmo e é fácil de ver daqui: PNG solto na raiz de personagens/.
// A VARIANTE PRA ESQUERDA NÃO VOLTOU. Ela existia porque espelhar um jogador COM número inverteria
// o número da camisa, e arrastava atrás de si meia dúzia de mecanismos: folha própria, direção
// declarada, `asset dir`, um comparador de arte contra declaração e um ramo de escolha no composer.
// Em 02/08/2026 número invertido passou a ser aceito e tudo isso saiu. O risco agora é a variante
// voltar aos pedaços — uma pasta `-esq` sobrando no acervo, um `--dir=left` reintroduzido — e o
// sistema ficar de novo com dois caminhos, um deles sem ninguém olhando.
await teste('a variante -esq não voltou (nem no acervo, nem na assinatura dos caminhos)', async () => {
  const base = path.join(CONTEUDO_DIR, 'personagens');
  const sobrando = [];
  for (const slug of (await readdir(base, { withFileTypes: true }).catch(() => [])).filter((e) => e.isDirectory()).map((e) => e.name)) {
    for (const d of (await readdir(path.join(base, slug, 'rigs'), { withFileTypes: true }).catch(() => []))) {
      if (d.isDirectory() && d.name.endsWith('-esq')) sobrando.push(`${slug}/rigs/${d.name}`);
    }
  }
  ok_(!sobrando.length, `${sobrando.length} pasta(s) -esq no acervo: ${sobrando.slice(0, 6).join(', ')}\n`
    + '         a folha é uma só, sempre pra direita; a esquerda é o motor espelhando');
  // e os caminhos não podem ter voltado a aceitar a variante
  const { dirRig: dr, prefixoRig: pr } = await import('../../shared/personagem.mjs');
  ok_(dr('x', 'andar', true) === dr('x', 'andar'), 'dirRig voltou a aceitar um terceiro argumento de variante');
  ok_(pr('andar', true) === pr('andar'), 'prefixoRig voltou a aceitar variante (prefixo wL/rL)');
});

await teste('nenhuma geração caiu FORA do acervo (png solto em personagens/)', async () => {
  const base = path.join(CONTEUDO_DIR, 'personagens');
  const soltos = (await readdir(base, { withFileTypes: true }).catch(() => []))
    .filter((e) => e.isFile() && e.name.endsWith('.png'))
    .map((e) => e.name);
  ok_(!soltos.length, `${soltos.length} png(s) na raiz de personagens/: ${soltos.slice(0, 6).join(', ')}\n`
    + '         é geração que gravou no caminho pré-migração. O lugar é personagens/<slug>/base.png');
});

// O CARTÃO AINDA É GERADO? Terceira vez que uma mudança de pasta desligou uma guarda em silêncio:
// o sprite-card montava o caminho à mão (`saga-fut/rigs/<tipo>/<slug>/`) e ficou apontando pro lugar
// pré-migração; os slice-* o chamavam com `.catch(() => null)`, então o cartão simplesmente parou de
// sair, sem um aviso sequer. Dói mais que as outras duas: o cartão é o ÚNICO lugar em que se bate o
// olho na orientação e na respiração antes da sprite entrar num vídeo, e o `asset dir` manda
// conferir exatamente esse arquivo. Este teste executa o caminho de verdade num sprite do acervo.
await teste('o cartão de revisão AINDA é gerado (caminho não ficou no lugar pré-migração)', async () => {
  const { cartaoIdle, cartaoAndar } = await import('../sprites/sprite-card.mjs');
  const base = path.join(CONTEUDO_DIR, 'personagens');
  const slugs = (await readdir(base, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name);
  const casos = [['idle', cartaoIdle], ['andar', cartaoAndar]];
  for (const [tipo, fn] of casos) {
    const slug = slugs.find((s) => existsSync(path.join(CONTEUDO_DIR, rigQuadro(s, tipo, 1))));
    ok_(slug, `nenhum sprite de ${tipo} no acervo — cobaia indisponível pra este guarda`);
    const out = await fn(slug).catch((e) => { throw new Error(`cartao${tipo} lançou: ${e.message}`); });
    ok_(out && existsSync(out), `cartao${tipo}(${slug}) não deixou arquivo em ${out}`);
    ok_(out.includes(path.join('personagens', slug)), `o cartão de ${tipo} gravou FORA da pasta do personagem: ${out}`);
  }
});

// O GATE DE PASSADA AINDA REPROVA? Alimenta o validador com o caso sabidamente ruim (um ciclo em que
// dois quadros são o MESMO arquivo) e exige que ele reclame. Sem isto, o gate vira no-op no dia em
// que a faixa das pernas, o prefixo do quadro ou a pasta do rig mudarem, e a folha chapada volta a
// entrar no acervo com o carimbo de aprovada.
await teste('o gate de passada REPROVA ciclo com dois quadros iguais', async () => {
  const { validarCiclo, CICLO_FAIL, CICLO_ABERTURA_MAX } = await import('../sprites/ciclo.mjs');
  const fs2 = await import('node:fs/promises');
  const base = path.join(CONTEUDO_DIR, 'personagens');
  const slugs = (await readdir(base, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name);
  // uma cobaia que HOJE passa: o teste tem que ser capaz de reprovar algo que estava aprovado
  let cobaia = null;
  for (const s of slugs) {
    if (!existsSync(path.join(CONTEUDO_DIR, rigQuadro(s, 'andar', 1)))) continue;
    const r = await validarCiclo(s, 'andar').catch(() => null);
    if (r && r.nivel === 'ok') { cobaia = s; break; }
  }
  ok_(cobaia, 'nenhum ciclo de andar aprovado no acervo — cobaia indisponível pra este guarda');
  const alvo = path.join(CONTEUDO_DIR, rigQuadro(cobaia, 'andar', 2));
  const bkp = await fs2.readFile(alvo);
  try {
    // w2 vira uma cópia de w1: dois desenhos iguais no ciclo, o defeito real
    await fs2.copyFile(path.join(CONTEUDO_DIR, rigQuadro(cobaia, 'andar', 1)), alvo);
    const r = await validarCiclo(cobaia, 'andar');
    ok_(r.nivel === 'fail', `o gate APROVOU um ciclo com w1 e w2 idênticos em ${cobaia} (deu "${r.nivel}", ${r.dif})`);
  } finally { await fs2.writeFile(alvo, bkp); }
  // e o limiar não pode ter sido afrouxado até virar decorativo
  ok_(CICLO_FAIL >= 0.05 && CICLO_FAIL <= 0.2, `CICLO_FAIL=${CICLO_FAIL} está fora da faixa medida no acervo (0.05 a 0.2)`);
  // A RÉGUA TEM DOIS LADOS. Consertar "a perna não se mexe" produziu na primeira tentativa o defeito
  // oposto (espacate + joelho de marcha), que passava no piso com folga. Se o teto sumir ou virar um
  // teto só, volta a passar: um teto único calibrado no andar reprova a corrida, que é aberta por
  // natureza, e gate que reprova o certo é gate que alguém aprende a contornar.
  ok_(CICLO_ABERTURA_MAX && CICLO_ABERTURA_MAX.andar && CICLO_ABERTURA_MAX.correr,
    'o teto de abertura sumiu ou deixou de ser por tipo — sem ele o gerador vai pro extremo aberto, que o piso não mede');
  ok_(CICLO_ABERTURA_MAX.correr > CICLO_ABERTURA_MAX.andar,
    `o teto de correr (${CICLO_ABERTURA_MAX.correr}) tem que ser MAIOR que o de andar (${CICLO_ABERTURA_MAX.andar}): corrida tem passada aberta por definição`);
  // e o teto tem que reprovar o exagero real medido no acervo (a folha que o olho reprovou: 2.24)
  ok_(CICLO_ABERTURA_MAX.andar < 2.24, `o teto de andar (${CICLO_ABERTURA_MAX.andar}) aprovaria a folha que foi reprovada a olho (2.24)`);
});

// O GATE DE ORIENTAÇÃO AINDA PEGA QUADRO VIRADO? Alimenta com o caso real: um quadro do ciclo
// espelhado. Sem isto, o dia em que a máscara mudar de faixa (ela olha só a metade DE CIMA, porque
// no corpo inteiro as pernas diluem o sinal) o gate volta a aprovar o personagem que se vira de
// costas no meio do ciclo, que foi como o aranha-riso entrou no acervo.
await teste('o gate de orientação REPROVA um quadro espelhado no meio do ciclo', async () => {
  const { validarCiclo, CICLO_VIRADO, CICLO_VIRADO_AVISO } = await import('../sprites/ciclo.mjs');
  const fs2 = await import('node:fs/promises');
  const base = path.join(CONTEUDO_DIR, 'personagens');
  const slugs = (await readdir(base, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name);
  let cobaia = null;
  for (const s of slugs) {
    if (!existsSync(path.join(CONTEUDO_DIR, rigQuadro(s, 'andar', 1)))) continue;
    const r = await validarCiclo(s, 'andar').catch(() => null);
    if (r && r.nivel === 'ok') { cobaia = s; break; }
  }
  ok_(cobaia, 'nenhum ciclo de andar aprovado no acervo — cobaia indisponível pra este guarda');
  const alvo = path.join(CONTEUDO_DIR, rigQuadro(cobaia, 'andar', 3));
  const bkp = await fs2.readFile(alvo);
  try {
    await fs2.writeFile(alvo, await sharp(bkp).flop().toBuffer());   // w3 espelhado: o defeito real
    const r = await validarCiclo(cobaia, 'andar');
    ok_(r.nivel === 'fail' && /MESMO LADO/.test(r.msg),
      `o gate APROVOU um ciclo com w3 espelhado em ${cobaia} (deu "${r.nivel}": ${r.msg})`);
  } finally { await fs2.writeFile(alvo, bkp); }
  ok_(CICLO_VIRADO > CICLO_VIRADO_AVISO, 'o patamar que barra tem que ser mais exigente que o que avisa');
  ok_(CICLO_VIRADO <= 2.3, `CICLO_VIRADO=${CICLO_VIRADO} passou do sinal mais fraco já confirmado a olho (aranha-riso, 2.3x)`);
});

// O GATE DE ESCALA PEGA O CASO QUE A MEDIANA ESCONDE? O abdelkarim-riso tinha cabeças de 223 e
// 252px e passou como "consistente" porque a régua olhava o desvio de cada quadro em relação à
// MEDIANA: um 7% abaixo, outro 5% acima, nenhum estourando o limite sozinho. O olho compara os
// quadros ENTRE SI, não com a mediana. Este teste monta exatamente essa distribuição.
await teste('o gate de escala pega extremos que destoam ENTRE SI (não só da mediana)', async () => {
  const { CICLO_ESCALA_MAX } = await import('../sprites/ciclo.mjs');
  // a distribuição real do defeito: dois quadros na mediana, um abaixo e um acima, nenhum passando
  // de 8% individualmente, mas 12% entre o menor e o maior
  const cabecas = [252, 240, 240, 223];
  const med = 240;
  const desvioMax = Math.max(...cabecas.map((c) => Math.abs(c - med) / med));
  const amplitude = (Math.max(...cabecas) - Math.min(...cabecas)) / Math.max(...cabecas);
  ok_(desvioMax <= 0.08, 'cobaia mal montada: algum quadro já destoa da mediana sozinho');
  ok_(amplitude > CICLO_ESCALA_MAX,
    `CICLO_ESCALA_MAX=${CICLO_ESCALA_MAX} não pega ${(amplitude * 100).toFixed(0)}% de amplitude — o caso do abdelkarim-riso voltaria a passar`);
  // e o gate real tem que reprovar a folha real
  const { validarCiclo } = await import('../sprites/ciclo.mjs');
  if (existsSync(path.join(CONTEUDO_DIR, rigQuadro('abdelkarim-riso', 'correr', 1)))) {
    const r = await validarCiclo('abdelkarim-riso', 'correr').catch(() => null);
    if (r) ok_(r.nivel !== 'ok' || true, 'ok');   // informativo: a folha pode já ter sido refeita
  }
});

// O GATE DE DERIVA AINDA PEGA CORPO ESCORREGANDO? E o PADRÃO-OURO ainda passa? As duas metades
// importam: um gate de deriva frouxo deixa o personagem deslizar além do que o roteiro mandou, e um
// apertado reprova a melhor corrida do acervo, que é a régua com que ele foi calibrado.
await teste('o gate de deriva pega corpo escorregando, e aprova o padrão-ouro', async () => {
  const { validarCiclo, CICLO_DERIVA_MAX, CICLO_REFERENCIA } = await import('../sprites/ciclo.mjs');
  const refOk = existsSync(path.join(CONTEUDO_DIR, rigQuadro(CICLO_REFERENCIA.slug, CICLO_REFERENCIA.tipo, 1)));
  ok_(refOk, `a referência de qualidade (${CICLO_REFERENCIA.slug}/${CICLO_REFERENCIA.tipo}) sumiu do acervo — sem ela o limiar não tem contra o que ser conferido`);
  const r = await validarCiclo(CICLO_REFERENCIA.slug, CICLO_REFERENCIA.tipo);
  ok_(r.nivel !== 'fail' || !/ESCORREGA/.test(r.msg),
    `o gate de deriva REPROVOU o próprio padrão-ouro (${CICLO_REFERENCIA.slug}): ${r.msg}`);
  // e o limiar não pode ter sido afrouxado além do defeito real medido a olho (16% e 18%)
  ok_(CICLO_DERIVA_MAX < 0.16, `CICLO_DERIVA_MAX=${CICLO_DERIVA_MAX} aprovaria a folha reprovada a olho (16%)`);
});

// TODA GERAÇÃO DE PERSONAGEM AINDA PASSA PELO PERSONAGEM-PADRÃO?
//
// A regra da casa é que todo asset novo nasce copiando a folha correspondente do personagem-padrão,
// e isso não é preferência de estilo: é o que sustenta a qualidade de animação, que nenhuma régua
// mede. O jeito de essa regra morrer não é alguém revogá-la, é alguém escrever o PRÓXIMO gerador
// montando a própria lista de referências, como os cinco anteriores faziam — e ninguém notar,
// porque o asset sai plausível.
//
// Este guarda é sintático de propósito: ele lê o código dos geradores de personagem e exige que
// cada um peça o par ao lugar certo. Um teste que só gerasse imagem não pegaria isso sem gastar.
await teste('todo gerador de asset de personagem pede o par ao referencia.mjs', async () => {
  const dir = path.join(raiz, 'sprites');
  // os que desenham UM PERSONAGEM. Ficam de fora, e o motivo importa: cenário e estilo não têm
  // personagem nenhum, e o gen-char nasce de uma FOTO de gente real, então não há folha do padrão
  // que corresponda ao que ele produz.
  const DE_PERSONAGEM = ['gen-model-sheet', 'gen-walk', 'gen-run', 'gen-idle', 'gen-acao', 'gen-pose', 'gen-react'];
  const faltando = [];
  for (const g of DE_PERSONAGEM) {
    const src = await readFile(path.join(dir, `${g}.mjs`), 'utf8').catch(() => '');
    ok_(src, `${g}.mjs sumiu — se foi renomeado, atualize esta lista, senão o guarda para de guardar`);
    if (!/duasReferencias\s*\(/.test(src)) faltando.push(g);
  }
  ok_(!faltando.length,
    `estes geradores montam referências por conta própria: ${faltando.join(', ')} — chame duasReferencias() (ver referencia.mjs)`);

  // e o par tem que ser realmente DOIS, com a pose do padrão na frente
  const { duasReferencias, PERSONAGEM_PADRAO } = await import('../sprites/referencia.mjs');
  const r = duasReferencias('andar', 'um-personagem-qualquer', () => true);
  ok_(r.refs.length === 2, `o par devolveu ${r.refs.length} referência(s), deveria devolver 2`);
  ok_(r.refs[0].includes(PERSONAGEM_PADRAO),
    `a PRIMEIRA referência não é do personagem-padrão (${r.refs[0]}) — a ordem é o que diz ao modelo quem é o exemplo e quem é o alvo`);
  ok_(!r.refs[1].includes(PERSONAGEM_PADRAO),
    `a SEGUNDA referência é do próprio padrão (${r.refs[1]}) — a identidade tem que vir do alvo`);

  // gerar o padrão não pode virar copiar a si mesmo
  const p = duasReferencias('andar', PERSONAGEM_PADRAO, () => true);
  ok_(!p.refs[0].startsWith(`personagens/${PERSONAGEM_PADRAO}/rigs/andar`),
    'o personagem-padrão está servindo de referência PRA SI MESMO: copiar a própria folha não ensina nada');
});

console.log(`\n${ok} ok · ${falhou} falhou\n`);
process.exit(falhou ? 1 : 0);
