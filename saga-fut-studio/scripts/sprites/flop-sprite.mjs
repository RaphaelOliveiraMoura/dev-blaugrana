// flop-sprite.mjs <in.png> [out.png] — espelha um sprite (corrige orientação do olhar/direção).
// Sem out, sobrescreve o próprio arquivo. Útil pro erro mais comum: personagem virado pro lado
// errado. CUIDADO: espelha número de camisa também (evitar em quem tem número na frente).
import sharp from '/Users/raphaeloliveira/projects/dev-blaugrana/saga-fut-studio/node_modules/sharp/dist/index.mjs';
const [, , IN, OUT] = process.argv;
if (!IN) { console.error('uso: node flop-sprite.mjs <in.png> [out.png]'); process.exit(1); }
const dst = OUT || IN;
const buf = await sharp(IN).flop().png().toBuffer();
await sharp(buf).toFile(dst);
console.log('flop ->', dst);
