// Formatos e tipos de quadrinho: proporção do painel (aspect-ratio p/ o front,
// orientação p/ o gerador) e quantos painéis cada tipo nasce com.

export const FORMATOS = {
  '9:16': { label: 'Vertical 9:16', ar: '9 / 16' },
  '4:5': { label: 'Retrato 4:5', ar: '4 / 5' },
  '1:1': { label: 'Quadrado 1:1', ar: '1 / 1' },
}

export const TIPOS_QUADRINHO = {
  charge: { label: 'Charge (1 painel)', nPaineis: 1 },
  tirinha: { label: 'Tirinha (2-4 painéis)', nPaineis: 2 },
  carrossel: { label: 'Carrossel (6-10 painéis)', nPaineis: 6 },
}
