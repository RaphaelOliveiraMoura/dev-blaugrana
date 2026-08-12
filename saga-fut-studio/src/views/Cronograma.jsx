import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '../components/index.js'
import { useStudio } from '../app/StudioContext.jsx'
import { useArrastar } from '../hooks/useArrastar.js'
import {
  postsDoProjeto, inicioSemana, diasDaSemana, addDias,
  chaveData, hojeChave, rotuloDiaCurto, rotuloIntervalo,
} from '../lib/agenda.js'

// Um card de post: é a própria arte de preview, sem textos (o nome fica no
// tooltip). `agendado` mostra os botões de tirar do dia e de marcar como postado.
//
// FORA do componente da tela de propósito. Declarado dentro, ele virava um tipo
// novo a cada render e o React remontava a lista inteira — o que cancelava o
// arraste em curso e zerava o scroll da faixa. Com memo, mexer numa coluna não
// re-renderiza os cards das outras.
const Card = React.memo(function Card({ post, src, agendado, arrastando, iniciar, aoAbrir, aoRemover, aoPostar }) {
  return (
    <article
      className={'cron-card' + (arrastando ? ' arrastando' : '') + (post.postado ? ' postado' : '')}
      onPointerDown={(e) => iniciar(e, post)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); aoAbrir(post) } }}
      title={`${post.titulo} · ${post.formato}${post.selo ? ' · ' + post.selo : ''}`}
    >
      {src
        ? <img className="cron-card-img" src={src} alt={post.titulo} draggable={false} />
        : <div className="cron-card-icone"><Icon name={post.tipo === 'episodio' ? 'video' : 'quadrinhos'} size={30} /></div>}
      {/* vídeo: play por cima do primeiro frame pra distinguir de quadrinho */}
      {post.tipo === 'episodio' && src && (
        <span className="cron-card-play"><Icon name="previa" size={18} /></span>
      )}
      <span className={'cron-dot' + (post.pronto ? ' ok' : '')}
        title={post.pronto ? 'Pronto pra postar' : `Em produção · ${post.progresso}`} />
      {agendado && (
        <button className="cron-card-x" title="Tirar do dia"
          onClick={(e) => { e.stopPropagation(); aoRemover(post) }}>
          <Icon name="x" size={12} />
        </button>
      )}
      {agendado && (
        <button
          className={'cron-card-check' + (post.postado ? ' on' : '')}
          title={post.postado ? 'Postado · clique pra desmarcar' : 'Marcar como postado'}
          onClick={(e) => { e.stopPropagation(); aoPostar(post, !post.postado) }}>
          <Icon name="check" size={13} />
        </button>
      )}
    </article>
  )
})

