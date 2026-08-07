// ciclo.mjs — O CICLO DE LOCOMOÇÃO TEM QUATRO DESENHOS, OU TEM MENOS?
//
// POR QUE EXISTE: a folha de andar do yamal-riso passou em TODOS os validadores e estava errada.
// Os quatro quadros tinham a perna quase na mesma posição: quatro variações tímidas da mesma pose.
// Na tela isso não é caminhada, é o personagem tremendo enquanto desliza. Nenhuma régua daqui pegava,
// porque todas mediam UM sprite por vez (canvas, altura, pé no chão, resíduo de magenta) e este
// defeito só existe ENTRE quadros.
//
// Medindo o acervo inteiro apareceram dois padrões, e SÓ UM DELES É DEFEITO:
//
//   1. QUADRO MORTO — dois quadros VIZINHOS quase idênticos. A animação para por um frame no meio do
//      ciclo, e é isso que o olho pega. (yamal-riso v1: w3/w4 em 6,7%; presidente-disfarcado: 1,2%)
//      É o que este arquivo BARRA.
//   2. CICLO PENDULAR — w1≈w3 e w2≈w4: os contatos são a mesma pose, o ciclo alterna duas em vez de
//      quatro. Parecia defeito e não é: numa prova direta, a folha aprovada a olho tinha w1/w3 MAIS
//      parecido (11,6%) que a reprovada (24,9%). Na tela os quadros passam em sequência e o que se lê
//      é a alternância abre/fecha. Virou AVISO depois que a régua que barrava por isso quase
//      reprovou justamente a folha aprovada.
//
// A lição que fica: régua nova se calibra contra um veredito humano, não contra o que parece certo
// em teoria. Aqui o teste barato foi comparar duas folhas do MESMO personagem, uma reprovada e uma
// aprovada, e ver qual número separava as duas.
//
// A MEDIDA é a fração de pixels que troca de cheio pra vazio na FAIXA DAS PERNAS (os 28% de baixo do
// corpo). Ignora o tronco de propósito: cabeça e braços ficam parados no ciclo de andar por contrato,
// então incluí-los diluiria justamente o que se quer medir.
import sharp from 'sharp';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { CONTEUDO, larguraCabeca } from './config.mjs';
import { dirRig, prefixoRig } from '../../shared/personagem.mjs';

// A RÉGUA QUE BARRA OLHA SÓ OS VIZINHOS (1-2, 2-3, 3-4, 4-1), porque é entre quadros vizinhos que a
// animação anda: dois deles iguais é um frame em que ela PARA, e é isso que o olho pega. Os pares
// opostos ficam no aviso (ver CICLO_TROCA_AVISO), depois de descobrir na prática que barrar por eles
// reprovaria uma folha aprovada.
//
// Calibrado no acervo em 02/08/2026, olhando folha por folha, com o mínimo entre vizinhos:
//   reprovado a olho: 0.067 (yamal v1, que tinha um par vizinho em 6,7%)
//   aprovado a olho:  0.759 (yamal v3, vizinhos todos acima de 75%)
//   o resto do acervo: 0.012 · 0.077 · 0.102 · 0.117 · 0.137 · 0.159 · 0.175 · … · 0.766
// FAIL fica logo acima do pior reprovado e AVISO onde o ciclo existe mas é chapado. Mexer nestes
// números é mexer no que entra no acervo: meça antes, e prefira medir contra um veredito humano.
export const CICLO_FAIL = 0.12;
export const CICLO_AVISO = 0.20;

