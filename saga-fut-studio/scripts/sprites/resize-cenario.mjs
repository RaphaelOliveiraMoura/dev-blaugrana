// resize-cenario.mjs <videoId> <nome> <largura> <altura> — reamostra um cenário pro tamanho exato
// em que ele vai ser exibido, com lanczos3 + sharpen leve.
//
// POR QUE EXISTE: o gerador entrega no máximo 1536x1024 no formato largo, e um MUNDO panorâmico é
// bem maior que isso em px de tela (2160x1440 num 3:4 de 2 telas). Deixar o navegador esticar dá
// interpolação bilinear, que borra justamente o que sustenta o estilo rabisco: o contorno preto
// grosso. Reamostrar aqui, uma vez, com um kernel bom e um sharpen de volta, mantém a linha firme.
import sharp from 'sharp';
import path from 'node:path';
import { rename } from 'node:fs/promises';
import { CONTEUDO } from './config.mjs';

const [, , VIDEOID, NOME, W, H] = process.argv;
if (!VIDEOID || !NOME || !W || !H) { console.error('uso: node resize-cenario.mjs <videoId> <nome> <largura> <altura>'); process.exit(1); }
const alvoW = parseInt(W, 10), alvoH = parseInt(H, 10);
const arq = path.join(CONTEUDO, `videos/${VIDEOID}/cenario/${NOME}.png`);

const antes = await sharp(arq).metadata();
if (antes.width === alvoW && antes.height === alvoH) {
  console.log(`SKIP resize ${NOME}: já está ${alvoW}x${alvoH}`);
  process.exit(0);
}
// escreve em temporário e troca: sharp não lê e grava o mesmo arquivo na mesma passada
const tmp = arq.replace(/\.png$/, '.resize.tmp.png');
await sharp(arq)
  .resize(alvoW, alvoH, { fit: 'fill', kernel: 'lanczos3' })
  .sharpen({ sigma: 0.7 })
  .png()
  .toFile(tmp);
await rename(tmp, arq);
console.log(`OK resize ${NOME}: ${antes.width}x${antes.height} -> ${alvoW}x${alvoH}`);
