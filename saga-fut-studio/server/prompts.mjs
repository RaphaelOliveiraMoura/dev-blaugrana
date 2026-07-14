import path from 'node:path'
import { CONTEUDO_DIR, QUAD_RULES_PADRAO } from './config.mjs'
import { exists } from './lib/arquivos.mjs'

// Monta o prompt final de cada tipo de imagem, do mesmo jeito que o front mostra
// no botão "copiar": estilo + corpo + regras da casa. As fichas dos personagens
// vão junto como referência, que é a âncora de consistência entre as cenas.

// pedido malformado é culpa de quem chamou (400), não falha do servidor (500)
class ErroDePedido extends Error {
  constructor(msg) { super(msg); this.status = 400 }
}

const ORIENTACAO_QUADRINHO = {
  '9:16': 'Vertical 9:16 orientation (tall).',
  '1:1': 'Square 1:1 orientation.',
}
const ORIENTACAO_PADRAO = 'Portrait vertical orientation (tall 2:3).'

// só anexa fichas que JÁ existem em disco (referência que não existe não ajuda)
async function fichasExistentes(ids, byId) {
  const refs = []
  for (const pid of ids || []) {
    const p = byId[pid]
    if (p?.imagem && await exists(path.join(CONTEUDO_DIR, p.imagem))) refs.push(p.imagem)
  }
  return refs
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

// Retorna { composed, outRel, orient, referencias } ou lança com o motivo.
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
    return {
      composed: `${stylePrefix}, ${p.promptFicha}\n\n${promptRules}`,
      outRel: p.imagem,
      orient: ORIENTACAO_PADRAO,
      referencias: [],
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
      referencias: await fichasExistentes(cena.personagens, byId),
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
      referencias: await fichasExistentes(q.elenco, byId),
    }
  }

  throw new ErroDePedido('tipo inválido (use ficha|cena|painel).')
}

// A instrução que o Codex recebe: onde gravar, com que orientação e com que referências.
export function instrucaoCodex({ composed, outRel, orient, referencias }) {
  const refHint = referencias.length
    ? `\nYou are given ${referencias.length} reference image(s) showing the canonical look of the character(s) in this image. Pass them to the image tool as INPUT IMAGES with HIGH input fidelity, so each character stays IDENTICAL to their reference (same face, same hair, same outfit).\n`
    : ''
  return `Use your built-in image generation tool (gpt-image-2) to create ONE image and save it as a PNG at exactly this relative path inside the current workspace: ${outRel}
${refHint}${orient}

IMAGE PROMPT:
${composed}

Write the final PNG to that exact path (${outRel}). Overwrite it if it already exists. Do not ask for confirmation.`
}