// O PAR OPOSTO (w1/w3) SÓ AVISA, NÃO BARRA — e o motivo é a única evidência que vale aqui, que é o
// olho do dono do material julgando duas folhas do MESMO personagem:
//
//   reprovada por ele: vizinhos 21% · 40% · 6,7% · 28%   ·  w1/w3 = 24,9%
//   aprovada por ele:  vizinhos 78% · 76% · 77% · 76%    ·  w1/w3 = 11,6%
//
// O veredito se inverte em relação ao par oposto: ele aprovou justamente a que tem w1/w3 mais
// PARECIDO. Faz sentido na tela, onde os quadros passam em sequência 1→2→3→4 e o que o olho lê é a
// alternância abre/fecha; que os dois contatos sejam a mesma pose não aparece. O que aparece é
// quadro vizinho repetido, porque ali a animação simplesmente PARA por um frame.
//
// Uma régua que barrasse por isto teria reprovado a folha aprovada. Fica como aviso: é informação
// real sobre a folha (um ciclo com a perna trocando é melhor), mas não é motivo pra recusar arte.
export const CICLO_TROCA_AVISO = 0.20;

// A RÉGUA TEM PISO E TETO. Corrigir "a perna não se mexe" produziu na primeira tentativa o defeito
// oposto: o gerador abriu as pernas num espacate e ergueu o joelho na altura da cintura, virando
// marcha militar. Passou no gate acima com folga, porque lá quanto mais diferente melhor. Gate com
// um lado só empurra o gerador pro extremo que ele não mede.
//
// A medida é a largura das pernas dividida pela LARGURA DA CABEÇA, não pela altura do corpo: a
// altura mistura passada larga com perna curta, e reprovaria injustamente o personagem atarracado.
//
// O TETO É POR TIPO, e isso não é detalhe: a primeira versão usava um teto só, calibrado nas folhas
// de ANDAR, e reprovou cinco folhas de CORRER que estavam certas. Corrida tem passada aberta por
// definição. Gate que reprova o que está bom é gate que morre: na segunda vez que acontece, quem
// está gerando aprende a passar por cima, e aí ele não vale mais pra ninguém.
//
// Medido no acervo em 02/08/2026, por tipo, DEPOIS do lote que triplicou as folhas de andar:
//   andar  0.93 a 1.77 · reprovado a olho: 2.24
//   correr 1.26 a 2.34 (bellingham-riso a 2.34 é uma corrida boa, conferida no cartão)
//
// O teto de andar nasceu em 1.7, calibrado com as 22 folhas que existiam, e reprovou o
// szczesny-riso (1.77) na primeira rodada em que o acervo cresceu — uma folha boa, conferida no
// cartão. O goleiro é alto, magro e de cabeça pequena, e essa proporção não estava representada na
// amostra. Amostra pequena não define teto: ela define o que você AINDA não viu. Agora fica em 2.0,
// com folga acima do topo real (1.77) e abaixo do exagero real (2.24), que é o espaço onde um teto
// pega defeito sem pegar variedade de corpo.
export const CICLO_ABERTURA_MAX = { andar: 2.0, correr: 2.6 };
// QUADRO VIRADO PRO OUTRO LADO. O alvarez-riso saiu com r1, r2 e r3 correndo pra direita e r4
// correndo pra ESQUERDA: no vídeo o personagem se vira de costas por um frame e volta, a cada volta
// do ciclo. Nenhuma régua daqui pegava, porque todas olham a PERNA e este defeito é do corpo inteiro.
//
// A medida é direta e não depende de descobrir "pra que lado ele olha": compara-se cada quadro com o
// primeiro, do jeito que está e ESPELHADO. Se o espelho bate MUITO melhor que o direto, aquele
// quadro está virado ao contrário dos outros. Não há caso legítimo: os quatro quadros de um ciclo
// olham todos pro mesmo lado, por contrato.
// Dois patamares, porque a força do sinal depende de QUANTO o personagem é de perfil. Quem corre em
// 3/4 fechado tem um lado bem distinto do outro e o espelho destoa muito (pedri-espanha-riso 16x, vozinha 10x,
// torcedor-cule 9.6x). Já um personagem quase FRONTAL é quase simétrico, e aí o espelho sempre casa
// razoavelmente bem: o laporta-riso, de terno e olhando quase pra câmera, deu 1.8x sem que dê pra
// afirmar olhando o cartão que há quadro virado. Barrar nessa faixa é reprovar dúvida, então ela
// vira aviso e só o inequívoco barra.
export const CICLO_VIRADO = 2.0;         // barra
export const CICLO_VIRADO_AVISO = 1.6;   // avisa (personagem frontal cai aqui; confira o cartão)

