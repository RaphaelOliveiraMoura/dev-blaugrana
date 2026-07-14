import React from 'react'
import { Icon } from '../../components/index.js'
import { useStudio } from '../../app/StudioContext.jsx'
import { acharEpisodio } from '../../lib/localizar.js'
import { EpProvider } from './EpContext.jsx'
import { EpHeader } from './EpHeader.jsx'
import { Cenas } from './Cenas.jsx'
import { Previa } from './Previa.jsx'
import { Narracao } from './Narracao.jsx'
import { Montar } from './Montar.jsx'
import { Publicar } from './Publicar.jsx'

const ABAS = [
  { id: 'cenas', icon: 'cenas', label: 'Cenas', View: Cenas },
  { id: 'previa', icon: 'previa', label: 'Prévia', View: Previa },
  { id: 'audio', icon: 'narracao', label: 'Narração', View: Narracao },
  { id: 'montar', icon: 'montar', label: 'Montar', View: Montar },
  { id: 'publicar', icon: 'publicar', label: 'Publicar', View: Publicar },
]

export default function EpView({ sagaId, epId, sub }) {
  const { dados, update, nav } = useStudio()
  const { saga, si, ep, ei } = acharEpisodio(dados, sagaId, epId)

  const setEp = (campo, v) => update((n) => { n.sagas[si].episodios[ei][campo] = v })
  const aba = ABAS.find((a) => a.id === sub) || ABAS[0]
  const View = aba.View

  return (
    <EpProvider value={{ saga, si, ep, ei, update, setEp }}>
      <EpHeader />

      <div className="subtabs" role="tablist">
        {ABAS.map((a) => (
          <button
            key={a.id}
            role="tab"
            aria-selected={a.id === aba.id}
            className={'subtab' + (a.id === aba.id ? ' active' : '')}
            onClick={() => nav.episodio(saga.id, ep.id, a.id)}
          >
            <Icon name={a.icon} size={14} />
            {a.label}
          </button>
        ))}
      </div>

      {/* key: trocar de episódio remonta a aba, senão o player e o status ficam do anterior */}
      <View key={ep.id} />
    </EpProvider>
  )
}
