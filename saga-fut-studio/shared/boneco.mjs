// boneco.mjs — O ESQUELETO ARTICULADO: o personagem como peças ligadas por articulações.
//
// POR QUE EXISTE: hoje a animação do SagaFut é SUBSTITUIÇÃO DE DESENHO. Cada gesto é uma folha
// gerada (4 a 16 desenhos) e o personagem só consegue fazer aquilo que já foi desenhado. O preço
// aparece no acervo: 97 personagens, 11 gestos no catálogo, 13 folhas de ação existentes. Quase
// todo mundo sabe respirar e correr, e nada mais, porque cada gesto novo custa uma geração.
//
// Com o boneco, POSE VIRA DADO: uma lista de ângulos por articulação. Gesto novo custa zero, o
// mesmo movimento serve o elenco inteiro, e passam a existir coisas que substituição não alcança —
// antecipação, overshoot, o pé fixo no chão enquanto o corpo avança, olhar para o lado.
//
// O QUE JÁ DEU ERRADO ANTES (e como isto é diferente): cutout foi tentado e reprovado por EMENDA na
// junta. Aquilo era RECORTAR um desenho chapado pronto: no recorte a junta é um corte reto e a
// rotação abre um buraco. Aqui as peças são DESENHADAS separadas, cada uma com a extremidade
// arredondada e sobra de sobreposição, e o estilo da casa tem contorno preto grosso, que é onde a
// emenda se esconde.
//
// CONVENÇÃO QUE FAZ O RESTO SAIR DE GRAÇA: toda peça é desenhada NA VERTICAL, com a extremidade que
// se liga ao pai no TOPO. Assim o pivô é sempre (meio, topo) e a ponta é sempre (meio, base) — o
// ponto de encaixe do filho é a base do pai, sem ninguém precisar declarar coordenada nenhuma. As
// duas exceções (tronco e cabeça) declaram, porque elas é que definem onde ficam ombro e quadril.

// Ordem de leitura da folha de peças: 4 colunas x 3 linhas. É esta ordem que o prompt manda
// desenhar e é esta ordem que o fatiador lê, então as duas listas são a MESMA lista.
// O `rotulo` diz onde a peça começa e termina E O QUE ELA VESTE. A roupa não é detalhe: sem ela, o
// gerador desenha cada segmento como um MEMBRO COMPLETO em miniatura, com a sua própria manga e a
// sua própria meia. Aconteceu na primeira folha: o braço superior e o antebraço voltaram os dois
// com manga vermelha no topo, e montados em sequência viravam dois braços emendados. A roupa
// atravessa a junta uma vez só, e quem diz onde ela para é esta lista.
export const PECAS = [
  { id: 'cabeca', rotulo: 'head with a short neck stump at the bottom', ancora: 'base' },
  // O tronco é a peça que mais erra: sem "ombros LARGOS" ele sai afunilado como uma cápsula e os
  // braços passam a nascer do peito; sem "gola FECHADA" o gerador desenha o decote como um buraco
  // escuro, que na montagem vira uma mancha preta no peito.
  { id: 'tronco', rotulo: 'torso: the shirt from the neck down, plus the shorts and the very top of both thighs. WIDE SQUARE SHOULDERS at the top, as wide as the head. The collar is a small SOLID closed neckline, never an open hole. NO arms, NO legs below the shorts', ancora: 'base' },
  { id: 'braco-frente-sup', rotulo: 'near UPPER ARM only, shoulder to elbow: the short shirt SLEEVE covers the top third, BARE SKIN the rest', ancora: 'topo' },
  { id: 'braco-frente-inf', rotulo: 'near FOREARM with the hand, elbow to fingers: BARE SKIN all the way, NO sleeve, NO cuff, NO coloured band anywhere on it', ancora: 'topo' },
  { id: 'braco-tras-sup', rotulo: 'far UPPER ARM, same as the near one: sleeve on top third, bare skin below', ancora: 'topo' },
  { id: 'braco-tras-inf', rotulo: 'far FOREARM with the hand: BARE SKIN all the way, NO sleeve, NO cuff, NO band', ancora: 'topo' },
  { id: 'coxa-frente', rotulo: 'near THIGH only, hip to knee: BARE SKIN all the way, NO shorts, NO sock, NO band', ancora: 'topo' },
  { id: 'canela-frente', rotulo: 'near LOWER LEG with the boot: the striped SOCK starts at the VERY TOP of the piece and runs down, then the boot. NO bare skin above the sock', ancora: 'topo' },
  { id: 'coxa-tras', rotulo: 'far THIGH: BARE SKIN all the way, NO shorts, NO sock', ancora: 'topo' },
  { id: 'canela-tras', rotulo: 'far LOWER LEG with the boot: striped sock from the very top, then the boot, NO bare skin above the sock', ancora: 'topo' },
  { id: 'cabeca-grita', rotulo: 'head with neck stump, mouth WIDE OPEN shouting', ancora: 'base' },
  { id: 'cabeca-cima', rotulo: 'head with neck stump, eyes looking UP', ancora: 'base' },
];
export const GRID_BONECO = [4, 3];
export const PECAS_IDS = PECAS.map((p) => p.id);

