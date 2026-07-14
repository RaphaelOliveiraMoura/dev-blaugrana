import React, { useState } from 'react'
import {
  ConfirmModal, EditField, PromptBlock, Media, StatusPill, FilePath, GenerateButton, CopyButton, Icon,
} from '../components/index.js'
import { FORMATOS, TIPOS_QUADRINHO } from '../lib/formatos.js'
import { dupQuadrinho, blankPainel, dupPainel, blankChar } from '../lib/scaffold.js'
import { useStudio } from '../app/StudioContext.jsx'
import { acharQuadrinho } from '../lib/localizar.js'

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
          <select className="field" value={f.personagem} onChange={(e) => setF(i, 'personagem', e.target.value)}>
            <option value="">caixa de legenda</option>
            {elencoIds.map((id) => <option key={id} value={id}>{byId[id]?.nome || id}</option>)}
          </select>
          <input className="field fala-text" value={f.texto} placeholder="fala curta, a IA desenha o balão"
            onChange={(e) => setF(i, 'texto', e.target.value)} />
          <button className="btn btn-ghost btn-icon btn-sm btn-danger" title="Remover fala" onClick={() => del(i)}>
            <Icon name="x" size={12} />
          </button>
        </div>
      ))}
      <button className="btn btn-sm" onClick={add}><Icon name="plus" size={12} /> Fala ou balão</button>
    </div>
  )
}

