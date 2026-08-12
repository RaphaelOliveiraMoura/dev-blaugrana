import React, { useState, useEffect } from 'react'
import { Icon, PromptBlock, CopyButton, FilePath } from '../../components/index.js'
import { useStudio } from '../../app/StudioContext.jsx'
import { renderVideo, getVideoAssets, validarVideo, getPalco, gerarAnimatic } from '../../api/video.js'
import Baixar from '../Baixar.jsx'
import { FichaModal } from '../Personagens.jsx'

// preview animado: cicla os quadros de UMA animação em loop (vê o movimento)
function SpritePreview({ sprites, bust, fps = 8, label = 'preview' }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    if (sprites.length < 2) return
    setI(0)
    const t = setInterval(() => setI((x) => (x + 1) % sprites.length), Math.round(1000 / fps))
    return () => clearInterval(t)
  }, [sprites.length, fps])
  if (!sprites.length) return null
  const s = sprites[Math.min(i, sprites.length - 1)]
  return (
    <figure className="video-sprite video-sprite-preview" title={'animação: ' + label}>
      <img src={'/files/' + s.arquivo + (bust ? '?v=' + bust : '')} alt="preview" />
      <figcaption>▶ {label}</figcaption>
    </figure>
  )
}

// folha de revisão: grade com vários frames do render (gerada junto do MP4) pra bater o olho no
// vídeo inteiro (orientação, posição, sobreposição, deslize). Some sozinha se ainda não existir.
function FolhaRevisao({ id, v }) {
  const [ok, setOk] = useState(true)
  useEffect(() => { setOk(true) }, [id, v])
  if (!ok) return null
  const src = `/files/videos/${id}/_review.png` + (v ? '?v=' + v : '')
  return (
    <div style={{ marginTop: 20 }}>
      <div className="hint" style={{ marginBottom: 6 }}>Folha de revisão (frames do render) — confira orientação, posição, sobreposição e deslize:</div>
      <a href={src} target="_blank" rel="noreferrer">
        <img src={src} alt="folha de revisão" onError={() => setOk(false)}
          style={{ width: '100%', borderRadius: 10, border: '1px solid #333' }} />
      </a>
    </div>
  )
}

