// gestos.mjs — VOCABULÁRIO CANÔNICO DE GESTOS.
//
// POR QUE EXISTE: até aqui, quem pedia uma folha escrevia as fases na hora. O resultado dependia
// de quem estava redigindo naquele momento, e uma folha de comemoração escrita às pressas saiu com
// a cabeça variando 19% entre quadros (na tela: o personagem pulsando de tamanho). Aqui cada gesto
// tem descrição, fases e `muda` JÁ TESTADOS. Pedir um gesto vira escolher do catálogo; redigir
// fases novas passa a ser a exceção, não a regra.
//
// `fases4` = classe secundária (2x2). `fases9` = classe primária (3x3), com antecipação e
// aterrissagem, que é justamente o que não cabe em 4 quadros. Gesto sem `fases9` não pode ser
// pedido como primária: o validador manda escrever as 9 ou usar 2x2, em vez de esticar 4 quadros.
//
// `muda` é o campo mais importante: a frase que diz a ÚNICA coisa que se move entre as células.

export const GESTOS = {
  // ---------------------------------------------------------------- reação / emoção
  comemorar: {
    desc: 'celebrating: both arms punching up in the air, big open happy shout, bouncing on the spot',
    muda: 'the height of the ARMS and a small bounce of the body',
    fases4: [
      'both arms raised beside the head, feet flat on the ground',
      'both arms fully extended straight up, body lifted a little on the toes',
      'both arms up and spread slightly apart, still on the toes',
      'both arms coming back down beside the head, feet flat again',
    ],
    fases9: [
      'standing still, arms relaxed down at the sides, mouth closed',
      'ANTICIPATION: knees bent, body crouching down, arms swinging back behind the hips',
      'pushing off the ground, body rising, arms swinging forward and up, mouth opening',
      'feet just off the ground, arms half raised, big open shout',
      'TOP OF THE JUMP: feet clearly off the ground, both arms fully extended straight up, biggest shout',
      'starting to fall, arms still up but slightly apart',
      'LANDING: feet back on the ground, knees deeply bent absorbing the impact, arms coming down',
      'straightening back up, knees almost straight, arms down at chest height',
      'standing still again, arms relaxed down at the sides, happy smile',
    ],
  },
  rir: {
    desc: 'laughing hard at something: head tipped back, wide open laughing mouth, one hand on the belly',
    muda: 'how far the HEAD tips back and the shoulders bouncing with the laugh',
    fases4: [
      'head upright, mouth open starting to laugh, one hand rising to the belly',
      'head tipped back a little, mouth wide open, shoulders lifted',
      'head tipped back further, eyes squeezed shut laughing, hand pressed on the belly',
      'head coming back down, mouth still open, shoulders dropping',
    ],
  },
  negar: {
    desc: 'refusing: one hand raised at chest height with the INDEX FINGER up, wagging a clear NO, smug face',
    muda: 'the tilt of the raised INDEX FINGER',
    fases4: [
      'the raised hand at chest height, index finger straight up, smug face',
      'the same hand, index finger tilted to the left',
      'the same hand, index finger straight up again',
      'the same hand, index finger tilted to the right',
    ],
  },
  apontar: {
    desc: 'pointing at someone off to the side, stern accusing face, the other hand on the hip',
    muda: 'how far the pointing ARM extends',
    fases4: [
      'the pointing arm still at the side, stern face, other hand on the hip',
      'the pointing arm half raised, index finger extended',
      'the pointing arm fully extended, index finger straight at the target',
      'the pointing arm held fully extended, chin slightly up',
    ],
  },
  assustar: {
    desc: 'startled: eyes wide, mouth open, body recoiling backwards, both hands up in front of the chest',
    muda: 'how far the BODY recoils and how high the hands come up',
    fases4: [
      'neutral standing, eyes starting to widen',
      'body leaning back a little, hands rising to chest height, mouth opening',
      'body leaning back at its furthest, eyes wide open, both hands up, mouth wide',
      'body settling back, hands still up, still scared',
    ],
  },
  triste: {
    desc: 'dejected: shoulders dropped, head hanging down, arms limp at the sides',
    muda: 'how far the HEAD and the SHOULDERS drop',
    fases4: [
      'head still up, shoulders starting to drop, sad mouth',
      'head tilting down, shoulders lower',
      'head hanging down, shoulders at their lowest',
      'head lifting a fraction, a long sigh, shoulders still low',
    ],
  },

  // ---------------------------------------------------------------- postura / espera
  sentido: {
    desc: 'standing rigidly to attention like a soldier on parade: back straight, chin up, arms pressed flat against the sides, heels together',
    muda: 'the chest and the shoulders while breathing, plus one blink',
    fases4: [
      'chest neutral, eyes forward',
      'chest puffed up breathing in, shoulders a little higher',
      'chest neutral again, eyes closed in a quick blink',
      'chest slightly sunken breathing out, shoulders a little lower',
    ],
  },
  esperar: {
    desc: 'waiting, bored: weight on one leg, arms crossed over the chest, looking off to the side',
    muda: 'the shoulders breathing and one blink',
    fases4: [
      'arms crossed, eyes open looking to the side',
      'shoulders lifting slightly with a breath in',
      'eyes closed in a slow blink, shoulders at the top',
      'shoulders dropping with a breath out, eyes open again',
    ],
  },

  // ---------------------------------------------------------------- ação física
  empurrar: {
    desc: 'shoving someone off to the side with both hands, leaning into it, angry face',
    muda: 'how far the ARMS extend forward and the body leaning',
    fases4: [
      'both hands up at chest height, body leaning back a little, angry face',
      'arms starting to push forward, weight shifting onto the front foot',
      'arms fully extended in the shove, body leaning forward at its furthest',
      'arms coming back a little, body still leaning forward',
    ],
    fases9: [
      'standing, arms at the sides, angry face',
      'ANTICIPATION: body leaning back, both hands rising to chest height',
      'body coiled back at its furthest, hands ready',
      'weight shifting forward, arms starting to extend',
      'arms half extended, body leaning in',
      'CONTACT: arms fully extended in the shove, body at its furthest forward',
      'follow-through: arms still out, body slightly past balance',
      'recovering balance, arms coming back in',
      'standing again, arms at the sides, still angry',
    ],
  },
  cair: {
    desc: 'losing balance and falling backwards onto the ground',
    muda: 'the angle of the BODY as it falls',
    fases9: [
      'standing normally, arms at the sides',
      'ANTICIPATION: one foot slipping forward, arms starting to fly up',
      'body tilting backwards, arms up for balance, eyes wide',
      'body at 45 degrees backwards, arms flailing',
      'body almost horizontal, about to hit the ground',
      'IMPACT: back on the ground, legs up in the air, arms spread',
      'legs dropping, body settled on the ground, dazed face',
      'starting to sit up, one hand on the ground',
      'sitting on the ground, rubbing the head, dizzy face',
    ],
  },
  correr_parar: {
    desc: 'running in and skidding to a stop',
    muda: 'the LEGS and how far the body leans',
    fases9: [
      'running: left leg forward, right leg back, arms pumping',
      'running: legs passing close together, body at its highest',
      'running: right leg forward, left leg back, arms pumping',
      'starting to brake: front foot planted forward, body leaning BACK',
      'skidding: both feet forward, body leaning back hard, arms out for balance',
      'skid slowing, body still leaning back, knees bent',
      'body coming upright, feet settling under the hips',
      'standing, chest heaving, arms starting to drop',
      'standing still, hands on the knees, catching breath',
    ],
  },
};

export const GESTOS_VALIDOS = Object.keys(GESTOS);

// Devolve { desc, fases, muda } prontos pra classe pedida, ou lança com mensagem acionável.
export function gestoPara(nome, classe) {
  const g = GESTOS[nome];
  if (!g) throw new Error(`gesto "${nome}" não está no vocabulário (${GESTOS_VALIDOS.join(', ')}). Use um destes ou escreva as fases à mão no manifesto.`);
  const porClasse = { secundaria: 'fases4', primaria: 'fases9', complexa: 'fases16' };
  const campo = porClasse[classe];
  if (!campo) throw new Error(`classe "${classe}" desconhecida`);
  const fases = g[campo];
  if (!fases) {
    const tem = Object.keys(g).filter((k) => k.startsWith('fases')).join('/');
    throw new Error(`gesto "${nome}" não tem ${campo} (tem ${tem}): peça noutra classe ou escreva as ${classe === 'primaria' ? 9 : 16} fases no manifesto. Esticar 4 quadros pra preencher 9 células é o que faz a folha sair pulsando.`);
  }
  return { desc: g.desc, fases, muda: g.muda };
}