// O PERSONAGEM ENCOLHE NO MEIO DO CICLO. No abdelkarim-riso o r2 sai com a cabeça e o corpo menores
// que os outros três: na tela ele diminui de tamanho enquanto corre, e volta. É diferente do corpo
// subir e descer (isso a corrida faz de propósito) — aqui muda a ESCALA do desenho.
//
// A régua é a largura da CABEÇA, que é a única medida que não depende da pose: perna dobra, tronco
// inclina, cabeça não muda de tamanho nunca. E a conta é a AMPLITUDE (maior sobre menor), não o
// desvio de cada quadro em relação à mediana — que era como o check-sprite media e foi exatamente
// por isso que ele aprovou esta folha: com cabeças de 223 e 252px e mediana ~240, um quadro ficava
// 7% abaixo e outro 5% acima, nenhum estourando os 8% da régua, enquanto a diferença ENTRE eles era
// de 13% e bem visível. Desvio da mediana esconde justamente o par que o olho compara.
//
// Medido no acervo: os ciclos consistentes ficam de 2 a 8% (kluivert 3, tubarao 2, raphinha 2,
// vini 2, bellingham 8) e o reprovado a olho deu 12%.
export const CICLO_ESCALA_MAX = 0.10;

// DERIVA: O CORPO ESCORREGA PRO LADO ENTRE OS QUADROS?
//
// O ciclo corre NO LUGAR — quem desloca o personagem pela tela é o motor. Se a massa do corpo anda
// sozinha dentro do canvas, na tela ele escorrega além do que o motor mandou, e o passo perde o
// contato com o chão. O slicer ancora pelo centro dos PÉS, e é justamente aí que isso escapa: os
// pés se mexem por definição numa passada, então uma passada muito assimétrica arrasta a âncora e
// leva o corpo junto.
//
// A ÂNCORA MEDIDA É CABEÇA+TRONCO (os 55% de cima), que é o que o olho segue. E a conta é o quadro
// mais desviante contra a MEDIANA dos quatro, não a amplitude: o defeito real é UM quadro fora do
// lugar, e amplitude não separou (bellingham 16% de amplitude sendo a melhor corrida do acervo).
//
// CALIBRADO NO BELLINGHAM, que é a corrida que o Raphael apontou como a melhor do acervo:
//   bellingham-riso (padrão-ouro)  11%
//   o resto do acervo               8% a 13%
//   reprovados a olho:  cucurella-riso 16% (r4 salta pra direita) · vozinha-riso 18%
// O corte fica entre o padrão-ouro e o pior aprovado de um lado, e os dois reprovados do outro.
export const CICLO_DERIVA_MAX = 0.15;
// a corrida que serve de referência de qualidade; o `--perfil` compara qualquer ciclo com ela
export const CICLO_REFERENCIA = { slug: 'bellingham-riso', tipo: 'correr' };
// fração de baixo do corpo onde a passada acontece
const FAIXA_PERNAS = 0.28;
const OPACO = 40;

async function silhueta(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  let minY = H, maxY = -1, minX = W, maxX = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (data[(y * W + x) * 4 + 3] > OPACO) {
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
  }
  if (maxY < 0) throw new Error(`${path.basename(file)} está vazio (nenhum pixel opaco)`);
  const topoPernas = Math.max(0, Math.round(maxY - (maxY - minY + 1) * FAIXA_PERNAS));
  // abertura da passada NESTE quadro, em larguras de cabeça
  let pMinX = W, pMaxX = -1;
  for (let y = topoPernas; y <= maxY; y++) for (let x = 0; x < W; x++) if (data[(y * W + x) * 4 + 3] > OPACO) {
    if (x < pMinX) pMinX = x;
    if (x > pMaxX) pMaxX = x;
  }
  const cabeca = larguraCabeca(data, W, { minX, minY, maxX, maxY });
  // centro horizontal da massa de CABEÇA+TRONCO: a âncora que não deveria escorregar (ver CICLO_DERIVA_MAX)
  const yTronco = Math.round(minY + (maxY - minY + 1) * 0.55);
  let soma = 0, quantos = 0;
  for (let y = minY; y <= yTronco; y++) for (let x = 0; x < W; x++) if (data[(y * W + x) * 4 + 3] > OPACO) { soma += x; quantos++; }
  return { data, W, H, topoPernas, bbox: { minX, minY, maxX, maxY }, cabeca,
    altura: maxY - minY + 1, ancoraX: quantos ? soma / quantos : null,
    abertura: cabeca ? (pMaxX - pMinX + 1) / cabeca : null };
}


