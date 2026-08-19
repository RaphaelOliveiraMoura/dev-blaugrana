import React, { useEffect, useState } from 'react'
import { Icon } from '../../components/index.js'
import { canalDo, fichaDoCanal } from '../../../shared/canais.mjs'
import { StatusBufferPost } from './StatusBufferPost.jsx'

export function InstagramAgendar({ quad, qi, update, compacto, temVideo, modoIg, setModoIg }) {
  const [status, setStatus] = useState(null)
  const [indo, setIndo] = useState(null)
  const [erro, setErro] = useState(null)
  const hora = quad.hora || ''
  const canal = canalDo(quad)

  useEffect(() => {
    fetch(`/api/buffer/status?canal=${encodeURIComponent(canal)}`)
      .then((r) => r.json()).then(setStatus)
      .catch(() => setStatus({ instagram: { pronto: false, falta: ['Buffer'] } }))
  }, [canal])

  const ig = quad.instagramBuffer || {}
  const dia = quad.agenda || ''
  const destino = fichaDoCanal(canal).nome
  const st = status?.instagram

  async function agendar(modo) {
    setIndo(modo); setErro(null)
    try {
      const r = await fetch('/api/buffer/instagram', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quadrinhoId: quad.id, dia, hora, modo }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`)
      update((n) => {
        n.quadrinhos[qi].instagramBuffer = {
          ...(n.quadrinhos[qi].instagramBuffer || {}),
          [modo]: {
            postId: j.postId, dueAt: j.dueAt, channelId: j.channelId,
            handle: j.handle, canal: j.canal, agendadoPara: j.agendadoPara,
            modo: j.modo, slides: j.slides,
          },
        }
      })
    } catch (e) { setErro(e.message) } finally { setIndo(null) }
  }

  function bloco(modo, titulo) {
    const ja = ig[modo]
    if (ja) {
      return (
        <div key={modo}>
          <div className="passo-acoes">
            <span className="hint">
              {titulo} · @{ja.handle}
              {' · '}
              {new Date(ja.agendadoPara).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
            </span>
          </div>
          <StatusBufferPost
            postId={ja.postId} quadrinhoId={quad.id} rede="instagram" modo={modo}
            retried={ja.retried || 0}
            onAtualizou={(j) => update((n) => {
              const slot = n.quadrinhos[qi].instagramBuffer?.[modo]
              if (slot) {
                slot.retried = (slot.retried || 0) + (j.ja ? 0 : 1)
                slot.statusBuffer = j.status
              }
            })}
          />
        </div>
      )
    }
    const reelSemVideo = modo === 'reel' && !temVideo
    return (
      <div className="passo-acoes" key={modo}>
        <button className="btn btn-primary" onClick={() => agendar(modo)}
          disabled={!!indo || !dia || !hora || reelSemVideo}>
          {indo === modo
            ? <><span className="gen-spinner" /> enviando…</>
            : <><Icon name={modo === 'reel' ? 'video' : 'imagem'} size={14} /> {titulo}</>}
        </button>
        {reelSemVideo && <span className="hint">monte o vídeo 9:16 na aba Vídeo</span>}
      </div>
    )
  }

  const seletor = (
    <div className="passo-acoes">
      <span className="hint">formato do Instagram (obrigatório pro Publicar tudo)</span>
      <button type="button" className={'btn btn-sm' + (modoIg === 'carrossel' ? ' btn-primary' : '')}
        onClick={() => setModoIg?.('carrossel')}>Post (carrossel)</button>
      <button type="button" className={'btn btn-sm' + (modoIg === 'reel' ? ' btn-primary' : '')}
        onClick={() => setModoIg?.('reel')}>Reel</button>
    </div>
  )

  const conteudo = (
    <>
      {seletor}
      {!status ? (
        <p className="hint">conferindo o Buffer…</p>
      ) : st && !st.pronto ? (
        <p className="hint">
          Instagram ainda não está pronto para {destino}.
          {st.falta?.length ? ` Falta: ${st.falta.join('; ')}.` : ''}
          {' '}Rode <code>{status.comando || 'node scripts/buffer-conectar.mjs'}</code>
          {' '}(ver docs/BUFFER.md).
        </p>
      ) : (
        <>
          {(!dia || !hora) && (
            <p className="hint">
              {!dia ? 'Escolha a data no topo primeiro.' : 'Escolha a hora no topo (ao lado da data).'}
            </p>
          )}
          {bloco('carrossel', 'Agendar carrossel')}
          {bloco('reel', 'Agendar Reel')}
          <p className="hint">
            vai pro Instagram {destino} · carrossel = fotos · Reel = o vídeo 9:16.
            Horário customizado cai no Calendário do Buffer, não na Fila.
          </p>
          {(ig.carrossel || ig.reel) && (
            <a className="btn btn-sm" href="https://publish.buffer.com/calendar" target="_blank" rel="noreferrer">abrir calendário</a>
          )}
        </>
      )}
      {erro && <p className="render-msg no"><Icon name="alerta" size={13} /> {erro}</p>}
    </>
  )

  return compacto ? conteudo : <div className="panel"><h3>Instagram</h3>{conteudo}</div>
}
