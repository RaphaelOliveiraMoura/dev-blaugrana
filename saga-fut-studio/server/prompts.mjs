import path from 'node:path'
import { CONTEUDO_DIR, QUAD_RULES_PADRAO } from './config.mjs'
import { exists } from './lib/arquivos.mjs'
import { estiloImagem, refPersonagem } from '../shared/caminhos.mjs'

// Monta o prompt final de cada tipo de imagem, do mesmo jeito que o front mostra
// no botão "copiar": estilo + corpo + regras da casa. As fichas dos personagens
// vão junto como referência, que é a âncora de consistência entre as cenas.
//
// Toda imagem anexada carrega o PAPEL dela. O mesmo anexo serve para duas ordens
// opostas — "copie este traço" e "copie este rosto" — e o modelo não adivinha qual
// é qual: sem o papel explícito, uma referência de estilo vira ordem de copiar o
// personagem que aparece nela.

// pedido malformado é culpa de quem chamou (400), não falha do servidor (500)
class ErroDePedido extends Error {
  constructor(msg) { super(msg); this.status = 400 }
}

const ORIENTACAO_QUADRINHO = {
  '9:16': 'Vertical 9:16 orientation (tall).',
  '1:1': 'Square 1:1 orientation.',
}
// O tamanho é dito em pixels, e não só como proporção, porque proporção o modelo
// interpreta: pedir enquadramento ("85% da altura") junto de "tall 2:3" fez ele
// devolver um 862x1824, quebrando justamente o que a ficha precisa ter em comum.
const ORIENTACAO_PADRAO = 'Portrait vertical orientation: the PNG must be exactly 1024 x 1536 pixels (tall 2:3). Never any other size.'

// Enquadramento da ficha, igual para todo mundo.
//
// Sem isto cada geração escolhia o seu, e o pool acabou com personagem ocupando de
// 74% a 99% da altura: lado a lado, um parece de perto e o outro de longe, ainda que
// o arquivo tenha sempre o mesmo tamanho. Enquadramento é do formato, não do
// personagem, então mora aqui e não no promptFicha de cada um.
//
// Só na ficha: cena e painel são enquadramento de cena (close, plano aberto), e é o
// roteiro que manda neles.
const ENQUADRAMENTO_FICHA = 'Frame every character sheet the same way: the character standing, full body from the top of the head to the feet, centred in the frame, filling about 85% of the image height, with a small even margin above the head and below the feet. Never crop any part of the character.'

const noConteudo = (rel) => exists(path.join(CONTEUDO_DIR, rel))

// só anexa fichas que JÁ existem em disco (referência que não existe não ajuda)
async function fichasExistentes(ids, byId) {
  const refs = []
  for (const pid of ids || []) {
    const p = byId[pid]
    if (p?.imagem && await noConteudo(p.imagem)) refs.push({ rel: p.imagem, papel: 'personagem' })
  }
  return refs
}

// A referência de traço do estilo, quando o catálogo tem uma em disco. O arquivo é a
// fonte honesta: existe → o estilo tem imagem; não existe → segue só no prefixo.
async function refDoEstilo(est) {
  if (!est) return []
  const rel = estiloImagem(est.id)
  return (await noConteudo(rel)) ? [{ rel, papel: 'estilo' }] : []
}

// A referência de aparência do personagem (a foto de quem ele é), quando você largou
// uma em disco. Mesma regra do estilo: o arquivo é a fonte, e sem ele a ficha segue
// só pelo que o prompt descreve.
async function refDeAparencia(p) {
  const rel = refPersonagem(p.id)
  return (await noConteudo(rel)) ? [{ rel, papel: 'aparencia' }] : []
}

function falasComoBaloes(painel, byId) {
  return (painel.falas || [])
    .filter((f) => (f.texto || '').trim())
    .map((f) => {
      const nome = byId[f.personagem]?.nome
      return nome
        ? `${nome} says in a comic speech balloon: "${f.texto.trim()}"`
        : `a caption box reads: "${f.texto.trim()}"`
    })
}