// ANIMATIC: o storyboard de ANTES de existir arte. O motor é o mesmo do render; o que muda é que
// sprite que ainda não existe entra como BONECO (no canvas normalizado, então a escala e o pé no
// chão são os de verdade) e cenário que falta entra como grade com a régua de x do mundo.
//
// POR QUE ISSO É UMA ABA E NÃO UM BOTÃO NA DE RENDER: é aqui que a encenação se aprova, e isso
// acontece ANTES de gerar asset. O primeiro momento em que dava pra VER um vídeo era depois do
// build, quando o conserto já tinha custado geração e virava refino detalhe a detalhe.
function Animatic({ id }) {
  const [r, setR] = useState(null)
  const [rodando, setRodando] = useState(false)
  const [erro, setErro] = useState(null)
  const [n, setN] = useState(12)
  const [tudo, setTudo] = useState(false)
  const [cena, setCena] = useState('')
  const [v, setV] = useState(0)
  const [temAntigo, setTemAntigo] = useState(true)
  // o mp4 pode existir de uma rodada anterior: começa true e o onError do <video> desliga
  const [temVideo, setTemVideo] = useState(true)

  // `video` = também gera o preview ANIMADO. Fica separado do botão normal porque custa mais tempo
  // (renderiza todos os frames, não 12 stills), e na maior parte das iterações a folha basta.
  async function gerar(comVideo = false) {
    setRodando(true); setErro(null)
    try {
      setR(await gerarAnimatic(id, { n, tudo, cena: cena ? Number(cena) : null, video: comVideo }))
      setV(Date.now())
      if (comVideo) setTemVideo(true)
    }
    catch (e) { setErro(e.message) }
    finally { setRodando(false) }
  }

  const src = `/files/videos/${id}/_animatic.png` + (v ? '?v=' + v : '')
  const srcMp4 = `/files/videos/${id}/_animatic.mp4` + (v ? '?v=' + v : '')
  const mostra = r || temAntigo
  return (
    <div>
      <p className="hint">
        Storyboard <b>antes de gerar asset</b>: o motor de verdade, com boneco no lugar do sprite que
        ainda não existe e grade com régua de x no lugar do cenário. Escala, posição, orientação e
        ritmo já são os definitivos. Leva ~10s e não gera nada.
      </p>
      <div className="row-actions" style={{ alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <button className="btn btn-primary" onClick={() => gerar(false)} disabled={rodando}>
          <Icon name="montar" size={13} /> {rodando ? 'Montando…' : 'Gerar animatic'}
        </button>
        {/* SEPARADO do botão normal: renderiza todos os frames, não 12 stills, então custa mais
            tempo. Com uma cena escolhida fica rápido, que é o uso enquanto se afina um lance. */}
        <button className="btn" onClick={() => gerar(true)} disabled={rodando}
          title="renderiza também um mp4 leve: ritmo e sincronismo não se julgam em quadro parado">
          <Icon name="video" size={13} /> {rodando ? 'Montando…' : '+ preview animado'}
        </button>
        <label className="hint">stills{' '}
          <select value={n} onChange={(e) => setN(Number(e.target.value))}>
            {[6, 12, 16, 20].map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </label>
        <label className="hint">cena{' '}
          <input type="number" min="1" value={cena} placeholder="todas" style={{ width: 64 }}
            onChange={(e) => setCena(e.target.value)} />
        </label>
        <label className="hint" title="desenha TODO mundo como boneco, mesmo quem já tem arte pronta">
          <input type="checkbox" checked={tudo} onChange={(e) => setTudo(e.target.checked)} /> só encenação
        </label>
        {erro && <span className="hint erro">Erro: {erro}</span>}
      </div>

      {r && (
        <div className="hint" style={{ marginTop: 10 }}>
          {r.cenas} cena(s) · {r.bonecos.length} sprite(s) como boneco · {r.cenariosFalsos.length} cenário(s) como grade
        </div>
      )}

      {/* O PREVIEW ANIMADO VEM ANTES DA FOLHA: metade do que se aprova aqui é TEMPO (o pé
          encontrando a bola, o goleiro reagindo, o corte caindo no lugar), e nada disso aparece
          em still. A folha continua embaixo pra comparar quadro a quadro. */}
      {temVideo && (
        <div style={{ marginTop: 12 }}>
          {/* TETO DE ALTURA, não de largura: o vídeo é 3:4, então largura cheia = altura maior
              que a tela, e a folha de contato e a lista de compras ficavam abaixo da dobra. Aqui
              ele cabe junto do resto, que é como se confere. */}
          <video src={srcMp4} controls loop muted playsInline
            onError={() => setTemVideo(false)}
            className="animatic-video" />
          <div className="hint"><FilePath path={`videos/${id}/_animatic.mp4`} /></div>
        </div>
      )}

      {mostra && (
        <div style={{ marginTop: 12 }}>
          <a href={src} target="_blank" rel="noreferrer">
            <img src={src} alt="animatic" onError={() => setTemAntigo(false)} className="animatic-folha" />
          </a>
          <div className="hint"><FilePath path={`videos/${id}/_animatic.png`} /></div>
        </div>
      )}

      {/* LISTA DE COMPRAS: o animatic também é o orçamento. Aprovar a encenação antes de pagar
          essa conta é o ponto da tela. */}
      {r?.compras?.length > 0 && (
        <div style={{ marginTop: 16, padding: '10px 12px', borderRadius: 8, border: '1px solid #3a3a3a', background: '#161616' }}>
          <div className="hint" style={{ marginBottom: 6, color: '#d9a400' }}>
            Lista de compras: {r.compras.length} asset(s) que ainda não existem no acervo
          </div>
          {r.compras.map((c, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, lineHeight: 1.9 }}>
              <b style={{ minWidth: 170 }}>{c.slug}</b>
              <span style={{ minWidth: 110, opacity: 0.8 }}>{c.tipo === 'rig' ? c.nome : `${c.tipo} ${c.nome}`}</span>
              <code style={{ opacity: 0.75 }}>{c.comando}</code>
              <CopyButton value={c.comando} />
            </div>
          ))}
        </div>
      )}
      {r && !r.compras.length && (
        <div className="hint" style={{ marginTop: 12, color: '#5fbf6f' }}>✓ nada a comprar: todo sprite do roteiro já existe no acervo</div>
      )}
    </div>
  )
}

// resultado do validador pré-render: ERROS (vermelho, barram o render) e AVISOS (amarelo, passam).
function ValidacaoBox({ valid, validando }) {
  if (validando && !valid) return <div className="hint" style={{ marginTop: 10 }}>validando…</div>
  if (!valid) return null
  const { ok, erros = [], avisos = [] } = valid
  if (ok && !avisos.length) return <div className="hint" style={{ marginTop: 10, color: '#5fbf6f' }}>✓ validação ok (sprites, posição, publicação)</div>
  const Linha = ({ cor, tag, msg }) => (
    <li style={{ color: cor, fontSize: 13, lineHeight: 1.5, listStyle: 'none' }}><strong>{tag}</strong> {msg}</li>
  )
  return (
    <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 8, border: '1px solid #3a3a3a', background: '#161616' }}>
      {erros.length > 0 && <div className="hint" style={{ color: '#e0574f', marginBottom: 4 }}>{erros.length} erro(s) barram o render:</div>}
      <ul style={{ margin: 0, padding: 0 }}>
        {erros.map((e, i) => <Linha key={'e' + i} cor="#e0574f" tag="ERRO" msg={e.msg} />)}
        {avisos.map((a, i) => <Linha key={'a' + i} cor="#d9a400" tag="aviso" msg={a.msg} />)}
      </ul>
      {ok && avisos.length > 0 && <div className="hint" style={{ marginTop: 4, color: '#5fbf6f' }}>✓ sem erros (só avisos, pode renderizar)</div>}
    </div>
  )
}

