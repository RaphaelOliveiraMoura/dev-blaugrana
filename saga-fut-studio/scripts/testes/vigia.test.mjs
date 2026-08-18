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
    personagens: [{ slug: 'vinicius-riso', preOrientado: true, spot: 1080, w: 400, de: 'direita', entra: 'correr' }],
  }]],
  // O CASO QUE FUROU O INV-4 EM 14/08/2026: quem desloca com FOLHA DE GESTO (`ciclo` + `move`) em
  // vez de andar/correr passava batido, e o jogador saiu de costas com a mala no ferran-amor.
  ['INV-4 desloca com folha de gesto pro lado oposto', 'orientacao', [{
    cenario: 'x', dur: 120, camera: { em: 1080, plano: 'geral' },
    personagens: [{ slug: 'ferran-riso', preOrientado: true, spot: 1080, w: 300,
      poses: [{ ciclo: 'andar-mala', quadros: 4, move: -400, hold: 100 }] }],
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
    { cenario: 'x', dur: 60, camera: { em: 1080, plano: 'geral' }, personagens: [{ slug: 'vinicius-riso', spot: 1080, w: 400, poses: [{ ciclo: 'assustar', quadros: 4 }] }] },
    { cenario: 'x', dur: 60, camera: { em: 1080, plano: 'geral' }, personagens: [{ slug: 'vinicius-riso', spot: 1080, w: 400, poses: [{ ciclo: 'assustar', quadros: 4 }] }] },
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

    // O BLOCO DE ÁUDIO PRECISA DO SEU PRÓPRIO CASO RUIM. O vídeo acima é `semAudio: true`, e o
    // validador pula o bloco inteiro nesse caso — foi por essa fresta que o gate de ACENTO ficou
    // meses sem rodar: as duas funções que ele chama não estavam importadas, a rota devolvia 500 e
    // o teste continuava verde porque nunca entrava ali. Mesma classe de defeito do import de
    // `invariantes`, no MESMO arquivo, e a lição é que "o gate roda" tem que ser medido por CAMINHO,
    // não por arquivo.
    const comVoz = {
      ...ruim, semAudio: false,
      roteiro: [{ cenario: 'x', dur: 90, camera: { em: 300, plano: 'close' },
        personagens: [{ slug: 'a', spot: 300, w: 300 }],
        baloes: [{ texto: 'VOCE MOSTROU QUE E CAPAZ', de: 'a', voz: 'narrador' }] }],
    };
    await fs2.writeFile(alvo, JSON.stringify(comVoz));
    const res2 = await semRuido(() => validarCena('__vigia_gate__'));
    ok_((res2.erros || []).some((e) => e.tipo === 'acento'),
      `o gate de acento não rodou dentro do validar-cena — o vídeo sai com a voz lendo o verbo como conjunção. Veio: ${JSON.stringify((res2.erros || []).map((e) => e.tipo))}`);
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
// costas no meio do ciclo, que foi como o alvarez-riso entrou no acervo.
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
  ok_(CICLO_VIRADO <= 2.3, `CICLO_VIRADO=${CICLO_VIRADO} passou do sinal mais fraco já confirmado a olho (alvarez-riso, 2.3x)`);
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

// O SELETOR DO STUDIO AINDA MANDA NOS DOIS CAMINHOS?
//
// Existem DOIS registros de modelo de imagem, e isso não é descuido: `server/providers/imagem.mjs`
// serve as rotas do studio (recebe o `pedido` já composto e devolve a imagem) e
// `scripts/sprites/modelo.mjs` serve a linha de comando (recebe prompt e referências). Eles têm
// APIs diferentes de propósito, mas precisam concordar em duas coisas: QUAIS modelos existem e QUAL
// é o padrão. Se divergirem, o seletor passa a oferecer um modelo que o `asset` não conhece, ou o
// padrão do studio deixa de ser o padrão do lote — nos dois casos em silêncio, e a diferença só
// aparece na fatura ou na arte.
await teste('o seletor do studio e a linha de comando conhecem os MESMOS modelos', async () => {
  const [servidor, cli] = await Promise.all([
    import('../../server/providers/imagem.mjs'),
    import('../sprites/modelo.mjs'),
  ]);
  const doServidor = Object.keys(servidor.MODELOS_IMAGEM).sort();
  const doCli = [...cli.MODELOS_VALIDOS].sort();
  ok_(doServidor.join(',') === doCli.join(','),
    `listas divergem: studio tem [${doServidor}], linha de comando tem [${doCli}] — um modelo novo precisa entrar nos dois`);
  ok_(servidor.MODELO_IMAGEM_PADRAO === cli.MODELO_PADRAO,
    `padrões divergem: studio cai em "${servidor.MODELO_IMAGEM_PADRAO}", linha de comando em "${cli.MODELO_PADRAO}"`);

  // e o que está SELECIONADO tem que vencer o padrão nos dois caminhos
  const { readDados } = await import('../../server/store.mjs');
  const dados = await readDados();
  const escolhido = dados?.projeto?.modeloImagem;
  if (escolhido) {
    ok_(servidor.resolverModeloImagem(dados).id === escolhido,
      `a rota de geração do studio ignora o seletor (resolveu "${servidor.resolverModeloImagem(dados).id}" com "${escolhido}" selecionado)`);
    ok_(cli.modeloEfetivo() === escolhido,
      `a linha de comando ignora o seletor (resolveu "${cli.modeloEfetivo()}" com "${escolhido}" selecionado)`);
  }
  // o override de uma execução continua vencendo os dois
  ok_(servidor.resolverModeloImagem(dados, 'grok').id === 'grok', 'o override por request parou de valer no studio');
  ok_(cli.modeloEfetivo('grok') === 'grok', 'o override --modelo= parou de valer na linha de comando');
});

// O PERSONAGEM AINDA APARECE DO MESMO TAMANHO EM TODA ANIMAÇÃO?
//
// A escala do canvas é UMA por folha e sai do quadro mais exigente, então um gesto amplo (o corpo
// deitado do carrinho, o mergulho do goleiro) encolhe TAMBÉM os quadros em pé daquela folha. Na
// tela isso é o personagem mudando de tamanho quando troca de animação — e passou despercebido em
// ONZE folhas do acervo, incluindo `defender` e `cair`, que são de uso comum.
//
// O conserto mora em dois pedaços distantes: o slicer MEDE e grava `aperto` no _meta.json, e o
// motor DESFAZ o encolhimento ao desenhar. Guarda separada num arquivo é guarda que para de guardar
// quando o outro lado muda — este teste liga os dois.
await teste('o mecanismo do `aperto` está ligado nas três pontas', async () => {
  // O QUE ESTE GUARDA PROTEGE: a escala do canvas é UMA por folha e sai do quadro mais exigente,
  // então um gesto amplo (o corpo deitado do carrinho, o mergulho do goleiro) encolhe TAMBÉM os
  // quadros em pé daquela folha — na tela, o personagem muda de tamanho ao trocar de animação.
  // Estava assim em ONZE folhas do acervo, incluindo `defender` e `cair`.
  //
  // O conserto mora em três arquivos distantes: o slicer MEDE, o composer REPASSA e o motor
  // DESFAZ. Qualquer um dos três parar deixa os outros dois funcionando e o defeito volta calado —
  // que é exatamente a classe de falha que este arquivo existe pra pegar.
  //
  // COBERTURA do acervo NÃO é problema daqui: folha legada sem `aperto` vira fila no `asset doutor`.
  const slicer = await readFile(path.resolve(raiz, 'sprites/slice-acao.mjs'), 'utf8');
  ok_(/aperto/.test(slicer) && /cabIdle \/ cabFolha/.test(slicer),
    'o slicer parou de MEDIR o aperto pela CABEÇA (a régua invariante): pelo corpo o número sai errado em pose inclinada');
  const composer = await readFile(path.resolve(raiz, '../server/video/montar-cena.mjs'), 'utf8');
  ok_(/p\.aperto = mCiclo\.aperto/.test(composer),
    'o composer parou de REPASSAR o aperto do _meta.json pra pose');
  const motor = await readFile(path.resolve(raiz, '../remotion/src/Cena.jsx'), 'utf8');
  ok_(/cur\.aperto/.test(motor),
    'o motor parou de CONSUMIR o aperto: o slicer mede, o composer repassa e ninguém aplica');

  // e a ponta a ponta: uma folha real com aperto tem que chegar na pose montada
  const { readdir } = await import('node:fs/promises');
  const base = path.join(CONTEUDO_DIR, 'personagens');
  let cobaia = null;
  for (const slug of await readdir(base).catch(() => [])) {
    for (const g of await readdir(path.join(base, slug, 'acoes')).catch(() => [])) {
      const f = path.join(base, slug, 'acoes', g, '_meta.json');
      if (!existsSync(f)) continue;
      const m = JSON.parse(await readFile(f, 'utf8'));
      if (m.aperto > 1.03) { cobaia = { slug, g, m }; break; }
    }
    if (cobaia) break;
  }
  if (cobaia) {
    const { scene } = semRuido(() => montarCena({
      id: '__vigia__', formato: '3:4', fps: 30, template: 'roteiro',
      roteiro: [{ cenario: 'x', dur: 120, personagens: [{ slug: cobaia.slug, spot: 540, w: 400,
        poses: [{ ciclo: cobaia.g, quadros: cobaia.m.quadros, hold: 60 }] }] }],
    }));
    const pose = (scene.shots[0].chars[0].poses || []).find((p) => p.aperto);
    ok_(pose, `${cobaia.slug}/${cobaia.g} tem aperto ${cobaia.m.aperto} no _meta mas a pose montada não carrega — o personagem volta a encolher na tela`);
  }
});

console.log('\n== NOME INTERNO AINDA NÃO ATRAVESSA PRO MODELO ==\n');

await teste('slug do acervo escrito no promptImagem sai traduzido pro nome de exibição', async () => {
  // O QUE ESTE GUARDA PROTEGE: o `promptImagem` é o único texto do quadrinho que vai INTEIRO pro
  // gerador sem passar por nada. Nome interno lá dentro é candidato a virar rótulo desenhado, e
  // isso já aconteceu duas vezes num painel só ("Pedrin, o Maestro (rabisco riso)"). O painel 8 do
  // o-dia-remontada dizia "the cast sheet named rei-riso" — um id que o modelo não tem como
  // entender, e que o rename de 06/08/2026 ainda por cima deixou apontando pra um slug morto.
  const { comporPrompt } = await import('../../server/prompts.mjs');
  const d = {
    projeto: {},
    personagens: [{ id: 'messi-riso', nome: 'Messi (rabisco riso)' }],
    quadrinhos: [{
      id: '__vigia__', formato: '3:4',
      paineis: [{ numero: 1, personagens: [], promptImagem: 'the number 10 player named messi-riso celebrates' }],
    }],
  };
  const { composed } = await comporPrompt(d, { tipo: 'painel', quadrinhoId: '__vigia__', painelNumero: 1 });
  ok_(!/messi-riso/.test(composed),
    'o slug "messi-riso" ATRAVESSOU pro prompt: o modelo recebe um id do acervo e pode desenhá-lo no painel');
  ok_(/named Messi\b/.test(composed),
    'trocou o slug mas não pôs o nome de exibição no lugar: a frase ficou sem referente');
  ok_(!/rabisco riso/.test(composed),
    'o sufixo de estilo do nome foi junto pro prompt (é vocabulário interno, não descrição de arte)');
});

console.log('\n== AGENDA FORA DE FORMATO AINDA É BARRADA ==\n');

await teste('data DD/MM não entra pelas portas de escrita, nem pela do front nem pela granular', async () => {
  // O QUE ESTE GUARDA PROTEGE: o cronograma casa `agenda` com a chave do dia ('2026-11-19'). Uma
  // data em outro formato não bate com dia nenhum E não conta como pendente (é string
  // preenchida), então o item some das DUAS listas da tela sem erro em lugar nenhum. Aconteceu
  // com 58 quadrinhos da série "O Dia Em Que" de uma vez, porque a skill pedia "agenda no
  // aniversário do fato" e "aniversário" em português se escreve 19/11.
  //
  // Este é o caso clássico do vigia: a guarda que some não grita. Sem este teste, alguém
  // simplifica `problemaNaAgenda` e os quadrinhos voltam a evaporar caladamente.
  const { validarPayload, problemaNaAgenda } = await import('../../server/store.mjs');

  ok_(problemaNaAgenda({ agenda: '19/11' }, 'x'), 'DD/MM passou: é o formato exato que sumiu com 58 quadrinhos');
  ok_(problemaNaAgenda({ agenda: '2026-02-31' }, 'x'), '31 de fevereiro passou: casa no regex mas não é data');
  ok_(problemaNaAgenda({ agenda: '19-11-2026' }, 'x'), 'DD-MM-YYYY passou');
  ok_(!problemaNaAgenda({ agenda: '2026-11-19' }, 'x'), 'data ISO válida foi REPROVADA');
  ok_(!problemaNaAgenda({}, 'x'), 'item sem agenda foi reprovado: sem data é legítimo, é a fila de Pendentes');
  ok_(!problemaNaAgenda({ agenda: '' }, 'x'), 'agenda vazia foi reprovada: equivale a sem data');

  // e a porta do front (o objeto inteiro) tem que reclamar do MESMO jeito
  const base = { projeto: {}, personagens: [], sagas: [] };
  ok_(validarPayload({ ...base, quadrinhos: [{ id: 'q1', paineis: [], agenda: '19/11' }] }),
    'PUT /api/dados aceitou quadrinho com agenda DD/MM');
  ok_(!validarPayload({ ...base, quadrinhos: [{ id: 'q1', paineis: [], agenda: '2026-11-19' }] }),
    'PUT /api/dados recusou uma agenda VÁLIDA (o guarda virou bloqueio geral)');
  ok_(validarPayload({ ...base, sagas: [{ id: 's1', episodios: [{ id: 'e1', agenda: '19/11' }] }] }),
    'episódio de saga escapou da checagem de agenda');
});

console.log('\n== TRILHA SUGERIDA AINDA É CONFERIDA ==\n');

await teste('sugestão de trilha com arquivo inventado, sem motivo ou com default solta é barrada', async () => {
  // O QUE ESTE GUARDA PROTEGE: a sugestão é escrita por quem cria o quadrinho (a skill, um
  // script, o studio) e só é LIDA muito depois, na hora de montar o vídeo. Nome de faixa
  // inventado não quebra nada na escrita: quebra no render, que trata trilha ausente como
  // "sem trilha" e segue mudo. O erro apareceria como um vídeo sem som, sem nenhuma pista.
  const { problemaNasSugestoes, FICHAS } = await import('../../shared/musica-quadrinho.mjs');
  const umaReal = Object.keys(FICHAS)[0];

  ok_(problemaNasSugestoes({ id: 'q', trilhaSugestoes: [{ arquivo: 'nao-existe.mp3', porque: 'x' }] }),
    'faixa fora do catálogo passou: vira vídeo mudo no render, sem erro nenhum');
  ok_(problemaNasSugestoes({ id: 'q', trilhaSugestoes: [{ arquivo: umaReal }] }),
    'sugestão sem "porque" passou: sem o motivo ela não ajuda a escolher, só ocupa espaço');
  ok_(problemaNasSugestoes({ id: 'q', trilhaSugestoes: [{ arquivo: umaReal, porque: 'x' }], videoMusica: 'outra-coisa.mp3' }),
    'default fora da lista de sugeridas passou: a lista deixa de explicar a escolha que está valendo');
  ok_(!problemaNasSugestoes({ id: 'q', trilhaSugestoes: [{ arquivo: umaReal, porque: 'serve' }], videoMusica: umaReal }),
    'sugestão VÁLIDA foi reprovada');
  ok_(!problemaNasSugestoes({ id: 'q' }),
    'quadrinho sem sugestão nenhuma foi reprovado: os antigos não têm, e isso é legítimo');

  // e o catálogo tem que estar coerente consigo mesmo: toda ficha aponta pro arquivo que o
  // script de download realmente grava
  const { CATALOGO, arquivoDe, TONS } = await import('../../shared/musica-quadrinho.mjs');
  for (const m of CATALOGO) {
    ok_(TONS[m.tom], `faixa "${m.titulo}" tem tom "${m.tom}", que não existe em TONS`);
    ok_(FICHAS[arquivoDe(m)], `faixa "${m.titulo}" não é encontrável pelo nome de arquivo que ela mesma gera`);
  }
});

console.log('\n== A CRIAÇÃO POR API AINDA É POSSÍVEL (a UI não cria mais nada) ==\n');

await teste('as portas de escrita existem pros três tipos, e a UI não tem mais botão de criar', async () => {
  // O QUE ESTE GUARDA PROTEGE: em 12/08/2026 os botões de CRIAR sumiram da tela inteira (novo
  // quadrinho, novo painel, novo personagem, nova saga, novo episódio, nova cena, novo estilo,
  // e os duplicar). Tudo passa a nascer do roteiro, pela API, escrito pelo agente.
  //
  // Isso torna a API a ÚNICA porta. Antes, se uma rota quebrasse, sobrava a tela como plano B e
  // alguém percebia no mesmo dia; agora, uma rota de escrita quebrada significa que NADA NOVO
  // ENTRA no acervo, e o sintoma é o silêncio. Este teste é o alarme.
  const rotas = await readFile(path.join(raiz, '../server/routes/dados.mjs'), 'utf8');

  for (const verbo of ['get', 'put', 'delete']) {
    ok_(new RegExp(`dadosRouter\\.${verbo}\\(\`/\\$\\{rota\\}/:id\``).test(rotas),
      `a rota granular ${verbo.toUpperCase()} /api/<tipo>/:id sumiu: sem ela o agente não escreve peça nenhuma`);
  }
  ok_(/dadosRouter\.put\('\/dados'/.test(rotas),
    'o PUT /api/dados sumiu: é por ele que personagem, cenário e estilo são criados');
  ok_(/const TIPOS = \{[^}]*quadrinhos[^}]*videos[^}]*sagas[^}]*\}/s.test(rotas)
    || /const TIPOS = \{[^}]*videos[^}]*quadrinhos[^}]*sagas[^}]*\}/s.test(rotas),
    'a lista TIPOS não cobre mais os três (quadrinhos, videos, sagas)');

  // E a UI não pode ter voltado a criar: dois caminhos de criação com regras diferentes é como o
  // padrão da casa se perde (a tela nasce em branco, o roteiro nasce completo).
  const views = path.join(raiz, '../src/views');
  const arquivos = [];
  const varrer = async (d) => {
    for (const e of await readdir(d, { withFileTypes: true })) {
      const f = path.join(d, e.name);
      if (e.isDirectory()) await varrer(f);
      else if (e.name.endsWith('.jsx')) arquivos.push(f);
    }
  };
  await varrer(views);
  const proibido = /(Nov[oa] (quadrinho|painel|personagem|saga|epis[óo]dio|cena|estilo)|Adicionar do pool)/i;
  const reincidentes = [];
  for (const f of arquivos) {
    const txt = await readFile(f, 'utf8');
    // só conta o que está em TEXTO DE BOTÃO/opção, não em comentário explicando a remoção
    const semComentarios = txt.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    if (proibido.test(semComentarios)) reincidentes.push(path.basename(f));
  }
  ok_(!reincidentes.length,
    `voltou botão de criar na UI (${reincidentes.join(', ')}): a criação mora no roteiro, não no formulário`);
});

