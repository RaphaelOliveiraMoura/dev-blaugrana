// build-video.mjs <id|manifest.json> [--dry] [--force] — RUNNER do manifesto de assets.
// Lê um sprites.json (declarativo: o que o vídeo precisa) e orquestra gen/slice/copy/validate
// de TUDO na ordem certa, num comando só. Pula o que já existe (a não ser --force); --dry só
// mostra o plano. No fim roda check-sprite + check-video como gate.
//
// Manifesto (videos/<id>/sprites.json):
// {
//   "video": "<id>",
//   "personagens": [ { "slug":"x-riso", "ref":"personagens/refs/x-riso.png", "desc":"notas",
//                      "idle": {"kit":"camisa azul","num":"9"},            // respiração (parado)
//                      "andar": {"kit":"camisa azul","num":"9"}, "correr": {...}, "stand": true } ],
//   "reacoes":  [ { "slug":"x-riso", "emocao":"rindo", "desc":"..." } ],   // -> kf/<slug>-<emocao>.png
//   "acoes":    [ { "slug":"x-riso", "nome":"nao", "desc":"...",           // GESTO animado (4 quadros)
//                   "fases":["...","...","...","..."], "travado":"..." } ],// -> kf/<slug>-<nome>1..4.png
//   "poses":    [ { "base":"x-riso", "nome":"x-chuta", "desc":"..." } ],   // -> kf/<nome>.png
//   "cenarios": [ { "nome":"sala", "desc":"..." },                         // -> cenario/<nome>.png
//                 { "nome":"panorama", "desc":"...", "panoramico":true },  // mundo (câmera navega)
//                 { "nome":"grade", "desc":"...", "camada":"frente",       // primeiro plano
//                   "panoramico":true } ]
// }
//
// IDLE e AÇÕES existem pelo mesmo motivo: o motor sabe ciclar quadros, mas até existirem estas
// folhas só havia ciclo pra andar e correr — todo o resto degradava pra PNG parado na tela.
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { CONTEUDO_DIR, VIDEO_DIR, videoDir } from '../../server/config.mjs';
import { comLock } from '../../server/lib/lock.mjs';
import { gridDaClasse } from '../sprites/contratos.mjs';
import { gestoPara } from '../sprites/gestos.mjs';
import { DIMS, FORMATO_PADRAO } from '../../server/video/montar-cena.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SPR = path.resolve(__dirname, '../sprites');
const VID = __dirname;

const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const FORCE = args.includes('--force');
const target = args.find((a) => !a.startsWith('--'));
if (!target) { console.error('uso: node build-video.mjs <id|manifest.json> [--dry] [--force]'); process.exit(2); }

// resolve manifesto: um id -> videos/<id>/sprites.json ; ou um caminho direto
const manifestPath = target.endsWith('.json') ? path.resolve(target) : path.join(videoDir(target), 'sprites.json');
let man;
try { man = JSON.parse(await fs.readFile(manifestPath, 'utf-8')); }
catch (e) { console.error(`não consegui ler o manifesto ${manifestPath}: ${e.message}`); process.exit(1); }
const ID = man.video || target;
// SEM kf/: o vídeo não guarda mais cópia de sprite. Os slicers escrevem no acervo do
// personagem e o render monta a pasta plana na hora (server/video/sprites-do-roteiro.mjs).

// FORMATO DO CENÁRIO = o formato do VÍDEO (não um default fixo). O cenário é o fundo full-frame:
// gerado em 3:4 num vídeo 9:16 ele estica/corta e a linha do chão sai do lugar. Fonte de verdade é
// o data/videos/<id>.json; o manifesto ainda pode sobrescrever por cenário (`"formato"`).
const VIDEO_JSON = await fs.readFile(path.join(VIDEO_DIR, `${ID}.json`), 'utf-8')
  .then((t) => JSON.parse(t)).catch(() => ({}));
