import React, { useEffect, useState } from 'react'
import { FilePath, Icon, Media } from '../../components/index.js'
import { quadrinhoAnimado } from '../../../shared/caminhos.mjs'
import { animarQuadrinho } from '../../api/render.js'
import { getMusicas } from '../../api/musicas.js'
import { useStudio } from '../../app/StudioContext.jsx'

// As transições oferecidas, e quando cada uma brilha. A escolha é do usuário porque
// depende da RELAÇÃO entre os painéis, que só quem escreveu a piada sabe de fato.
const TRANSICOES = [
  { id: 'dissolve', label: 'Dissolve', dica: 'o painel se dissolve no próximo; ótimo pra quadrinhos-espelho (mesma câmera, muda o redor)' },
  { id: 'slide', label: 'Slide', dica: 'o próximo painel entra empurrando, tipo virar página; bom pra beats distintos' },
]

// O quadrinho ANIMADO: os personagens se mexem.
//
// Cada painel vira um clipe animado no Grok (movimento contido, que segura o traço) e
// os clipes se juntam em 9:16 com a transição escolhida. É lento (passa pelo Grok, um
// clipe por painel), então roda com aviso e trava de duplo clique. Trocar a transição
// depois é rápido: reaproveita os clipes e só remonta.
export function QuadrinhoAnimar({ quad, qi }) {
  const { update, existing, bust, marcarGerado } = useStudio()
  const [rodando, setRodando] = useState(false)
  const [msg, setMsg] = useState(null)
  const [err, setErr] = useState(null)
  const [vendo, setVendo] = useState(quadrinhoAnimado(quad.id))
  const [musicas, setMusicas] = useState([])
  const [inicios, setInicios] = useState({})
  const [preview, setPreview] = useState('')

  const transicao = quad.animTransicao || 'dissolve'
  const setTransicao = (v) => update((n) => { n.quadrinhos[qi].animTransicao = v })
  const musica = quad.animMusica || ''
  const vol = quad.animVol ?? 0.7
  const soMusica = quad.animSoMusica || false
  const setQ = (campo, v) => update((n) => { n.quadrinhos[qi][campo] = v })

  useEffect(() => { setVendo(quadrinhoAnimado(quad.id)); setMsg(null); setErr(null) }, [quad.id])
  useEffect(() => {
    getMusicas().then((d) => { setMusicas(d.musicas || []); setInicios(d.inicios || {}) }).catch(() => {})
  }, [])

  const comArte = quad.paineis.filter((p) => existing[p.imagem])
  const jaAnimado = existing[vendo]

  async function animar(forcar) {
    setRodando(true); setErr(null); setMsg(null)
    try {
      const r = await animarQuadrinho({ quadrinhoId: quad.id, transicao, musica, musicaVol: vol, soMusica, forcar })
      marcarGerado(r.video)
      setVendo(r.video)
      const trilha = r.musica ? `, trilha ${r.musica.replace(/\.[^.]+$/, '')}` : ''
      setMsg(`Animação pronta (${r.paineis.length} painéis, transição ${r.transicao}${trilha}).`)
    } catch (e) { setErr(e.message) } finally { setRodando(false) }
  }

  return (
    <div className="previa-player">
      <div className="phone">
        <Media existing={existing} src={vendo} kind="video" bust={bust} />
      </div>

      <div className="previa-side">
        <div className="panel">
          <h3>Quadrinho animado</h3>
          <p className="hint">
            Aqui os personagens se mexem: cada painel vira um clipe animado (Grok Imagine, na sua assinatura
            SuperGrok) e eles se juntam em 9:16 com uma transição. Diferente do vídeo da aba anterior, que é a
            arte parada segurando alguns segundos.
          </p>

          {comArte.length < 2 && (
            <p className="hint mt-2">
              <Icon name="alerta" size={13} /> Precisa de pelo menos 2 painéis com arte pra ter transição. Gere as artes primeiro.
            </p>
          )}

          {/* a transição é a escolha central: vem antes do botão */}
          <div className="anim-transicoes mt-4">
            <span className="label">Transição entre os painéis</span>
            {TRANSICOES.map((t) => (
              <label key={t.id} className={'anim-transicao' + (transicao === t.id ? ' ativa' : '')}>
                <input
                  type="radio" name="transicao" value={t.id}
                  checked={transicao === t.id}
                  onChange={() => setTransicao(t.id)}
                />
                <span className="anim-transicao-nome">{t.label}</span>
                <span className="anim-transicao-dica">{t.dica}</span>
              </label>
            ))}
          </div>

          {/* trilha de fundo: mesma biblioteca (saga-fut/assets/musica) da aba Vídeo.
              A música é mixada por cima do som nativo do Grok depois de animar. */}
          <div className="anim-trilha mt-4">
            <span className="label">Música de fundo</span>
            {musicas.length === 0
              ? <p className="hint">Nenhuma trilha em <code>saga-fut/assets/musica/</code> ainda. Solte os MP3 que você baixar nessa pasta e eles aparecem aqui.</p>
              : (
                <>
                  <div className="trilha-row">
                    <select className="field" value={musica} onChange={(e) => setQ('animMusica', e.target.value)}>
                      <option value="">sem trilha (só o som do Grok)</option>
                      {musicas.map((m) => <option key={m} value={m}>{m.replace(/\.[^.]+$/, '')}</option>)}
                    </select>
                    {musica && (
                      <button
                        className="btn btn-icon btn-sm" title="Ouvir a faixa antes de animar"
                        onClick={() => setPreview('/files/assets/musica/' + encodeURIComponent(musica) + '#t=' + (inicios[musica] ?? 0))}
                      >
                        <Icon name="previa" size={11} />
                      </button>
                    )}
                  </div>

                  {preview && <audio controls src={preview} autoPlay className="field mt-2" />}

                  {musica && (
                    <>
                      <label className="anim-somusica mt-2">
                        <input type="checkbox" checked={soMusica} onChange={(e) => setQ('animSoMusica', e.target.checked)} />
                        <span>Só a música (silencia o som do Grok)</span>
                      </label>
                      <div className="trilha-vol mt-2">
                        <span className="hint">Volume da {soMusica ? 'música' : 'trilha'}</span>
                        <input type="range" min="0.05" max="1" step="0.05" value={vol}
                          onChange={(e) => setQ('animVol', Number(e.target.value))} />
                        <span className="trilha-vol-val">{Math.round(vol * 100)}%</span>
                      </div>
                    </>
                  )}
                  <p className="hint mt-2">
                    {soMusica
                      ? 'A música vira o áudio inteiro, sem o som nativo do Grok.'
                      : 'A trilha entra por cima do som nativo do Grok (SFX/ambiência). Baixe o volume dela pra deixar o som da cena aparecer, ou suba pra virar o fundo dominante.'}
                  </p>
                </>
              )}
          </div>

          <button
            className="btn btn-primary mt-4"
            onClick={() => animar(false)}
            disabled={rodando || comArte.length < 2}
          >
            {rodando ? <span className="gen-spinner" /> : <Icon name="montar" size={14} />}
            {rodando ? 'Animando…' : jaAnimado ? 'Remontar com esta transição' : `Animar quadrinho (${comArte.length} painéis)`}
          </button>

          {jaAnimado && !rodando && (
            <button className="btn btn-sm mt-2" onClick={() => animar(true)} disabled={rodando} title="Regera os clipes no Grok do zero (mais lento)">
              <Icon name="gerar" size={12} /> Regerar animação (do zero)
            </button>
          )}

          {rodando && (
            <p className="hint mt-2">
              Passa pelo Grok, um clipe por painel (~1min cada): pode levar alguns minutos. Trocar só a transição
              depois é rápido, reaproveita os clipes.
            </p>
          )}
          {msg && <p className="render-msg ok mt-2"><Icon name="check" size={13} /> {msg}</p>}
          {err && <p className="render-msg no mt-2"><Icon name="alerta" size={13} /> {err}</p>}
          {jaAnimado && <div className="mt-2"><FilePath path={vendo} /></div>}
        </div>
      </div>
    </div>
  )
}
