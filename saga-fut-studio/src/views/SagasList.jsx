import React, { useEffect, useMemo, useState } from 'react'
import { CharAvatar, Icon, GrupoEstiloHead, FiltroCanal } from '../components/index.js'
import { sagaProgress } from '../lib/progresso.js'
import { agruparPorEstilo } from '../lib/agrupar.js'
import { dirEpisodio } from '../../shared/caminhos.mjs'
import { useStudio } from '../app/StudioContext.jsx'
import { doCanal, CANAL_PADRAO } from '../../shared/canais.mjs'

// SAGAS: grade das sagas (vídeo)
export default function SagasList() {
  const { dados, update, existing, progress, bust, nav } = useStudio()
  const byId = Object.fromEntries(dados.personagens.map((p) => [p.id, p]))

  // cria uma saga em branco (template) e abre ela

  // por estilo, na ordem do catálogo; dentro de cada grupo, por título
  // saga inteira pertence a um canal: episódio não se divide entre perfis no meio da história
  const canalGlobal = dados?.projeto?.canalAtivo || CANAL_PADRAO
  const [canal, setCanal] = useState(canalGlobal)
  useEffect(() => { setCanal(canalGlobal) }, [canalGlobal])
  const sagas = useMemo(() => doCanal(dados.sagas || [], canal), [dados.sagas, canal])
  const grupos = agruparPorEstilo(sagas, dados.estilos, (s) => s.titulo)

  return (
    <div>

      <div className="section-head">
        <h3 className="section-title">Sagas · vídeo</h3>
      </div>

      <FiltroCanal valor={canal} onChange={setCanal} itens={dados.sagas || []} canalGlobal={canalGlobal} />

      {grupos.map((g) => (
        <div key={g.estiloId || '_sem'}>
          <GrupoEstiloHead nome={g.nome} n={g.itens.length} />
          <div className="saga-grid">
            {g.itens.map((saga) => {
              const prog = sagaProgress(saga, progress)
              return (
                <div className="saga-card" key={saga.id} onClick={() => nav.saga(saga.id)} role="button" tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') nav.saga(saga.id) }}>
                  <div className="saga-card-head">
                    <span className="selo">{saga.selo}</span>
                    <span className={'saga-status st-' + saga.status.split(' ')[0]}>{saga.status}</span>
                  </div>
                  <h3>{saga.titulo}</h3>
                  <p className="saga-card-desc">{saga.genero}</p>
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
          </div>
        </div>
      ))}

    </div>
  )
}
