// modelo.mjs — QUAL MODELO desenha o asset. Os gen-* importavam o codex-image direto, então
// trocar de gerador era editar arquivo por arquivo (e na prática ninguém trocava: dava pra testar
// o Grok só no quadrinho, que passa pelo registro do server).
//
// Aqui o prompt continua UM SÓ (o contrato da casa, escrito em config.mjs no dialeto do Codex) e
// cada modelo recebe a sua ADAPTAÇÃO:
//   · codex: passa direto, com as referências no -i (o prompt já fala "input images").
//   · grok:  a CLI não tem -i; as referências viajam DENTRO da instrução, como caminhos absolutos
//            no image[] do image_edit, e o "salve em <path>" tem que ser o do Grok, não o do Codex.
//
// Assim o teste de modelo é uma flag (`--modelo=grok`) e não um fork do gerador.
import { generateImage as codexGerar } from '../../server/providers/codex-image.mjs';
import { generateImage as grokGerar } from '../../server/providers/grok-image.mjs';
import { generateImage as togetherGerar, TOGETHER_MODELO } from '../../server/providers/together-image.mjs';
import { removerMoldura } from './moldura.mjs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const PROJECT_JSON = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../saga-fut/data/project.json');

export const MODELOS = {
  codex: { id: 'codex', nome: 'ChatGPT (Codex · gpt-image)', assinatura: 'ChatGPT Plus' },
  grok: { id: 'grok', nome: 'Grok Imagine', assinatura: 'SuperGrok' },
  // PAGA POR IMAGEM, ao contrário das outras duas (que rodam na assinatura já paga). Um `asset lote`
  // aqui é fatura, não fila: por isso a `assinatura` é declarada e impressa onde o modelo aparece.
  together: { id: 'together', nome: `Together AI (${TOGETHER_MODELO.split('/').pop()})`, assinatura: 'API paga (por imagem)' },
};
export const MODELOS_VALIDOS = Object.keys(MODELOS);
export const MODELO_PADRAO = 'codex';

// As duas frases que o config.mjs põe em todo prompt e que só fazem sentido pro Codex (nome da
// ferramenta e caminho RELATIVO ao workspace). Pro Grok elas viram ruído contraditório, porque a
// instrução dele nomeia outra ferramenta e um caminho absoluto.
const LINHAS_DO_CODEX = [
  /^Use your built-in image generation tool/i,
  /^Write the final PNG to that exact path/i,
  /^IMAGE OUT:/i,
];

const semDialetoCodex = (prompt) => prompt
  .split('\n')
  .filter((l) => !LINHAS_DO_CODEX.some((re) => re.test(l.trim())))
  .join('\n')
  .trim();

// O QUE O GROK ERRA SOZINHO, medido na primeira rodada de cenário (02/08/2026). Não é capricho de
// estilo: cada linha aqui é um defeito que quebra o motor de animação, não a arte.
//
//   · MOLDURA: ele copia o fundo de papel da ficha de estilo e devolve a arte como uma estampa com
//     margem em volta. Cenário do vídeo sangra até a borda; margem vira listra parada na tela.
//   · FORMATO: com referência ele herda o ASPECTO dela (a ficha de estilo é retrato 2:3), e o
//     panorama saía retrato. Repetir o aspect_ratio dentro do prompt é o que faz ele obedecer.
//   · PERSPECTIVA: ele desenha ponto de fuga e chão em diagonal por padrão. A casa é 2D lateral
//     chapado, e com o chão diagonal o personagem muda de tamanho conforme anda pelo panorama.
//
// O Codex acerta os três sem que ninguém peça, então isto NÃO entra no prompt da casa: é adaptação
// deste modelo, e mora aqui junto com a tradução dele.
const CORRECAO_GROK = (formato) => [
  `CANVAS: the output image MUST be ${formato || 'the requested'} aspect ratio.`,
  'The drawing FILLS THE ENTIRE CANVAS edge to edge (full bleed). NO border, NO frame, NO paper margin,',
  'NO cream or white band around the artwork, NO framed-illustration look.',
  'FLAT SIDE-ON 2D VIEW ONLY: no perspective, no vanishing point, no diagonal ground line, no sky gradient.',
  'The GROUND LINE stays at the SAME HEIGHT from the far left edge to the far right edge.',
].join(' ');

