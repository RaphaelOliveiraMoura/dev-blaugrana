// bola-svg.mjs — O DESENHO DA BOLA, num lugar só.
//
// POR QUE AQUI E NÃO DENTRO DO MOTOR: a bola precisa aparecer em três lugares (o vídeo, a tela de
// Objetos do studio e qualquer preview futuro), e um desenho copiado é um desenho que diverge. O
// preview que mostra uma bola diferente da que o vídeo desenha é pior que preview nenhum, porque
// mente com confiança. Aqui o markup é gerado por função e todo consumidor pede pra ela.
//
// A BOLA É CÓDIGO E NÃO SPRITE, e a razão está em objeto.mjs: forma perfeita em qualquer tamanho,
// sombra que descola do chão ao subir e giro proporcional à distância rolada. Nenhuma geração de
// imagem entrega as três, e ainda cobraria por vídeo.
//
// DUAS CAMADAS, e a separação não é capricho:
//   `bolaCorpo` gira com a rolagem (é a superfície da bola)
//   `bolaLuz`   NÃO gira (a luz vem do mundo)
// Juntar as duas num SVG só faz a mancha de luz girar junto, e aí a bola cintila em vez de rolar.

// paleta: o mesmo preto de contorno dos personagens (rabisco-riso é definido pelo peso do traço)
const TINTA = '#1c1c1c';
const COSTURA = '#23201c';
const COURO = '#fbfaf4';

// `id` prefixa os clipPath: dois SVGs na mesma página com o mesmo id fazem um recortar pelo outro,
// e o sintoma (metade da bola some) não parece um problema de id.
export function bolaCorpo({ r = 34, id = 'b' } = {}) {
  return `<svg width="${r * 2}" height="${r * 2}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs><clipPath id="${id}-disco"><circle cx="50" cy="50" r="45"/></clipPath></defs>
  <circle cx="50" cy="50" r="45" fill="${COURO}"/>
  <g clip-path="url(#${id}-disco)">
    <polygon points="50,31 65,42 59,60 41,60 35,42" fill="${COSTURA}"/>
    <g stroke="${COSTURA}" stroke-width="3.4" stroke-linecap="round" fill="none">
      <path d="M50,31 L50,10"/><path d="M65,42 L84,35"/><path d="M59,60 L71,77"/>
      <path d="M41,60 L29,77"/><path d="M35,42 L16,35"/>
    </g>
    <g fill="${COSTURA}">
      <path d="M50,-2 L60,3 L57,13 L43,13 L40,3 Z"/>
      <path d="M99,33 L100,45 L90,46 L85,35 L91,28 Z"/>
      <path d="M1,33 L0,45 L10,46 L15,35 L9,28 Z"/>
      <path d="M78,93 L68,86 L73,77 L86,81 L85,89 Z"/>
      <path d="M22,93 L32,86 L27,77 L14,81 L15,89 Z"/>
    </g>
  </g>
  <circle cx="50" cy="50" r="45" fill="none" stroke="${TINTA}" stroke-width="6"/>
</svg>`;
}

// Chapada de propósito: risografia não tem degradê realista, tem mancha de tinta com opacidade.
export function bolaLuz({ r = 34, id = 'b' } = {}) {
  return `<svg width="${r * 2}" height="${r * 2}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs><clipPath id="${id}-luz"><circle cx="50" cy="50" r="45"/></clipPath></defs>
  <g clip-path="url(#${id}-luz)">
    <ellipse cx="70" cy="80" rx="42" ry="36" fill="${TINTA}" opacity="0.13"/>
  </g>
</svg>`;
}

// as duas empilhadas, para PREVIEW parado (tela de Objetos). No vídeo elas viajam separadas,
// porque lá uma gira e a outra não.
export function bolaPreview({ r = 90 } = {}) {
  return `<svg width="${r * 2}" height="${r * 2}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <clipPath id="p-disco"><circle cx="50" cy="50" r="45"/></clipPath>
  </defs>
  <circle cx="50" cy="50" r="45" fill="${COURO}"/>
  <g clip-path="url(#p-disco)">
    <polygon points="50,31 65,42 59,60 41,60 35,42" fill="${COSTURA}"/>
    <g stroke="${COSTURA}" stroke-width="3.4" stroke-linecap="round" fill="none">
      <path d="M50,31 L50,10"/><path d="M65,42 L84,35"/><path d="M59,60 L71,77"/>
      <path d="M41,60 L29,77"/><path d="M35,42 L16,35"/>
    </g>
    <g fill="${COSTURA}">
      <path d="M50,-2 L60,3 L57,13 L43,13 L40,3 Z"/>
      <path d="M99,33 L100,45 L90,46 L85,35 L91,28 Z"/>
      <path d="M1,33 L0,45 L10,46 L15,35 L9,28 Z"/>
      <path d="M78,93 L68,86 L73,77 L86,81 L85,89 Z"/>
      <path d="M22,93 L32,86 L27,77 L14,81 L15,89 Z"/>
    </g>
    <ellipse cx="70" cy="80" rx="42" ry="36" fill="${TINTA}" opacity="0.13"/>
  </g>
  <circle cx="50" cy="50" r="45" fill="none" stroke="${TINTA}" stroke-width="6"/>
</svg>`;
}
