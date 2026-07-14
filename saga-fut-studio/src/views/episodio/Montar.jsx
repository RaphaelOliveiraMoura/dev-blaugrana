import React, { useEffect, useState } from 'react'
import { FilePath, Icon } from '../../components/index.js'
import { drawEndCard, drawHook, drawCaption, splitNarracao } from '../../lib/canvas.js'
import { cenaAudio } from '../../../shared/caminhos.mjs'
import { getRenderStatus, montarRascunho } from '../../api/render.js'
import { getMusicas, salvarInicioMusica } from '../../api/musicas.js'
import { useEp } from './EpContext.jsx'

// Seleção de trilha por cena. "(continua)" herda a faixa da cena anterior, então
// você só escolhe onde o clima vira.
function Trilha({ musicas, inicios, onInicio }) {
  const { ep, si, ei, update } = useEp()
  const [preview, setPreview] = useState('')
  const [vol, setVol] = useState(ep.musicaVol ?? 0.08)

  if (!musicas.length) {
    return <p className="hint">Nenhuma trilha em saga-fut/assets/musica/ ainda. Baixe MP3 livres de uso lá (ver TRILHAS.md).</p>
  }

  return (
    <>
      <div className="trilha-list">
        {ep.cenas.map((c, i) => {
          const val = c.musica ?? (i === 0 ? (ep.musica || '') : '')
          return (
            <div className="trilha-row" key={c.numero}>
              <span className="trilha-cena">Cena {c.numero}</span>
              <select
                className="field"
                value={val}
                onChange={(e) => update((n) => { n.sagas[si].episodios[ei].cenas[i].musica = e.target.value })}
              >
                <option value="">{i === 0 ? 'sem trilha' : 'continua a anterior'}</option>
                {musicas.map((m) => <option key={m} value={m}>{m.replace(/\.[^.]+$/, '')}</option>)}
              </select>
              {val && (
                <>
                  <input
                    className="field trilha-inicio"
                    type="number" min="0" step="1"
                    value={inicios[val] ?? 0}
                    title="Segundo em que a faixa começa a tocar (pula a intro). Vale pra ela em todo lugar."
                    onChange={(e) => onInicio(val, e.target.value)}
                  />
                  <button
                    className="btn btn-icon btn-sm"
                    title="Ouvir a partir do início escolhido"
                    onClick={() => setPreview('/files/assets/musica/' + encodeURIComponent(val) + '#t=' + (inicios[val] ?? 0))}
                  >
                    <Icon name="previa" size={11} />
                  </button>
                </>
              )}
            </div>
          )
        })}
      </div>

      {preview && <audio controls src={preview} autoPlay className="field" style={{ marginTop: 'var(--sp-2)' }} />}

      <div className="trilha-vol">
        <span className="hint">Volume sob a narração</span>
        <input type="range" min="0.01" max="0.30" step="0.01" value={vol}
          onChange={(e) => {
            const v = Number(e.target.value)
            setVol(v)
            update((n) => { n.sagas[si].episodios[ei].musicaVol = v })
          }} />
        <span className="trilha-vol-val">
          {Math.round(vol * 100)}%{vol <= 0.05 ? ' sutil' : vol >= 0.18 ? ' alto' : ''}
        </span>
      </div>

      <p className="hint">
        Deixe "continua" onde o clima não muda; escolha faixa só onde ele vira. O campo de segundos pula a intro
        da faixa e o play toca a partir dele.
      </p>
    </>
  )
}

