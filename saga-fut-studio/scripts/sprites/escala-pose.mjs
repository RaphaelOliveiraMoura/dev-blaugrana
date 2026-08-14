// O PERSONAGEM TEM O MESMO TAMANHO EM TODA POSE?
//
// ## O defeito (14/08/2026)
//
// "Quando o personagem está com os braços pra cima, o corpo dele diminui comparado a um frame em
// que ele está inteiro." Está certo, e é medível: a pose `taca` do Ferran tem o corpo **30% menor**
// que o idle do mesmo personagem, e a `taca-espanha` do Rodri, 28%.
//
// A causa não é o gerador: é a NORMALIZAÇÃO. Toda peça é encaixada no canvas pela bbox da silhueta,
// então a silhueta sempre preenche a altura disponível. Quando os braços erguidos (e a taça, e a
// bola de ouro) entram na silhueta, o que sobra pro corpo é menos — e o mesmo personagem aparece
// menor na tela, no meio do vídeo, sem que nada no roteiro tenha mudado.
//
// Isso JÁ ERA RESOLVIDO nas folhas de ação (`slice-acao.mjs` grava `aperto` e o motor desfaz o
// encolhimento no `w`). O que faltava era a mesma coisa nas POSES estáticas — e como o vídeo passou
// a ser feito de poses em 14/08, o defeito voltou por essa porta.
//
// ## A régua: dos OLHOS aos PÉS
//
// Três réguas foram medidas contra o acervo antes desta ficar:
//
//   largura da cabeça (a que o slice-acao usa)  -> mede o TROFÉU, não a cabeça. Ela procura a
//        cabeça no topo da silhueta, e com braço erguido o topo é a mão. Deu 93px numa cabeça de
//        221px.
//   largura da cabeça na linha dos olhos        -> contaminada pelos braços quando eles sobem
//        colados à cabeça: vira um segmento contíguo só.
//   distância entre os olhos                    -> confunde ROTAÇÃO com escala. A `bola-de-ouro`
//        tem a cabeça inclinada e a régua acusou 89% de encolhimento onde havia 6%.
//
// Olhos-aos-pés passou: nas 27 poses do acervo, 23 caem dentro de 5% do idle do próprio
// personagem, e as três pontas são exatamente as poses de braço erguido (`ferran/taca` 1.30,
// `rodri/taca-espanha` 1.28, `raphinha/amarra` 1.23). Uma régua que separa o caso conhecido do
// resto do acervo é uma régua calibrada.
//
// ## O que ela NÃO mede
//
// Pose AGACHADA, sentada ou deitada encurta olhos-aos-pés de verdade, e corrigir ali esticaria o
// personagem. Por isso a correção tem TETO (`MAX_APERTO`) e só entra acima de `MIN_APERTO`: no meio
// dessa faixa a diferença é ruído de desenho, e o remédio seria pior que a doença.
//
// POSE SEM OLHOS VISÍVEIS (olho fechado no grito, personagem de costas) NÃO É MEDIDA, e fica com
// aperto 1. São 12 das 39 poses do acervo, e várias delas têm braço erguido (`yamal/comemorar`,
// `pedri/comemorar`), então o buraco é real, não teórico.
//
// A pele do rosto foi testada como plano B e REPROVOU, pelo motivo mais irônico possível: braço
// erguido mostra ANTEBRAÇO, antebraço é pele, e o centroide da pele sobe junto com o braço. No
// `ferran/taca` ela acusa 1.02 onde os olhos veem 1.30 — ou seja, ela é cega exatamente no caso que
// esta medição existe pra pegar. Medido em todo o acervo: das 20 poses em que as duas réguas podem
// opinar, elas concordam em 20 nos casos comuns e divergem justamente nas três de braço erguido.
//
// Então o buraco fica DECLARADO em vez de tapado por chute: o script lista as não medidas, e o
// `aperto` pode ser escrito à mão no `_meta.json` pra essas (o motor lê igual). Ver a folha de
// `--comparar`, que é como se decide o número olhando.
import sharp from 'sharp';

// Abaixo disto é ruído de desenho; acima é o personagem mudando de tamanho na tela.
//
// Era 1.08 e desceu pra 1.04 porque 8% deixou passar o caso que o Raphael viu: a `bola-de-ouro` do
// Rodri mede 1.059, ficava sem correção, e na cena ele chegava andando e ENCOLHIA 5% ao virar pose.
// O olho compara os dois momentos da MESMA cena, e nessa comparação direta 5% já aparece. O limiar
// acompanha o do verificador de conjunto (MAX_AMPLITUDE), senão um aprova o que o outro reprova.
export const MIN_APERTO = 1.04;
// teto de segurança: acima disso quase certamente não é "braço erguido", é pose agachada ou uma
// medição ruim, e esticar 60% um personagem estraga mais do que o encolhimento que ia consertar
export const MAX_APERTO = 1.55;
const MIN_PIXEIS_OLHO = 120;   // menos que isto não é um par de olhos, é ruído claro na arte

/** Distância dos OLHOS até os PÉS, em px do arquivo. `null` se não achou olhos. */
export async function olhosAosPes(arquivo) {
  const { data, info } = await sharp(arquivo).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width;
  let mnY = 1e9, mxY = -1, mnX = 1e9, mxX = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < W; x++) {
      if (data[(y * W + x) * 4 + 3] > 10) {
        if (y < mnY) mnY = y; if (y > mxY) mxY = y;
        if (x < mnX) mnX = x; if (x > mxX) mxX = x;
      }
    }
  }
  if (mxY < 0) return null;
  // o branco do olho é a única coisa branca quase pura no estilo da casa (mesma detecção do
  // orientacao.mjs). Procura no terço superior do CORPO: mais abaixo entram meião e chuteira claros.
  const ys = [];
  const lim = mnY + Math.round((mxY - mnY) * 0.6);
  for (let y = mnY; y <= lim; y++) {
    for (let x = mnX; x <= mxX; x++) {
      const i = (y * W + x) * 4;
      if (data[i + 3] > 40 && data[i] > 225 && data[i + 1] > 225 && data[i + 2] > 218) ys.push(y);
    }
  }
  if (ys.length < MIN_PIXEIS_OLHO) return null;
  ys.sort((a, b) => a - b);
  return mxY - ys[Math.floor(ys.length / 2)];
}

/**
 * O fator que o motor precisa aplicar pra esta peça ter o mesmo tamanho do idle.
 * @returns {{aperto:number, ref:number, medido:number, motivo?:string}|null}
 */
export async function apertoContraIdle(arquivoPose, arquivoIdle) {
  const ref = await olhosAosPes(arquivoIdle).catch(() => null);
  if (!ref) return null;                                  // sem referência não se corrige nada
  const medido = await olhosAosPes(arquivoPose).catch(() => null);
  if (!medido) return null;
  const bruto = ref / medido;
  if (bruto >= MIN_APERTO && bruto <= MAX_APERTO) return { aperto: +bruto.toFixed(4), ref, medido };
  // fora da faixa vira 1 COM motivo — mas só quando o motivo é INTERESSANTE. Anotar "0.99x" em
  // toda pose que está certa enche o relatório de linhas que não pedem ação, e relatório assim é
  // relatório que ninguém lê até o fim.
  const motivo = bruto > MAX_APERTO ? `medida ${bruto.toFixed(2)}x acima do teto (pose agachada? medição ruim?)`
    : bruto < 0.92 ? `a pose está ${((1 / bruto - 1) * 100).toFixed(0)}% MAIOR que o idle; encolher não é o conserto`
      : null;
  return { aperto: 1, ref, medido, ...(motivo ? { motivo } : {}) };
}