const FORMATO_VIDEO = VIDEO_JSON.formato || FORMATO_PADRAO;
// MUNDO panorâmico: o cenário é maior que o quadro e a câmera navega dentro dele. Precisamos do
// tamanho em px pra reamostrar o PNG no tamanho de exibição (o gerador entrega bem menos que isso).
const [VW, VH] = DIMS[FORMATO_VIDEO] || DIMS[FORMATO_PADRAO];
const MUNDO = VIDEO_JSON.mundo ? { w: Math.round(VW * (VIDEO_JSON.mundo.telas || 2)), h: VH } : null;

const existe = (abs) => fs.access(abs).then(() => true).catch(() => false);
const run = (script, cmdArgs) => new Promise((res, rej) => {
  const p = spawn('node', [script, ...cmdArgs], { stdio: 'inherit' });
  p.on('error', rej);
  p.on('close', (c) => (c === 0 ? res() : rej(new Error(`${path.basename(script)} saiu ${c}`))));
});
// executa um passo se algum output faltar (ou --force). gera log de plano no --dry.
//
// PARALELO: dois builds podem precisar do MESMO asset compartilhado (a caricatura-base ou o
// andar de um personagem que os dois usam). Sem lock os dois olham "não existe", geram os
// dois, e um escreve por cima do outro — no melhor caso é dinheiro de geração jogado fora,
// no pior um build lê o arquivo enquanto o outro grava. Por isso: pega o lock do passo e
// RE-CONFERE a existência lá dentro (o vizinho pode ter acabado de gerar enquanto esperávamos).
async function step(label, outputs, fn) {
  const outs = outputs.map((o) => (path.isAbsolute(o) ? o : path.join(CONTEUDO_DIR, o)));
  const faltando = [];
  for (const o of outs) if (!(await existe(o))) faltando.push(o);
  if (!FORCE && faltando.length === 0) { console.log(`SKIP  ${label} (já existe)`); return; }
  if (DRY) { console.log(`PLAN  ${label}${FORCE ? ' [force]' : ` (falta ${faltando.length}/${outs.length})`}`); return; }
  await comLock(`build-${label}`, async () => {
    if (!FORCE) {
      let aindaFalta = false;
      for (const o of outs) if (!(await existe(o))) aindaFalta = true;
      if (!aindaFalta) { console.log(`SKIP  ${label} (outro build acabou de gerar)`); return; }
    }
    console.log(`RUN   ${label}`);
    await fn();
  }, { aviso: `WAIT  ${label} (outro build está gerando este asset)` });
}
const copy = async (src, dst) => { await fs.mkdir(path.dirname(dst), { recursive: true }); await fs.copyFile(src, dst); };

console.log(`\n== build-video ${ID} ==  ${DRY ? '(dry-run)' : ''}${FORCE ? ' (force)' : ''}\nmanifesto: ${path.relative(CONTEUDO_DIR, manifestPath)}\n`);