// PALCO: editor visual da cena. Arrasta personagem (spot/piso ou sobrepor), arrasta balão (x/y), arrasta
// a origem do zoom (⊕), tem régua de TEMPO (ver a cena em qualquer frame) e toggle de flip + campos
// numéricos. Tudo salva no roteiro (⌘S). Some a necessidade de eu chutar coordenada no olho.
function Palco({ videoId, video, vi, update }) {
  const roteiro = video.roteiro || []
  const [shot, setShot] = useState(0)
  const [frame, setFrame] = useState(null) // null = posição de descanso
  const [layout, setLayout] = useState(null)
  const [erro, setErro] = useState(null)
  const [drag, setDrag] = useState(null) // { type:'char'|'balao'|'zoom', idx, dx, dy }
  const DISP = 340

  const carregar = React.useCallback((s, f) => {
    setErro(null)
    getPalco(videoId, s, f).then(setLayout).catch((e) => { setLayout(null); setErro(e.message) })
  }, [videoId])
  useEffect(() => { carregar(shot, frame) }, [shot, frame, carregar])

  if (!roteiro.length) return <div className="hint">Este vídeo não usa roteiro (sem palco).</div>
  const scale = layout ? DISP / layout.w : 1
  const W = layout?.w || 1080, HH = layout?.h || 1440
  const H = HH * scale
  const off = (type, i) => (drag?.type === type && drag?.idx === i ? { dx: drag.dx, dy: drag.dy } : { dx: 0, dy: 0 })
  const zoomPx = () => {
    const m = (layout?.zoom?.origin || '50% 50%').match(/([\d.]+)%\s+([\d.]+)%/)
    return m ? { x: (+m[1] / 100) * W, y: (+m[2] / 100) * HH } : { x: W / 2, y: HH / 2 }
  }

  function onDown(e, type, i) {
    e.preventDefault(); e.stopPropagation()
    const sx = e.clientX, sy = e.clientY
    const move = (ev) => setDrag({ type, idx: i, dx: ev.clientX - sx, dy: ev.clientY - sy })
    const up = (ev) => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up)
      const dcx = Math.round((ev.clientX - sx) / scale), dcy = Math.round((ev.clientY - sy) / scale)
      setDrag(null)
      if (!dcx && !dcy) return
      if (type === 'char') {
        const ch = layout.chars[i]; if (ch.slug == null) return
        update((n) => {
          const p = n.videos[vi].roteiro[shot].personagens[i]
          p.piso = Math.round(ch.cyRest + dcy + 0.625 * ch.w) // cy = piso - 0.625*w
          if (p.junto) p.sobrepor = Math.round((p.sobrepor || 0) - dcx) // arrastar pro alvo = mais overlap
          else p.spot = Math.round(ch.cxRest + dcx)
        })
        setLayout((L) => ({ ...L, chars: L.chars.map((c, j) => (j === i ? { ...c, cx: c.cx + dcx, cy: c.cy + dcy, cxRest: c.cxRest + dcx, cyRest: c.cyRest + dcy } : c)) }))
      } else if (type === 'balao') {
        const b = layout.balloons[i], nx = b.x + dcx, ny = b.y + dcy
        update((n) => { const rb = n.videos[vi].roteiro[shot].baloes[i]; rb.x = Math.max(0, Math.min(1, +(nx / W).toFixed(3))); rb.y = Math.round(ny) })
        setLayout((L) => ({ ...L, balloons: L.balloons.map((bb, j) => (j === i ? { ...bb, x: nx, y: ny } : bb)) }))
      } else if (type === 'zoom') {
        const z = zoomPx(), origin = `${Math.round(((z.x + dcx) / W) * 100)}% ${Math.round(((z.y + dcy) / HH) * 100)}%`
        update((n) => { const sh = n.videos[vi].roteiro[shot]; if (sh.zoom) sh.zoom.origin = origin; else if (sh.zooms?.[0]) sh.zooms[0].origin = origin })
        setLayout((L) => ({ ...L, zoom: { ...L.zoom, origin } }))
      }
    }
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up)
  }

  // edita spot/piso/sobrepor e reflete no palco LOCALMENTE (mesma conta do composer; não relê o disco)
  const setCampo = (i, campo, val) => {
    const num = val === '' ? undefined : Number(val)
    update((n) => { n.videos[vi].roteiro[shot].personagens[i][campo] = num })
    if (num == null) return
    setLayout((L) => {
      if (!L) return L
      const chars = L.chars.slice(); const c = { ...chars[i] }, w = c.w
      if (campo === 'piso') { const cy = Math.round(num - 0.625 * w); c.cy = cy; c.cyRest = cy }
      else if (campo === 'spot') { c.cx = num; c.cxRest = num }
      else if (campo === 'sobrepor') {
        const jp = roteiro[shot].personagens[i]
        const tgt = chars.find((cc, k) => roteiro[shot].personagens[k]?.slug === jp.junto)
        if (tgt) { const cx = Math.round(tgt.cxRest + (tgt.w * 0.4 + w * 0.4 - num)); c.cx = cx; c.cxRest = cx }
      }
      chars[i] = c; return { ...L, chars }
    })
  }
  const toggleFlip = (i) => { const cur = !!layout?.chars[i]?.flip; update((n) => { n.videos[vi].roteiro[shot].personagens[i].flip = !cur }); setLayout((L) => ({ ...L, chars: L.chars.map((c, j) => (j === i ? { ...c, flip: !cur } : c)) })) }
  const zp = layout ? zoomPx() : null

  return (
    <div>
      <div className="row-actions" style={{ flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
        {roteiro.map((_, i) => (
          <button key={i} className={'btn' + (i === shot ? ' btn-primary' : '')} onClick={() => setShot(i)}>Cena {i + 1}</button>
        ))}
      </div>
      <p className="hint" style={{ marginTop: 0 }}>Arraste personagem (spot/piso ou <code>sobrepor</code>), balão (x/y) e o ⊕ (origem do zoom). Régua = ver no tempo. Depois <strong>salve</strong> (⌘S).</p>
      {layout && (() => {
        const fim = Math.max(1, (layout.dur || 1) - 1)
        const passo = (d) => setFrame((f) => Math.max(0, Math.min(fim, (f ?? 0) + d)))
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: DISP, marginBottom: 8, flexWrap: 'wrap' }}>
            <button className="btn" style={{ padding: '2px 8px' }} onClick={() => setFrame(null)} disabled={frame == null}>↺</button>
            <button className="btn" style={{ padding: '2px 9px' }} onClick={() => passo(-1)} title="frame anterior (−1)">◀</button>
            <input type="range" min={0} max={fim} value={frame ?? 0} onChange={(e) => setFrame(Number(e.target.value))} style={{ flex: 1, minWidth: 90 }} />
            <button className="btn" style={{ padding: '2px 9px' }} onClick={() => passo(1)} title="próximo frame (+1)">▶</button>
            <input type="number" min={0} max={fim} value={frame ?? 0} onChange={(e) => setFrame(Math.max(0, Math.min(fim, Number(e.target.value))))} style={{ width: 58 }} title="ir pro frame" />
            <span className="hint" style={{ fontFamily: 'monospace', fontSize: 12, minWidth: 72, textAlign: 'right' }}>{frame == null ? 'descanso' : 'f' + frame + ' · ' + (frame / 30).toFixed(1) + 's'}</span>
          </div>
        )
      })()}
      {erro && <div className="hint erro">Erro: {erro}</div>}
      {layout && (
        <div style={{ position: 'relative', width: DISP, height: H, borderRadius: 10, overflow: 'hidden', border: '1px solid #333', background: '#000', touchAction: 'none', userSelect: 'none' }}>
          <img src={layout.cenario} alt="cenário" draggable={false} style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover' }} />
          {layout.chars.map((c, i) => {
            if (!c.src) return null
            const o = off('char', i)
            return (
              <img key={'c' + i} src={c.src} draggable={false} onPointerDown={(e) => onDown(e, 'char', i)} title={c.slug || 'fecho'}
                style={{ position: 'absolute', left: c.cx * scale + o.dx, top: c.cy * scale + o.dy, width: c.w * scale,
                  transform: `translate(-50%, -50%) scaleX(${c.flip ? -1 : 1})`, opacity: c.visible === false ? 0.25 : 1,
                  cursor: c.slug ? 'grab' : 'default', filter: drag?.type === 'char' && drag?.idx === i ? 'drop-shadow(0 0 6px #e50e5b)' : 'none' }} />
            )
          })}
          {(layout.balloons || []).map((b, i) => {
            const o = off('balao', i)
            return (
              <div key={'b' + i} onPointerDown={(e) => onDown(e, 'balao', i)} title="balão"
                style={{ position: 'absolute', left: b.x * scale + o.dx, top: b.y * scale + o.dy, transform: 'translate(-50%, -50%)',
                  padding: '2px 7px', borderRadius: 6, background: 'rgba(255,255,255,0.92)', color: '#111', fontWeight: 800, fontSize: 11,
                  whiteSpace: 'nowrap', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'grab', opacity: b.visible === false ? 0.35 : 1,
                  boxShadow: drag?.type === 'balao' && drag?.idx === i ? '0 0 0 2px #e50e5b' : '0 1px 3px #0006' }}>{b.text}</div>
            )
          })}
          {zp && (
            <div onPointerDown={(e) => onDown(e, 'zoom', 0)} title="origem do zoom"
              style={{ position: 'absolute', left: zp.x * scale + off('zoom', 0).dx, top: zp.y * scale + off('zoom', 0).dy, transform: 'translate(-50%, -50%)',
                width: 22, height: 22, borderRadius: '50%', border: '2px solid #ffd23f', background: 'rgba(0,0,0,0.35)', color: '#ffd23f',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, lineHeight: 1, cursor: 'grab' }}>⊕</div>
          )}
        </div>
      )}
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {(roteiro[shot]?.personagens || []).map((p, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 12 }}>
            <strong style={{ fontFamily: 'monospace', minWidth: 130 }}>{p.slug}</strong>
            <button className="btn" style={{ padding: '2px 8px' }} onClick={() => toggleFlip(i)} title="espelhar horizontal">olha {layout?.chars[i]?.flip ? '◀' : '▶'}</button>
            {p.junto ? (
              <label className="hint">sobrepor <input type="number" value={p.sobrepor ?? 0} onChange={(e) => setCampo(i, 'sobrepor', e.target.value)} style={{ width: 64 }} /></label>
            ) : (
              <label className="hint">spot <input type="number" value={typeof p.spot === 'number' ? p.spot : ''} placeholder={typeof p.spot === 'string' ? p.spot : ''} onChange={(e) => setCampo(i, 'spot', e.target.value)} style={{ width: 64 }} /></label>
            )}
            <label className="hint">piso <input type="number" value={typeof p.piso === 'number' ? p.piso : ''} placeholder={typeof p.piso === 'string' ? p.piso : ''} onChange={(e) => setCampo(i, 'piso', e.target.value)} style={{ width: 64 }} /></label>
          </div>
        ))}
      </div>
    </div>
  )
}

