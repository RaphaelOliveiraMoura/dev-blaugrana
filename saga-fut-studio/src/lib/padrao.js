// O personagem-padrão, pro front. É a MESMA constante de scripts/sprites/referencia.mjs, repetida
// aqui por um motivo chato: o front é bundlado pelo Vite e não pode importar de scripts/, que roda
// só no Node. Duas cópias da mesma verdade é o tipo de coisa que sai de sincronia em silêncio, então
// o teste `contrato` compara as duas e reprova se divergirem.
export const PERSONAGEM_PADRAO = 'torcedor-cule'
