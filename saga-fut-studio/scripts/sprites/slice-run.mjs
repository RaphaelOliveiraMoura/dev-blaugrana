// slice-run.mjs <slug> — fatia a folha 2x2 de corrida em personagens/<slug>/rigs/correr/_sheet.png
// e normaliza o ciclo inteiro -> r1..r4.png. A matemática mora em fatiar-ciclo.mjs, junto com a
// do slice-walk: os dois faziam o mesmo, e defeito consertado num não chegava no outro.
import { CONTEUDO } from './config.mjs';
import { fatiarCiclo } from './fatiar-ciclo.mjs';
import { cartaoCorrer } from './sprite-card.mjs';
import { validarCiclo, resumoDeCiclo } from './ciclo.mjs';
import { registrarGate, quadrosDe } from './registro-gate.mjs';
import { dirRig } from '../../shared/personagem.mjs';

const SLUG = process.argv[2];
if (!SLUG) { console.error('uso: node slice-run.mjs <slug>'); process.exit(1); }
// FOLHA ÚNICA, sempre pra direita: a variante -esq deixou de existir (ver personagem.mjs)
const PREF = 'r';
const BASE = `${CONTEUDO}/${dirRig(SLUG, 'correr')}`;
const { saidas } = await fatiarCiclo({ slug: SLUG, base: BASE, pref: PREF });
for (const q of saidas) console.log(SLUG, q.nome, `${q.w}x${q.h}`);

// o cartão não pode DERRUBAR o fatiamento, mas falhar CALADO foi o que o escondeu por meses
const card = await cartaoCorrer(SLUG).catch((e) => { console.warn(`aviso: cartão de correr falhou (${e.message})`); return null; });
console.log('OK', SLUG, card ? '· cartão: personagens/' + SLUG + '/rigs/correr/_card.png (CONFIRA orientação)' : '');

// GATE DA PASSADA (igual ao slice-walk, ver ciclo.mjs): ciclo em que dois desenhos são o mesmo não
// é corrida, e nenhuma outra régua daqui olhava ENTRE quadros.
const cic = await validarCiclo(SLUG, 'correr');
if (cic.nivel !== 'ok') console.log(`${cic.nivel === 'fail' ? 'FAIL' : 'aviso'} passada: ${cic.msg}`);
// mesma janela do slice-walk: a folha reprovada some no próximo `asset correr`
if (cic.nivel !== 'ok') await registrarGate({
  slug: SLUG, tipo: 'correr', gate: cic.gate, nivel: cic.nivel, msg: cic.msg,
  metricas: resumoDeCiclo(cic), folha: `${BASE}/_sheet.png`, card: `${BASE}/_card.png`, quadros: quadrosDe(BASE, 'correr'),
});
if (cic.nivel === 'fail') {
  console.error(`     -> confira ${dirRig(SLUG, 'correr')}/_card.png e gere de novo: node scripts/asset.mjs correr ${SLUG}`);
  process.exit(1);
}