// Silhueta da METADE DE CIMA (cabeça e tronco), recortada na própria bbox e reamostrada num grid
// fixo, pra comparar dois quadros sem que posição ou tamanho na tela interfiram. `espelhado` inverte
// o eixo x na leitura.
//
// SÓ A METADE DE CIMA, e é o que faz esta medida funcionar: no corpo inteiro as pernas mudam muito
// de quadro pra quadro, então a distância direta já é alta e o espelho não se destaca — a primeira
// versão deste gate mediu o corpo todo e deixou passar o alvarez-riso, que tinha um quadro virado
// bem visível. Cabeça e tronco ficam parados no ciclo por contrato, então é neles que a orientação
// aparece limpa. A largura da bbox continua sendo a do corpo inteiro, senão a perna estendida de um
// quadro mudaria o enquadramento do tronco e criaria diferença onde não há.
function mascara(q, espelhado = false, N = 48) {
  const { minX, minY, maxX, maxY } = q.bbox;
  const w = maxX - minX + 1, h = maxY - minY + 1;
  const hTronco = Math.max(1, Math.round(h * 0.55));
  const m = new Uint8Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const sx = minX + Math.floor(((espelhado ? N - 1 - i : i) + 0.5) * w / N);
    const sy = minY + Math.floor((j + 0.5) * hTronco / N);
    m[j * N + i] = q.data[(sy * q.W + sx) * 4 + 3] > OPACO ? 1 : 0;
  }
  return m;
}
const distancia = (a, b) => { let d = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++; return d / a.length; };

// fração de pixels da faixa das pernas em que um quadro tem corpo e o outro não
function diferenca(a, b) {
  let dif = 0, total = 0;
  const y0 = Math.min(a.topoPernas, b.topoPernas);
  for (let y = y0; y < a.H; y++) for (let x = 0; x < a.W; x++) {
    const ia = a.data[(y * a.W + x) * 4 + 3] > OPACO;
    const ib = b.data[(y * b.W + x) * 4 + 3] > OPACO;
    if (ia || ib) total++;
    if (ia !== ib) dif++;
  }
  return total ? dif / total : 0;
}

