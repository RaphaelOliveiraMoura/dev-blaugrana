// slice-pose.mjs <in> <out> — pose única em magenta -> transparente, ancorada no pé.
// Constantes e matemática vêm de config.mjs (canvas 480x620, pés em 610, CHAR_H 580).
import sharp from '/Users/raphaeloliveira/projects/dev-blaugrana/saga-fut-studio/node_modules/sharp/dist/index.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { keyMagenta, placeOnCanvas } from './config.mjs';

const [, , IN, OUT] = process.argv;
if (!IN || !OUT) { console.error('uso: node slice-pose.mjs <in.png> <out.png>'); process.exit(1); }
await mkdir(path.dirname(OUT), { recursive: true });
const { data, info } = await sharp(IN).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const bbox = keyMagenta(data, info.width, info.height);
await writeFile(OUT, await placeOnCanvas(data, info.width, info.height, bbox));
console.log('pose', path.basename(OUT), (bbox.maxX - bbox.minX + 1) + 'x' + (bbox.maxY - bbox.minY + 1));
