import React from 'react'
import { Icon } from '../../components/index.js'
import { epProgress } from '../../lib/progresso.js'
import { blankEp, uniqueId, allEpIds, dupEp } from '../../lib/scaffold.js'
import { epIdDe } from '../../../shared/caminhos.mjs'
import { useStudio } from '../../app/StudioContext.jsx'

// A lista de episódios: o motivo de você abrir uma saga. Fica na primeira dobra.
export function SagaEpisodios({ saga, si, onExcluirEp }) {
  const { dados, update, existing, progress, bust, nav } = useStudio()

  function novoEpisodio() {
    const epId = uniqueId(epIdDe(saga.id, saga.episodios.length + 1), allEpIds(dados))
    update((n) => { n.sagas[si].episodios.push(blankEp(epId)) })
  }
  function duplicarEp(ei) {
    const copia = dupEp(saga.episodios[ei], dados)
    update((n) => { n.sagas[si].episodios.splice(ei + 1, 0, copia) })
  }

  return (
    <>
      <div className="section-head">
        <h3 className="section-title">{saga.episodios.length} episódios</h3>
        <button className="btn btn-sm" onClick={novoEpisodio}><Icon name="plus" size={12} /> Novo episódio</button>
      </div>
      <div className="ep-list">
        {saga.episodios.map((ep, ei) => {
          const prog = epProgress(ep, progress)
          return (
            <div className="ep-row" key={ep.id}>
              <div className="ep-row-main" onClick={() => nav.episodio(saga.id, ep.id)} role="button" tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') nav.episodio(saga.id, ep.id) }}>
                <div className="ep-row-thumb">
                  {existing[ep.cenas[0]?.imagem]
                    ? <img src={'/files/' + ep.cenas[0].imagem + (bust ? '?v=' + bust : '')} alt="" />
                    : <span>{ei + 1}</span>}
                </div>
                <div className="ep-row-body">
                  <div className="ep-row-title">{ep.id.toUpperCase()}, {ep.titulo}</div>
                  <div className="ep-row-sub">{ep.publicar}</div>
                </div>
                <div className="ep-row-prog">
                  <span title="imagens" className={prog.img === prog.total ? 'ok' : ''}>
                    <Icon name="imagem" size={12} /> {prog.img}/{prog.total}
                  </span>
                  <span title="vídeos" className={prog.vid === prog.total ? 'ok' : ''}>
                    <Icon name="video" size={12} /> {prog.vid}/{prog.total}
                  </span>
                  <span title="narração" className={prog.audio === prog.total ? 'ok' : ''}>
                    <Icon name="narracao" size={12} /> {prog.audio}/{prog.total}
                  </span>
                  {prog.done && <span className="ep-done"><Icon name="check" size={12} /> pronto</span>}
                </div>
              </div>
              <div className="ep-row-actions">
                <button className="btn btn-ghost btn-icon btn-sm" title="Duplicar episódio" onClick={() => duplicarEp(ei)}>
                  <Icon name="duplicar" size={13} />
                </button>
                <button className="btn btn-ghost btn-icon btn-sm btn-danger" title="Excluir episódio" onClick={() => onExcluirEp(ei)}>
                  <Icon name="trash" size={13} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
