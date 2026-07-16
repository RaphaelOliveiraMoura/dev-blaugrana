import React, { useState } from 'react'
import { CharAvatar, GenerateButton, NovoItemModal, Icon } from '../../components/index.js'
import { blankChar } from '../../lib/scaffold.js'
import { fichaImagem } from '../../../shared/caminhos.mjs'
import { useStudio } from '../../app/StudioContext.jsx'
import { refInfoDaFicha } from '../../lib/refs.js'

// Um personagem do elenco do quadrinho. Espelha o da saga: a ficha inteira mora no
// pool, num lugar só, e a linha leva direto pro card dele; gerar continua aqui,
// porque é o passo que destrava as artes dos painéis.
function ElencoLinha({ p, quad, onRemover }) {
  const { dados, existing, bust, jobs, startGen, nav } = useStudio()
  const temFicha = !!existing[p.imagem]
  const outros = (dados.quadrinhos || []).filter((q) => q.id !== quad.id && (q.elenco || []).includes(p.id)).map((q) => q.titulo)
  const est = (dados.estilos || []).find((e) => e.id === p.estiloId)

  return (
    <div className="char-row">
      <div className="char-row-bar">
        <button className="char-row-main" onClick={() => nav.personagem(p.id)} title="Abrir a ficha no pool">
          <CharAvatar p={p} existing={existing} bust={bust} />
          <span className="char-row-body">
            <span className="char-row-nome">{p.nome || <span className="muted">sem nome</span>}</span>
            <span className="char-row-sub">{p.arquetipo}</span>
          </span>
          {outros.length > 0 && <span className="char-cross">também em: {outros.join(', ')}</span>}
          <span className={'char-row-ficha' + (temFicha ? ' ok' : '')}>
            <Icon name={temFicha ? 'check' : 'alerta'} size={12} />
            {temFicha ? 'ficha pronta' : 'sem ficha'}
          </span>
          <span className="char-row-toggle"><Icon name="chevron" size={13} /></span>
        </button>
        {!temFicha && (
          <GenerateButton
            payload={{ tipo: 'ficha', personagemId: p.id }}
            targetPath={p.imagem}
            existing={existing}
            jobs={jobs}
            startGen={startGen}
            label="Gerar ficha"
            refInfo={refInfoDaFicha(p, est, existing)}
          />
        )}
        <button className="btn btn-ghost btn-icon btn-sm btn-danger" onClick={() => onRemover(p.id)}
          title="Tira do elenco deste quadrinho; não apaga o personagem do pool">
          <Icon name="x" size={13} />
        </button>
      </div>
    </div>
  )
}

export function QuadrinhoElenco({ quad, qi, byId, onRemover }) {
  const { dados, update, nav } = useStudio()
  const [criando, setCriando] = useState(false)
  const elenco = quad.elenco.map((id) => byId[id]).filter(Boolean)
  const foraDoElenco = dados.personagens.filter((p) => !quad.elenco.includes(p.id))

  function addAoElenco(pid) {
    update((n) => { if (!n.quadrinhos[qi].elenco.includes(pid)) n.quadrinhos[qi].elenco.push(pid) })
  }
  function criarPersonagem({ id, titulo }) {
    const p = blankChar(dados.personagens.map((x) => x.id), { id, nome: titulo })
    update((n) => { n.personagens.push(p); n.quadrinhos[qi].elenco.push(p.id) })
    setCriando(false)
    // a ficha se preenche no pool; ele já entrou no elenco e estará aqui na volta
    nav.personagem(p.id)
  }

  return (
    <>
      {criando && (
        <NovoItemModal
          titulo="Novo personagem"
          rotuloNome="Nome do personagem"
          exemploNome="Ex: O Barbeiro"
          idsExistentes={dados.personagens.map((p) => p.id)}
          previewPasta={(id) => fichaImagem(id)}
          onCriar={criarPersonagem}
          onCancel={() => setCriando(false)}
        />
      )}
      <div className="section-head">
        <h3 className="section-title">Elenco</h3>
        <div className="row-actions">
          {foraDoElenco.length > 0 && (
            <select className="field field-auto" value="" onChange={(e) => { if (e.target.value) addAoElenco(e.target.value) }}>
              <option value="">Adicionar do pool…</option>
              {foraDoElenco.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          )}
          <button className="btn btn-sm" onClick={() => setCriando(true)}><Icon name="plus" size={12} /> Novo personagem</button>
        </div>
      </div>
      {elenco.length === 0
        ? <p className="hint">Sem elenco. Adicione do pool ou crie um novo: as fichas viram referência das artes.</p>
        : (
          <div className="char-list">
            {elenco.map((p) => (
              <ElencoLinha key={p.id} p={p} quad={quad} onRemover={onRemover} />
            ))}
          </div>
        )}
    </>
  )
}
