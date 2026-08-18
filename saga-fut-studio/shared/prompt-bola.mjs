// "FOOTBALL" NÃO É BOLA DE FUTEBOL PRO MODELO. É A OVAL.
//
// POR QUE EXISTE: os geradores de imagem foram treinados majoritariamente em inglês americano,
// onde `football` é o esporte da bola OVAL. Quando o prompt escreve "a leather football" e não diz
// mais nada, o modelo tem chance real de desenhar a bola de futebol americano, e o acervo tem a
// prova: dos 33 painéis que pedem a bola como OBJETO, 6 saíram com bola oval (18%). Entre eles o
// `o-dia-primeira-bola`, cuja CAPA é a compra da primeira bola do clube, e o `o-dia-fla-flu-lagoa`,
// onde a bola boiando na lagoa é a imagem inteira do episódio.
//
// O caso que mostra o mecanismo mais limpo é o `spot-bola` da marca do futgibi: o prompt pediu
// "a classic black and cream panelled football" e voltou uma peça de 276x193 (razão 1.43), ou seja,
// os gomos certos numa silhueta OVAL. Não é o padrão que escorrega, é a SILHUETA.
//
// COMO SE DEFENDE (camada 1, não camada 2): a tradução é determinística, então não há decisão pra
// devolver pro humano. `football` usado como NÚCLEO ("a leather football sitting on the grass")
// vira `soccer ball` a caminho do modelo, do mesmo jeito que `semSlugsInternos` troca o id do
// acervo pelo nome de exibição. O JSON continua com o texto que o autor escreveu; quem muda é o
// que sai daqui pro gerador.
//
// O QUE NÃO É TOCADO, e cada exceção custou uma medição:
//   · `football pitch`, `football boot`, `football shirt`, `football club`, `football supporters`:
//     aqui `football` é o ESPORTE ou o LUGAR, e nenhum deles desenha bola. São 133 dos 166 usos
//     do acervo, e converter todos daria "soccer ball pitch".
//   · `play football`, `playing football`: o esporte de novo.
//   · `no football`, `NO BALL anywhere`: prompt que PROÍBE a bola (o `trio-foguete` e o
//     `procura-se-um-9` dependem disso). Trocar a palavra ali não muda nada, mas suja o texto.
//   · `american football`, `rugby ball`, `cricket ball`: declaração EXPLÍCITA de outro esporte, e
//     ela é legítima. O `o-dia-beisebol` pede "an oval rugby ball" de propósito, num armário
//     multiesporte, e o `o-dia-cores` pede "a cricket ball" porque a cena é uma escola inglesa.
//     Quem quer a bola oval escreve o nome dela, e é assim que a regra tem saída declarada.
//
// O QUE ESTA CAMADA NÃO PEGA, e por isso a cláusula global existe no `quadrinhoRules`: prompt que
// nem menciona bola. O `o-dia-copa-uniao` pediu "two identical silver trophies" num contexto
// esportivo e voltou com DOIS troféus Vince Lombardi, da NFL. Palavra nenhuma pra trocar ali: o
// que faltava era o prompt dizer de que esporte é a peça.

// `football` é BOLA quando é o núcleo do sintagma, ou seja, quando o que vem DEPOIS não é
// substantivo: é preposição, verbo, conjunção ou pontuação. Detectar assim (em vez de listar os
// substantivos que não são bola) foi o que separou "a football sitting alone" de "football
// transfer", "football head", "football striker" e "football dressing room" sem lista infinita.
const NUCLEO = /^(on|in|at|to|with|against|beside|above|below|under|behind|near|by|for|from|into|onto|over|across|and|or|that|which|is|are|was|were|sits?|sitting|lying|lies|resting|rests?|floating|floats?|rolling|rolls?|bouncing|bounces?|balanced|nested|left|placed|standing|tucked|half|mid|barely|just|still|already)\b|^[,.;:)"'’]/i

// o que vem ANTES e desliga a troca: outro esporte declarado, o esporte como atividade, ou a
// proibição da bola
const ANTES_NEUTRO = /\b(american|play|plays|playing|played|no|any|of)\s+$/i

const RE_FOOTBALL = /\bfootballs?\b/gi

/**
 * Põe a âncora de bola redonda no prompt, a caminho do modelo.
 * @param {string} texto
 * @returns {string}
 */
export function comAncoraDeBola (texto) {
  if (!texto) return texto
  return String(texto).replace(RE_FOOTBALL, (achado, pos, todo) => {
    const antes = todo.slice(Math.max(0, pos - 24), pos)
    const depois = todo.slice(pos + achado.length).replace(/^\s+/, '')
    if (ANTES_NEUTRO.test(antes)) return achado
    if (depois && !NUCLEO.test(depois)) return achado
    const plural = /s$/i.test(achado)
    const alvo = plural ? 'soccer balls' : 'soccer ball'
    // caixa alta é ênfase do autor ("a single FOOTBALL with a crude smile"), e ela se mantém
    return achado === achado.toUpperCase() ? alvo.toUpperCase() : alvo
  })
}

/**
 * Os trechos que a âncora vai trocar. Serve pra ferramenta de varredura e pro vigia: quem
 * revisa precisa saber QUAIS painéis desenham bola, porque é neles que o olho tem que ir.
 * @param {string} texto
 * @returns {{trecho:string, virou:string}[]}
 */
export function bolasNoPrompt (texto) {
  const achados = []
  if (!texto) return achados
  const todo = String(texto)
  for (const m of todo.matchAll(RE_FOOTBALL)) {
    const antes = todo.slice(Math.max(0, m.index - 24), m.index)
    const depois = todo.slice(m.index + m[0].length).replace(/^\s+/, '')
    if (ANTES_NEUTRO.test(antes)) continue
    if (depois && !NUCLEO.test(depois)) continue
    achados.push({
      trecho: todo.slice(Math.max(0, m.index - 40), m.index + m[0].length + 24).replace(/\s+/g, ' '),
      virou: comAncoraDeBola(m[0]),
    })
  }
  return achados
}

// A cláusula que viaja em TODO painel, cena e ficha. Ela cobre o que a troca de palavra não
// alcança: a bola que o prompt não nomeia e o TROFÉU, que foi como o `o-dia-copa-uniao` virou
// NFL sem a palavra "ball" aparecer uma vez sequer no prompt.
export const REGRA_BOLA = 'SPORT (every image, follow exactly): this is ASSOCIATION FOOTBALL, the'
  + ' sport played with the feet, known as SOCCER. Any ball drawn anywhere in this image is a ROUND'
  + ' spherical soccer ball with flat panels. NEVER an oval, pointed or egg-shaped ball, NEVER a'
  + ' ball with lacing across a pointed end, NEVER an American football or a rugby ball, unless the'
  + ' prompt explicitly names that other sport. Any trophy is a football/soccer trophy, NEVER an'
  + ' NFL-style trophy with an oval ball on top. Kit, boots, goals and pitch markings are'
  + ' association football ones, never American football ones (no helmets, no shoulder pads,'
  + ' no yard lines, no goal posts shaped like an H on a pole).'
