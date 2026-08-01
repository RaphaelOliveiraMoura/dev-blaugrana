// warp.mjs — DAR VIDA A UMA IMAGEM PARADA, sem cortar ela em pedaço nenhum.
//
// POR QUE ISTO EXISTE: a tentativa de montar o personagem peça a peça foi reprovada, e com razão —
// o corpo virava colagem. Mas o problema nunca foi "o corpo precisa de articulação": era "o corpo
// precisa parecer vivo". Isso se resolve DEFORMANDO a arte inteira, que continua sendo um desenho
// só, sem junta e sem emenda possível.
//
// COMO FUNCIONA: a imagem é reamostrada linha a linha. Para cada linha do resultado, o código
// decide DE QUE ALTURA da original ela vem e QUANTO ela desliza pro lado. Comprimir as linhas de
// uma faixa faz aquela região encolher (o peito no riso); deslocar as linhas em onda faz o corpo
// balançar. Nada disso redesenha nada: é a mesma arte, lida torto.
//
// É a técnica de squash-and-stretch da animação clássica, que é justamente o que faz um desenho
// parado ter peso e vida.
import sharp from '/Users/raphaeloliveira/projects/dev-blaugrana/saga-fut-studio/node_modules/sharp/dist/index.mjs';

// Cada efeito devolve, para uma linha `u` (0 no topo, 1 nos pés) e um instante `t` (0..1):
//   dy  quanto a linha vem de MAIS ALTO ou MAIS BAIXO na original (comprime/estica a região)
//   dx  quanto a linha desliza pro lado
// `peso` concentra o efeito onde ele faz sentido: quem está no chão não desliza, senão o
// personagem parece que está patinando em cima dos próprios pés.
export { EFEITOS, EFEITOS_IDS, EFEITOS_FORTES } from '../../shared/efeitos.mjs';
import { EFEITOS } from '../../shared/efeitos.mjs';

// Aplica o efeito a um PNG e devolve outro PNG do mesmo tamanho.
// `intensidade` 0 desliga (e o pixel volta idêntico), o que permite entrar e sair do efeito sem
// corte visível — um efeito que liga de repente denuncia o truque.
export async function deformar(png, efeito, t, { intensidade = 1 } = {}) {
  const fn = typeof efeito === 'function' ? efeito : EFEITOS[efeito];
  if (!fn || intensidade <= 0) return png;
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const out = Buffer.alloc(data.length);   // zerado = transparente

  for (let y = 0; y < H; y++) {
    const u = y / (H - 1);
    const { dy = 0, dx = 0 } = fn(u, t, intensidade);
    const ySrc = Math.round(y + dy);
    if (ySrc < 0 || ySrc >= H) continue;
    const desloc = Math.round(dx);
    for (let x = 0; x < W; x++) {
      const xSrc = x - desloc;
      if (xSrc < 0 || xSrc >= W) continue;
      const s = (ySrc * W + xSrc) * 4, d = (y * W + x) * 4;
      out[d] = data[s]; out[d + 1] = data[s + 1]; out[d + 2] = data[s + 2]; out[d + 3] = data[s + 3];
    }
  }
  return sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
}
