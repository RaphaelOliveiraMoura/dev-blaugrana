import React, { useState } from 'react'
import { ConfirmModal, EditField, PromptBlock, Media, StatusPill, FilePath, GenerateButton, CopyButton } from '../ui.jsx'
import { FORMATOS, TIPOS_QUADRINHO } from '../lib/helpers.js'
import { dupQuadrinho, blankPainel, dupPainel, blankChar } from '../lib/scaffold.js'

const DEFAULT_QUAD_RULES = 'comic book panel, bold clean speech balloons with short legible text, expressive exaggerated faces, dynamic composition; no real brand logos, no official crests, plain golden star instead; keep each character identical to their reference sheet.'

// resolve o prefixo de estilo do quadrinho (catálogo + detalhe próprio, ou custom)
function resolveEstilo(quad, dados) {
  const est = (dados.estilos || []).find((e) => e.id === quad.estiloId)
  if (est) return [est.stylePrefix, quad.estiloExtra].filter(Boolean).join(', ')
  return quad.stylePrefix || ''
}

// compõe o prompt final de um painel (o mesmo que o servidor monta ao gerar): a IA desenha os balões
function composePainelPrompt(painel, quad, dados, byId) {
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

function FalasEditor({ falas, elencoIds, byId, onChange }) {
  const add = () => onChange([...(falas || []), { personagem: elencoIds[0] || '', texto: '' }])
  const setF = (i, campo, v) => onChange(falas.map((f, k) => (k === i ? { ...f, [campo]: v } : f)))
  const del = (i) => onChange(falas.filter((_, k) => k !== i))
  return (
    <div className="falas">
      {(falas || []).map((f, i) => (
        <div className="fala-row" key={i}>
          <select className="add-select" value={f.personagem} onChange={(e) => setF(i, 'personagem', e.target.value)}>
            <option value="">💬 legenda/caixa</option>
            {elencoIds.map((id) => <option key={id} value={id}>{byId[id]?.nome || id}</option>)}
          </select>
          <input className="fala-text" value={f.texto} placeholder="fala curta (a IA desenha o balão)" onChange={(e) => setF(i, 'texto', e.target.value)} />
          <button className="mini-btn danger" title="remover fala" onClick={() => del(i)}>✕</button>
        </div>
      ))}
      <button className="mini-btn" onClick={add}>＋ Fala/balão</button>
    </div>
  )
}

export default function QuadrinhoView({ dados, qi, update, existing, bust, jobs, startGen, goQuad, goQuadrinhos }) {
  const quad = dados.quadrinhos[qi]
  const byId = Object.fromEntries(dados.personagens.map((p) => [p.id, p]))
  const [confirm, setConfirm] = useState(null)
  const set = (campo, v) => update((n) => { n.quadrinhos[qi][campo] = v })
  const setPainel = (i, campo, v) => update((n) => { n.quadrinhos[qi].paineis[i][campo] = v })
  const ar = FORMATOS[quad.formato]?.ar || '4 / 5'

  function duplicar() {
    const copia = dupQuadrinho(quad, dados.quadrinhos.map((q) => q.id))
    update((n) => { n.quadrinhos.splice(qi + 1, 0, copia) })
    goQuad(qi + 1)
  }
  function excluir() {
    setConfirm({
      titulo: 'Excluir quadrinho?',
      mensagem: `"${quad.titulo}" sai dos dados. As artes no disco continuam. Salve depois para efetivar.`,
      confirmar: 'Excluir', perigo: true,
      onConfirm: () => { setConfirm(null); goQuadrinhos(); update((n) => { n.quadrinhos.splice(qi, 1) }) },
    })
  }
  function novoPainel() {
    const novo = (quad.paineis.length ? Math.max(...quad.paineis.map((p) => p.numero)) : 0) + 1
    update((n) => { n.quadrinhos[qi].paineis.push(blankPainel(quad.id, novo)) })
  }
  function duplicarPainel(i) {
    const novo = Math.max(...quad.paineis.map((p) => p.numero)) + 1
    update((n) => { n.quadrinhos[qi].paineis.splice(i + 1, 0, dupPainel(quad.paineis[i], quad.id, novo)) })
  }
  function excluirPainel(i) {
    const p = quad.paineis[i]
    setConfirm({
      titulo: 'Excluir painel?',
      mensagem: `O painel ${p.numero} sai do quadrinho. A arte no disco continua. Salve depois para efetivar.`,
      confirmar: 'Excluir', perigo: true,
      onConfirm: () => { setConfirm(null); update((n) => { n.quadrinhos[qi].paineis.splice(i, 1) }) },
    })
  }
  function addAoElenco(pid) { update((n) => { if (!n.quadrinhos[qi].elenco.includes(pid)) n.quadrinhos[qi].elenco.push(pid) }) }
  function removerDoElenco(pid) { update((n) => { n.quadrinhos[qi].elenco = n.quadrinhos[qi].elenco.filter((x) => x !== pid) }) }
  function novoPersonagem() {
    const p = blankChar(dados.personagens.map((x) => x.id), '')
    update((n) => { n.personagens.push(p); n.quadrinhos[qi].elenco.push(p.id) })
  }
  const foraDoElenco = dados.personagens.filter((p) => !quad.elenco.includes(p.id))

  return (
    <div>
      {confirm && <ConfirmModal {...confirm} onCancel={() => setConfirm(null)} />}
      <div className="panel">
        <div className="saga-card-head">
          <span className="selo">{quad.selo}</span>
          <div className="row-actions">
            <button className="mini-btn" onClick={duplicar}>⧉ Duplicar</button>
            <button className="mini-btn danger" onClick={excluir}>🗑 Excluir</button>
          </div>
        </div>
        <EditField label="Título" value={quad.titulo} onChange={(v) => set('titulo', v)} />
        <div className="edit-row">
          <label className="edit-field">
            <span className="edit-label">Tipo</span>
            <select value={quad.tipo} onChange={(e) => set('tipo', e.target.value)}>
              {Object.entries(TIPOS_QUADRINHO).map(([t, m]) => <option key={t} value={t}>{m.label}</option>)}
            </select>
          </label>
          <label className="edit-field">
            <span className="edit-label">Formato</span>
            <select value={quad.formato} onChange={(e) => set('formato', e.target.value)}>
              {Object.entries(FORMATOS).map(([f, m]) => <option key={f} value={f}>{m.label}</option>)}
            </select>
          </label>
          <EditField label="Selo" value={quad.selo} onChange={(v) => set('selo', v)} />
          <EditField label="Status" value={quad.status} onChange={(v) => set('status', v)} />
        </div>
        <EditField label="Contexto / gancho real (nota interna)" value={quad.contexto} onChange={(v) => set('contexto', v)} textarea />
        <label className="edit-field">
          <span className="edit-label">Estilo visual (do catálogo 🎨 Estilos)</span>
          <select value={quad.estiloId || ''} onChange={(e) => set('estiloId', e.target.value || undefined)}>
            <option value="">(estilo próprio / custom)</option>
            {(dados.estilos || []).map((es) => <option key={es.id} value={es.id}>{es.nome}</option>)}
          </select>
        </label>
        {quad.estiloId
          ? <EditField label="Detalhe de arte próprio (somado ao estilo)" value={quad.estiloExtra || ''} onChange={(v) => set('estiloExtra', v)} textarea />
          : <PromptBlock label="Prefixo de estilo próprio" value={quad.stylePrefix || ''} onChange={(v) => set('stylePrefix', v)} />}
      </div>

      <div className="section-head">
        <h3 className="section-title">Elenco</h3>
        <div className="row-actions">
          {foraDoElenco.length > 0 && (
            <select className="add-select" value="" onChange={(e) => { if (e.target.value) addAoElenco(e.target.value) }}>
              <option value="">＋ Adicionar do pool…</option>
              {foraDoElenco.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          )}
          <button className="mini-btn" onClick={novoPersonagem}>＋ Novo personagem</button>
        </div>
      </div>
      <div className="cast-editor">
        {quad.elenco.length === 0
          ? <span className="muted" style={{ fontSize: 12 }}>Sem elenco. Adicione do pool ou crie um novo (as fichas viram referência das artes).</span>
          : quad.elenco.map((id) => (
            <span key={id} className="cast-chip in" title="clique para remover do elenco" onClick={() => removerDoElenco(id)}>
              {byId[id]?.nome || id} ✕
            </span>
          ))}
      </div>

      <div className="section-head">
        <h3 className="section-title">Painéis <span className="muted" style={{ fontWeight: 400 }}>({quad.paineis.length})</span></h3>
        <button className="mini-btn" onClick={novoPainel}>＋ Novo painel</button>
      </div>
      {quad.paineis.map((painel, i) => {
        const composed = composePainelPrompt(painel, quad, dados, byId)
        return (
          <div className="panel cena" key={painel.numero}>
            <div className="cena-head">
              <h3>PAINEL {painel.numero}</h3>
              <div className="row-actions">
                <button className="mini-btn" title="Duplicar painel" onClick={() => duplicarPainel(i)}>⧉</button>
                <button className="mini-btn danger" title="Excluir painel" onClick={() => excluirPainel(i)}>🗑</button>
              </div>
            </div>
            <div className="cena-cols">
              <div className="cena-media">
                <div className="media-slot">
                  <div className="media-head"><span>Arte</span><StatusPill value={painel.status} onChange={(v) => setPainel(i, 'status', v)} /></div>
                  <div className="quad-panel-media" style={{ aspectRatio: ar }}>
                    <Media existing={existing} src={painel.imagem} kind="img" bust={bust} />
                  </div>
                  <FilePath path={painel.imagem} />
                </div>
              </div>
              <div className="cena-prompts">
                <EditField label="Roteiro do painel (o que acontece, nota)" value={painel.roteiro} onChange={(v) => setPainel(i, 'roteiro', v)} textarea />
                <PromptBlock
                  label="Prompt da arte (cena/enquadramento)"
                  tool="ChatGPT Images"
                  value={painel.promptImagem}
                  onChange={(v) => setPainel(i, 'promptImagem', v)}
                  copyText={composed}
                  hint="O copiar já monta: estilo + cena + falas (como balões) + regras. A IA desenha os balões."
                />
                <div className="cast-label" style={{ marginTop: 4 }}>Falas / balões <span className="muted">(texto curto, a IA desenha)</span></div>
                <FalasEditor
                  falas={painel.falas}
                  elencoIds={quad.elenco}
                  byId={byId}
                  onChange={(v) => setPainel(i, 'falas', v)}
                />
                <div className="gen-row" style={{ marginTop: 10 }}>
                  <GenerateButton
                    payload={{ tipo: 'painel', quadrinhoId: quad.id, painelNumero: painel.numero }}
                    targetPath={painel.imagem}
                    existing={existing}
                    jobs={jobs}
                    startGen={startGen}
                    label="⚡ Gerar painel"
                    refInfo={(() => {
                      const refs = (quad.elenco || []).filter((id) => existing[byId[id]?.imagem]).map((id) => byId[id]?.nome || id)
                      return refs.length
                        ? `Fichas anexadas como referência: ${refs.join(', ')}.`
                        : '⚠ Nenhuma ficha do elenco gerada ainda: vai sem referência (personagem pode variar).'
                    })()}
                  />
                  <span className="gen-hint muted">as fichas do elenco vão como referência</span>
                </div>
              </div>
            </div>
          </div>
        )
      })}

      <div className="section-head">
        <h3 className="section-title">Publicar</h3>
      </div>
      <div className="panel">
        <PromptBlock
          label="Legenda do post (com CTA de save/share)"
          tool="carrossel: 'salva pra ver o próximo' · 'marca um culé'"
          value={quad.legenda || ''}
          onChange={(v) => set('legenda', v)}
          hint="No Instagram o save é o sinal nº 1 (2026). Peça save/DM na legenda. Palavra-chave (jogador/clube) no início."
        />
        <div className="quad-export">
          <span className="muted" style={{ fontSize: 12 }}>Artes prontas pra subir (na ordem dos painéis):</span>
          {quad.paineis.map((p) => (
            <span key={p.numero} className={'quad-export-chip' + (existing[p.imagem] ? ' ok' : '')}>
              {p.numero}{existing[p.imagem] ? ' ✓' : ' ·'}
            </span>
          ))}
          <CopyButton text={quad.paineis.map((p) => p.imagem).join('\n')} label="copiar caminhos" />
        </div>
      </div>
    </div>
  )
}
