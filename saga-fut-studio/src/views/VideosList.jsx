import React, { useEffect, useMemo, useState } from 'react'
import { Icon, FiltroCanal } from '../components/index.js'
import { useStudio } from '../app/StudioContext.jsx'
import { doCanal, CANAL_PADRAO } from '../../shared/canais.mjs'

// VÍDEOS: grade das animações keyframe (pipeline Remotion + Grok + áudio). A criação
// pela UI vem na Fase 2; por ora lista/revisa/gerencia os que existem.
export default function VideosList() {
  const { dados, bust, nav } = useStudio()
  // MAIS NOVO PRIMEIRO. A ordem do dado é a de inserção no `videoOrder`, que envelhece mal: o que
  // se acabou de criar aparecia no fim da lista, depois de rolar tudo. `_criadoEm` vem do disco
  // (ver store.mjs); quem não tiver vai pro fim em vez de sumir na frente.
  // mesmo desenho da lista de quadrinhos: o chip nasce no canal do header e pode divergir dele
  // sem gravar nada (o seletor global é a preferência; o chip é a olhada no outro perfil)
  const canalGlobal = dados?.projeto?.canalAtivo || CANAL_PADRAO
  const [canal, setCanal] = useState(canalGlobal)
  useEffect(() => { setCanal(canalGlobal) }, [canalGlobal])
  const todosVideos = useMemo(
    () => [...(dados.videos || [])].sort((a, b) => (b._criadoEm || 0) - (a._criadoEm || 0)),
    [dados.videos],
  )
  const videos = useMemo(() => doCanal(todosVideos, canal), [todosVideos, canal])

  return (
    <div>
      <div className="section-head">
        <h3 className="section-title">Vídeos · animação</h3>
      </div>

      <p className="hint intro">
        Animações em keyframe (folhas de pose desenhadas + Remotion + cenário animado no Grok + trilha e SFX).
        Motor caprichado: consistência do traço, movimento com peso e áudio. Abra um para revisar os assets, renderizar e publicar.
      </p>

      <FiltroCanal valor={canal} onChange={setCanal} itens={todosVideos} canalGlobal={canalGlobal} />

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
                  {/* card animado nao tem roteiro em cenas: contar cena nele daria sempre 0 */}
                  <span className="quad-card-prog">
                    {v.tipo === 'card'
                      ? `${v.template || 'código'} · ${v.formato}`
                      : `${(v.roteiro || []).length} cenas · ${v.formato}`}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
