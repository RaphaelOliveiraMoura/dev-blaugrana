import React, { useState } from 'react'
import { Icon, PromptBlock } from '../../components/index.js'
import { useStudio } from '../../app/StudioContext.jsx'
import { quadrinhoSlide, quadrinhoVideo } from '../../../shared/caminhos.mjs'
import { montarImagemQuadrinho } from '../../api/render.js'
import { hojeChave, chaveData, addDias } from '../../lib/agenda.js'
import { YoutubeAgendar } from './YoutubeAgendar.jsx'

// PUBLICAR: os três passos que você faz toda vez, e mais nada à vista.
//
// A versão anterior tinha SEIS seções abertas (estado, texto, imagens, X, vídeo, YouTube), cada
// uma com dois ou três parágrafos de explicação. Tudo verdadeiro e tudo irrelevante na hora de
// publicar: quem está com o celular na mão quer copiar, baixar e agendar, não ler.
//
// A regra desta tela: **o que você faz toda vez fica à vista; o que você faz de vez em quando
// fica atrás de "mais opções"**. Editar a legenda, mudar formato, ver os grupos do X e baixar o
// vídeo são coisas de antes de publicar, não do momento de publicar.

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

export function QuadrinhoPublicar({ quad, qi }) {
  const { existing, bust, update, marcarGerado } = useStudio()
  const [copiado, setCopiado] = useState(null)
  const [baixando, setBaixando] = useState(null)
  const [baixou, setBaixou] = useState(false)
  const [erro, setErro] = useState(null)
  const [montando, setMontando] = useState(false)

  const titulo = (quad.publicacao?.titulo || '').trim()
  const descricao = (quad.legenda || '').trim()
  const tudo = [titulo, descricao].filter(Boolean).join('\n\n')
  const video = quadrinhoVideo(quad.id)
  const formato = quad.formatoPost || quad.formato || '3:4'

  const slides = (quad.paineis || [])
    .map((p) => ({ numero: p.numero, src: quadrinhoSlide(quad.id, p.numero) }))
    .filter((s) => existing[s.src])
  const gruposX = []
  for (let i = 0; i < slides.length; i += 4) gruposX.push(slides.slice(i, i + 4))

  const postado = !!quad.postado
  const agenda = quad.agenda || ''
  const legivel = (c) => { const [a, m, d] = c.split('-'); return `${d}/${m}/${a}` }

  async function copiar(texto, qual) {
    try { await navigator.clipboard.writeText(texto) } catch {
      const ta = document.createElement('textarea')
      ta.value = texto; document.body.appendChild(ta); ta.select()
      try { document.execCommand('copy') } catch { /* nada a fazer */ }
      ta.remove()
    }
    setCopiado(qual); setTimeout(() => setCopiado(null), 1600)
  }

  // Uma de cada vez, com pausa: o que ordena na galeria é o instante em que cada arquivo chega.
  async function baixarTodas() {
    setErro(null)
    try {
      for (const [i, s] of slides.entries()) {
        setBaixando({ i: i + 1, total: slides.length })
        const resp = await fetch(`/files/${s.src}`)
        if (!resp.ok) throw new Error(`slide ${i + 1}: HTTP ${resp.status}`)
        const url = URL.createObjectURL(await resp.blob())
        const a = document.createElement('a')
        a.href = url; a.download = `${quad.id}-${String(i + 1).padStart(2, '0')}.png`
        document.body.appendChild(a); a.click(); a.remove()
        setTimeout(() => URL.revokeObjectURL(url), 4000)
        if (i < slides.length - 1) await new Promise((r) => setTimeout(r, 900))
      }
      setBaixou(true)
    } catch (e) { setErro(e.message) } finally { setBaixando(null) }
  }

  async function montar() {
    setMontando(true); setErro(null)
    try {
      const r = await montarImagemQuadrinho({ quadrinhoId: quad.id, formato, mosaico: false, carrossel: true })
      ;(r.carrossel || []).forEach(marcarGerado)
    } catch (e) { setErro(e.message) } finally { setMontando(false) }
  }

  return (
    <div className="publicar">
      {/* ESTADO EM UMA LINHA. Antes era um painel inteiro com três parágrafos. */}
      <div className="pub-topo">
        <span className={'pub-chip ' + (postado ? 'postado' : agenda ? 'agendado' : 'pendente')}>
          <Icon name={postado ? 'check' : 'relogio'} size={13} />
          {postado ? 'Publicado' : agenda ? legivel(agenda) : 'sem data'}
        </span>
        <input className="field pub-data-inline" type="date" value={agenda}
          onChange={(e) => update((n) => {
            if (e.target.value) n.quadrinhos[qi].agenda = e.target.value
            else delete n.quadrinhos[qi].agenda
          })} />
        {!agenda && (
          <button className="btn btn-sm" onClick={() => update((n) => { n.quadrinhos[qi].agenda = hojeChave() })}>hoje</button>
        )}
      </div>

      {!slides.length ? (
        <div className="panel">
          <p className="hint">Os slides ainda não foram montados.</p>
          <button className="btn btn-primary mt-2" onClick={montar} disabled={montando}>
            {montando ? <span className="gen-spinner" /> : <Icon name="quadrinhos" size={14} />}
            {montando ? 'Montando…' : `Montar os slides (${formato})`}
          </button>
          {erro && <p className="render-msg no mt-2"><Icon name="alerta" size={13} /> {erro}</p>}
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
                {copiado === 't' ? 'copiado' : 'só o título (X)'}
              </button>
            </div>
          </Passo>

          <Passo n="2" titulo={`Baixar as ${slides.length} imagens`} feito={baixou}>
            <div className="passo-acoes">
              <button className="btn btn-primary" onClick={baixarTodas} disabled={!!baixando}>
                {baixando
                  ? <><span className="gen-spinner" /> {baixando.i} de {baixando.total}…</>
                  : <><Icon name="baixar" size={14} /> Baixar na ordem</>}
              </button>
              <span className="hint">uma por vez, na ordem certa</span>
            </div>
          </Passo>

          {existing[video] && (
            <Passo n="3" titulo="YouTube" feito={!!quad.youtube}>
              <YoutubeAgendar quad={quad} qi={qi} update={update} compacto />
            </Passo>
          )}

          {erro && <p className="render-msg no"><Icon name="alerta" size={13} /> {erro}</p>}

          <button
            className={'btn btn-lg ' + (postado ? '' : 'btn-primary')}
            onClick={() => update((n) => {
              if (postado) delete n.quadrinhos[qi].postado
              else n.quadrinhos[qi].postado = true
            })}>
            <Icon name={postado ? 'x' : 'check'} size={16} />
            {postado ? 'Desmarcar' : 'Pronto, agendei em todas'}
          </button>

          {/* TUDO QUE NÃO É DE TODA VEZ. Editar legenda, trocar formato, conferir os grupos do X e
              pegar o vídeo são coisas de ANTES; abertas, competiam com os três passos acima. */}
          <details className="pub-mais">
            <summary className="hint">mais opções</summary>

            <div className="panel mt-3">
              <PromptBlock
                label="Título do post" tool="gancho curto"
                value={quad.publicacao?.titulo || ''}
                onChange={(v) => update((n) => {
                  n.quadrinhos[qi].publicacao = { ...(n.quadrinhos[qi].publicacao || {}), titulo: v }
                })}
              />
              <PromptBlock
                label="Descrição do post" tool="gancho + CTA + hashtags"
                value={quad.legenda || ''}
                onChange={(v) => update((n) => { n.quadrinhos[qi].legenda = v })}
              />
              <div className="row-actions mt-3">
                <button className="btn btn-sm" onClick={montar} disabled={montando}>
                  {montando ? <span className="gen-spinner" /> : <Icon name="quadrinhos" size={12} />}
                  {montando ? 'remontando…' : `remontar os slides (${formato})`}
                </button>
                <span className="hint">o formato muda em Conteúdo</span>
              </div>
              {existing[video] && (
                <div className="row-actions mt-2">
                  <a className="btn btn-sm" href={`/files/${video}`} download={`${quad.id}.mp4`}>
                    <Icon name="baixar" size={12} /> baixar o vídeo
                  </a>
                </div>
              )}
              {gruposX.length > 1 && (
                <p className="hint mt-3">
                  No X: {gruposX.map((g, i) => `${i === 0 ? 'post' : `resposta ${i}`} = ${g.map((s) => slides.indexOf(s) + 1).join(',')}`).join(' · ')}
                </p>
              )}
              <div className="postar-lista mt-3">
                {slides.map((s, i) => (
                  <a key={s.numero} className="btn btn-sm" href={`/files/${s.src}${bust ? `?v=${bust}` : ''}`}
                    download={`${quad.id}-${String(i + 1).padStart(2, '0')}.png`}>
                    <Icon name="baixar" size={11} /> {i + 1}
                  </a>
                ))}
              </div>
            </div>
          </details>
        </>
      )}
    </div>
  )
}