// Mede um ciclo já fatiado. `dir` é a pasta do rig, `pref` o prefixo do quadro (w, r, wL, rL).
// Devolve os 6 pares medidos e o pior deles, que é o que decide.
export async function medirCiclo(dirAbs, pref, n = 4) {
  const arquivos = Array.from({ length: n }, (_, i) => path.join(dirAbs, `${pref}${i + 1}.png`));
  const faltando = arquivos.filter((f) => !existsSync(f));
  if (faltando.length) throw new Error(`faltam quadros: ${faltando.map((f) => path.basename(f)).join(', ')}`);
  const quadros = [];
  for (const f of arquivos) quadros.push(await silhueta(f));
  const pares = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    pares.push({ a: i + 1, b: j + 1, dif: diferenca(quadros[i], quadros[j]) });
  }
  // ORIENTAÇÃO: OS QUADROS OLHAM TODOS PRO MESMO LADO?
  //
  // A primeira versão perguntava "quem discorda da maioria" e comparava cada quadro com a mediana
  // dos outros. Funciona com UM quadro virado e erra feio com dois: no cucurella-riso, r3 e r4 é que
  // estavam invertidos, e sem maioria clara o gate acusou o r1, que estava certo. Apontar o quadro
  // errado é pior que não apontar nada — manda regerar arte boa e deixa a ruim no acervo.
  //
  // Agora a pergunta não é "quem é a maioria", é "estes dois quadros olham pro mesmo lado?", par a
  // par: se a silhueta de i casa melhor com o ESPELHO de j do que com j direto, os dois estão
  // opostos. Isso é uma relação de 2 cores; se o ciclo se divide em dois grupos não vazios, ele tem
  // orientação inconsistente, e aí o defeito é reportado sem precisar eleger um culpado.
  const mDireta = quadros.map((q) => mascara(q, false));
  const mEspelho = quadros.map((q) => mascara(q, true));
  const opostos = (i, j) => {
    const direto = distancia(mDireta[i], mDireta[j]);
    const espelho = distancia(mEspelho[i], mDireta[j]);
    return { oposto: espelho > 0 && direto / espelho >= CICLO_VIRADO_AVISO, razao: espelho > 0 ? direto / espelho : 1 };
  };
  const cor = new Array(n).fill(null);
  cor[0] = 0;
  for (let passo = 0; passo < n; passo++) {
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      if (i === j || cor[i] === null || cor[j] !== null) continue;
      cor[j] = opostos(i, j).oposto ? 1 - cor[i] : cor[i];
    }
  }
  const grupoA = [], grupoB = [];
  cor.forEach((c, i) => (c === 1 ? grupoB : grupoA).push(i + 1));
  let forca = 1;
  for (const a of grupoA) for (const b of grupoB) forca = Math.max(forca, opostos(a - 1, b - 1).razao);
  // ESCALA: a cabeça é do mesmo tamanho nos quatro quadros?
  const cabecas = quadros.map((q) => q.cabeca).filter((c) => c > 0);
  const escala = cabecas.length === n
    ? { min: Math.min(...cabecas), max: Math.max(...cabecas), cabecas,
        variacao: (Math.max(...cabecas) - Math.min(...cabecas)) / Math.max(...cabecas) }
    : null;

  // DERIVA: o quadro mais desviante contra a mediana das âncoras
  const ancoras = quadros.map((q) => q.ancoraX).filter((a) => a !== null);
  let deriva = null;
  if (ancoras.length === n) {
    const alturaMax = Math.max(...quadros.map((q) => q.altura));
    const ord = [...ancoras].sort((a, b) => a - b);
    const mediana = (ord[Math.floor((n - 1) / 2)] + ord[Math.ceil((n - 1) / 2)]) / 2;
    const desvios = ancoras.map((a) => Math.abs(a - mediana) / alturaMax);
    const pior = Math.max(...desvios);
    deriva = { pior, quadro: desvios.indexOf(pior) + 1, ancoras, mediana };
  }

  const orientacao = { grupoA, grupoB, forca };
  const virado = grupoB.length ? orientacao : null;

  const pior = pares.reduce((m, p) => (p.dif < m.dif ? p : m));
  const aberturas = quadros.map((q) => q.abertura).filter((a) => a !== null);
  const abertura = aberturas.length ? Math.max(...aberturas) : null;
  const quadroMaisAberto = aberturas.length ? aberturas.indexOf(abertura) + 1 : null;
  return { pares, pior, abertura, quadroMaisAberto, orientacao, virado, escala, deriva, vizinhos: pares.filter((p) => p.b - p.a === 1 || (p.a === 1 && p.b === n)) };
}