// Retorna { composed, outRel, orient, refs: [{ rel, papel }] } ou lança com o motivo.
export async function comporPrompt(d, body) {
  const { tipo, sagaId, epId, cenaNumero, personagemId, estiloId, quadrinhoId, painelNumero } = body || {}
  const promptRules = d.projeto?.promptRules || ''
  const byId = Object.fromEntries((d.personagens || []).map((p) => [p.id, p]))
  const estilosById = Object.fromEntries((d.estilos || []).map((e) => [e.id, e]))

  if (tipo === 'ficha') {
    const p = byId[personagemId]
    if (!p) throw new ErroDePedido('Personagem não encontrado.')
    // estilo, em ordem de precedência:
    //   1. override explícito na request (o detalhe de arte do personagem continua valendo)
    //   2. o estilo DO PRÓPRIO personagem (já resolvido no readDados)
    //   3. herdado da saga (legado, para fichas antigas sem estiloId)
    let stylePrefix = ''
    if (estiloId && estilosById[estiloId]) stylePrefix = [estilosById[estiloId].stylePrefix, p.estiloExtra].filter(Boolean).join(', ')
    else if (p.stylePrefix) stylePrefix = p.stylePrefix
    else stylePrefix = (d.sagas || []).find((s) => s.id === sagaId)?.stylePrefix || ''
    // A ficha é a geração que ESTABELECE o personagem, então é aqui, e só aqui, que
    // entram as duas referências cruas: o estilo diz COMO desenhar, a aparência diz QUEM
    // é. São perguntas diferentes, então não brigam, e é por isso que cada anexo declara
    // seu papel lá embaixo. Na cena e no painel quem responde pelas duas é a ficha
    // pronta; anexar as cruas de novo poria as referências para brigar com ela, e prompt
    // contraditório entrega o pior dos dois.
    return {
      composed: `${stylePrefix}, ${p.promptFicha}\n\n${promptRules}`,
      outRel: p.imagem,
      orient: `${ORIENTACAO_PADRAO} ${ENQUADRAMENTO_FICHA}`,
      // Aparência primeiro, estilo POR ÚLTIMO: com a foto na última posição ela
      // dominava o traço e a ficha saía uma ilustração realista. O anexo final é o
      // que o modelo tem mais fresco, e aqui o que precisa ficar fresco é o traço.
      refs: [
        ...await refDeAparencia(p),
        ...await refDoEstilo(estilosById[estiloId] || estilosById[p.estiloId]),
      ],
    }
  }

  if (tipo === 'cena') {
    const saga = (d.sagas || []).find((s) => s.id === sagaId)
    const ep = saga?.episodios.find((e) => e.id === epId)
    const cena = ep?.cenas.find((c) => c.numero === Number(cenaNumero))
    if (!cena) throw new ErroDePedido('Cena não encontrada.')
    return {
      composed: `${saga.stylePrefix}, ${cena.promptImagem}\n\n${promptRules}`,
      outRel: cena.imagem,
      orient: ORIENTACAO_PADRAO,
      refs: await fichasExistentes(cena.personagens, byId),
    }
  }

  if (tipo === 'painel') {
    const q = (d.quadrinhos || []).find((x) => x.id === quadrinhoId)
    const painel = q?.paineis.find((p) => p.numero === Number(painelNumero))
    if (!painel) throw new ErroDePedido('Painel não encontrado.')
    // a IA desenha os balões: as falas viram instruções de speech balloon no prompt
    const corpo = [painel.promptImagem, falasComoBaloes(painel, byId).join('. ')].filter(Boolean).join('. ')
    const quadRules = d.projeto?.quadrinhoRules || QUAD_RULES_PADRAO
    return {
      composed: `${q.stylePrefix || ''}, comic panel. ${corpo}\n\n${quadRules}`,
      outRel: painel.imagem,
      orient: ORIENTACAO_QUADRINHO[q.formato] || 'Portrait 4:5 orientation.',
      refs: await fichasExistentes(q.elenco, byId),
    }
  }

  throw new ErroDePedido('tipo inválido (use ficha|cena|painel).')
}

