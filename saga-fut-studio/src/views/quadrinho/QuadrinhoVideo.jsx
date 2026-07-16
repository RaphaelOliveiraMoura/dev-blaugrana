import React, { useEffect, useState } from 'react'
import { FilePath, Icon, Media, Recolhivel } from '../../components/index.js'
import { painelVideo, quadrinhoVideo } from '../../../shared/caminhos.mjs'
import { VIDEO_SEGUNDOS_PADRAO } from '../../../shared/constantes.mjs'
import { montarVideoQuadrinho } from '../../api/render.js'
import { getMusicas, salvarInicioMusica } from '../../api/musicas.js'
import { useStudio } from '../../app/StudioContext.jsx'

// O quadrinho virando post.
//
// O feed não aceita imagem: o que sobe é vídeo. Então a arte parada segura alguns
// segundos em 9:16 e a música entra por baixo, que é o formato de post de imagem
// parada. A arte não muda em nenhum frame; quem carrega o post é o som e a legenda.
//
// Dois vídeos, porque são dois posts: o do quadrinho inteiro (os painéis em
// sequência, com o corte onde a piada vira) e o de um painel só (o quadro que se
// sustenta sozinho). Os ajustes são um par só e valem para os dois: escolher o
// tempo duas vezes seria escolher errado uma delas.
export function QuadrinhoVideo({ quad, qi }) {
  const { update, existing, bust, marcarGerado } = useStudio()
  const [musicas, setMusicas] = useState([])
  const [inicios, setInicios] = useState({})
  const [rend, setRend] = useState(null) // 'todos' ou o número do painel em render
  const [msg, setMsg] = useState(null)
  const [err, setErr] = useState(null)
  const [preview, setPreview] = useState('')
  const [vendo, setVendo] = useState(quadrinhoVideo(quad.id))
  // uma seção de acabamento por vez: são ajustes de uma vez só, não a bancada
  const [secao, setSecao] = useState(null)
  const abre = (id) => ({ aberto: secao === id, onToggle: () => setSecao(secao === id ? null : id) })

  const seg = quad.videoSegundos ?? VIDEO_SEGUNDOS_PADRAO
  const musica = quad.videoMusica || ''
  const vol = quad.videoVol ?? 0.9
  const setQ = (campo, v) => update((n) => { n.quadrinhos[qi][campo] = v })

  useEffect(() => {
    getMusicas().then((d) => { setMusicas(d.musicas || []); setInicios(d.inicios || {}) }).catch(() => {})
  }, [])
  useEffect(() => { setVendo(quadrinhoVideo(quad.id)); setMsg(null); setErr(null) }, [quad.id])

  function onInicio(file, s) {
    const v = Math.max(0, Math.round(Number(s) || 0))
    setInicios((prev) => ({ ...prev, [file]: v }))
    salvarInicioMusica(file, v).catch(() => {})
  }

  // Montar não salva antes (o Gerar salva): o servidor só precisa dos PNGs, e tempo
  // e faixa vão no pedido. Dá pra experimentar duração sem gravar o quadrinho.
  async function montar(painelNumero) {
    setRend(painelNumero ?? 'todos'); setErr(null); setMsg(null)
    try {
      const r = await montarVideoQuadrinho({
        quadrinhoId: quad.id, painelNumero, segundos: seg, musica, musicaVol: vol,
      })
      marcarGerado(r.video)
      setVendo(r.video)
      setMsg(r.aviso ? `${r.segundos}s no total. ${r.aviso}.` : `Vídeo de ${r.segundos}s pronto.`)
    } catch (e) { setErr(e.message) } finally { setRend(null) }
  }

  const comArte = quad.paineis.filter((p) => existing[p.imagem])
  const total = seg * (comArte.length || 1)

  return (
    <div className="previa-player">
      <div className="phone">
        <Media existing={existing} src={vendo} kind="video" bust={bust} />
      </div>

      <div className="previa-side">
        <div className="panel">
          <h3>Vídeo pro TikTok</h3>
          <p className="hint">
            A arte parada vira vídeo 9:16: ela inteira no centro, e a faixa que sobra é ela mesma borrada, porque
            barra preta entrega print de imagem. Postado o vídeo, o som e a legenda é que fazem o alcance.
          </p>

          {/* a ação vem antes das opções: monta-se muitas vezes, ajusta-se uma */}
          <button className="btn btn-primary mt-4" onClick={() => montar()} disabled={!!rend || !comArte.length}>
            {rend === 'todos' ? <span className="gen-spinner" /> : <Icon name="video" size={14} />}
            {rend === 'todos'
              ? 'Montando…'
              : comArte.length > 1 ? `Montar o quadrinho inteiro (${comArte.length} painéis, ${total}s)` : `Montar vídeo (${seg}s)`}
          </button>

          {!comArte.length && <p className="hint mt-2">Nenhum painel com arte ainda: gere a arte antes.</p>}
          {msg && <p className="render-msg ok mt-2"><Icon name="check" size={13} /> {msg}</p>}
          {err && <p className="render-msg no mt-2"><Icon name="alerta" size={13} /> {err}</p>}
          {existing[vendo] && <div className="mt-2"><FilePath path={vendo} /></div>}

          {comArte.length > 1 && (
            <>
              <p className="hint mt-4">Ou um painel só, para postar o quadro que se sustenta sozinho:</p>
              <div className="video-paineis">
                {comArte.map((p) => {
                  const vid = painelVideo(quad.id, p.numero)
                  return (
                    <div className="video-painel-row" key={p.numero}>
                      <span className="trilha-cena">Painel {p.numero}</span>
                      <button className="btn btn-sm" onClick={() => montar(p.numero)} disabled={!!rend}>
                        {rend === p.numero ? <span className="gen-spinner" /> : <Icon name="video" size={12} />}
                        {existing[vid] ? 'Remontar' : `Montar ${seg}s`}
                      </button>
                      {existing[vid] && (
                        <button className="btn btn-ghost btn-icon btn-sm" title="Ver este vídeo" onClick={() => setVendo(vid)}>
                          <Icon name="previa" size={11} />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>

        <div className="section-head"><h3 className="section-title">Acabamento</h3></div>

        <Recolhivel titulo="Tempo na tela" nota={`${seg}s por painel`} {...abre('tempo')}>
          <div className="video-tempo">
            <input
              className="field trilha-inicio" type="number" min="2" max="60" step="1" value={seg}
              onChange={(e) => setQ('videoSegundos', Math.min(60, Math.max(2, Math.round(Number(e.target.value) || VIDEO_SEGUNDOS_PADRAO))))}
            />
            <span className="hint">segundos que cada arte segura</span>
          </div>
          <p className="hint mt-2">
            Padrão {VIDEO_SEGUNDOS_PADRAO}s: dá pra ler a piada e ainda sobra replay, que o TikTok conta como
            retenção. Piada de uma sacada só pede menos; painel com texto pede mais.
          </p>
        </Recolhivel>

        <Recolhivel titulo="Trilha" nota={musica ? musica.replace(/\.[^.]+$/, '') : 'sem trilha'} {...abre('trilha')}>
          {musicas.length === 0
            ? <p className="hint">Nenhuma trilha em saga-fut/assets/musica/ ainda. Baixe MP3 livres de uso lá (ver TRILHAS.md).</p>
            : (
              <>
                <div className="trilha-row">
                  <select className="field" value={musica} onChange={(e) => setQ('videoMusica', e.target.value)}>
                    <option value="">sem trilha (som escolhido no TikTok)</option>
                    {musicas.map((m) => <option key={m} value={m}>{m.replace(/\.[^.]+$/, '')}</option>)}
                  </select>
                  {musica && (
                    <>
                      <input
                        className="field trilha-inicio" type="number" min="0" step="1" value={inicios[musica] ?? 0}
                        title="Segundo em que a faixa começa a tocar (pula a intro). Vale pra ela em todo lugar."
                        onChange={(e) => onInicio(musica, e.target.value)}
                      />
                      <button
                        className="btn btn-icon btn-sm" title="Ouvir a partir do início escolhido"
                        onClick={() => setPreview('/files/assets/musica/' + encodeURIComponent(musica) + '#t=' + (inicios[musica] ?? 0))}
                      >
                        <Icon name="previa" size={11} />
                      </button>
                    </>
                  )}
                </div>

                {preview && <audio controls src={preview} autoPlay className="field mt-2" />}

                {musica && (
                  <div className="trilha-vol">
                    <span className="hint">Volume</span>
                    <input type="range" min="0.2" max="1" step="0.05" value={vol}
                      onChange={(e) => setQ('videoVol', Number(e.target.value))} />
                    <span className="trilha-vol-val">{Math.round(vol * 100)}%</span>
                  </div>
                )}

                <p className="hint mt-2">
                  Aqui a música é o áudio inteiro, então ela vai alta: não tem narração por baixo pra proteger. Sem
                  trilha o vídeo sai mudo de propósito, e você escolhe um som em alta no próprio TikTok, que costuma
                  dar mais alcance do que faixa livre.
                </p>
              </>
            )}
        </Recolhivel>
      </div>
    </div>
  )
}
