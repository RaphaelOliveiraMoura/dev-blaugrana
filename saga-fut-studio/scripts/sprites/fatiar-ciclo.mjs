// Fatia e normaliza a folha 2x2 de um CICLO DE LOCOMOÇÃO (andar, correr) -> 4 PNGs no canvas.
// Um lugar só, porque slice-walk e slice-run faziam exatamente a mesma coisa e um defeito
// consertado num deles não chegava no outro.
//
// POR QUE NÃO USA O placeOnCanvas (que o resto do acervo usa): ele resolve UM quadro por vez, e
// num ciclo isso produz o defeito que o gate de deriva reprova. Duas razões:
//
//   1. ELE ANCORA PELO CENTRO DOS PÉS, e o gate mede o centro do TRONCO. Numa passada os pés são
//      justamente o que mais viaja, então alinhar por eles joga o corpo pro lado oposto.
//   2. ELE ESCALA CADA QUADRO PRA CHAR_H isoladamente e depois faz clamp na borda do canvas. Com
//      a passada aberta o quadro não cabe nos 480px, o clamp cola ele na borda e leva o corpo
//      junto: no torcedor-cule (a REFERÊNCIA DE POSE de toda corrida da casa) o r1 ficava colado
//      na esquerda e o r4 na direita, com o tronco variando 143px, 25% da altura, num ciclo que
//      deveria correr NO LUGAR. Como a folha do padrão viaja como referência, o defeito era
//      copiado por todo personagem gerado depois: Ferran e Raphinha reprovavam no r4 sem que a
//      arte tivesse problema nenhum.
//
// Aqui os quatro são medidos primeiro, ganham UMA escala comum (a cabeça para de mudar de tamanho
// de brinde) e são posicionados pela âncora de tronco, a mesma que o gate cobra.
import sharp from '/Users/raphaeloliveira/projects/dev-blaugrana/saga-fut-studio/node_modules/sharp/dist/index.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { SHEET_INSET, keyMagenta, CANVAS_W, CANVAS_H, FEET_Y, CHAR_H, WIDTH_MARGIN } from './config.mjs';
import { ancoraDeTronco } from './ciclo.mjs';
import { backupFile } from '../../server/lib/arquivos.mjs';

export async function fatiarCiclo({ slug, base, pref }) {
  await mkdir(base, { recursive: true });
  const meta = await sharp(`${base}/_sheet.png`).metadata();
  const HW = Math.floor(meta.width / 2), HH = Math.floor(meta.height / 2), I = SHEET_INSET;
  const cells = [[I, I], [HW + I, I], [I, HH + I], [HW + I, HH + I]];

  // 1) mede os quatro ANTES de escrever qualquer um
  const quadros = [];
  for (let i = 0; i < 4; i++) {
    const [l, t] = cells[i], cw = HW - I * 2, ch = HH - I * 2;
    const { data, info } = await sharp(`${base}/_sheet.png`)
      .extract({ left: l, top: t, width: cw, height: ch })
      .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const bbox = keyMagenta(data, info.width, info.height);
    const tronco = ancoraDeTronco(data, info.width, bbox);
    if (tronco === null) throw new Error(`quadro ${i + 1} está vazio depois do key de magenta`);
    quadros.push({ data, W: info.width, H: info.height, bbox, tronco });
  }

  // 2) UMA escala pro ciclo todo: o quadro mais alto define, os outros seguem. Escalar cada um
  // pra mesma altura é o que fazia a cabeça inchar e murchar entre desenhos.
  const alturas = quadros.map((q) => q.bbox.maxY - q.bbox.minY + 1);
  let escala = CHAR_H / Math.max(...alturas);

  // 3) O TRONCO FICA NO MESMO X EM TODOS OS QUADROS, mas esse x não precisa ser o centro do
  // canvas. Exigir o centro custava altura à toa: numa corrida o braço vai muito à frente e a
  // perna muito atrás, então centrar o tronco reserva dos DOIS lados o espaço que só um usa, e a
  // escala tinha que cair pra caber (o torcedor-cule saía 8% menor que o resto do elenco, o que
  // quebra a escala canônica). Aqui o x comum é escolhido dentro da janela em que todo mundo
  // cabe, e a escala só cede se essa janela for vazia mesmo.
  const util = CANVAS_W - WIDTH_MARGIN;
  const esqMax = Math.max(...quadros.map((q) => q.tronco - q.bbox.minX));
  const dirMax = Math.max(...quadros.map((q) => q.bbox.maxX - q.tronco));
  if ((esqMax + dirMax) * escala > util) escala = util / (esqMax + dirMax);
  // janela válida pro x do tronco, e dentro dela o mais perto possível do centro
  const minTronco = WIDTH_MARGIN / 2 + esqMax * escala;
  const maxTronco = CANVAS_W - WIDTH_MARGIN / 2 - dirMax * escala;
  const xTronco = Math.round(Math.min(Math.max(CANVAS_W / 2, minTronco), maxTronco));

  // 4) escreve, guardando a versão anterior antes
  const saidas = [];
  for (let i = 0; i < 4; i++) {
    const { data, W, H, bbox, tronco } = quadros[i];
    const bw = bbox.maxX - bbox.minX + 1, bh = bbox.maxY - bbox.minY + 1;
    const nw = Math.max(1, Math.round(bw * escala)), nh = Math.max(1, Math.round(bh * escala));
    const recorte = await sharp(Buffer.from(data), { raw: { width: W, height: H, channels: 4 } })
      .extract({ left: bbox.minX, top: bbox.minY, width: bw, height: bh })
      .resize({ width: nw, height: nh }).png().toBuffer();
    const left = Math.round(xTronco - (tronco - bbox.minX) * escala);
    const top = Math.round(FEET_Y - nh);
    if (left < 0 || left + nw > CANVAS_W) {
      // a conta da escala devia impedir isso; se acontecer, é bug e não pode passar calado
      console.warn(`aviso: ${pref}${i + 1} não coube na janela do tronco (left=${left}, nw=${nw})`);
    }
    const png = await sharp({ create: { width: CANVAS_W, height: CANVAS_H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: recorte, left: Math.max(0, Math.min(CANVAS_W - nw, left)), top: Math.max(0, top) }])
      .png().toBuffer();
    // BACKUP ANTES DE SOBRESCREVER: o gate só roda DEPOIS que os quatro estão no disco, então uma
    // tentativa reprovada apagava o ciclo bom que estava lá e não havia como voltar. Aconteceu com
    // o Ferran e o Raphinha, e só não custou caro porque o defeito era do recorte, não da arte.
    const arq = `${base}/${pref}${i + 1}.png`;
    await backupFile(arq);
    await writeFile(arq, png);
    saidas.push({ nome: `${pref}${i + 1}`, w: nw, h: nh });
  }
  // a folha também: é dela que sai qualquer refatiamento futuro
  await backupFile(`${base}/_sheet.png`);
  return { escala, saidas };
}
