import React from 'react'
import { CharAvatar } from '../components/index.js'
import { sagaProgress } from '../lib/progresso.js'
import { blankSaga } from '../lib/scaffold.js'
import { useStudio } from '../app/StudioContext.jsx'

// SAGAS: grade das sagas (vídeo)
export default function SagasList() {
  const { dados, update, existing, progress, bust, nav } = useStudio()
  const byId = Object.fromEntries(dados.personagens.map((p) => [p.id, p]))

  // cria uma saga em branco (template) e abre ela
  function novaSaga() {
    const saga = blankSaga(dados.sagas.map((s) => s.id))
    update((n) => { n.sagas.push(saga) })
    nav.saga(saga.id)
  }

  return (
    <div>
      <div className="section-head">
        <h3 className="section-title">📺 Sagas (vídeo, a novela)</h3>
        <button className="mini-btn" onClick={novaSaga}>＋ Nova saga</button>
      </div>
      <div className="saga-grid">
        {dados.sagas.map((saga) => {
          const prog = sagaProgress(saga, progress)
          return (
            <div className="saga-card" key={saga.id} onClick={() => nav.saga(saga.id)}>
              <div className="saga-card-head">
                <span className="selo">{saga.selo}</span>
                <span className={'saga-status st-' + saga.status.split(' ')[0]}>{saga.status}</span>
              </div>
              <h3>{saga.titulo}</h3>
              <p className="muted">{saga.genero}</p>
              <div className="saga-card-cast">
                {saga.elenco.map((id) => byId[id] && <CharAvatar key={id} p={byId[id]} existing={existing} bust={bust} />)}
              </div>
              <div className="saga-card-foot">
                <span>{prog.prontos}/{prog.total} episódios prontos</span>
                <div className="bar"><div className="bar-fill" style={{ width: `${prog.total ? (prog.prontos / prog.total) * 100 : 0}%` }} /></div>
              </div>
            </div>
          )
        })}
        <div className="saga-card saga-card-new" onClick={novaSaga} title="Cria uma saga em branco (template) e abre para edição">
          <h3>＋ Nova saga</h3>
          <p className="muted">Cria uma saga em branco (1 episódio, 4 cenas) e abre pra você preencher. Ou duplique uma existente dentro dela.</p>
        </div>
      </div>
    </div>
  )
}
