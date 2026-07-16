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
