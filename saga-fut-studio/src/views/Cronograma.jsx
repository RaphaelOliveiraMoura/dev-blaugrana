import React, { useMemo, useState } from 'react'
import { Icon } from '../components/index.js'
import { useStudio } from '../app/StudioContext.jsx'
import {
  postsDoProjeto, inicioSemana, diasDaSemana, addDias,
  chaveData, hojeChave, rotuloDiaCurto, rotuloIntervalo,
} from '../lib/agenda.js'

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

  // o post sendo arrastado e o alvo sob o cursor, só pra feedback visual
  const [arrastando, setArrastando] = useState(null)
  const [alvo, setAlvo] = useState(null) // chave do dia, ou 'backlog'

  const pendentes = posts.filter((p) => !p.agenda)
  const porDia = useMemo(() => {
    const m = {}
    for (const p of posts) if (p.agenda) (m[p.agenda] ||= []).push(p)
    return m
  }, [posts])

  // grava/limpa a data no item. chave null = volta pro backlog.
  function agendar(post, chave) {
    update((n) => {
      if (post.tipo === 'quadrinho') {
        const q = (n.quadrinhos || []).find((x) => x.id === post.id)
        if (q) { if (chave) q.agenda = chave; else delete q.agenda }
      } else {
        const s = (n.sagas || []).find((x) => x.id === post.sagaId)
        const ep = s && (s.episodios || []).find((x) => x.id === post.id)
        if (ep) { if (chave) ep.agenda = chave; else delete ep.agenda }
      }
    })
  }

  // marca/desmarca o post como já publicado. Mora no próprio item (q.postado /
  // ep.postado), igual à agenda, então persiste sem tabela paralela.
  function marcarPostado(post, valor) {
    update((n) => {
      if (post.tipo === 'quadrinho') {
        const q = (n.quadrinhos || []).find((x) => x.id === post.id)
        if (q) { if (valor) q.postado = true; else delete q.postado }
      } else {
        const s = (n.sagas || []).find((x) => x.id === post.sagaId)
        const ep = s && (s.episodios || []).find((x) => x.id === post.id)
        if (ep) { if (valor) ep.postado = true; else delete ep.postado }
      }
    })
  }

  // A key do post viaja no dataTransfer, não no state: dragstart e drop podem cair
  // no mesmo ciclo (e um `arrastando` de state ainda estaria velho no closure do
  // drop). O state `arrastando` fica só pro feedback visual de opacidade.
  function soltarEm(e, chave) {
    e.preventDefault()
    const key = e.dataTransfer.getData('text/plain')
    const post = posts.find((p) => p.key === key)
    if (post) agendar(post, chave)
    setArrastando(null)
    setAlvo(null)
  }

  function abrir(post) {
    if (post.tipo === 'quadrinho') nav.quadrinho(post.id)
    else nav.episodio(post.sagaId, post.id)
  }

  // um card de post: é a própria arte de preview, sem textos (o nome fica no
  // tooltip). `agendado` mostra o botão de tirar do dia.
  function Card({ post, agendado }) {
    const temCapa = post.capa && existing[post.capa]
    return (
      <article
        className={'cron-card' + (arrastando?.key === post.key ? ' arrastando' : '') + (post.postado ? ' postado' : '')}
        draggable
        onDragStart={(e) => { e.dataTransfer.setData('text/plain', post.key); e.dataTransfer.effectAllowed = 'move'; setArrastando(post) }}
        onDragEnd={() => { setArrastando(null); setAlvo(null) }}
        onClick={() => abrir(post)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter') abrir(post) }}
        title={`${post.titulo} · ${post.formato}${post.selo ? ' · ' + post.selo : ''}`}
      >
        {temCapa
          ? <img className="cron-card-img" src={'/files/' + post.capa + (bust ? '?v=' + bust : '')} alt={post.titulo} />
          : <div className="cron-card-icone"><Icon name={post.tipo === 'episodio' ? 'video' : 'quadrinhos'} size={30} /></div>}
        {/* vídeo: play por cima do primeiro frame pra distinguir de quadrinho */}
        {post.tipo === 'episodio' && temCapa && (
          <span className="cron-card-play"><Icon name="previa" size={18} /></span>
        )}
        <span className={'cron-dot' + (post.pronto ? ' ok' : '')}
          title={post.pronto ? 'Pronto pra postar' : `Em produção · ${post.progresso}`} />
        {agendado && (
          <button className="cron-card-x" title="Tirar do dia"
            onClick={(e) => { e.stopPropagation(); agendar(post, null) }}>
            <Icon name="x" size={12} />
          </button>
        )}
        {agendado && (
          <button
            className={'cron-card-check' + (post.postado ? ' on' : '')}
            title={post.postado ? 'Postado · clique pra desmarcar' : 'Marcar como postado'}
            onClick={(e) => { e.stopPropagation(); marcarPostado(post, !post.postado) }}>
            <Icon name="check" size={13} />
          </button>
        )}
      </article>
    )
  }

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
      <section
        className={'cron-backlog' + (alvo === 'backlog' ? ' alvo' : '')}
        onDragOver={(e) => { e.preventDefault(); setAlvo('backlog') }}
        onDragLeave={() => setAlvo((a) => (a === 'backlog' ? null : a))}
        onDrop={(e) => soltarEm(e, null)}
      >
        <div className="cron-backlog-head">
          <span>Pendentes <span className="cron-contador">{pendentes.length}</span></span>
          <span className="hint">arraste pra um dia →</span>
        </div>
        <div className="cron-backlog-row">
          {pendentes.length === 0
            ? <div className="cron-vazio">Nada na fila. Tudo agendado. ✓</div>
            : pendentes.map((p) => <Card key={p.key} post={p} />)}
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
              onDragOver={(e) => { e.preventDefault(); setAlvo(chave) }}
              onDragLeave={() => setAlvo((a) => (a === chave ? null : a))}
              onDrop={(e) => soltarEm(e, chave)}
            >
              <div className="cron-dia-head">
                <span className="cron-dia-nome">{rotuloDiaCurto(d)}</span>
                <span className="cron-dia-num">{d.getDate()}</span>
              </div>
              <div className="cron-dia-corpo">
                {doDia.map((p) => <Card key={p.key} post={p} agendado />)}
              </div>
            </div>
          )
        })}
      </section>
    </div>
  )
}
