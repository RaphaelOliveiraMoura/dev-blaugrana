import React, { useEffect, useRef, useState } from 'react'
import { ConfirmModal, EditField, PromptBlock, Media, StatusPill, FilePath, GenerateButton, CenaCast } from '../components/index.js'
import { orcamentoNarracao } from '../lib/narracao.js'
import { drawEndCard, drawHook, drawCaption, splitNarracao } from '../lib/canvas.js'
import { blankCena, dupCena } from '../lib/scaffold.js'
import { useStudio } from '../app/StudioContext.jsx'
import { getRenderStatus, montarRascunho } from '../api/render.js'
import { getMusicas, salvarInicioMusica } from '../api/musicas.js'

function Previa({ ep, existing }) {
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
          <video
            ref={videoRef}
            src={'/files/' + cena.video + '#t=0.01'}
            muted={muted}
            controls={!auto}
            onEnded={onEnded}
            playsInline
            preload="auto"
          />
        ) : (
          existing[cena.imagem]
            ? <img src={'/files/' + cena.imagem} alt="" />
            : <div className="media-missing">cena {cena.numero} ainda sem mídia</div>
        )}
        <div className="phone-caption">
          <div className="phone-scene">CENA {cena.numero}/{total}, {cena.titulo}</div>
          <div className="phone-narracao">“{cena.narracao}”</div>
        </div>
      </div>

      <div className="previa-side">
        <div className="panel">
          <h3>Prévia do episódio</h3>
          <p className="muted">
            Toca os clipes em sequência (~{total * 10}s). O corte final terá a narração por cima, isto é a animatic para sentir o ritmo.
          </p>
          <div className="previa-controls">
            <button className="ctrl" onClick={() => { setAuto(false); setIdx(Math.max(0, idx - 1)) }} disabled={idx === 0}>⏮ anterior</button>
            <button className="ctrl main" onClick={() => { setIdx(0); setAuto(true) }}>▶ Assistir tudo</button>
            <button className="ctrl" onClick={() => { setAuto(false); setIdx(Math.min(total - 1, idx + 1)) }} disabled={idx === total - 1}>próxima ⏭</button>
          </div>
          <label className="mute-toggle">
            <input type="checkbox" checked={muted} onChange={(e) => setMuted(e.target.checked)} />
            <span>sem som (ambiência desligada)</span>
          </label>
        </div>

        <div className="panel">
          <h3>Linha do tempo</h3>
          <div className="thumbs">
            {cenas.map((c, i) => (
              <button
                key={c.numero}
                className={'thumb' + (i === idx ? ' active' : '')}
                onClick={() => { setAuto(false); setIdx(i) }}
                title={c.titulo}
              >
                {existing[c.imagem]
                  ? <img src={'/files/' + c.imagem} alt={c.titulo} />
                  : <span className="thumb-empty">{c.numero}</span>}
                <span className="thumb-num">{c.numero}</span>
              </button>
            ))}
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
            {cena.tempo} • 🎬 {cena.montagem}
          </div>
        </div>
      </div>
    </div>
  )
}