// O veredito, com o defeito nomeado. `nivel` é 'ok' | 'aviso' | 'fail'.
// O QUE PRECISA SOBRAR pra alguém recalibrar um limiar meses depois: a medida que motivou o
// veredito E o limiar que estava valendo na hora. Só a medida não basta — quando o limiar mudar, o
// registro antigo passaria a parecer inconsistente ("por que isso reprovou com 1.8 se o teto é
// 2.0?"). Guardar os dois deixa cada linha do arquivo se explicar sozinha.
export const resumoDeCiclo = (cic) => {
  const m = cic.medida || {};
  return {
    dif: cic.dif ?? null,
    abertura: m.abertura ?? null,
    quadroMaisAberto: m.quadroMaisAberto ?? null,
    escala: m.escala ? { variacao: m.escala.variacao, cabecas: m.escala.cabecas } : null,
    deriva: m.deriva ? { pior: m.deriva.pior, quadro: m.deriva.quadro } : null,
    virado: m.virado ? { forca: m.virado.forca, grupoA: m.virado.grupoA, grupoB: m.virado.grupoB } : null,
    pares: (m.pares || []).map((p) => ({ a: p.a, b: p.b, dif: p.dif })),
    limiares: {
      CICLO_FAIL, CICLO_AVISO, CICLO_TROCA_AVISO, CICLO_VIRADO, CICLO_VIRADO_AVISO,
      CICLO_ESCALA_MAX, CICLO_DERIVA_MAX, abertura: CICLO_ABERTURA_MAX[cic.tipo] ?? null,
    },
  };
};

