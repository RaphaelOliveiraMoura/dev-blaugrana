// rig-lib.mjs — BIBLIOTECA DE MOVIMENTO reutilizável. Objetivo: parar de REGERAR sprite a cada vídeo
// (cada geração é um dado rolado no modelo). Uma vez que o andar/correr/pose de um personagem está
// aprovado em rigs/, ele é REUSADO: só copiar pro kf/ do vídeo. Sprite novo só pra quem falta.
//
//   node rig-lib.mjs list [slug]            catálogo do que já existe em rigs/ (andar/correr/poses)
//   node rig-lib.mjs sync <videoId>         copia do rigs/ tudo que o roteiro referencia e JÁ existe;
//                                           lista o que FALTA (esses sim precisam de geração)
//
// Alias opcional por vídeo: videos/<id>/rigs.json  ex.: { "presidente-riso": { "andar": "presidente-riso-disfarcado" } }
// (quando o andar/correr do personagem mora numa pasta de rig com outro nome, ex.: versão disfarçada).
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { VIDEO_DIR, videoDir } from '../../server/config.mjs';
import { montarCena } from '../../server/video/montar-cena.mjs';
import { keyMagenta, placeOnCanvas } from '../sprites/config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTEUDO = path.resolve(__dirname, '../../../saga-fut');
const RIGS = path.join(CONTEUDO, 'rigs');
const existe = (p) => fs.access(p).then(() => true).catch(() => false);
const lsd = (p) => fs.readdir(p).catch(() => []);

async function listar(filtro) {
  const andar = (await lsd(path.join(RIGS, 'andar'))).filter((d) => !d.startsWith('_'));
  const correr = (await lsd(path.join(RIGS, 'correr'))).filter((d) => !d.startsWith('_'));
  const poseSlugs = (await lsd(path.join(RIGS, 'poses'))).filter((d) => !d.startsWith('_'));
  const slugs = [...new Set([...andar, ...correr, ...poseSlugs])].sort().filter((s) => !filtro || s.includes(filtro));
  console.log('\n== biblioteca de rigs (rigs/) ==');
  for (const s of slugs) {
    const temAndar = andar.includes(s) ? 'andar' : '';
    const temCorrer = correr.includes(s) ? 'correr' : '';
    const poses = (await lsd(path.join(RIGS, 'poses', s))).filter((f) => f.endsWith('.png')).map((f) => f.replace('.png', ''));
    const mov = [temAndar, temCorrer].filter(Boolean).join('+') || '—';
    console.log(`  ${s.padEnd(26)} mov: ${mov.padEnd(14)} poses: ${poses.join(', ') || '—'}`);
  }
  console.log('');
}

// resolve o arquivo-fonte em rigs/ pra um sprite que o roteiro referencia (ex.: "cholo-riso-w1.png")
function fonteDe(arquivo, slugs, alias) {
  const nome = arquivo.replace(/\.png$/, '');
  // acha o slug (maior prefixo que casa, pra lidar com slugs que contêm hífen)
  const slug = slugs.filter((s) => nome === s || nome.startsWith(s + '-')).sort((a, b) => b.length - a.length)[0];
  if (!slug) return null;
  const resto = nome === slug ? '' : nome.slice(slug.length + 1);
  const al = alias[slug] || {};
  if (/^w[1-4]$/.test(resto)) return { tipo: 'andar', slug, arquivo, src: path.join(RIGS, 'andar', al.andar || slug, resto + '.png') };
  if (/^r[1-4]$/.test(resto)) return { tipo: 'correr', slug, arquivo, src: path.join(RIGS, 'correr', al.correr || slug, resto + '.png') };
  return { tipo: 'pose', slug, arquivo, src: path.join(RIGS, 'poses', al.poses || slug, resto + '.png') };
}

async function sync(id) {
  const video = JSON.parse(await fs.readFile(path.join(VIDEO_DIR, id + '.json'), 'utf-8'));
  const slugs = [...new Set((video.roteiro || []).flatMap((s) => (s.personagens || []).map((p) => p.slug)))];
  let alias = {};
  try { alias = JSON.parse(await fs.readFile(path.join(videoDir(id), 'rigs.json'), 'utf-8')); } catch {}

  // sprites que o roteiro DE VERDADE referencia (via composer)
  const { scene } = montarCena(video);
  const refs = new Set();
  for (const shot of scene.shots || []) for (const c of shot.chars || []) {
    if (c.src) refs.add(c.src);
    for (const p of c.poses || []) { if (p.src) refs.add(p.src); for (const fr of p.cycle || []) refs.add(fr); }
  }

  const kfDir = path.join(videoDir(id), 'kf');
  await fs.mkdir(kfDir, { recursive: true });
  const copiados = [], faltando = [], semSlug = [];
  for (const arquivo of [...refs].sort()) {
    const f = fonteDe(arquivo, slugs, alias);
    if (!f) { semSlug.push(arquivo); continue; }
    if (!(await existe(f.src))) { faltando.push(f); continue; }
    const dst = path.join(kfDir, arquivo);
    // andar/correr JÁ vêm keyados (slice-walk/run). POSE vem em magenta cru (gen-react) -> keya aqui,
    // igual o slice-pose, senão iria magenta pro vídeo.
    if (f.tipo === 'pose') {
      const { data, info } = await sharp(f.src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      const bbox = keyMagenta(data, info.width, info.height);
      await fs.writeFile(dst, await placeOnCanvas(data, info.width, info.height, bbox));
    } else await fs.copyFile(f.src, dst);
    copiados.push(f);
  }

  console.log(`\n== rig-lib sync ${id} ==`);
  console.log(`referenciados: ${refs.size} · reusados da biblioteca: ${copiados.length} · faltando: ${faltando.length}`);
  if (copiados.length) console.log('\nREUSADOS (copiados de rigs/ pro kf/):') || copiados.forEach((f) => console.log(`  ✓ ${f.arquivo}  ←  ${path.relative(CONTEUDO, f.src)}`));
  if (faltando.length) {
    console.log('\nFALTANDO (precisam ser gerados e aprovados na biblioteca):');
    const porTipo = { andar: new Set(), correr: new Set(), pose: [] };
    for (const f of faltando) { if (f.tipo === 'pose') porTipo.pose.push(`${f.slug}:${f.arquivo.replace(f.slug + '-', '').replace('.png', '')}`); else porTipo[f.tipo].add(f.slug); }
    if (porTipo.andar.size) console.log(`  andar:  ${[...porTipo.andar].join(', ')}`);
    if (porTipo.correr.size) console.log(`  correr: ${[...porTipo.correr].join(', ')}`);
    if (porTipo.pose.length) console.log(`  poses:  ${porTipo.pose.join(', ')}`);
  }
  if (semSlug.length) console.log(`\n(sem slug reconhecido, ignorados: ${semSlug.join(', ')})`);
  console.log('');
  return { copiados: copiados.length, faltando: faltando.length };
}

const [, , cmd, arg] = process.argv;
if (cmd === 'list') await listar(arg);
else if (cmd === 'sync' && arg) { const r = await sync(arg); process.exit(r.faltando ? 1 : 0); }
else { console.error('uso: node rig-lib.mjs list [slug]  |  node rig-lib.mjs sync <videoId>'); process.exit(2); }
