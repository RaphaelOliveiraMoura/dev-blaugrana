import React, { useState } from 'react'
import { PromptBlock, Recolhivel, Icon, CharAvatar } from '../components/index.js'
import { sagaProgress, quadProgress } from '../lib/progresso.js'
import { useStudio } from '../app/StudioContext.jsx'

// primeira arte que já saiu vira capa do card; sem nenhuma, o card cai no ícone
function capaSaga(saga, existing) {
  for (const ep of saga.episodios || []) {
    for (const c of ep.cenas || []) {
      if (c.imagem && existing[c.imagem]) return c.imagem
    }
  }
  return null
}
function capaQuad(quad, existing) {
  const capa = (quad.paineis || [])[0]
  return capa && existing[capa.imagem] ? capa.imagem : null
}

// Sagas e quadrinhos que ainda não fecharam, do mais adiantado para o mais cru: o
// que está quase pronto é o que vale terminar primeiro.
function emAndamento(dados, progress, existing) {
  const itens = []
  for (const saga of dados.sagas || []) {
    const prog = sagaProgress(saga, progress)
    if (prog.total > 0 && prog.prontos === prog.total) continue
    itens.push({
      key: 's-' + saga.id, tipo: 'saga', icone: 'sagas',
      titulo: saga.titulo, selo: saga.selo, elenco: saga.elenco || [],
      capa: capaSaga(saga, existing),
      progTexto: `${prog.prontos}/${prog.total} episódios`,
      frac: prog.total ? prog.prontos / prog.total : 0,
      abrir: (nav) => nav.saga(saga.id),
    })
  }
  for (const quad of dados.quadrinhos || []) {
    const prog = quadProgress(quad, progress)
    if (prog.done) continue
    itens.push({
      key: 'q-' + quad.id, tipo: 'quadrinho', icone: 'quadrinhos',
      titulo: quad.titulo, selo: quad.selo, elenco: quad.elenco || [],
      capa: capaQuad(quad, existing),
      progTexto: `${prog.img}/${prog.total} painéis`,
      frac: prog.total ? prog.img / prog.total : 0,
      abrir: (nav) => nav.quadrinho(quad.id),
    })
  }
  return itens.sort((a, b) => b.frac - a.frac)
}

function Andamento() {
  const { dados, progress, existing, bust, nav } = useStudio()
  const byId = Object.fromEntries((dados.personagens || []).map((p) => [p.id, p]))
  const itens = emAndamento(dados, progress, existing)
  const [verTudo, setVerTudo] = useState(false)
  const mostrar = verTudo ? itens : itens.slice(0, 6)

  if (!itens.length) {
    return (
      <div className="panel vazio-ok">
        <Icon name="check" size={18} />
        <div>
          <h3>Nada em aberto</h3>
          <p className="hint">Toda saga e todo quadrinho dos dados está fechado no disco.</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="section-head">
        <h3 className="section-title">
          Em andamento
          <span className="section-nota">{itens.length} pendente(s)</span>
        </h3>
        {itens.length > 6 && (
          <button className="btn btn-ghost btn-sm" onClick={() => setVerTudo(!verTudo)}>
            {verTudo ? 'Ver só os 6 primeiros' : `Ver todos os ${itens.length}`}
          </button>
        )}
      </div>
      <div className="quad-grid mb-4">
        {mostrar.map((it) => (
          <div className="quad-card" key={it.key} onClick={() => it.abrir(nav)} role="button" tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') it.abrir(nav) }}>
            <div className="quad-capa">
              {it.capa
                ? <img src={'/files/' + it.capa + (bust ? '?v=' + bust : '')} alt="" />
                : <Icon name={it.icone} size={22} className="quad-capa-empty" />}
            </div>
            <div className="quad-card-corpo">
              <div className="quad-card-top">
                <h3 title={it.titulo}>{it.titulo}</h3>
                <div className="saga-card-cast">
                  {it.elenco.map((id) => byId[id] && <CharAvatar key={id} p={byId[id]} existing={existing} bust={bust} />)}
                </div>
              </div>
              <div className="quad-card-foot">
                <span className="selo">{it.selo}</span>
                <span className="quad-card-prog">{it.progTexto}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

// INÍCIO: o que falta terminar, e as referências da casa a um clique.
export default function Home() {
  const { dados, update, progress } = useStudio()
  const [ref, setRef] = useState(null)

  const nEps = (dados.sagas || []).reduce((a, s) => a + s.episodios.length, 0)
  const nQuadProntos = (dados.quadrinhos || []).filter((q) => quadProgress(q, progress).done).length
  const linha = [
    `${(dados.sagas || []).length} sagas`,
    `${nEps} episódios`,
    `${(dados.quadrinhos || []).length} quadrinhos (${nQuadProntos} prontos)`,
    `${(dados.personagens || []).length} personagens no pool`,
  ].join(' · ')

  return (
    <div>
      <Andamento />
      <p className="hint intro">{linha}</p>

      <div className="section-head"><h3 className="section-title">Referências da casa</h3></div>

      <Recolhivel titulo="Pipeline de ferramentas" nota={`${(dados.ferramentas || []).length} etapas`}
        aberto={ref === 'ferramentas'} onToggle={() => setRef(ref === 'ferramentas' ? null : 'ferramentas')}>
        <table className="tools-table">
          <tbody>
            {(dados.ferramentas || []).map((f) => (
              <tr key={f.etapa}>
                <td className="tool-etapa">{f.etapa}</td>
                <td className="tool-nome">{f.nome}</td>
                <td className="muted">{f.nota}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Recolhivel>

      <Recolhivel titulo="Regras da casa" nota="vão em todo prompt"
        aberto={ref === 'regras'} onToggle={() => setRef(ref === 'regras' ? null : 'regras')}>
        <p className="hint mb-4">
          Vai junto automaticamente quando você copia ou gera qualquer prompt de ficha ou cena. Evita marcas,
          quebra de consistência e desvio de estilo.
        </p>
        <PromptBlock
          label="Negativos e consistência"
          value={dados.projeto.promptRules}
          onChange={(v) => update((n) => { n.projeto.promptRules = v })}
        />
      </Recolhivel>

      <Recolhivel titulo="Áudio da casa" nota="narrador e vinheta"
        aberto={ref === 'audio'} onToggle={() => setRef(ref === 'audio' ? null : 'audio')}>
        <p className="hint mb-4">{dados.audio.narradorVoz}</p>
        <PromptBlock label="Vinheta" tool="Suno · gerar 1x e reusar" value={dados.audio.vinhetaPrompt} onChange={() => {}} />
      </Recolhivel>
    </div>
  )
}
