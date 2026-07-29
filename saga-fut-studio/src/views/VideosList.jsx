import React from 'react'
import { Icon } from '../components/index.js'
import { useStudio } from '../app/StudioContext.jsx'

// VÍDEOS: grade das animações keyframe (pipeline Remotion + Grok + áudio). A criação
// pela UI vem na Fase 2; por ora lista/revisa/gerencia os que existem.
export default function VideosList() {
  const { dados, bust, nav } = useStudio()
  const videos = dados.videos || []

  return (
    <div>
      <div className="section-head">
        <h3 className="section-title">Vídeos · animação</h3>
      </div>

      <p className="hint intro">
        Animações em keyframe (folhas de pose desenhadas + Remotion + cenário animado no Grok + trilha e SFX).
        Motor caprichado: consistência do traço, movimento com peso e áudio. Abra um para revisar os assets, renderizar e publicar.
      </p>

      {videos.length === 0 && (
        <p className="hint intro">Nenhum vídeo por aqui ainda.</p>
      )}

      <div className="quad-grid">
        {videos.map((v) => {
          const capa = v.cenario?.base
          return (
            <div className="quad-card" key={v.id} role="button" tabIndex={0}
              onClick={() => nav.video(v.id)}
              onKeyDown={(e) => { if (e.key === 'Enter') nav.video(v.id) }}>
              <div className="quad-capa">
                {capa
                  ? <img src={'/files/' + capa + (bust ? '?v=' + bust : '')} alt="" />
                  : <Icon name="video" size={22} className="quad-capa-empty" />}
              </div>
              <div className="quad-card-corpo">
                <div className="quad-card-top">
                  <h3 title={v.titulo}>{v.titulo}</h3>
                </div>
                <div className="quad-card-foot">
                  <span className="selo" title={v.tipo}>{v.selo || v.tipo || 'animação'}</span>
                  <span className="quad-card-prog">{(v.roteiro || []).length} cenas · {v.formato}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
