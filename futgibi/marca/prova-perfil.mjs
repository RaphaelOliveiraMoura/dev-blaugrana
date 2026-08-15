// Folha de prova da foto de perfil: o Instagram mostra o avatar SEMPRE recortado em circulo, e o
// quadrado inteiro so existe no arquivo. Quem aprova olhando o PNG quadrado aprova uma imagem que
// ninguem vai ver: o que decide e o circulo, e no tamanho pequeno do feed.
//
//   node marca/prova-perfil.mjs
import sharp from '../../saga-fut-studio/node_modules/sharp/dist/index.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const PERFIL = path.join(AQUI, 'perfil.png');
const SAIDA = path.join(AQUI, '_prova-perfil.png');

const TAMANHOS = [420, 150, 56, 32];   // perfil aberto, grade de perfil, feed, comentario
const PAD = 36, GAP = 40;

async function circulo(tam) {
  const mascara = Buffer.from(
    `<svg width="${tam}" height="${tam}"><circle cx="${tam / 2}" cy="${tam / 2}" r="${tam / 2}" fill="#fff"/></svg>`);
  return sharp(PERFIL).resize(tam, tam)
    .composite([{ input: mascara, blend: 'dest-in' }]).png().toBuffer();
}

const pecas = [];
let x = PAD;
for (const tam of TAMANHOS) {
  pecas.push({ input: await circulo(tam), left: x, top: PAD + Math.round((TAMANHOS[0] - tam) / 2) });
  x += tam + GAP;
}
const W = x - GAP + PAD, H = PAD * 2 + TAMANHOS[0] + 44;

const rotulos = `<svg width="${W}" height="${H}">
  ${TAMANHOS.map((tam, i) => {
    const esq = PAD + TAMANHOS.slice(0, i).reduce((s, t) => s + t + GAP, 0);
    return `<text x="${esq + tam / 2}" y="${PAD + TAMANHOS[0] + 30}" text-anchor="middle"
      font-family="Helvetica" font-size="17" fill="#9aa0a6">${tam}px</text>`;
  }).join('')}
</svg>`;

await sharp({ create: { width: W, height: H, channels: 4, background: { r: 18, g: 18, b: 20, alpha: 1 } } })
  .composite([...pecas, { input: Buffer.from(rotulos), top: 0, left: 0 }])
  .png().toFile(SAIDA);

console.log('OK ->', SAIDA);
