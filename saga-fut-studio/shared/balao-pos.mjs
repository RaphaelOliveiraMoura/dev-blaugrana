// Posição/tamanho do balão, em FRAÇÃO da imagem (0..1). Usado pelo editor (front) como
// ponto de partida e pelo render (server) como referência do auto.
// x,y = canto superior esquerdo do balão; w = largura; tipX,tipY = ponta do rabinho.
// Bate com a zona automática: topo à esquerda, longe do selo da estrela.
export const BALAO_POS_PADRAO = { x: 0.06, y: 0.055, w: 0.72, tipX: 0.5, tipY: 0.44 }

// A fala de um painel é uma LISTA, então o automático precisa saber de qual balão se trata:
// sem isto, dois personagens falando no mesmo painel empilham as duas bolhas no mesmo canto
// e o painel sai com uma mancha branca ilegível.
//
// O escalonamento é diagonal e alternado: o primeiro sobe à esquerda, o segundo desce à
// direita, o terceiro volta. É o arranjo de gibi (quem fala primeiro fica em cima, e a leitura
// desce), e o `pos` arrastado sempre vence, então isto é só o ponto de partida.
export function posAutomatica(i = 0, total = 1) {
  if (total <= 1) return BALAO_POS_PADRAO
  const w = Math.max(0.42, BALAO_POS_PADRAO.w - (total - 1) * 0.1)
  const direita = i % 2 === 1
  return {
    x: direita ? 1 - w - 0.06 : 0.06,
    y: 0.05 + i * 0.17,
    w,
    tipX: direita ? 0.62 : 0.38,
    tipY: Math.min(0.9, 0.3 + i * 0.17),
  }
}
