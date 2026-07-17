// Qual painel serve de ÂNCORA de cenário para um dado painel de uma tirinha (ou null).
// Lógica PURA (sem disco), compartilhada entre o server (que anexa a imagem do âncora
// como referência na geração) e o front (que mostra "herda o cenário do painel X").
// O check de "o âncora já existe em disco" fica em cada lado; aqui é só a resolução.
//
// De propósito NÃO é o painel vizinho anterior (cadeia): herdar do vizinho acumula drift
// painel a painel (o mesmo motivo pelo qual não se "estende" vídeo). Todos herdam de UM
// painel-âncora, então não há acúmulo e os painéis rodam em paralelo depois do âncora.
//
// Precedência: `painel.herdaCenarioDe` (âncora explícita por painel, permite grupos de
// cenário numa tira que troca de set) > `quadrinho.cenarioFixo` (a tira herda do 1º painel).
export function numeroAncoraCenario(quad, painel) {
  if (!quad || !painel) return null
  const nums = (quad.paineis || []).map((p) => p.numero)
  const primeiro = nums.length ? Math.min(...nums) : null
  let ancora = null
  if (Number.isInteger(painel.herdaCenarioDe)) ancora = painel.herdaCenarioDe
  else if (quad.cenarioFixo && painel.numero !== primeiro) ancora = primeiro
  if (ancora == null || ancora === painel.numero) return null
  // o âncora tem que ser um painel que existe na tira
  return nums.includes(ancora) ? ancora : null
}
