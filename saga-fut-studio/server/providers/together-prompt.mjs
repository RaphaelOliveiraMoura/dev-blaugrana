// O prompt da casa traduzido pra Together AI.
//
// POR QUE PRECISA DE TRADUÇÃO: os outros dois modelos são CLIs com AGENTE no meio — o prompt manda
// "use sua ferramenta de imagem", "salve o PNG em tal caminho", "não peça confirmação", e quem lê
// isso é o agente, não o gerador de imagem. A Together é uma API REST pura: o campo `prompt` vai
// direto pro modelo de difusão, então toda instrução de ferramenta e de arquivo vira RUÍDO dentro
// da descrição visual, e ruído em prompt de difusão sai desenhado (já apareceu texto de instrução
// escrito dentro da arte em testes de modelo).
//
// Aqui fica só o que é imagem: a descrição composta, a orientação de enquadramento e o papel das
// referências. O caminho de saída não entra — quem grava o arquivo é o provider.
import { PAPEL_DO_ANEXO } from '../prompts.mjs'

// As linhas de CLI que o config.mjs/prompts.mjs põem em todo prompt (mesma ideia do
// `semDialetoCodex` em scripts/sprites/modelo.mjs, que existe pelo mesmo motivo no lado do asset).
const LINHAS_DE_FERRAMENTA = [
  /^Use your built-in image generation tool/i,
  /^Write the final PNG to that exact path/i,
  /^IMAGE OUT:/i,
  /^Save it as a PNG/i,
  /Do not ask for confirmation/i,
]

export const semDialetoDeCLI = (texto) => String(texto || '')
  .split('\n')
  .filter((l) => !LINHAS_DE_FERRAMENTA.some((re) => re.test(l.trim())))
  .join('\n')
  .trim()

export function instrucaoTogether({ composed, orient, refs = [] }) {
  // O papel de cada referência continua importando: a ordem em que elas entram no corpo da request
  // é a mesma em que o texto as descreve, senão o modelo troca qual é o personagem e qual é o estilo.
  const papeis = refs.length
    ? refs.map((r, i) => (PAPEL_DO_ANEXO[r.papel] || PAPEL_DO_ANEXO.personagem)(i + 1)).join('\n')
    : ''
  return [
    semDialetoDeCLI(composed),
    papeis && `\nReference images, in order:\n${papeis}`,
    semDialetoDeCLI(orient),
  ].filter(Boolean).join('\n').trim()
}
