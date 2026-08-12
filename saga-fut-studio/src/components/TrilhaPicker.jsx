import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from './Icon.jsx'

const semAcento = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()

// Uma linha da lista. Mesmo componente nas sugeridas e no cat\u00e1logo inteiro: a \u00fanica diferen\u00e7a
// \u00e9 o `porque`, que s\u00f3 a sugerida tem (o motivo dela servir NESTE quadrinho, que \u00e9 uma coisa
// diferente da nota da faixa, que vale pra qualquer um).
function ItemTrilha({ arq, ficha, porque, sel, soando, onEscolher, onOuvir }) {
  return (
    <div className={'trilha-pick-item' + (sel ? ' sel' : '')}>
      <button className="trilha-pick-escolher" onClick={onEscolher} title="Usar esta trilha">
        <span className="trilha-pick-linha1">
          <span className="trilha-pick-nome">{ficha.titulo}</span>
          {ficha.viral && <span className="trilha-pick-tag" title="O p\u00fablico reconhece: virou meme sound">meme</span>}
          {ficha.dur && <span className="trilha-pick-dur">{ficha.dur}</span>}
          {sel && <Icon name="check" size={12} />}
        </span>
        {porque && <span className="trilha-pick-porque">{porque}</span>}
        {ficha.nota
          ? <span className="trilha-pick-nota">{ficha.nota}</span>
          : !porque && <span className="trilha-pick-nota hint">{arq}</span>}
      </button>
      <button
        className={'btn btn-icon btn-sm trilha-pick-play' + (soando ? ' soando' : '')}
        onClick={onOuvir}
        title={soando ? 'Parar' : 'Ouvir a partir do in\u00edcio salvo'}
      >
        <Icon name={soando ? 'x' : 'previa'} size={11} />
      </button>
    </div>
  )
}

