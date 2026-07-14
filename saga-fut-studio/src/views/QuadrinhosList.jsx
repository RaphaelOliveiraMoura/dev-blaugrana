import React from 'react'
import { CharAvatar } from '../ui.jsx'
import { quadProgress, TIPOS_QUADRINHO } from '../lib/helpers.js'

// QUADRINHOS: grade dos quadrinhos (imagem). Criar por tipo (charge/tirinha/carrossel).
export default function QuadrinhosList({ dados, existing, progress, goQuad, bust, onNewQuad }) {
  const byId = Object.fromEntries(dados.personagens.map((p) => [p.id, p]))
  const quadrinhos = dados.quadrinhos || []
  return (
    <div>
      <div className="section-head">
        <h3 className="section-title">🗯 Quadrinhos (imagem)</h3>
        <div className="row-actions">
          {Object.entries(TIPOS_QUADRINHO).map(([tipo, meta]) => (
            <button key={tipo} className="mini-btn" onClick={() => onNewQuad(tipo)} title={meta.label}>
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
        {quadrinhos.map((q, qi) => {
          const prog = quadProgress(q, progress)
          const capa = (q.paineis || [])[0]
          return (
            <div className="saga-card" key={q.id} onClick={() => goQuad(qi)}>
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
        <div className="saga-card saga-card-new" onClick={() => onNewQuad('tirinha')} title="Cria um quadrinho em branco e abre para edição">
          <h3>＋ Novo quadrinho</h3>
          <p className="muted">Tirinha, charge ou carrossel. Reusa o pool de personagens e os estilos. Ideal pro registro cômico/resenha.</p>
        </div>
      </div>
    </div>
  )
}
