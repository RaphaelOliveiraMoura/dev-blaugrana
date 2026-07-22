import React, { useState } from 'react'
import {
  EditField, PromptBlock, Media, StatusPill, FilePath, GenerateButton, Icon, MidiaCard, DetalheModal, CopyButton,
} from '../../components/index.js'
import { FORMATOS } from '../../lib/formatos.js'
import { blankPainel, dupPainel } from '../../lib/scaffold.js'
import { numeroAncoraCenario } from '../../../shared/cenario.mjs'
import { useStudio } from '../../app/StudioContext.jsx'
import { reverterImagem } from '../../api/geracao.js'
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

// Um botão de gerar por painel, com o aviso certo. Vive no card (compacto, ao lado
// das outras ações) e no detalhe aberto, embaixo da arte que ele substitui.
function BotaoGerar({ painel, quad, refs, compacto }) {
  const { existing, jobs, startGen } = useStudio()
  const ancora = numeroAncoraCenario(quad, painel)
  const ancoraPainel = ancora ? quad.paineis.find((p) => p.numero === ancora) : null
  const ancoraPronto = ancoraPainel && existing[ancoraPainel.imagem]
  const partes = []
  if (refs.length) partes.push(`fichas: ${refs.join(', ')}`)
  if (ancora) partes.push(ancoraPronto ? `cenário do painel ${ancora}` : `cenário do painel ${ancora} (gere-o primeiro)`)
  const refInfo = partes.length
    ? `Referências anexadas — ${partes.join('; ')}.`
    : 'Nenhuma ficha do elenco gerada ainda: vai sem referência e o personagem pode variar.'
  return (
    <GenerateButton
      payload={{ tipo: 'painel', quadrinhoId: quad.id, painelNumero: painel.numero }}
      targetPath={painel.imagem}
      existing={existing}
      jobs={jobs}
      startGen={startGen}
      label="Gerar painel"
      compacto={compacto}
      refInfo={refInfo}
    />
  )
}

// Refino pontual: um fluxo À PARTE da geração. Com a arte já pronta, você descreve uma
// mudança pequena e a IA reusa a PRÓPRIA arte como base, mexendo só no que você pediu (em
// vez de regerar do roteiro). Sobrescreve o painel com backup; o "Reverter" traz a versão
// anterior de volta. Usa a mesma fila da geração, então divide o "gerando…" com o Gerar.
function RefinarPainel({ painel, quad }) {
  const { existing, jobs, startGen, marcarGerado } = useStudio()
  const [texto, setTexto] = useState('')
  const [revertendo, setRevertendo] = useState(false)
  const [msg, setMsg] = useState(null)
  const alvo = painel.imagem
  if (!existing[alvo]) return null // só refina o que já tem arte
  const myJob = jobs.find((j) => j.targetPath === alvo && (j.status === 'queued' || j.status === 'running'))

  async function refinar() {
    const t = texto.trim()
    if (!t) return
    setMsg(null)
    const ok = await startGen(
      { tipo: 'painel', quadrinhoId: quad.id, painelNumero: painel.numero, refino: t },
      alvo, 'Refinar painel', 'imagem',
    )
    if (ok) setTexto('')
  }

  async function reverter() {
    setRevertendo(true); setMsg(null)
    try {
      await reverterImagem(alvo)
      marcarGerado(alvo) // recarrega a arte revertida na tela (cache-bust)
      setMsg('revertido pra versão anterior')
    } catch (e) {
      setMsg(e.message || 'não deu pra reverter')
    } finally {
      setRevertendo(false)
    }
  }

  return (
    <div className="refino">
      <span className="label">Refinar (mudança pontual)</span>
      <textarea
        className="field" rows={2}
        placeholder="ex.: deixe o cabelo do 10 mais escuro; aumente a placa"
        value={texto} onChange={(e) => setTexto(e.target.value)} disabled={!!myJob}
      />
      <div className="row-actions">
        <button className="btn btn-sm btn-primary" onClick={refinar} disabled={!texto.trim() || !!myJob}>
          {myJob ? <span className="gen-spinner" /> : <Icon name="editar" size={13} />}
          {myJob ? 'refinando…' : 'Refinar'}
        </button>
        <button className="btn btn-sm" onClick={reverter} disabled={revertendo || !!myJob} title="Volta pra versão anterior da arte">
          {revertendo ? 'revertendo…' : 'Reverter'}
        </button>
        {msg && <span className="gen-hint">{msg}</span>}
      </div>
      <span className="gen-hint">
        Usa a arte atual como base e muda só o que você descreve. Sobrescreve o painel (dá pra reverter).
      </span>
    </div>
  )
}

