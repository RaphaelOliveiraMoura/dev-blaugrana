import { getJSON, sendJSON } from './http.js'

// ACERVO — o que se reusa entre vídeos: LUGARES (cenários com suas vistas) e OBJETOS (props).
// Personagem já tinha tela própria; estes dois viviam escondidos dentro da pasta de um vídeo.

// fichas de lugar: { itens: [{ slug, tem[], faltando[], completo, vistas[] }] }
export function getCenarios() {
  return getJSON('/api/acervo/cenarios')
}

// gera UMA vista da ficha. A derivada (ângulo/perto) sai do panorama como referência, e é isso que
// mantém as três sendo o mesmo lugar.
export function gerarVistaCenario(slug, vista, desc) {
  return sendJSON('/api/acervo/cenario/vista', { slug, vista, desc })
}

// VARIAÇÃO: outro pedaço do mesmo lugar, em vista lateral e com a MESMA linha de chão — troca o
// fundo da cena sem mudar o tamanho de ninguém.
export function gerarVariacaoCenario(slug, variacao, desc) {
  return sendJSON('/api/acervo/cenario/vista', { slug, variacao, desc })
}

// props: os de código (o motor desenha) e os de arte
export function getObjetos() {
  return getJSON('/api/acervo/objetos')
}

// BANCO DE PROVAS DE ESTILO: candidatos de linguagem visual + os estudos já feitos.
// Estudo não é asset (vive em estilos/testes/ e nenhum vídeo enxerga): enquanto o estilo não foi
// escolhido, aquilo é amostra, e trocar o estilo depois custa regerar o acervo inteiro.
export function getEstilosTeste() {
  return getJSON('/api/acervo/estilos')
}

// gera o MESMO personagem noutra linguagem visual, na mesma cena de prova (a comparação só vale se
// a cena for igual; senão o que se julga é a pose)
export function gerarEstudoEstilo({ slug, estilo, todos, cena }) {
  return sendJSON('/api/acervo/estilo/teste', { slug, estilo, todos, cena })
}
