import { refPersonagem, estiloImagem } from '../../shared/caminhos.mjs'

// O que vai junto como referência ao gerar a ficha de um personagem, em uma frase.
//
// Espelha o comporPrompt do servidor: lá o estilo diz COMO desenhar e a aparência diz
// QUEM é, e as duas só entram na ficha. As imagens mudam o resultado mais que qualquer
// palavra do prompt, então antes de gerar (ou de substituir uma ficha pronta) você
// precisa saber com o que ela vai ser feita.
//
// Mora aqui e não na tela porque a mesma ficha se gera de dois lugares, a galeria do
// pool e o elenco da saga, e o aviso não pode divergir entre eles.
export function refInfoDaFicha(p, est, existing) {
  const temRef = !!existing[refPersonagem(p.id)]
  const temEstilo = !!(est && existing[estiloImagem(est.id)])
  return [
    `Estilo: ${est?.nome || 'nenhum, escolha na ficha'}${temEstilo ? ' (com referência de traço)' : ''}.`,
    temRef
      ? 'A referência de aparência vai junto: a ficha sai parecida com ela, no traço do estilo.'
      : 'Sem referência de aparência: a cara sai só do que o prompt descreve.',
  ].join(' ')
}