// 1) PERSONAGENS: caricatura-base + bibliotecas de movimento (+ copiar frames pro kf do vídeo)
for (const p of man.personagens || []) {
  const slug = p.slug;
  if (p.ref) await step(`char ${slug}`, [`personagens/${slug}.png`], () => run(`${SPR}/gen-char.mjs`, [p.ref, slug, p.desc || '']));
  // IDLE (respiração): biblioteca de MAIOR reaproveitamento do projeto — 1 render por personagem
  // vale em todo vídeo dele, e o composer liga o ciclo sozinho ao encontrar kf/<slug>-i1.png.
  if (p.idle) {
    const idle = typeof p.idle === 'object' ? p.idle : {};
    await step(`idle ${slug} (gen+slice)`, [1, 2, 3, 4].map((n) => `personagens/${slug}/rigs/idle/i${n}.png`),
      async () => { await run(`${SPR}/gen-idle.mjs`, [slug, idle.kit || '', String(idle.num || ''), idle.dir || 'right', idle.nota || '']); await run(`${SPR}/slice-idle.mjs`, [slug]); });
  }
  // `dir: "left"` gera a folha PRA ESQUERDA, na pasta própria `rigs/<tipo>-esq` (quadros wL/rL).
  // O `dir` do manifesto nem chegava ao gerador: toda folha saía pra direita, e um jogador numerado
  // mandado pro outro lado andava de costas sem nada acusar (ver INV-4 em invariantes.mjs).
  for (const [campo, tipo, pref, gen, sli] of [['andar', 'andar', 'w', 'gen-walk', 'slice-walk'],
                                               ['correr', 'correr', 'r', 'gen-run', 'slice-run']]) {
    const cfg = p[campo];
    if (!cfg) continue;
    const esq = cfg.dir === 'left';
    const pasta = `personagens/${slug}/rigs/${tipo}${esq ? '-esq' : ''}`;
    await step(`${campo} ${slug}${esq ? ' (esquerda)' : ''} (gen+slice)`,
      [1, 2, 3, 4].map((n) => `${pasta}/${pref}${esq ? 'L' : ''}${n}.png`),
      async () => {
        await run(`${SPR}/${gen}.mjs`, [slug, cfg.kit || '', String(cfg.num || ''), cfg.dir || 'right', cfg.nota || '']);
        await run(`${SPR}/${sli}.mjs`, [slug, ...(esq ? ['--esq'] : [])]);
      });
  }
}

// 2) REAÇÕES: biblioteca rigs/poses/<slug>/<emocao>.png -> kf/<slug>-<emocao>.png
for (const r of man.reacoes || []) {
  await step(`react ${r.slug}:${r.emocao}`, [`personagens/${r.slug}/poses/${r.emocao}.png`, `videos/${ID}/kf/${r.slug}-${r.emocao}.png`],
    async () => { await run(`${SPR}/gen-react.mjs`, [r.slug, r.emocao, r.desc || '']); await run(`${SPR}/slice-pose.mjs`, [path.join(CONTEUDO_DIR, `personagens/${r.slug}/poses/${r.emocao}.png`), path.join(CONTEUDO_DIR, `personagens/${r.slug}/poses/${r.emocao}.png`)]); });
}

// 2b) AÇÕES: folha 2x2 de um GESTO (4 quadros num render só) -> kf/<slug>-<nome>1..4.png
for (const a0 of man.acoes || []) {
  // gesto do vocabulário: desc/fases/muda vêm do catálogo testado (gestos.mjs)
  const a = a0.gesto ? { ...gestoPara(a0.gesto, a0.classe || 'secundaria'), ...a0 } : a0;
  const fases = (a.fases || []).join('|');
  // confere TODAS as células da classe: com [1,2,3,4] fixo, uma folha primária/complexa cortada pela
  // metade passava por "já existe" (os 4 primeiros quadros estão lá) e o vídeo renderizava faltando
  // sprite. O número de células é da CLASSE, como no resto da cadeia.
  const nCel = gridDaClasse(a.classe || 'secundaria').celulas;
  await step(`acao ${a.slug}:${a.nome}`, Array.from({ length: nCel }, (_, k) => `personagens/${a.slug}/acoes/${a.nome}/${a.nome}${k + 1}.png`),
    async () => {
      await run(`${SPR}/gen-acao.mjs`, [a.slug, a.nome, a.desc || '', fases, a.travado || '', a.muda || '', a.dir || 'right', a.classe || 'secundaria']);
      await run(`${SPR}/slice-acao.mjs`, [a.slug, a.nome, '', a.classe || 'secundaria']);
    });
}

// 3) POSES específicas do vídeo: sheets/<nome>.png -> kf/<nome>.png
for (const po of man.poses || []) {
  await step(`pose ${po.nome}`, [`videos/${ID}/sheets/${po.nome}.png`, `videos/${ID}/kf/${po.nome}.png`],
    async () => { await run(`${SPR}/gen-pose.mjs`, [po.base, ID, po.nome, po.desc || '']); await run(`${SPR}/slice-pose.mjs`, [path.join(videoDir(ID), 'sheets', `${po.nome}.png`), path.join(CONTEUDO_DIR, `personagens/${po.base}/poses/${po.nome.replace(po.base + '-', '')}.png`)]); });
}

