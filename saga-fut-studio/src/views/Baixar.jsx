import React, { useEffect, useState } from 'react'
import { Icon, FilePath } from '../components/index.js'
import { getBaixados, baixarVideo } from '../api/downloads.js'

// BAIXAR: cola o link de um vídeo do TikTok ou de um YouTube Shorts e o studio grava o
// MP4, pra reaproveitar como referência sem sair da ferramenta. A fonte sai da própria
// URL, não tem seletor. Sem destino, cai no baixados/ global (menu da sidebar); com
// `quadrinhoId` (aba do quadrinho) ou `videoId` (aba do vídeo), grava na pasta daquela
// peça, pra referência viver junto do que ela inspira.

function tamanho(bytes) {
  if (!bytes) return ''
  const mb = bytes / (1024 * 1024)
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

export default function Baixar({ quadrinhoId, videoId } = {}) {
  const [url, setUrl] = useState('')
  const [videos, setVideos] = useState([])
  const [baixando, setBaixando] = useState(false)
  const [erro, setErro] = useState(null)

  const destino = quadrinhoId ? `saga-fut/quadrinhos/${quadrinhoId}/baixados/`
    : videoId ? `saga-fut/videos/${videoId}/baixados/`
    : 'saga-fut/baixados/'

  async function carregar() {
    try { setVideos((await getBaixados({ quadrinhoId, videoId })).videos || []) } catch (e) { setErro(e.message) }
  }
  // recarrega ao trocar de peça (a aba é reusada entre elas)
  useEffect(() => { setVideos([]); setErro(null); carregar() }, [quadrinhoId, videoId])

  async function baixar(e) {
    e.preventDefault()
    if (!url.trim() || baixando) return
    setBaixando(true); setErro(null)
    try {
      const r = await baixarVideo(url.trim(), { quadrinhoId, videoId })
      setVideos(r.videos || [])
      setUrl('')
    } catch (err) { setErro(err.message) } finally { setBaixando(false) }
  }

  return (
    <div>
      <div className="panel">
        <h3>Baixar vídeo de referência</h3>
        <p className="hint">
          Cola o link de um vídeo do <strong>TikTok</strong>{' '}
          (<code>https://www.tiktok.com/@devblaugrana/video/7663295013308124423</code>) ou de um{' '}
          <strong>YouTube Shorts</strong>{' '}
          (<code>https://www.youtube.com/shorts/abc123XYZ</code>) e o studio baixa o MP4 pra{' '}
          <code>{destino}</code>. Serve pra guardar referência de gancho, corte e ritmo sem sair da
          ferramenta.
        </p>
        <form className="baixar-form" onSubmit={baixar}>
          <input
            type="url"
            className="field baixar-input"
            placeholder="https://www.tiktok.com/@.../video/… ou https://www.youtube.com/shorts/…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={baixando}
          />
          <button type="submit" className="btn btn-primary" disabled={baixando || !url.trim()}>
            <Icon name="baixar" size={14} /> {baixando ? 'Baixando…' : 'Baixar'}
          </button>
        </form>
        {erro && <p className="baixar-erro"><Icon name="alerta" size={12} /> {erro}</p>}
      </div>

      <div className="panel">
        <h3>Baixados <span className="muted">({videos.length})</span></h3>
        {!videos.length && <p className="hint">Nada baixado ainda.</p>}
        <div className="baixados-grid">
          {videos.map((v) => (
            <div className="baixado-card" key={v.arquivo}>
              <video className="media" src={'/files/' + v.arquivo} controls preload="metadata" />
              <div className="baixado-meta">
                <span className="baixado-nome" title={v.nome}>{v.nome}</span>
                {v.bytes ? <span className="muted">{tamanho(v.bytes)}</span> : null}
              </div>
              <FilePath path={v.arquivo} compacto />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
