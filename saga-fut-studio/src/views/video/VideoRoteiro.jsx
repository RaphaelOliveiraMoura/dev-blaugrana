import React from 'react'
import { Icon, FilePath } from '../../components/index.js'

// A DECUPAGEM: o roteiro lido como roteiro.
//
// POR QUE FOI REESCRITA (14/08/2026): esta aba mostrava uma tabela de `personagem / ação /
// veredito`, campos dos templates antigos (`defesa-barca`, `campeoes-rivais`), e o motor virou
// SHOTS faz tempo. Nenhum dos 13 vídeos do acervo tem esses campos, então a tabela saía com uma
// linha EM BRANCO por cena — pior que uma aba vazia, porque parecia defeito de dado em vez de
// código lendo um formato extinto.
//
// O propósito, porém, é o único que nenhuma outra tela cobre. As quatro respondem perguntas
// diferentes sobre o mesmo vídeo:
//
//   Linha do tempo -> QUANDO (o som, a cena, a fala, na régua)
//   Assets         -> DE QUE (sprite, cenário, o que é desenhado por código)
//   Palco          -> ONDE (a posição de cada um no quadro)
//   Roteiro        -> O QUE ACONTECE, beat a beat, em português
//
// A última é a que se lê antes de renderizar e a que se manda pra alguém opinar. Em JSON cru ela
// existe, mas ler encenação contando chaves não é ler encenação.

// Descreve UM beat em português. O roteiro fala em `{ andar: true, move: -620 }`; quem revisa
// pergunta "ele anda pra onde?". A tradução mora aqui e não no dado de propósito: o dado é o que o
// motor consome, e enfeitar o dado pra tela ler bonito é como um formato apodrece.
function beatEmPortugues(b) {
  const partes = []
  const lado = (n) => (n < 0 ? 'esquerda' : 'direita')
  if (b.andar || b.correr) {
    const verbo = b.correr ? 'corre' : 'anda'
    partes.push(b.move ? `${verbo} ${Math.abs(b.move)}px pra ${lado(b.move)}` : `${verbo} no lugar`)
  } else if (b.ciclo) {
    partes.push(b.move ? `"${b.ciclo}" andando ${Math.abs(b.move)}px pra ${lado(b.move)}` : `"${b.ciclo}"`)
  } else if (b.pose) partes.push(`pose "${b.pose}"`)
  else if (b.mantem) partes.push(`segue em "${b.mantem}"`)
  else if (b.parado) partes.push('parado, respirando')
  else if (b.move) partes.push(`desliza ${Math.abs(b.move)}px pra ${lado(b.move)}`)

  if (b.pulo) partes.push(`pula ${b.pulo.altura ?? 140}px`)
  else if (b.moveY) partes.push(b.moveY < 0 ? `sobe ${Math.abs(b.moveY)}px` : `desce ${b.moveY}px`)
  if (b.olhar) partes.push(`vira pra ${b.olhar}`)
  if (b.mira) partes.push(`mira em ${b.mira}`)
  if (b.escala != null) partes.push(`escala ${b.escala}`)
  return partes.join(', ') || 'sem ação'
}

function AcaoDoPersonagem({ pc, fps }) {
  const linhas = []
  if (pc.entra) linhas.push({ q: 'ENTRA', txt: `${pc.entra === 'correr' ? 'correndo' : 'andando'} pela ${pc.de === 'direita' ? 'direita' : 'esquerda'}`, f: null })
  for (const b of (pc.poses || [])) linhas.push({ q: null, txt: beatEmPortugues(b), f: b.hold })
  if (pc.sai) linhas.push({ q: 'SAI', txt: `${pc.sai === 'correr' ? 'correndo' : 'andando'} pra ${pc.saiPara === 'direita' ? 'direita' : 'esquerda'}`, f: null })
  const extra = []
  if (pc.emote) extra.push(`pictograma ${typeof pc.emote === 'string' ? pc.emote : pc.emote.tipo}`)
  if (pc.efeito) extra.push(`efeito ${typeof pc.efeito === 'string' ? pc.efeito : pc.efeito.tipo}`)
  if (pc.olhar && !(pc.poses || []).some((b) => b.olhar)) extra.push(`olha pra ${pc.olhar}`)

  return (
    <div className="rot-char">
      <span className="rot-slug">{pc.slug}</span>
      <div className="rot-acoes">
        {linhas.length ? linhas.map((l, i) => (
          <span key={i} className="rot-acao">
            {l.q && <b className="rot-q">{l.q}</b>} {l.txt}
            {l.f ? <i className="rot-f">{l.f}f · {(l.f / fps).toFixed(1)}s</i> : null}
          </span>
        )) : <span className="rot-acao rot-nada">sem beat declarado</span>}
        {!!extra.length && <span className="rot-acao rot-extra">{extra.join(' · ')}</span>}
      </div>
    </div>
  )
}

