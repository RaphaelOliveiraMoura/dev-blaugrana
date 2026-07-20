import React, { useEffect, useState } from 'react'
import { FilePath, Icon, Media } from '../../components/index.js'
import { quadrinhoAnimado } from '../../../shared/caminhos.mjs'
import { MOV_QUADRINHO_GROK, MOV_QUADRINHO_MICRO } from '../../../shared/anim-mov.mjs'
import { animarQuadrinho } from '../../api/render.js'
import { getMusicasQuadrinho } from '../../api/musicas.js'
import { useStudio } from '../../app/StudioContext.jsx'

// As transições oferecidas, e quando cada uma brilha. A escolha é do usuário porque
// depende da RELAÇÃO entre os painéis, que só quem escreveu a piada sabe de fato.
const TRANSICOES = [
  { id: 'dissolve', label: 'Dissolve', dica: 'o painel se dissolve no próximo; ótimo pra quadrinhos-espelho (mesma câmera, muda o redor)' },
  { id: 'slide', label: 'Slide', dica: 'o próximo painel entra empurrando, tipo virar página; bom pra beats distintos' },
]

// O quadrinho montado COM transição entre os painéis. Dois modos:
//   - Estático (padrão): a arte parada em 9:16, opcionalmente com um push-in de Ken
//     Burns. Instantâneo, on-model, de graça. Não passa pelo Grok.
//   - Grok: cada painel vira um clipe animado (os personagens se mexem). Lento (um
//     clipe por painel), roda com aviso e trava de duplo clique; risco de sair do model.
// Nos dois, os clipes se juntam com a transição escolhida. Trocar transição remonta
// rápido (no Grok, reaproveita os clipes já animados).
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
  // três modos num só seletor. Deriva do estado antigo (animComGrok/animMicro) pra não
  // perder a escolha de quadrinhos já configurados antes do campo unificado existir.
  const modo = quad.animModo || (quad.animComGrok ? (quad.animMicro ? 'micro' : 'grok') : 'estatico')
  const comGrok = modo !== 'estatico'                  // micro e grok passam pelo Grok
  const microAnim = modo === 'micro'                   // Grok com movimento mínimo, contido
  const kenBurns = quad.animKenBurns ?? true           // no estático, push-in sutil por padrão
  const segundos = quad.animSegundos ?? 4              // hold de cada painel no estático
  const setQ = (campo, v) => update((n) => { n.quadrinhos[qi][campo] = v })
  // instrução de movimento por painel (o que o Grok deve animar naquela cena)
  const setMov = (pi, v) => update((n) => { n.quadrinhos[qi].paineis[pi].animMovimento = v })

  useEffect(() => { setVendo(quadrinhoAnimado(quad.id)); setMsg(null); setErr(null) }, [quad.id])
  useEffect(() => {
    getMusicasQuadrinho().then((d) => { setMusicas(d.musicas || []); setInicios(d.inicios || {}) }).catch(() => {})
  }, [])

  const comArte = quad.paineis.filter((p) => existing[p.imagem])
  const jaAnimado = existing[vendo]

  async function animar(forcar) {
    setRodando(true); setErr(null); setMsg(null)
    try {
      // mapa { numero: instrução } só dos painéis com arte (os que viram clipe)
      const movimentos = Object.fromEntries(comArte.map((p) => [p.numero, p.animMovimento || '']))
      const r = await animarQuadrinho({ quadrinhoId: quad.id, transicao, musica, musicaVol: vol, soMusica, forcar, comGrok, microAnim, kenBurns, segundos, movimentos })
      marcarGerado(r.video)
      setVendo(r.video)
      const trilha = r.musica ? `, trilha ${r.musica.replace(/\.[^.]+$/, '')}` : ''
      const nome = r.modo === 'grok' ? 'Animação' : 'Vídeo'
      const n = r.paineis.length
      // com 1 painel não há transição: só faz sentido citá-la a partir de 2
      const partes = n === 1 ? '1 painel' : `${n} painéis, transição ${r.transicao}`
      setMsg(`${nome} pronto (${partes}${trilha}).`)
    } catch (e) { setErr(e.message) } finally { setRodando(false) }
  }

  return (
    <div className="previa-player">
      <div className="phone">
        <Media existing={existing} src={vendo} kind="video" bust={bust} />
      </div>

      <div className="previa-side">
        <div className="panel">
          <h3>Quadrinho em vídeo 9:16</h3>
          <p className="hint">
            {comArte.length >= 2
              ? 'Os painéis se juntam em 9:16 com uma transição. Escolha como cada painel se comporta: parado (rápido, de graça, on-model) ou animado de verdade no Grok (os personagens se mexem, mas é lento).'
              : 'A charge vira um vídeo 9:16 (um painel só, sem transição). Escolha se ela fica parada (rápido, de graça, on-model) ou animada de verdade no Grok (os personagens se mexem, mas é lento).'}
          </p>

          {/* o modo é a primeira escolha: define todo o resto (velocidade, custo, controles).
              três opções: estático (rápido/grátis) e dois graus de Grok (micro e animado). */}
          <div className="anim-transicoes mt-4">
            <span className="label">Modo</span>
            <label className={'anim-transicao' + (modo === 'estatico' ? ' ativa' : '')}>
              <input type="radio" name="modo" checked={modo === 'estatico'} onChange={() => setQ('animModo', 'estatico')} />
              <span className="anim-transicao-nome">Estático</span>
              <span className="anim-transicao-dica">{comArte.length >= 2 ? 'a arte parada, com transição entre os painéis; instantâneo e sem passar pelo Grok' : 'a arte parada em 9:16; instantâneo e sem passar pelo Grok'}</span>
            </label>
            <label className={'anim-transicao' + (modo === 'micro' ? ' ativa' : '')}>
              <input type="radio" name="modo" checked={modo === 'micro'} onChange={() => setQ('animModo', 'micro')} />
              <span className="anim-transicao-nome">Grok (microinteração)</span>
              <span className="anim-transicao-dica">movimento mínimo: os personagens se mexem pouco, sem sair do lugar, e o cenário respira; segura o traço, sem áudio</span>
            </label>
            <label className={'anim-transicao' + (modo === 'grok' ? ' ativa' : '')}>
              <input type="radio" name="modo" checked={modo === 'grok'} onChange={() => setQ('animModo', 'grok')} />
              <span className="anim-transicao-nome">Grok (animado)</span>
              <span className="anim-transicao-dica">os personagens se mexem de verdade; um clipe por painel (~1min cada), maior risco de sair do traço</span>
            </label>
          </div>

          {/* só nos modos Grok: descrever o que deve se mexer em cada painel.
              micro = só isso vai pro Grok (sem base). animado = isso vira o foco por cima da base. */}
          {comGrok && comArte.length > 0 && (
            <div className="anim-trilha mt-4">
              <span className="label">
                O que animar em cada painel <span className="hint">(opcional)</span>
              </span>
              <p className="hint mt-1">
                {microAnim
                  ? 'A base do micro já cuida das regras (sem áudio nem fala, sem zoom, movimento pequeno). Aqui você descreve o movimentinho específico que quer (ex.: "coça a cabeça sem graça; a bandeira do fundo balança"). Em branco, usa só a base.'
                  : 'Descreva a ação que você quer ver (ex.: "os jogadores em volta erguem os braços saudando o rei"). Vira o foco por cima da base do modo. Em branco, usa só a base.'}
              </p>
              {quad.paineis.map((p, pi) => existing[p.imagem] && (
                <div key={p.numero} className="mt-2">
                  <span className="hint">{comArte.length > 1 ? `Painel ${p.numero}` : 'Movimento desejado'}</span>
                  <textarea
                    className="field mt-1" rows={2}
                    placeholder="ex.: o rei acena devagar; os de trás batem palma no ritmo"
                    value={p.animMovimento || ''}
                    onChange={(e) => setMov(pi, e.target.value)}
                  />
                </div>
              ))}
            </div>
          )}

          {/* nos dois modos Grok: a base FIXA que sempre acompanha o clipe (read-only). */}
          {comGrok && (
            <details className="anim-trilha mt-4">
              <summary className="label" style={{ cursor: 'pointer' }}>
                Prompt base {microAnim ? 'da microinteração' : 'do modo animado'} <span className="hint">(fixo, sempre enviado ao Grok)</span>
              </summary>
              <p className="hint mt-2">
                {microAnim
                  ? 'Segura o micro: cenário + movimentos pequenos, sem áudio/fala, sem zoom, câmera travada, traço 2D on-model. Some ao que você escrever acima. Não editável aqui.'
                  : 'Segura o traço (2D flat, on-model, câmera travada) enquanto os personagens se mexem. Some ao que você escrever acima. Não editável aqui.'}
              </p>
              <textarea className="field mt-2" rows={6} readOnly value={microAnim ? MOV_QUADRINHO_MICRO : MOV_QUADRINHO_GROK} />
            </details>
          )}

          {/* controles só do estático: push-in e quanto cada painel segura */}
          {modo === 'estatico' && (
            <div className="anim-trilha mt-4">
              <label className="anim-somusica">
                <input type="checkbox" checked={kenBurns} onChange={(e) => setQ('animKenBurns', e.target.checked)} />
                <span>Ken Burns (push-in sutil na arte)</span>
              </label>
              <p className="hint mt-2">
                {kenBurns
                  ? 'Um zoom lento no painel dá sensação de vivo sem passar pelo Grok. Desligue pra deixar 100% congelado.'
                  : 'Painel 100% parado, só a transição se mexe. Ligue o Ken Burns pra um leve push-in.'}
              </p>
              <div className="trilha-vol mt-2">
                <span className="hint">Cada painel segura</span>
                <input type="range" min="2" max="12" step="1" value={segundos}
                  onChange={(e) => setQ('animSegundos', Number(e.target.value))} />
                <span className="trilha-vol-val">{segundos}s</span>
              </div>
            </div>
          )}

          {comArte.length < 1 && (
            <p className="hint mt-2">
              <Icon name="alerta" size={13} /> Nenhum painel com arte ainda. Gere as artes primeiro.
            </p>
          )}

          {/* a transição só existe com 2+ painéis; com 1 painel (charge) anima só ele */}
          {comArte.length >= 2 && (
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
          )}

          {/* trilha de fundo: mesma biblioteca (saga-fut/assets/musica) da aba Vídeo.
              No Grok, mixa por cima do som nativo; no estático, a trilha É o áudio. */}
          <div className="anim-trilha mt-4">
            <span className="label">Música de fundo</span>
            {musicas.length === 0
              ? <p className="hint">Nenhuma trilha em <code>saga-fut/assets/musica-quadrinhos/</code> ainda. Solte os MP3 que você baixar nessa pasta (separada das trilhas das sagas) e eles aparecem aqui.</p>
              : (
                <>
                  <div className="trilha-row">
                    <select className="field" value={musica} onChange={(e) => setQ('animMusica', e.target.value)}>
                      <option value="">{modo === 'grok' ? 'sem trilha (só o som do Grok)' : 'sem trilha (vídeo mudo)'}</option>
                      {musicas.map((m) => <option key={m} value={m}>{m.replace(/\.[^.]+$/, '')}</option>)}
                    </select>
                    {musica && (
                      <button
                        className="btn btn-icon btn-sm" title="Ouvir a faixa antes de animar"
                        onClick={() => setPreview('/files/assets/musica-quadrinhos/' + encodeURIComponent(musica) + '#t=' + (inicios[musica] ?? 0))}
                      >
                        <Icon name="previa" size={11} />
                      </button>
                    )}
                  </div>

                  {preview && <audio controls src={preview} autoPlay className="field mt-2" />}

                  {musica && (
                    <>
                      {/* "só a música" só faz sentido no animado (micro já sai mudo) */}
                      {modo === 'grok' && (
                        <label className="anim-somusica mt-2">
                          <input type="checkbox" checked={soMusica} onChange={(e) => setQ('animSoMusica', e.target.checked)} />
                          <span>Só a música (silencia o som do Grok)</span>
                        </label>
                      )}
                      <div className="trilha-vol mt-2">
                        <span className="hint">Volume da {modo === 'grok' && !soMusica ? 'trilha' : 'música'}</span>
                        <input type="range" min="0.05" max="1" step="0.05" value={vol}
                          onChange={(e) => setQ('animVol', Number(e.target.value))} />
                        <span className="trilha-vol-val">{Math.round(vol * 100)}%</span>
                      </div>
                    </>
                  )}
                  <p className="hint mt-2">
                    {modo !== 'grok'
                      ? 'A música é o áudio inteiro do vídeo (o clipe não tem som próprio).'
                      : soMusica
                        ? 'A música vira o áudio inteiro, sem o som nativo do Grok.'
                        : 'A trilha entra por cima do som nativo do Grok (SFX/ambiência). Baixe o volume dela pra deixar o som da cena aparecer, ou suba pra virar o fundo dominante.'}
                  </p>
                </>
              )}
          </div>

          <button
            className="btn btn-primary mt-4"
            onClick={() => animar(false)}
            disabled={rodando || comArte.length < 1}
          >
            {rodando ? <span className="gen-spinner" /> : <Icon name="montar" size={14} />}
            {rodando
              ? (comGrok ? 'Animando…' : 'Montando…')
              : jaAnimado ? (comArte.length >= 2 ? 'Remontar com esta transição' : 'Remontar')
              : (() => {
                  const n = comArte.length
                  const alvo = n === 1 ? '1 painel' : `${n} painéis`
                  return comGrok ? `Animar quadrinho (${alvo})` : `Montar vídeo (${alvo})`
                })()}
          </button>

          {comGrok && jaAnimado && !rodando && (
            <>
              <button className="btn btn-sm mt-2" onClick={() => animar(true)} disabled={rodando} title="Regera os clipes no Grok do zero (mais lento)">
                <Icon name="gerar" size={12} /> Regerar animação (do zero)
              </button>
              <p className="hint mt-2">
                Mudou o texto de movimento? Os clipes já animados são reaproveitados; use <strong>Regerar (do zero)</strong> pra aplicar a nova instrução.
              </p>
            </>
          )}

          {rodando && comGrok && (
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
