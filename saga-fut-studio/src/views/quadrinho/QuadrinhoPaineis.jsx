import React, { useState } from 'react'
import {
  EditField, PromptBlock, Media, StatusPill, FilePath, GenerateButton, Icon,
} from '../../components/index.js'
import { FORMATOS } from '../../lib/formatos.js'
import { blankPainel, dupPainel } from '../../lib/scaffold.js'
import { useStudio } from '../../app/StudioContext.jsx'
import { composePainelPrompt } from './prompt.js'

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

function Painel({ painel, i, quad, qi, byId, aberto, onToggle, onDuplicar, onExcluir }) {
  const { dados, update, existing, bust, jobs, startGen } = useStudio()
  const setPainel = (campo, v) => update((n) => { n.quadrinhos[qi].paineis[i][campo] = v })
  const ar = FORMATOS[quad.formato]?.ar || '4 / 5'
  const temArte = !!existing[painel.imagem]
  const refs = (quad.elenco || []).filter((id) => existing[byId[id]?.imagem]).map((id) => byId[id]?.nome || id)
  const nFalas = (painel.falas || []).filter((f) => (f.texto || '').trim()).length

  return (
    <div className={'panel cena' + (aberto ? ' aberta' : '')}>
      <div className="cena-head">
        <button className="cena-num" onClick={onToggle} aria-expanded={aberto}
          title={aberto ? 'Recolher painel' : 'Expandir painel'}>
          <Icon name="chevron" size={11} className="cena-chevron" />
          {painel.numero}
        </button>
        <span className="cena-titulo-fixo">Painel {painel.numero}</span>
        {!aberto && (
          <span className="cena-sinais">
            <span className={'cena-sinal' + (temArte ? ' ok' : '')} title={'arte' + (temArte ? ': pronta' : ': falta')}>
              <Icon name="imagem" size={12} />
            </span>
            <span className="painel-falas-cont">{nFalas} fala(s)</span>
          </span>
        )}
        <button className="btn btn-ghost btn-icon btn-sm" title="Duplicar painel" onClick={() => onDuplicar(i)}>
          <Icon name="duplicar" size={13} />
        </button>
        <button className="btn btn-ghost btn-icon btn-sm btn-danger" title="Excluir painel" onClick={() => onExcluir(i)}>
          <Icon name="trash" size={13} />
        </button>
      </div>

      {aberto && (
        <div className="cena-corpo">
          <div className="cena-cols">
            <div className="cena-media">
              <div className="media-slot">
                <div className="media-head">
                  <span className="media-head-label"><Icon name="imagem" size={12} /> Arte</span>
                  <span className="media-head-acoes">
                    <FilePath path={painel.imagem} compacto />
                    <StatusPill value={painel.status} onChange={(v) => setPainel('status', v)} />
                  </span>
                </div>
                <div className="quad-panel-media" style={{ aspectRatio: temArte ? ar : 'auto' }}>
                  <Media existing={existing} src={painel.imagem} kind="img" bust={bust} />
                </div>
              </div>
            </div>

            <div className="cena-prompts">
              <EditField label="Roteiro do painel" hint="O que acontece. Nota interna."
                value={painel.roteiro} onChange={(v) => setPainel('roteiro', v)} textarea />
              <PromptBlock
                label="Prompt da arte"
                tool="ChatGPT Images"
                value={painel.promptImagem}
                onChange={(v) => setPainel('promptImagem', v)}
                copyText={composePainelPrompt(painel, quad, dados, byId)}
                hint="O copiar já monta estilo + cena + falas (como balões) + regras. A IA desenha os balões."
              />
              <span className="label">Falas e balões</span>
              <FalasEditor
                falas={painel.falas}
                elencoIds={quad.elenco}
                byId={byId}
                onChange={(v) => setPainel('falas', v)}
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
      )}
    </div>
  )
}

export function QuadrinhoPaineis({ quad, qi, byId, onExcluirPainel }) {
  const { update, existing } = useStudio()
  const [aberturaManual, setAberturaManual] = useState({})

  const midiaCarregada = Object.keys(existing).length > 0
  // Arte na mão = painel fechado. Sem arte = é o trabalho, abre.
  const estaAberto = (p) => aberturaManual[p.numero] ?? (midiaCarregada && !existing[p.imagem])

  function novoPainel() {
    const novo = (quad.paineis.length ? Math.max(...quad.paineis.map((p) => p.numero)) : 0) + 1
    update((n) => { n.quadrinhos[qi].paineis.push(blankPainel(quad.id, novo)) })
    setAberturaManual((prev) => ({ ...prev, [novo]: true }))
  }
  function duplicarPainel(i) {
    const novo = Math.max(...quad.paineis.map((p) => p.numero)) + 1
    update((n) => { n.quadrinhos[qi].paineis.splice(i + 1, 0, dupPainel(quad.paineis[i], quad.id, novo)) })
    setAberturaManual((prev) => ({ ...prev, [novo]: true }))
  }

  const todosAbertos = quad.paineis.every(estaAberto)

  return (
    <>
      <div className="section-head">
        <h3 className="section-title">{quad.paineis.length} painéis</h3>
        <div className="row-actions">
          <button className="btn btn-ghost btn-sm"
            onClick={() => setAberturaManual(Object.fromEntries(quad.paineis.map((p) => [p.numero, !todosAbertos])))}>
            {todosAbertos ? 'Recolher todos' : 'Expandir todos'}
          </button>
          <button className="btn btn-sm" onClick={novoPainel}><Icon name="plus" size={12} /> Novo painel</button>
        </div>
      </div>

      {quad.paineis.map((painel, i) => (
        <Painel
          key={painel.numero}
          painel={painel}
          i={i}
          quad={quad}
          qi={qi}
          byId={byId}
          aberto={estaAberto(painel)}
          onToggle={() => setAberturaManual((prev) => ({ ...prev, [painel.numero]: !estaAberto(painel) }))}
          onDuplicar={duplicarPainel}
          onExcluir={onExcluirPainel}
        />
      ))}
    </>
  )
}
