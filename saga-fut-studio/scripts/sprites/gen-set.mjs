// gen-set.mjs <slug> <vista> "<descrição>" — uma VISTA da ficha de um lugar, no acervo.
//
// Diferente do gen-cenario (que grava dentro do vídeo, uma vista só), aqui o cenário é uma FICHA em
// `cenarios/<slug>/`: panorama, ângulo e perto do MESMO lugar. A vista derivada recebe o PANORAMA
// como imagem de referência, e é isso que impede o prédio de mudar de cor entre um plano e outro —
// mesma ideia do model sheet, que existe pra folha nova não sair numa proporção diferente.
//
// Saída: cenarios/<slug>/<vista>.png
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { CONTEUDO, ESTILO_PATH, promptCenario, loadStylePrefix } from './config.mjs';
import { exigirPorta } from './porta.mjs';
import { gerarImagem, MODELOS, MODELOS_VALIDOS, MODELO_PADRAO } from './modelo.mjs';
import { VISTAS, arquivoVista, arquivoVariacao, VISTA_PADRAO } from '../../shared/set.mjs';

exigirPorta('gen-set.mjs', 'node scripts/asset.mjs cenario <slug> [--vista=...] --desc="..."');

const [, , SLUG, VISTA, DESC, FORMATO_ARG, MODELO_ARG] = process.argv;
const MODELO = MODELO_ARG || MODELO_PADRAO;
if (!MODELOS[MODELO]) { console.error(`FAIL modelo "${MODELO}" não existe (use ${MODELOS_VALIDOS.join(' | ')})`); process.exit(1); }
if (!SLUG || !VISTA || !DESC) {
  console.error('uso: node gen-set.mjs <slug> <vista> "<descrição>" [formato]');
  process.exit(1);
}
// VARIAÇÃO: `var-<nome>`. Outro pedaço do MESMO lugar, na mesma vista lateral e com a MESMA linha
// de chão — é o que quebra a monotonia sem sair do estilo 2D da casa (a tentativa com perspectiva
// diagonal saiu fora do tom e foi removida).
const ehVariacao = VISTA.startsWith('var-');
const nomeVar = ehVariacao ? VISTA.slice(4) : null;
const v = ehVariacao
  ? { rotulo: `variação "${nomeVar}"`, derivada: true, panoramica: false }
  : VISTAS[VISTA];
if (!v) { console.error(`vista "${VISTA}" não existe (use ${Object.keys(VISTAS).join(' | ')} ou var-<nome>)`); process.exit(1); }

const OUTREL = ehVariacao ? arquivoVariacao(SLUG, nomeVar) : arquivoVista(SLUG, VISTA);
const outAbs = path.join(CONTEUDO, OUTREL);
await mkdir(path.dirname(outAbs), { recursive: true });

const panoramaAbs = path.join(CONTEUDO, arquivoVista(SLUG, VISTA_PADRAO));
if (v.derivada && !existsSync(panoramaAbs)) {
  console.error(`FAIL a vista "${VISTA}" é DERIVADA e precisa do panorama como referência, que não existe.`);
  console.error(`     -> node scripts/asset.mjs cenario ${SLUG} --desc="..."`);
  process.exit(1);
}

const FORMATO = FORMATO_ARG || (v.panoramica ? '3:2' : '3:4');
let prompt;
if (v.derivada) {
  // O PROMPT DA VISTA DERIVADA É OUTRO: não é "gere um lugar", é "gere ESTE lugar de outro ponto de
  // vista". Por isso o panorama entra como referência e o texto insiste em MESMO lugar, mesma
  // paleta, mesmos elementos — o que muda é de onde a câmera olha.
  const sp = await loadStylePrefix();
  // A REGRA DE OURO DAS DERIVADAS: mesma vista LATERAL (nada de perspectiva/diagonal, a casa é 2D
  // chapada) e a MESMA ALTURA da linha do chão e do horizonte. Com a linha do chão igual, dá pra
  // cortar de um fundo pro outro sem ninguém mudar de tamanho — que é o defeito que originou tudo.
  const MESMO_CHAO = 'CRITICAL: keep the SAME FLAT SIDE-ON 2D VIEW as the reference (no perspective, no '
    + 'diagonal ground, no vanishing lines). The HORIZON LINE and the GROUND LINE must be at EXACTLY '
    + 'the same height as in the reference image, and the grass in front must fill the bottom of the '
    + 'frame the same way, so a character standing here is the same size as in the reference.';
  const perspectiva = ehVariacao
    ? `Now draw ANOTHER PART of the SAME PLACE: same location, same style, same colours, but with DIFFERENT ELEMENTS in it. ${MESMO_CHAO}`
    : 'Now draw the SAME PLACE seen CLOSE UP, as the background behind a character in close-up: only a '
      + 'small part of the location fills the frame, elements are LARGE and simple with few details, no '
      + 'tiny far-away objects, and the bottom of the frame is open ground. Keep the same FLAT SIDE-ON '
      + '2D view, no perspective. It must still be recognisable as the same place.';
  prompt = `IMAGE OUT: ${OUTREL}
2 input images (HIGH fidelity): Image 1 = THE SAME LOCATION already drawn (the panorama of this set): keep the EXACT same colours, the same buildings, the same materials and the same style. Image 2 = the rabisco-riso STYLE reference.
Tall VERTICAL composition (${FORMATO}).

IMAGE PROMPT:
${sp}

${perspectiva}
${DESC}
NO people, NO characters, NO players anywhere in the image. Empty location only.`;
} else {
  prompt = await promptCenario(OUTREL, DESC, { formato: FORMATO, panoramico: !!v.panoramica, camada: null });
}

const referencias = v.derivada ? [panoramaAbs, ESTILO_PATH] : [ESTILO_PATH];
console.log(`>>> set ${SLUG} / ${VISTA} ${FORMATO}${v.derivada ? ' (derivada do panorama)' : ''} [${MODELOS[MODELO].nome}]`);
const t0 = Date.now();
await gerarImagem({ modelo: MODELO, cwd: CONTEUDO, prompt, referencias, outAbs, timeoutMs: 600000, formato: FORMATO });

// A VISTA NASCE NO ASPECTO CERTO. O gerador entrega 1024x1536 (2:3) mesmo pedindo 3:4, e o gate
// reprova cenário fora do aspecto do vídeo — com razão: esticado, a linha do chão sai do lugar e o
// personagem flutua. Reamostrar aqui é uma linha; deixar pro operador é um FAIL depois de 2 minutos
// de geração e um comando a mais pra lembrar.
if (!v.panoramica) {
  const sharp = (await import('sharp')).default;
  const ALVO = { '3:4': [1080, 1440], '9:16': [1080, 1920], '4:5': [1080, 1350], '1:1': [1080, 1080] }[FORMATO] || [1080, 1440];
  const m = await sharp(outAbs).metadata();
  if (m.width !== ALVO[0] || m.height !== ALVO[1]) {
    const buf = await sharp(outAbs).resize(ALVO[0], ALVO[1], { fit: 'cover', position: 'centre' }).png().toBuffer();
    await (await import('node:fs/promises')).writeFile(outAbs, buf);
    console.log(`   reamostrado ${m.width}x${m.height} -> ${ALVO[0]}x${ALVO[1]} (aspecto do vídeo)`);
  }
}
console.log(`OK set ${SLUG}/${VISTA}`, Math.round((Date.now() - t0) / 1000) + 's ->', OUTREL);