export function VideoRoteiro({ v }) {
  const fps = v.fps || 30
  const roteiro = v.roteiro || []
  const total = roteiro.reduce((a, sh) => a + (sh.dur || 0), 0)
  const setDo = (sh) => sh.set || v.set || v.mundo?.set || null

  if (!roteiro.length) {
    return <div className="panel"><div className="hint">Este vídeo não tem roteiro de cenas. Se for um card montado por código, o dado dele está no <FilePath path={`data/videos/${v.id}.json`} />.</div></div>
  }

  return (
    <div className="rot">
      <div className="aud-topo">
        <span className="hint">
          {roteiro.length} cena(s) · {total} frames · {(total / fps).toFixed(1)}s
          {v.mundo ? ` · mundo de ${v.mundo.telas || 2} telas` : ''}
        </span>
        {v.gancho && <span className="hint">gancho: <b>{v.gancho}</b></span>}
      </div>

      {roteiro.map((sh, i) => {
        const lugar = setDo(sh)
        const trocou = i > 0 && lugar !== setDo(roteiro[i - 1])
        const cam = sh.camera || {}
        return (
          <div key={i} className={'rot-cena' + (trocou ? ' troca' : '')}>
            <div className="rot-cena-topo">
              <span className="rot-n">{i + 1}</span>
              <span className="rot-dur">{sh.dur}f · {((sh.dur || 0) / fps).toFixed(1)}s</span>
              {/* A TROCA DE LUGAR ganha destaque porque é o corte mais barato que existe e costuma
                  ser a própria virada da esquete (o estádio celebra, o escritório dispensa). */}
              {lugar && <span className={'rot-set' + (trocou ? ' novo' : '')}>{trocou ? '↳ ' : ''}{lugar}</span>}
              {cam.plano && <span className="rot-tag">plano {cam.plano}</span>}
              {sh.vista && <span className="rot-tag">vista {sh.vista}</span>}
              {sh.variacao && <span className="rot-tag">variação {sh.variacao}</span>}
              {sh.animado && <span className="rot-tag">fundo animado</span>}
              {sh.fundo && <span className="rot-tag">fundo gráfico {sh.fundo.tipo || 'chapado'}</span>}
              {!!(sh.zooms || []).length && <span className="rot-tag">punch-in</span>}
              {sh.transicao && <span className="rot-tag">{sh.transicao}</span>}
            </div>

            {/* `_beat` é a INTENÇÃO que o autor escreveu, e é a coisa mais importante da cena:
                é ela que diz se o beat tem virada. Nenhum gate lê isso, só gente. */}
            {sh._beat && <p className="rot-beat">{sh._beat}</p>}

            {(sh.personagens || []).map((pc, j) => <AcaoDoPersonagem key={j} pc={pc} fps={fps} />)}

            {(sh.baloes || []).map((b, j) => (
              <div key={'b' + j} className="rot-fala">
                <Icon name="quadrinhos" size={12} />
                <b>{b.de || (b.voz && b.voz !== true ? b.voz : 'narração')}</b>
                <span className="rot-txt">"{b.texto}"</span>
                {b.dizer && <i className="rot-f">fala: "{b.dizer}"</i>}
                <i className="rot-f">f{b.in ?? 6}{b.out ? `-${b.out}` : ''}</i>
                {!b.voz && <i className="rot-f rot-mudo">sem voz</i>}
              </div>
            ))}

            {!!(sh.sons || []).length && (
              <div className="rot-sons">
                <Icon name="musica" size={12} /> {sh.sons.map((s) => `${s.id} (f${s.at || 0})`).join(' · ')}
              </div>
            )}
          </div>
        )
      })}

      <div className="hint">
        O roteiro se edita pela API, não por aqui: <code>PUT /api/videos/{v.id}</code>. O arquivo é <FilePath path={`data/videos/${v.id}.json`} />.
      </div>
    </div>
  )
}
