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
// MEDIDO: a folha de corrida do cucurella-riso, gerada com esta referência, saltou de 40% pra 52% de
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
    alternativa: 'cucurella-riso',
    // `ajusteDaReferencia` = o que CORRIGIR em relação à referência. A corrida do cucurella-riso tem
    // o ciclo certo (contato, passagem, contato oposto) mas erra o quarto quadro: sai aberto como um
    // contato, quando deveria ser a segunda passagem. Sem este campo a escolha seria entre copiar uma
    // referência com defeito conhecido ou não usar referência nenhuma — e a segunda já provou ser
    // pior. Referência não precisa ser perfeita; precisa ser boa E ter o erro declarado.
    ajusteDaReferencia: "ONE CORRECTION to the reference: in its FOURTH cell the legs are spread wide open like a contact pose, which is wrong. Your fourth cell must instead look like the reference's SECOND cell — a PASSING pose with the legs close together and the knee SEMI-BENT — but with the opposite leg doing the passing. Cells 1 and 3 are the wide contacts; cells 2 and 4 are the closed passings.",
    porque: 'kit do personagem-padrão (02/08/2026), copiando a corrida do cucurella-riso com o 4º quadro corrigido pra passagem',
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
    alternativa: 'yamal-riso',
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

// ---------------------------------------------------------------------------
// AS DUAS REFERÊNCIAS (regra da casa desde 02/08/2026)
// ---------------------------------------------------------------------------
// TODA geração recebe EXATAMENTE DUAS imagens, sempre nesta ordem:
//
//   Image 1 = a MESMA folha, já aprovada, do PERSONAGEM-PADRÃO  -> a POSE / o LAYOUT
//   Image 2 = o personagem ALVO                                 -> a IDENTIDADE
//
// POR QUE DUAS E NÃO CINCO: até aqui cada gerador montava a própria pilha (base + model sheet +
// folha anterior + folha de pose + ficha de estilo, até CINCO imagens), e a pilha era diferente em
// cada um. Isso tinha três problemas. O primeiro é que a regra vivia repetida em cinco arquivos,
// então "mudar como se referencia" era mudar cinco vezes e torcer. O segundo é que quanto mais
// referências do MESMO personagem entram, mais peso a identidade dele ganha sobre a pose que se
// quer copiar. O terceiro é medido: no bake-off de 02/08/2026, seis de sete modelos misturaram a
// aparência do personagem-padrão na do alvo, e o modelo escolhido também arrastou o cabelo dele.
//
// A ficha de estilo sai da lista porque virou redundante: o personagem-padrão já É a casa desenhada
// no estilo da casa, então ele ensina linguagem visual e pose ao mesmo tempo.
//
// O TIPO é o que dá o par: 'model' pega o turnaround do padrão, 'andar'/'correr'/'idle' pegam a
// folha do rig, e qualquer outro nome é tratado como gesto do catálogo.
const RAIZ = 'personagens';
export const folhaDoTipo = (slug, tipo) =>
  tipo === 'model' ? `${RAIZ}/${slug}/model.png`
  : tipo === 'base' ? `${RAIZ}/${slug}/base.png`
  : tipo === 'avatar' ? `${RAIZ}/${slug}/avatar.png`
  : ['andar', 'correr', 'idle'].includes(tipo) ? `${RAIZ}/${slug}/rigs/${tipo}/_sheet.png`
  : `${RAIZ}/${slug}/acoes/${tipo}/_sheet.png`;

// Quem empresta a pose pra gerar `tipo` em `slug`. Se o alvo É o padrão, cai na alternativa
// registrada em REFERENCIA_DE_POSE (copiar a si mesmo não ensina nada); se não houver alternativa
// pra esse tipo, devolve null e a geração segue com UMA referência só, declarando isso.
export function doadorDePose(tipo, slug) {
  if (slug !== PERSONAGEM_PADRAO) return { slug: PERSONAGEM_PADRAO, tipo };
  const alt = REFERENCIA_DE_POSE[tipo]?.alternativa;
  if (!alt) return null;
  return typeof alt === 'string' ? { slug: alt, tipo } : { slug: alt.slug, tipo: alt.tipo || tipo };
}

