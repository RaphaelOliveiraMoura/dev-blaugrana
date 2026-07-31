// new-video.mjs <id> [template] [formato] — SCAFFOLD de vídeo novo já no padrão.
// Cria videos/<id>/{sheets,kf,cenario}/ e data/videos/<id>.json com os DEFAULTS OBRIGATÓRIOS
// (formato 3:4, moldura, semAudio, publicacao com placeholder). Não sobrescreve se já existir.
// Assim o vídeo NASCE padronizado em vez de ser consertado depois.
import fs from 'node:fs/promises';
import path from 'node:path';
import { VIDEO_DIR, videoDir } from '../../server/config.mjs';
import { FORMATO_PADRAO } from '../../server/video/montar-cena.mjs';

const TEMPLATES = ['roteiro', 'esteira', 'gags-sequencia', 'dupla-briga', 'alternado'];
const [, , ID, TEMPLATE = 'esteira', FORMATO = FORMATO_PADRAO] = process.argv;
if (!ID || !/^[a-z0-9-]+$/.test(ID)) {
  console.error('uso: node new-video.mjs <id-kebab> [template] [formato]');
  console.error('templates:', TEMPLATES.join(' | ')); process.exit(1);
}
if (!TEMPLATES.includes(TEMPLATE)) console.warn(`aviso: template "${TEMPLATE}" não é conhecido (${TEMPLATES.join(', ')}).`);

const jsonPath = path.join(VIDEO_DIR, ID + '.json');
if (await fs.access(jsonPath).then(() => true).catch(() => false)) {
  console.error(`ABORTADO: ${jsonPath} já existe. Não vou sobrescrever.`); process.exit(1);
}

for (const sub of ['sheets', 'kf', 'cenario']) await fs.mkdir(path.join(videoDir(ID), sub), { recursive: true });

const stub = {
  id: ID,
  titulo: ID,
  tipo: 'animacao',
  template: TEMPLATE,
  status: 'roteiro',
  formato: FORMATO,        // padrão 3:4, o MESMO dos quadrinhos (material da casa todo na mesma proporção)
  fps: 30,
  fonte: 'Luckiest Guy',
  contrato: 'v1',           // NASCE sob o contrato vigente (contratos.mjs): personagem sem
                           // model sheet/idle REPROVA no check-video. Vídeo sem este campo é legado.
  semAudio: true,          // montagem muda por padrão (som entra depois)
  moldura: true,           // padrão dos quadrinhos (moldura + estrela)
  contexto: '',
  gancho: '',
  cenario: { base: `videos/${ID}/cenario/base.png` },
  marca: '@devblaugrana',
  publicacao: { titulo: '', legenda: '' },  // OBRIGATÓRIOS pra criar/renderizar (preencher!)
};
await fs.mkdir(VIDEO_DIR, { recursive: true });
await fs.writeFile(jsonPath, JSON.stringify(stub, null, 2) + '\n');

console.log('OK vídeo novo:', ID);
console.log('  json    :', jsonPath);
console.log('  pastas  : videos/' + ID + '/{sheets,kf,cenario}');
console.log('  próximos: 1) cenário  -> node scripts/sprites/gen-cenario.mjs ' + ID + ' base "..."');
console.log('            2) sprites  -> gen-pose/gen-walk + slice + check-sprite');
console.log('            3) preencher publicacao.titulo/legenda no json');
console.log('            4) preflight -> node scripts/video/check-video.mjs ' + ID);
console.log('  obs: se o studio (4600/4610) estiver aberto, recarregue pra ele enxergar o novo vídeo.');
