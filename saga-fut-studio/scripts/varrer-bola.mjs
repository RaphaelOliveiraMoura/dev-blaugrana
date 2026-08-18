// FOLHA DE CONTATO DE TODA PEÇA QUE TEM BOLA. É assim que os defeitos aparecem.
//
// POR QUE EXISTE: bola oval não tem sintoma nenhum. Passa em todos os gates (a arte está no
// tamanho certo, no estilo certo, sem texto, sem escudo), o prompt continua dizendo a coisa certa
// em português, e ninguém revisa 819 painéis um a um. O defeito só aparece quando se olha, e o
// custo de olhar é o que decide se alguém olha: 819 arquivos ninguém abre, algumas folhas se
// atravessa em minutos.
//
// A LISTA SAI DO PROMPT, não de um detector de imagem. Detectar "bola oval" por pixel foi
// descartado: a bola aparece em qualquer escala, cor e recorte, e um detector que erra devolve o
// problema de revisão que ele deveria resolver. O prompt, ao contrário, diz com precisão QUAIS
// painéis têm bola desenhada (shared/prompt-bola.mjs).
//
// SÃO TRÊS CLASSES, e a terceira só entrou depois de escapar:
//
//   1. BOLA. O prompt pede a bola como objeto. Aparece grande, e miniatura basta.
//   2. TROFÉU. O prompt não fala em bola, mas o modelo desenha a taça da NFL, com a bola oval em
//      cima (`o-dia-copa-uniao`). Não há palavra pra trocar, então só o olho pega.
//   3. ARTE DENTRO DA ARTE. Capa de gibi numa banca, cartaz, cromo, tela de TV: cada uma é um
//      desenho que o modelo preenche sozinho, e ele preenche com o que associa a `football`. A
//      `capa-banca` do futgibi saiu com DEZOITO capinhas de futebol americano, virou a capa da
//      home do site e ATRAVESSOU uma revisão em miniatura, porque cada capinha tinha 2% da
//      largura da arte. Por isso esta classe sai em folha de 6, não de 25: em 300px ela é
//      invisível, e folha que não deixa ver é pior que folha nenhuma.
//
//   node scripts/varrer-bola.mjs                 # monta as folhas em _bola/
//   node scripts/varrer-bola.mjs --lista         # só a lista, sem gerar imagem
import sharp from 'sharp';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bolasNoPrompt } from '../shared/prompt-bola.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const CONTEUDO = path.resolve(AQUI, '../../saga-fut');
const SAIDA = path.join(CONTEUDO, '_bola');
const soLista = process.argv.includes('--lista');

const TROFEU = /\btroph(y|ies)\b|\bcup\b(?!\s+of)/i;
// as superfícies que carregam OUTRO desenho dentro da arte
const ARTE_DENTRO = /\b(comic books?|comic magazines?|magazines?|newspapers?|posters?|stickers?|albums?|newsstand|shop window|storefront|display case|mural|paintings?|photographs?|photos?|screens?|televisions?|\btv\b|trading cards?|programmes?|scrapbook|billboard|books?)\b/i;

const quadrinhos = path.join(CONTEUDO, 'data/quadrinhos');
const alvos = [];
for (const arq of (await readdir(quadrinhos)).sort()) {
  if (!arq.endsWith('.json')) continue;
  const q = JSON.parse(await readFile(path.join(quadrinhos, arq), 'utf8'));
  const id = arq.replace('.json', '');
  for (const [i, p] of (q.paineis || []).entries()) {
    // o boilerplate de encenação fala "editorial comic" em TODO painel: cortado antes de olhar,
    // senão a classe 3 devolve o acervo inteiro e a folha vira ruído
    const prompt = (p.promptImagem || '').replace(/EDITORIAL COMIC STAGING[\s\S]*/, '');
    const motivo = bolasNoPrompt(prompt).length ? 'bola'
      : ARTE_DENTRO.test(prompt) ? 'arte-dentro'
      : TROFEU.test(prompt) ? 'troféu' : null;
    if (!motivo) continue;
    const png = path.join(CONTEUDO, 'quadrinhos', id, 'paineis', `${i + 1}.png`);
    alvos.push({ id, painel: i + 1, png, existe: existsSync(png), motivo });
  }
}

const comArte = alvos.filter((a) => a.existe);
const conta = (m) => alvos.filter((a) => a.motivo === m).length;
console.log(`${alvos.length} painéis a revisar: ${conta('bola')} com bola, ${conta('troféu')} com troféu, `
  + `${conta('arte-dentro')} com arte dentro da arte (${comArte.length} com arte no disco)`);
for (const a of alvos) console.log(`  ${a.existe ? ' ' : '!'} ${a.id} p${a.painel} (${a.motivo})`);
if (soLista) process.exit(0);

// Duas grades, e a diferença é o que se está procurando. Bola e troféu são objetos grandes: 25 por
// folha basta. Arte dentro da arte é um desenho de 2% da largura: em 300px ela some, e foi
// exatamente assim que a banca do futgibi passou.
const GRADES = {
  grande: { itens: ['bola', 'troféu'], COLS: 5, LINHAS: 5, CELL: 300, prefixo: 'folha' },
  detalhe: { itens: ['arte-dentro'], COLS: 3, LINHAS: 2, CELL: 640, prefixo: 'detalhe' },
};

await mkdir(SAIDA, { recursive: true });
let total = 0;
for (const { itens, COLS, LINHAS, CELL, prefixo } of Object.values(GRADES)) {
  const lista = comArte.filter((a) => itens.includes(a.motivo));
  const porFolha = COLS * LINHAS;
  const PAD = Math.round(CELL / 15);
  for (let s = 0; s * porFolha < lista.length; s++) {
    const lote = lista.slice(s * porFolha, (s + 1) * porFolha);
    const comps = [];
    for (const [i, a] of lote.entries()) {
      const col = i % COLS, lin = Math.floor(i / COLS);
      comps.push({
        input: await sharp(a.png).resize(CELL - 6, CELL - 6, { fit: 'contain', background: '#fff' }).png().toBuffer(),
        left: col * CELL + 3, top: lin * (CELL + PAD) + PAD,
      });
      const rotulo = `<svg width="${CELL}" height="${PAD}"><rect width="${CELL}" height="${PAD}" fill="#111"/>`
        + `<text x="3" y="${PAD - 6}" font-size="${Math.round(PAD * 0.6)}" font-family="monospace" fill="#7CFC00">${a.id} p${a.painel}</text></svg>`;
      comps.push({ input: Buffer.from(rotulo), left: col * CELL, top: lin * (CELL + PAD) });
    }
    const arq = path.join(SAIDA, `${prefixo}-${String(s + 1).padStart(2, '0')}.jpg`);
    await sharp({ create: { width: COLS * CELL, height: LINHAS * (CELL + PAD), channels: 3, background: '#ffffff' } })
      .composite(comps).jpeg({ quality: 84 }).toFile(arq);
    total++;
  }
}

await writeFile(path.join(SAIDA, 'lista.json'), JSON.stringify(alvos, null, 1));
console.log(`\n${total} folhas em ${SAIDA}`);
console.log('Procure: bola OVAL, bola com laço numa ponta, troféu com bola oval no topo, e nas');
console.log('folhas `detalhe-*` as capinhas, cartazes e telas DENTRO da arte.');
