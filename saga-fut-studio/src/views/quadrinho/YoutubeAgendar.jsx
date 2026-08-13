import React, { useEffect, useState } from 'react'
import { Icon } from '../../components/index.js'

// AGENDAR O SHORT. É a única das quatro redes que fecha sozinha: sobe agora e o YouTube vira a
// chave na hora marcada, sem nada rodando aqui.
//
// A HORA VEM DA PEÇA (`quad.hora`, escolhida no topo do Publicar, ao lado da data).
//
// Antes ela era estado local com 12:30 fixo: o Short subia num horário e o campo da peça dizia
// outro, e semanas depois não havia como saber pra que horas aquilo tinha sido agendado. Um
// horário por peça, num lugar só.
const HORAS = ['12:30', '19:00']

export function YoutubeAgendar({ quad, qi, update, compacto }) {
  const [status, setStatus] = useState(null)
  const [indo, setIndo] = useState(false)
  const [erro, setErro] = useState(null)
  const hora = quad.hora || ''
  const setHora = (v) => update((n) => { n.quadrinhos[qi].hora = v })

  useEffect(() => {
    fetch('/api/youtube/status').then((r) => r.json()).then(setStatus).catch(() => setStatus({ pronto: false }))
  }, [])

  const ja = quad.youtube
  const dia = quad.agenda || ''

  async function agendar() {
    setIndo(true); setErro(null)
    try {
      const r = await fetch('/api/youtube/agendar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quadrinhoId: quad.id, dia, hora }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`)
      update((n) => {
        n.quadrinhos[qi].youtube = { videoId: j.id, url: j.url, agendadoPara: j.agendadoPara, titulo: j.titulo }
      })
    } catch (e) { setErro(e.message) } finally { setIndo(false) }
  }

  const conteudo = ja ? (
    <div className="passo-acoes">
      <span className="hint">
        {new Date(ja.agendadoPara).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
      </span>
      <a className="btn btn-sm" href={ja.url} target="_blank" rel="noreferrer">abrir</a>
    </div>
  ) : status && !status.pronto ? (
    <p className="hint">
      Não autorizado. Rode <code>node scripts/youtube-login.mjs</code> (ver docs/YOUTUBE.md).
    </p>
  ) : (
    <>
      <div className="passo-acoes">
        <span className="hint">{dia && hora ? `${dia.split('-').reverse().join('/')} às ${hora}` : ''}</span>
        {!hora && HORAS.map((h) => (
          <button key={h} className="btn btn-sm" onClick={() => setHora(h)}>{h}</button>
        ))}
        <button className="btn btn-primary" onClick={agendar} disabled={indo || !dia || !hora}>
          {indo ? <><span className="gen-spinner" /> subindo…</> : <><Icon name="video" size={14} /> Agendar</>}
        </button>
      </div>
      {(!dia || !hora) && (
        <p className="hint">
          {!dia ? 'Escolha a data no topo primeiro.' : 'Escolha a hora no topo (ao lado da data).'}
        </p>
      )}
      {/* O CANAL FICA À VISTA quando é suspeito. Uma conta Google tem o canal pessoal (vazio)
          além das contas de marca, e conectar no errado não dá erro nenhum: os vídeos só vão pro
          lugar errado. Com inscritos e vídeos, não precisa gritar; zerado, precisa. */}
      {status?.canal && Number(status.canal.inscritos) === 0 && Number(status.canal.videos) === 0 && (
        <p className="yt-canal suspeito">
          <Icon name="alerta" size={13} /> canal <strong>{status.canal.titulo}</strong> está vazio: confira se é esse mesmo
        </p>
      )}
      {status?.canal && Number(status.canal.videos) > 0 && (
        <p className="hint">vai pro canal {status.canal.titulo}</p>
      )}
      {status?.canalErro && <p className="render-msg no"><Icon name="alerta" size={13} /> {status.canalErro}</p>}
      {erro && <p className="render-msg no"><Icon name="alerta" size={13} /> {erro}</p>}
    </>
  )

  // dentro de um Passo o cabeçalho já existe; solto, precisa do próprio painel
  return compacto ? conteudo : <div className="panel"><h3>YouTube</h3>{conteudo}</div>
}
