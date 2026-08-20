import React, { useEffect, useState } from 'react'
import { FilePath, Icon, Media, Recolhivel, TrilhaPicker } from '../../components/index.js'
import { painelVideo, quadrinhoVideo } from '../../../shared/caminhos.mjs'
import { VIDEO_SEGUNDOS_PADRAO } from '../../../shared/constantes.mjs'
import { ehRitmoDinamico, medirPaineis, ritmoDoQuadrinho, RITMOS, RITMO_PADRAO, somaTempos } from '../../../shared/ritmo-video.mjs'
import { montarVideoQuadrinho } from '../../api/render.js'
import { getMusicasQuadrinho, salvarInicioMusicaQuadrinho } from '../../api/musicas.js'
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
  const [fichas, setFichas] = useState({})
  const [tons, setTons] = useState({})
  const [pickTrilha, setPickTrilha] = useState(false)
  const [rend, setRend] = useState(null) // 'todos' ou o número do painel em render
  const [msg, setMsg] = useState(null)
  const [err, setErr] = useState(null)
  const [vendo, setVendo] = useState(quadrinhoVideo(quad.id))
  // uma seção de acabamento por vez: são ajustes de uma vez só, não a bancada
  const [secao, setSecao] = useState(null)
  const abre = (id) => ({ aberto: secao === id, onToggle: () => setSecao(secao === id ? null : id) })

  // Silenciar é opção DESTA montagem, não do quadrinho: mora no estado da tela, nasce desmarcada e
  // se perde ao trocar de quadrinho. Salvar isso significaria voltar semanas depois e montar mudo
  // sem lembrar por quê. O ritmo é o contrário: muda o post que vai ao ar, então fica salvo.
  const [semAudio, setSemAudio] = useState(false)

  const seg = quad.videoSegundos ?? VIDEO_SEGUNDOS_PADRAO
  // Sem campo no quadrinho, o ritmo é o Padrão de 17 CPS (shared/ritmo-video.mjs): a caixa abaixo
  // nasce MARCADA em peça nova e em tudo que ainda não foi postado. Desmarcar grava 'fixo'.
  const ritmo = ritmoDoQuadrinho(quad)
  const dinamico = ehRitmoDinamico(ritmo)
  const musica = quad.videoMusica || ''
  const fichaSel = musica ? fichas[musica] : null
  const vol = quad.videoVol ?? 0.9
  const setQ = (campo, v) => update((n) => { n.quadrinhos[qi][campo] = v })

  // Biblioteca de QUADRINHO, a mesma da aba Animar. As duas abas montam o mesmo post no mesmo
  // tom, então listar coisas diferentes só serve pra escolher errado: enquanto esta aqui lia a
  // biblioteca das sagas, a única trilha já escolhida na aba foi um `tenso-sombrio` num
  // quadrinho de humor, porque as 34 faixas cômicas não apareciam aqui.
  useEffect(() => {
    getMusicasQuadrinho().then((d) => {
      setMusicas(d.musicas || []); setInicios(d.inicios || {})
      setFichas(d.fichas || {}); setTons(d.tons || {})
    }).catch(() => {})
  }, [])
  useEffect(() => { setVendo(quadrinhoVideo(quad.id)); setMsg(null); setErr(null); setSemAudio(false) }, [quad.id])

  function onInicio(file, s) {
    const v = Math.max(0, Math.round(Number(s) || 0))
    setInicios((prev) => ({ ...prev, [file]: v }))
    salvarInicioMusicaQuadrinho(file, v).catch(() => {})
  }

  // Montar não salva antes (o Gerar salva): o servidor só precisa dos PNGs, e tempo
  // e faixa vão no pedido. Dá pra experimentar duração sem gravar o quadrinho.
  async function montar(painelNumero) {
    setRend(painelNumero ?? 'todos'); setErr(null); setMsg(null)
    try {
      const r = await montarVideoQuadrinho({
        quadrinhoId: quad.id, painelNumero, segundos: seg, musica, musicaVol: vol, semAudio, ritmo,
      })
      marcarGerado(r.video)
      setVendo(r.video)
      const carimbo = r.carimbo ? ` Cada painel com o "n/${r.carimbo.total}" no canto.` : ''
      setMsg((r.aviso ? `${r.segundos}s no total. ${r.aviso}.` : `Vídeo de ${r.segundos}s pronto.`) + carimbo)
    } catch (e) { setErr(e.message) } finally { setRend(null) }
  }

  const comArte = quad.paineis.filter((p) => existing[p.imagem])

  // A MESMA função que o servidor roda na montagem (shared/ritmo-video.mjs): o número na tela é o
  // número do vídeo, e não uma estimativa que pode divergir dele. Sem memo de propósito: são
  // dezenas de contas, e qualquer chave de cache aqui seria a porta pra tela mostrar o tempo velho
  // depois de mexer numa legenda na aba de falas.
  const medidas = dinamico && comArte.length ? medirPaineis(comArte, ritmo) : null
  const durDe = (i) => (medidas ? medidas[i].dur : seg)
  const total = medidas ? somaTempos(medidas.map((m) => m.dur)) : seg * (comArte.length || 1)
  const estourados = (medidas || []).filter((m) => m.estourou)

  // O painel isolado é outro post: ele é capa e desfecho ao mesmo tempo, então a medida é a de uma
  // sequência de um, e não a fatia da medida do quadrinho inteiro.
  const durPainelSo = (p) => (dinamico ? medirPaineis([p], ritmo)[0].dur : seg)

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
          <p className="hint mt-2">
            Com mais de um painel, cada um leva o mesmo carimbo de progresso do carrossel ("2/5", no canto): sem
            ele o painel do meio lê como o fim e a pessoa sai antes da virada. A arte no disco continua limpa.
          </p>

          {/* a ação vem antes das opções: monta-se muitas vezes, ajusta-se uma */}
          <button className="btn btn-primary mt-4" onClick={() => montar()} disabled={!!rend || !comArte.length}>
            {rend === 'todos' ? <span className="gen-spinner" /> : <Icon name="video" size={14} />}
            {rend === 'todos'
              ? 'Montando…'
              : comArte.length > 1 ? `Montar o quadrinho inteiro (${comArte.length} painéis, ${total}s)` : `Montar vídeo (${total}s)`}
          </button>

          {/* fica FORA do acabamento, junto do botão: silenciar é decisão de uma montagem, tomada na
              hora de montar, e não um ajuste que se guarda com o quadrinho */}
          <label className="anim-somusica mt-3">
            <input type="checkbox" checked={semAudio} onChange={(e) => setSemAudio(e.target.checked)} />
            <span>Montar sem áudio{musica ? ' (a trilha escolhida continua salva)' : ''}</span>
          </label>
          {semAudio && (
            <p className="hint mt-1">
              Sai mudo pra você pôr som em alta no próprio TikTok, que costuma render mais alcance que faixa
              livre. Desmarque pra voltar com a trilha, sem escolher de novo.
            </p>
          )}

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
                        {existing[vid] ? 'Remontar' : `Montar ${durPainelSo(p)}s`}
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

        <Recolhivel
          titulo="Tempo na tela"
          nota={dinamico ? `${RITMOS[ritmo].nome}, ${total}s no total` : `${seg}s por painel`}
          {...abre('tempo')}
        >
          {/* o tempo fixo trata a capa de três palavras e o painel de duas falas como a mesma coisa:
              um passa antes de ser lido, o outro sobra e a pessoa sai antes da virada */}
          <label className="anim-somusica">
            <input
              type="checkbox" checked={dinamico}
              onChange={(e) => setQ('videoRitmo', e.target.checked ? RITMO_PADRAO : 'fixo')}
            />
            <span>Tempo de cada painel conforme o texto dele</span>
          </label>

          {!dinamico ? (
            <>
              <div className="video-tempo mt-3">
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
            </>
          ) : (
            <>
              <div className="formato-opts mt-3">
                {Object.values(RITMOS).map((r) => (
                  <button
                    key={r.id}
                    className={'btn btn-sm' + (ritmo === r.id ? ' btn-primary' : '')}
                    onClick={() => setQ('videoRitmo', r.id)}
                    title={r.nota}
                  >
                    {r.nome} · {r.cps} CPS
                  </button>
                ))}
              </div>
              <p className="hint mt-2">{RITMOS[ritmo].nota}</p>

              {!!medidas && (
                <div className="video-paineis mt-3">
                  {medidas.map((m, i) => (
                    <div className="video-painel-row" key={m.numero}>
                      <span className="trilha-cena">Painel {m.numero}</span>
                      <span className="trilha-vol-val">{m.dur.toFixed(1)}s</span>
                      <span className="hint">
                        {m.chars ? `${m.chars} caracteres` : 'sem texto'}
                        {i === 0 && medidas.length > 1 ? ' · capa' : ''}
                        {i === medidas.length - 1 && medidas.length > 1 ? ' · desfecho' : ''}
                        {m.estourou ? ` · pedia ${m.pedia.toFixed(1)}s` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {!!estourados.length && (
                <p className="render-msg no mt-2">
                  <Icon name="alerta" size={13} />
                  {' '}Painel {estourados.map((m) => m.numero).join(', ')} com texto acima do teto de {RITMOS[ritmo].max}s:
                  no ritmo {RITMOS[ritmo].nome} alguém vai ler pela metade. Ritmo mais calmo ou menos texto no painel.
                </p>
              )}

              <p className="hint mt-2">
                A conta é a da legendagem: caracteres por segundo mais um piso pra reconhecer o desenho antes de
                procurar o texto. 17 CPS é o padrão da Netflix pra adulto, 21 é o teto que a TED aceita, 13 é a
                folga. Capa e desfecho ganham um sopro a mais, porque são o gancho e a virada.
              </p>
            </>
          )}
        </Recolhivel>

        <Recolhivel titulo="Trilha" nota={fichaSel ? fichaSel.titulo : 'sem trilha'} {...abre('trilha')}>
          {musicas.length === 0
            ? <p className="hint">Nenhuma trilha em <code>saga-fut/assets/musica-quadrinhos/</code> ainda. Rode <code>node scripts/baixar-musicas.mjs</code> pra montar o acervo (34 faixas livres de uso, ver CREDITOS.md na pasta).</p>
            : (
              <>
                {/* botão e não <select>: a escolha mora no modal, que mostra o que cada faixa é
                    e deixa ouvir sem trocar a seleção */}
                <button className="trilha-escolhida" onClick={() => setPickTrilha(true)}>
                  <span className="trilha-escolhida-txt">
                    <span className="trilha-pick-linha1">
                      <span className="trilha-pick-nome">{fichaSel ? fichaSel.titulo : 'Sem trilha'}</span>
                      {fichaSel?.viral && <span className="trilha-pick-tag">meme</span>}
                      {fichaSel?.dur && <span className="trilha-pick-dur">{fichaSel.dur}</span>}
                    </span>
                    <span className="trilha-pick-nota">
                      {fichaSel?.nota || 'O vídeo sai mudo e o som você escolhe no próprio TikTok.'}
                    </span>
                  </span>
                  <Icon name="chevron" size={12} />
                </button>

                {musica && (
                  <div className="trilha-row mt-2">
                    <span className="hint">Começa em</span>
                    <input
                      className="field trilha-inicio" type="number" min="0" step="1" value={inicios[musica] ?? 0}
                      title="Segundo em que a faixa começa a tocar (pula a intro). Vale pra ela em todo lugar."
                      onChange={(e) => onInicio(musica, e.target.value)}
                    />
                    <span className="hint">s (pula a intro quieta)</span>
                  </div>
                )}

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

      {pickTrilha && (
        <TrilhaPicker
          musicas={musicas} fichas={fichas} tons={tons} inicios={inicios} valor={musica}
          sugestoes={quad.trilhaSugestoes}
          onEscolher={(m) => setQ('videoMusica', m)}
          onFechar={() => setPickTrilha(false)}
        />
      )}
    </div>
  )
}
