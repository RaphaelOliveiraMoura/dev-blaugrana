// Remove a MOLDURA que o Grok desenha em volta do cenário (margem de papel + traço grosso).
// Cenário do vídeo tem que sangrar até a borda: qualquer faixa em volta vira uma listra parada na
// tela quando a câmera navega o panorama.
//
// Duas etapas, as duas medidas em vez de chutadas:
//   1. a margem de papel: linhas de borda cuja cor é quase constante E igual à cor do canto.
//   2. o traço: linhas de borda escuras (luminância média baixa).
import sharp from 'sharp';

const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

// Estatística de uma linha/coluna: média por canal e desvio máximo.
function faixa(data, w, h, canais, { eixo, i }) {
  const n = eixo === 'y' ? w : h;
  let sr = 0, sg = 0, sb = 0;
  const px = [];
  for (let k = 0; k < n; k++) {
    const x = eixo === 'y' ? k : i;
    const y = eixo === 'y' ? i : k;
    const o = (y * w + x) * canais;
    px.push([data[o], data[o + 1], data[o + 2]]);
    sr += data[o]; sg += data[o + 1]; sb += data[o + 2];
  }
  const m = [sr / n, sg / n, sb / n];
  let desvio = 0;
  for (const p of px) desvio = Math.max(desvio, Math.abs(p[0] - m[0]), Math.abs(p[1] - m[1]), Math.abs(p[2] - m[2]));
  return { media: m, desvio };
}

export async function removerMoldura(caminho, { maxFracao = 0.12 } = {}) {
  const img = sharp(caminho);
  const meta = await img.metadata();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: c } = info;
  const limite = { x: Math.floor(w * maxFracao), y: Math.floor(h * maxFracao) };

  const canto = [data[0], data[1], data[2]];
  const pertoDoCanto = (m) => Math.abs(m[0] - canto[0]) < 18 && Math.abs(m[1] - canto[1]) < 18 && Math.abs(m[2] - canto[2]) < 18;

  // FOLGA DE TRANSIÇÃO: entre a margem de papel e o traço preto há 1 ou 2 linhas borradas que não
  // são nem uma coisa nem outra. Parar nelas deixava o traço no lugar (medido: sobrava o contorno
  // preto em 3 lados). Então a varredura tolera algumas linhas ambíguas, mas o corte só avança
  // sobre linha que é comprovadamente margem ou traço.
  const FOLGA = 3;
  const varrer = (eixo, deTras) => {
    const total = eixo === 'y' ? h : w;
    const lim = eixo === 'y' ? limite.y : limite.x;
    let corte = 0;
    let ambiguas = 0;
    for (let k = 0; k < lim; k++) {
      const i = deTras ? total - 1 - k : k;
      const f = faixa(data, w, h, c, { eixo, i });
      const papel = f.desvio < 22 && pertoDoCanto(f.media);   // margem de papel
      const traco = lum(...f.media) < 110;                     // traço escuro da moldura
      if (papel || traco) { corte = k + 1; ambiguas = 0; continue; }
      if (++ambiguas > FOLGA) break;
    }
    return corte;
  };

  const top = varrer('y', false);
  const bottom = varrer('y', true);
  const left = varrer('x', false);
  const right = varrer('x', true);
  // MOLDURA ENVOLVE. Só é moldura se as QUATRO bordas tiverem a faixa: é isso que a distingue de um
  // CÉU chapado, que também é uniforme e na cor do papel, mas só existe em cima (embaixo tem chão,
  // de outra cor). Sem esta trava o panorama do Codex perdia 58px de céu de verdade.
  if (!(top && bottom && left && right)) return { cortou: false, meta };

  const box = { left, top, width: w - left - right, height: h - top - bottom };
  const buf = await sharp(caminho).extract(box).png().toBuffer();
  await sharp(buf).toFile(caminho);
  return { cortou: true, box, antes: [w, h], depois: [box.width, box.height] };
}

// modo CLI: node moldura.mjs <arquivo> [...]
// a guarda padrão da casa: `process.argv[1]` é undefined quando o módulo é importado por
// `node -e` ou por um loader, e aí a checagem por nome de arquivo derrubava o import inteiro
if (import.meta.url === `file://${process.argv[1]}`) {
  for (const f of process.argv.slice(2)) {
    const r = await removerMoldura(f);
    console.log(f, r.cortou ? `cortou ${JSON.stringify(r.box)} ${r.antes.join('x')} -> ${r.depois.join('x')}` : 'sem moldura');
  }
}
