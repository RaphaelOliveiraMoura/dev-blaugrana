// sprite-card.mjs — CARTÃO VISUAL do sprite: junta os quadros num PNG único sobre fundo quadriculado,
// com rótulo em cada um, pra bater o olho ANTES do sprite entrar num vídeo (pega cabeça/perna trocada,
// vista errada, sobra de magenta). O check-sprite olha número; o cartão é o olho.
//   node sprite-card.mjs andar <slug>    (w1..4)   node sprite-card.mjs correr <slug>   (r1..4)
//   node sprite-card.mjs poses <slug>    (todas)   node sprite-card.mjs auto  <slug>    (o que houver)
// Também exportado (montarCartao) pra os slice-*/gen-react chamarem no fim da geração.
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { keyMagenta, placeOnCanvas } from './config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTEUDO = path.resolve(__dirname, '../../../saga-fut');
const RIGS = path.join(CONTEUDO, 'rigs');
const existe = (p) => fs.access(p).then(() => true).catch(() => false);

// fundo xadrez (mostra transparência/bordas do recorte) do tamanho pedido
function xadrez(w, h, q = 24) {
  const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><defs>
    <pattern id="x" width="${q * 2}" height="${q * 2}" patternUnits="userSpaceOnUse">
      <rect width="${q * 2}" height="${q * 2}" fill="#d8d8d8"/>
      <rect width="${q}" height="${q}" fill="#b9b9b9"/><rect x="${q}" y="${q}" width="${q}" height="${q}" fill="#b9b9b9"/>
    </pattern></defs><rect width="100%" height="100%" fill="url(#x)"/></svg>`;
  return Buffer.from(svg);
}

// carrega um frame como PNG transparente. Se `key` (fonte em magenta cru, ex.: rigs/poses/*), keya
// (keyMagenta+placeOnCanvas) igual ao slice; senão usa o arquivo como está (andar/correr já transparente).
async function carregar(file, key) {
  if (!key) return sharp(file);
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const bbox = keyMagenta(data, info.width, info.height);
  return sharp(await placeOnCanvas(data, info.width, info.height, bbox));
}

// frames = [{ file, label }]. `key:true` keya cada fonte (poses em magenta). Monta a grade em outPath.
export async function montarCartao(frames, outPath, { titulo = '', cols, key = false } = {}) {
  const fs2 = [];
  for (const f of frames) if (await existe(f.file)) fs2.push(f);
  if (!fs2.length) return null;
  const TW = 240, lab = 26;
  const first = await (await carregar(fs2[0].file, key)).metadata();
  const th = Math.round(TW * ((first.height || 1) / (first.width || 1)));
  const C = cols || Math.min(4, fs2.length);
  const rows = Math.ceil(fs2.length / C);
  const pad = 8, headH = titulo ? 30 : 0;
  const cw = TW + pad * 2, chh = th + pad * 2 + lab;
  const W = C * cw, H = rows * chh + headH;
  const comps = [];
  if (titulo) comps.push({ input: Buffer.from(`<svg width="${W}" height="${headH}"><rect width="100%" height="100%" fill="#111"/><text x="8" y="21" font-family="monospace" font-size="18" fill="#8fd">${titulo}</text></svg>`), left: 0, top: 0 });
  for (let i = 0; i < fs2.length; i++) {
    const r = Math.floor(i / C), c = i % C;
    const x = c * cw + pad, y = headH + r * chh + pad;
    comps.push({ input: xadrez(TW, th), left: x, top: y });
    const sprite = await (await carregar(fs2[i].file, key)).resize(TW, th, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    comps.push({ input: sprite, left: x, top: y });
    comps.push({ input: Buffer.from(`<svg width="${TW}" height="${lab}"><rect width="100%" height="100%" fill="#1b1b1b"/><text x="7" y="19" font-family="monospace" font-size="16" fill="#fff">${fs2[i].label}</text></svg>`), left: x, top: y + th + pad });
  }
  await sharp({ create: { width: W, height: H, channels: 4, background: { r: 30, g: 30, b: 30, alpha: 1 } } }).composite(comps).png().toFile(outPath);
  return outPath;
}

// helpers de conveniência por tipo (usados pelos slice-*/gen-react e pelo CLI)
export async function cartaoAndar(slug) {
  const dir = path.join(RIGS, 'andar', slug);
  return montarCartao([1, 2, 3, 4].map((n) => ({ file: path.join(dir, `w${n}.png`), label: `w${n}` })), path.join(dir, '_card.png'), { titulo: `andar ${slug} — cabeça e pernas no MESMO sentido?` });
}
export async function cartaoCorrer(slug) {
  const dir = path.join(RIGS, 'correr', slug);
  return montarCartao([1, 2, 3, 4].map((n) => ({ file: path.join(dir, `r${n}.png`), label: `r${n}` })), path.join(dir, '_card.png'), { titulo: `correr ${slug} — cabeça e pernas no MESMO sentido?` });
}
export async function cartaoPoses(slug) {
  const dir = path.join(RIGS, 'poses', slug);
  const poses = (await fs.readdir(dir).catch(() => [])).filter((f) => f.endsWith('.png') && !f.startsWith('_'));
  return montarCartao(poses.map((f) => ({ file: path.join(dir, f), label: f.replace('.png', '') })), path.join(dir, '_card.png'), { titulo: `poses ${slug}`, key: true });
}

// CLI
const [, , kind, slug] = process.argv;
if (import.meta.url === `file://${process.argv[1]}`) {
  if (!kind || !slug) { console.error('uso: node sprite-card.mjs <andar|correr|poses|auto> <slug>'); process.exit(2); }
  const feito = [];
  if (kind === 'andar' || kind === 'auto') { const o = await cartaoAndar(slug); if (o) feito.push(o); }
  if (kind === 'correr' || kind === 'auto') { const o = await cartaoCorrer(slug); if (o) feito.push(o); }
  if (kind === 'poses' || kind === 'auto') { const o = await cartaoPoses(slug); if (o) feito.push(o); }
  if (!feito.length) { console.error('nada gerado (sprites não encontrados)'); process.exit(1); }
  feito.forEach((o) => console.log('OK cartão:', path.relative(CONTEUDO, o)));
}