// HIERARQUIA. `pai` é quem carrega a peça; `em` é onde ela se encaixa no pai. Sem `em`, encaixa na
// PONTA do pai (a convenção acima). `z` é a ordem de desenho, do fundo para a frente: o braço de
// trás fica atrás do tronco e o da frente na frente, que é o que dá volume num desenho chapado.
export const OSSOS = [
  { id: 'braco-tras-sup', pai: 'tronco', em: 'ombroTras', z: 0 },
  { id: 'braco-tras-inf', pai: 'braco-tras-sup', z: 1 },
  { id: 'coxa-tras', pai: 'tronco', em: 'quadrilTras', z: 2 },
  { id: 'canela-tras', pai: 'coxa-tras', z: 3 },
  { id: 'tronco', pai: null, z: 4 },
  { id: 'coxa-frente', pai: 'tronco', em: 'quadrilFrente', z: 5 },
  { id: 'canela-frente', pai: 'coxa-frente', z: 6 },
  { id: 'braco-frente-sup', pai: 'tronco', em: 'ombroFrente', z: 7 },
  { id: 'braco-frente-inf', pai: 'braco-frente-sup', z: 8 },
  // A CABEÇA VAI NA FRENTE DE TUDO. Pela lógica do corpo o braço passaria na frente do rosto quando
  // sobe, e é o que acontecia em comemorar: o punho tapava a cara justo no beat em que a expressão
  // é a piada. Num personagem de cabeça grande, rosto coberto custa mais do que o realismo vale.
  { id: 'cabeca', pai: 'tronco', em: 'pescoco', z: 9 },
];

// Os pontos do TRONCO, em fração do seu próprio retângulo (x da esquerda, y do topo). São os únicos
// números declarados do esqueleto inteiro: ombro e quadril não têm como sair da convenção da ponta,
// porque o tronco tem quatro filhos e uma ponta só.
// A peça de tronco vem com o calção e um pedaço de coxa (é assim que o gerador desenha um torso de
// jogador), então o QUADRIL não fica na base dela: fica a três quartos. Marcar isso aqui é o que
// impede a perna de nascer do joelho do desenho.
// O X aqui não é fração da peça, é posição DENTRO da largura do corpo medida naquela altura
// (0 = borda de trás, 1 = borda da frente). O Y continua sendo fração da altura da peça.
export const PONTOS_TRONCO = {
  pescoco: [0.50, 0.10],   // a cabeça entra POR DENTRO do tronco, até a linha do ombro
  ombroFrente: [0.82, 0.20],
  ombroTras: [0.18, 0.20],
  quadrilFrente: [0.68, 0.70],
  quadrilTras: [0.32, 0.70],
};

// SOBREPOSIÇÃO NA JUNTA: o filho não encaixa na ponta exata do pai, encaixa um pouco ANTES, e a
// peça entra por dentro. É o que apaga a linha de contorno que denuncia a articulação e faz o
// boneco parar de parecer uma fileira de salsichas. A folha já é desenhada com sobra arredondada
// justamente pra ter o que enfiar por dentro.
export const SOBREPOR = 0.88;

// PROPORÇÃO CANÔNICA, em fração da altura do personagem (CHAR_H). Cada peça é reescalada para o seu
// comprimento aqui, mantendo o próprio aspecto.
//
// POR QUE ISTO EXISTE (camada 1, o dado carrega a regra): o gerador desenha cada peça PREENCHENDO a
// célula do grid, então a perna sai do mesmo tamanho da cabeça e o boneco montado vira um adulto
// magro — o elenco perde o chibi de três cabeças que é a cara da casa. Sem esta tabela, a proporção
// dependeria de o modelo acertar o tamanho relativo de doze desenhos soltos, o que ele não tem
// como saber. Com ela, qualquer folha de peças monta na proporção certa.
//
// A cadeia vertical (cabeça + tronco + coxa + canela) soma 1, então o boneco montado tem exatamente
// a mesma altura das sprites que já existem e entra no motor sem remedir chão nenhum.
export const PROPORCAO = {
  cabeca: 0.34, 'cabeca-grita': 0.34, 'cabeca-cima': 0.34,
  tronco: 0.42,   // a peça inclui o calção e um pedaço de coxa; o quadril está a 72% dela
  'coxa-frente': 0.17, 'coxa-tras': 0.17,
  'canela-frente': 0.19, 'canela-tras': 0.19,
  'braco-frente-sup': 0.17, 'braco-tras-sup': 0.17,
  'braco-frente-inf': 0.18, 'braco-tras-inf': 0.18,
};

// ESPESSURA, também em fração de CHAR_H. Escalar a peça mantendo o aspecto dela devolve membros de
// palito: a peça nasce comprida na célula, e encolher a altura pra proporção certa encolhe a
// largura junto. Num personagem de três cabeças o braço é GROSSO, então a espessura tem que ser
// declarada em vez de herdada. Quem não está aqui mantém o aspecto (a cabeça, que já vem certa).
export const ESPESSURA = {
  tronco: 0.35,   // num corpo de três cabeças o tronco é quase tão largo quanto a cabeça
  'braco-frente-sup': 0.078, 'braco-tras-sup': 0.074,
  'braco-frente-inf': 0.074, 'braco-tras-inf': 0.070,
  'coxa-frente': 0.095, 'coxa-tras': 0.090,
  'canela-frente': 0.105, 'canela-tras': 0.100,
};

export const dirBoneco = (slug) => `personagens/${slug}/boneco`;
export const arquivoPeca = (slug, id) => `${dirBoneco(slug)}/${id}.png`;
export const folhaBoneco = (slug) => `${dirBoneco(slug)}/_sheet.png`;
export const metaBoneco = (slug) => `${dirBoneco(slug)}/_boneco.json`;
export const cartaoBoneco = (slug) => `${dirBoneco(slug)}/_card.png`;
