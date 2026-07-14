import React from 'react'
import { CharAvatar } from '../ui.jsx'
import { sagaProgress } from '../lib/helpers.js'

// SAGAS: grade das sagas (vídeo)
export default function SagasList({ dados, existing, progress, goSaga, bust, onNewSaga }) {
  const byId = Object.fromEntries(dados.personagens.map((p) => [p.id, p]))
  return (
    <div>
      <div className="section-head">
        <h3 className="section-title">📺 Sagas (vídeo, a novela)</h3>
        <button className="mini-btn" onClick={onNewSaga}>＋ Nova saga</button>
      </div>
      <div className="saga-grid">
        {dados.sagas.map((saga, si) => {
          const prog = sagaProgress(saga, progress)
          return (
            <div className="saga-card" key={saga.id} onClick={() => goSaga(si)}>
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
        <div className="saga-card saga-card-new" onClick={onNewSaga} title="Cria uma saga em branco (template) e abre para edição">
          <h3>＋ Nova saga</h3>
          <p className="muted">Cria uma saga em branco (1 episódio, 4 cenas) e abre pra você preencher. Ou duplique uma existente dentro dela.</p>
        </div>
      </div>
    </div>
  )
}