// O prompt da casa traduzido pro Grok. As referências entram no image[] na MESMA ordem em que o
// texto do prompt as descreve ("Image 1 = ...", "Image 2 = ..."), senão o papel de cada uma troca.
export function instrucaoGrok({ prompt, referencias = [], outAbs, formato }) {
  const cabeca = referencias.length
    ? [
        'Use a ferramenta image_edit para criar UMA imagem.',
        `Passe estas imagens no parâmetro image[], NESTA ordem: ${referencias.join(', ')}.`,
        'A ordem importa: o prompt abaixo se refere a elas como Image 1, Image 2, etc.',
      ].join(' ')
    : 'Use a ferramenta image_gen para criar UMA imagem.';
  return [
    cabeca,
    formato ? `aspect_ratio: ${formato}.` : '',
    '',
    semDialetoCodex(prompt),
    '',
    CORRECAO_GROK(formato),
    '',
    `Salve o PNG resultante EXATAMENTE em: ${outAbs}. Sobrescreva se já existir. Não peça confirmação e não faça mais nada.`,
  ].filter((l) => l !== '').join('\n');
}

// QUAL MODELO VALE AGORA, em três degraus (o de cima vence):
//
//   1. SAGAFUT_MODELO no ambiente  — o override de UMA execução (`asset ... --modelo=grok`)
//   2. projeto.modeloImagem        — o que está selecionado no seletor do studio
//   3. MODELO_PADRAO               — se não houver nem um nem outro
//
// O override é VARIÁVEL DE AMBIENTE de propósito: ele nasce e morre com o processo, então um teste
// isolado com outro modelo não encosta no padrão global e pode rodar EM PARALELO com um lote que
// está usando o padrão. Guardar isso num arquivo ou num singleton faria as duas execuções brigarem
// pelo mesmo valor, que é justamente o que não pode acontecer.
let _global = null;
export function modeloEfetivo(override = null) {
  const escolhido = override || process.env.SAGAFUT_MODELO || null;
  if (escolhido) {
    if (!MODELOS[escolhido]) throw new Error(`modelo "${escolhido}" não existe (use ${MODELOS_VALIDOS.join(' | ')})`);
    return escolhido;
  }
  if (_global === null) {
    // lê o seletor do studio; se o project.json não estiver legível, cai no padrão sem derrubar nada
    try {
      const { readFileSync } = require('node:fs');
      _global = JSON.parse(readFileSync(PROJECT_JSON, 'utf8'))?.projeto?.modeloImagem || MODELO_PADRAO;
    } catch { _global = MODELO_PADRAO; }
    if (!MODELOS[_global]) _global = MODELO_PADRAO;
  }
  return _global;
}

// A chamada única. `referencias` são caminhos ABSOLUTOS (o codex-image resolve o relativo sozinho,
// o grok precisa do absoluto porque a instrução viaja como texto).
export async function gerarImagem({ modelo = null, cwd, prompt, referencias = [], outAbs, timeoutMs = 600000, formato = null }) {
  modelo = modeloEfetivo(modelo);
  // A Together é REST pura: não tem agente no meio, então o dialeto de CLI do prompt da casa
  // ("use sua ferramenta", "salve em tal caminho") é ruído que sai desenhado. Ver together-prompt.mjs.
  if (modelo === 'together') {
    const { semDialetoDeCLI } = await import('../../server/providers/together-prompt.mjs');
    return togetherGerar({ prompt: semDialetoDeCLI(prompt), referencias, outAbs, timeoutMs, aspectRatio: formato || null });
  }
  if (modelo === 'grok') {
    const r = await grokGerar({ cwd, prompt: instrucaoGrok({ prompt, referencias, outAbs, formato }), outAbs, timeoutMs });
    // Pedir "sem moldura" no prompt reduz mas não elimina; a régua é a imagem, e ela é barata de
    // conferir. O corte só acontece quando a faixa aparece nas QUATRO bordas, então cenário do
    // Codex e céu chapado passam intactos (ver moldura.mjs).
    const corte = await removerMoldura(outAbs).catch(() => ({ cortou: false }));
    if (corte.cortou) console.log(`   moldura removida: ${corte.antes.join('x')} -> ${corte.depois.join('x')}`);
    return r;
  }
  return codexGerar({ cwd, prompt, referencias, outAbs, timeoutMs });
}