function Montar({ ep, update, si, ei }) {
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
  const [preview, setPreview] = useState('')
  const [musicaVol, setMusicaVol] = useState(ep.musicaVol ?? 0.08)
  function salvarInicio(file, seg) {
    const v = Math.max(0, Math.round(Number(seg) || 0))
    setInicios((prev) => ({ ...prev, [file]: v }))
    salvarInicioMusica(file, v).catch(() => {})
  }
  const n = ep.cenas.length

  async function refresh() {
    setStatus(await getRenderStatus(ep.id, n))
  }
  useEffect(() => { refresh() }, [ep.id])
  useEffect(() => {
    getMusicas().then((d) => { setMusicas(d.musicas || []); setInicios(d.inicios || {}) }).catch(() => {})
  }, [])

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
        captions,
        trilhaPorCena,
        musicaVol,
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
          : <div className="media-missing">o rascunho aparece aqui depois de montar</div>}
      </div>
      <div className="previa-side">
        <div className="panel">
          <h3>Montar rascunho (clipes + narração)</h3>
          <p className="muted">
            O servidor junta os 4 clipes na ordem, sobrepõe a narração de cada cena e abaixa a
            ambiência. Sai um <code>rough-cut.mp4</code>, o acabamento (legendas, zoom) é no CapCut.
          </p>
          <div className="render-files">
            {status?.cenas.map((c) => (
              <div className="render-row" key={c.numero}>
                <span>Cena {c.numero}</span>
                <span className={c.video ? 'ok' : 'no'}>{c.video ? '✓ clipe' : '✗ clipe'}</span>
                <span className={c.audio ? 'ok' : 'no'}>{c.audio ? '✓ narração' : ', narração'}</span>
              </div>
            ))}
          </div>
          <label className="mute-toggle" style={{ marginTop: 12 }}>
            <input type="checkbox" checked={comHook} onChange={(e) => setComHook(e.target.checked)} />
            <span>🪝 gancho de abertura (texto grande sobre a 1ª cena, ~3s)</span>
          </label>
          {comHook && (
            <>
              <input
                className="endcard-input"
                value={ep.hookText || ''}
                onChange={(e) => update((nv) => { nv.sagas[si].episodios[ei].hookText = e.target.value })}
                placeholder="Ex: Se você é do Barça, isso vai doer…"
              />
              <div className="muted" style={{ fontSize: 11, marginTop: 4, marginLeft: 2 }}>
                No frame 1, máx. ~7 palavras. As duas fórmulas de maior retenção pra conta pequena:
                <ul style={{ margin: '4px 0 0', paddingLeft: 16 }}>
                  <li><strong>Chamada de identidade:</strong> "Se você é do Barça, isso vai doer" (especificidade &gt; alcance).</li>
                  <li><strong>Lacuna de curiosidade:</strong> abre uma pergunta e NÃO responde ("Ninguém viu o que ele fez no túnel").</li>
                </ul>
                <span style={{ display: 'block', marginTop: 4 }}>Teste no mudo: se o 1º frame sozinho não passa tensão, o gancho falhou. Deixe vazio para pular.</span>
              </div>
            </>
          )}
          <label className="mute-toggle" style={{ marginTop: 12 }}>
            <input type="checkbox" checked={comLegenda} onChange={(e) => setComLegenda(e.target.checked)} />
            <span>🔤 queimar legendas (da narração, sync aproximado)</span>
          </label>
          {comLegenda && (
            <label className="mute-toggle" style={{ marginTop: 8, marginLeft: 24 }}>
              <input type="checkbox" checked={comFaixa} onChange={(e) => setComFaixa(e.target.checked)} />
              <span>faixa semitransparente atrás do texto</span>
            </label>
          )}
          <label className="mute-toggle" style={{ marginTop: 8 }}>
            <input type="checkbox" checked={comCard} onChange={(e) => setComCard(e.target.checked)} />
            <span>incluir card final</span>
          </label>
          {comCard && (
            <input
              className="endcard-input"
              value={ep.endCardText || ''}
              onChange={(e) => update((nv) => { nv.sagas[si].episodios[ei].endCardText = e.target.value })}
              placeholder="CONTINUA..."
            />
          )}
          <label className="mute-toggle" style={{ marginTop: 12, display: 'block' }}>
            <span>🎵 trilha por cena (crossfade automático na troca)</span>
          </label>
          {musicas.length === 0 ? (
            <p className="muted" style={{ fontSize: 11, marginTop: 4, marginLeft: 2 }}>
              Nenhuma trilha em saga-fut/assets/musica/ ainda. Baixe MP3 livres de uso lá (ver TRILHAS.md).
            </p>
          ) : (
            <>
              <div style={{ display: 'grid', gap: 6, marginTop: 6 }}>
                {ep.cenas.map((c, i) => {
                  const val = c.musica ?? (i === 0 ? (ep.musica || '') : '')
                  return (
                    <div key={c.numero} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="muted" style={{ fontSize: 12, width: 54 }}>Cena {c.numero}</span>
                      <select
                        className="endcard-input"
                        style={{ flex: 1, marginTop: 0 }}
                        value={val}
                        onChange={(e) => update((nv) => { nv.sagas[si].episodios[ei].cenas[i].musica = e.target.value })}
                      >
                        <option value="">{i === 0 ? '(sem trilha)' : '(continua a anterior)'}</option>
                        {musicas.map((m) => <option key={m} value={m}>{m.replace(/\.[^.]+$/, '')}</option>)}
                      </select>
                      {val && (
                        <span title="início da faixa em segundos (pula a intro; vale pra ela em todo lugar)" style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <input
                            type="number" min="0" step="1"
                            value={inicios[val] ?? 0}
                            onChange={(e) => salvarInicio(val, e.target.value)}
                            style={{ width: 42, padding: '4px 4px', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 8, color: 'var(--fg, #f0ece0)', fontSize: 12, textAlign: 'right' }}
                          />
                          <span className="muted" style={{ fontSize: 11 }}>s</span>
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setPreview(val ? '/files/assets/musica/' + encodeURIComponent(val) + '#t=' + (inicios[val] ?? 0) : '')}
                        disabled={!val}
                        title="ouvir esta faixa a partir do início escolhido"
                        style={{ padding: '4px 9px', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 8, color: val ? 'var(--gold)' : 'var(--muted)', cursor: val ? 'pointer' : 'default' }}
                      >▶</button>
                    </div>
                  )
                })}
              </div>
              {preview && <audio controls src={preview} autoPlay style={{ width: '100%', marginTop: 8, height: 36 }} />}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <span className="muted" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>🔊 volume no vídeo</span>
                <input
                  type="range" min="0.01" max="0.30" step="0.01"
                  value={musicaVol}
                  onChange={(e) => { const v = Number(e.target.value); setMusicaVol(v); update((nv) => { nv.sagas[si].episodios[ei].musicaVol = v }) }}
                  style={{ flex: 1 }}
                />
                <span className="muted" style={{ fontSize: 12, width: 86, textAlign: 'right' }}>
                  {Math.round(musicaVol * 100)}%{musicaVol <= 0.05 ? ' (sutil)' : musicaVol >= 0.18 ? ' (alto)' : ''}
                </span>
              </div>
              <p className="muted" style={{ fontSize: 11, marginTop: 2, marginLeft: 2 }}>
                Deixe "(continua)" onde o clima não muda; escolha uma faixa só onde ele vira. O campo "s" pula a intro da faixa (sugerido automático, ajustável); o ▶ toca a partir dele; o slider define o volume sob a narração.
              </p>
            </>
          )}
          <button className="save-btn" style={{ marginTop: 12 }} onClick={montar} disabled={rendering || !clipesOk}>
            {rendering ? 'Montando…' : '🎬 Montar rascunho'}
          </button>
          {!clipesOk && <p className="muted" style={{ marginTop: 8 }}>Faltam clipes de vídeo, gere as cenas primeiro.</p>}
          {!algumAudio && clipesOk && <p className="muted" style={{ marginTop: 8 }}>Sem narração ainda: dá pra montar mesmo assim (usa o áudio dos clipes).</p>}
          {msg && <p className="render-msg ok" style={{ marginTop: 8 }}>✓ {msg}</p>}
          {err && <p className="render-msg no" style={{ marginTop: 8 }}>⚠ {err}</p>}
          {status?.roughCut && <FilePath path={status.roughCut} />}
        </div>
        <div className="panel">
          <h3>Onde salvar a narração</h3>
          <p className="muted">Uma narração por cena (melhor sincronia). Salve os MP3 do ElevenLabs em:</p>
          {ep.cenas.map((c) => <FilePath key={c.numero} path={`episodios/${ep.id}/audio/${c.numero}.mp3`} />)}
          <p className="muted" style={{ marginTop: 10 }}>
            Depois clique em Montar. Sem narração numa cena, o rascunho usa o áudio do próprio clipe.
          </p>
        </div>
      </div>
    </div>
  )
}