// CRONOGRAMA: planeja o que sai em cada dia. Pendentes (sem data) ficam no topo,
// arrasta-se pra um dia da semana; a data mora no próprio item (q.agenda/ep.agenda).
// Semana rolante (‹ ›) porque a cadência é ~diária: 7 dias lado a lado leem melhor
// que um mês inteiro espremido.
export default function Cronograma() {
  const { dados, update, existing, progress, bust, nav } = useStudio()

  const posts = useMemo(() => postsDoProjeto(dados, progress), [dados, progress])

  // offset em semanas a partir da atual (0 = esta semana)
  const [offset, setOffset] = useState(0)
  const inicio = useMemo(() => addDias(inicioSemana(new Date()), offset * 7), [offset])
  const dias = useMemo(() => diasDaSemana(inicio), [inicio])
  const hoje = hojeChave()

  const pendentes = useMemo(() => posts.filter((p) => !p.agenda), [posts])
  const porDia = useMemo(() => {
    const m = {}
    for (const p of posts) if (p.agenda) (m[p.agenda] ||= []).push(p)
    return m
  }, [posts])

  // O contexto entrega funções novas a cada render; lidas por ref, os callbacks
  // do card ficam estáveis e o React.memo acima vale de alguma coisa.
  const amb = useRef(null)
  amb.current = { update, nav }

  // grava/limpa a data no item. chave null = volta pro backlog.
  const agendar = useCallback((post, chave) => {
    if ((post.agenda || null) === (chave || null)) return // soltou de volta no mesmo dia
    amb.current.update((n) => {
      if (post.tipo === 'quadrinho') {
        const q = (n.quadrinhos || []).find((x) => x.id === post.id)
        if (q) { if (chave) q.agenda = chave; else delete q.agenda }
      } else {
        const s = (n.sagas || []).find((x) => x.id === post.sagaId)
        const ep = s && (s.episodios || []).find((x) => x.id === post.id)
        if (ep) { if (chave) ep.agenda = chave; else delete ep.agenda }
      }
    })
  }, [])

  // marca/desmarca o post como já publicado. Mora no próprio item (q.postado /
  // ep.postado), igual à agenda, então persiste sem tabela paralela.
  const marcarPostado = useCallback((post, valor) => {
    amb.current.update((n) => {
      if (post.tipo === 'quadrinho') {
        const q = (n.quadrinhos || []).find((x) => x.id === post.id)
        if (q) { if (valor) q.postado = true; else delete q.postado }
      } else {
        const s = (n.sagas || []).find((x) => x.id === post.sagaId)
        const ep = s && (s.episodios || []).find((x) => x.id === post.id)
        if (ep) { if (valor) ep.postado = true; else delete ep.postado }
      }
    })
  }, [])

  const abrir = useCallback((post) => {
    const { nav } = amb.current
    if (post.tipo === 'quadrinho') nav.quadrinho(post.id)
    else nav.episodio(post.sagaId, post.id)
  }, [])

  const desagendar = useCallback((post) => agendar(post, null), [agendar])

  // O gesto inteiro (fantasma, limiar, auto-scroll) vive no hook; aqui só chega
  // "soltou o item X na zona Y". Zona vem do data-drop lá embaixo.
  const { arrastando, alvo, iniciar } = useArrastar({
    aoSoltar: (post, zona) => agendar(post, zona === 'backlog' ? null : zona),
    aoClicar: abrir,
  })

  // --- Faixa de pendentes: rolagem horizontal ------------------------------
  const faixa = useRef(null)
  const posX = useRef(0)
  const [pontas, setPontas] = useState({ ini: false, fim: false })

  const medir = useCallback(() => {
    const el = faixa.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    posX.current = el.scrollLeft
    setPontas((p) => {
      const n = { ini: el.scrollLeft > 2, fim: el.scrollLeft < max - 2 }
      return p.ini === n.ini && p.fim === n.fim ? p : n
    })
  }, [])

  // Rede de segurança do offset, a cada render: qualquer coisa que mexa nos
  // filhos da faixa (salvar, gerar arte, trocar de semana) faz o browser zerar o
  // scrollLeft, e a fila voltava sozinha pro começo.
  //
  // Só age no caso "zerou sozinho": restaurar sempre atropelaria uma rolagem em
  // curso, já que o valor no meio de um scroll suave é legítimo e transitório.
  useLayoutEffect(() => {
    const el = faixa.current
    if (!el || el.scrollLeft !== 0 || posX.current <= 0) return
    el.scrollLeft = Math.min(posX.current, Math.max(0, el.scrollWidth - el.clientWidth))
  })

  useEffect(() => {
    const el = faixa.current
    if (!el) return
    medir()
    const ro = new ResizeObserver(medir)
    ro.observe(el)

    // roda do mouse na vertical vira rolagem lateral (é uma faixa, não uma
    // coluna). Listener na mão porque o onWheel do React é passivo e não deixa
    // segurar a rolagem da página.
    function wheel(e) {
      const max = el.scrollWidth - el.clientWidth
      if (max <= 0 || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return
      if ((e.deltaY < 0 && el.scrollLeft <= 0) || (e.deltaY > 0 && el.scrollLeft >= max)) return
      e.preventDefault()
      el.scrollLeft += e.deltaY
    }
    el.addEventListener('wheel', wheel, { passive: false })
    return () => { ro.disconnect(); el.removeEventListener('wheel', wheel) }
  }, [medir])

  function correrFaixa(dir) {
    const el = faixa.current
    if (el) el.scrollBy({ left: dir * Math.max(200, el.clientWidth * 0.7), behavior: 'smooth' })
  }

  const capaDe = (p) => (p.capa && existing[p.capa] ? '/files/' + p.capa + (bust ? '?v=' + bust : '') : null)
  const props = (p) => ({
    post: p, src: capaDe(p), iniciar,
    arrastando: arrastando?.key === p.key,
    aoAbrir: abrir, aoRemover: desagendar, aoPostar: marcarPostado,
  })

  return (
    <div>
      <div className="section-head">
        <h3 className="section-title">Cronograma</h3>
        <div className="row-actions cron-nav">
          <button className="btn btn-sm btn-icon" onClick={() => setOffset((o) => o - 1)} title="Semana anterior">
            <Icon name="chevron" size={14} className="flip" />
          </button>
          <span className="cron-intervalo">{rotuloIntervalo(dias[0], dias[6])}</span>
          <button className="btn btn-sm btn-icon" onClick={() => setOffset((o) => o + 1)} title="Próxima semana">
            <Icon name="chevron" size={14} />
          </button>
          {offset !== 0 && (
            <button className="btn btn-sm" onClick={() => setOffset(0)}>Hoje</button>
          )}
        </div>
      </div>

      <p className="hint intro">
        Arraste um post pendente pra um dia pra agendar. Puxe entre dias pra remarcar, ou
        clique no × pra devolver à fila. A bolinha verde diz que a arte já está pronta pra sair.
      </p>

      {/* PENDENTES: tudo que existe mas não tem data. Também é área de soltar, pra
          desagendar arrastando de volta. */}
      <section className={'cron-backlog' + (alvo === 'backlog' ? ' alvo' : '')} data-drop="backlog">
        <div className="cron-backlog-head">
          <span>Pendentes <span className="cron-contador">{pendentes.length}</span></span>
          <div className="cron-faixa-nav">
            <span className="hint">arraste pra um dia ↓</span>
            <button className="btn btn-sm btn-icon" disabled={!pontas.ini}
              onClick={() => correrFaixa(-1)} title="Voltar na fila">
              <Icon name="chevron" size={13} className="flip" />
            </button>
            <button className="btn btn-sm btn-icon" disabled={!pontas.fim}
              onClick={() => correrFaixa(1)} title="Avançar na fila">
              <Icon name="chevron" size={13} />
            </button>
          </div>
        </div>
        <div
          className={'cron-backlog-row' + (pontas.ini ? ' corta-ini' : '') + (pontas.fim ? ' corta-fim' : '')}
          ref={faixa}
          onScroll={medir}
          data-autoscroll
        >
          {pendentes.length === 0
            ? <div className="cron-vazio">Nada na fila. Tudo agendado. ✓</div>
            : pendentes.map((p) => <Card key={p.key} {...props(p)} />)}
        </div>
      </section>

      {/* SEMANA: 7 colunas, cada dia é uma área de soltar. */}
      <section className="cron-semana">
        {dias.map((d) => {
          const chave = chaveData(d)
          const doDia = porDia[chave] || []
          const ehHoje = chave === hoje
          return (
            <div
              key={chave}
              className={'cron-dia' + (ehHoje ? ' hoje' : '') + (alvo === chave ? ' alvo' : '')}
              data-drop={chave}
            >
              <div className="cron-dia-head">
                <span className="cron-dia-nome">{rotuloDiaCurto(d)}</span>
                <span className="cron-dia-num">{d.getDate()}</span>
              </div>
              <div className="cron-dia-corpo">
                {doDia.map((p) => <Card key={p.key} {...props(p)} agendado />)}
                {/* alvo do arraste ganha um slot: a coluna cheia não tem sobra
                    onde mostrar que aceita, e a borda sozinha some no meio de 7 */}
                {alvo === chave && <div className="cron-slot">soltar aqui</div>}
              </div>
            </div>
          )
        })}
      </section>
    </div>
  )
}
