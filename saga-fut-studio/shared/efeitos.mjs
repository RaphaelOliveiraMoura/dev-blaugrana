// efeitos.mjs — O CATÁLOGO DE DEFORMAÇÕES, em funções puras.
//
// Mora em shared/ porque tem DOIS consumidores: o `warp.mjs` (que deforma PNG com sharp, no Node,
// para as provas) e o motor de vídeo (que deforma no navegador, dentro do Remotion). A mesma conta
// nos dois lugares é o que garante que o efeito aprovado na prova é o efeito que sai no vídeo.
//
// Cada efeito devolve, para uma linha `u` (0 no topo do desenho, 1 nos pés) e um instante `t`
// (0..1): `dy`, de quanto MAIS ALTO ou MAIS BAIXO vem aquela linha (comprime/estica a região), e
// `dx`, quanto ela desliza pro lado. `i` é a intensidade, que permite entrar e sair do efeito sem
// corte visível.

export const EFEITOS = {
  // RISO: o peito comprime em pulsos rápidos e os ombros sacodem. O corpo inteiro sobe e desce um
  // pouco junto, senão a compressão parece um erro de escala em vez de uma gargalhada.
  riso: (u, t, i = 1) => {
    const pulso = Math.sin(t * Math.PI * 2 * 3);          // 3 risadas por ciclo
    const peito = Math.max(0, 1 - Math.abs(u - 0.42) / 0.3);
    return { dy: pulso * 7 * peito * i, dx: pulso * 3 * (1 - u) * i };
  },
  // RESPIRAR: lento, quase imperceptível. É o que impede o personagem de parecer um poster.
  respirar: (u, t, i = 1) => {
    const s = Math.sin(t * Math.PI * 2);
    const peito = Math.max(0, 1 - Math.abs(u - 0.38) / 0.35);
    return { dy: s * 3.5 * peito * i, dx: 0 };
  },
  // GELATINA: uma onda que percorre o corpo de baixo pra cima. Serve pra impacto e pra susto.
  gelatina: (u, t, i = 1) => ({ dy: 0, dx: Math.sin((u * 2.2 - t * 2) * Math.PI * 2) * 9 * (1 - u * 0.7) * i }),
  // TREMOR: medo, raiva contida, esforço. Alta frequência e amplitude pequena.
  tremor: (u, t, i = 1) => ({ dy: 0, dx: Math.sin(t * Math.PI * 2 * 14) * 3.5 * (1 - u) * i }),
  // BUFANDO: o peito infla e esvazia forte, como quem está sem ar depois de correr.
  bufando: (u, t, i = 1) => {
    const s = Math.sin(t * Math.PI * 2 * 1.6);
    const peito = Math.max(0, 1 - Math.abs(u - 0.36) / 0.28);
    return { dy: s * 9 * peito * i, dx: s * 2 * (1 - u) * i };
  },

  // ------------------------------------------------------------------ os exagerados
  // Os de cima são "vida de fundo": existem para o personagem não parecer pôster e não devem ser
  // notados. Os de baixo são ATUAÇÃO: entram num beat, são vistos, e saem. Misturar os dois níveis
  // é o erro clássico — respiração com amplitude de gargalhada vira um personagem com soluço.

  // GARGALHADA: o corpo inteiro sacode. O peito comprime FORTE, a cabeça joga pra trás e pra frente
  // e os ombros sobem. A frequência é irregular de propósito (duas ondas somadas): riso perfeitamente
  // periódico parece motor, não gargalhada.
  'riso-forte': (u, t, i = 1) => {
    const a = Math.sin(t * Math.PI * 2 * 4), b = Math.sin(t * Math.PI * 2 * 7 + 1.1);
    const p = a * 0.75 + b * 0.25;
    const peito = Math.max(0, 1 - Math.abs(u - 0.45) / 0.34);
    const cabeca = Math.max(0, 1 - u / 0.32);
    return { dy: p * 20 * peito * i + p * 10 * cabeca * i, dx: (p * 7 * cabeca + a * 4 * peito) * i };
  },
  // MEDO: alta frequência, o corpo ENCOLHE (os ombros sobem, a cabeça afunda) e treme. O
  // encolhimento é o que separa medo de raiva: as duas tremem, só uma se retrai.
  medo: (u, t, i = 1) => {
    const tr = Math.sin(t * Math.PI * 2 * 22) * 0.6 + Math.sin(t * Math.PI * 2 * 31 + 0.7) * 0.4;
    const alto = Math.max(0, 1 - u / 0.5);
    return { dy: -6 * alto * i, dx: tr * 7 * alto * i };
  },
  // RAIVA CONTIDA: o peito INFLA e vibra segurando. Diferente do medo, o corpo cresce em vez de
  // encolher, e a vibração é mais lenta e mais pesada.
  raiva: (u, t, i = 1) => {
    const vib = Math.sin(t * Math.PI * 2 * 12);
    const infla = (Math.sin(t * Math.PI * 2 * 1.2) + 1) / 2;
    const peito = Math.max(0, 1 - Math.abs(u - 0.4) / 0.3);
    return { dy: -infla * 12 * peito * i, dx: vib * 4 * (1 - u * 0.5) * i };
  },
  // ESPANTO: o corpo ESTICA pra cima de uma vez, como se levasse um choque, e volta. Use em beat
  // curto: esticado por muito tempo o personagem só fica alto.
  espanto: (u, t, i = 1) => {
    const s = Math.sin(Math.min(1, t * 2) * Math.PI);
    return { dy: s * 26 * (1 - u) * i, dx: 0 };
  },
  // DERRETENDO: as linhas de baixo escorrem e o corpo afunda. Derrota, vergonha, "o cara murchou".
  derretendo: (u, t, i = 1) => {
    const s = Math.min(1, t * 1.4);
    return { dy: -s * 30 * Math.pow(u, 2) * i, dx: Math.sin(u * 6) * s * 5 * i };
  },
  // CHICOTE: uma onda forte percorre o corpo de baixo pra cima. Impacto, empurrão, susto violento.
  chicote: (u, t, i = 1) => ({ dy: 0, dx: Math.sin((u * 1.6 - t * 2.2) * Math.PI * 2) * 22 * (1 - u * 0.8) * i }),
  // BALANÇO: o corpo inteiro pende de um lado pro outro, tipo bêbado ou tonto. Lento e amplo.
  balanco: (u, t, i = 1) => ({ dy: 0, dx: Math.sin(t * Math.PI * 2) * 18 * Math.pow(1 - u, 1.5) * i }),
};
export const EFEITOS_IDS = Object.keys(EFEITOS);

// Os que são atuação (entram num beat e saem) versus os que são vida de fundo (rodam sempre).
export const EFEITOS_FORTES = ['riso-forte', 'medo', 'raiva', 'espanto', 'derretendo', 'chicote', 'balanco'];

