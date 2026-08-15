import React, { useState, useEffect } from 'react'
import { Icon, PromptBlock } from '../../components/index.js'
import { hojeChave } from '../../lib/agenda.js'
import { canalDo, fichaDoCanal } from '../../../shared/canais.mjs'

// PUBLICAR O VÍDEO: os passos que se faz toda vez, e nada mais à vista.
//
// Espelha a tela de publicar do QUADRINHO de propósito. As duas respondem a mesma pergunta ("o que
// falta pra isto estar no ar?") e viviam com formatos diferentes: lá, três passos numerados com
// data, YouTube e "mais opções"; aqui, um formulário de links soltos, sem agenda, sem YouTube e
// sem abrir a pasta. Quem publica alterna entre as duas no mesmo dia, e a diferença era atrito puro.
//
// A regra é a mesma: **o que se faz toda vez fica à vista; o que se faz de vez em quando fica
// atrás de "mais opções"**. Editar título e legenda e colar os links das redes são coisas de antes
// e de depois de publicar, não do momento de publicar.
const HORAS_PADRAO = ['12:30', '19:00']

function Passo({ n, titulo, feito, children }) {
  return (
    <div className={'passo' + (feito ? ' feito' : '')}>
      <div className="passo-n">{feito ? <Icon name="check" size={14} /> : n}</div>
      <div className="passo-corpo">
        <span className="passo-titulo">{titulo}</span>
        {children}
      </div>
    </div>
  )
}

