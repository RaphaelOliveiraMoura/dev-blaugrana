import React, { useState } from 'react'
import { PromptBlock, Recolhivel, Icon, EpProgresso } from '../components/index.js'
import { epProgress, quadProgress } from '../lib/progresso.js'
import { useStudio } from '../app/StudioContext.jsx'

// Tudo que ainda não fechou, do mais adiantado para o mais cru: o que está quase
// pronto é o que vale terminar primeiro.
function emAndamento(dados, progress) {
  const itens = []
  for (const saga of dados.sagas || []) {
    for (const ep of saga.episodios) {
      const p = epProgress(ep, progress)
      if (p.done || p.total === 0) continue
      const feito = p.img + p.vid + p.audio
      itens.push({ saga, ep, p, feito, frac: feito / (p.total * 3) })
    }
  }
  return itens.sort((a, b) => b.frac - a.frac)
}

function Andamento() {
  const { dados, progress, existing, bust, nav } = useStudio()
  const itens = emAndamento(dados, progress)
  const [verTudo, setVerTudo] = useState(false)
  const mostrar = verTudo ? itens : itens.slice(0, 5)

  if (!itens.length) {
    return (
      <div className="panel vazio-ok">
        <Icon name="check" size={18} />
        <div>
          <h3>Nenhum episódio em aberto</h3>
          <p className="hint">Todo episódio dos dados está com imagem, vídeo e narração no disco.</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="section-head">
        <h3 className="section-title">
          Em andamento
          <span className="section-nota">{itens.length} episódio(s)</span>
        </h3>
        {itens.length > 5 && (
          <button className="btn btn-ghost btn-sm" onClick={() => setVerTudo(!verTudo)}>
            {verTudo ? 'Ver só os 5 primeiros' : `Ver todos os ${itens.length}`}
          </button>
        )}
      </div>
      <div className="ep-list mb-4">
        {mostrar.map(({ saga, ep, p }) => (
          <div className="ep-row" key={ep.id}>
            <div className="ep-row-main" onClick={() => nav.episodio(saga.id, ep.id)} role="button" tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') nav.episodio(saga.id, ep.id) }}>
              <div className="ep-row-thumb">
                {existing[ep.cenas[0]?.imagem]
                  ? <img src={'/files/' + ep.cenas[0].imagem + (bust ? '?v=' + bust : '')} alt="" />
                  : <span>{ep.cenas.length}</span>}
              </div>
              <div className="ep-row-body">
                <div className="ep-row-title">{ep.titulo}</div>
                <div className="ep-row-sub">{saga.titulo}</div>
              </div>
              <EpProgresso p={p} />
              <Icon name="chevron" size={13} className="ep-row-ir" />
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