// O PAR PRONTO, em caminhos RELATIVOS ao conteúdo (quem resolve pro absoluto é o gerador, que já
// conhece o CONTEUDO). `identidade` é o model sheet do alvo quando ele existe, senão a base: o
// turnaround mostra o personagem de quatro ângulos e é a melhor fonte de identidade que temos —
// menos quando o que se está gerando É o turnaround, e aí só a base faz sentido.
//
// `existe` é injetado pelo chamador (fs.existsSync com o CONTEUDO na frente) pra este módulo
// continuar sem tocar em disco: ele é importado pelo front, pelo servidor e pelos scripts.
// `identidade` no options existe pro caso em que a identidade NÃO é a arte padrão do personagem:
// o gen-walk/gen-idle aceitam uma `refRel` pra gerar, por exemplo, a caminhada de um personagem
// disfarçado. Continua sendo UMA imagem de identidade, só que outra.
export function duasReferencias(tipo, slug, existe, { identidade: forcada = null } = {}) {
  const doador = doadorDePose(tipo, slug);
  const pose = doador ? folhaDoTipo(doador.slug, doador.tipo) : null;
  const model = folhaDoTipo(slug, 'model');
  const identidade = forcada || (tipo !== 'model' && existe(model) ? model : folhaDoTipo(slug, 'base'));
  const temPose = pose && existe(pose);
  return {
    refs: temPose ? [pose, identidade] : [identidade],
    poseDe: temPose ? doador : null,
    identidadeEh: identidade.endsWith('model.png') ? 'model sheet' : 'base',
    ajuste: temPose && doador.slug !== PERSONAGEM_PADRAO ? (REFERENCIA_DE_POSE[tipo]?.ajusteDaReferencia || '') : '',
  };
}

// O texto que descreve o par no prompt. Uma linha só, usada por TODOS os geradores, porque a ordem
// das imagens no corpo da request e a ordem em que o texto as nomeia têm que bater — quando cada
// gerador escrevia a sua, bastava alguém acrescentar uma referência pra trocar o papel de todas.
export function linhaDoPar({ temPose, oQueCopiar = 'the POSES, cell by cell' }) {
  if (!temPose) {
    return 'You are given 1 input image with HIGH input fidelity: Image 1 = THE CHARACTER. Keep his face, hair, skin, body and kit IDENTICAL to it.';
  }
  return [
    'You are given exactly 2 input images with HIGH input fidelity.',
    `IMAGE 1 IS A REFERENCE OF A DIFFERENT CHARACTER, already approved: copy from it ONLY ${oQueCopiar}, plus the layout, the framing, the scale and the spacing.`,
    'IMAGE 2 IS THE CHARACTER YOU MUST DRAW: his face, hair, skin tone, body type, kit, colours, shirt number and every accessory he carries come from image 2 and ONLY from image 2.',
    'This is the single most important rule of this task: image 1 decides HOW the body is arranged, image 2 decides WHO it is. Never blend the two.',
    'Do NOT copy from image 1 the hair shape or volume, the face, the skin tone, the kit or any prop. If the character in image 2 wears a mask, a headband, glasses or holds an object, he keeps ALL of it; if the character in image 1 has something image 2 does not have, leave it out.',
  ].join(' ');
}

// O parágrafo que entra no prompt quando a referência viaja junto. Ele tem UM trabalho difícil:
// dizer que da folha de referência vem SÓ a pose, e nunca a aparência — senão o gerador mistura os
// dois personagens, que é o modo de falhar óbvio aqui.
// A POSE É SEMPRE A IMAGEM 1 e a identidade sempre a 2, então esta função não recebe mais índice.
// Ela recebia: cada gerador calculava a posição da folha de pose dentro da própria pilha de
// referências (`poseRef: _refs.length - 1`, `poseRef: anterior ? 4 : 3`), e um erro de contagem
// aqui não quebra nada visível — só faz o texto apontar pra imagem errada e o modelo misturar os
// dois personagens, que foi exatamente o defeito relatado no bake-off.
export const instrucaoDePose = () => [
  'IMAGE 1 IS THE POSE REFERENCE: an APPROVED sheet of a DIFFERENT character.',
  'COPY ITS POSES cell by cell — the same stride width, the same knee bends, the same which-leg-is-forward in each cell, the same arm swing.',
  'Do NOT copy anything else from image 1: not the face, not the hair shape or volume, not the skin, not the kit, not the body type, not any prop it holds.',
  'Identity comes from IMAGE 2; only the POSES come from image 1.',
  // A REFERÊNCIA TAMBÉM TEM DEFEITO. A folha do torcedor-cule-menino, escolhida pela caminhada, traz
  // a orelha de trás desenhada como uma bolinha na bochecha — e o gerador copiou o defeito junto com
  // a pose. Referência boa é referência de ENCENAÇÃO, não de acabamento: o desenho do rosto continua
  // valendo pelas regras da casa, mesmo quando o exemplo as viola.
  'The pose reference may contain drawing MISTAKES. Copy only the BODY POSES from it; the face, ears and head follow the rules stated above and the identity in image 2, never image 1.',
  'In particular: if image 1 shows a stray circle or blob near the eye or on the cheek, that is an ERROR — do not reproduce it.',
].join(' ');