// A instrução que o Codex recebe: onde gravar, com que orientação e com que referências.
// Cada anexo é apresentado pelo número e pelo papel, na ordem em que vai no `-i`: é isso
// que impede o modelo de copiar o personagem de uma referência de traço.
const PAPEL_DO_ANEXO = {
  estilo: (n) => `- Image ${n} is a STYLE reference: it is the TARGET LOOK of the image you must produce. Copy its medium, linework, line weight, palette, shading, level of detail and character construction. Do NOT copy the character, the subject, the pose, the framing or the panel layout shown in it. Take ONLY the drawing style.`,
  // O oposto exato da referência de estilo, e por isso ela precisa ser dita com a
  // mesma força: daqui vem QUEM é a pessoa, não como desenhar. Sem proibir o resto,
  // o modelo devolve a própria foto (fotorrealista, de uniforme real, com marcas).
  aparencia: (n) => `- Image ${n} is a LIKENESS reference: a photo of the real person this character is based on. Use it ONLY to know WHO this is: face shape, hair, skin tone, build, so the drawing stays RECOGNIZABLE as them. Do NOT copy the photo itself. Ignore its realism, lighting, framing, background, pose and clothing; dress the character as the prompt describes.`,
  personagem: (n) => `- Image ${n} is a CHARACTER reference sheet: keep that character IDENTICAL to it (same face, same hair, same outfit).`,
}

// Quem manda em quê, quando as duas referências vão juntas.
//
// A foto é a única imagem fotográfica na mesa e, sem uma regra de desempate, ela
// arrasta o resultado inteiro pro realismo: a 1ª ficha do presidente com foto saiu
// uma ilustração fina e realista, em vez do rabisco do estilo. As duas respondem a
// perguntas diferentes (COMO desenhar / QUEM é), então o desempate é por pergunta,
// e o estilo ganha tudo que é sobre desenho.
function regraDeConflito(refs) {
  const estilo = refs.findIndex((r) => r.papel === 'estilo') + 1
  const aparencia = refs.findIndex((r) => r.papel === 'aparencia') + 1
  if (!estilo || !aparencia) return ''
  return `
The two references answer DIFFERENT questions. Do not mix them up:
- HOW this image is drawn comes ONLY from Image ${estilo}: medium, line work, color, shading, amount of detail, character proportions. The result must look hand-drawn in exactly that style, as if the same artist drew it.
- WHO this person is comes ONLY from Image ${aparencia}: their facial features.
Image ${aparencia} is a PHOTOGRAPH, and its realism must NOT leak into the drawing: no photographic lighting, no rendered skin, no fine detail, no extra realism because the reference happens to be a photo. If the two ever disagree, Image ${estilo} wins. The output is a drawing in the style of Image ${estilo}, never a photo and never a realistic portrait.
The FACE is where the photo leaks in the most, so draw it the same way the rest of the drawing is made: skin is FLAT areas of color with no texture, no airbrushed or gradient shading, no rendered pores or highlights. Facial hair, stubble and eyebrows are drawn as simple flat shapes and strokes, never as photographic texture. Eyes are drawn the way Image ${estilo} draws eyes. Keep the person recognizable through SHAPE (face, nose, hair, brows), not through detail.
`
}

export function instrucaoCodex({ composed, outRel, orient, refs = [] }) {
  const papeis = refs.map((r, i) => (PAPEL_DO_ANEXO[r.papel] || PAPEL_DO_ANEXO.personagem)(i + 1))
  const refHint = papeis.length
    ? `\nYou are given ${refs.length} input image(s). Pass them to the image tool as INPUT IMAGES with HIGH input fidelity, in this order:\n${papeis.join('\n')}\n${regraDeConflito(refs)}`
    : ''
  return `Use your built-in image generation tool (gpt-image-2) to create ONE image and save it as a PNG at exactly this relative path inside the current workspace: ${outRel}
${refHint}${orient}

IMAGE PROMPT:
${composed}

Write the final PNG to that exact path (${outRel}). Overwrite it if it already exists. Do not ask for confirmation.`
}
