// movimentos.mjs — A BIBLIOTECA DE MOVIMENTO EM DADOS.
//
// Cada movimento é uma lista de POSES-CHAVE com o instante de cada uma (0 a 1) e o motor interpola
// entre elas. Nada aqui é desenho: o mesmo arquivo serve o elenco INTEIRO, porque um ângulo de
// cotovelo vale para qualquer personagem que tenha cotovelo.
//
// Compare com o que vale hoje: `andar` do Raphinha é uma folha gerada só dele; para o Vini andar,
// gera-se outra. Aqui, andar é este objeto, e ponto.
//
// Ângulos em GRAUS, sentido horário, zero = peça pendurada para baixo (a convenção da folha).

const M = (t, angs) => ({ t, ...angs });

export const MOVIMENTOS = {
  // PARADO com respiração: o tronco sobe e desce alguns graus. Nas sprites isto exigia uma folha de
  // 4 desenhos por personagem (o "idle") e é o asset que mais existe no acervo.
  parado: {
    desc: 'em pé, respirando', loop: true, dur: 2.2,
    chaves: [
      M(0, { tronco: 0, cabeca: 0, 'braco-frente-sup': 4, 'braco-tras-sup': -4 }),
      M(0.5, { tronco: -1.5, cabeca: 1.5, 'braco-frente-sup': 7, 'braco-tras-sup': -7 }),
      M(1, { tronco: 0, cabeca: 0, 'braco-frente-sup': 4, 'braco-tras-sup': -4 }),
    ],
  },

  // ANDAR: duas passadas por ciclo. O braço acompanha a perna OPOSTA, que é a regra que faz um
  // caminhado parecer caminhado.
  andar: {
    desc: 'caminhada', loop: true, dur: 0.9, avanca: true,
    chaves: [
      M(0, { 'coxa-frente': 22, 'canela-frente': -8, 'coxa-tras': -20, 'canela-tras': 16, 'braco-frente-sup': -18, 'braco-frente-inf': -14, 'braco-tras-sup': 18, 'braco-tras-inf': -10, tronco: 1 }),
      M(0.25, { 'coxa-frente': 4, 'canela-frente': -2, 'coxa-tras': 4, 'canela-tras': 34, 'braco-frente-sup': 0, 'braco-frente-inf': -8, 'braco-tras-sup': 0, 'braco-tras-inf': -8, tronco: 0 }),
      M(0.5, { 'coxa-frente': -20, 'canela-frente': 16, 'coxa-tras': 22, 'canela-tras': -8, 'braco-frente-sup': 18, 'braco-frente-inf': -10, 'braco-tras-sup': -18, 'braco-tras-inf': -14, tronco: 1 }),
      M(0.75, { 'coxa-frente': 4, 'canela-frente': 34, 'coxa-tras': 4, 'canela-tras': -2, 'braco-frente-sup': 0, 'braco-frente-inf': -8, 'braco-tras-sup': 0, 'braco-tras-inf': -8, tronco: 0 }),
      M(1, { 'coxa-frente': 22, 'canela-frente': -8, 'coxa-tras': -20, 'canela-tras': 16, 'braco-frente-sup': -18, 'braco-frente-inf': -14, 'braco-tras-sup': 18, 'braco-tras-inf': -10, tronco: 1 }),
    ],
  },

  // CORRER: amplitude maior, tronco inclinado para a frente e joelho bem dobrado. O `voo` é o que
  // tira os dois pés do chão no meio da passada, e é ele que dá a sensação de velocidade.
  correr: {
    desc: 'corrida em passada larga', loop: true, dur: 0.52, avanca: true, voo: 0.06,
    chaves: [
      M(0, { tronco: -8, cabeca: 6, 'coxa-frente': 48, 'canela-frente': -34, 'coxa-tras': -38, 'canela-tras': 74, 'braco-frente-sup': -52, 'braco-frente-inf': -78, 'braco-tras-sup': 44, 'braco-tras-inf': -46 }),
      M(0.25, { tronco: -10, cabeca: 6, 'coxa-frente': 12, 'canela-frente': -6, 'coxa-tras': 6, 'canela-tras': 92, 'braco-frente-sup': -16, 'braco-frente-inf': -66, 'braco-tras-sup': 10, 'braco-tras-inf': -60 }),
      M(0.5, { tronco: -8, cabeca: 6, 'coxa-frente': -38, 'canela-frente': 74, 'coxa-tras': 48, 'canela-tras': -34, 'braco-frente-sup': 44, 'braco-frente-inf': -46, 'braco-tras-sup': -52, 'braco-tras-inf': -78 }),
      M(0.75, { tronco: -10, cabeca: 6, 'coxa-frente': 6, 'canela-frente': 92, 'coxa-tras': 12, 'canela-tras': -6, 'braco-frente-sup': 10, 'braco-frente-inf': -60, 'braco-tras-sup': -16, 'braco-tras-inf': -66 }),
      M(1, { tronco: -8, cabeca: 6, 'coxa-frente': 48, 'canela-frente': -34, 'coxa-tras': -38, 'canela-tras': 74, 'braco-frente-sup': -52, 'braco-frente-inf': -78, 'braco-tras-sup': 44, 'braco-tras-inf': -46 }),
    ],
  },

  // APONTAR com ANTECIPAÇÃO: recua antes de esticar e passa do ponto antes de assentar. São as três
  // coisas que substituição de desenho não alcança com 4 quadros, e são exatamente o que faz um
  // gesto ter graça. Note que existe pose DEPOIS do fim do movimento: ele fica apontando.
  apontar: {
    desc: 'aponta para a frente', loop: false, dur: 0.75,
    chaves: [
      M(0, { 'braco-frente-sup': 4, 'braco-frente-inf': 0, tronco: 0, cabeca: 0 }),
      M(0.3, { 'braco-frente-sup': 34, 'braco-frente-inf': -30, tronco: 4, cabeca: -3 }),   // recua
      M(0.62, { 'braco-frente-sup': -104, 'braco-frente-inf': 6, tronco: -6, cabeca: 4 }),  // passa do ponto
      M(0.8, { 'braco-frente-sup': -88, 'braco-frente-inf': -4, tronco: -3, cabeca: 2 }),   // assenta
      M(1, { 'braco-frente-sup': -92, 'braco-frente-inf': 0, tronco: -4, cabeca: 3 }),
    ],
  },

  // ASSUSTAR: o corpo inteiro recua. Reação é o gesto de que o SagaFut mais precisa e o que menos
  // existe no acervo, porque é o que ninguém gera "por precaução".
  assustar: {
    desc: 'leva um susto e recua', loop: false, dur: 0.6,
    chaves: [
      M(0, { tronco: 0, cabeca: 0, 'braco-frente-sup': 4, 'braco-tras-sup': -4 }),
      M(0.18, { tronco: -4, cabeca: -6, 'braco-frente-sup': -10, 'braco-tras-sup': 8 }),
      M(0.42, { tronco: 16, cabeca: 14, 'braco-frente-sup': -128, 'braco-frente-inf': -54, 'braco-tras-sup': 118, 'braco-tras-inf': -50, 'coxa-frente': -14, 'canela-frente': 20 }),
      M(0.75, { tronco: 11, cabeca: 9, 'braco-frente-sup': -112, 'braco-frente-inf': -48, 'braco-tras-sup': 104, 'braco-tras-inf': -44, 'coxa-frente': -10, 'canela-frente': 14 }),
      M(1, { tronco: 12, cabeca: 10, 'braco-frente-sup': -116, 'braco-frente-inf': -50, 'braco-tras-sup': 108, 'braco-tras-inf': -46, 'coxa-frente': -11, 'canela-frente': 16 }),
    ],
  },

  comemorar: {
    desc: 'comemora de braços pra cima', loop: false, dur: 0.8,
    chaves: [
      M(0, { tronco: 0, cabeca: 0 }),
      M(0.22, { tronco: 8, cabeca: 6, 'braco-frente-sup': 26, 'braco-tras-sup': -26, 'coxa-frente': -12, 'canela-frente': 24 }),
      M(0.5, { tronco: -6, cabeca: -12, 'braco-frente-sup': -168, 'braco-frente-inf': -14, 'braco-tras-sup': 168, 'braco-tras-inf': 14 }),
      M(0.72, { tronco: -3, cabeca: -8, 'braco-frente-sup': -156, 'braco-frente-inf': -8, 'braco-tras-sup': 156, 'braco-tras-inf': 8 }),
      M(1, { tronco: -4, cabeca: -10, 'braco-frente-sup': -162, 'braco-frente-inf': -10, 'braco-tras-sup': 162, 'braco-tras-inf': 10 }),
    ],
  },
};

export const MOVIMENTOS_IDS = Object.keys(MOVIMENTOS);

// Interpolação entre as chaves. `ease` suaviza a entrada e a saída de cada trecho: sem isso o
// movimento tem velocidade constante e é justamente o que faz animação parecer robô.
const easeInOut = (u) => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);

export function poseEm(mov, t, { ease = true } = {}) {
  const ch = mov.chaves;
  const u = mov.loop ? ((t % 1) + 1) % 1 : Math.max(0, Math.min(1, t));
  let i = 0;
  while (i < ch.length - 2 && ch[i + 1].t <= u) i++;
  const a = ch[i], b = ch[i + 1] || ch[i];
  const span = (b.t - a.t) || 1;
  const f = ease ? easeInOut(Math.max(0, Math.min(1, (u - a.t) / span))) : (u - a.t) / span;
  const pose = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (k === 't') continue;
    const va = a[k] ?? 0, vb = b[k] ?? 0;
    pose[k] = va + (vb - va) * f;
  }
  return pose;
}