// A ESCOLHA DA TRILHA, em modal com ficha e prévia.
//
// POR QUE EXISTE: era um <select> de 39 linhas em que a única informação era o nome do arquivo.
// "tramoia-the-builder" e "tramoia-comic-plodding" são a mesma coisa lidas de fora, e ouvir
// exigia escolher a faixa, achar o botão de prévia, tocar, e repetir 39 vezes. Na prática
// ninguém escolhia: dos 127 quadrinhos, UM tinha trilha.
//
// O modal responde antes de tocar (tom, duração, se o público reconhece como meme, em que beat
// serve) e toca com um clique, sem sair da lista nem trocar a seleção. Ouvir e escolher são
// ações separadas de propósito: no select, ouvir JÁ ERA escolher, então comparar duas faixas
// significava sujar o estado do quadrinho duas vezes.
//
// A prévia começa no ponto de início salvo da faixa (o mesmo que o render usa), então o que
// você ouve aqui é o que entra no vídeo, não a intro quieta que o render pula.
export function TrilhaPicker({ musicas, fichas, tons, inicios, valor, sugestoes, onEscolher, onFechar }) {
  const [tocando, setTocando] = useState(null)
  const [busca, setBusca] = useState('')
  const audioRef = useRef(null)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onFechar() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onFechar])

  // Parar o áudio ao fechar não é opcional: o modal some e a música continua tocando sem nada
  // na tela pra pausar.
  useEffect(() => () => { if (audioRef.current) audioRef.current.pause() }, [])

  const grupos = useMemo(() => {
    const q = semAcento(busca)
    // sem acento dos dois lados: em português quem busca digita "penalti", e a nota da faixa
    // diz "pênalti". Comparar literal devolve zero resultado pra quem escreveu certo o bastante.
    const casa = (f, arq) => !q || semAcento(`${f.titulo} ${f.nota || ''} ${arq}`).includes(q)
    const porTom = new Map()
    for (const arq of musicas) {
      const f = fichas?.[arq] || { tom: 'sem-ficha', titulo: arq, semFicha: true }
      if (!casa(f, arq)) continue
      if (!porTom.has(f.tom)) porTom.set(f.tom, [])
      porTom.get(f.tom).push({ arq, ficha: f })
    }
    // A ordem dos tons é a do catálogo (do mais usado pro mais pontual), e o que não tem ficha
    // desce pro fim em vez de sumir.
    const ordem = [...Object.keys(tons || {}), 'sem-ficha']
    return ordem.filter((t) => porTom.has(t)).map((t) => ({ tom: t, itens: porTom.get(t) }))
  }, [musicas, fichas, tons, busca])

  const total = grupos.reduce((n, g) => n + g.itens.length, 0)

  // Sugestão que aponta pra faixa que não está mais na pasta é descartada em silêncio aqui: o
  // modal só oferece o que dá pra tocar. O gate de escrita já barra nome fora do catálogo, então
  // sobrar alguma aqui significa arquivo apagado do disco, não dado errado.
  const sugeridas = useMemo(() => (sugestoes || [])
    .filter((s) => musicas.includes(s.arquivo))
    .map((s) => ({ arq: s.arquivo, porque: s.porque, ficha: fichas?.[s.arquivo] || { titulo: s.arquivo } })),
  [sugestoes, musicas, fichas])

  function ouvir(arq) {
    if (tocando === arq) { audioRef.current?.pause(); setTocando(null); return }
    setTocando(arq)
  }

  return (
    <div className="modal-overlay" onClick={onFechar}>
      <div className="modal modal-trilha" onClick={(e) => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-label="Escolher trilha">
        <div className="modal-det-head">
          <h4 className="modal-det-titulo">Trilha</h4>
          <span className="trilha-pick-busca">
            <input
              className="field" type="search" placeholder="buscar por nome ou situação..."
              value={busca} onChange={(e) => setBusca(e.target.value)} autoFocus
            />
          </span>
          <span className="modal-det-head-acoes">
            <button className="btn btn-ghost btn-icon btn-sm" onClick={onFechar} title="Fechar (Esc)">
              <Icon name="x" size={14} />
            </button>
          </span>
        </div>

        <div className="trilha-pick-corpo">
          <button
            className={'trilha-pick-item trilha-pick-nenhuma' + (!valor ? ' sel' : '')}
            onClick={() => { onEscolher(''); onFechar() }}
          >
            <span className="trilha-pick-nome">Sem trilha</span>
            <span className="trilha-pick-nota">
              O vídeo sai mudo e você escolhe um som em alta no próprio TikTok, que costuma dar
              mais alcance do que faixa livre.
            </span>
          </button>

          {/* AS SUGERIDAS PRIMEIRO, e com o motivo. Elas foram escolhidas por quem escreveu o
              roteiro, com o contexto do quadrinho na mão; quem chega aqui no fim já não tem
              esse contexto. A lista completa continua logo abaixo, porque sugestão que não dá
              pra ignorar é imposição. Só aparece sem busca ativa: filtrando, o que vale é o
              resultado do filtro. */}
          {!busca && sugeridas.length > 0 && (
            <section className="trilha-pick-grupo trilha-pick-sugeridas">
              <header className="trilha-pick-grupo-head">
                <strong>Sugeridas pra este quadrinho</strong>
                <span className="hint">escolhidas junto com o roteiro</span>
              </header>
              {sugeridas.map(({ arq, ficha, porque }) => (
                <ItemTrilha
                  key={'sug:' + arq} arq={arq} ficha={ficha} porque={porque}
                  sel={valor === arq} soando={tocando === arq}
                  onEscolher={() => { onEscolher(arq); onFechar() }} onOuvir={() => ouvir(arq)}
                />
              ))}
            </section>
          )}

          {grupos.map((g) => (
            <section key={g.tom} className="trilha-pick-grupo">
              <header className="trilha-pick-grupo-head">
                <strong>{tons?.[g.tom]?.rotulo || 'Sem ficha'}</strong>
                <span className="hint">
                  {tons?.[g.tom]?.desc || 'faixa antiga, sem ficha no catálogo'}
                </span>
              </header>
              {g.itens.map(({ arq, ficha }) => (
                <ItemTrilha
                  key={arq} arq={arq} ficha={ficha}
                  sel={valor === arq} soando={tocando === arq}
                  onEscolher={() => { onEscolher(arq); onFechar() }} onOuvir={() => ouvir(arq)}
                />
              ))}
            </section>
          ))}

          {total === 0 && <p className="hint">Nada com "{busca}".</p>}
        </div>

        {tocando && (
          <audio
            ref={audioRef} controls autoPlay className="field trilha-pick-audio"
            src={'/files/assets/musica-quadrinhos/' + encodeURIComponent(tocando) + '#t=' + (inicios?.[tocando] ?? 0)}
            onEnded={() => setTocando(null)}
          />
        )}

        <p className="hint trilha-pick-rodape">
          Todas de Kevin MacLeod (incompetech.com), CC BY 4.0. O crédito é obrigatório na
          descrição do post: a linha pronta de cada faixa está no CREDITOS.md da pasta.
        </p>
      </div>
    </div>
  )
}
