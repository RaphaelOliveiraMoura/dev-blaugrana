import React from 'react'
import { Icon } from '../../components/index.js'
import { useStudio } from '../../app/StudioContext.jsx'
import { hojeChave, chaveData, addDias } from '../../lib/agenda.js'

// O ESTADO DE PUBLICAÇÃO do quadrinho, dentro da peça.
//
// Os mesmos dois campos que o Cronograma move (`quad.agenda`, uma data 'YYYY-MM-DD', e
// `quad.postado`), editáveis aqui. Não é tabela nova nem estado paralelo: é a MESMA gaveta,
// vista de outro lugar. O cronograma responde "o que sai esta semana"; esta aba responde "e
// esta peça aqui, saiu?", que é a pergunta que se faz com o quadrinho aberto na frente.
//
// DUAS COISAS QUE O CRONOGRAMA NÃO FAZ, e são o motivo desta seção existir:
//
//   1. Lá, marcar como postado só existe pra item AGENDADO: o botão mora no card de um dia da
//      semana, então peça sem data não tem onde ser marcada. Quem publicou fora do plano é
//      obrigado a agendar primeiro (arrastar pro dia) só pra depois poder dizer que já saiu.
//      Medido em 12/08/2026: os 64 quadrinhos postados TÊM agenda, ou seja, ninguém caiu nessa
//      ainda. É fricção de fluxo, não buraco de dado, e some quando o botão mora na peça.
//   2. Lá a semana é ROLANTE, e essa é a que dói. Medido no mesmo dia: 92 quadrinhos têm
//      agenda e só 7 caem na semana visível. Os outros 85 não aparecem em tela nenhuma, então
//      abrir uma peça antiga não respondia "isso já saiu?". Aqui o estado viaja com ela.
//
// A DATA É `<input type="date">` DE PROPÓSITO. O formato 'YYYY-MM-DD' com ANO é obrigatório: o
// cronograma casa `item.agenda` com a chave do dia, e data sem ano não bate com dia nenhum E
// não conta como pendente, então o item some das DUAS listas sem erro. Aconteceu com 58
// episódios de uma vez. Hoje o store devolve 400, mas o input nativo já entrega o formato
// certo por construção, que é a camada 1: não existe como digitar errado aqui.
export function QuadrinhoStatus({ quad, qi }) {
  const { update } = useStudio()
  const hoje = hojeChave()

  const setAgenda = (v) => update((n) => {
    if (v) n.quadrinhos[qi].agenda = v
    else delete n.quadrinhos[qi].agenda
  })
  // `postado` some do JSON quando falso, igual ao cronograma: o dado guarda o que aconteceu,
  // não um `false` em cada peça que ainda não saiu.
  const setPostado = (v) => update((n) => {
    if (v) n.quadrinhos[qi].postado = true
    else delete n.quadrinhos[qi].postado
  })

  const postado = !!quad.postado
  const agenda = quad.agenda || ''
  const atrasado = !postado && agenda && agenda < hoje
  const estado = postado ? 'postado' : agenda ? (atrasado ? 'atrasado' : 'agendado') : 'pendente'

  const ROTULO = {
    postado: { txt: 'Publicado', icon: 'check' },
    agendado: { txt: 'Agendado', icon: 'relogio' },
    atrasado: { txt: 'Passou da data', icon: 'alerta' },
    pendente: { txt: 'Sem data', icon: 'relogio' },
  }[estado]

  // Data legível a partir da chave, montada dos componentes e NUNCA de `new Date(chave)`:
  // 'YYYY-MM-DD' é parseado como UTC, e no fuso do Brasil isso mostra o dia anterior.
  const legivel = (chave) => {
    const [a, m, d] = chave.split('-')
    return `${d}/${m}/${a}`
  }

  return (
    <div className="panel">
      <div className="pub-estado">
        <span className={'pub-chip ' + estado}>
          <Icon name={ROTULO.icon} size={13} /> {ROTULO.txt}
        </span>
        <span className="hint">
          {postado ? 'Esta peça já foi ao ar.'
            : atrasado ? `Estava marcada pra ${legivel(agenda)} e ainda não foi marcada como publicada.`
              : agenda ? `Sai em ${legivel(agenda)}.`
                : 'Sem data no cronograma. Ela fica na fila de pendentes, pra você arrastar pra um dia.'}
        </span>
      </div>

      <button
        className={'btn mt-3 ' + (postado ? '' : 'btn-primary')}
        onClick={() => setPostado(!postado)}>
        <Icon name={postado ? 'x' : 'check'} size={14} />
        {postado ? 'Desmarcar: não foi publicado' : 'Marcar como publicado'}
      </button>

      <div className="pub-data mt-4">
        <span className="hint">Data no cronograma</span>
        <input
          className="field" type="date" value={agenda}
          onChange={(e) => setAgenda(e.target.value)}
          title="A data em que a peça sai. O cronograma casa este campo com o dia da semana."
        />
        {!agenda && (
          <>
            <button className="btn btn-sm" onClick={() => setAgenda(hoje)}>Hoje</button>
            <button className="btn btn-sm" onClick={() => setAgenda(chaveData(addDias(new Date(), 1)))}>Amanhã</button>
          </>
        )}
        {agenda && (
          <button className="btn btn-sm btn-ghost" onClick={() => setAgenda('')} title="Volta pra fila de pendentes">
            <Icon name="x" size={11} /> tirar do dia
          </button>
        )}
      </div>

      <p className="hint mt-2">
        Os dois campos são os MESMOS que o Cronograma move: mudar aqui muda lá, e vice-versa.
        A diferença é o alcance: lá a semana é rolante e o que já saiu some da tela, aqui o
        estado viaja com a peça.
      </p>
    </div>
  )
}
