import React, { useEffect, useState } from 'react'
import { Icon } from '../../components/index.js'

// AGENDAR O SHORT NO YOUTUBE, de dentro da peça.
//
// É a única das quatro redes que fecha sozinha: sobe agora e o YouTube vira a chave na hora
// marcada, sem nada rodando na sua máquina. Por isso ela sai da lista do dia e vira "já foi".
//
// A HORA É OBRIGATÓRIA E NÃO TEM PADRÃO ESCONDIDO. O cronograma guarda só o DIA (`agenda`), e
// publicar às 00:00 porque ninguém escolheu seria pior que perguntar. Os dois atalhos são os
// horários que você já usa; o campo aceita qualquer um.
const HORAS = ['12:30', '19:00']

export function YoutubeAgendar({ quad, qi, update }) {
  const [status, setStatus] = useState(null) // {pronto, arquivo, comando}
  const [hora, setHora] = useState(HORAS[0])
  const [dia, setDia] = useState(quad.agenda || '')
  const [indo, setIndo] = useState(false)
  const [erro, setErro] = useState(null)

  useEffect(() => { setDia(quad.agenda || '') }, [quad.id, quad.agenda])
  useEffect(() => {
    fetch('/api/youtube/status').then((r) => r.json()).then(setStatus).catch(() => setStatus({ pronto: false }))
  }, [])

  const ja = quad.youtube

  async function agendar() {
    setIndo(true); setErro(null)
    try {
      const r = await fetch('/api/youtube/agendar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quadrinhoId: quad.id, dia, hora }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`)
      // o servidor já gravou no disco; espelha no estado da tela pra aparecer sem recarregar
      update((n) => {
        n.quadrinhos[qi].youtube = {
          videoId: j.id, url: j.url, agendadoPara: j.agendadoPara, titulo: j.titulo,
        }
      })
    } catch (e) { setErro(e.message) } finally { setIndo(false) }
  }

  if (ja) {
    const quando = new Date(ja.agendadoPara)
    return (
      <div className="panel">
        <h3>YouTube</h3>
        <p className="render-msg ok">
          <Icon name="check" size={13} /> Agendado para {quando.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
        </p>
        <p className="hint mt-2">
          Está no canal como privado e o YouTube publica sozinho na hora. Nada a fazer.
        </p>
        <a className="btn btn-sm mt-2" href={ja.url} target="_blank" rel="noreferrer">
          <Icon name="previa" size={12} /> abrir no YouTube
        </a>
      </div>
    )
  }

  if (status && !status.pronto) {
    return (
      <div className="panel">
        <h3>YouTube</h3>
        <p className="hint">
          Ainda não autorizado. É uma vez só: crie um app no Google Cloud (5 passos, no cabeçalho de
          <code> scripts/youtube-login.mjs</code>) e rode
        </p>
        <pre className="yt-cmd">{status.comando}</pre>
        <p className="hint">
          O refresh token fica em <code>{status.arquivo}</code>, fora do repositório. Depois disso
          este bloco vira o botão de agendar.
        </p>
      </div>
    )
  }

  return (
    <div className="panel">
      <h3>YouTube</h3>
      <p className="hint">
        Sobe o vídeo 9:16 já agendado. O YouTube publica sozinho na hora marcada, então este é o
        único que sai da sua lista de vez.
      </p>

      {/* O CANAL FICA À VISTA, antes do botão. Uma conta Google tem o canal pessoal (vazio) além
          das contas de marca, e conectar no errado não dá erro nenhum: os vídeos simplesmente vão
          pro lugar errado. Ver o nome aqui é o que impede uma fila inteira de sumir. */}
      {status?.canal && (
        <p className={'yt-canal' + (Number(status.canal.inscritos) === 0 && Number(status.canal.videos) === 0 ? ' suspeito' : '')}>
          <Icon name="personagens" size={13} />
          Vai pro canal <strong>{status.canal.titulo}</strong>
          {status.canal.handle ? ` (${status.canal.handle})` : ''}
          {' · '}{status.canal.inscritos} inscritos, {status.canal.videos} vídeos
          {Number(status.canal.inscritos) === 0 && Number(status.canal.videos) === 0
            && ' — canal vazio, confira se é esse mesmo'}
        </p>
      )}
      {status?.canalErro && (
        <p className="render-msg no"><Icon name="alerta" size={13} /> {status.canalErro}</p>
      )}

      <div className="yt-quando mt-3">
        <input className="field" type="date" value={dia} onChange={(e) => setDia(e.target.value)} />
        <input className="field yt-hora" type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
        {HORAS.map((h) => (
          <button key={h} className={'btn btn-sm' + (hora === h ? ' btn-primary' : '')} onClick={() => setHora(h)}>{h}</button>
        ))}
      </div>
      {!dia && <p className="hint mt-2">Sem data no cronograma. Escolha uma acima ou defina em Publicar.</p>}

      <button className="btn btn-primary btn-lg mt-3" onClick={agendar} disabled={indo || !dia}>
        {indo ? <><span className="gen-spinner" /> subindo…</> : <><Icon name="video" size={16} /> Agendar no YouTube</>}
      </button>
      {indo && <p className="hint mt-2">O upload leva alguns segundos. Não feche a aba.</p>}
      {erro && <p className="render-msg no mt-2"><Icon name="alerta" size={13} /> {erro}</p>}

      <p className="hint mt-3">
        Cada upload custa 1.600 da cota diária de 10.000, ou seja <strong>6 por dia</strong>. O
        limite é de quantos você SOBE, não de quantos deixa agendados: dá pra encher meses de fila,
        seis por vez.
      </p>
    </div>
  )
}
