// new-video.mjs <id> --titulo="..." --legenda="..." [template] [formato]
//   SCAFFOLD de vídeo novo já no padrão: cria videos/<id>/cenario/ e data/videos/<id>.json com
//   os DEFAULTS OBRIGATÓRIOS (formato 3:4, moldura, semAudio, contrato vigente). Não sobrescreve.
//
// TÍTULO E LEGENDA SÃO ARGUMENTO, não campo pra preencher depois (12/08/2026).
//
// Antes o stub nascia com `publicacao: { titulo: '', legenda: '' }` e gravava DIRETO no disco.
// Duas consequências, as duas ruins:
//   1. As portas da API recusam vídeo sem título e legenda (validarPayload e problemaNoItem), e
//      é por isso que o script escrevia no disco: um stub vazio não passaria. Ou seja, a regra
//      que protege o acervo empurrava justamente este script pra fora dela.
//   2. Escrever no disco com o studio ABERTO é o bug do §1 do CLAUDE.md: ele mantém tudo em
//      memória e sobrescreve no próximo save. O vídeo recém-criado some sem erro nenhum.
// Exigir os dois no nascimento resolve os dois: o vídeo passa pela API (que valida agenda,
// formato e o resto) e nunca fica esperando alguém "preencher depois". Casa com o que este
// arquivo já dizia: o vídeo NASCE padronizado em vez de ser consertado depois.
import fs from 'node:fs/promises';
import path from 'node:path';
import { VIDEO_DIR, videoDir } from '../../server/config.mjs';
import { FORMATO_PADRAO } from '../../server/video/montar-cena.mjs';

const TEMPLATES = ['roteiro', 'esteira', 'gags-sequencia', 'dupla-briga', 'alternado'];
const STUDIO = process.env.SAGAFUT_STUDIO || 'http://localhost:4600';

const args = process.argv.slice(2);
const flag = (nome) => {
  const p = args.find((a) => a.startsWith(`--${nome}=`));
  return p ? p.slice(nome.length + 3) : '';
};
const soltos = args.filter((a) => !a.startsWith('--'));
const [ID, TEMPLATE = 'esteira', FORMATO = FORMATO_PADRAO] = soltos;
const TITULO = flag('titulo');
const LEGENDA = flag('legenda');

if (!ID || !/^[a-z0-9-]+$/.test(ID)) {
  console.error('uso: node new-video.mjs <id-kebab> --titulo="..." --legenda="..." [template] [formato]');
  console.error('templates:', TEMPLATES.join(' | ')); process.exit(1);
}
if (!TITULO.trim() || !LEGENDA.trim()) {
  console.error(`
FALTA titulo e/ou legenda, e eles não são opcionais.

  node new-video.mjs ${ID} --titulo="O gol que ninguém viu" --legenda="Descrição do post..."

Não é burocracia: as portas de escrita do studio RECUSAM vídeo sem publicacao.titulo e
publicacao.legenda, então um stub vazio só poderia ser gravado por fora da API — que é o
caminho que faz o studio sobrescrever a peça no próximo save. Escrever os dois agora é o
que deixa o vídeo nascer dentro das regras.`);
  process.exit(1);
}
if (!TEMPLATES.includes(TEMPLATE)) console.warn(`aviso: template "${TEMPLATE}" não é conhecido (${TEMPLATES.join(', ')}).`);

const jsonPath = path.join(VIDEO_DIR, ID + '.json');
if (await fs.access(jsonPath).then(() => true).catch(() => false)) {
  console.error(`ABORTADO: ${jsonPath} já existe. Não vou sobrescrever.`); process.exit(1);
}

// só `cenario`: sprite mora no personagem (personagens/<slug>/) e a pasta plana do motor é
// montada no render. `kf/` e `sheets/` eram cópias por vídeo e deixaram de existir.
await fs.mkdir(path.join(videoDir(ID), 'cenario'), { recursive: true });

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
  publicacao: { titulo: TITULO.trim(), legenda: LEGENDA.trim() },  // exigidos pelas portas de escrita
};
// A API PRIMEIRO, o disco só como plano B.
//
// Com o studio ABERTO, escrever no disco é perder a peça: ele guarda tudo em memória e
// sobrescreve no próximo save (CLAUDE.md §1). Com o studio FECHADO não há esse risco, e aí o
// disco é o caminho certo — é o mesmo padrão dos gerar-*.mjs.
await fs.mkdir(VIDEO_DIR, { recursive: true });

let via = 'disco';
try {
  const r = await fetch(`${STUDIO}/api/videos/${ID}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(stub),
  });
  if (!r.ok) {
    // 400 aqui é o stub violando alguma regra (agenda, publicação): não insista no disco,
    // porque gravar por fora é exatamente como o acervo junta peça inválida.
    console.error(`ABORTADO: o studio recusou o vídeo (${r.status}): ${(await r.text()).slice(0, 300)}`);
    process.exit(1);
  }
  via = 'API do studio';
} catch {
  // studio fechado: sem ninguém pra sobrescrever, o disco é seguro
  await fs.writeFile(jsonPath, JSON.stringify(stub, null, 2) + '\n');
}

console.log('OK vídeo novo:', ID, `(via ${via})`);
console.log('  json    :', jsonPath);
console.log('  pastas  : videos/' + ID + '/{sheets,kf,cenario}');
console.log('  próximos: 1) cenário  -> node scripts/sprites/gen-cenario.mjs ' + ID + ' base "..."');
console.log('            2) sprites  -> gen-pose/gen-walk + slice + check-sprite');
console.log('            3) preflight -> node scripts/video/check-video.mjs ' + ID);
if (via === 'disco') {
  console.log('  obs: studio fechado, gravei no disco. Se abrir o studio agora, ele lê do disco e tudo certo.');
} else {
  console.log('  obs: gravado pela API, então o studio já enxerga (recarregue a aba).');
}
