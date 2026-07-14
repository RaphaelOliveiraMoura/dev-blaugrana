import React, { useEffect, useRef, useState } from 'react'
import { Icon } from '../../components/index.js'
import { useStudio } from '../../app/StudioContext.jsx'
import { useEp } from './EpContext.jsx'

// Animatic: toca os clipes em sequência pra sentir o ritmo antes de montar.
export function Previa() {
  const { existing } = useStudio()
  const { ep } = useEp()
  const cenas = ep.cenas
  const [idx, setIdx] = useState(0)
  const [auto, setAuto] = useState(false)
  const [muted, setMuted] = useState(true)
  const videoRef = useRef(null)

  const cena = cenas[idx]
  const hasVideo = existing[cena.video]
  const total = cenas.length

  useEffect(() => {
    const v = videoRef.current
    if (!auto || !hasVideo || !v) return
    const tryPlay = () => v.play().catch(() => {})
    if (v.readyState >= 2) {
      tryPlay()
    } else {
      v.addEventListener('canplay', tryPlay, { once: true })
      return () => v.removeEventListener('canplay', tryPlay)
    }
  }, [idx, auto, hasVideo])

  function onEnded() {
    if (idx < total - 1) setIdx(idx + 1)
    else setAuto(false)
  }

  return (
    <div className="previa-player">
      <div className="phone">
        {hasVideo ? (
          <video ref={videoRef} src={'/files/' + cena.video + '#t=0.01'} muted={muted}
            controls={!auto} onEnded={onEnded} playsInline preload="auto" />
        ) : (
          existing[cena.imagem]
            ? <img src={'/files/' + cena.imagem} alt="" />
            : <div className="media-missing"><Icon name="video" size={18} />cena {cena.numero} sem mídia</div>
        )}
        <div className="phone-caption">
          <div className="phone-scene">Cena {cena.numero}/{total} · {cena.titulo}</div>
          <div className="phone-narracao">{cena.narracao}</div>
        </div>
      </div>

      <div className="previa-side">
        <div className="panel">
          <h3>Prévia do episódio</h3>
          <p className="hint">
            Toca os clipes em sequência (~{total * 10}s). O corte final leva a narração por cima: isto é a animatic,
            serve pra sentir o ritmo.
          </p>
          <div className="previa-controls">
            <button className="btn" onClick={() => { setAuto(false); setIdx(Math.max(0, idx - 1)) }} disabled={idx === 0}>anterior</button>
            <button className="btn btn-primary" onClick={() => { setIdx(0); setAuto(true) }}>
              <Icon name="previa" size={13} /> Assistir tudo
            </button>
            <button className="btn" onClick={() => { setAuto(false); setIdx(Math.min(total - 1, idx + 1)) }} disabled={idx === total - 1}>próxima</button>
          </div>
          <label className="toggle">
            <input type="checkbox" checked={muted} onChange={(e) => setMuted(e.target.checked)} />
            sem som (ambiência desligada)
          </label>
        </div>

        <div className="panel">
          <h3>Linha do tempo</h3>
          <div className="thumbs">
            {cenas.map((c, i) => (
              <button key={c.numero} className={'thumb' + (i === idx ? ' active' : '')}
                onClick={() => { setAuto(false); setIdx(i) }} title={c.titulo}>
                {existing[c.imagem]
                  ? <img src={'/files/' + c.imagem} alt={c.titulo} />
                  : <span className="thumb-empty">{c.numero}</span>}
                <span className="thumb-num">{c.numero}</span>
              </button>
            ))}
          </div>
          <p className="hint mt-2">{cena.tempo} · {cena.montagem}</p>
        </div>
      </div>
    </div>
  )
}
