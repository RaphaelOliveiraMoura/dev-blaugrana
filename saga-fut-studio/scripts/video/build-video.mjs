// build-video.mjs <id|manifest.json> [--dry] [--force] — RUNNER do manifesto de assets.
// Lê um sprites.json (declarativo: o que o vídeo precisa) e orquestra gen/slice/copy/validate
// de TUDO na ordem certa, num comando só. Pula o que já existe (a não ser --force); --dry só
// mostra o plano. No fim roda check-sprite + check-video como gate.
//
// Manifesto (videos/<id>/sprites.json):
// {
//   "video": "<id>",
//   "personagens": [ { "slug":"x-riso", "ref":"personagens/refs/x-riso.png", "desc":"notas",
//                      "andar": {"kit":"camisa azul","num":"9"}, "correr": {...}, "stand": true } ],
//   "reacoes":  [ { "slug":"x-riso", "emocao":"rindo", "desc":"..." } ],   // -> kf/<slug>-<emocao>.png
//   "poses":    [ { "base":"x-riso", "nome":"x-chuta", "desc":"..." } ],   // -> kf/<nome>.png
//   "cenarios": [ { "nome":"sala", "desc":"..." } ]                        // -> cenario/<nome>.png
// }
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { CONTEUDO_DIR, VIDEO_DIR, videoDir } from '../../server/config.mjs';

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
const kfDir = path.join(videoDir(ID), 'kf');

const existe = (abs) => fs.access(abs).then(() => true).catch(() => false);
const run = (script, cmdArgs) => new Promise((res, rej) => {
  const p = spawn('node', [script, ...cmdArgs], { stdio: 'inherit' });
  p.on('error', rej);
  p.on('close', (c) => (c === 0 ? res() : rej(new Error(`${path.basename(script)} saiu ${c}`))));
});
// executa um passo se algum output faltar (ou --force). gera log de plano no --dry.
async function step(label, outputs, fn) {
  const outs = outputs.map((o) => (path.isAbsolute(o) ? o : path.join(CONTEUDO_DIR, o)));
  const faltando = [];
  for (const o of outs) if (!(await existe(o))) faltando.push(o);
  if (!FORCE && faltando.length === 0) { console.log(`SKIP  ${label} (já existe)`); return; }
  if (DRY) { console.log(`PLAN  ${label}${FORCE ? ' [force]' : ` (falta ${faltando.length}/${outs.length})`}`); return; }
  console.log(`RUN   ${label}`);
  await fn();
}
const copy = async (src, dst) => { await fs.mkdir(path.dirname(dst), { recursive: true }); await fs.copyFile(src, dst); };

console.log(`\n== build-video ${ID} ==  ${DRY ? '(dry-run)' : ''}${FORCE ? ' (force)' : ''}\nmanifesto: ${path.relative(CONTEUDO_DIR, manifestPath)}\n`);
await fs.mkdir(kfDir, { recursive: true });

