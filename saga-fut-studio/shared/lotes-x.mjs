// COMO O X PARTE O CARROSSEL EM POST + RESPOSTAS.
//
// O compositor aceita no máximo 4 imagens por post. Cortar de 4 em 4 deixa resto feio
// (6 → 4+2, 9 → 4+4+1): o último post fica manco e o miolo da história cai na resposta
// errada. A regra é fechar em grupos de 4 e 3, preferindo 4 (menos tweets), e só cair
// pra 3 quando o resto de 4 seria 1 ou 2.
//
// Casos que o Raphael pediu: 6→3+3, 7→4+3, 8→4+4. 9 vira 3+3+3, não 4+4+1.
// 5 não fecha em 3 e 4: fica 3+2. 1 e 2 são um post só.

export function tamanhosLoteX(n) {
  const N = Math.max(0, Math.floor(Number(n) || 0))
  if (N === 0) return []
  if (N <= 4) return [N]
  if (N === 5) return [3, 2]
  const max4 = Math.floor(N / 4)
  for (let a = max4; a >= 0; a--) {
    const resto = N - 4 * a
    if (resto === 0) return Array(a).fill(4)
    if (resto % 3 === 0) return [...Array(a).fill(4), ...Array(resto / 3).fill(3)]
  }
  return [N]
}

export function partirEmLotesX(itens) {
  const list = Array.isArray(itens) ? itens : []
  const lotes = []
  let i = 0
  for (const t of tamanhosLoteX(list.length)) {
    lotes.push(list.slice(i, i + t))
    i += t
  }
  return lotes
}