// O detalhe do painel: a arte à esquerda, o que a descreve à direita.
function PainelModal({ painel, i, quad, qi, byId, refs, onDuplicar, onExcluir, onFechar }) {
  const { dados, update, existing, bust } = useStudio()
  const setPainel = (campo, v) => update((n) => { n.quadrinhos[qi].paineis[i][campo] = v })

  return (
    <DetalheModal
      titulo={`Painel ${painel.numero}`}
      meta={<StatusPill value={painel.status} onChange={(v) => setPainel('status', v)} />}
      acoes={(
        <>
          <button className="btn btn-ghost btn-icon btn-sm" title="Duplicar painel"
            onClick={() => { onFechar(); onDuplicar(i) }}>
            <Icon name="duplicar" size={13} />
          </button>
          <button className="btn btn-ghost btn-icon btn-sm btn-danger" title="Excluir painel"
            onClick={() => { onFechar(); onExcluir(i) }}>
            <Icon name="trash" size={13} />
          </button>
        </>
      )}
      midia={(
        <>
          <Media existing={existing} src={painel.imagem} kind="img" bust={bust} />
          <FilePath path={painel.imagem} />
          <BotaoGerar painel={painel} quad={quad} refs={refs} />
          <span className="gen-hint">
            as fichas do elenco vão como referência
            {numeroAncoraCenario(quad, painel) ? ` + o cenário do painel ${numeroAncoraCenario(quad, painel)}` : ''}
          </span>
          <RefinarPainel painel={painel} quad={quad} />
        </>
      )}
      onFechar={onFechar}
    >
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
    </DetalheModal>
  )
}

export function QuadrinhoPaineis({ quad, qi, byId, onExcluirPainel }) {
  const { dados, update, existing, bust } = useStudio()
  const [aberto, setAberto] = useState(null) // o número do painel em detalhe, ou null

  const ar = FORMATOS[quad.formato]?.ar || '3 / 4'
  const refs = (quad.elenco || []).filter((id) => existing[byId[id]?.imagem]).map((id) => byId[id]?.nome || id)
  const iAberto = quad.paineis.findIndex((p) => p.numero === aberto)

  function novoPainel() {
    const novo = (quad.paineis.length ? Math.max(...quad.paineis.map((p) => p.numero)) : 0) + 1
    update((n) => { n.quadrinhos[qi].paineis.push(blankPainel(quad.id, novo)) })
    setAberto(novo) // nasce vazio: o detalhe é o que ele precisa
  }
  function duplicarPainel(i) {
    const novo = Math.max(...quad.paineis.map((p) => p.numero)) + 1
    update((n) => { n.quadrinhos[qi].paineis.splice(i + 1, 0, dupPainel(quad.paineis[i], quad.id, novo)) })
    setAberto(novo)
  }

  const nProntos = quad.paineis.filter((p) => existing[p.imagem]).length

  return (
    <>
      <div className="section-head">
        <h3 className="section-title">
          {quad.paineis.length} painéis
          {nProntos > 0 && <span className="section-nota">{nProntos} com arte</span>}
        </h3>
        <div className="row-actions">
          <button className="btn btn-sm" onClick={novoPainel}><Icon name="plus" size={12} /> Novo painel</button>
        </div>
      </div>

      <div className="midia-grid">
        {quad.paineis.map((painel, i) => {
          const temArte = !!existing[painel.imagem]
          const nFalas = (painel.falas || []).filter((f) => (f.texto || '').trim()).length
          return (
            <MidiaCard
              key={painel.numero}
              numero={painel.numero}
              titulo={nFalas ? `${nFalas} fala(s)` : <span className="muted">sem falas</span>}
              ar={temArte ? ar : undefined}
              midia={<Media existing={existing} src={painel.imagem} kind="img" bust={bust} />}
              onAbrir={() => setAberto(painel.numero)}
              acoes={(
                <>
                  <CopyButton
                    text={composePainelPrompt(painel, quad, dados, byId)}
                    label={null}
                    title="Copiar o prompt da arte (estilo + cena + falas + regras)"
                  />
                  <BotaoGerar painel={painel} quad={quad} refs={refs} compacto />
                </>
              )}
            />
          )
        })}
      </div>

      {iAberto >= 0 && (
        <PainelModal
          painel={quad.paineis[iAberto]}
          i={iAberto}
          quad={quad}
          qi={qi}
          byId={byId}
          refs={refs}
          onDuplicar={duplicarPainel}
          onExcluir={onExcluirPainel}
          onFechar={() => setAberto(null)}
        />
      )}
    </>
  )
}
