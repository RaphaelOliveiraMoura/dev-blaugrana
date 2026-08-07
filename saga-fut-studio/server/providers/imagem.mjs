// Registro de MODELOS de geração de imagem. É a costura da troca global: o resto do
// sistema só conhece `gerarImagemCom(modeloId, ...)`, e cada modelo esconde a sua CLI
// (Codex/gpt-image ou Grok/Grok Imagine) e a forma de montar a instrução dela.
//
// Adicionar um modelo novo é adicionar uma entrada aqui, nada mais.
import path from 'node:path'
import { CONTEUDO_DIR } from '../config.mjs'
import { instrucaoCodex } from '../prompts.mjs'
import { generateImage as codexGenerate } from './codex-image.mjs'
import { generateImage as grokGenerate, instrucaoGrokImagem } from './grok-image.mjs'
import { generateImage as togetherGenerate, TOGETHER_MODELO } from './together-image.mjs'
import { generateImage as cursorGenerate, instrucaoCursorImagem } from './cursor-image.mjs'
import { instrucaoTogether } from './together-prompt.mjs'

// id -> { nome (rótulo pra UI), assinatura (de onde sai a cota), gerar(pedido, outAbs) }.
// `gerar` recebe o mesmo `pedido` do comporPrompt e o caminho absoluto de saída; cada
// modelo decide como falar com a sua ferramenta.
export const MODELOS_IMAGEM = {
  codex: {
    id: 'codex',
    nome: 'ChatGPT (Codex · gpt-image)',
    curto: 'ChatGPT',
    assinatura: 'ChatGPT Plus',
    gerar: (pedido, outAbs) => codexGenerate({
      cwd: CONTEUDO_DIR,
      prompt: instrucaoCodex(pedido),
      referencias: pedido.refs.map((r) => r.rel), // -i, na ordem que o hint descreve
      outAbs,
    }),
  },
  grok: {
    id: 'grok',
    nome: 'Grok Imagine',
    curto: 'Grok',
    assinatura: 'SuperGrok',
    gerar: (pedido, outAbs) => grokGenerate({
      cwd: CONTEUDO_DIR,
      prompt: instrucaoGrokImagem(pedido, outAbs, CONTEUDO_DIR), // refs vão como image[]
      outAbs,
    }),
  },
  // A ÚNICA QUE COBRA POR IMAGEM. O `assinatura` aparece no seletor do studio justamente pra que
  // trocar o padrão global pra cá seja uma decisão consciente: aqui um lote de 100 folhas é fatura,
  // não fila. Ver together-image.mjs.
  together: {
    id: 'together',
    nome: `Together AI (${TOGETHER_MODELO.split('/').pop()})`,
    curto: 'Together',
    assinatura: 'API paga (por imagem)',
    gerar: (pedido, outAbs) => togetherGenerate({
      prompt: instrucaoTogether(pedido),                       // sem o dialeto de CLI dos outros dois
      referencias: pedido.refs.map((r) => path.join(CONTEUDO_DIR, r.rel)),
      outAbs,
      dim: pedido.dim,
    }),
  },
  // Cota da assinatura Cursor (tool nativa GenerateImage / Nano Banana, via `agent acp`).
  // Não é API paga por imagem, mas também não é contrato estável de batch — rate limit e
  // paths de saída são do agent. Ver cursor-image.mjs.
  cursor: {
    id: 'cursor',
    nome: 'Cursor (GenerateImage · Nano Banana)',
    curto: 'Cursor',
    assinatura: 'Cursor (assinatura)',
    gerar: (pedido, outAbs) => cursorGenerate({
      cwd: CONTEUDO_DIR,
      prompt: instrucaoCursorImagem(pedido, outAbs, CONTEUDO_DIR),
      referencias: pedido.refs.map((r) => path.join(CONTEUDO_DIR, r.rel)),
      outAbs,
    }),
  },
}

export const MODELO_IMAGEM_PADRAO = 'codex'

// O modelo efetivo, com fallback seguro: id inválido cai no padrão em vez de quebrar.
export const getModeloImagem = (id) => MODELOS_IMAGEM[id] || MODELOS_IMAGEM[MODELO_IMAGEM_PADRAO]

// Resolve o modelo a usar: override explícito da request vence; senão a config global do
// projeto; senão o padrão. É por aqui que a troca global passa a valer pra todo mundo.
export const resolverModeloImagem = (dados, override) =>
  getModeloImagem(override || dados?.projeto?.modeloImagem || MODELO_IMAGEM_PADRAO)