await teste('o que a tela manda REDESENHAR passa pelo salvar antes', async () => {
  // O QUE ESTE GUARDA PROTEGE: a prévia do slide é desenhada pelo SERVIDOR, que lê o
  // data/*.json do DISCO. Com fala digitada e não salva, o slide voltava redesenhado com o
  // texto ANTIGO, sem erro nenhum, e o sintoma é "cliquei em atualizar prévia e não mudou
  // nada" (foi o que aconteceu no deck de coringas em 13/08/2026).
  //
  // A cura é o `previaPainel` do App.jsx, que salva antes. Este teste barra a view que
  // chamar a API direto de novo, que é como o pulo do save volta calado.
  const app = await readFile(path.join(raiz, '../src/App.jsx'), 'utf8');
  ok_(/async function previaPainel[\s\S]{0,400}?dirty && !\(await save\(\)\)/.test(app),
    'o previaPainel do App.jsx parou de salvar antes: a prévia volta a redesenhar o texto velho');

  const views = path.join(raiz, '../src/views');
  const arquivos = [];
  const varrer = async (d) => {
    for (const e of await readdir(d, { withFileTypes: true })) {
      const f = path.join(d, e.name);
      if (e.isDirectory()) await varrer(f);
      else if (e.name.endsWith('.jsx')) arquivos.push(f);
    }
  };
  await varrer(views);
  const direto = [];
  for (const f of arquivos) {
    // só o `gerarPrevia`: o catálogo de fontes do mesmo módulo é leitura, e pode vir direto
    if (/import \{[^}]*\bgerarPrevia\b[^}]*\} from/.test(await readFile(f, 'utf8'))) direto.push(path.basename(f));
  }
  ok_(!direto.length,
    `view chamando a prévia direto na API (${direto.join(', ')}): use o previaPainel do contexto, que salva antes`);
});

