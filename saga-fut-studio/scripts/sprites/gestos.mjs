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
    // SEM PULO (decisão de 02/08/2026). A versão anterior era um salto completo — agachada de
    // antecipação, decolagem, ápice no ar, aterrissagem — e o pulo rouba a cena: o corpo inteiro
    // sobe e desce, e o beat de comemoração vira acrobacia. Comemoração da casa é do TRONCO PRA
    // CIMA, com os pés plantados; o que anima é o braço, o peito e a boca.
    desc: 'celebrating with both feet planted on the ground: both arms punching up in the air, chest puffed, big open happy shout',
    // O `muda` é a lista do que PODE mudar, e tudo que não está aqui o modelo trava. Por isso ele
    // diz braços/peito/boca e nada mais: pedir "sem pular" no `desc` não bastou — o corpo continuava
    // subindo alguns pixels a cada célula, e no vídeo isso lê como um pulinho involuntário.
    muda: 'ONLY the arms, the chest and the mouth. The TOP OF THE HEAD stays at exactly the same height in all cells, the whole body stays at the same vertical position, and the feet never leave the ground: nothing rises, nothing crouches, nothing bounces',
    fases4: [
      'both arms raised beside the head, feet flat on the ground, mouth opening',
      'both arms fully extended straight up, chest puffed, big open shout, feet flat on the ground',
      'both arms up and spread slightly apart, still shouting, feet flat on the ground',
      'both arms coming back down beside the head, happy smile, feet flat on the ground',
    ],
    fases9: [
      'standing still, arms relaxed down at the sides, mouth closed, feet flat on the ground',
      'arms starting to lift away from the sides, chest beginning to fill, mouth opening slightly',
      'arms at chest height with fists closed, chest fuller, mouth open in a shout',
      'arms rising past the shoulders, head tilting back a little, big open shout',
      'PEAK: both arms fully extended straight up, chest at its fullest, biggest open shout — feet flat on the ground and the head at the SAME height as cell 1',
      'holding the peak, arms still up and spread slightly apart, still shouting',
      'arms starting to come down past the head, shout softening into a wide smile',
      'arms down at chest height, happy smile, chest relaxing',
      'standing still again, arms relaxed down at the sides, happy smile',
    ],
    // sobe segurando, SEGURA MUITO no ápice (é onde a comemoração lê) e desce mais rápido
    tempos9: [4, 3, 3, 3, 8, 5, 3, 3, 5],
    // SEM `chao`: este campo existe pra DELIMITAR a janela de voo, e aqui não há voo nenhum. Declarar
    // tudo `true` seria dizer "tem voo, mas de duração zero", que é contraditório — e é o que o
    // cadeia.test reprova. Sem o campo, o slice-acao crava os pés no chão, que é exatamente o que
    // esta comemoração pede.
    loop: true,   // repete enquanto o beat durar
  },
  // ABRAÇAR e DANÇAR entraram para a escalada do ditador-copia (correr -> abraçar -> dançar): a
  // gag de repetição precisa que cada volta seja MAIS ABSURDA que a anterior, e para isso os gestos
  // têm que existir no catálogo, com cronometragem, em vez de serem escritos à mão em cada vídeo.
  //
  // O ABRAÇO é de UM personagem, não de dois: ele abre os braços e fecha em volta de alguém que a
  // cena posiciona ao lado (`junto`/`sobrepor`). Folha com duas pessoas abraçadas seria uma sprite
  // que só serve para aquele par, e o acervo é de personagens, não de duplas.
  abracar: {
    desc: 'opening both arms wide and closing them into a big hug around someone standing right next to him',
    muda: 'how far the ARMS are open and the tilt of the upper body',
    fases4: [
      'arms relaxed at the sides, starting to turn towards the side',
      'both arms opening WIDE apart at chest height, chest forward, welcoming face',
      'both arms closing in, hands almost meeting, body leaning into the hug',
      'both arms wrapped around, closed in front of the chest, eyes shut, big warm smile',
    ],
    tempos4: [3, 5, 3, 8],
    loop: false,   // fecha o abraço e SEGURA fechado
    fim: 'segura',
  },
  dancar: {
    desc: 'dancing on the spot: hips swinging side to side, both arms bent and swinging with the beat',
    muda: 'which side the HIPS and the ARMS swing to, and a small bounce',
    fases4: [
      'weight on the LEFT foot, hips pushed left, both arms bent and swung to the left, happy face',
      'passing through the middle, body upright, arms crossing in front of the chest, small bounce up',
      'weight on the RIGHT foot, hips pushed right, both arms bent and swung to the right, happy face',
      'passing back through the middle, body upright, arms crossing in front of the chest, small bounce up',
    ],
    tempos4: [5, 3, 5, 3],
    loop: true,    // dança enquanto o beat durar
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
  // Defesa de goleiro: voo curto pra um lado, luva engole a bola, aterrissa. O impassível segura
  // no último desenho — a graça do Vozinha é NÃO comemorar.
  defender: {
    desc: 'goalkeeper diving to one side to catch the ball, calm unbothered veteran face, gloves ready',
    muda: 'how far the BODY dives sideways and how high the GLOVED HANDS reach',
    fases4: [
      'standing set in goal, knees bent, gloves up at chest height, calm face',
      'ANTICIPATION: weight shifting, body coiling to dive sideways, gloves rising',
      'CONTACT: body fully stretched sideways in the dive, gloves at full extension catching the ball',
      'landing on the side, ball secure in the gloves, same calm face, no celebration',
    ],
    tempos4: [4, 3, 6, 6],
    contato4: [2],
    // corpo SAI da vertical no mergulho: a régua da cabeça mede o topo da célula, não a cabeça
    horizontal: true,
    // uma vez só: ele segura a bola no último desenho
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
