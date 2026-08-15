import React from 'react'
import { Icon } from '../components/Icon.jsx'
import { useStudio } from './StudioContext.jsx'
import { CANAIS, CANAL_TODOS, CANAL_PADRAO } from '../../shared/canais.mjs'

// SELETOR DE CANAL — decide QUAL PERFIL você está tocando agora.
//
// Fica no header, ao lado do seletor de modelo, porque é da mesma família: configuração que muda
// o que todo o resto faz. A diferença é que este não gasta nada, só filtra: lista de quadrinhos,
// de vídeos, de sagas e o cronograma leem `projeto.canalAtivo`.
//
// O QUE ELE NÃO FAZ, e é de propósito: não escreve canal em item nenhum. O canal do item é dado
// editorial (mora no `canal` do quadrinho) e não pode depender de qual aba estava aberta quando
// alguém salvou. Trocar aqui nunca move conteúdo de perfil.
//
// "Todos" existe porque ver as duas filas juntas é útil pra distribuir esforço na semana. Ele não
// é um canal: nada se grava com esse valor, e por isso ele vive em CANAL_TODOS e não em CANAIS.
export function SeletorCanal() {
  const { dados, update } = useStudio()
  const atual = dados?.projeto?.canalAtivo || CANAL_PADRAO
  const ficha = CANAIS.find((c) => c.id === atual)
  const dica = ficha
    ? `Mostrando só o conteúdo de ${ficha.nome} (${ficha.assunto}). Vale pra lista, cronograma e fila de publicação.`
    : 'Mostrando o conteúdo dos dois perfis, com a marca de canal em cada card.'

  return (
    <label className="topbar-canal" title={dica}>
      <Icon name="quadrinhos" size={13} />
      <select
        className="field"
        value={atual}
        onChange={(e) => update((n) => { n.projeto.canalAtivo = e.target.value })}
        title={dica}
      >
        {CANAIS.map((c) => (
          <option key={c.id} value={c.id}>{c.nome}</option>
        ))}
        <option value={CANAL_TODOS}>os dois</option>
      </select>
    </label>
  )
}
