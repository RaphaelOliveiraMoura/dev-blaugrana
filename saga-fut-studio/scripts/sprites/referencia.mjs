// referencia.mjs — A FOLHA QUE ENSINA COMO SE ANIMA.
//
// POR QUE EXISTE: passei um dia inteiro construindo gates de silhueta, e eles pegam muito bem os
// defeitos GROSSEIROS (quadro morto, quadro virado, escala mudando, corpo escorregando) e mal os
// defeitos de QUALIDADE DE ANIMAÇÃO. O caso que fechou o assunto: "a perna de trás está estática e
// a da frente só muda a dobra do joelho". Isso é uma afirmação sobre a IDENTIDADE de cada perna ao
// longo do tempo, e a silhueta binária não permite medir — as duas pernas se sobrepõem e têm a
// mesma cor, então não há como rastrear qual é qual.
//
// A saída não é mais uma régua: é PARAR DE DESCREVER a animação em inglês e MOSTRAR uma que presta.
// O gerador obedece muito melhor a "copie estas poses" do que a qualquer quantidade de adjetivo —
// o mesmo motivo pelo qual a folha `-esq` sempre saía errada por texto e o espelho por código sempre
// saía certo.
//
// MEDIDO: a folha de corrida do cucurela-riso, gerada com esta referência, saltou de 40% pra 52% de
// amplitude de passada (o padrão-ouro dá 50%), a abertura foi de 1.13 pra 1.75 e a deriva caiu de
// 16% pra 12%, passando no gate que a reprovava. Com a mesma descrição de prompt.
//
// A referência é a MELHOR folha do acervo pra cada tipo, escolhida a olho e registrada aqui. Trocar
// é trocar o padrão de qualidade de tudo que for gerado depois, então mude com o cartão na tela.
// O PERSONAGEM-PADRÃO é o `torcedor-cule`: o mais usado do acervo (16 aparições) e o primeiro a ter
// o kit inteiro feito de propósito pra servir de referência — idle, andar, correr e o catálogo de
// gestos, todos gerados com as correções acumuladas em 02/08/2026 e conferidos no cartão.
//
// Por que UM personagem e não a melhor folha de cada um: consistência. Quando a referência vem toda
// do mesmo sujeito, o que atravessa pras outras gerações é um jeito de animar coerente, não uma
// colcha de retalhos de quatro artistas diferentes.
export const PERSONAGEM_PADRAO = 'torcedor-cule';

// `alternativa` é quem serve de referência QUANDO O ALVO É O PRÓPRIO PADRÃO: copiar a si mesmo não
// ensina nada, então regerar o torcedor-cule precisa de outra folha boa pra mirar. É também onde
// fica registrado de quem cada folha do padrão herdou a encenação.
export const REFERENCIA_DE_POSE = {
  correr: {
    slug: PERSONAGEM_PADRAO,
    alternativa: 'cucurela-riso',
    // `ajusteDaReferencia` = o que CORRIGIR em relação à referência. A corrida do cucurela-riso tem
    // o ciclo certo (contato, passagem, contato oposto) mas erra o quarto quadro: sai aberto como um
    // contato, quando deveria ser a segunda passagem. Sem este campo a escolha seria entre copiar uma
    // referência com defeito conhecido ou não usar referência nenhuma — e a segunda já provou ser
    // pior. Referência não precisa ser perfeita; precisa ser boa E ter o erro declarado.
    ajusteDaReferencia: "ONE CORRECTION to the reference: in its FOURTH cell the legs are spread wide open like a contact pose, which is wrong. Your fourth cell must instead look like the reference's SECOND cell — a PASSING pose with the legs close together and the knee SEMI-BENT — but with the opposite leg doing the passing. Cells 1 and 3 are the wide contacts; cells 2 and 4 are the closed passings.",
    porque: 'kit do personagem-padrão (02/08/2026), copiando a corrida do cucurela-riso com o 4º quadro corrigido pra passagem',
  },
  andar: {
    slug: PERSONAGEM_PADRAO,
    // ESCOLHIDO A OLHO, contra os números: o torcedor-cule-menino tem MENOS amplitude de passada
    // (40% contra 60%) e mesmo assim é a caminhada que lê melhor na tela — alternância clara, passo
    // natural. Mais um caso em que a régua mede uma coisa e o olho julga outra; aqui o olho manda.
    alternativa: 'torcedor-cule-menino',
    porque: 'kit do personagem-padrão (02/08/2026), gerado copiando a caminhada do torcedor-cule-menino, apontada como a melhor do acervo',
  },
  idle: {
    slug: PERSONAGEM_PADRAO,
    alternativa: 'lamini-riso',
    porque: 'respiração do personagem-padrão: altura estável (varia 1px) e olhando pra DIREITA, como manda o contrato',
  },
};

