import React from 'react'
import { Icon, EpProgresso } from '../../components/index.js'
import { epProgress } from '../../lib/progresso.js'
import { epIdDe } from '../../../shared/caminhos.mjs'
import { useStudio } from '../../app/StudioContext.jsx'

// A lista de episódios: o motivo de você abrir uma saga. Fica na primeira dobra.
export function SagaEpisodios({ saga, si, onExcluirEp }) {
  const { dados, update, existing, progress, bust, nav } = useStudio()


  return (
    <>
      <div className="section-head">
        <h3 className="section-title">{saga.episodios.length} episódios</h3>
      </div>
      <div className="ep-grid">
        {saga.episodios.map((ep, ei) => {
          const prog = epProgress(ep, progress)
          const capa = ep.cenas[0]
          const abrir = () => nav.episodio(saga.id, ep.id)
          return (
            <div className="ep-card" key={ep.id}>
              {/* a cena de abertura é o card: a arte manda, o texto vem embaixo */}
              <div className="ep-card-capa" onClick={abrir} role="button" tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') abrir() }}>
                {existing[capa?.imagem]
                  ? <img src={'/files/' + capa.imagem + (bust ? '?v=' + bust : '')} alt="" />
                  : <span>{ei + 1}</span>}
              </div>
              <div className="ep-card-corpo">
                <div className="ep-card-top">
                  <h3 className="ep-card-titulo" title={`${ep.id.toUpperCase()}, ${ep.titulo}`} onClick={abrir}>
                    {ep.id.toUpperCase()}, {ep.titulo}
                  </h3>
                  <div className="ep-row-actions">
                    <button className="btn btn-ghost btn-icon btn-sm btn-danger" title="Excluir episódio" onClick={() => onExcluirEp(ei)}>
                      <Icon name="trash" size={13} />
                    </button>
                  </div>
                </div>
                {ep.publicar && <div className="ep-card-sub">{ep.publicar}</div>}
                <EpProgresso p={prog} />
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
