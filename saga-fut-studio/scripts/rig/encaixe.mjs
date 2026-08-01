// encaixe.mjs — ONDE A EXPRESSÃO SE ENCAIXA NA SPRITE DO CORPO.
//
// A troca de rosto só funciona se a cabeça nova cair EXATAMENTE em cima da antiga. Chutar isso faz
// a cabeça pular no primeiro corte, que é o defeito que estraga a ilusão inteira.
//
// A primeira versão usou `larguraCabeca` nas duas imagens e a cabeça saiu grande: aquela função mede
// numa faixa relativa à altura da IMAGEM, e numa folha de rosto (que é só cabeça) essa faixa cai no
// alto do crânio, que é mais estreito que a cabeça. Medida errada, escala errada. Aqui a largura é
// medida na região que É a cabeça em cada uma das duas: o terço de cima do corpo, e a imagem de
// rosto sem o pescoço.
import sharp from '/Users/raphaeloliveira/projects/dev-blaugrana/saga-fut-studio/node_modules/sharp/dist/index.mjs';

export async function medir(caminho) {
  const { data, info } = await sharp(caminho).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  let minX = W, minY = H, maxX = 0, maxY = 0;
  for (let p = 0; p < W * H; p++) {
    if (data[p * 4 + 3] > 40) {
      const x = p % W, y = (p / W) | 0;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }
  return { data, W, H, minX, minY, maxX, maxY };
}

// largura máxima do desenho numa faixa vertical, dada em fração da altura do CORPO desenhado
export function larguraMaxNaFaixa(m, f0, f1) {
  const alt = m.maxY - m.minY + 1;
  const y0 = m.minY + Math.round(alt * f0), y1 = m.minY + Math.round(alt * f1);
  let melhor = 0, cxMelhor = (m.minX + m.maxX) / 2;
  for (let y = y0; y <= y1; y++) {
    let x1 = null, x2 = null;
    for (let x = m.minX; x <= m.maxX; x++) if (m.data[(y * m.W + x) * 4 + 3] > 40) { if (x1 === null) x1 = x; x2 = x; }
    if (x1 !== null && x2 - x1 + 1 > melhor) { melhor = x2 - x1 + 1; cxMelhor = (x1 + x2) / 2; }
  }
  return { largura: melhor, cx: cxMelhor };
}

// A LINHA DO PESCOÇO: a altura em que o desenho é mais ESTREITO entre a cabeça e o tronco.
// É o gargalo natural de qualquer figura humana, e por isso não precisa ser marcado à mão em
// personagem nenhum: procura-se o mínimo de largura na faixa onde o pescoço tem que estar.
// A faixa padrão é ESTREITA de propósito. Com 0.18 a 0.52 o mínimo caiu na CINTURA (117px de
// largura, largo demais para um pescoço) e o corte comeu os ombros, abrindo um vão entre a cabeça
// e a camisa. Num personagem de três cabeças o pescoço vive entre 28% e 46% da altura, logo abaixo
// do queixo e logo acima da linha dos ombros.
export function linhaDoPescoco(m, f0 = 0.28, f1 = 0.46) {
  const alt = m.maxY - m.minY + 1;
  const y0 = m.minY + Math.round(alt * f0), y1 = m.minY + Math.round(alt * f1);
  let melhorY = y0, melhorW = Infinity, cx = (m.minX + m.maxX) / 2;
  for (let y = y0; y <= y1; y++) {
    let x1 = null, x2 = null;
    for (let x = m.minX; x <= m.maxX; x++) if (m.data[(y * m.W + x) * 4 + 3] > 40) { if (x1 === null) x1 = x; x2 = x; }
    if (x1 === null) continue;
    const w = x2 - x1 + 1;
    if (w < melhorW) { melhorW = w; melhorY = y; cx = (x1 + x2) / 2; }
  }
  return { y: melhorY, largura: melhorW, cx };
}

// O CORPO SEM CABEÇA: apaga tudo acima da linha do pescoço.
//
// POR QUE ISTO É OBRIGATÓRIO: colar a expressão POR CIMA da sprite deixa a cabeça original embaixo.
// Como a nova é desenhada um pouco diferente, a antiga aparece por trás e o personagem fica com
// DUAS cabeças. Trocar de cabeça só funciona se a antiga deixar de existir.
export async function corpoSemCabeca(corpoAbs, { folga = 6 } = {}) {
  const m = await medir(corpoAbs);
  const pescoco = linhaDoPescoco(m);
  const corte = pescoco.y + folga;   // corta um pouco ABAIXO, a cabeça nova cobre a diferença
  const { data } = m;
  for (let y = 0; y < corte; y++) for (let x = 0; x < m.W; x++) data[(y * m.W + x) * 4 + 3] = 0;
  const png = await sharp(data, { raw: { width: m.W, height: m.H, channels: 4 } }).png().toBuffer();
  return { png, pescoco, corte };
}

// Escala e posição para colar a expressão sobre a sprite do corpo.
// `fCabeca` é quanto do corpo é cabeça: 0.36 num personagem de três cabeças (o padrão da casa).
export async function encaixeDoRosto(corpoAbs, rostoAbs, { fCabeca = 0.36 } = {}) {
  const corpo = await medir(corpoAbs);
  const face = await medir(rostoAbs);
  // no corpo: a cabeça é o terço de cima. no rosto: tudo menos o pescoço.
  const noCorpo = larguraMaxNaFaixa(corpo, 0.04, fCabeca);
  const noRosto = larguraMaxNaFaixa(face, 0.04, 0.82);
  const k = noCorpo.largura / noRosto.largura;
  // ALINHA PELO PESCOÇO, não pelo topo do crânio. Alinhar pelo topo deixa a diferença de altura
  // sobrar embaixo, e é ali que fica o buraco entre a cabeça nova e o tronco cortado. Pelo pescoço,
  // a junção fecha e o que sobra vai para cima, onde não há nada.
  const pescocoCorpo = linhaDoPescoco(corpo);
  const pescocoRosto = linhaDoPescoco(face, 0.55, 0.99);
  return {
    k,
    left: Math.round(pescocoCorpo.cx - pescocoRosto.cx * k),
    top: Math.round(pescocoCorpo.y - (pescocoRosto.y - 0) * k),
    larguraCabecaCorpo: noCorpo.largura,
    larguraCabecaRosto: noRosto.largura,
    pescocoCorpo, pescocoRosto,
  };
}