// Quem é a referência pra gerar `tipo` em `slug`. Devolve { slug, tipo } ou null.
// A alternativa pode ser um slug ou um par { slug, tipo }, que é como se pede uma referência
// CRUZADA (a corrida do padrão mirando o andar dele mesmo — ver o comentário em `correr`).
export const referenciaDePose = (tipo, slug) => {
  const r = REFERENCIA_DE_POSE[tipo];
  if (!r) return null;
  const alvo = slug === r.slug ? r.alternativa : r.slug;
  if (!alvo) return null;
  const ref = typeof alvo === 'string' ? { slug: alvo, tipo } : { slug: alvo.slug, tipo: alvo.tipo || tipo };
  // referência que é o PRÓPRIO arquivo que se vai gerar não ensina nada
  if (ref.slug === slug && ref.tipo === tipo) return null;
  // o ajuste só vale quando se está de fato copiando a ALTERNATIVA (a referência com erro declarado)
  return { ...ref, ajuste: alvo === r.alternativa ? r.ajusteDaReferencia || '' : '' };
};

// O que dizer no prompt quando a referência é de OUTRO tipo: a encenação serve, a mecânica não.
export const ajusteDeTipo = (de, para) => {
  if (de === para) return '';
  if (de === 'andar' && para === 'correr') {
    // "bend both knees much more" produziu os QUATRO quadros com o joelho dobrado igual, e aí não
    // há ciclo: corrida é CONTRASTE entre a perna que estende ao tocar o chão e a que dobra ao
    // passar. E o corpo derivava de lugar entre os quadros, então a âncora vai dita explicitamente.
    return [
      'The pose reference is a WALK cycle of this same character.',
      'Keep from it: the SAME BODY, the same readable silhouette, and above all the same clear alternation of WHICH LEG LEADS in each cell.',
      'Turn it into a RUN by changing only these things: the torso leans forward, the arms pump with the elbows bent, and the stride is longer.',
      'The knees are NOT all bent the same amount — that is what kills the cycle. In the two CONTACT cells the leading leg reaches forward and is almost STRAIGHT as the foot meets the ground, while the other leg trails behind. In the two PASSING cells that trailing leg folds tight, knee high and heel kicked up toward the backside, and BOTH FEET are off the ground.',
      'ANCHOR: the character runs IN PLACE. His head and torso stay at the SAME position in every cell — same height, same horizontal spot, same distance from the camera. Only the limbs move. Do not let the body drift sideways or up and down between cells.',
    ].join(' ');
  }
  return '';
};

// Referência POR GESTO: a folha do personagem-padrão pro mesmo gesto. Um gesto novo em outro
// personagem passa a nascer copiando a encenação de uma folha que já foi aprovada, em vez de
// depender de a descrição em inglês bastar — que é a mesma lição do ciclo de locomoção.
export const referenciaDeGesto = (gesto, slug) =>
  (slug === PERSONAGEM_PADRAO ? null : { slug: PERSONAGEM_PADRAO, rel: `personagens/${PERSONAGEM_PADRAO}/acoes/${gesto}/_sheet.png` });

// O parágrafo que entra no prompt quando a referência viaja junto. Ele tem UM trabalho difícil:
// dizer que da folha de referência vem SÓ a pose, e nunca a aparência — senão o gerador mistura os
// dois personagens, que é o modo de falhar óbvio aqui.
export const instrucaoDePose = (n) => [
  `IMAGE ${n} IS THE POSE REFERENCE: an APPROVED cycle of a DIFFERENT character.`,
  'COPY ITS POSES cell by cell — the same stride width, the same knee bends, the same which-leg-is-forward in each cell, the same arm swing.',
  `Do NOT copy anything else from image ${n}: not the face, not the hair, not the skin, not the kit, not the body type.`,
  'Identity comes from image 1; only the POSES come from this one.',
  // A REFERÊNCIA TAMBÉM TEM DEFEITO. A folha do torcedor-cule-menino, escolhida pela caminhada, traz
  // a orelha de trás desenhada como uma bolinha na bochecha — e o gerador copiou o defeito junto com
  // a pose. Referência boa é referência de ENCENAÇÃO, não de acabamento: o desenho do rosto continua
  // valendo pelas regras da casa, mesmo quando o exemplo as viola.
  `The pose reference may contain drawing MISTAKES. Copy only the BODY POSES from it; the face, ears and head follow the rules stated above, never image ${n}.`,
  `In particular: if image ${n} shows a stray circle or blob near the eye or on the cheek, that is an ERROR — do not reproduce it.`,
].join(' ');
