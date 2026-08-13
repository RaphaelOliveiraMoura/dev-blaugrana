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

// Os horários da casa, pra não digitar 12:30 toda vez.
const HORAS_PADRAO = ['12:30', '19:00']

// O ÚLTIMO QUE JÁ FOI AGENDADO, pra saber onde a fila está.
//
// Escolher data no vácuo é como dois posts caem no mesmo horário ou um dia fica vazio: a
// informação que falta na hora é sempre "e o anterior, ficou pra quando?". Aqui ela vem junto.
//
// Conta só quem tem `postado` (o critério da casa é "terminei de agendar"): quadrinho com agenda
// mas sem postar costuma ser o ANIVERSÁRIO DO FATO, que a skill /o-dia-em-que grava e que não
// tem nada a ver com a fila de publicação. Sem esse filtro, a referência apontaria 2027.
function ultimoAgendado(quadrinhos, idAtual) {
  const fila = (quadrinhos || [])
    .filter((q) => q.id !== idAtual && q.postado && q.agenda)
    .map((q) => ({ id: q.id, dia: q.agenda, hora: q.hora || '' }))
    .sort((a, b) => (b.dia + b.hora).localeCompare(a.dia + a.hora))
  return fila[0] || null
}

// O PRÓXIMO SLOT do padrão de 2 por dia: 12:30 e 19:00.
// 12:30 → 19:00 do mesmo dia · 19:00 (ou sem hora) → 12:30 do dia seguinte.
function proximoSlot(ultimo) {
  if (!ultimo) return null
  const [a, m, d] = ultimo.dia.split('-').map(Number)
  if (ultimo.hora === HORAS_PADRAO[0]) return { dia: ultimo.dia, hora: HORAS_PADRAO[1] }
  const seguinte = new Date(a, m - 1, d + 1)
  const iso = `${seguinte.getFullYear()}-${String(seguinte.getMonth() + 1).padStart(2, '0')}-${String(seguinte.getDate()).padStart(2, '0')}`
  return { dia: iso, hora: HORAS_PADRAO[0] }
}

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
  const { dados, existing, bust, update, marcarGerado } = useStudio()
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
  // A HORA É CAMPO SEPARADO, e não parte da `agenda`. O cronograma casa `agenda` com a CHAVE DO
  // DIA ('YYYY-MM-DD') e o store valida esse formato: enfiar a hora ali sumiria com a peça das
  // duas listas, que é o defeito que já custou 58 episódios de uma vez.
  const hora = quad.hora || ''
  const legivel = (c) => { const [a, m, d] = c.split('-'); return `${d}/${m}/${a}` }

  const setAgenda = (v) => update((n) => {
    if (v) n.quadrinhos[qi].agenda = v
    else { delete n.quadrinhos[qi].agenda; delete n.quadrinhos[qi].hora }
  })
  const setHora = (v) => update((n) => {
    if (v) n.quadrinhos[qi].hora = v
    else delete n.quadrinhos[qi].hora
  })

  const ultimo = ultimoAgendado(dados.quadrinhos, quad.id)
  const proximo = proximoSlot(ultimo)
  const usarProximo = () => update((n) => {
    n.quadrinhos[qi].agenda = proximo.dia
    n.quadrinhos[qi].hora = proximo.hora
  })

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
          {postado ? 'Publicado' : agenda ? `${legivel(agenda)}${hora ? ` ${hora}` : ''}` : 'sem data'}
        </span>
        <input className="field pub-data-inline" type="date" value={agenda}
          onChange={(e) => setAgenda(e.target.value)} />
        {/* A HORA fica DO LADO da data, e não escondida no bloco do YouTube: é ela que responde
            "que horas eu agendei isso?" semanas depois, e serve de padrão pro Short. */}
        <input className="field pub-hora-inline" type="time" value={hora} disabled={!agenda}
          onChange={(e) => setHora(e.target.value)}
          title={agenda ? 'Horário da publicação' : 'Escolha a data primeiro'} />
        {agenda && !hora && HORAS_PADRAO.map((h) => (
          <button key={h} className="btn btn-sm" onClick={() => setHora(h)}>{h}</button>
        ))}
        {!agenda && (
          <button className="btn btn-sm" onClick={() => setAgenda(hojeChave())}>hoje</button>
        )}
      </div>

      {/* A REFERÊNCIA, e o atalho pro slot seguinte. Só aparece se ainda não está publicado:
          depois de agendado, saber onde a fila estava não muda mais nada. */}
      {!postado && ultimo && (
        <p className="pub-ultimo">
          último agendado: <strong>{legivel(ultimo.dia)}{ultimo.hora ? ` ${ultimo.hora}` : ''}</strong>
          <span className="hint"> ({ultimo.id})</span>
          {proximo && (agenda !== proximo.dia || hora !== proximo.hora) && (
            <button className="btn btn-sm" onClick={usarProximo}>
              usar o próximo: {legivel(proximo.dia)} {proximo.hora}
            </button>
          )}
        </p>
      )}

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
            {/* A TIRA DE MINIATURAS existe pra CONFERIR A ORDEM enquanto você seleciona no app,
                e é só isso: pequena, numerada e rolando de lado. A versão anterior mostrava as
                imagens grandes, uma por linha, e empurrava o resto da tela pra fora do celular.
                Aqui o alvo não é olhar a arte (isso é em Conteúdo), é bater "a 3 é essa mesmo?". */}
            <div className="pub-tira">
              {slides.map((s, i) => (
                <div className="pub-tira-item" key={s.numero}>
                  {/* miniatura gerada no servidor: o slide cheio tem ~2,5 MB e isto tem ~15 KB.
                      264 = 2x a largura na tela, pra não borrar em retina. */}
                  <img src={`/api/thumb?path=${encodeURIComponent(s.src)}&w=264${bust ? `&v=${bust}` : ''}`}
                    alt={`slide ${i + 1}`} loading="lazy" />
                  <span className="pub-tira-n">{i + 1}</span>
                </div>
              ))}
            </div>
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
