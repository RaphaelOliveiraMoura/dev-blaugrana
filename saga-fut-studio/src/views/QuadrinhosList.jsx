import React, { useState } from 'react'
import { CharAvatar, NovoItemModal } from '../components/index.js'
import { quadProgress } from '../lib/progresso.js'
import { TIPOS_QUADRINHO } from '../lib/formatos.js'
import { blankQuadrinho } from '../lib/scaffold.js'
import { useStudio } from '../app/StudioContext.jsx'

// QUADRINHOS: grade dos quadrinhos (imagem). Criar por tipo (charge/tirinha/carrossel).
export default function QuadrinhosList() {
  const { dados, update, existing, progress, bust, nav } = useStudio()
  const byId = Object.fromEntries(dados.personagens.map((p) => [p.id, p]))
  const quadrinhos = dados.quadrinhos || []
  const [criando, setCriando] = useState(null) // o tipo escolhido, ou null

  // cria um quadrinho em branco do tipo pedido e abre ele
  function novoQuadrinho({ id, titulo }) {
    const q = blankQuadrinho(quadrinhos.map((x) => x.id), criando, { id, titulo })
    update((n) => { if (!n.quadrinhos) n.quadrinhos = []; n.quadrinhos.push(q) })
    setCriando(null)
    nav.quadrinho(q.id)
  }

  return (
    <div>
      {criando && (
        <NovoItemModal
          titulo={`🗯 Novo quadrinho, ${TIPOS_QUADRINHO[criando]?.label || criando}`}
          rotuloNome="Nome do quadrinho"
          exemploNome="Ex: Nada a Declarar"
          idsExistentes={quadrinhos.map((q) => q.id)}
          previewPasta={(id) => `quadrinhos/${id}/`}
          onCriar={novoQuadrinho}
          onCancel={() => setCriando(null)}
        />
      )}
      <div className="section-head">
        <h3 className="section-title">🗯 Quadrinhos (imagem)</h3>
        <div className="row-actions">
          {Object.entries(TIPOS_QUADRINHO).map(([tipo, meta]) => (
            <button key={tipo} className="mini-btn" onClick={() => setCriando(tipo)} title={meta.label}>
              ＋ {tipo}
            </button>
          ))}
        </div>
      </div>
      <p className="muted" style={{ margin: '0 0 14px', fontSize: 13 }}>
        Motor barato e rápido: a IA desenha os painéis (e os balões) a partir do seu roteiro. Charge = 1 painel de reação;
        tirinha = setup + punchline; carrossel = a saga desliza em 6-10 quadros (o save é o sinal nº 1 do Instagram).
      </p>
      <div className="saga-grid">
        {quadrinhos.map((q) => {
          const prog = quadProgress(q, progress)
          const capa = (q.paineis || [])[0]
          return (
            <div className="saga-card" key={q.id} onClick={() => nav.quadrinho(q.id)}>
              <div className="saga-card-head">
                <span className="selo">{q.selo}</span>
                <span className="saga-status">{TIPOS_QUADRINHO[q.tipo]?.label || q.tipo}</span>
              </div>
              <h3>{q.titulo}</h3>
              <p className="muted">{q.contexto}</p>
              <div className="quad-capa">
                {capa && existing[capa.imagem]
                  ? <img src={'/files/' + capa.imagem + (bust ? '?v=' + bust : '')} alt="" />
                  : <span className="quad-capa-empty">🗯</span>}
              </div>
              <div className="saga-card-cast">
                {(q.elenco || []).map((id) => byId[id] && <CharAvatar key={id} p={byId[id]} existing={existing} bust={bust} />)}
              </div>
              <div className="saga-card-foot">
                <span>{prog.img}/{prog.total} painéis prontos</span>
                <div className="bar"><div className="bar-fill" style={{ width: `${prog.total ? (prog.img / prog.total) * 100 : 0}%` }} /></div>
              </div>
            </div>
          )
        })}
        <div className="saga-card saga-card-new" onClick={() => setCriando('tirinha')} title="Cria um quadrinho em branco e abre para edição">
          <h3>＋ Novo quadrinho</h3>
          <p className="muted">Tirinha, charge ou carrossel. Reusa o pool de personagens e os estilos. Ideal pro registro cômico/resenha.</p>
        </div>
      </div>
    </div>
  )
}
