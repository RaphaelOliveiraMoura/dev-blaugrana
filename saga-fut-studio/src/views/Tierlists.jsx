import React, { useEffect, useRef, useState } from 'react'
import { Icon, FilePath, DetalheModal, PromptBlock } from '../components/index.js'
import { VIDEO_SEGUNDOS_PADRAO } from '../../shared/constantes.mjs'
import { getTierlists, gerarVideoTierlist, salvarPublicacaoTierlist } from '../api/tierlists.js'
import Baixar from './Baixar.jsx'

function tamanho(bytes) {
  if (!bytes) return ''
  const mb = bytes / (1024 * 1024)
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

// O card da grade: só a arte e o nome, pra procurar sem poluição. O selo de vídeo
// diz de relance quais já têm o vídeo pronto. Clicar abre o detalhe, onde se trabalha.
function TierlistCard({ item, onAbrir }) {
  return (
    <button className="tierlist-card" onClick={() => onAbrir(item)} title="Abrir">
      <span className="tierlist-thumb"><img src={item.imagemUrl} alt={item.slug} loading="lazy" /></span>
      <span className="tierlist-meta">
        <span className="tierlist-nome" title={item.slug}>{item.slug}</span>
        <span className="tierlist-sub">
          <span className="muted">{tamanho(item.bytes)}</span>
          {item.videoRel && <span className="tierlist-badge"><Icon name="video" size={11} /> vídeo</span>}
        </span>
      </span>
    </button>
  )
}

const ABAS = [
  { id: 'video', icon: 'video', label: 'Vídeo' },
  { id: 'publicar', icon: 'publicar', label: 'Publicar' },
  { id: 'baixar', icon: 'baixar', label: 'Baixar' },
]

// O detalhe em modal: a grade é onde você procura, aqui é onde você trabalha. A arte
// fica grande à esquerda (âncora) e as abas à direita, como no quadrinho:
//   Vídeo    — a arte parada virando vídeo 9:16, tempo escolhido.
//   Publicar — título e legenda do post (salvos no publicacao.json da pasta).
//   Baixar   — puxa um vídeo do TikTok pra pasta desta tier list, como referência.
function TierlistModal({ item, onFechar, onGerou }) {
  const [aba, setAba] = useState('video')

  // vídeo
  const [seg, setSeg] = useState(VIDEO_SEGUNDOS_PADRAO)
  const [rend, setRend] = useState(false)
  const [msg, setMsg] = useState(null)
  const [err, setErr] = useState(null)
  const [video, setVideo] = useState(item.videoRel ? { rel: item.videoRel, url: item.videoUrl } : null)

  // publicação (autosave, sem passar pelo dirty do studio: a tier list não é do project.json)
  const [titulo, setTitulo] = useState(item.publicacao?.titulo || '')
  const [legenda, setLegenda] = useState(item.publicacao?.legenda || '')
  const [pub, setPub] = useState('salvo') // salvo | editando | salvando | erro
  const primeiroPub = useRef(true)

  async function gerar() {
    setRend(true); setErr(null); setMsg(null)
    try {
      const r = await gerarVideoTierlist(item.slug, seg)
      setVideo({ rel: r.video, url: r.url + (r.url.includes('?') ? '&' : '?') + 'v=' + Date.now() })
      setMsg(`Vídeo de ${r.segundos}s pronto.`)
      onGerou()
    } catch (e) { setErr(e.message) } finally { setRend(false) }
  }

  useEffect(() => {
    if (primeiroPub.current) { primeiroPub.current = false; return }
    setPub('editando')
    const t = setTimeout(async () => {
      setPub('salvando')
      try { await salvarPublicacaoTierlist(item.slug, { titulo, legenda }); setPub('salvo'); onGerou() }
      catch { setPub('erro') }
    }, 700)
    return () => clearTimeout(t)
  }, [titulo, legenda])

  return (
    <DetalheModal
      titulo={<span className="char-id" title="pasta em saga-fut/tierlists/">{item.slug}</span>}
      onFechar={onFechar}
      midia={(
        <>
          <img className="tierlist-modal-art" src={item.imagemUrl} alt={item.slug} />
          <FilePath path={item.imagemRel} />
        </>
      )}
    >
      <div className="subtabs" role="tablist">
        {ABAS.map((a) => (
          <button
            key={a.id} role="tab" aria-selected={a.id === aba}
            className={'subtab' + (a.id === aba ? ' active' : '')}
            onClick={() => setAba(a.id)}
          >
            <Icon name={a.icon} size={14} />
            {a.label}
          </button>
        ))}
      </div>

      {aba === 'video' && (
        <>
          <div className="field-group">
            <span className="label">Vídeo pro TikTok</span>
            <p className="hint">
              A arte parada vira vídeo 9:16, mudo. Escolha quanto tempo ela segura na tela; o som você põe no
              próprio TikTok. O arquivo cai na mesma pasta da arte.
            </p>
            <div className="tierlist-video">
              <input
                className="field tierlist-seg" type="number" min="2" max="60" step="1" value={seg}
                title="Segundos que a arte segura na tela"
                onChange={(e) => setSeg(Math.min(60, Math.max(2, Math.round(Number(e.target.value) || VIDEO_SEGUNDOS_PADRAO))))}
              />
              <span className="tierlist-seg-lbl">s</span>
              <button className="btn btn-primary" onClick={gerar} disabled={rend}>
                {rend ? <span className="gen-spinner" /> : <Icon name="video" size={14} />}
                {rend ? 'Gerando…' : video ? 'Regerar vídeo' : 'Gerar vídeo'}
              </button>
            </div>
            {msg && <p className="render-msg ok mt-2"><Icon name="check" size={13} /> {msg}</p>}
            {err && <p className="render-msg no mt-2"><Icon name="alerta" size={13} /> {err}</p>}
          </div>

          {video ? (
            <div className="field-group mt-4">
              <span className="label">Prévia do vídeo</span>
              <video className="tierlist-vid" src={video.url} controls preload="metadata" />
              <FilePath path={video.rel} />
            </div>
          ) : (
            <p className="hint mt-4">Nenhum vídeo ainda. Gere um acima e ele aparece aqui e na pasta da arte.</p>
          )}
        </>
      )}

      {aba === 'publicar' && (
        <>
          <div className="tierlist-pub-status">
            {pub === 'salvo' && <span className="render-msg ok"><Icon name="check" size={12} /> salvo</span>}
            {pub === 'editando' && <span className="hint">editando…</span>}
            {pub === 'salvando' && <span className="hint">salvando…</span>}
            {pub === 'erro' && <span className="render-msg no"><Icon name="alerta" size={12} /> falhou ao salvar</span>}
          </div>
          <PromptBlock
            label="Título do post"
            tool="gancho curto · 3 a 7 palavras"
            value={titulo}
            onChange={setTitulo}
            hint="Uma linha que prende sem entregar tudo. Cabe 1 emoji. Ex.: 'O ranking que vai te irritar 🔥'."
          />
          <PromptBlock
            label="Descrição do post"
            tool="gancho + contexto + CTA + hashtags"
            value={legenda}
            onChange={setLegenda}
            hint="Estrutura: 1) linha de impacto; 2) o take (quem subiu, quem caiu e por quê); 3) CTA (concorda? comenta o teu top 1); 4) hashtags no fim (nicho amplo + Barça + jogadores). No Instagram o save é o sinal nº 1: ponha a palavra-chave (jogador, Barça) logo no começo."
          />
        </>
      )}

      {aba === 'baixar' && <Baixar tierlistSlug={item.slug} />}
    </DetalheModal>
  )
}

// TIER LISTS: vitrine dos rankings gerados. Cada um vive numa subpasta de
// saga-fut/tierlists/ com a arte e o vídeo lado a lado. A grade só mostra e procura;
// o detalhe (modal) é onde se vê grande, gera o vídeo, escreve a legenda e baixa referência.
export default function Tierlists() {
  const [itens, setItens] = useState([])
  const [erro, setErro] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [aberto, setAberto] = useState(null)

  async function carregar() {
    try { setItens((await getTierlists()).tierlists || []) }
    catch (e) { setErro(e.message) }
    finally { setCarregando(false) }
  }
  useEffect(() => { carregar() }, [])

  return (
    <div>
      <div className="panel">
        <h3>Tier lists <span className="muted">({itens.length})</span></h3>
        <p className="hint">
          Rankings em <code>saga-fut/tierlists/&lt;nome&gt;/</code>, uma subpasta por peça, com a arte e o
          vídeo juntos. A montagem da arte é manual (fora do studio); clique numa peça pra ver grande,
          gerar o vídeo 9:16, escrever a legenda e baixar referência.
        </p>
        {erro && <p className="baixar-erro"><Icon name="alerta" size={12} /> {erro}</p>}
        {carregando && <p className="hint">Carregando…</p>}
        {!carregando && !itens.length && !erro && <p className="hint">Nenhuma tier list ainda.</p>}
        <div className="tierlists-grid">
          {itens.map((t) => <TierlistCard key={t.slug} item={t} onAbrir={setAberto} />)}
        </div>
      </div>

      {aberto && <TierlistModal item={aberto} onFechar={() => setAberto(null)} onGerou={carregar} />}
    </div>
  )
}