export async function validarCiclo(slug, tipo) {
  const dirAbs = path.join(CONTEUDO, dirRig(slug, tipo));
  const pref = prefixoRig(tipo);
  const m = await medirCiclo(dirAbs, pref);
  // QUADRO VIRADO vem antes de tudo: é o defeito mais grosseiro e o mais objetivo de medir.
  if (m.virado && m.virado.forca >= CICLO_VIRADO) {
    const { grupoA, grupoB, forca } = m.virado;
    // o grupo MENOR é o suspeito, mas os dois vão na mensagem: quem confere olha o cartão e decide
    const menor = grupoB.length <= grupoA.length ? grupoB : grupoA;
    const maior = menor === grupoB ? grupoA : grupoB;
    return { gate: 'orientacao', nivel: 'fail', slug, tipo, dif: forca, medida: m,
      msg: `os quadros NÃO OLHAM TODOS PRO MESMO LADO: ${menor.map((q) => pref + q).join(', ')} ${menor.length > 1 ? 'estão virados' : 'está virado'} ao contrário de ${maior.map((q) => pref + q).join(', ')} (a silhueta casa ${forca.toFixed(1)}x melhor espelhada). No vídeo o personagem se vira de costas no meio do ciclo, a cada volta` };
  }

  if (m.escala && m.escala.variacao > CICLO_ESCALA_MAX) {
    const { min, max, variacao, cabecas } = m.escala;
    const iMin = cabecas.indexOf(min) + 1, iMax = cabecas.indexOf(max) + 1;
    return { gate: 'escala', nivel: 'fail', slug, tipo, dif: variacao, medida: m,
      msg: `o personagem MUDA DE TAMANHO no meio do ciclo: a cabeça vai de ${min}px em ${pref}${iMin} a ${max}px em ${pref}${iMax} (${(variacao * 100).toFixed(0)}% de diferença). Na tela ele encolhe e volta a crescer enquanto se move, porque a escala do desenho mudou entre os quadros — não confunda com o corpo subir e descer, que a passada faz de propósito` };
  }

  if (m.deriva && m.deriva.pior > CICLO_DERIVA_MAX) {
    const { pior, quadro } = m.deriva;
    return { gate: 'deriva', nivel: 'fail', slug, tipo, dif: pior, medida: m,
      msg: `o corpo ESCORREGA pro lado: em ${pref}${quadro} a massa de cabeça+tronco está ${(pior * 100).toFixed(0)}% da altura fora do lugar dos outros quadros (o ciclo corre NO LUGAR, quem desloca é o motor). Na tela ele desliza além do que o roteiro mandou` };
  }

  // QUEM BARRA É O PIOR PAR VIZINHO. Ver CICLO_FAIL: é entre vizinhos que a animação anda.
  const piorViz = m.vizinhos.reduce((x, p) => (p.dif < x.dif ? p : x));
  const { a, b, dif } = piorViz;
  const pct = (dif * 100).toFixed(1);
  if (dif < CICLO_FAIL) {
    return { gate: 'quadro-morto', nivel: 'fail', slug, tipo, dif, medida: m,
      msg: `${pref}${a} e ${pref}${b} são o MESMO desenho (${pct}% de diferença na perna): são quadros VIZINHOS, então a animação para por um frame no meio do ciclo` };
  }
  // TETO: o outro extremo. Andar não é espacate, e o gerador vai pra lá quando a régua só tem piso.
  const teto = CICLO_ABERTURA_MAX[tipo];
  if (teto && m.abertura && m.abertura > teto) {
    return { gate: 'abertura', nivel: 'fail', slug, tipo, dif, msg: `passada ABERTA DEMAIS: em ${pref}${m.quadroMaisAberto} os pés estão a ${m.abertura.toFixed(2)} larguras de cabeça (o acervo de ${tipo} fica abaixo de ${teto}). Isso lê como espacate ou marcha, não como ${tipo === 'correr' ? 'corrida' : 'caminhada'}`, medida: m };
  }
  if (m.virado) {
    const { grupoA, grupoB, forca } = m.virado;
    const menor = grupoB.length <= grupoA.length ? grupoB : grupoA;
    return { gate: 'orientacao', nivel: 'aviso', slug, tipo, dif: forca, medida: m,
      msg: `${menor.map((q) => pref + q).join(', ')} PODE estar virado ao contrário dos outros (${forca.toFixed(1)}x espelhado, abaixo do ${CICLO_VIRADO}x que barra). Personagem quase frontal cai aqui sem ter defeito: confira o _card.png` };
  }
  if (dif < CICLO_AVISO) return { gate: 'passada-chapada', nivel: 'aviso', slug, tipo, dif, msg: `passada chapada: os vizinhos ${pref}${a}/${pref}${b} mudam só ${pct}% da perna`, medida: m };
  // AVISO, nunca FAIL: barrar por isto reprovaria uma folha já aprovada a olho (ver CICLO_TROCA_AVISO)
  const troca = m.pares.find((p) => p.a === 1 && p.b === 3);
  if (troca && troca.dif < CICLO_TROCA_AVISO) {
    return { gate: 'troca-de-perna', nivel: 'aviso', slug, tipo, dif, medida: m,
      msg: `a perna de apoio não troca entre os contatos (${pref}1/${pref}3 diferem ${(troca.dif * 100).toFixed(1)}%): o ciclo alterna duas poses em vez de quatro. Passa, mas um ciclo com a perna trocando lê melhor` };
  }
  return { nivel: 'ok', slug, tipo, dif, msg: `ok (par mais parecido: ${pref}${a}/${pref}${b}, ${pct}%${m.abertura ? ` · abertura ${m.abertura.toFixed(2)}` : ''})`, medida: m };
}

