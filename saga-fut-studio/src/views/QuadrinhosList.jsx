import React, { useState } from 'react'
import { CharAvatar, NovoItemModal, Icon, GrupoEstiloHead } from '../components/index.js'
import { quadProgress } from '../lib/progresso.js'
import { TIPOS_QUADRINHO } from '../lib/formatos.js'
import { agruparPorEstilo } from '../lib/agrupar.js'
import { blankQuadrinho } from '../lib/scaffold.js'
import { useStudio } from '../app/StudioContext.jsx'

// QUADRINHOS: grade dos quadrinhos (imagem). Criar por tipo (charge/tirinha/carrossel).
export default function QuadrinhosList() {
  const { dados, update, existing, progress, bust, nav } = useStudio()
  const byId = Object.fromEntries(dados.personagens.map((p) => [p.id, p]))
  const quadrinhos = dados.quadrinhos || []
  const [criando, setCriando] = useState(null) // o tipo escolhido, ou null
  const [filtro, setFiltro] = useState('todos') // todos | pendentes | publicados

  // "publicado" = quad.postado (booleano no topo do quadrinho)
  const contagem = {
    todos: quadrinhos.length,
    pendentes: quadrinhos.filter((q) => !q.postado).length,
    publicados: quadrinhos.filter((q) => q.postado).length,
  }
  const FILTROS = [
    { id: 'todos', label: 'Todos' },
    { id: 'pendentes', label: 'Não publicados' },
    { id: 'publicados', label: 'Publicados' },
  ]
  const filtrados = quadrinhos.filter((q) => (
    filtro === 'pendentes' ? !q.postado : filtro === 'publicados' ? !!q.postado : true
  ))

  // cria um quadrinho em branco do tipo pedido e abre ele
  function novoQuadrinho({ id, titulo }) {
    const q = blankQuadrinho(quadrinhos.map((x) => x.id), criando, { id, titulo })
    update((n) => { if (!n.quadrinhos) n.quadrinhos = []; n.quadrinhos.push(q) })
    setCriando(null)
    nav.quadrinho(q.id)
  }

  // por estilo, na ordem do catálogo; dentro de cada grupo, por título
  const grupos = agruparPorEstilo(filtrados, dados.estilos, (q) => q.titulo)

  return (
    <div>
      {criando && (
        <NovoItemModal
          titulo={`Novo quadrinho, ${TIPOS_QUADRINHO[criando]?.label || criando}`}
          rotuloNome="Nome do quadrinho"
          exemploNome="Ex: Nada a Declarar"
          idsExistentes={quadrinhos.map((q) => q.id)}
          previewPasta={(id) => `quadrinhos/${id}/`}
          onCriar={novoQuadrinho}
          onCancel={() => setCriando(null)}
        />
      )}

      <div className="section-head">
        <h3 className="section-title">Quadrinhos · imagem</h3>
        <div className="row-actions">
          {Object.entries(TIPOS_QUADRINHO).map(([tipo, meta]) => (
            <button key={tipo} className="btn btn-sm" onClick={() => setCriando(tipo)} title={meta.label}>
              <Icon name="plus" size={12} /> {tipo}
            </button>
          ))}
        </div>
      </div>

      <p className="hint intro">
        Motor barato e rápido: a IA desenha os painéis (e os balões) a partir do seu roteiro. Charge = 1 painel de reação;
        tirinha = setup + punchline; carrossel = a saga desliza em 6-10 quadros (o save é o sinal nº 1 do Instagram).
      </p>

      {/* filtro por status de publicação: por padrão o foco é o que falta postar */}
      <div className="quad-filtros" role="group" aria-label="Filtrar por publicação">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={'quad-filtro' + (filtro === f.id ? ' active' : '')}
            aria-pressed={filtro === f.id}
            onClick={() => setFiltro(f.id)}
          >
            {f.label}
            <span className="quad-filtro-n">{contagem[f.id]}</span>
          </button>
        ))}
      </div>

      {/* A capa é o card: o contexto é quase o mesmo em todos (a rodada da semana),
          então a descrição repetia 6 vezes sem distinguir nada. A arte distingue. */}
      {filtrados.length === 0 && (
        <p className="hint intro">Nenhum quadrinho {filtro === 'pendentes' ? 'pendente de publicação' : 'publicado'} por aqui.</p>
      )}

      {grupos.map((g) => (
        <div key={g.estiloId || '_sem'}>
          <GrupoEstiloHead nome={g.nome} n={g.itens.length} />
          <div className="quad-grid">
            {g.itens.map((q) => {
              const prog = quadProgress(q, progress)
              const capa = (q.paineis || [])[0]
              return (
                <div className="quad-card" key={q.id} onClick={() => nav.quadrinho(q.id)} role="button" tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') nav.quadrinho(q.id) }}>
                  <div className="quad-capa">
                    {capa && existing[capa.imagem]
                      ? <img src={'/files/' + capa.imagem + (bust ? '?v=' + bust : '')} alt="" />
                      : <Icon name="quadrinhos" size={22} className="quad-capa-empty" />}
                  </div>
                  <div className="quad-card-corpo">
                    <div className="quad-card-top">
                      <h3 title={q.titulo}>{q.titulo}</h3>
                      <div className="saga-card-cast">
                        {(q.elenco || []).map((id) => byId[id] && <CharAvatar key={id} p={byId[id]} existing={existing} bust={bust} />)}
                      </div>
                    </div>
                    {/* o tipo não vem: "3/3 painéis" já diz se é charge, tirinha ou
                        carrossel, e o rodapé de 240px não comporta os dois */}
                    <div className="quad-card-foot">
                      <span className="selo" title={TIPOS_QUADRINHO[q.tipo]?.label || q.tipo}>{q.selo}</span>
                      <span className={'quad-card-prog' + (prog.img === prog.total ? ' ok' : '')}>
                        {prog.img}/{prog.total} painéis
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* criar fica fora dos grupos: não pertence a estilo nenhum */}
      <div className="quad-grid">
        <div className="quad-card quad-card-new" onClick={() => setCriando('tirinha')} role="button" tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') setCriando('tirinha') }}>
          <Icon name="plus" size={14} /> Novo quadrinho
        </div>
      </div>
    </div>
  )
}