// ORDEM = FREQUÊNCIA DE USO, não a ordem em que as coisas foram construídas. Render primeiro
// porque é onde se passa a maior parte do tempo (ver o vídeo, ajustar, ver de novo); roteiro e
// palco vêm depois, e o JSON fica por último por ser a saída crua.
// ELENCO DO VÍDEO: quem aparece no roteiro, com a ficha a um clique.
//
// A ficha é o MESMO componente da galeria de Personagens (FichaModal), não uma cópia: é dela que
// saem o model sheet, as folhas de animação e o que ainda falta. Duplicar a tela aqui significaria
// que a próxima melhoria na ficha valeria só num dos dois lugares.
function ElencoDoVideo({ video }) {
  const { dados, existing, bust } = useStudio()
  const [aberto, setAberto] = useState(null)
  const personagens = dados.personagens || []

  // ordem de ENTRADA no roteiro, não alfabética: é assim que se lê um elenco, e põe o protagonista
  // perto do topo sem ninguém precisar declarar quem é
  const slugs = []
  for (const sh of (video.roteiro || [])) {
    for (const p of (sh.personagens || [])) if (p.slug && !slugs.includes(p.slug)) slugs.push(p.slug)
  }
  const cenasDe = (slug) => (video.roteiro || []).reduce((n, sh) =>
    n + ((sh.personagens || []).some((p) => p.slug === slug) ? 1 : 0), 0)

  if (!slugs.length) return <p className="hint">o roteiro ainda não tem personagem nenhum.</p>

  return (
    <div>
      <p className="hint">
        Quem atua neste vídeo, na ordem em que entra. Clique para abrir a ficha, que é onde estão o
        model sheet, as folhas de animação e o que ainda falta gerar.
      </p>
      <div className="cast-grid">
        {slugs.map((slug) => {
          const p = personagens.find((x) => x.id === slug)
          const n = cenasDe(slug)
          // SLUG SEM FICHA aparece assim mesmo, e é informação: o roteiro está pedindo um
          // personagem que não existe no acervo, e o render vai reprovar por isso.
          if (!p) return (
            <div key={slug} className="cast-item cast-orfao" title="este slug não existe no acervo">
              <div className="cast-face cast-face-vazia">?</div>
              <strong>{slug}</strong>
              <span className="hint">não existe no acervo</span>
            </div>
          )
          return (
            <button key={slug} type="button" className="cast-item" onClick={() => setAberto(p)}>
              <div className="cast-face">
                <img src={'/files/' + p.imagem + (bust ? '?v=' + bust : '')} alt={p.nome || slug}
                  onError={(e) => { e.currentTarget.style.visibility = 'hidden' }} />
              </div>
              <strong>{p.nome || slug}</strong>
              <span className="hint">{n} cena{n > 1 ? 's' : ''}</span>
            </button>
          )
        })}
      </div>
      {aberto && (
        <FichaModal
          p={aberto}
          pi={personagens.findIndex((x) => x.id === aberto.id)}
          onFechar={() => setAberto(null)}
        />
      )}
    </div>
  )
}

