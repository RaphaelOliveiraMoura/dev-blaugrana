import React, { useState } from 'react'
import { Icon } from '../../components/index.js'
import { useStudio } from '../../app/StudioContext.jsx'
import { gerarPrevia } from '../../api/balao.js'

// A FALA DO PAINEL, editável direto no card da grade.
//
// Mora aqui, e não numa aba própria, porque aba própria foi o que se tentou primeiro: uma
// grade de painéis ao lado de outra grade de painéis, mostrando a mesma arte, e ninguém
// conseguia dizer para que servia cada uma. O que o trabalho em série pedia era o campo à
// vista na grade que já existe, não uma segunda tela.
//
// É `painel.falas`, o MESMO campo do detalhe do painel e o mesmo que vira instrução de balão
// no prompt. Editar aqui, lá ou no posicionador mexe no mesmo dado.
export function FalasInline({ quad, qi, painel, i, byId, porCodigo, onPosicionar }) {
  const { update, marcarGerado } = useStudio()
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState(null)

  const falas = painel.falas || []
  const elenco = quad.elenco || []
  const comTexto = falas.filter((f) => (f.texto || '').trim()).length

  const setFalas = (v) => update((n) => { n.quadrinhos[qi].paineis[i].falas = v })
  const trocar = (k, f) => setFalas(falas.map((x, j) => (j === k ? f : x)))
  const remover = (k) => setFalas(falas.filter((_, j) => j !== k))
  const adicionar = () => setFalas([...falas, { personagem: elenco[0] || '', texto: '' }])

  // Só faz sentido no modo por código: lá o slide é redesenhado na hora, sem IA. No modo da
  // IA a fala só vira desenho na próxima geração do painel, e o botão prometeria o contrário.
  async function atualizarPrevia() {
    if (gerando) return
    setGerando(true); setErro(null)
    try {
      const r = await gerarPrevia({ quadrinhoId: quad.id, painelNumero: painel.numero })
      marcarGerado(r.path)
    } catch (e) { setErro(e.message) } finally { setGerando(false) }
  }

  return (
    <>
      {falas.map((f, k) => (
        <div className="fala-linha" key={k}>
          {elenco.length > 1 && (
            <select className="field fala-quem" value={f.personagem || ''}
              onChange={(e) => trocar(k, { ...f, personagem: e.target.value })}>
              {elenco.map((id) => <option key={id} value={id}>{byId[id]?.nome || id}</option>)}
            </select>
          )}
          <textarea
            className="field balao-input" rows={2} value={f.texto || ''}
            placeholder="fala do personagem (curta, CAIXA ALTA rende mais)"
            onChange={(e) => trocar(k, { ...f, texto: e.target.value })}
          />
          <button className="btn btn-ghost btn-icon btn-sm btn-danger fala-del"
            onClick={() => remover(k)} title="Remover esta fala">
            <Icon name="x" size={12} />
          </button>
        </div>
      ))}

      <div className="fala-acoes">
        <button className="btn btn-sm" onClick={adicionar} title="Mais uma fala neste painel">
          <Icon name="plus" size={12} /> fala
        </button>
        {porCodigo && comTexto > 0 && (
          <>
            <button className="btn btn-sm" onClick={onPosicionar} title="Arrastar o balão e a ponta sobre a arte">
              <Icon name="editar" size={12} /> posição
            </button>
            <button className="btn btn-sm" onClick={atualizarPrevia} disabled={gerando}
              title="Redesenha o slide deste painel com as falas atuais">
              {gerando ? <span className="gen-spinner" /> : <Icon name="balao" size={13} />}
              {gerando ? 'gerando…' : 'prévia'}
            </button>
          </>
        )}
      </div>
      {erro && <p className="hint balao-erro"><Icon name="alerta" size={12} /> {erro}</p>}
    </>
  )
}
