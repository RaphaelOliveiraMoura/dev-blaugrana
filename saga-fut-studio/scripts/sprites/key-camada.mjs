// key-camada.mjs <videoId> <nome> — transforma uma CAMADA de cenário gerada em magenta num PNG
// TRANSPARENTE do MESMO tamanho: lê videos/<id>/cenario/_raw/<nome>.png e escreve
// videos/<id>/cenario/<nome>.png.
//
// Por que não usa os slicers de sprite: eles recortam a bbox e normalizam pra o canvas de
// personagem (altura fixa, pés no chão). Uma camada de cenário PRECISA manter o enquadramento
// original, pixel por pixel — é ela que tem que casar com o cenário de fundo no pan. Aqui só o
// fundo magenta vira alpha 0, e mais nada muda.
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { CONTEUDO, keyMagenta } from './config.mjs';

const [, , VIDEOID, NOME] = process.argv;
if (!VIDEOID || !NOME) { console.error('uso: node key-camada.mjs <videoId> <nome>'); process.exit(1); }

const cenDir = path.join(CONTEUDO, `videos/${VIDEOID}/cenario`);
const src = path.join(cenDir, '_raw', `${NOME}.png`);
const out = path.join(cenDir, `${NOME}.png`);
const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const bbox = keyMagenta(data, info.width, info.height);
await mkdir(cenDir, { recursive: true });
await writeFile(out, await sharp(Buffer.from(data), { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer());

// quanto sobrou de conteúdo: camada de frente que ocupa o quadro TODO tapa os personagens (o
// modelo ignorou o "deixe o meio vazio"). Vira aviso aqui, não surpresa no render.
let opacos = 0;
for (let p = 0; p < info.width * info.height; p++) if (data[p * 4 + 3] > 10) opacos++;
const pct = Math.round((opacos / (info.width * info.height)) * 100);
console.log(`OK camada ${NOME}: ${info.width}x${info.height} · ${pct}% opaco · bbox ${bbox.minX},${bbox.minY} → ${bbox.maxX},${bbox.maxY}`);
if (pct > 55) console.warn(`[key-camada] ⚠️  ${pct}% do quadro é opaco: como camada de FRENTE isso vai tapar os personagens. Regere pedindo elementos só nas bordas/base.`);
if (pct < 2) console.warn('[key-camada] ⚠️  quase nada sobrou: o modelo provavelmente desenhou tudo em magenta ou pintou o fundo de outra cor.');
