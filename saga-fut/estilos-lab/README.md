# Laboratório de Estilos (SagaFut)

Testes de identidade visual: qual traço vira a **assinatura** do projeto. Todos os testes
usam o **mesmo assunto** (atacante comemorando gol, goleiro rival de joelhos, a palavra
"GOL" pra testar a letra, estrela dourada no lugar do escudo) pra que a **única variável
seja o estilo**.

Gerados via `providers/codex-image.mjs` (Codex CLI / gpt-image-2, franquia ChatGPT Plus).
O `stylePrefix` de cada teste está listado abaixo: é só colar no catálogo de **Estilos** do
studio quando um vencer.

## Notas do Raphael (14/07/2026)

Puxou pra **limpo, chapado, gráfico e geométrico**. Os texturizados/vintage (grão, papel,
nanquim, canetão) agradaram menos. Expressão cômica forte é desejada, mas sem acabamento
brilhoso de "cartoon de app".

| Estilo | Nota |
|---|---|
| j1 bold clássico | **bem legal** |
| j3 UPA angular | **bem legal** |
| j4 cabeção | tem potencial, precisa trabalhar algum aspecto |
| j8 nanquim 3 cores | legalzin |
| j2 granulado de gibi | legalzin |
| j6 marcador de feltro | legalzin |
| j5 setentista quente | legalzin |
| j7 pop vivo moderno | (o mais genérico da leva) |

## Lote 1: famílias diferentes (`lote-1-familias/`)

Varredura ampla, pra achar a família. Conclusão: a família **cartoon 2D** é a que casa
com o registro cômico; as demais ficam de reserva (cordel para a pista épica).

1. `1-cordel-xilogravura` — xilogravura/cordel nordestino, preto e branco de alto contraste.
2. `2-charge-nanquim` — charge de caderno de esportes, nanquim e hachura, narigão.
3. `3-figurinha-panini` — figurinha brilhosa de álbum da Copa, moldura holográfica.
4. `4-risograph-2cores` — risografia 2 cores (azul + laranja), grão de meio-tom.
5. `5-anime-esportivo` — anime esportivo shonen, linhas de velocidade.
6. `6-colagem-recorte` — colagem de papel rasgado, feito à mão.

## Lote 2: variações cartoon retrô (`lote-2-cartoon-retro/`)

Raiz comum de todas: `flat hand-drawn 2D cartoon in the spirit of retro Brazilian TV
animation (do NOT copy any existing character designs), expressive simple faces, cartoon
comedy energy` + o twist de cada uma:

- `j1-bold-classico` — `confident BOLD black outlines of even weight, flat cel colors, mid-century modern shapes, muted slightly desaturated vintage palette`
- `j2-granulado-impresso` — `visible halftone dot grain and paper texture, slightly off-register colors, warm aged newsprint tones, thin ink outlines`
- `j3-upa-angular` — `sharp ANGULAR geometric stylized shapes, flattened graphic perspective, very limited flat color palette, minimal detail, mid-century poster feel`
- `j4-cabecao-rubberhose` — `very big heads on small bodies, rounded rubber-hose limbs, squash-and-stretch, extra goofy over-expressive faces`
- `j5-setentista-quente` — `warm 1970s animation palette: mustard, burnt orange, olive, cream; soft aged textured-paper look`
- `j6-marcador-feltro` — `thick felt-tip marker: chunky slightly wobbly outlines of varying weight, flat marker fills, imperfect handmade line`
- `j7-pop-vivo-moderno` — `VIVID saturated high-contrast colors, clean crisp bold outlines, punchy contemporary palette`
- `j8-nanquim-3cores` — `crosshatch and ink-line texture for shading, strictly limited 3-color palette plus black, hand-inked feel`

## Lote 3: alavancas de identidade (`lote-3-identidade/`)

Parte da base preferida (limpo/chapado/geométrico do j1+j3, com a expressão do j4) e testa
**uma alavanca de marca por imagem**. A tese: o que faz alguém reconhecer que a imagem é
sua não é o traço em si, e sim o **sistema travado** em volta dele (paleta fechada,
fórmula de rosto, cor de contorno, fundo, letra, selo). Ver a tabela no próprio lote.
