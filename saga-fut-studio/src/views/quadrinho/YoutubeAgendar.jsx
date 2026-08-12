import React, { useEffect, useState } from 'react'
import { Icon } from '../../components/index.js'

// AGENDAR O SHORT. É a única das quatro redes que fecha sozinha: sobe agora e o YouTube vira a
// chave na hora marcada, sem nada rodando aqui.
//
// A HORA NÃO TEM PADRÃO ESCONDIDO: o cronograma guarda só o DIA, e publicar às 00:00 porque
// ninguém escolheu seria pior que perguntar. Os dois atalhos são os horários da casa.
const HORAS = ['12:30', '19:00']

export function YoutubeAgendar({ quad, qi, update, compacto }) {
  const [status, setStatus] = useState(null)
  const [hora, setHora] = useState(HORAS[0])
  const [indo, setIndo] = useState(false)
  const [erro, setErro] = useState(null)

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
        {HORAS.map((h) => (
          <button key={h} className={'btn btn-sm' + (hora === h ? ' btn-primary' : '')}
            onClick={() => setHora(h)}>{h}</button>
        ))}
        <input className="field yt-hora" type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
        <button className="btn btn-primary" onClick={agendar} disabled={indo || !dia}>
          {indo ? <><span className="gen-spinner" /> subindo…</> : <><Icon name="video" size={14} /> Agendar</>}
        </button>
      </div>
      {!dia && <p className="hint">Escolha a data no topo primeiro.</p>}
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
