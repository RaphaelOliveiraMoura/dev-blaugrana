// slice-walk.mjs <slug> — fatia a folha 2x2 de caminhada em personagens/<slug>/rigs/andar/_sheet.png
// e normaliza o ciclo inteiro -> w1..w4.png. A matemática mora em fatiar-ciclo.mjs, junto com a
// do slice-run (ver lá por que não dá pra usar o placeOnCanvas num ciclo).
import { CONTEUDO } from './config.mjs';
import { fatiarCiclo } from './fatiar-ciclo.mjs';
import { cartaoAndar } from './sprite-card.mjs';
import { validarCiclo, resumoDeCiclo } from './ciclo.mjs';
import { registrarGate, quadrosDe } from './registro-gate.mjs';
import { dirRig } from '../../shared/personagem.mjs';

const SLUG = process.argv[2];
if (!SLUG) { console.error('uso: node slice-walk.mjs <slug>'); process.exit(1); }
// FOLHA ÚNICA, sempre pra direita: a variante -esq deixou de existir (ver personagem.mjs)
const PREF = 'w';
const BASE = `${CONTEUDO}/${dirRig(SLUG, 'andar')}`;
const { saidas } = await fatiarCiclo({ slug: SLUG, base: BASE, pref: PREF });
for (const q of saidas) console.log(SLUG, q.nome, `${q.w}x${q.h}`);

// o cartão não pode DERRUBAR o fatiamento, mas falhar CALADO foi o que o escondeu por meses
const card = await cartaoAndar(SLUG).catch((e) => { console.warn(`aviso: cartão de andar falhou (${e.message})`); return null; });
console.log('OK', SLUG, card ? '· cartão: personagens/' + SLUG + '/rigs/andar/_card.png (CONFIRA orientação)' : '');

// GATE DA PASSADA. Os quadros ficam gravados (o cartão acima é o que se olha pra entender o que
// saiu), mas o comando REPROVA: folha em que dois desenhos do ciclo são o mesmo não é caminhada, é o
// personagem tremendo enquanto desliza, e passava batido por todo o resto do pipeline.
const cic = await validarCiclo(SLUG, 'andar');
if (cic.nivel !== 'ok') console.log(`${cic.nivel === 'fail' ? 'FAIL' : 'aviso'} passada: ${cic.msg}`);
// REGISTRA ANTES DE SAIR: quem reprova regera por cima (o lote refaz sozinho), então esta é a
// última janela em que a folha reprovada ainda existe no disco. Ver registro-gate.mjs.
if (cic.nivel !== 'ok') await registrarGate({
  slug: SLUG, tipo: 'andar', gate: cic.gate, nivel: cic.nivel, msg: cic.msg,
  metricas: resumoDeCiclo(cic), folha: `${BASE}/_sheet.png`, card: `${BASE}/_card.png`,
  quadros: quadrosDe(BASE, 'andar'),
});
if (cic.nivel === 'fail') {
  console.error(`     -> confira ${dirRig(SLUG, 'andar')}/_card.png e gere de novo: node scripts/asset.mjs andar ${SLUG}`);
  process.exit(1);
}
