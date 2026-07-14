const DEFAULT_QUAD_RULES = 'comic book panel, bold clean speech balloons with short legible text, expressive exaggerated faces, dynamic composition; no real brand logos, no official crests, plain golden star instead; keep each character identical to their reference sheet.'

// resolve o prefixo de estilo do quadrinho (catálogo + detalhe próprio, ou custom)
export function resolveEstilo(quad, dados) {
  const est = (dados.estilos || []).find((e) => e.id === quad.estiloId)
  if (est) return [est.stylePrefix, quad.estiloExtra].filter(Boolean).join(', ')
  return quad.stylePrefix || ''
}

// compõe o prompt final de um painel (o mesmo que o servidor monta ao gerar): a IA desenha os balões
export function composePainelPrompt(painel, quad, dados, byId) {
  const estilo = resolveEstilo(quad, dados)
  const rules = dados.projeto?.quadrinhoRules || DEFAULT_QUAD_RULES
  const falas = (painel.falas || []).filter((f) => (f.texto || '').trim()).map((f) => {
    const nome = byId[f.personagem]?.nome
    return nome
      ? `${nome} says in a comic speech balloon: "${f.texto.trim()}"`
      : `a caption box reads: "${f.texto.trim()}"`
  })
  const corpo = [painel.promptImagem, falas.join('. ')].filter(Boolean).join('. ')
  return `${estilo}, comic panel. ${corpo}\n\n${rules}`
}
