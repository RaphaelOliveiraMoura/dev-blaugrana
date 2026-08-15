import React from 'react'
import { CANAIS, CANAL_TODOS, canalDo } from '../../shared/canais.mjs'

// CHIPS DE CANAL nas listagens — o filtro RÁPIDO, irmão dos chips de publicação e de série.
//
// A diferença pro seletor do header não é cosmética, e é ela que justifica os dois existirem:
//
//   seletor do header  = o canal em que você ESTÁ trabalhando. Grava em `projeto.canalAtivo`,
//                        vale pra todas as telas e sobrevive ao recarregar (custa um save).
//   chips daqui        = uma OLHADA no outro canal. Estado local da tela, não grava nada, some
//                        ao sair.
//
// Por isso o chip nasce no canal global e pode divergir dele sem conflito: um é a preferência,
// o outro é o gesto. Quando divergem, o rótulo avisa, senão a lista mostra um recorte que a
// pessoa não pediu e nada na tela explica por quê.
export function FiltroCanal({ valor, onChange, itens, canalGlobal, rotulo = 'Canal' }) {
  const n = (id) => (id === CANAL_TODOS
    ? (itens || []).length
    : (itens || []).filter((i) => canalDo(i) === id).length)

  const opcoes = [{ id: CANAL_TODOS, label: 'Os dois' }, ...CANAIS.map((c) => ({ id: c.id, label: c.nome }))]
  const divergindo = canalGlobal && valor !== canalGlobal

  return (
    <div className="quad-filtros quad-filtros-canal" role="group" aria-label="Filtrar por canal">
      <span className="quad-filtros-rot">{rotulo}</span>
      {opcoes.map((o) => (
        <button
          key={o.id}
          type="button"
          className={'quad-filtro' + (valor === o.id ? ' active' : '')}
          aria-pressed={valor === o.id}
          onClick={() => onChange(o.id)}
          title={o.id === CANAL_TODOS ? 'Mostra o conteúdo dos dois perfis' : `Só o conteúdo de ${o.label}`}
        >
          {o.label}
          <span className="quad-filtro-n">{n(o.id)}</span>
        </button>
      ))}
      {divergindo && (
        <span className="hint" title="O seletor do header continua como está; este filtro é só desta tela.">
          só nesta tela
        </span>
      )}
    </div>
  )
}