// CLI: node ciclo.mjs <slug> [andar|correr]  ·  node ciclo.mjs --acervo
if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , arg, tipoArg] = process.argv;
  const icone = { ok: 'ok  ', aviso: 'AVISO', fail: 'FAIL' };
  if (arg === '--acervo') {
    const { readdir } = await import('node:fs/promises');
    const base = path.join(CONTEUDO, 'personagens');
    const slugs = (await readdir(base, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name).sort();
    let fails = 0;
    for (const slug of slugs) for (const tipo of ['andar', 'correr']) {
      if (!existsSync(path.join(CONTEUDO, dirRig(slug, tipo), `${prefixoRig(tipo)}1.png`))) continue;
      const r = await validarCiclo(slug, tipo).catch((e) => ({ nivel: 'fail', msg: e.message }));
      if (r.nivel === 'fail') fails++;
      if (r.nivel !== 'ok') console.log(`${icone[r.nivel]} ${slug}/${tipo}: ${r.msg}`);
    }
    console.log(`\n${fails} ciclo(s) REPROVADO(s). conserto: node scripts/asset.mjs <andar|correr> <slug>`);
    console.log('em lote (valida os que já existem e regera só os reprovados):');
    console.log('  node scripts/asset.mjs lote movimento --faixa=abc');
    process.exit(fails ? 1 : 0);
  }
  // `--perfil`: as métricas de um ciclo LADO A LADO com as do padrão-ouro. Serve pra julgar o que
  // os limiares não decidem sozinhos ("passou, mas está tão bom quanto a referência?").
  if (process.argv.includes('--perfil')) {
    const slug = process.argv[2];
    const tipo = tipoArg && tipoArg !== '--perfil' ? tipoArg : CICLO_REFERENCIA.tipo;
    const linha = async (s, t2) => {
      const m = await medirCiclo(path.join(CONTEUDO, dirRig(s, t2)), prefixoRig(t2));
      return { s, t2, viz: Math.min(...m.vizinhos.map((p) => p.dif)), troca: m.pares.find((p) => p.a === 1 && p.b === 3)?.dif ?? 0,
        ab: m.abertura || 0, esc: m.escala?.variacao ?? 0, der: m.deriva?.pior ?? 0 };
    };
    const ref = await linha(CICLO_REFERENCIA.slug, CICLO_REFERENCIA.tipo);
    const alvo = await linha(slug, tipo);
    const pct = (v) => (v * 100).toFixed(0).padStart(4) + '%';
    console.log(`\n${'métrica'.padEnd(26)} ${'referência'.padStart(9)}  ${'este'.padStart(9)}`);
    console.log(`${'(o que é bom)'.padEnd(26)} ${(CICLO_REFERENCIA.slug + '/' + CICLO_REFERENCIA.tipo).slice(0, 9).padStart(9)}  ${slug.slice(0, 9).padStart(9)}`);
    console.log('-'.repeat(50));
    console.log(`${'vizinhos mais parecidos'.padEnd(26)} ${pct(ref.viz).padStart(9)}  ${pct(alvo.viz).padStart(9)}   (maior é melhor)`);
    console.log(`${'troca de perna (1x3)'.padEnd(26)} ${pct(ref.troca).padStart(9)}  ${pct(alvo.troca).padStart(9)}   (maior é melhor)`);
    console.log(`${'abertura (cabeças)'.padEnd(26)} ${ref.ab.toFixed(2).padStart(9)}  ${alvo.ab.toFixed(2).padStart(9)}`);
    console.log(`${'escala (cabeça varia)'.padEnd(26)} ${pct(ref.esc).padStart(9)}  ${pct(alvo.esc).padStart(9)}   (menor é melhor)`);
    console.log(`${'deriva (corpo escorrega)'.padEnd(26)} ${pct(ref.der).padStart(9)}  ${pct(alvo.der).padStart(9)}   (menor é melhor)\n`);
    process.exit(0);
  }
  if (!arg) { console.error('uso: node ciclo.mjs <slug> [andar|correr]  ·  node ciclo.mjs --acervo  ·  node ciclo.mjs <slug> [tipo] --perfil'); process.exit(2); }
  for (const tipo of tipoArg ? [tipoArg] : ['andar', 'correr']) {
    if (!existsSync(path.join(CONTEUDO, dirRig(arg, tipo), `${prefixoRig(tipo)}1.png`))) continue;
    const r = await validarCiclo(arg, tipo);
    console.log(`${icone[r.nivel]} ${arg}/${tipo}: ${r.msg}`);
    for (const p of r.medida.pares) console.log(`     ${prefixoRig(tipo)}${p.a}/${prefixoRig(tipo)}${p.b}  ${(p.dif * 100).toFixed(1)}%`);
    const or = r.medida.orientacao;
    console.log(`     orientação: grupo A = ${or.grupoA.join(',') || '-'} · grupo B = ${or.grupoB.join(',') || '-'}${or.grupoB.length ? ` (${or.forca.toFixed(1)}x)` : ' (todos pro mesmo lado)'}`);
  }
}