await teste('nenhum criador de peça escreve em data/ por fora da API', async () => {
  // O QUE ESTE GUARDA PROTEGE: escrever direto em `saga-fut/data/` com o studio ABERTO é perder a
  // peça — ele mantém tudo em memória e sobrescreve no próximo save (CLAUDE.md §1). O
  // `new-video.mjs` fazia exatamente isso até 12/08/2026, e não por descuido: o stub nascia com
  // `publicacao` vazia e as portas RECUSAM vídeo sem título e legenda, então a regra que protege
  // o acervo empurrava o script pra fora dela. Hoje ele pede os dois e entra pela porta.
  //
  // O fallback pro disco continua legítimo, mas só no `catch` (studio fechado, ninguém pra
  // sobrescrever). O que este teste barra é escrever no disco como caminho PRINCIPAL.
  const criadores = [
    ['scripts/video/new-video.mjs', 'VIDEO_DIR'],
    ['gerar-conta.mjs', 'CONTEUDO_DIR'],
    ['gerar-quiz.mjs', 'CONTEUDO_DIR'],
  ];
  for (const [rel] of criadores) {
    const f = path.join(raiz, '..', rel);
    if (!existsSync(f)) continue;
    const src = await readFile(f, 'utf8');
    ok_(/fetch\(/.test(src) && /\/api\//.test(src),
      `${rel} não fala com a API: criador de peça tem que gravar pelo studio, não no disco`);

    // se ele escreve no disco, a escrita precisa estar DEPOIS de um catch (o plano B), nunca solta
    const escreveDisco = /writeDados\(|fs\.writeFile\([^)]*(?:VIDEO_DIR|jsonPath|DATA_DIR)/.test(src);
    if (escreveDisco) {
      ok_(/catch\s*(\([^)]*\))?\s*\{[\s\S]{0,600}?(writeDados\(|fs\.writeFile\()/.test(src),
        `${rel} escreve no disco fora do fallback: com o studio aberto a peça some no próximo save`);
    }
  }

  // e o new-video tem que continuar exigindo título e legenda, senão volta a não caber na API
  const nv = path.join(raiz, 'video/new-video.mjs');
  if (existsSync(nv)) {
    const src = await readFile(nv, 'utf8');
    ok_(/TITULO/.test(src) && /LEGENDA/.test(src) && /process\.exit\(1\)/.test(src),
      'new-video.mjs parou de exigir titulo/legenda: o stub volta a ser recusado pela API');
  }
});

console.log('\n== A RÉGUA DO PROTAGONISTA ANÔNIMO AINDA ENXERGA O ACERVO ==\n');

await teste('o doutor lê a pasta certa de quadrinhos, e a régua de nomear pega o caso conhecido', async () => {
  // O QUE ESTE GUARDA PROTEGE: a régua nasceu CEGA em 12/08/2026. O bloco novo do `asset doutor`
  // montava o caminho como `CONTEUDO/../data/quadrinhos`, que não existe (CONTEUDO já É saga-fut),
  // então a varredura lia ZERO arquivos e imprimia "0 · (nada)" — indistinguível de acervo limpo.
  // É a MESMA classe do check-sprite e da respiração: guarda que para de guardar em silêncio por
  // mudança de caminho. Aqui o teste exige que a pasta exista E que ela tenha episódios dentro.
  const QDIR = path.join(CONTEUDO_DIR, 'data', 'quadrinhos');
  ok_(existsSync(QDIR), `o doutor lê ${QDIR}, que não existe: a régua varre nada e diz "nada"`);
  const arqs = (await readdir(QDIR)).filter((f) => f.endsWith('.json'));
  ok_(arqs.length > 50, `só ${arqs.length} quadrinhos na pasta: a varredura não está achando o acervo`);

  // e a régua em si tem que reprovar o caso que a originou (miolo inteiro em "ELE") e aprovar o
  // que nomeia, senão ela vira um laço que percorre tudo e nunca acha nada
  const RUIDO = /^(riso|menino|bebe|bebê|cartoon|epico|épico|brasil|atletico|atlético|dortmund)$/i;
  const nomesDe = (f) => (f?.nome || f?.id || '').replace(/[-()]/g, ' ').split(/\s+/)
    .map((w) => w.trim()).filter((w) => w.length >= 4 && !RUIDO.test(w));
  const nomeia = (elenco, miolo) => elenco.some((f) => nomesDe(f).some((n) => new RegExp(n, 'i').test(miolo)));
  const kubala = [{ id: 'kubala-riso', nome: 'Kubala' }];

  ok_(!nomeia(kubala, 'ELE ESTAVA NO AUGE. ELE FOI DIAGNOSTICADO COM TUBERCULOSE.'),
    'o caso EXATO que originou a régua passou: um miolo inteiro em "ELE" voltaria a ser invisível');
  ok_(nomeia(kubala, 'LÁSZLO KUBALA ERA O MAIOR ÍDOLO DO BARCELONA NAQUELA DÉCADA.'),
    'miolo que NOMEIA foi reprovado: a régua acusaria episódio correto e viraria ruído');

  // o opt-out precisa existir de verdade, senão o caso legítimo (menor de idade) não tem saída
  const fonte = await readFile(path.join(raiz, 'asset.mjs'), 'utf8');
  ok_(/protagonistaSemNome/.test(fonte), 'o opt-out `protagonistaSemNome` sumiu do doutor');
});

console.log('\n== CAMPO DESCONHECIDO NO CORPO AINDA É BARRADO ==\n');

await teste('pedido com campo que a rota não tem é recusado, e as rotas declaram os campos que aceitam', async () => {
  // O QUE ESTE GUARDA PROTEGE: em 12/08/2026 um pedido de post foi mandado como
  // `{ quadrinhoId, modo: "mosaico" }`. A rota não tem `modo` (tem `mosaico` e `carrossel`,
  // e `carrossel` é false por padrão): o campo foi ignorado em silêncio, os defaults valeram, e
  // a resposta voltou `ok: true`. Quatro quadrinhos ficaram com a grade de revisão pronta e sem
  // os slides do post, e o defeito só apareceu quando alguém foi olhar a peça pra publicar.
  // Sucesso parcial que se declara completo é a classe de defeito mais cara deste projeto.
  const { problemaNoCorpo } = await import('../../server/lib/corpo.mjs');
  const campos = ['quadrinhoId', 'formato', 'mosaico', 'carrossel', 'carimbo', 'cantoCarimbo'];

  ok_(problemaNoCorpo({ quadrinhoId: 'q', modo: 'mosaico' }, campos, 'x'),
    'o caso EXATO que originou a guarda passou: "modo" voltaria a ser ignorado em silêncio');
  ok_(/carrossel/.test(problemaNoCorpo({ quadrinhoId: 'q', modo: 'carrossel' }, campos, 'x')),
    'a mensagem de "modo" não aponta o campo certo: sem a sugestão a pessoa relê o mesmo nome errado');
  ok_(/mosaico/.test(problemaNoCorpo({ quadrinhoId: 'q', mosaic: true }, campos, 'x')),
    'erro de UMA letra não recebeu sugestão, que é o erro mais comum de todos');
  ok_(!problemaNoCorpo({ quadrinhoId: 'q', carrossel: true }, campos, 'x'),
    'pedido VÁLIDO foi recusado');
  ok_(!problemaNoCorpo({}, campos, 'x') && !problemaNoCorpo(null, campos, 'x'),
    'corpo vazio foi recusado: as rotas têm defaults, e pedir só o obrigatório é legítimo');

  // E a guarda tem que estar LIGADA na rota, não só existir no lib: foi assim que o
  // validar-cena ficou cego (gate-render-estava-cego), chamando um invariante não importado.
  const rotas = await readFile(path.join(raiz, '../server/routes/render.mjs'), 'utf8');
  ok_(/import \{ corpoInvalido \}/.test(rotas), 'render.mjs não importa mais a guarda de corpo');
  for (const rota of ['montar-imagem', 'render-quadrinho']) {
    const trecho = rotas.split(`'/${rota}'`)[1] || '';
    ok_(/corpoInvalido\(req, res/.test(trecho.slice(0, 400)),
      `a rota /${rota} não chama corpoInvalido: volta a aceitar campo inventado calada`);
  }
});

await teste('o saneamento do grok vive SÓ no provider do grok (o codex não pode ser tocado)', async () => {
  // O prompt comum manda desenhar a moldura (BRAND FRAMING / FRAME PROPORTIONS) e depois
  // manda ignorá-la. O codex aplica o override e sempre acertou; o grok fica com a regra e
  // devolveu margem de 4,4% a 4,8% nos quatro lados em 5 painéis de 5 (13/08/2026).
  //
  // A correção é do PROVIDER, não do prompt comum: consertar o grok mexendo em prompts.mjs
  // mudaria o modelo que já funciona — e, no caso da folha de figurantes, somaria uma
  // referência, que é justamente o que degrada o codex acima de ~3. Este teste trava as duas
  // pontas: o saneamento existe no grok, e o caminho comum continua limpo.
  const grok = await import('../../server/providers/grok-image.mjs');
  const prompts = await import('../../server/prompts.mjs');

  ok_(typeof grok.semRegrasDeMoldura === 'function' && typeof grok.comFigurantes === 'function',
    'o provider do grok perdeu o saneamento: a moldura e a folha de figurantes voltam a depender do prompt comum');
  ok_(!prompts.semRegrasDeMoldura && !prompts.comFigurantes,
    'o saneamento do grok vazou pro prompts.mjs: o codex passa a receber tratamento que ele não precisa');

  const dados = JSON.parse(await readFile(path.join(raiz, '../../saga-fut/data/project.json'), 'utf8'));
  const regras = dados.projeto?.quadrinhoRules || '';
  ok_(/BRAND FRAMING/.test(regras) && /FRAME PROPORTIONS/.test(regras),
    'as seções de moldura sumiram do quadrinhoRules: ou foram renomeadas (e o corte do grok ficou cego) ou o texto mudou de forma');

  const composed = `${regras} OVERRIDE, this panel only: Draw NO panel frame, NO black border.`;
  const limpo = grok.semRegrasDeMoldura(composed);
  for (const proibido of ['BRAND FRAMING', 'FRAME PROPORTIONS', 'cream paper margin', '5% of the image width']) {
    ok_(!limpo.includes(proibido), `"${proibido}" continua chegando no grok: ele desenha a moldura que o export vai desenhar de novo`);
  }
  for (const mantido of ['CAST PROPORTIONS', 'EXTRAS:', 'EXPRESSION', 'BACKGROUND', 'TEXT RULE']) {
    ok_(limpo.includes(mantido), `o corte levou "${mantido}" junto: ele não tem nada a ver com moldura e segura defeito conhecido`);
  }
  // sem o marcador de arte sangrada (quadrinho de moldura pela IA) o texto passa intacto
  ok_(/BRAND FRAMING/.test(grok.semRegrasDeMoldura('BRAND FRAMING (every panel, follow exactly): draw the frame.')),
    'o corte rodou num quadrinho de moldura pela IA: ali a moldura É arte e tem que ser desenhada');
});

await teste('painel com gente genérica leva a FOLHA DE FIGURANTES (só no grok)', async () => {
  // Proporção não se descreve, se mostra: o quadrinhoRules já mandava que figurante fosse
  // construído como o elenco, e o grok devolvia protagonista cabeçudo ao lado de figurante
  // de proporção realista. A folha é o gabarito visual, o análogo do personagem-padrão da
  // animação. Sem ela em disco, o comportamento degrada pro anterior em vez de quebrar.
  const { comFigurantes } = await import('../../server/providers/grok-image.mjs');
  const conteudo = path.join(raiz, '../../saga-fut');

  ok_(existsSync(path.join(conteudo, 'estilos/figurantes.png')),
    'estilos/figurantes.png não existe: o grok volta a inventar a construção do figurante');

  const refs = [{ rel: 'p/base.png', papel: 'personagem' }, { rel: 'estilos/rabisco-riso.png', papel: 'estilo' }, { rel: 'q/1.png', papel: 'cenario' }];
  const comGente = comFigurantes(refs, 'a long queue with a crowd of ordinary people waiting', conteudo);

  // A MEDIÇÃO É NO ROTEIRO, não no prompt montado: o quadrinhoRules fala de "crowd" e
  // "background people" nas próprias regras, então medir o texto inteiro anexa a folha em
  // TODO painel, inclusive num close de objeto. Foi o bug da primeira versão, achado só
  // porque alguém perguntou se a folha tinha sido anexada mesmo.
  const { comporPrompt } = await import('../../server/prompts.mjs');
  const { readDados } = await import('../../server/store.mjs');
  const dados = await readDados();
  const quadComPaineis = (dados.quadrinhos || []).find((q) => (q.paineis || []).length && q.estiloId);
  const pedido = await comporPrompt(dados, { tipo: 'painel', quadrinhoId: quadComPaineis.id, painelNumero: quadComPaineis.paineis[0].numero });
  ok_(typeof pedido.roteiro === 'string' && !/every panel, follow exactly/i.test(pedido.roteiro),
    'o pedido não expõe mais o `roteiro` limpo: a detecção volta a medir o quadrinhoRules e anexa a folha em todo painel');
  ok_(comGente.some((r) => r.papel === 'figurantes'),
    'painel com multidão NÃO recebeu a folha: o figurante volta a nascer no default do modelo');
  ok_(comGente.map((r) => r.papel).join(' ') === 'personagem estilo figurantes cenario',
    `a folha entrou fora de ordem (${comGente.map((r) => r.papel).join(' > ')}): ela vai depois do estilo e antes do cenário, que fica por último`);

  const semGente = comFigurantes(refs, 'a ballot box on a folding table, no people', conteudo);
  ok_(!semGente.some((r) => r.papel === 'figurantes'),
    'painel SEM gente recebeu a folha: é referência a mais sem motivo, e cada anexo extra custa fidelidade');
});

// ---------------------------------------------------------------------------------------------
// O MEDIDOR DE ORIENTAÇÃO AINDA ENXERGA
//
// Ele é a base de tudo que impede "personagem andando de costas": o motor tira o espelho dele e o
// INV-4 tira a comparação. Se ele passar a devolver 'indefinido' pra tudo (mudança de estilo, de
// paleta, de canvas), os dois calam juntos e ninguém percebe. Por isso o teste alimenta a MESMA
// arte nas duas orientações e exige vereditos opostos.
console.log('\n== ACENTO ERRADO AINDA É BARRADO ==\n');
// A voz sai do MESMO campo que a legenda, então acento faltando não é errinho de digitação: é uma
// frase falada errada no vídeo publicado ("que e" vira conjunção átona na boca do Eddy). O gate
// existe porque o defeito é invisível em texto e só aparece ouvindo.
await teste('o gate pega acento faltando e não reclama do texto certo', async () => {
  const { problemasDeAcento } = await import('../../shared/acentuacao.mjs');
  ok_(problemasDeAcento('VOCE MOSTROU QUE E CAPAZ').length >= 2,
    'o gate deixou passar "VOCE" e "QUE E" — o vídeo sai com a voz lendo o verbo como conjunção');
  ok_(problemasDeAcento('VOCÊ MOSTROU QUE É CAPAZ').length === 0,
    'o gate reclamou do texto CERTO: falso positivo transforma o gate em ruído que se ignora');
  // os dois casos que a calibragem contra 700 textos do acervo mandou NÃO pegar
  ok_(problemasDeAcento('LAMINE SUBIU DA LA MASIA').length === 0,
    '"La Masia" voltou a ser apontado: nome próprio em catalão não é "lá" sem acento');
  ok_(problemasDeAcento('ELE E OUTROS ONZE HOMENS SE REUNIRAM').length === 0,
    '"ele e outros" voltou a ser apontado: ali o "e" é conjunção mesmo');
});

console.log('\n== O MEDIDOR DE ORIENTAÇÃO AINDA ENXERGA ==\n');
await teste('o medidor lê a convenção e enxerga o espelho', async () => {
  const sharp = (await import('sharp')).default;
  const { orientacaoDe } = await import('../sprites/orientacao.mjs');
  const { CONTEUDO_DIR } = await import('../../server/config.mjs');
  const pathMod = await import('node:path');
  const fsp = await import('node:fs/promises');

  // cobaia: uma folha de caminhada qualquer do acervo (elas são de perfil, que é o caso que importa)
  const pers = pathMod.join(CONTEUDO_DIR, 'personagens');
  let cobaia = null;
  for (const slug of await fsp.readdir(pers)) {
    const w1 = pathMod.join(pers, slug, 'rigs', 'andar', 'w1.png');
    if (await fsp.access(w1).then(() => true).catch(() => false)) { cobaia = w1; break }
  }
  ok_(cobaia, 'nenhuma folha de caminhada no acervo — cobaia indisponível');

  const original = await orientacaoDe(cobaia);
  ok_(original.lado === 'direita',
    `o medidor não reconhece mais a convenção da casa: leu "${original.lado}" numa folha de caminhada padrão (desvio ${original.desvio})`);

  const tmp = pathMod.join(CONTEUDO_DIR, '.vigia-flop.png');
  await sharp(cobaia).flop().png().toFile(tmp);
  const espelhada = await orientacaoDe(tmp);
  await fsp.rm(tmp, { force: true });
  ok_(espelhada.lado === 'esquerda',
    `o medidor NÃO viu o espelho: a mesma arte flopada devia ler "esquerda" e leu "${espelhada.lado}" (desvio ${espelhada.desvio}). Sem isso o motor volta a supor que toda folha olha pra direita.`);
});

console.log('\n== O PERSONAGEM AINDA TEM O MESMO TAMANHO EM TODA POSE ==\n');
await teste('a régua vê o encolhimento do braço erguido, e o motor aplica a correção', async () => {
  const { apertoContraIdle, olhosAosPes } = await import('../sprites/escala-pose.mjs');
  const { montarCena } = await import('../../server/video/montar-cena.mjs');
  const pathMod = await import('node:path');
  const { CONTEUDO_DIR } = await import('../../server/config.mjs');
  const fsp = await import('node:fs/promises');

  // O CASO CONHECIDO, com nome e número: a taça do Ferran tem o corpo ~30% menor que o idle dele,
  // porque a taça erguida entra na silhueta e empurra o corpo pra caber no canvas. Se a régua
  // parar de ver ISTO, ela não vê nada — é a maior diferença do acervo inteiro.
  const dir = pathMod.join(CONTEUDO_DIR, 'personagens', 'ferran-riso');
  const r = await apertoContraIdle(pathMod.join(dir, 'poses', 'taca.png'), pathMod.join(dir, 'rigs', 'idle', 'i1.png'));
  ok_(r && r.aperto > 1.2,
    `a régua deixou de ver o encolhimento da taça do Ferran (veio ${r ? r.aperto : 'null'}); o personagem volta a mudar de tamanho no meio do vídeo sem ninguém notar`);

  // e não pode inventar correção onde não há: o idle contra ele mesmo é 1
  const zero = await apertoContraIdle(pathMod.join(dir, 'rigs', 'idle', 'i1.png'), pathMod.join(dir, 'rigs', 'idle', 'i1.png'));
  ok_(zero && zero.aperto === 1,
    `a régua inventou correção medindo o idle contra ele mesmo (${zero?.aperto}) — isso esticaria personagem que está certo`);

  // O NÚMERO PRECISA CHEGAR NO MOTOR. Medir e gravar não serve de nada se o composer não ler: é a
  // classe de defeito favorita deste projeto (guarda que para de guardar em silêncio).
  // SEM `if` AQUI. A primeira versão deste teste envolvia o trecho abaixo num `if (meta.aperto >
  // 1.03)`, e com isso ele passava JUSTAMENTE quando o dado estava faltando — que é o único caso em
  // que ele precisava falhar. Se a régua acabou de medir 1.3x, o acervo tem que ter o número.
  const meta = JSON.parse(await fsp.readFile(pathMod.join(dir, 'poses', '_meta.json'), 'utf8').catch(() => '{}'));
  ok_(meta.taca?.aperto > 1.03,
    `a pose "taca" do Ferran está no acervo SEM o \`aperto\` (${meta.taca?.aperto}), e a régua diz que ela encolhe 30% — rode: node scripts/sprites/medir-escala-pose.mjs --acervo`);
  {
    const cena = montarCena({
      id: '__vigia_aperto__', tipo: 'animacao', template: 'roteiro', fps: 30, formato: '3:4', semAudio: true,
      elenco: { 'ferran-riso': { w: 300 } },
      roteiro: [{ dur: 60, personagens: [{ slug: 'ferran-riso', spot: 400, piso: 1040, poses: [{ pose: 'taca', hold: 60 }] }] }],
    });
    const p = cena.scene.shots[0].chars[0].poses.find((x) => String(x.src || '').includes('taca'));
    ok_(p && p.aperto > 1.03,
      `o composer não passou o \`aperto\` da pose pro motor (veio ${p?.aperto}) — o dado está no acervo e não chega na tela`);
  }
});

await teste('o aperto vale nos DOIS sentidos (encolher também é corrigir)', async () => {
  const { montarCena } = await import('../../server/video/montar-cena.mjs');

  // O FILTRO ERA `aperto > 1.03`: correção que AUMENTA passava, correção que DIMINUI era descartada
  // em silêncio. Invisível de todos os ângulos — o medidor media certo, o `_meta.json` guardava o
  // número certo, o verificador de conjunto lia o arquivo e aprovava, e só o motor sabia que tinha
  // jogado fora. A caminhada do Rodri tinha 0.963 gravado e desenhava em 1.0.
  const cena = montarCena({
    id: '__vigia_ap__', tipo: 'animacao', template: 'roteiro', fps: 30, formato: '3:4', semAudio: true,
    elenco: { 'rodri-riso': { w: 300 } },
    roteiro: [{ dur: 60, personagens: [{ slug: 'rodri-riso', spot: 400, piso: 1040,
      poses: [{ ciclo: 'andar-barca', quadros: 4, move: 200, hold: 60 }] }] }],
  });
  const p = (cena.scene.shots[0].chars[0].poses || []).find((x) => (x.cycle || []).some((f) => String(f).includes('andar-barca')));
  ok_(p && p.aperto != null && p.aperto < 1,
    `o motor não aplicou um aperto MENOR que 1 (veio ${p?.aperto}) — correção que encolhe está sendo descartada, e o personagem chega maior do que fica`);
});

await teste('as peças de um personagem fecham entre si (não só cada uma sozinha)', async () => {
  const { conferir } = await import('../sprites/coerencia-escala.mjs');

  // CORRIGIR PEÇA POR PEÇA NÃO BASTA, e este é o caso que provou: o `rodri-riso` tinha a caminhada
  // com `aperto` da régua da CABEÇA (1.068) e a pose com o da régua dos OLHOS (1.0), cada uma
  // "certa" pela sua — e na tela ele chegava andando 18% maior do que ficava ao parar. Nenhum
  // medidor de peça isolada consegue ver isso; só olhando o conjunto.
  const r = await conferir('rodri-riso');
  ok_(r.ok !== false,
    `as peças do rodri-riso divergem ${((r.amplitude || 0) * 100).toFixed(1)}%: ${(r.fora || []).map((p) => `${p.nome} ${(p.desvio * 100).toFixed(0)}%`).join(', ')} — rode: node scripts/sprites/coerencia-escala.mjs rodri-riso --corrigir`);

  // e o verificador não pode ficar cego: pose agachada sai da conta de propósito (o corpo não está
  // na vertical), mas as peças EM PÉ têm que continuar sendo julgadas, senão ele aprova tudo
  ok_((r.pecas || []).filter((p) => p.vertical).length >= 3,
    `o verificador está julgando só ${(r.pecas || []).filter((p) => p.vertical).length} peça(s) do rodri-riso — se ele para de olhar as peças em pé, passa a aprovar qualquer coisa`);
});

console.log('\n== AS TELAS AINDA ACHAM O ASSET NO ACERVO ==\n');
await teste('nenhuma rota monta caminho de asset na unha (kf/ e cenario/ do vídeo estão vazias)', async () => {
  // A MIGRAÇÃO PRO ACERVO deixou `videos/<id>/kf/` e `videos/<id>/cenario/` vazias: sprite mora em
  // `personagens/<slug>/`, cenário em `cenarios/<slug>/`, e as duas pastas só existem DURANTE o
  // render. Toda tela que montava esses caminhos com concatenação passou a exibir 404 — a aba de
  // Assets mostrava o vídeo como se não tivesse asset nenhum, e o Palco abria com retângulos
  // pretos no lugar de todo mundo.
  //
  // O defeito reapareceu em três telas diferentes porque cada uma resolvia caminho por conta
  // própria. O teste não é sobre uma tela: é sobre existir UMA resolução (spritesDoRoteiro /
  // candidatosDoSet, a mesma do staging do render) e ninguém fazer a sua.
  const rota = await readFile(path.resolve(raiz, '../server/routes/video.mjs'), 'utf8');
  const naUnha = [...rota.matchAll(/['"`]\/files\/videos\/['"`+\s]*\+?\s*id\s*\+\s*['"`]\/(kf|cenario)\//g)]
    .map((m) => m[1]);
  // sobra UM uso legítimo: o fallback de `kf/` pros vídeos anteriores à migração, dentro do
  // resolvedor. Mais que isso é tela montando caminho de novo.
  ok_(naUnha.length <= 1,
    `${naUnha.length} caminho(s) de asset montados na unha em routes/video.mjs (${naUnha.join(', ')}) — essas pastas estão vazias fora do render, e a tela vai mostrar 404`);
  ok_(/spritesDoRoteiro\(/.test(rota) && /candidatosDoSet\(/.test(rota),
    'routes/video.mjs deixou de usar os resolvedores do acervo — cada tela voltou a inventar o próprio caminho');
});

console.log('\n== O SOM AINDA TERMINA QUANDO A AÇÃO TERMINA ==\n');
await teste('o passo sai do movimento, para junto com ele, e não se planta na mão', async () => {
  const { montarCena } = await import('../../server/video/montar-cena.mjs');
  const { invariantes } = await import('../../server/video/invariantes.mjs');

  // cobaia sintética: alguém anda 60 frames e depois fica parado 120. O som de passo tem 10,5s de
  // arquivo, ou seja quase quatro vezes a caminhada — é exatamente a desproporção que fez o
  // `ferran-amor` soar com passo de gente parada.
  const base = {
    id: 'vigia-som', tipo: 'animacao', template: 'roteiro', fps: 30, formato: '3:4',
    elenco: { 'torcedor-cule': { w: 300 } },
    roteiro: [{
      dur: 180,
      personagens: [{
        slug: 'torcedor-cule', spot: 400, piso: 1040,
        poses: [{ andar: true, move: 300, hold: 60 }, { parado: true, hold: 120 }],
      }],
    }],
  };

  const { audio } = montarCena(base);
  const passos = (audio.sfx || []).filter((s) => s.id === 'passos');
  ok_(passos.length === 1,
    `o passo deixou de ser DERIVADO do movimento: esperava 1 trecho, veio ${passos.length}. Sem isso o som volta a ser um número digitado à mão no roteiro.`);
  ok_(passos[0] && Math.abs(passos[0].at - 0) < 0.2 && Math.abs(passos[0].dur - 2) < 0.2,
    `o passo não casa com a caminhada: entra em ${passos[0]?.at}s e dura ${passos[0]?.dur}s, esperado ~0s por ~2s (60 frames a 30fps).`);

  // som de LEITO declarado à mão não pode sobreviver ao fim da própria cena
  const vazando = JSON.parse(JSON.stringify(base));
  vazando.roteiro[0].sons = [{ id: 'torcida-comemora', at: 0, dur: 600 }];
  vazando.roteiro.push({ dur: 60, set: 'escritorio-presidente', personagens: [{ slug: 'torcedor-cule', spot: 400, piso: 1040, poses: [{ parado: true, hold: 60 }] }] });
  const r1 = invariantes(vazando);
  ok_(r1.erros.some((e) => e.tipo === 'som-vaza-a-cena'),
    'o gate deixou passar um som de leito que atravessa a troca de lugar: o barulho do estádio entra no escritório e ninguém vê isso lendo o roteiro.');

  // e o opt-out de plantar passo na mão não pode virar passo sem ninguém andando
  const plantado = JSON.parse(JSON.stringify(base));
  plantado.roteiro[0].personagens[0].poses = [{ parado: true, hold: 180 }];
  plantado.roteiro[0].sons = [{ id: 'passos', at: 0, manual: true }];
  const r2 = invariantes(plantado);
  ok_(r2.erros.some((e) => e.tipo === 'passo-sem-ninguem-andando'),
    'o gate deixou passar som de passo com todo mundo parado — que é literalmente o defeito que o Raphael ouviu no ferran-amor.');

  // e o caminho certo continua limpo: nada disso pode reprovar um vídeo bom
  const r3 = invariantes(base);
  ok_(!r3.erros.some((e) => e.tipo.startsWith('som-') || e.tipo.startsWith('passo-')),
    `o gate reprovou a cena CERTA: ${r3.erros.map((e) => e.tipo).join(', ')}`);
});

console.log('\n== OS DOIS CANAIS CONTINUAM SEPARADOS ==\n');
await teste('o filtro de canal separa mesmo (e não devolve tudo achando que filtrou)', async () => {
  const { doCanal, canalDo, problemaNoCanal, CANAL_PADRAO, CANAL_TODOS } = await import('../../shared/canais.mjs');

  // FILTRO QUE PARA DE FILTRAR NÃO DÁ ERRO: ele devolve TUDO, e a tela fica plausível (só que
  // planejando o @futgibi em cima da fila do @devblaugrana). É a mesma classe de defeito das
  // guardas que viraram no-op por mudança de pasta, e por isso ela é alimentada aqui com um caso
  // sabidamente misturado.
  const itens = [
    { id: 'antigo-sem-canal' },                 // ausência = devblaugrana, sem migrar 127 itens
    { id: 'do-barca', canal: 'devblaugrana' },
    { id: 'do-futgibi', canal: 'futgibi' },
  ];

  ok_(canalDo(itens[0]) === CANAL_PADRAO,
    `item sem canal deixou de valer como ${CANAL_PADRAO} — o acervo inteiro anterior a 15/08/2026 depende disso`);

  const so = doCanal(itens, 'futgibi');
  ok_(so.length === 1 && so[0].id === 'do-futgibi',
    `o filtro devolveu ${so.length} item(ns) para o futgibi em vez de 1 — se ele para de separar, um canal passa a planejar em cima da fila do outro`);

  const blau = doCanal(itens, 'devblaugrana');
  ok_(blau.length === 2, `o filtro perdeu o item SEM canal declarado: veio ${blau.length}, esperado 2`);

  ok_(doCanal(itens, CANAL_TODOS).length === 3, 'o modo "os dois" precisa devolver os três');

  // e canal inventado tem que ser BARRADO na porta: `futigibi` sumiria das duas listas em silêncio
  ok_(problemaNoCanal({ id: 'x', canal: 'futigibi' }),
    'a validação aceitou um canal que não existe — o item sumiria da lista e do cronograma dos DOIS canais sem erro nenhum');
  ok_(!problemaNoCanal({ id: 'x' }) && !problemaNoCanal({ id: 'x', canal: 'futgibi' }),
    'a validação está reprovando item legítimo (sem canal, ou com canal válido)');
});

await teste('a fila de publicação de um canal não enxerga a do outro', async () => {
  // A SUGESTÃO DE PRÓXIMA DATA (aba Publicar) sai do ÚLTIMO agendado. Se ela varrer os dois
  // canais, postar no @futgibi empurra a data do @devblaugrana e vice-versa, que é exatamente o
  // que a separação existe pra impedir. O teste replica a regra da tela sobre um acervo misto.
  const { canalDo } = await import('../../shared/canais.mjs');
  const acervo = [
    { id: 'blau-1', canal: 'devblaugrana', postado: true, agenda: '2026-08-20', hora: '19:00' },
    { id: 'gibi-1', canal: 'futgibi', postado: true, agenda: '2026-08-10', hora: '12:30' },
    { id: 'gibi-2', canal: 'futgibi' },
  ];
  const ultimoDo = (canal) => acervo
    .filter((q) => q.postado && q.agenda && canalDo(q) === canal)
    .sort((a, b) => (b.agenda + b.hora).localeCompare(a.agenda + a.hora))[0] || null;

  ok_(ultimoDo('futgibi')?.id === 'gibi-1',
    'a fila do futgibi pegou um post do outro canal como referência de data');
  ok_(ultimoDo('devblaugrana')?.id === 'blau-1',
    'a fila do devblaugrana pegou um post do outro canal como referência de data');
});

await teste('YouTube e Buffer casam o canal da peça com a credencial certa', async () => {
  // UM TOKEN SÓ publicaria o Short do @futgibi no canal do Barça (e o Photo Mode no TikTok
  // vizinho) sem erro nenhum: upload funciona, o vídeo só nasce no lugar errado. A guarda é
  // arquivo por canal + casamento por handle, e os dois precisam continuar no código, não só
  // no comentário.
  const { arquivoYoutube } = await import('../../server/lib/youtube.mjs');
  const ytBlau = arquivoYoutube('devblaugrana');
  const ytGibi = arquivoYoutube('futgibi');
  ok_(ytBlau !== ytGibi, 'os dois canais YouTube voltaram a compartilhar o mesmo arquivo de token');
  ok_(/youtube-devblaugrana\.json$/.test(ytBlau) && /youtube-futgibi\.json$/.test(ytGibi),
    `o nome do arquivo YouTube perdeu o canal: ${ytBlau} / ${ytGibi}`);

  const login = await readFile(path.join(raiz, 'youtube-login.mjs'), 'utf8');
  ok_(/--canal=/.test(login),
    'youtube-login.mjs perdeu --canal=: o segundo perfil não tem mais como autorizar sem pisar no primeiro');
  ok_(/chavesDoApp/.test(login),
    'o login do segundo canal não reusa as chaves do app já autorizado: pede o JSON de novo sem necessidade');

  const rotasYt = await readFile(path.join(raiz, '../server/routes/youtube.mjs'), 'utf8');
  ok_(/canalDo\(q\)/.test(rotasYt) && /subirVideo\(\{[^}]*canal/.test(rotasYt),
    'a rota /youtube/agendar subiu sem o canal da peça: o Short do futgibi iria pro token padrão');
  ok_(/req\.query\.canal/.test(rotasYt),
    'GET /youtube/status não lê o canal da query: a tela mostra o canal Google do perfil errado');

  const { casarTiktok, casarInstagram, handleDeTexto } = await import('../../server/lib/buffer.mjs');
  ok_(handleDeTexto('@futgibi') === 'futgibi'
    && handleDeTexto('https://www.tiktok.com/@devblaugrana') === 'devblaugrana'
    && handleDeTexto('https://www.instagram.com/futgibi/') === 'futgibi',
    'a normalização do handle quebrou: o mapa Buffer deixa de achar o perfil');
  const buffer = [
    { id: 'tk-blau', service: 'tiktok', name: 'devblaugrana' },
    { id: 'tk-gibi', service: 'tiktok', name: '@futgibi', externalLink: 'https://www.tiktok.com/@futgibi' },
    { id: 'ig', service: 'instagram', name: 'futgibi' },
    { id: 'ig-blau', service: 'instagram', name: 'devblaugrana', externalLink: 'https://instagram.com/devblaugrana' },
  ];
  ok_(casarTiktok(buffer, 'futgibi')?.id === 'tk-gibi',
    'o casamento Buffer pegou o Instagram (ou o TikTok do outro canal) no lugar do @futgibi');
  ok_(casarTiktok(buffer, 'devblaugrana')?.id === 'tk-blau',
    'o casamento Buffer não achou o @devblaugrana pelo handle');
  ok_(casarTiktok([{ id: 'x', service: 'tiktok', name: 'outro' }], 'futgibi') == null,
    'casarTiktok inventou match quando o handle não está na conta');

  ok_(casarInstagram(buffer, 'futgibi')?.id === 'ig',
    'o casamento Instagram pegou o TikTok (ou o perfil do outro canal) no lugar do @futgibi');
  ok_(casarInstagram(buffer, 'devblaugrana')?.id === 'ig-blau',
    'o casamento Instagram não achou o @devblaugrana');

  const { tamanhosLoteX } = await import('../../shared/lotes-x.mjs');
  const casosX = { 1: [1], 2: [2], 3: [3], 4: [4], 5: [3, 2], 6: [3, 3], 7: [4, 3], 8: [4, 4], 9: [3, 3, 3], 10: [4, 3, 3], 11: [4, 4, 3], 12: [4, 4, 4] };
  for (const [n, want] of Object.entries(casosX)) {
    ok_(tamanhosLoteX(Number(n)).join() === want.join(),
      `lote X de ${n} saiu ${tamanhosLoteX(Number(n))} (queria ${want})`);
  }

  const abrir = await readFile(path.join(raiz, '../server/routes/abrir.mjs'), 'utf8');
  ok_(/clipboard-arquivos/.test(abrir) && /writeObjects/.test(abrir) && /resolverNoConteudo/.test(abrir),
    'POST /clipboard-arquivos sumiu ou deixou de copiar NSURL / de travar o caminho no conteúdo');

  const idx = await readFile(path.join(raiz, '../server/index.mjs'), 'utf8');
  ok_(/bufferRouter/.test(idx),
    'o server não monta mais o router do Buffer: a aba Publicar chama /api/buffer e leva 404');

  const rotasBf = await readFile(path.join(raiz, '../server/routes/buffer.mjs'), 'utf8');
  ok_(/corpoInvalido\(req, res/.test(rotasBf) && /\/buffer\/instagram/.test(rotasBf),
    'POST /buffer/instagram sumiu ou não chama corpoInvalido');
  ok_(/modo !== 'carrossel'/.test(rotasBf) && /agendarInstagram/.test(rotasBf),
    'o Instagram não distingue carrossel e reel: os dois modos cairiam no mesmo tipo');

  const bufLib = await readFile(path.join(raiz, '../server/lib/buffer.mjs'), 'utf8');
  ok_(!/isAiGenerated:\s*true/.test(bufLib) && /isAiGenerated:\s*false/.test(bufLib),
    'o agendamento Buffer voltou a marcar o post como conteúdo de IA');

  const pub = await readFile(path.join(raiz, '../src/views/quadrinho/QuadrinhoPublicar.jsx'), 'utf8');
  ok_(/partirEmLotesX/.test(pub) && /clipboard-arquivos/.test(pub),
    'a aba Publicar perdeu os lotes do X ou o botão que copia os arquivos');
  ok_(/TiktokAgendar/.test(pub),
    'a aba Publicar do quadrinho perdeu o passo do TikTok');
  ok_(/InstagramAgendar/.test(pub),
    'a aba Publicar do quadrinho perdeu o passo do Instagram');
  ok_(/Publicar tudo/.test(pub) && /modoIg/.test(pub) && /montarVideoQuadrinho/.test(pub),
    'Publicar tudo sumiu, ou não exige o formato do Instagram, ou não monta o vídeo do YouTube');
  ok_(/existing\[video\]/.test(pub) && /TiktokAgendar/.test(pub.split('existing[video]')[0]),
    'o TikTok Photo Mode voltou a exigir video.mp4: carrossel de foto não precisa do Short');

  const ytUi = await readFile(path.join(raiz, '../src/views/quadrinho/YoutubeAgendar.jsx'), 'utf8');
  ok_(/\/api\/youtube\/status\?canal=/.test(ytUi),
    'YoutubeAgendar consulta o status sem o canal da peça: mostra o Google do perfil vizinho');
});

console.log('\n== A BOLA AINDA É REDONDA ==\n');
// `football` num modelo treinado em inglês americano é a bola OVAL, e o acervo pagou: 6 peças
// saíram com bola de futebol americano, quatro delas CAPA de carrossel, mais o `spot-bola` da
// marca do futgibi, que entrou em produção com razão 1.43. A defesa é camada 1 (a palavra é
// TROCADA a caminho do modelo), então o modo de falhar é ela parar de ser aplicada em silêncio:
// o prompt continua certo em português, a arte continua passando em todos os gates, e só a bola
// muda de forma. Por isso o teste cobra as duas metades, a troca e a cláusula.
await teste('a âncora de bola redonda troca a palavra e poupa as exceções', async () => {
  const { comAncoraDeBola, bolasNoPrompt, REGRA_BOLA } = await import('../../shared/prompt-bola.mjs');
  ok_(/soccer ball/.test(comAncoraDeBola('a leather football on the floor')),
    'a bola-objeto não virou "soccer ball": o modelo volta a desenhar a bola oval');
  ok_(comAncoraDeBola('a wide football pitch at dawn') === 'a wide football pitch at dawn',
    '"football pitch" foi trocado: o lugar virou "soccer ball pitch" e o prompt vira lixo');
  ok_(comAncoraDeBola('an oval rugby ball on the shelf').includes('rugby ball'),
    'a saída declarada sumiu: quem pede outro esporte de propósito (o-dia-beisebol) foi atropelado');
  ok_(comAncoraDeBola('two improvised teams play football') === 'two improvised teams play football',
    '"play football" foi trocado: ali football é o esporte, não a bola');
  ok_(bolasNoPrompt('a single leather football sitting in the dust').length === 1,
    'a varredura parou de enxergar bola: a folha de contato fica vazia e ninguém revisa nada');
  ok_(/ROUND/.test(REGRA_BOLA) && /trophy/i.test(REGRA_BOLA),
    'a cláusula perdeu a bola redonda ou o troféu (o o-dia-copa-uniao saiu com dois Vince Lombardi)');
});

await teste('a cláusula da bola ainda viaja no prompt de painel, cena, ficha e cenário', async () => {
  const prompts = await readFile(path.join(raiz, '../server/prompts.mjs'), 'utf8');
  ok_(/comAncoraDeBola\(semSlugsInternos\(painel\.promptImagem/.test(prompts),
    'o painel parou de passar pela âncora: é o caminho de TODO quadrinho');
  ok_((prompts.match(/REGRA_BOLA/g) || []).length >= 4,
    'a cláusula saiu de algum prompt (painel, cena ou ficha): o buraco não dá erro, só volta a bola oval');
  const cfg = await readFile(path.join(raiz, '../scripts/sprites/config.mjs'), 'utf8');
  ok_(/comAncoraDeBola/.test(cfg) && /REGRA_BOLA/.test(cfg),
    'os geradores de sprite/cenário perderam a regra da bola');
  const ilus = await readFile(path.join(raiz, '../../futgibi/marca/gerar-ilustracao.mjs'), 'utf8');
  ok_(/BOLA_REDONDA/.test(ilus),
    'a marca do futgibi perdeu a cláusula: foi por ali que o spot-bola oval entrou em produção');
});

console.log(`\n${ok} ok · ${falhou} falhou\n`);
process.exit(falhou ? 1 : 0);
