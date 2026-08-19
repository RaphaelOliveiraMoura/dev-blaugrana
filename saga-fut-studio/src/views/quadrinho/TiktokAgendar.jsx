import React, { useEffect, useState } from 'react'
import { Icon } from '../../components/index.js'
import { canalDo, fichaDoCanal } from '../../../shared/canais.mjs'
import { StatusBufferPost } from './StatusBufferPost.jsx'

const HORAS = ['12:30', '19:00']

export function TiktokAgendar({ quad, qi, update, compacto }) {
  const [status, setStatus] = useState(null)
  const [indo, setIndo] = useState(false)
  const [erro, setErro] = useState(null)
  const hora = quad.hora || ''
  const setHora = (v) => update((n) => { n.quadrinhos[qi].hora = v })
  const canal = canalDo(quad)

  useEffect(() => {
    fetch(`/api/buffer/status?canal=${encodeURIComponent(canal)}`)
      .then((r) => r.json()).then(setStatus)
      .catch(() => setStatus({ pronto: false }))
  }, [canal])

  const ja = quad.tiktokBuffer
  const dia = quad.agenda || ''

  async function agendar() {
    setIndo(true); setErro(null)
    try {
      const r = await fetch('/api/buffer/tiktok', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quadrinhoId: quad.id, dia, hora }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`)
      update((n) => {
        n.quadrinhos[qi].tiktokBuffer = {
          postId: j.postId, dueAt: j.dueAt, channelId: j.channelId,
          handle: j.handle, canal: j.canal, agendadoPara: j.agendadoPara, slides: j.slides,
          retried: 0,
        }
      })
    } catch (e) { setErro(e.message) } finally { setIndo(false) }
  }

  const destino = fichaDoCanal(canal).nome
  const conteudo = ja ? (
    <>
      <div className="passo-acoes">
        <span className="hint">
          @{ja.handle || fichaDoCanal(ja.canal).handle}
          {' · '}
          {new Date(ja.agendadoPara).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
        </span>
        <a className="btn btn-sm" href="https://publish.buffer.com/calendar" target="_blank" rel="noreferrer">abrir calendário</a>
      </div>
      <StatusBufferPost
        postId={ja.postId} quadrinhoId={quad.id} rede="tiktok" retried={ja.retried || 0}
        onAtualizou={(j) => update((n) => {
          if (n.quadrinhos[qi].tiktokBuffer) {
            n.quadrinhos[qi].tiktokBuffer.retried = (n.quadrinhos[qi].tiktokBuffer.retried || 0) + (j.ja ? 0 : 1)
            n.quadrinhos[qi].tiktokBuffer.statusBuffer = j.status
          }
        })}
      />
      <p className="hint">
        Horário customizado cai no Calendário do Buffer, não na Fila. Filtre o canal TikTok @{ja.handle || fichaDoCanal(ja.canal).handle}.
      </p>
    </>
  ) : status && !status.pronto ? (
    <p className="hint">
      Buffer ainda não está pronto para {destino}.
      {status.falta?.length ? ` Falta: ${status.falta.join('; ')}.` : ''}
      {' '}Rode <code>{status.comando || 'node scripts/buffer-conectar.mjs'}</code>
      {' '}(ver docs/BUFFER.md).
    </p>
  ) : (
    <>
      <div className="passo-acoes">
        <span className="hint">{dia && hora ? `${dia.split('-').reverse().join('/')} às ${hora}` : ''}</span>
        {!hora && HORAS.map((h) => (
          <button key={h} className="btn btn-sm" onClick={() => setHora(h)}>{h}</button>
        ))}
        <button className="btn btn-primary" onClick={agendar} disabled={indo || !dia || !hora}>
          {indo ? <><span className="gen-spinner" /> enviando…</> : <><Icon name="imagem" size={14} /> Agendar Photo Mode</>}
        </button>
      </div>
      {(!dia || !hora) && (
        <p className="hint">
          {!dia ? 'Escolha a data no topo primeiro.' : 'Escolha a hora no topo (ao lado da data).'}
        </p>
      )}
      <p className="hint">vai pro TikTok {destino} · som automático do TikTok (a API não escolhe faixa)</p>
      {erro && <p className="render-msg no"><Icon name="alerta" size={13} /> {erro}</p>}
    </>
  )

  return compacto ? conteudo : <div className="panel"><h3>TikTok</h3>{conteudo}</div>
}
