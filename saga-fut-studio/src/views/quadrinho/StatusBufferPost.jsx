import React, { useEffect, useRef, useState } from 'react'
import { Icon } from '../../components/index.js'

export function StatusBufferPost({ postId, quadrinhoId, rede, modo, retried = 0, onAtualizou }) {
  const [st, setSt] = useState(null)
  const [indo, setIndo] = useState(false)
  const [erro, setErro] = useState(null)
  const tentou = useRef(false)

  useEffect(() => {
    if (!postId) return
    let stop = false
    async function ir() {
      try {
        const r = await fetch(`/api/buffer/post?id=${encodeURIComponent(postId)}`)
        const j = await r.json()
        if (stop) return
        if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`)
        setSt(j)
        if (j.status === 'error' && j.transitorio && retried < 3 && !tentou.current) {
          tentou.current = true
          await republicar()
        }
      } catch (e) {
        if (!stop) setErro(e.message)
      }
    }
    ir()
    return () => { stop = true }
  }, [postId])

  async function republicar() {
    setIndo(true); setErro(null)
    try {
      const r = await fetch('/api/buffer/republicar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quadrinhoId, rede, modo }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`)
      setSt((s) => ({ ...(s || {}), status: j.status, transitorio: false }))
      onAtualizou?.(j)
    } catch (e) { setErro(e.message) } finally { setIndo(false) }
  }

  if (!postId) return null
  const falhou = st?.status === 'error'
  return (
    <>
        {st?.status === 'sent' && <p className="hint">saiu nessa rede.</p>}
      {st?.status === 'scheduled' && <p className="hint">ainda na fila do Buffer.</p>}
      {falhou && (
        <p className="render-msg no">
          <Icon name="alerta" size={13} />
          {st.transitorio
            ? ' O Buffer não conseguiu baixar a imagem na hora (timeout), não era arquivo grande.'
            : ` Falhou: ${st.error || 'erro no Buffer'}`}
        </p>
      )}
      {falhou && st?.podeRepublicar && (
        <div className="passo-acoes">
          <button className="btn btn-primary" onClick={republicar} disabled={indo}>
            {indo ? <><span className="gen-spinner" /> republicando…</> : 'Republicar agora'}
          </button>
        </div>
      )}
      {erro && <p className="render-msg no"><Icon name="alerta" size={13} /> {erro}</p>}
    </>
  )
}