export default function QuadrinhoView({ quadId }) {
  const { dados, update, existing, bust, jobs, startGen, nav } = useStudio()
  const { quad, qi } = acharQuadrinho(dados, quadId)
  const byId = Object.fromEntries(dados.personagens.map((p) => [p.id, p]))
  const [confirm, setConfirm] = useState(null)
  const set = (campo, v) => update((n) => { n.quadrinhos[qi][campo] = v })
  const setPainel = (i, campo, v) => update((n) => { n.quadrinhos[qi].paineis[i][campo] = v })
  const ar = FORMATOS[quad.formato]?.ar || '4 / 5'

  function duplicar() {
    const copia = dupQuadrinho(quad, dados.quadrinhos.map((q) => q.id))
    update((n) => { n.quadrinhos.splice(qi + 1, 0, copia) })
    nav.quadrinho(copia.id)
  }
  function excluir() {
    setConfirm({
      titulo: 'Excluir quadrinho?',
      mensagem: `"${quad.titulo}" sai dos dados. As artes no disco continuam. Salve depois para efetivar.`,
      confirmar: 'Excluir', perigo: true,
      onConfirm: () => { setConfirm(null); nav.ir('quadrinhos'); update((n) => { n.quadrinhos.splice(qi, 1) }) },
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
            <button className="btn btn-sm" onClick={duplicar}><Icon name="duplicar" size={12} /> Duplicar</button>
            <button className="btn btn-sm btn-danger" onClick={excluir}><Icon name="trash" size={12} /> Excluir</button>
          </div>
        </div>
        <EditField label="Título" value={quad.titulo} onChange={(v) => set('titulo', v)} />
        <div className="field-row">
          <label className="field-group">
            <span className="label">Tipo</span>
            <select className="field" value={quad.tipo} onChange={(e) => set('tipo', e.target.value)}>
              {Object.entries(TIPOS_QUADRINHO).map(([t, m]) => <option key={t} value={t}>{m.label}</option>)}
            </select>
          </label>
          <label className="field-group">
            <span className="label">Formato</span>
            <select className="field" value={quad.formato} onChange={(e) => set('formato', e.target.value)}>
              {Object.entries(FORMATOS).map(([f, m]) => <option key={f} value={f}>{m.label}</option>)}
            </select>
          </label>
          <EditField label="Selo" value={quad.selo} onChange={(v) => set('selo', v)} />
          <EditField label="Status" value={quad.status} onChange={(v) => set('status', v)} />
        </div>
        <EditField label="Contexto" hint="O gancho real. Nota interna." value={quad.contexto}
          onChange={(v) => set('contexto', v)} textarea />

        <label className="field-group">
          <span className="label">Estilo do catálogo</span>
          <select className="field" value={quad.estiloId || ''} onChange={(e) => set('estiloId', e.target.value || undefined)}>
            <option value="">estilo próprio (custom)</option>
            {(dados.estilos || []).map((es) => <option key={es.id} value={es.id}>{es.nome}</option>)}
          </select>
        </label>
        {quad.estiloId
          ? <EditField label="Detalhe de arte" hint="Somado ao estilo base." value={quad.estiloExtra || ''}
              onChange={(v) => set('estiloExtra', v)} textarea />
          : <PromptBlock label="Prefixo de estilo próprio" value={quad.stylePrefix || ''} onChange={(v) => set('stylePrefix', v)} />}
      </div>

      <div className="section-head">
        <h3 className="section-title">Elenco</h3>
        <div className="row-actions">
          {foraDoElenco.length > 0 && (
            <select className="field" value="" onChange={(e) => { if (e.target.value) addAoElenco(e.target.value) }}>
              <option value="">Adicionar do pool…</option>
              {foraDoElenco.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          )}
          <button className="btn btn-sm" onClick={novoPersonagem}><Icon name="plus" size={12} /> Novo personagem</button>
        </div>
      </div>
      <div className="cast-editor">
        {quad.elenco.length === 0
          ? <span className="hint">Sem elenco. Adicione do pool ou crie um novo: as fichas viram referência das artes.</span>
          : quad.elenco.map((id) => (
            <button key={id} className="cast-chip in" title="Clique para tirar do elenco" onClick={() => removerDoElenco(id)}>
              {byId[id]?.nome || id}
              <Icon name="x" size={11} />
            </button>
          ))}
      </div>

      <div className="section-head">
        <h3 className="section-title">{quad.paineis.length} painéis</h3>
        <button className="btn btn-sm" onClick={novoPainel}><Icon name="plus" size={12} /> Novo painel</button>
      </div>

      {quad.paineis.map((painel, i) => {
        const refs = (quad.elenco || []).filter((id) => existing[byId[id]?.imagem]).map((id) => byId[id]?.nome || id)
        return (
          <div className="panel cena" key={painel.numero}>
            <div className="cena-head">
              <span className="cena-num">{painel.numero}</span>
              <span className="cena-titulo-input">Painel {painel.numero}</span>
              <button className="btn btn-ghost btn-icon btn-sm" title="Duplicar painel" onClick={() => duplicarPainel(i)}>
                <Icon name="duplicar" size={13} />
              </button>
              <button className="btn btn-ghost btn-icon btn-sm btn-danger" title="Excluir painel" onClick={() => excluirPainel(i)}>
                <Icon name="trash" size={13} />
              </button>
            </div>

            <div className="cena-corpo">
              <div className="cena-cols">
                <div className="cena-media">
                  <div className="media-slot">
                    <div className="media-head">
                      <span className="media-head-label"><Icon name="imagem" size={12} /> Arte</span>
                      <StatusPill value={painel.status} onChange={(v) => setPainel(i, 'status', v)} />
                    </div>
                    <div className="quad-panel-media" style={{ aspectRatio: ar }}>
                      <Media existing={existing} src={painel.imagem} kind="img" bust={bust} />
                    </div>
                    <FilePath path={painel.imagem} />
                  </div>
                </div>

                <div className="cena-prompts">
                  <EditField label="Roteiro do painel" hint="O que acontece. Nota interna."
                    value={painel.roteiro} onChange={(v) => setPainel(i, 'roteiro', v)} textarea />
                  <PromptBlock
                    label="Prompt da arte"
                    tool="ChatGPT Images"
                    value={painel.promptImagem}
                    onChange={(v) => setPainel(i, 'promptImagem', v)}
                    copyText={composePainelPrompt(painel, quad, dados, byId)}
                    hint="O copiar já monta estilo + cena + falas (como balões) + regras. A IA desenha os balões."
                  />
                  <span className="label">Falas e balões</span>
                  <FalasEditor
                    falas={painel.falas}
                    elencoIds={quad.elenco}
                    byId={byId}
                    onChange={(v) => setPainel(i, 'falas', v)}
                  />
                  <div className="gen-row">
                    <GenerateButton
                      payload={{ tipo: 'painel', quadrinhoId: quad.id, painelNumero: painel.numero }}
                      targetPath={painel.imagem}
                      existing={existing}
                      jobs={jobs}
                      startGen={startGen}
                      label="Gerar painel"
                      refInfo={refs.length
                        ? `Fichas anexadas como referência: ${refs.join(', ')}.`
                        : 'Nenhuma ficha do elenco gerada ainda: vai sem referência e o personagem pode variar.'}
                    />
                    <span className="gen-hint">as fichas do elenco vão como referência</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })}

      <div className="section-head"><h3 className="section-title">Publicar</h3></div>
      <div className="panel">
        <PromptBlock
          label="Legenda do post"
          tool="peça save e share"
          value={quad.legenda || ''}
          onChange={(v) => set('legenda', v)}
          hint="No Instagram o save é o sinal nº 1. Peça save ou DM na legenda, e ponha a palavra-chave (jogador, clube) no início."
        />
        <div className="quad-export">
          <span className="hint">Artes prontas, na ordem:</span>
          {quad.paineis.map((p) => (
            <span key={p.numero} className={'chip' + (existing[p.imagem] ? ' chip-ok' : '')}>
              {p.numero}
              {existing[p.imagem] && <Icon name="check" size={10} />}
            </span>
          ))}
          <CopyButton text={quad.paineis.map((p) => p.imagem).join('\n')} label="copiar caminhos" />
        </div>
      </div>
    </div>
  )
}
