// CAMPO DESCONHECIDO NO CORPO É ERRO, NÃO É NADA.
//
// Nasceu de um caso real (12/08/2026): um pedido de montagem de post foi mandado como
// `{ quadrinhoId, modo: "mosaico" }`, achando que `modo` escolhia o produto. O endpoint não tem
// esse campo: ele tem `mosaico` e `carrossel`, dois booleanos independentes, e `carrossel` é
// false por padrão. O `modo` foi silenciosamente ignorado, os defaults valeram, e a resposta
// voltou `{ ok: true, mosaico: "..." }` sem uma palavra sobre o campo que não existe.
//
// O resultado é o modo de falhar campeão deste projeto: SUCESSO PARCIAL QUE SE DECLARA
// COMPLETO. Quatro quadrinhos ficaram com o mosaico de revisão pronto e sem os slides do post,
// e o defeito só apareceu quando alguém foi olhar a peça pra publicar. Pior: `modo: "carrossel"`
// teria devolvido exatamente a mesma coisa, e quem pediu juraria ter pedido o carrossel.
//
// A cura é da camada 2 (barrado), não da 3 (avisado): aviso ninguém lê, e aqui nem aviso havia.
// Quem erra o nome de um campo descobre no 400, não no post. E como o caso legítimo (mandar um
// campo a mais) não existe neste servidor, não há opt-out: se um chamador precisar de um campo
// novo, ele entra na lista de conhecidos junto com o código que o usa.
//
// A sugestão por distância de edição existe porque o erro real é quase sempre de UMA letra ou de
// um sinônimo: sem ela a mensagem diz "campo desconhecido" e a pessoa relê o mesmo nome errado.

// Distância de Levenshtein, só para sugerir o campo que a pessoa quis dizer.
function distancia(a, b) {
  const m = a.length, n = b.length
  let anterior = Array.from({ length: n + 1 }, (_, j) => j)
  for (let i = 1; i <= m; i++) {
    const atual = [i]
    for (let j = 1; j <= n; j++) {
      atual[j] = Math.min(
        anterior[j] + 1,
        atual[j - 1] + 1,
        anterior[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
    }
    anterior = atual
  }
  return anterior[n]
}

// Sinônimos que a pessoa tenta antes de olhar a assinatura da rota. Distância de edição sozinha
// não pega `modo` -> `carrossel` (nada parecido), e era exatamente esse o caso que doeu.
const APELIDOS = {
  modo: 'mosaico" e "carrossel',
  tipo: 'mosaico" e "carrossel',
  slides: 'carrossel',
  semSom: 'semAudio',
  mudo: 'semAudio',
  silenciar: 'semAudio',
  tempoDinamico: 'ritmo',
  dinamico: 'ritmo',
  segundosPorPainel: 'segundos',
}

function sugestao(campo, conhecidos) {
  if (APELIDOS[campo]) return APELIDOS[campo]
  const perto = conhecidos
    .map((c) => ({ c, d: distancia(campo.toLowerCase(), c.toLowerCase()) }))
    .filter((x) => x.d <= Math.max(2, Math.floor(x.c.length / 3)))
    .sort((a, b) => a.d - b.d)[0]
  return perto ? perto.c : null
}

// Devolve uma mensagem de erro, ou null se o corpo só tem campos conhecidos.
// Separado do `res` de propósito: assim o vigia consegue provar a guarda sem subir o servidor.
export function problemaNoCorpo(corpo, conhecidos, quem) {
  if (!corpo || typeof corpo !== 'object') return null
  const desconhecidos = Object.keys(corpo).filter((k) => !conhecidos.includes(k))
  if (!desconhecidos.length) return null
  const partes = desconhecidos.map((k) => {
    const s = sugestao(k, conhecidos)
    return s ? `"${k}" (você quis dizer "${s}"?)` : `"${k}"`
  })
  return `${quem}: campo desconhecido no corpo: ${partes.join(', ')}. ` +
    `Campos aceitos: ${conhecidos.join(', ')}. ` +
    `Um campo ignorado em silêncio faz o pedido parecer atendido quando não foi.`
}

// Açúcar pras rotas: devolve true se já respondeu 400 (o chamador só precisa dar return).
export function corpoInvalido(req, res, conhecidos, quem) {
  const erro = problemaNoCorpo(req.body, conhecidos, quem)
  if (!erro) return false
  res.status(400).json({ error: erro })
  return true
}