// AGENDAR O SHORT. É a única das quatro redes que fecha sozinha: sobe agora e o YouTube vira a
// chave na hora marcada. A rota é a mesma do quadrinho, que passou a aceitar `videoId`.
function YoutubeDoVideo({ video, dia, hora, onAgendado }) {
  const [status, setStatus] = useState(null)
  const [indo, setIndo] = useState(false)
  const [erro, setErro] = useState(null)
  const canal = canalDo(video)
  useEffect(() => {
    fetch(`/api/youtube/status?canal=${encodeURIComponent(canal)}`)
      .then((r) => r.json()).then(setStatus)
      .catch(() => setStatus({ pronto: false }))
  }, [canal])

  const ja = video.youtube
  async function agendar() {
    setIndo(true); setErro(null)
    try {
      const r = await fetch('/api/youtube/agendar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: video.id, dia, hora }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`)
      onAgendado({ videoId: j.id, url: j.url, agendadoPara: j.agendadoPara, titulo: j.titulo, canal: j.canal })
    } catch (e) { setErro(e.message) } finally { setIndo(false) }
  }

  if (ja) return (
    <div className="passo-acoes">
      <span className="hint">{new Date(ja.agendadoPara).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>
      <a className="btn btn-sm" href={ja.url} target="_blank" rel="noreferrer">abrir no YouTube</a>
    </div>
  )
  if (status && !status.pronto) return (
    <p className="hint">
      YouTube de {fichaDoCanal(canal).nome} não conectado (rode{' '}
      <code>{status.comando || `node scripts/youtube-login.mjs --canal=${canal}`}</code>).
    </p>
  )
  return (
    <div className="passo-acoes">
      <button className="btn btn-primary" onClick={agendar} disabled={indo || !dia}>
        {indo ? <span className="gen-spinner" /> : <Icon name="publicar" size={14} />}
        {indo ? 'Subindo…' : dia ? 'Agendar o Short' : 'escolha a data primeiro'}
      </button>
      {/* O CANAL FICA À VISTA porque conectar na conta errada não dá erro nenhum: o vídeo só vai
          pro lugar errado. Canal ZERADO é o sinal de que pegou o canal pessoal em vez do da marca. */}
      {status?.canal && (
        Number(status.canal.inscritos) === 0 && Number(status.canal.videos) === 0
          ? <span className="render-msg no"><Icon name="alerta" size={13} /> canal <strong>{status.canal.titulo}</strong> está vazio: confira se é esse mesmo</span>
          : <span className="hint">vai pro YouTube {status.canal.titulo} ({fichaDoCanal(canal).nome})</span>
      )}
      {erro && <span className="render-msg no"><Icon name="alerta" size={13} /> {erro}</span>}
    </div>
  )
}

export function VideoPublicar({ v, vi, update, existing, bust, finalPath }) {
  const [copiado, setCopiado] = useState(null)
  const [erro, setErro] = useState(null)
  const [abrindo, setAbrindo] = useState(false)

  const titulo = (v.publicacao?.titulo || '').trim()
  const descricao = (v.publicacao?.legenda || '').trim()
  const tudo = [titulo, descricao].filter(Boolean).join('\n\n')
  const pronto = !!existing[finalPath]
  const postado = !!v.postado
  const agenda = v.agenda || ''
  const hora = v.hora || ''
  const legivel = (c) => { const [a, m, d] = c.split('-'); return `${d}/${m}/${a}` }

  const setCampo = (k, val) => update((n) => { if (val) n.videos[vi][k] = val; else delete n.videos[vi][k] })
  const setPub = (k, val) => update((n) => {
    n.videos[vi].publicacao = { ...(n.videos[vi].publicacao || {}), [k]: val }
  })

  async function copiar(texto, qual) {
    try { await navigator.clipboard.writeText(texto) } catch {
      const ta = document.createElement('textarea')
      ta.value = texto; document.body.appendChild(ta); ta.select()
      try { document.execCommand('copy') } catch { /* nada a fazer */ }
      ta.remove()
    }
    setCopiado(qual); setTimeout(() => setCopiado(null), 1600)
  }

  // ABRIR NO FINDER: o studio roda na máquina do autor, então mandar o sistema abrir a pasta é a
  // mesma coisa que ele faria à mão. Serve pra arrastar o MP4 pro app de postar sem caçar caminho.
  async function abrirPasta() {
    setAbrindo(true); setErro(null)
    try {
      const r = await fetch('/api/abrir-pasta', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caminho: `videos/${v.id}` }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`)
    } catch (e) { setErro(e.message); setTimeout(() => setErro(null), 5000) } finally { setAbrindo(false) }
  }

  return (
    <div className="publicar">
      <div className="pub-topo">
        <span className={'pub-chip ' + (postado ? 'postado' : agenda ? 'agendado' : 'pendente')}>
          <Icon name={postado ? 'check' : 'relogio'} size={13} />
          {postado ? 'Publicado' : agenda ? `${legivel(agenda)}${hora ? ` ${hora}` : ''}` : 'sem data'}
        </span>
        <input className="field pub-data-inline" type="date" value={agenda}
          onChange={(e) => setCampo('agenda', e.target.value)} />
        <input className="field pub-hora-inline" type="time" value={hora} disabled={!agenda}
          onChange={(e) => setCampo('hora', e.target.value)}
          title={agenda ? 'Horário da publicação' : 'Escolha a data primeiro'} />
        {agenda && !hora && HORAS_PADRAO.map((h) => (
          <button key={h} className="btn btn-sm" onClick={() => setCampo('hora', h)}>{h}</button>
        ))}
        {!agenda && <button className="btn btn-sm" onClick={() => setCampo('agenda', hojeChave())}>hoje</button>}
      </div>

      {!pronto ? (
        <div className="panel">
          <p className="hint">O vídeo ainda não foi renderizado. Vá na aba <b>Render</b> e volte.</p>
        </div>
      ) : (
        <>
          <Passo n="1" titulo="Copiar o texto" feito={copiado === 'tudo'}>
            <div className="passo-acoes">
              <button className="btn btn-primary" onClick={() => copiar(tudo, 'tudo')} disabled={!tudo}>
                <Icon name={copiado === 'tudo' ? 'check' : 'copiar'} size={14} />
                {copiado === 'tudo' ? 'Copiado' : 'Título + descrição'}
              </button>
              <button className="btn btn-sm" onClick={() => copiar(titulo, 't')} disabled={!titulo}>
                {copiado === 't' ? 'copiado' : 'só o título'}
              </button>
              {v.publicacao?.tiktok && !/^https?:/.test(v.publicacao.tiktok) && (
                <button className="btn btn-sm" onClick={() => copiar(v.publicacao.tiktok, 'tk')}>
                  {copiado === 'tk' ? 'copiado' : 'legenda do TikTok'}
                </button>
              )}
            </div>
            {!tudo && <p className="hint">Sem título nem descrição: preencha em "mais opções".</p>}
          </Passo>

          <Passo n="2" titulo="Pegar o vídeo">
            <div className="passo-acoes">
              <a className="btn btn-primary" href={'/files/' + finalPath + (bust ? '?v=' + bust : '')}
                download={`${v.id}.mp4`}>
                <Icon name="baixar" size={14} /> Baixar MP4
              </a>
              <button className="btn btn-sm" onClick={abrirPasta} disabled={abrindo}>
                <Icon name="pasta" size={13} /> abrir a pasta
              </button>
              <button className="btn btn-sm" onClick={() => copiar(finalPath, 'p')}>
                {copiado === 'p' ? 'copiado' : 'copiar caminho'}
              </button>
            </div>
          </Passo>

          <Passo n="3" titulo={`YouTube ${fichaDoCanal(canalDo(v)).nome}`} feito={!!v.youtube}>
            <YoutubeDoVideo video={v} dia={agenda} hora={hora}
              onAgendado={(yt) => update((n) => { n.videos[vi].youtube = yt })} />
          </Passo>

          {erro && <p className="render-msg no"><Icon name="alerta" size={13} /> {erro}</p>}

          <button className={'btn btn-lg ' + (postado ? '' : 'btn-primary')}
            onClick={() => update((n) => {
              if (postado) delete n.videos[vi].postado
              else n.videos[vi].postado = true
            })}>
            <Icon name={postado ? 'x' : 'check'} size={16} />
            {postado ? 'Desmarcar' : 'Pronto, postei em todas'}
          </button>
        </>
      )}

      <details className="pub-mais">
        <summary className="hint">mais opções</summary>
        <div className="panel mt-3">
          <PromptBlock label="Título do post" tool="gancho curto · 3 a 7 palavras"
            value={v.publicacao?.titulo || ''} onChange={(x) => setPub('titulo', x)}
            hint="Uma linha que prende sem entregar a piada. Cabe 1 emoji." />
          <PromptBlock label="Descrição do post" tool="gancho + contexto + CTA + hashtags"
            value={v.publicacao?.legenda || ''} onChange={(x) => setPub('legenda', x)}
            hint="Impacto + take + CTA + hashtags no fim. Use o nome real do jogador na descrição." />
          <div className="video-redes mt-3">
            <span className="hint">Links de publicação (colar depois de postar):</span>
            {[
              { k: 'tiktok', label: 'TikTok', ph: 'https://www.tiktok.com/@devblaugrana/video/...' },
              { k: 'instagram', label: 'Instagram', ph: 'https://www.instagram.com/reel/...' },
              { k: 'twitter', label: 'X / Twitter', ph: 'https://x.com/devblaugrana/status/...' },
              { k: 'youtube', label: 'YouTube', ph: 'https://youtube.com/shorts/...' },
            ].map((r) => (
              <label key={r.k} className="video-rede-linha">
                <span className="video-rede-label">{r.label}</span>
                <input className="field" type="url" placeholder={r.ph}
                  value={typeof v.publicacao?.[r.k] === 'string' ? v.publicacao[r.k] : ''}
                  onChange={(e) => setPub(r.k, e.target.value)} />
              </label>
            ))}
          </div>
        </div>
      </details>
    </div>
  )
}
