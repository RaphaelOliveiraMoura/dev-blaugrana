// FOLHA DE CONTATO DE TODA PEÇA QUE TEM BOLA. É assim que os 6 defeitos apareceram.
//
// POR QUE EXISTE: bola oval não tem sintoma nenhum. Passa em todos os gates (a arte está no
// tamanho certo, no estilo certo, sem texto, sem escudo), o prompt continua dizendo a coisa certa
// em português, e ninguém revisa 819 painéis um a um. O defeito só aparece quando se olha, e o
// custo de olhar é o que decide se alguém olha: 819 arquivos ninguém abre, 17 folhas se atravessa
// em minutos.
//
// A LISTA SAI DO PROMPT, não de um detector de imagem. Detectar "bola oval" por pixel foi
// descartado: a bola aparece em qualquer escala, cor e recorte, e um detector que erra devolve o
// problema de revisão que ele deveria resolver. O prompt, ao contrário, diz com precisão QUAIS
// painéis têm bola desenhada (shared/prompt-bola.mjs), e é uma lista de 30, não de 819.
//
// Cobre também o que o prompt NÃO nomeia mas costuma sair NFL: TROFÉU. Foi assim que o
// `o-dia-copa-uniao` saiu com dois Vince Lombardi sem a palavra "ball" aparecer no prompt.
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

// o troféu não tem palavra pra trocar, então entra por termo: quem revisa precisa VER a peça
const TROFEU = /\btroph(y|ies)\b|\bcup\b(?!\s+of)/i;

const quadrinhos = path.join(CONTEUDO, 'data/quadrinhos');
const alvos = [];
for (const arq of (await readdir(quadrinhos)).sort()) {
  if (!arq.endsWith('.json')) continue;
  const q = JSON.parse(await readFile(path.join(quadrinhos, arq), 'utf8'));
  const id = arq.replace('.json', '');
  for (const [i, p] of (q.paineis || []).entries()) {
    const prompt = p.promptImagem || '';
    const bolas = bolasNoPrompt(prompt);
    const trofeu = TROFEU.test(prompt);
    if (!bolas.length && !trofeu) continue;
    const png = path.join(CONTEUDO, 'quadrinhos', id, 'paineis', `${i + 1}.png`);
    alvos.push({ id, painel: i + 1, png, existe: existsSync(png), motivo: bolas.length ? 'bola' : 'troféu' });
  }
}

const comArte = alvos.filter((a) => a.existe);
console.log(`${alvos.length} painéis desenham bola ou troféu (${comArte.length} com arte no disco)`);
for (const a of alvos) console.log(`  ${a.existe ? ' ' : '!'} ${a.id} p${a.painel} (${a.motivo})`);
if (soLista) process.exit(0);

// folha 5x5: a bola some abaixo disso, e acima disso a folha não cabe numa tela
const COLS = 5, LINHAS = 5, CELL = 300, PAD = 20;
await mkdir(SAIDA, { recursive: true });
const folhas = [];
for (let s = 0; s * (COLS * LINHAS) < comArte.length; s++) {
  const lote = comArte.slice(s * COLS * LINHAS, (s + 1) * COLS * LINHAS);
  const comps = [];
  for (const [i, a] of lote.entries()) {
    const col = i % COLS, lin = Math.floor(i / COLS);
    comps.push({
      input: await sharp(a.png).resize(CELL - 6, CELL - 6, { fit: 'contain', background: '#fff' }).png().toBuffer(),
      left: col * CELL + 3, top: lin * (CELL + PAD) + PAD,
    });
    const rotulo = `<svg width="${CELL}" height="${PAD}"><rect width="${CELL}" height="${PAD}" fill="#111"/>`
      + `<text x="3" y="15" font-size="13" font-family="monospace" fill="#7CFC00">${a.id} p${a.painel}</text></svg>`;
    comps.push({ input: Buffer.from(rotulo), left: col * CELL, top: lin * (CELL + PAD) });
  }
  const arq = path.join(SAIDA, `folha-${String(s + 1).padStart(2, '0')}.jpg`);
  await sharp({ create: { width: COLS * CELL, height: LINHAS * (CELL + PAD), channels: 3, background: '#ffffff' } })
    .composite(comps).jpeg({ quality: 80 }).toFile(arq);
  folhas.push(arq);
}

await writeFile(path.join(SAIDA, 'lista.json'), JSON.stringify(alvos, null, 1));
console.log(`\n${folhas.length} folhas em ${SAIDA}`);
console.log('Abra e procure: bola OVAL, bola com laço numa ponta, troféu com bola oval no topo.');