function Publicar({ ep, si, ei, update }) {
  const pub = ep.publicacao || { titulo: '', tiktok: '', instagram: '', twitter: '' }
  const yt = pub.youtube || { titulo: '', descricao: '' }
  const plataformas = [
    { key: 'tiktok', label: 'TikTok', tag: 'legenda + hashtags', hint: 'Cole na descrição. Use a função Séries/Playlist do TikTok para agrupar os capítulos.' },
    { key: 'instagram', label: 'Instagram Reels', tag: 'legenda + hashtags', hint: 'Cole na legenda. Hashtags podem ir no fim ou no 1º comentário.' },
    { key: 'twitter', label: 'Twitter / X', tag: 'até 280 caracteres', hint: 'Poucas hashtags. Anexe o vídeo nativo (não link).' },
  ]
  return (
    <div>
      <div className="panel">
        <h3>Título / gancho do episódio</h3>
        <p className="muted">Texto de capa (thumbnail). Cada plataforma tem seu campo próprio abaixo.</p>
        <PromptBlock
          label="Título"
          value={pub.titulo || ''}
          onChange={(v) => update((n) => { n.sagas[si].episodios[ei].publicacao.titulo = v })}
        />
      </div>
      {plataformas.map((p) => (
        <div className="panel" key={p.key}>
          <h3>{p.label}</h3>
          <PromptBlock
            label="Texto do post"
            tool={p.tag}
            value={pub[p.key] || ''}
            onChange={(v) => update((n) => { n.sagas[si].episodios[ei].publicacao[p.key] = v })}
            hint={p.hint}
          />
        </div>
      ))}
      <div className="panel">
        <h3>YouTube Shorts</h3>
        <PromptBlock
          label="Título do vídeo"
          tool="≤ 100 caracteres · pesa na busca"
          value={yt.titulo || ''}
          onChange={(v) => update((n) => {
            const ep2 = n.sagas[si].episodios[ei]
            ep2.publicacao.youtube = { ...(ep2.publicacao.youtube || {}), titulo: v }
          })}
          hint="Título é separado da descrição no YouTube e é o que mais importa na busca. Mantenha #Shorts no fim."
        />
        <PromptBlock
          label="Descrição"
          tool="descrição + hashtags"
          value={yt.descricao || ''}
          onChange={(v) => update((n) => {
            const ep2 = n.sagas[si].episodios[ei]
            ep2.publicacao.youtube = { ...(ep2.publicacao.youtube || {}), descricao: v }
          })}
          hint="As 3 primeiras hashtags aparecem acima do título. Agrupe a saga numa playlist."
        />
      </div>
    </div>
  )
}

