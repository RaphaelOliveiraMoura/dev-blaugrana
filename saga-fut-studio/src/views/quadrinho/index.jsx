import React, { useState } from 'react'
import { ConfirmModal, NovoItemModal, PromptBlock, CopyButton, Icon } from '../../components/index.js'
import { dupQuadrinho, blankChar } from '../../lib/scaffold.js'
import { fichaImagem } from '../../../shared/caminhos.mjs'
import { useStudio } from '../../app/StudioContext.jsx'
import { acharQuadrinho } from '../../lib/localizar.js'
import { QuadrinhoFicha } from './QuadrinhoFicha.jsx'
import { QuadrinhoPaineis } from './QuadrinhoPaineis.jsx'
import { QuadrinhoVideo } from './QuadrinhoVideo.jsx'

// QUADRINHO: a ficha resume numa linha, os painéis abrem na primeira dobra.
export default function QuadrinhoView({ quadId }) {
  const { dados, update, existing, nav } = useStudio()
  const { quad, qi } = acharQuadrinho(dados, quadId)
  const byId = Object.fromEntries(dados.personagens.map((p) => [p.id, p]))
  const [confirm, setConfirm] = useState(null)
  const [criandoChar, setCriandoChar] = useState(false)

  function duplicar() {
    const copia = dupQuadrinho(quad, dados.quadrinhos.map((q) => q.id))
    update((n) => { n.quadrinhos.splice(qi + 1, 0, copia) })
    nav.quadrinho(copia.id)
  }
  function excluir() {
    setConfirm({
      titulo: 'Excluir quadrinho?',
      mensagem: `"${quad.titulo}" sai dos dados. As artes no disco continuam. Salve depois para efetivar.`,
      confirmar: 'Excluir', perigo: true,
      onConfirm: () => { setConfirm(null); nav.ir('quadrinhos'); update((n) => { n.quadrinhos.splice(qi, 1) }) },
    })
  }
  function excluirPainel(i) {
    const p = quad.paineis[i]
    setConfirm({
      titulo: 'Excluir painel?',
      mensagem: `O painel ${p.numero} sai do quadrinho. A arte no disco continua. Salve depois para efetivar.`,
      confirmar: 'Excluir', perigo: true,
      onConfirm: () => { setConfirm(null); update((n) => { n.quadrinhos[qi].paineis.splice(i, 1) }) },
    })
  }
  function addAoElenco(pid) { update((n) => { if (!n.quadrinhos[qi].elenco.includes(pid)) n.quadrinhos[qi].elenco.push(pid) }) }
  function removerDoElenco(pid) { update((n) => { n.quadrinhos[qi].elenco = n.quadrinhos[qi].elenco.filter((x) => x !== pid) }) }
  function criarPersonagem({ id, titulo }) {
    const p = blankChar(dados.personagens.map((x) => x.id), { id, nome: titulo })
    update((n) => { n.personagens.push(p); n.quadrinhos[qi].elenco.push(p.id) })
    setCriandoChar(false)
    // a ficha se preenche no pool; ele já entrou no elenco e estará aqui na volta
    nav.personagem(p.id)
  }
  const foraDoElenco = dados.personagens.filter((p) => !quad.elenco.includes(p.id))

  return (
    <div>
      {confirm && <ConfirmModal {...confirm} onCancel={() => setConfirm(null)} />}
      {criandoChar && (
        <NovoItemModal
          titulo="Novo personagem"
          rotuloNome="Nome do personagem"
          exemploNome="Ex: O Barbeiro"
          idsExistentes={dados.personagens.map((p) => p.id)}
          previewPasta={(id) => fichaImagem(id)}
          onCriar={criarPersonagem}
          onCancel={() => setCriandoChar(false)}
        />
      )}

      <QuadrinhoFicha quad={quad} qi={qi} onDuplicar={duplicar} onExcluir={excluir} />

      {/* elenco antes dos painéis: as falas escolhem quem fala a partir daqui */}
      <div className="section-head">
        <h3 className="section-title">Elenco</h3>
        <div className="row-actions">
          {foraDoElenco.length > 0 && (
            <select className="field field-auto" value="" onChange={(e) => { if (e.target.value) addAoElenco(e.target.value) }}>
              <option value="">Adicionar do pool…</option>
              {foraDoElenco.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          )}
          <button className="btn btn-sm" onClick={() => setCriandoChar(true)}><Icon name="plus" size={12} /> Novo personagem</button>
        </div>
      </div>
      <div className="cast-editor">
        {quad.elenco.length === 0
          ? <span className="hint">Sem elenco. Adicione do pool ou crie um novo: as fichas viram referência das artes.</span>
          : quad.elenco.map((id) => (
            <button key={id} className="cast-chip in" title="Clique para tirar do elenco" onClick={() => removerDoElenco(id)}>
              {byId[id]?.nome || id}
              <Icon name="x" size={11} />
            </button>
          ))}
      </div>

      <QuadrinhoPaineis quad={quad} qi={qi} byId={byId} onExcluirPainel={excluirPainel} />

      {/* o vídeo antes de publicar: é ele que a legenda vai acompanhar */}
      <div className="section-head"><h3 className="section-title">Vídeo</h3></div>
      <QuadrinhoVideo quad={quad} qi={qi} />

      <div className="section-head"><h3 className="section-title">Publicar</h3></div>
      <div className="panel">
        <PromptBlock
          label="Legenda do post"
          tool="peça save e share"
          value={quad.legenda || ''}
          onChange={(v) => update((n) => { n.quadrinhos[qi].legenda = v })}
          hint="No Instagram o save é o sinal nº 1. Peça save ou DM na legenda, e ponha a palavra-chave (jogador, clube) no início."
        />
        <div className="quad-export">
          <span className="hint">Artes prontas, na ordem:</span>
          {quad.paineis.map((p) => (
            <span key={p.numero} className={'chip' + (existing[p.imagem] ? ' chip-ok' : '')}>
              {p.numero}
              {existing[p.imagem] && <Icon name="check" size={10} />}
            </span>
          ))}
          <CopyButton text={quad.paineis.map((p) => p.imagem).join('\n')} label="copiar caminhos" />
        </div>
      </div>
    </div>
  )
}
