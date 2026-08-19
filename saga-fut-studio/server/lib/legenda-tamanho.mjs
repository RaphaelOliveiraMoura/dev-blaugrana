// A LEGENDA CABE NA CAIXA? A régua irmã do corte, e a que ataca a CAUSA.
//
// POR QUE EXISTE: o corte de frase entre duas caixas (shared/legenda-corte.mjs) é o sintoma; a
// doença é a legenda longa. Medido no acervo em 18/08/2026: 81 caracteres na mediana, 166 no
// pior painel, e 74 dos 159 painéis com frase partida NÃO CABEM numa caixa de três linhas nem
// depois de juntados. Quem quebrou em duas caixas não queria dois tempos de leitura: queria
// fazer caber. Sem esta régua, barrar o corte só empurra o problema pra caixa gigante.
//
// O TETO NÃO É LIMITE, É ALVO. O lib/legenda.mjs encolhe o corpo até o piso tentando caber em
// três linhas e, se não couber, desenha quatro ou cinco assim mesmo — sem erro, sem aviso. A
// legenda vira uma parede que tampa a arte, e ninguém descobre até olhar o slide pronto.
//
// Vive fora do `shared/` porque medir exige a FONTE (opentype): o front não carrega .ttf.
import { linhasPorCaixa, MAX_LINHAS } from './legenda.mjs'
import { legendaPorCodigo } from '../../shared/quadrinho-config.mjs'

export function problemaNoTamanhoDasLegendas(quad) {
  if (!legendaPorCodigo(quad)) return null
  for (const p of (quad?.paineis || [])) {
    const textos = (p?.legendas || []).map((t) => String(t || '').trim()).filter(Boolean)
    if (!textos.length) continue
    const grande = linhasPorCaixa({ textos }).find((c) => c.linhas > MAX_LINHAS)
    if (!grande) continue
    return `Quadrinho "${quad.id}", painel ${p.numero}: a caixa de legenda ocupa ${grande.linhas} linhas `
      + `no corpo mínimo (o teto é ${MAX_LINHAS}), e vira uma parede que tampa a arte.\n`
      + `  [${grande.texto}]\n`
      + '  O texto está longo demais para um painel de carrossel. Corte PALAVRA (adjetivo, aposto, '
      + 'repetição do que o painel anterior já disse) ou reparta o FATO em dois painéis. Repartir a '
      + 'mesma frase em duas caixas não resolve: são duas molduras para uma frase só.'
  }
  return null
}