// 4) CENÁRIOS — full-frame, panorâmico (mundo) e camadas de primeiro plano.
// `panoramico` gera em 3:2 e depois reamostra pro tamanho do MUNDO (o gerador entrega bem menor);
// `camada:"frente"` sai em magenta e passa pelo key-camada pra virar PNG transparente.
for (const c of man.cenarios || []) {
  // COSTURA: o mundo panorâmico pode ser feito de DOIS cenários 3:4 gerados separados e juntados
  // (dois 1080x1440 = 2160x1440 exato). Vale quando os lados têm que ser bem diferentes entre si:
  // pedir a um render só que divida o quadro em dois lugares distintos sai imprevisível, gerar cada
  // lado no formato que o modelo faz bem sai coerente. Precisa vir DEPOIS dos lados no manifesto.
  if (c.costura) {
    await step(`panorama ${c.nome} (costura ${c.costura.esq}+${c.costura.dir})`, [`videos/${ID}/cenario/${c.nome}.png`],
      () => run(`${SPR}/costurar-cenario.mjs`, [ID, c.nome, c.costura.esq, c.costura.dir,
        ...(MUNDO ? [String(MUNDO.w), String(MUNDO.h)] : [])]));
    continue;
  }
  const pano = !!(c.panoramico || (MUNDO && c.mundo));
  const formatoArg = c.formato || (pano ? '3:2' : FORMATO_VIDEO);
  const flags = [...(pano ? ['--panoramico'] : []), ...(c.camada ? [`--camada=${c.camada}`] : [])];
  await step(`cenario ${c.nome}${pano ? ' (panorâmico)' : ''}${c.camada ? ` (camada ${c.camada})` : ''}`,
    [`videos/${ID}/cenario/${c.nome}.png`],
    async () => {
      await run(`${SPR}/gen-cenario.mjs`, [ID, c.nome, c.desc || '', formatoArg, ...flags]);
      if (c.camada) await run(`${SPR}/key-camada.mjs`, [ID, c.nome]);
      if (pano && MUNDO) await run(`${SPR}/resize-cenario.mjs`, [ID, c.nome, String(MUNDO.w), String(MUNDO.h)]);
    });
}

if (DRY) { console.log('\n(dry-run — nada gerado)'); process.exit(0); }

// 5) VALIDAÇÃO (gate)
console.log('\n== validando ==');
const slugsMan = [...new Set([...(man.personagens || []).map((x) => x.slug), ...(man.acoes || []).map((x) => x.slug)])];
const kfPngs = [];
for (const sl of slugsMan) {
  const raiz = path.join(CONTEUDO_DIR, 'personagens', sl);
  const anda = async (d) => { for (const e of await fs.readdir(d, { withFileTypes: true }).catch(() => [])) {
    const f = path.join(d, e.name);
    if (e.isDirectory()) await anda(f); else if (e.name.endsWith('.png') && !e.name.startsWith('_')) kfPngs.push(f); } };
  await anda(path.join(raiz, 'rigs')); await anda(path.join(raiz, 'acoes')); await anda(path.join(raiz, 'poses'));
}
let gate = 0;
if (kfPngs.length) await run(`${SPR}/check-sprite.mjs`, kfPngs).catch(() => { gate = 1; });
await run(`${VID}/check-video.mjs`, [ID]).catch(() => { gate = 1; });
console.log(`\nbuild-video ${ID}: ${gate ? 'com FAIL no gate — resolver antes de renderizar' : 'assets prontos + gate OK'}`);
console.log('lembrete: confira a ORIENTAÇÃO do olhar à mão (nenhum validador pega); flop-sprite se precisar.');
process.exit(gate);
