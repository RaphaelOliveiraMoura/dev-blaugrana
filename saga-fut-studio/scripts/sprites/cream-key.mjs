// cream-key.mjs <in> <out> — tira o fundo creme (#f2ead6) das artes-base, protegendo o kit
// branco/olhos (neutros). Só p/ roupa escura. Regra de chroma em config.mjs (keyCream).
import sharp from '/Users/raphaeloliveira/projects/dev-blaugrana/saga-fut-studio/node_modules/sharp/dist/index.mjs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { keyCream } from './config.mjs';

const [, , IN, OUT] = process.argv;
if (!IN || !OUT) { console.error('uso: node cream-key.mjs <in.png> <out.png>'); process.exit(1); }
await mkdir(path.dirname(OUT), { recursive: true });
const { data, info } = await sharp(IN).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;
const { minX, minY, maxX, maxY } = keyCream(data, W, H);
const bw = maxX - minX + 1, bh = maxY - minY + 1;
await sharp(Buffer.from(data), { raw: { width: W, height: H, channels: 4 } }).extract({ left: minX, top: minY, width: bw, height: bh }).png().toFile(OUT);
console.log('key', path.basename(OUT), bw + 'x' + bh);
