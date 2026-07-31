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
//
// `tempos` = FOLHA DE EXPOSIÇÃO: quantos frames de TELA cada desenho segura. Sem ela, todo desenho
// fica o mesmo tempo no ar, e é isso que faz um salto ou um empurrão lerem como flipbook mecânico:
// animação 2D cronometra devagar-rápido-devagar (a antecipação SEGURA, o meio passa voando, o ápice
// FLUTUA). Gesto sem `tempos` continua uniforme, que é o certo pra respiração e ciclo de espera.
//
// `chao` = em quais desenhos o pé está no chão. Delimita a janela de VOO, e é dela que o composer
// tira o arco do pulo por código — por isso o personagem aterrissa no frame em que o DESENHO
// aterrissa, em vez de continuar subindo enquanto a arte já bateu no chão.
//
// `loop` = o gesto REPETE enquanto o beat durar (respiração, espera, comemoração) ou acontece UMA
// VEZ e para (empurrão, tombo, susto). O default é UMA VEZ, de propósito: um gesto de uma vez que
// repete lê como defeito (o empurrão do adversário reiniciando sozinho, o susto piscando em loop),
// enquanto um gesto de loop que para é só uma cena mais parada. `fim` diz o que fica na tela depois:
// 'segura' (default) congela no ÚLTIMO desenho — que nos gestos do catálogo é justamente a pose de
// repouso/consequência (ele em pé de novo, ele sentado zonzo) — e 'volta' retorna ao primeiro.
//
// `contato` = em quais desenhos alguma coisa BATE (tremor de câmera + squash). Existe porque o
// impacto estava amarrado só ao PULO: um empurrão ou um tombo tinham o momento de contato desenhado
// e o mundo não tomava conhecimento. `contatoPe` é o subconjunto em que a batida é NO CHÃO, que é o
// único caso que levanta poeira — poeira nos pés num empurrão (que acontece na altura das mãos)
// leria como erro. A aterrissagem de um pulo já entra como contato de pé automaticamente, pela
// janela de voo; não se declara.

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
    // agacha SEGURA (antecipação), sobe rápido, FLUTUA no ápice, cai rápido, aterrissagem SEGURA
    tempos9: [4, 5, 2, 2, 6, 2, 4, 3, 5],
    chao9: [true, true, true, false, false, false, true, true, true],
    loop: true,   // repete enquanto o beat durar
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
    tempos4: [3, 2, 5, 3],   // a gargalhada SEGURA no ponto mais jogado pra trás
    loop: true,   // repete enquanto o beat durar
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
    loop: true,
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
    tempos4: [4, 1, 6, 6],   // o braço SNAPA pra frente (1 frame) e o dedo fica apontado
    // uma vez só: o dedo fica apontado (segura no último desenho)
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
    tempos4: [5, 1, 7, 4],   // susto = recuo instantâneo e CONGELA no ponto de maior recuo
    contato4: [2],           // o baque do susto é o recuo máximo
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
    loop: true,
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
    loop: true,
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
    loop: true,
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
    tempos9: [4, 4, 5, 2, 1, 5, 2, 3, 4],   // recua e SEGURA, dispara em 3 frames, CONTATO segura
    contato9: [5],                          // o empurrão bate na altura das mãos: sem poeira
  },
  chutar: {
    desc: 'booting someone far away with one huge forward kick, stern unbothered face, arms out for balance',
    muda: 'how far the KICKING LEG swings forward',
    fases9: [
      'standing still, arms at the sides, stern face',
      'ANTICIPATION: weight shifting onto the back foot, the kicking leg drawing back behind the body',
      'the kicking leg fully cocked back, body leaning back, both arms out for balance',
      'the leg starting to swing forward, hips turning, knee leading',
      'the leg half way through the swing, knee high',
      'CONTACT: the kicking leg fully extended forward at hip height, foot at the very end of the kick, body leaning back',
      'follow-through: the leg still up and forward, body twisted, arms out',
      'the leg coming back down, foot returning towards the ground',
      'standing again, arms at the sides, the same stern face',
    ],
    // recua e SEGURA, dispara em 3 frames, CONTATO segura (é o frame que o público lê)
    tempos9: [3, 4, 5, 2, 1, 5, 3, 3, 4],
    contato9: [5],   // o chute bate na altura do quadril: tremor e squash, sem poeira nos pés
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
    // a queda ACELERA (5,3,2,1,1) e o impacto SEGURA; sem `chao9` de propósito: cair não é pulo,
    // a altura toda está no desenho e código nenhum deve levantar o personagem aqui.
    // `horizontal`: o corpo SAI da vertical. A régua da cabeça mede a faixa 6-24% a partir do TOPO
    // do desenho, o que só é a cabeça enquanto o personagem está em pé — num corpo deitado ela mede
    // um braço levantado ou as pernas pro alto e acusa 50% de variação num tombo perfeito. Aqui o
    // veredito é o olho no preview; nenhum número disponível é honesto.
    tempos9: [5, 3, 2, 1, 1, 5, 4, 4, 6],
    contato9: [5], contatoPe9: [5],   // as costas batem NO CHÃO: tremor + poeira
    horizontal: true,
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
    tempos9: [2, 2, 2, 3, 4, 3, 3, 4, 6],   // corrida rápida, freada SEGURA, recuperação lenta
    contato9: [3], contatoPe9: [3],         // o pé crava pra frear: tremor + poeira
  },
};

