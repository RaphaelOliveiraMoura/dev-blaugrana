import React, { useEffect, useState } from 'react'
import { Icon, FilePath } from '../components/index.js'
import { getBaixados, baixarTikTok } from '../api/downloads.js'

// BAIXAR: cola o link de um vídeo do TikTok e o studio grava o MP4 em
// saga-fut/baixados/, pra reaproveitar como referência sem sair da ferramenta.

function tamanho(bytes) {
  if (!bytes) return ''
  const mb = bytes / (1024 * 1024)
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

export default function Baixar() {
  const [url, setUrl] = useState('')
  const [videos, setVideos] = useState([])
  const [baixando, setBaixando] = useState(false)
  const [erro, setErro] = useState(null)

  async function carregar() {
    try { setVideos((await getBaixados()).videos || []) } catch (e) { setErro(e.message) }
  }
  useEffect(() => { carregar() }, [])

  async function baixar(e) {
    e.preventDefault()
    if (!url.trim() || baixando) return
    setBaixando(true); setErro(null)
    try {
      const r = await baixarTikTok(url.trim())
      setVideos(r.videos || [])
      setUrl('')
    } catch (err) { setErro(err.message) } finally { setBaixando(false) }
  }

  return (
    <div>
      <div className="panel">
        <h3>Baixar vídeo do TikTok</h3>
        <p className="hint">
          Cola o link (ex.: <code>https://www.tiktok.com/@dev_blaugrana/video/7663295013308124423</code>) e o
          studio baixa o MP4 pra <code>saga-fut/baixados/</code>. Serve pra guardar referência de gancho, corte
          e ritmo sem sair da ferramenta.
        </p>
        <form className="baixar-form" onSubmit={baixar}>
          <input
            type="url"
            className="field baixar-input"
            placeholder="https://www.tiktok.com/@.../video/..."
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
