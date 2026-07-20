// Posição/tamanho padrão do balão, em FRAÇÃO da imagem (0..1). Usado pelo editor
// (front) como ponto de partida e pelo render (server) como referência do auto.
// x,y = canto superior esquerdo do balão; w = largura; tipX,tipY = ponta do rabinho.
// Bate com a zona automática: topo à esquerda, longe do selo da estrela.
export const BALAO_POS_PADRAO = { x: 0.06, y: 0.055, w: 0.72, tipX: 0.5, tipY: 0.44 }