export default function EpView({ si, ei, sub }) {
  const { dados, update, existing, bust, jobs, startGen, nav } = useStudio()
  const setSub = (s) => nav.episodio(si, ei, s)
  const saga = dados.sagas[si]
  const ep = saga.episodios[ei]
  const byId = Object.fromEntries(dados.personagens.map((p) => [p.id, p]))
  const [confirm, setConfirm] = useState(null)
  const setEp = (campo, v) => update((n) => { n.sagas[si].episodios[ei][campo] = v })

  function novaCena() {
    const novo = (ep.cenas.length ? Math.max(...ep.cenas.map((c) => c.numero)) : 0) + 1
    update((n) => { n.sagas[si].episodios[ei].cenas.push(blankCena(ep.id, novo)) })
  }
  function duplicarCena(i) {
    const novo = Math.max(...ep.cenas.map((c) => c.numero)) + 1
    const copia = dupCena(ep.cenas[i], ep.id, novo)
    update((n) => { n.sagas[si].episodios[ei].cenas.splice(i + 1, 0, copia) })
  }
  function excluirCena(i) {
    const c = ep.cenas[i]
    setConfirm({
      titulo: 'Excluir cena?',
      mensagem: `A cena ${c.numero} "${c.titulo}" sai do episódio. Os arquivos no disco continuam. Salve depois para efetivar.`,
      confirmar: 'Excluir', perigo: true,
      onConfirm: () => { setConfirm(null); update((n) => { n.sagas[si].episodios[ei].cenas.splice(i, 1) }) },
    })
  }

  return (
    <div>
      {confirm && <ConfirmModal {...confirm} onCancel={() => setConfirm(null)} />}
      <div className="panel">
        <EditField label="Título do episódio" value={ep.titulo} onChange={(v) => setEp('titulo', v)} />
        <EditField label="Contexto real (fato que a saga usa)" value={ep.contextoReal} onChange={(v) => setEp('contextoReal', v)} textarea />
        <div className="edit-row">
          <EditField label="Fim em suspense (o gancho que fecha o episódio e faz querer o próximo)" value={ep.cliffhanger} onChange={(v) => setEp('cliffhanger', v)} textarea />
          <EditField label="Publicar (nota interna)" value={ep.publicar} onChange={(v) => setEp('publicar', v)} textarea />
        </div>
      </div>

      <div className="subtabs">
        <button className={'subtab' + (sub === 'cenas' ? ' active' : '')} onClick={() => setSub('cenas')}>🎬 Cenas</button>
        <button className={'subtab' + (sub === 'previa' ? ' active' : '')} onClick={() => setSub('previa')}>🎞 Prévia</button>
        <button className={'subtab' + (sub === 'audio' ? ' active' : '')} onClick={() => setSub('audio')}>🎙 Narração</button>
        <button className={'subtab' + (sub === 'montar' ? ' active' : '')} onClick={() => setSub('montar')}>🎬 Montar</button>
        <button className={'subtab' + (sub === 'publicar' ? ' active' : '')} onClick={() => setSub('publicar')}>📢 Publicar</button>
      </div>

      {sub === 'previa' && <Previa key={ep.id} ep={ep} existing={existing} />}
      {sub === 'montar' && <Montar key={ep.id} ep={ep} update={update} si={si} ei={ei} />}
      {sub === 'publicar' && <Publicar key={ep.id} ep={ep} si={si} ei={ei} update={update} />}

      {sub === 'audio' && (
        <div className="panel">
          <h3>Narração completa do episódio</h3>
          <p className="muted">{dados.audio.narradorVoz}, {saga.narradorTom}</p>
          <PromptBlock
            label="Bloco completo"
            tool="ElevenLabs"
            value={ep.narracaoCompleta}
            onChange={(v) => update((n) => { n.sagas[si].episodios[ei].narracaoCompleta = v })}
          />
        </div>
      )}

      {sub === 'cenas' && (
        <>
          <div className="section-head">
            <h3 className="section-title">Cenas</h3>
            <button className="mini-btn" onClick={novaCena}>＋ Nova cena</button>
          </div>
          {ep.cenas.map((cena, i) => (
        <div className="panel cena" key={cena.numero}>
          <div className="cena-head">
            <h3>CENA {cena.numero}, {cena.titulo}</h3>
            <div className="row-actions">
              <span className="tempo">{cena.tempo}</span>
              <button className="mini-btn" title="Duplicar cena" onClick={() => duplicarCena(i)}>⧉</button>
              <button className="mini-btn danger" title="Excluir cena" onClick={() => excluirCena(i)}>🗑</button>
            </div>
          </div>
          <div className="edit-row">
            <EditField label="Título da cena" value={cena.titulo} onChange={(v) => update((n) => { n.sagas[si].episodios[ei].cenas[i].titulo = v })} />
            <EditField label="Tempo" value={cena.tempo} onChange={(v) => update((n) => { n.sagas[si].episodios[ei].cenas[i].tempo = v })} />
          </div>
          <div className="cast-label">Quem aparece nesta cena <span className="muted">(clique pra alternar)</span></div>
          <CenaCast
            elencoIds={saga.elenco}
            byId={byId}
            personagens={cena.personagens}
            naoAparecem={cena.naoAparecem}
            onChange={(p, n) => update((nv) => {
              nv.sagas[si].episodios[ei].cenas[i].personagens = p
              nv.sagas[si].episodios[ei].cenas[i].naoAparecem = n
            })}
          />

          <div className="cena-cols">
            <div className="cena-media">
              <div className="media-slot">
                <div className="media-head"><span>Imagem</span><StatusPill value={cena.statusImagem} onChange={(v) => update((n) => { n.sagas[si].episodios[ei].cenas[i].statusImagem = v })} /></div>
                <Media existing={existing} src={cena.imagem} kind="img" bust={bust} />
                <FilePath path={cena.imagem} />
              </div>
              <div className="media-slot">
                <div className="media-head"><span>Vídeo</span><StatusPill value={cena.statusVideo} onChange={(v) => update((n) => { n.sagas[si].episodios[ei].cenas[i].statusVideo = v })} /></div>
                <Media existing={existing} src={cena.video} kind="video" />
                <FilePath path={cena.video} />
              </div>
            </div>

            <div className="cena-prompts">
              <PromptBlock
                label="Narração"
                tool="ElevenLabs (por cena)"
                value={cena.narracao}
                onChange={(v) => update((n) => { n.sagas[si].episodios[ei].cenas[i].narracao = v })}
              />
              {(() => {
                const o = orcamentoNarracao(cena.narracao)
                const cor = o.nivel === 'alto' ? '#f85149' : o.nivel === 'medio' ? '#d29922' : '#3fb950'
                const icon = o.nivel === 'alto' ? '⛔' : o.nivel === 'medio' ? '⚠' : '✓'
                const msg = o.nivel === 'ok'
                  ? 'cabe no clipe de 10s, sem acelerar'
                  : o.nivel === 'medio'
                    ? `passa dos 10s: a voz acelera. Corte ~${o.cortar} palavra(s) pra encaixar natural`
                    : `bem acima de 10s: acelera ao máximo e ainda congela quadro. Corte ~${o.cortar} palavra(s) ou divida em 2 clipes`
                return (
                  <div style={{ margin: '2px 0 10px', padding: '4px 8px', borderRadius: 8, background: cor + '22', border: '1px solid ' + cor + '66', fontSize: 12, color: cor }}>
                    {icon} ≈ {o.seg}s · {o.palavras} palavras (meta ~{o.alvoPalavras} pra 10s) · {msg}
                  </div>
                )
              })()}
              <PromptBlock
                label="Prompt da imagem"
                tool="ChatGPT Images"
                value={cena.promptImagem}
                onChange={(v) => update((n) => { n.sagas[si].episodios[ei].cenas[i].promptImagem = v })}
                copyText={`${saga.stylePrefix}, ${cena.promptImagem}\n\n${dados.projeto.promptRules}`}
                hint="Copia com o prefixo de estilo + as regras da casa (negativos). Anexe as fichas dos personagens marcados com ✓."
              />
              <div className="gen-row">
                <GenerateButton
                  payload={{ tipo: 'cena', sagaId: saga.id, epId: ep.id, cenaNumero: cena.numero }}
                  targetPath={cena.imagem}
                  existing={existing}
                  jobs={jobs}
                  startGen={startGen}
                  label="⚡ Gerar imagem"
                  refInfo={(() => {
                    const refs = cena.personagens.filter((id) => existing[byId[id]?.imagem]).map((id) => byId[id]?.nome || id)
                    return refs.length
                      ? `Referências anexadas: ${refs.join(', ')}.`
                      : '⚠ Nenhuma ficha gerada ainda, vai gerar sem referência (personagem pode variar). Gere as fichas primeiro.'
                  })()}
                />
                <span className="gen-hint muted">as fichas ✓ da cena vão como referência</span>
              </div>
              {cena.promptImagemEdit && (
                <PromptBlock
                  label="✏️ Corrigir imagem em cima (sem regerar do zero)"
                  tool="ChatGPT / Nano Banana"
                  value={cena.promptImagemEdit}
                  onChange={(v) => update((n) => { n.sagas[si].episodios[ei].cenas[i].promptImagemEdit = v })}
                  hint="Anexe a imagem ATUAL da cena e mande este prompt de edição, preserva o resto e muda só o apontado."
                />
              )}
              <PromptBlock
                label="Prompt do vídeo"
                tool="Grok Imagine"
                value={cena.promptVideo}
                onChange={(v) => update((n) => { n.sagas[si].episodios[ei].cenas[i].promptVideo = v })}
                copyText={`${cena.promptVideo}\n${cena.promptAudio}`}
                hint="Copia já com o bloco de ÁUDIO junto. Suba a imagem da cena no modo image-to-video."
              />
              <PromptBlock
                label="Bloco de áudio (ambiência)"
                tool="Grok Imagine"
                value={cena.promptAudio}
                onChange={(v) => update((n) => { n.sagas[si].episodios[ei].cenas[i].promptAudio = v })}
              />
              <div className="montagem">🎬 <strong>Montagem:</strong> {cena.montagem}</div>
            </div>
          </div>
        </div>
      ))}
        </>
      )}
    </div>
  )
}
