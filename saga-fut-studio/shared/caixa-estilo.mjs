// O ESTILO DA CAIXA DE TEXTO DO QUADRINHO, em UM lugar só: cor, contorno, canto, corpo de
// letra e peso do glifo. Lido pela caixa de LEGENDA (lib/legenda.mjs) e pelo BALÃO de fala
// (lib/balao.mjs), que são a mesma peça de diagramação com uma diferença só, o rabinho.
//
// POR QUE EXISTE: os dois nasceram separados e divergiram até ficarem de famílias diferentes
// no mesmo slide. No painel 1 do `o-roteiro-do-fabio` dava pra ver os dois ao mesmo tempo: a
// legenda em caixa creme de contorno fino e liso com letra encorpada, e o balão em bolha
// BRANCA de contorno grosso e trêmulo com letra manuscrita. O Raphael pediu o balão
// "praticamente igual" à legenda, e a única forma de isso continuar verdade daqui a três
// meses é os dois lerem o mesmo número em vez de cada um manter a sua cópia.
//
// As proporções são FRAÇÃO DA LARGURA do quadro, nunca px: a mesma caixa é desenhada na
// prévia da aba (arte crua), no slide do carrossel (área interna da moldura, ~7% menor) e no
// clipe animado, que têm três tamanhos diferentes.
//
// Os valores foram MEDIDOS contra os painéis que a IA desenhava (comparação de 05/08/2026,
// slide 4 do o-dia-pedri lado a lado), e é por isso que não são redondos.

// A FONTE é parte do estilo, não preferência de cada desenho: o balão vinha na manuscrita
// (Bradley Hand) e a legenda na Comic Sans, e duas famílias no mesmo slide é a diferença que
// salta antes de qualquer outra. O seletor de fonte do studio continua valendo por quadrinho;
// o que mudou é qual delas vale quando ninguém escolheu.
export const FONTE_CAIXA = 'comic'

export const CREME = '#f4ead3'
export const TINTA = '#1a1a1a'

export const CAIXA = {
  fonte: 0.034,      // corpo da letra (a IA usa ~38px num slide de 1080 de largura)
  fonteMin: 0.029,   // piso do corpo: abaixo disso não se lê na miniatura do feed
  padX: 0.038,       // respiro lateral: a letra fica bem longe da borda da caixa
  padY: 0.020,       // idem no vertical (aperta mais que o lateral)
  contorno: 0.0038,  // contorno preto (~4px), não os 6px da primeira versão
  raioRel: 0.16,     // canto arredondado como FRAÇÃO DA ALTURA, não da largura: raio fixo
                     // deixa caixa baixa parecendo pílula e caixa alta parecendo quadrada
  raioMax: 0.018,    // teto do raio, em fração da largura
  entrelinha: 1.18,
  // ENGROSSA a letra: as fontes single-face que a opentype consegue vetorizar carregam no
  // peso REGULAR, e a letra da IA é mais encorpada. O contorno da própria cor aproxima o
  // peso sem trocar de família. Foi de 4,5% para 1,4% na comparação lado a lado: acima disso
  // o glifo fica gordo e denuncia que não é a mesma fonte.
  peso: 0.014,
}

// A espessura do contorno e o raio, já em px, a partir da largura do quadro. Os dois
// desenhos chamam isto em vez de repetir a conta, que é como um deles ficaria pra trás.
export const contornoPx = (W) => Math.max(3, Math.round(W * CAIXA.contorno))
export const raioPx = (W, alturaCaixa) => Math.round(Math.min(alturaCaixa * CAIXA.raioRel, W * CAIXA.raioMax))
