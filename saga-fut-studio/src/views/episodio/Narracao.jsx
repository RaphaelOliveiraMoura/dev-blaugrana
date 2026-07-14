import React from 'react'
import { PromptBlock } from '../../components/index.js'
import { useStudio } from '../../app/StudioContext.jsx'
import { useEp } from './EpContext.jsx'

export function Narracao() {
  const { dados } = useStudio()
  const { saga, ep, setEp } = useEp()
  return (
    <div className="panel">
      <h3>Narração completa do episódio</h3>
      <p className="hint">{dados.audio.narradorVoz} · {saga.narradorTom}</p>
      <PromptBlock
        label="Bloco completo"
        tool="ElevenLabs"
        value={ep.narracaoCompleta}
        onChange={(v) => setEp('narracaoCompleta', v)}
      />
    </div>
  )
}
