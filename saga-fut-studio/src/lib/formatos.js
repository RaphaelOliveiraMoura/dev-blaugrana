// Formatos e tipos de quadrinho: proporção do painel (aspect-ratio p/ o front,
// orientação p/ o gerador) e quantos painéis cada tipo nasce com.

// 3:4 primeiro: é o padrão dos quadrinhos (16/07/2026). Charge é imagem estática de
// painel único com personagem em pé e cenário, e o retrato respira onde o quadrado
// espremia (ficou ruim no feed). O tamanho exato de cada formato mora no servidor
// (DIM em prompts.mjs) e é garantido pela trava de normalização pós-geração; aqui é só
// a proporção pro preview do studio.
export const FORMATOS = {
  '3:4': { label: 'Retrato 3:4', ar: '3 / 4' },
  '4:5': { label: 'Retrato 4:5', ar: '4 / 5' },
  '1:1': { label: 'Quadrado 1:1', ar: '1 / 1' },
  '9:16': { label: 'Vertical 9:16', ar: '9 / 16' },
}

export const TIPOS_QUADRINHO = {
  charge: { label: 'Charge (1 painel)', nPaineis: 1 },
  tirinha: { label: 'Tirinha (2-4 painéis)', nPaineis: 2 },
  carrossel: { label: 'Carrossel (6-10 painéis)', nPaineis: 6 },
}

// FORMATOS DO POST: o recorte com que os slides são EXPORTADOS, sobre a mesma arte.
//
// Não confundir com FORMATOS acima, que é a proporção em que a IA DESENHA o painel (vira `dim` e
// `orient` no prompt). Mudar o da arte faz os próximos painéis nascerem em outra razão e custa
// regeração; mudar o do post só reenquadra o export. São duas decisões diferentes que, por terem
// o mesmo nome na tela, já quase viraram a mesma.
//
// O 3:2 só existe aqui: é recorte de feed (X com duas cenas), nunca proporção de painel.
export const FORMATOS_POST = [
  { id: '3:4', label: '3:4', nota: 'igual ao painel, sem borda extra' },
  { id: '4:5', label: '4:5', nota: 'Instagram, X' },
  { id: '1:1', label: '1:1', nota: 'qualquer feed' },
  { id: '9:16', label: '9:16', nota: 'TikTok, Shorts' },
  { id: '3:2', label: '3:2', nota: 'X, sem sobra com 2 cenas' },
]
