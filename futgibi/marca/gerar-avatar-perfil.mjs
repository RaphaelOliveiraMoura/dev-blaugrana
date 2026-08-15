// Monta a FOTO DE PERFIL do futgibi a partir do avatar do mascote.
//
// O gerar-avatar.mjs entrega o busto sobre magenta chapado justamente pra ser chaveado depois
// (mesma tecnica do gerar-quiz: teste por MATIZ, porque magenta e o unico tom em que R e B sobem
// juntos e G fica pra tras). Aqui o magenta vira o verde da marca, feito por CODIGO pra que a cor
// do canal seja um valor num arquivo e nao algo que o modelo tenta acertar a cada geracao.
//
//   node marca/gerar-avatar-perfil.mjs [<slug>] [--saida=<arquivo.png>]
import sharp from '../../saga-fut-studio/node_modules/sharp/dist/index.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const SLUG = process.argv[2]?.startsWith('--') ? 'torcedor-12' : (process.argv[2] || 'torcedor-12');
const saidaFlag = process.argv.find((a) => a.startsWith('--saida='))?.slice(8);

const CONTEUDO = path.resolve(AQUI, '../../saga-fut');
const ENTRADA = path.join(CONTEUDO, 'personagens', SLUG, 'avatar.png');
const SAIDA = saidaFlag || path.join(AQUI, 'perfil.png');

const VERDE = { r: 0x17, g: 0x69, b: 0x3c };   // verde-grama da marca
const TAM = 1024;

const { data, info } = await sharp(ENTRADA).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: w, height: h } = info;

// magenta -> transparente, por matiz (nao por distancia): evita a franja rosa nas bordas
// antialiasadas, que aparece como um fio roxo em volta da cabeca.
let removidos = 0;
for (let i = 0; i < w * h * 4; i += 4) {
  const r = data[i], g = data[i + 1], b = data[i + 2];
  if (r - g > 55 && b - g > 55) { data[i + 3] = 0; removidos++; }
}
console.log(`magenta removido: ${((removidos / (w * h)) * 100).toFixed(1)}% do quadro`);

const recorte = await sharp(data, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();

await sharp({
  create: { width: TAM, height: TAM, channels: 4, background: { ...VERDE, alpha: 1 } },
})
  .composite([{ input: await sharp(recorte).resize(TAM, TAM, { fit: 'cover' }).toBuffer() }])
  .png()
  .toFile(SAIDA);

console.log('OK ->', SAIDA);
