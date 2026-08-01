// estilos.mjs — CATÁLOGO DE LINGUAGENS VISUAIS candidatas do SagaFut.
//
// POR QUE EXISTE: o projeto tem UM estilo (rabisco-riso) e tudo que foi construído em cima dele
// (ficha de personagem, model sheet, folha de movimento, ficha de cenário) reforça esse estilo.
// Trocar de estilo não é trocar um prompt: é regerar o acervo. Então a decisão precisa ser tomada
// ANTES, olhando, e com a identidade dos personagens que já existem preservada — senão a troca
// custa o elenco inteiro e só depois se descobre se ficou bom.
//
// Cada entrada aqui é um CAMINHO DIFERENTE, não uma variação do mesmo. O que muda entre eles é o
// MEIO (traço, preenchimento, luz), não o personagem: em todos, o rosto, o cabelo, o kit e o número
// continuam sendo os mesmos, porque é o número real na camisa que dá reconhecimento sem citar nome.
//
// `nota` é o que muda NA PRODUÇÃO se o estilo for escolhido — é a parte que não dá pra ver na
// imagem e é justamente a que decide (um estilo lindo que exige regerar 97 personagens não é o
// mesmo negócio que um que reaproveita as folhas).

export const ESTILOS_TESTE = {
  'anime-cel': {
    rotulo: 'Anime esportivo',
    nota: 'dramático, o oposto do humor bobo; a piada teria que vir do exagero sério',
    prompt: 'Japanese sports anime cel-shading, in the style of a modern football anime. Clean thin '
      + 'ink lines of even weight, flat colour fills with EXACTLY TWO tones per surface (base colour '
      + 'plus one hard-edged shadow shape, no gradients, no airbrush). Expressive large eyes with '
      + 'sharp highlights, angular eyebrows, dynamic foreshortened limbs, speed lines behind fast '
      + 'movement. Slightly desaturated cinematic palette with strong rim light.',
  },
  'vetor-chapado': {
    rotulo: 'Vetor chapado (motion graphics)',
    nota: 'acabamento de canal/vinheta esportiva; sem contorno preto, escala muito bem no feed',
    prompt: 'Modern flat vector illustration, editorial / broadcast motion-graphics look. NO black '
      + 'outlines at all: shapes are defined by flat colour against flat colour. Geometric simplified '
      + 'anatomy built from clean curves, slightly stylised long limbs, faces reduced to a few marks. '
      + 'Limited palette of four or five flat colours plus one bright accent, subtle long diagonal '
      + 'shadows, generous negative space. Crisp, graphic, poster-like.',
  },
  'cartoon-90': {
    rotulo: 'Cartoon de TV anos 90',
    nota: 'o mais perto do humor da casa; traço grosso e elástico, feito pra deformar',
    prompt: '1990s western TV cartoon style (Nickelodeon / Cartoon Network era). Thick black outlines '
      + 'of VARYING weight (heavy on the silhouette, thin inside), rubbery elastic anatomy that '
      + 'squashes and stretches, bold saturated colours with flat fills and no gradients, big '
      + 'cartoonish hands and feet, wide open mouths, eyes of different sizes, wonky energetic '
      + 'construction lines. Loose, snappy, made to be animated.',
  },
  'papel-recorte': {
    rotulo: 'Papel recortado',
    nota: 'textura artesanal, cada membro é uma peça: casa perfeitamente com animação por recorte',
    prompt: 'Paper cutout collage animation style (stop-motion look). Every part of the character is a '
      + 'separate piece of textured coloured paper with visible torn or scissor-cut edges, layered '
      + 'with a soft drop shadow between layers so the depth is physical. Visible paper grain and '
      + 'slight fibre texture, matte handmade colours, tiny imperfections in the cuts. Simple bold '
      + 'shapes, no fine line detail, no digital gradients.',
  },
  'giz-tatico': {
    rotulo: 'Quadro tático a giz',
    nota: 'nasce falando de futebol; fundo escuro resolve cenário quase de graça',
    prompt: 'Tactics blackboard style: dark slate green-black background, everything drawn in white '
      + 'chalk with grainy dusty strokes, scratchy hatching for volume, smudges and eraser marks. '
      + 'One or two accent chalk colours only (yellow and red) used sparingly on the kit. Tactical '
      + 'arrows, dotted movement lines and small circles around the figure, like a coach diagram that '
      + 'came alive. Hand-drawn, imperfect, high contrast.',
  },
  'pixel-16bit': {
    rotulo: 'Pixel art 16 bits',
    nota: 'nostalgia de videogame de futebol; sprite pequeno lê mal no close, ótimo no plano geral',
    prompt: '16-bit pixel art sprite, Super Nintendo era football game look. Chunky visible square '
      + 'pixels on a strict grid, limited indexed palette of about sixteen colours, hard dithering '
      + 'for shading, black or dark outline of exactly one pixel, tiny readable face made of a few '
      + 'pixels. Clean sprite silhouette, no anti-aliasing, no soft edges, no modern effects.',
  },
  'massinha-3d': {
    rotulo: 'Massinha (claymation)',
    nota: 'volume e luz de verdade; é 3D, então a folha de sprite atual não serve',
    prompt: 'Stop-motion claymation look: the character is sculpted from soft modelling clay, with '
      + 'visible fingerprint dents, thumb marks and slightly uneven surfaces. Chunky rounded toy-like '
      + 'proportions, matte clay finish, soft studio lighting with gentle shadows, tiny seams where '
      + 'clay parts meet. Physical, tactile, handmade miniature feel.',
  },
  'traco-jornal': {
    rotulo: 'Charge de jornal',
    nota: 'a linguagem do Momani de verdade: composição de charge, movimento mínimo, arte cara',
    prompt: 'Newspaper editorial cartoon style: confident brush-and-ink drawing with expressive '
      + 'varying line weight, cross-hatching and stippling for shadow, caricature exaggeration of the '
      + 'head and features. Colour applied as loose flat watercolour washes that slightly overflow the '
      + 'ink lines, warm off-white paper tone showing through. Looks printed on newsprint.',
  },
  'retro-gibi': {
    rotulo: 'Gibi anos 60',
    nota: 'retícula e cor fora de registro; barulhento no feed, ótimo pra quadrinho',
    prompt: '1960s comic book print look: bold black ink outlines, colour applied as visible Ben-Day '
      + 'halftone dot screens with the registration slightly OFF so the colours misalign with the '
      + 'linework, limited four-colour printing palette, aged newsprint paper tone, subtle print '
      + 'texture and ink bleed. Dramatic comic-panel posing.',
  },
  'lambe-serigrafia': {
    rotulo: 'Lambe-lambe serigrafado',
    nota: 'cartaz de rua: 3 cores e muito contraste, lê a 3 metros de distância',
    prompt: 'Screen-printed gig-poster style: only THREE flat ink colours plus the paper, heavy '
      + 'contrast, shapes built from bold silhouettes and cut-out negative space, visible ink texture '
      + 'and slight misprint offset between the colour layers, coarse grain. Graphic and punchy, like '
      + 'a poster pasted on a wall.',
  },
  'sticker-vivo': {
    rotulo: 'Figurinha (sticker)',
    nota: 'contorno branco grosso; nasce recortado do fundo, é o formato do próprio elenco',
    prompt: 'Die-cut sticker illustration: the character is drawn with a THICK WHITE outline all '
      + 'around the silhouette, like a cut vinyl sticker, plus a thinner dark inner line. Vivid '
      + 'saturated colours, simple cel shading with one soft shadow tone, glossy clean finish, chunky '
      + 'friendly proportions. Reads perfectly small.',
  },
  '3d-toon': {
    rotulo: '3D com contorno (cel-shaded)',
    nota: 'volume de 3D com leitura de cartoon; abandona a folha 2D e vira outro pipeline',
    prompt: 'Stylised 3D cel-shaded render, like a modern toon-shaded video game: real three-'
      + 'dimensional volume and soft ambient occlusion, but shaded in banded flat tones with a clean '
      + 'dark contour line around the silhouette. Slightly exaggerated cartoon proportions, matte '
      + 'materials, soft key light from above.',
  },
};

export const ESTILOS_TESTE_IDS = Object.keys(ESTILOS_TESTE);

// A CENA DE PROVA é a mesma pra todos os estilos, senão a comparação não é comparação: se cada
// candidato desenha uma pose diferente, o que se julga é a pose. Corrida em passada larga é o que
// o motor mais faz, então é ela que precisa parecer boa.
export const CENA_PROVA = 'full body, mid-stride sprinting to the right, one arm forward and one '
  + 'back, both feet off the ground, leaning into the run, mouth open with effort. Behind him a very '
  + 'simple football training pitch (green grass, a low wall or fence line, plain sky), drawn in the '
  + 'SAME style, kept minimal so the character reads clearly.';

export const dirTestes = 'estilos/testes';
export const arquivoTeste = (slug, estilo) => `${dirTestes}/${slug}__${estilo}.png`;