const ABAS = [
  // Render segue em primeiro porque é o fallback de aba (ABAS[0]) e abrir um vídeo pronto tem que
  // continuar caindo no vídeo. O Animatic vem logo depois: no FLUXO ele é anterior ao render.
  { id: 'render', icon: 'video', label: 'Render' },
  { id: 'animatic', icon: 'montar', label: 'Animatic' },
  { id: 'elenco', icon: 'personagens', label: 'Assets' },
  // ELENCO é quem ATUA no vídeo; a aba acima, apesar do id, lista os ARQUIVOS. Saber de quem o
  // vídeo depende exigia abrir o JSON e ler os slugs shot a shot.
  { id: 'cast', icon: 'personagens', label: 'Elenco' },
  { id: 'publicar', icon: 'publicar', label: 'Publicar' },
  { id: 'baixar', icon: 'baixar', label: 'Baixar' },
  { id: 'roteiro', icon: 'quadrinhos', label: 'Roteiro' },
  { id: 'palco', icon: 'personagens', label: 'Palco' },
  { id: 'cenario', icon: 'estilos', label: 'Cenário' },
  { id: 'json', icon: 'montar', label: 'JSON' },
]

// VÍDEO: revisar o roteiro/assets, renderizar (Remotion + áudio) e publicar/baixar.
export default function VideoView({ videoId, sub }) {
  const { dados, update, bust, nav, marcarGerado } = useStudio()
  const videos = dados.videos || []
  const vi = videos.findIndex((v) => v.id === videoId)
  const v = videos[vi]
  const byId = Object.fromEntries((dados.personagens || []).map((p) => [p.id, p]))
  const [render, setRender] = useState({ rodando: false, erro: null })
  const [revV, setRevV] = useState(0)
  const [valid, setValid] = useState(null)
  const [validando, setValidando] = useState(false)
  const [assets, setAssets] = useState(null)
  useEffect(() => { getVideoAssets(videoId).then(setAssets).catch(() => setAssets({ kf: [] })) }, [videoId])
  // valida ao abrir a aba Render (pré-render, sem custo de render)
  useEffect(() => {
    if (sub !== 'render') return
    setValidando(true)
    validarVideo(videoId).then(setValid).catch(() => setValid(null)).finally(() => setValidando(false))
  }, [videoId, sub])
  if (!v) return <div className="hint intro">Vídeo não encontrado.</div>
  const aba = ABAS.find((a) => a.id === sub) || ABAS[0]
  const finalPath = `videos/${v.id}/final.mp4`
  const bustQ = bust ? '?v=' + bust : ''

  async function validar() {
    setValidando(true)
    try { setValid(await validarVideo(v.id)) } catch { setValid(null) } finally { setValidando(false) }
  }

  async function renderizar() {
    setRender({ rodando: true, erro: null })
    try {
      await renderVideo(v.id)
      marcarGerado?.(finalPath)
      setRevV(Date.now())
      setValid({ ok: true, erros: [], avisos: valid?.avisos || [] })
      setRender({ rodando: false, erro: null })
    } catch (e) {
      // gate de validação (422): traz a lista de erros pra tela
      if (e.body?.erros) setValid({ ok: false, erros: e.body.erros, avisos: e.body.avisos || [] })
      setRender({ rodando: false, erro: e.body?.erros ? 'validação barrou o render (veja abaixo)' : e.message })
    }
  }

  const setPub = (campo, val) => update((n) => {
    n.videos[vi].publicacao = { ...(n.videos[vi].publicacao || {}), [campo]: val }
  })

  return (
    <div>
      {/* ficha resumo */}
      <div className="panel">
        <div className="section-head">
          <h3 className="section-title">{v.titulo}</h3>
          <div className="row-actions">
            <span className="chip">{v.status || 'roteiro'}</span>
            <span className="selo">{v.selo || v.tipo || 'animação'}</span>
            <span className="chip">{v.formato}</span>
          </div>
        </div>
        {v.contexto && <p className="hint">{v.contexto}</p>}
      </div>

      <div className="subtabs" role="tablist">
        {ABAS.map((a) => (
          <button key={a.id} role="tab" aria-selected={a.id === aba.id}
            className={'subtab' + (a.id === aba.id ? ' active' : '')}
            onClick={() => nav.video(v.id, a.id)}>
            <Icon name={a.icon} size={14} />{a.label}
          </button>
        ))}
      </div>

      {aba.id === 'roteiro' && (
        <div className="panel">
          {v.gancho && <p className="hint">Gancho de abertura: <b>{v.gancho}</b></p>}
          <table className="tabela">
            <thead><tr><th>#</th><th>Personagem</th><th>Ação</th><th>Resultado</th></tr></thead>
            <tbody>
              {(v.roteiro || []).map((r, i) => {
                const real = byId[r.personagem]?.nome || r.personagem
                const acao = r.nome || (r.selecao ? `veste ${r.selecao}` : r.acao || '')
                const res = r.veredito
                  ? (r.veredito === 'yes' ? (v.vereditos?.yes || 'SIM') : (v.vereditos?.no || 'NÃO'))
                  : (r.lesao ? `lesão: ${r.lesao}` : '')
                return (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{real}</td>
                    <td>{acao}</td>
                    <td>{r.veredito
                      ? <span className={'chip ' + (r.veredito === 'yes' ? 'chip-ok' : '')}>{res}</span>
                      : res}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {v.fecho?.fala && (
            <p className="hint">Fecho: <b>{byId[v.fecho.personagem]?.nome || v.fecho.personagem || 'close'}</b> · "{v.fecho.fala}"{v.fecho.board ? ` + quadro ${v.fecho.board}` : ''}.</p>
          )}
          <div className="hint">Editar o roteiro pela interface vem na próxima fase; hoje o arquivo é <FilePath path={`data/videos/${v.id}.json`} />.</div>
        </div>
      )}

      {aba.id === 'cast' && <ElencoDoVideo video={v} />}

      {aba.id === 'elenco' && (() => {
        const kf = assets?.kf || []
        // agrupa TODOS os sprites de kf/ por personagem (1º token do nome) — nada fica escondido
        const grupos = {}
        for (const s of kf) { const g = s.nome.split('-')[0]; (grupos[g] ||= []).push(s) }
        // detecta ciclos de animação dentro de um grupo (andar w1..w4, andar← wL1.., correr r1.., pares -a/-b)
        const detectaCiclos = (sprites) => {
          const byName = Object.fromEntries(sprites.map((s) => [s.nome, s]))
          const ciclos = []
          const seq = (re, label) => {
            const buckets = {}
            for (const s of sprites) { const m = s.nome.match(re); if (m) { const k = s.nome.slice(0, m.index); (buckets[k] ||= []).push({ s, n: +m[1] }) } }
            for (const arr of Object.values(buckets)) if (arr.length >= 2) { arr.sort((a, b) => a.n - b.n); ciclos.push({ label, frames: arr.map((x) => x.s) }) }
          }
          // CICLO = qualquer sufixo "<nome><N>", não só os três que existiam quando esta tela foi
          // escrita. A folha de IDLE (-i#) e as folhas de AÇÃO (-comemorar1..9, até 16 quadros)
          // nasceram depois e ficavam invisíveis aqui: o personagem aparecia com 17 sprites e "1
          // animação", como se só soubesse correr. Rótulo bonito pros três de sistema, o nome do
          // gesto pro resto.
          const ROTULO = { w: 'andar →', wL: 'andar ←', r: 'correr', i: 'idle (respiração)' }
          const buckets = {}
          for (const s of sprites) {
            const m = s.nome.match(/^(.*?)(\d{1,2})$/)
            if (!m) continue
            const stem = m[1].replace(/-$/, '')
            const sufixo = stem.slice(stem.lastIndexOf('-') + 1)
            ;(buckets[stem] ||= { sufixo, arr: [] }).arr.push({ s, n: +m[2] })
          }
          for (const { sufixo, arr } of Object.values(buckets)) {
            if (arr.length < 2) continue
            arr.sort((a, b) => a.n - b.n)
            ciclos.push({ label: `${ROTULO[sufixo] || sufixo} · ${arr.length}q`, frames: arr.map((x) => x.s) })
          }
          for (const s of sprites) if (s.nome.endsWith('-b')) { const stem = s.nome.slice(0, -2); const a = byName[stem + '-a'] || byName[stem]; if (a && a.nome !== s.nome) ciclos.push({ label: stem.split('-').slice(1).join('-') || 'ciclo', frames: [a, s] }) }
          return ciclos
        }
        const totalSprites = kf.length
        const cenarios = assets?.cenarios || []
        const animacoes = assets?.animacoes || []
        return (
          <div className="panel">
            <div className="hint">Tudo que compõe o vídeo: {cenarios.length} cenário(s){animacoes.length ? `, ${animacoes.length} animação(ões) Grok` : ''} e {totalSprites} sprites. <b>▶</b> = animação. Pasta: <FilePath path={`videos/${v.id}/`} /></div>
            {!assets && <p className="hint">Carregando assets…</p>}
            {/* CENÁRIOS */}
            {cenarios.length > 0 && (
              <div className="video-elenco-char">
                <div className="video-elenco-head"><div><b>Cenários</b> <span className="hint">{cenarios.length}</span></div></div>
                <div className="video-sprites">
                  {cenarios.map((c) => (
                    <figure className="video-sprite" key={c.arquivo} title={c.nome} style={{ width: 200 }}>
                      {c.ext === 'mp4'
                        ? <video src={'/files/' + c.arquivo + bustQ} muted loop autoPlay playsInline style={{ width: '100%' }} />
                        : <img src={'/files/' + c.arquivo + bustQ} alt={c.nome} />}
                      <figcaption>{c.nome}{c.ext === 'mp4' ? ' (anim)' : ''}</figcaption>
                    </figure>
                  ))}
                </div>
              </div>
            )}
            {/* ANIMAÇÕES transparentes (Grok/webm) */}
            {animacoes.length > 0 && (
              <div className="video-elenco-char">
                <div className="video-elenco-head"><div><b>Animações (Grok)</b> <span className="hint">webm transparente · {animacoes.length}</span></div></div>
                <div className="video-sprites">
                  {animacoes.map((a) => (
                    <figure className="video-sprite video-sprite-preview" key={a.arquivo} title={a.nome}>
                      <video src={'/files/' + a.arquivo + bustQ} muted loop autoPlay playsInline style={{ width: '100%' }} />
                      <figcaption>▶ {a.nome}</figcaption>
                    </figure>
                  ))}
                </div>
              </div>
            )}
            {/* TRILHA */}
            {v.trilha?.arquivo && !v.semAudio && (
              <div className="hint" style={{ marginBottom: 8 }}>🎵 Trilha: <FilePath path={v.trilha.arquivo} /></div>
            )}
            {v.semAudio && <div className="hint" style={{ marginBottom: 8 }}>🔇 Vídeo mudo (semAudio)</div>}
            {assets && !totalSprites && <p className="hint">Nenhum sprite em kf/.</p>}
            {Object.keys(grupos).sort().map((g) => {
              const sprites = grupos[g].slice().sort((a, b) => a.nome.localeCompare(b.nome))
              const ciclos = detectaCiclos(sprites)
              return (
                <div className="video-elenco-char" key={g}>
                  <div className="video-elenco-head">
                    <img className="video-elenco-base" src={`/files/personagens/${g}-riso.png${bustQ}`} alt=""
                      onError={(e) => { e.currentTarget.style.display = 'none' }} />
                    <div>
                      <b>{byId[g + '-riso']?.nome || g}</b>
                      <div><span className="hint">{sprites.length} sprites{ciclos.length ? ` · ${ciclos.length} animação(ões)` : ''}</span></div>
                    </div>
                  </div>
                  {ciclos.length > 0 && (
                    <div className="video-sprites">
                      {ciclos.map((c, i) => <SpritePreview key={i} sprites={c.frames} bust={bust} label={c.label} fps={c.label === 'correr' ? 10 : 8} />)}
                    </div>
                  )}
                  <div className="video-sprites">
                    {sprites.map((s) => (
                      <figure className="video-sprite" key={s.nome} title={s.nome}>
                        <img src={'/files/' + s.arquivo + bustQ} alt={s.nome} />
                        <figcaption>{s.nome}</figcaption>
                      </figure>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )
      })()}

      {aba.id === 'cenario' && (
        <div className="panel">
          <p className="hint">Cenário: arte parada + versão animada no Grok (loop). Movimento: {v.cenario?.movimento}</p>
          <div className="video-cenario-grid">
            <figure>
              <img src={'/files/' + v.cenario?.base + bustQ} alt="cenário base" style={{ maxWidth: '100%', borderRadius: 8 }} />
              <figcaption className="hint"><FilePath path={v.cenario?.base} /></figcaption>
            </figure>
            {v.cenario?.anim
              ? (
                <figure>
                  <video src={'/files/' + v.cenario.anim + bustQ} muted loop autoPlay playsInline style={{ maxWidth: '100%', borderRadius: 8 }} />
                  <figcaption className="hint"><FilePath path={v.cenario.anim} /></figcaption>
                </figure>
              )
              : <p className="hint">Cenário animado ainda não gerado (Grok + boomerang).</p>}
          </div>
        </div>
      )}

      {aba.id === 'palco' && (
        <div className="panel">
          <Palco videoId={v.id} video={v} vi={vi} update={update} />
        </div>
      )}

      {aba.id === 'animatic' && (
        <div className="panel">
          <Animatic id={v.id} />
        </div>
      )}

      {aba.id === 'render' && (
        <div className="panel">
          <p className="hint">Monta a cena a partir do roteiro, renderiza no Remotion e mixa trilha + SFX. Pode levar ~2 min.</p>
          <div className="row-actions">
            <button className="btn btn-primary" onClick={renderizar} disabled={render.rodando}>
              <Icon name="video" size={13} /> {render.rodando ? 'Renderizando…' : 'Renderizar vídeo'}
            </button>
            <button className="btn" onClick={validar} disabled={validando}>
              <Icon name="quadrinhos" size={13} /> {validando ? 'Validando…' : 'Validar'}
            </button>
            {render.erro && <span className="hint erro">Erro: {render.erro}</span>}
          </div>
          <ValidacaoBox valid={valid} validando={validando} />
          <div style={{ marginTop: 16, maxWidth: 420 }}>
            <video key={bust} src={'/files/' + finalPath + bustQ} controls playsInline style={{ width: '100%', borderRadius: 10, background: '#000' }} />
            <div className="hint"><FilePath path={finalPath} /></div>
          </div>
          <FolhaRevisao id={v.id} v={revV} />
        </div>
      )}

      {aba.id === 'publicar' && (
        <div className="panel">
          <PromptBlock label="Título do post" tool="gancho curto · 3 a 7 palavras"
            value={v.publicacao?.titulo || ''} onChange={(x) => setPub('titulo', x)}
            hint="Uma linha que prende sem entregar a piada. Cabe 1 emoji." />
          <PromptBlock label="Descrição do post" tool="gancho + contexto + CTA + hashtags"
            value={v.publicacao?.legenda || ''} onChange={(x) => setPub('legenda', x)}
            hint="Impacto + take + CTA + hashtags no fim. Use o nome real do jogador na descrição (Bastoni, Gordon...)." />

          <div className="video-redes">
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
                  value={v.publicacao?.[r.k] || ''} onChange={(e) => setPub(r.k, e.target.value)} />
              </label>
            ))}
          </div>

          <label className="video-rede-linha" style={{ marginTop: 10 }}>
            <span className="video-rede-label">Postado?</span>
            <input type="checkbox" checked={!!v.postado}
              onChange={(e) => update((n) => { n.videos[vi].postado = e.target.checked })} />
          </label>

          <div className="quad-export" style={{ marginTop: 14 }}>
            <a className="btn btn-primary" href={'/files/' + finalPath + bustQ} download={`${v.id}.mp4`}>
              <Icon name="baixar" size={13} /> Baixar MP4
            </a>
            <CopyButton text={finalPath} label="copiar caminho do MP4" />
          </div>
        </div>
      )}

      {aba.id === 'baixar' && (
        /* baixa vídeo de referência (TikTok) direto pra pasta deste vídeo */
        <Baixar videoId={v.id} />
      )}

      {aba.id === 'json' && (
        <div className="panel">
          <div className="section-head">
            <h3 className="section-title">JSON do vídeo</h3>
            <CopyButton text={JSON.stringify(v, null, 2)} label="copiar JSON" />
          </div>
          <div className="hint">É o dado que o motor lê pra montar a cena (roteiro, elenco, cenário, trilha). Arquivo: <FilePath path={`data/videos/${v.id}.json`} /></div>
          <pre className="video-json">{JSON.stringify(v, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}
