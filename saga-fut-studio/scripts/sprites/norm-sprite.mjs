// norm-sprite.mjs <inTransparente> <out> — coloca um recorte JÁ transparente no canvas fixo,
// pés travados em FEET_Y. Mesmo placement dos slicers (config.mjs). Use pós cream-key/webm.
import sharp from '/Users/raphaeloliveira/projects/dev-blaugrana/saga-fut-studio/node_modules/sharp/dist/index.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { placeOnCanvas } from './config.mjs';

const [, , IN, OUT] = process.argv;
if (!IN || !OUT) { console.error('uso: node norm-sprite.mjs <in.png> <out.png>'); process.exit(1); }
await mkdir(path.dirname(OUT), { recursive: true });
const { data, info } = await sharp(IN).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;
let minX = W, minY = H, maxX = 0, maxY = 0;
for (let p = 0; p < W * H; p++) {
  if (data[p * 4 + 3] > 10) { const x = p % W, y = (p / W) | 0; if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
}
await writeFile(OUT, await placeOnCanvas(data, W, H, { minX, minY, maxX, maxY }));
console.log('norm', path.basename(OUT), (maxX - minX + 1) + 'x' + (maxY - minY + 1));