// 1) PERSONAGENS: caricatura-base + bibliotecas de movimento (+ copiar frames pro kf do vídeo)
for (const p of man.personagens || []) {
  const slug = p.slug;
  if (p.ref) await step(`char ${slug}`, [`personagens/${slug}.png`], () => run(`${SPR}/gen-char.mjs`, [p.ref, slug, p.desc || '']));
  if (p.andar) {
    await step(`andar ${slug} (gen+slice)`, [1, 2, 3, 4].map((n) => `rigs/andar/${slug}/w${n}.png`),
      async () => { await run(`${SPR}/gen-walk.mjs`, [slug, p.andar.kit || '', String(p.andar.num || '')]); await run(`${SPR}/slice-walk.mjs`, [slug]); });
    if (!DRY) for (const n of [1, 2, 3, 4]) await copy(path.join(CONTEUDO_DIR, `rigs/andar/${slug}/w${n}.png`), path.join(kfDir, `${slug}-w${n}.png`));
  }
  if (p.correr) {
    await step(`correr ${slug} (gen+slice)`, [1, 2, 3, 4].map((n) => `rigs/correr/${slug}/r${n}.png`),
      async () => { await run(`${SPR}/gen-run.mjs`, [slug, p.correr.kit || '', String(p.correr.num || '')]); await run(`${SPR}/slice-run.mjs`, [slug]); });
    if (!DRY) for (const n of [1, 2, 3, 4]) await copy(path.join(CONTEUDO_DIR, `rigs/correr/${slug}/r${n}.png`), path.join(kfDir, `${slug}-r${n}.png`));
  }
  // stand: base creme -> recorte -> normalizado em kf/<slug>-stand.png (frágil: cream come branco;
  // check-sprite acusa fantasma se der ruim). Opt-in.
  if (p.stand) await step(`stand ${slug} (cream+norm)`, [`videos/${ID}/kf/${slug}-stand.png`], async () => {
    const tmp = path.join(kfDir, `_tmp-${slug}.png`);
    await run(`${SPR}/cream-key.mjs`, [path.join(CONTEUDO_DIR, `personagens/${slug}.png`), tmp]);
    await run(`${SPR}/norm-sprite.mjs`, [tmp, path.join(kfDir, `${slug}-stand.png`)]);
    await fs.rm(tmp, { force: true });
  });
}

// 2) REAÇÕES: biblioteca rigs/poses/<slug>/<emocao>.png -> kf/<slug>-<emocao>.png
for (const r of man.reacoes || []) {
  await step(`react ${r.slug}:${r.emocao}`, [`rigs/poses/${r.slug}/${r.emocao}.png`, `videos/${ID}/kf/${r.slug}-${r.emocao}.png`],
    async () => { await run(`${SPR}/gen-react.mjs`, [r.slug, r.emocao, r.desc || '']); await run(`${SPR}/slice-pose.mjs`, [path.join(CONTEUDO_DIR, `rigs/poses/${r.slug}/${r.emocao}.png`), path.join(kfDir, `${r.slug}-${r.emocao}.png`)]); });
}

// 3) POSES específicas do vídeo: sheets/<nome>.png -> kf/<nome>.png
for (const po of man.poses || []) {
  await step(`pose ${po.nome}`, [`videos/${ID}/sheets/${po.nome}.png`, `videos/${ID}/kf/${po.nome}.png`],
    async () => { await run(`${SPR}/gen-pose.mjs`, [po.base, ID, po.nome, po.desc || '']); await run(`${SPR}/slice-pose.mjs`, [path.join(videoDir(ID), 'sheets', `${po.nome}.png`), path.join(kfDir, `${po.nome}.png`)]); });
}

// 4) CENÁRIOS
for (const c of man.cenarios || []) {
  await step(`cenario ${c.nome}`, [`videos/${ID}/cenario/${c.nome}.png`],
    () => run(`${SPR}/gen-cenario.mjs`, [ID, c.nome, c.desc || '', c.formato || '3:4']));
}

if (DRY) { console.log('\n(dry-run — nada gerado)'); process.exit(0); }

// 5) VALIDAÇÃO (gate)
console.log('\n== validando ==');
const kfPngs = (await fs.readdir(kfDir).catch(() => [])).filter((f) => f.endsWith('.png')).map((f) => path.join(kfDir, f));
let gate = 0;
if (kfPngs.length) await run(`${SPR}/check-sprite.mjs`, kfPngs).catch(() => { gate = 1; });
await run(`${VID}/check-video.mjs`, [ID]).catch(() => { gate = 1; });
console.log(`\nbuild-video ${ID}: ${gate ? 'com FAIL no gate — resolver antes de renderizar' : 'assets prontos + gate OK'}`);
console.log('lembrete: confira a ORIENTAÇÃO do olhar à mão (nenhum validador pega); flop-sprite se precisar.');
process.exit(gate);