export function Montar() {
  const { ep, si, ei, update, setEp } = useEp()
  const [status, setStatus] = useState(null)
  const [rendering, setRendering] = useState(false)
  const [msg, setMsg] = useState(null)
  const [err, setErr] = useState(null)
  const [bust, setBust] = useState(0)
  const [comCard, setComCard] = useState(true)
  const [comHook, setComHook] = useState(true)
  const [comLegenda, setComLegenda] = useState(true)
  const [comFaixa, setComFaixa] = useState(false)
  const [musicas, setMusicas] = useState([])
  const [inicios, setInicios] = useState({})

  const n = ep.cenas.length

  async function refresh() { setStatus(await getRenderStatus(ep.id, n)) }
  useEffect(() => { refresh() }, [ep.id])
  useEffect(() => {
    getMusicas().then((d) => { setMusicas(d.musicas || []); setInicios(d.inicios || {}) }).catch(() => {})
  }, [])

  function onInicio(file, seg) {
    const v = Math.max(0, Math.round(Number(seg) || 0))
    setInicios((prev) => ({ ...prev, [file]: v }))
    salvarInicioMusica(file, v).catch(() => {})
  }

  async function montar() {
    setRendering(true); setErr(null); setMsg(null)
    try {
      let captions = null
      if (comLegenda) {
        captions = {}
        for (const c of ep.cenas) {
          const chunks = splitNarracao(c.narracao)
          if (chunks.length) captions[c.numero] = chunks.map((t) => ({ text: t, png: drawCaption(t, comFaixa) }))
        }
      }
      // resolve a trilha efetiva por cena: faixa própria, ou herda a da cena anterior
      let curTrilha = ''
      const trilhaPorCena = ep.cenas.map((c, i) => {
        const own = c.musica ?? (i === 0 ? (ep.musica || '') : '')
        if (own) curTrilha = own
        return curTrilha
      })
      const r = await montarRascunho({
        epId: ep.id, nCenas: n,
        endCardPng: comCard ? drawEndCard(ep.endCardText) : null,
        hookCardPng: comHook && (ep.hookText || '').trim() ? drawHook(ep.hookText) : null,
        captions, trilhaPorCena, musicaVol: ep.musicaVol ?? 0.08,
      })
      setMsg(r.aviso || 'Rascunho montado!')
      setBust(Date.now())
      refresh()
    } catch (e) { setErr(e.message) } finally { setRendering(false) }
  }

  const clipesOk = status?.cenas.every((c) => c.video)
  const algumAudio = status?.cenas.some((c) => c.audio)

  return (
    <div className="previa-player">
      <div className="phone">
        {status?.roughCut
          ? <video src={'/files/' + status.roughCut + '?v=' + bust} controls preload="metadata" />
          : <div className="media-missing"><Icon name="montar" size={18} />o rascunho aparece aqui</div>}
      </div>

      <div className="previa-side">
        <div className="panel">
          <h3>Montar rascunho</h3>
          <p className="hint">
            O servidor junta os clipes na ordem, sobrepõe a narração de cada cena e abaixa a ambiência. Sai um
            <code> rough-cut.mp4</code>; o acabamento fino é no CapCut.
          </p>

          <div className="render-files">
            {status?.cenas.map((c) => (
              <div className="render-row" key={c.numero}>
                <span>Cena {c.numero}</span>
                <span className={c.video ? 'ok' : 'no'}><Icon name={c.video ? 'check' : 'x'} size={11} /> clipe</span>
                <span className={c.audio ? 'ok' : 'no'}><Icon name={c.audio ? 'check' : 'x'} size={11} /> narração</span>
              </div>
            ))}
          </div>

          <div className="section-head"><h3 className="section-title">Gancho de abertura</h3></div>
          <label className="toggle">
            <input type="checkbox" checked={comHook} onChange={(e) => setComHook(e.target.checked)} />
            texto grande sobre a 1ª cena (~3s)
          </label>
          {comHook && (
            <>
              <input className="field" value={ep.hookText || ''} placeholder="Ex: Se você é do Barça, isso vai doer…"
                onChange={(e) => setEp('hookText', e.target.value)} style={{ marginTop: 'var(--sp-2)' }} />
              <p className="hint" style={{ marginTop: 'var(--sp-1)' }}>
                No frame 1, máx. ~7 palavras. As duas fórmulas de maior retenção pra conta pequena são a
                <strong> chamada de identidade</strong> ("Se você é do Barça, isso vai doer": especificidade vence alcance)
                e a <strong>lacuna de curiosidade</strong> (abre uma pergunta e não responde). Teste no mudo: se o 1º frame
                sozinho não passa tensão, o gancho falhou. Vazio pula.
              </p>
            </>
          )}

          <div className="section-head"><h3 className="section-title">Legendas</h3></div>
          <label className="toggle">
            <input type="checkbox" checked={comLegenda} onChange={(e) => setComLegenda(e.target.checked)} />
            queimar legendas da narração (sync aproximado)
          </label>
          {comLegenda && (
            <label className="toggle toggle-sub">
              <input type="checkbox" checked={comFaixa} onChange={(e) => setComFaixa(e.target.checked)} />
              faixa semitransparente atrás do texto
            </label>
          )}

          <div className="section-head"><h3 className="section-title">Card final</h3></div>
          <label className="toggle">
            <input type="checkbox" checked={comCard} onChange={(e) => setComCard(e.target.checked)} />
            incluir card final
          </label>
          {comCard && (
            <input className="field" value={ep.endCardText || ''} placeholder="CONTINUA..."
              onChange={(e) => setEp('endCardText', e.target.value)} style={{ marginTop: 'var(--sp-2)' }} />
          )}

          <div className="section-head"><h3 className="section-title">Trilha por cena</h3></div>
          <Trilha musicas={musicas} inicios={inicios} onInicio={onInicio} />

          <button className="btn btn-primary" onClick={montar} disabled={rendering || !clipesOk}
            style={{ marginTop: 'var(--sp-4)' }}>
            {rendering ? <span className="gen-spinner" /> : <Icon name="montar" size={14} />}
            {rendering ? 'Montando…' : 'Montar rascunho'}
          </button>

          {!clipesOk && <p className="hint">Faltam clipes de vídeo: gere as cenas primeiro.</p>}
          {!algumAudio && clipesOk && <p className="hint">Sem narração ainda: dá pra montar assim mesmo (usa o áudio dos clipes).</p>}
          {msg && <p className="render-msg ok"><Icon name="check" size={13} /> {msg}</p>}
          {err && <p className="render-msg no"><Icon name="alerta" size={13} /> {err}</p>}
          {status?.roughCut && <FilePath path={status.roughCut} />}
        </div>

        <div className="panel">
          <h3>Onde salvar a narração</h3>
          <p className="hint">Uma por cena, melhor pra sincronia. Salve os MP3 do ElevenLabs em:</p>
          {ep.cenas.map((c) => <FilePath key={c.numero} path={cenaAudio(ep.id, c.numero)} />)}
          <p className="hint">Sem narração numa cena, o rascunho usa o áudio do próprio clipe.</p>
        </div>
      </div>
    </div>
  )
}