export const GESTOS_VALIDOS = Object.keys(GESTOS);

// Devolve { desc, fases, muda, tempos?, chao? } prontos pra classe pedida, ou lança com mensagem
// acionável. `tempos`/`chao` só vêm se o gesto declarou a folha de exposição pra essa classe;
// ausentes, quem consome cai na exposição uniforme (o comportamento de sempre).
export function gestoPara(nome, classe) {
  const g = GESTOS[nome];
  if (!g) throw new Error(`gesto "${nome}" não está no vocabulário (${GESTOS_VALIDOS.join(', ')}). Use um destes ou escreva as fases à mão no manifesto.`);
  const porClasse = { secundaria: 'fases4', primaria: 'fases9', complexa: 'fases16' };
  const campo = porClasse[classe];
  if (!campo) throw new Error(`classe "${classe}" desconhecida`);
  const sufixo = campo.replace('fases', '');
  const fases = g[campo];
  if (!fases) {
    const tem = Object.keys(g).filter((k) => k.startsWith('fases')).join('/');
    throw new Error(`gesto "${nome}" não tem ${campo} (tem ${tem}): peça noutra classe ou escreva as ${classe === 'primaria' ? 9 : 16} fases no manifesto. Esticar 4 quadros pra preencher 9 células é o que faz a folha sair pulsando.`);
  }
  const tempos = g[`tempos${sufixo}`], chao = g[`chao${sufixo}`], horizontal = g.horizontal === true;
  const contato = g[`contato${sufixo}`], contatoPe = g[`contatoPe${sufixo}`];
  if (tempos && tempos.length !== fases.length) throw new Error(`gesto "${nome}": tempos${sufixo} tem ${tempos.length} entradas pra ${fases.length} desenhos.`);
  if (chao && chao.length !== fases.length) throw new Error(`gesto "${nome}": chao${sufixo} tem ${chao.length} entradas pra ${fases.length} desenhos.`);
  for (const [campo, arr] of [[`contato${sufixo}`, contato], [`contatoPe${sufixo}`, contatoPe]]) {
    for (const i of (arr || [])) if (!Number.isInteger(i) || i < 0 || i >= fases.length) throw new Error(`gesto "${nome}": ${campo} aponta pro desenho ${i}, fora de 0..${fases.length - 1}.`);
  }
  for (const i of (contatoPe || [])) if (!(contato || []).includes(i)) throw new Error(`gesto "${nome}": contatoPe${sufixo} tem o desenho ${i} que não está em contato${sufixo} (contato de pé é um SUBCONJUNTO dos contatos).`);
  const loop = g.loop === true;                       // default: UMA VEZ (ver cabeçalho)
  const fim = g.fim || 'segura';                      // o que fica na tela depois de terminar
  if (!['segura', 'volta'].includes(fim)) throw new Error(`gesto "${nome}": fim "${fim}" desconhecido (use "segura" ou "volta").`);
  if (loop && g.fim) throw new Error(`gesto "${nome}": declarou loop E fim — um gesto que repete nunca termina, então "fim" não significa nada aqui.`);
  return { desc: g.desc, fases, muda: g.muda, tempos, chao, contato, contatoPe, horizontal, loop, fim };
}
