import React, { useState } from 'react'
import { ConfirmModal } from '../../components/index.js'
import { dupSaga } from '../../lib/scaffold.js'
import { useStudio } from '../../app/StudioContext.jsx'
import { acharSaga } from '../../lib/localizar.js'
import { SagaFicha } from './SagaFicha.jsx'
import { SagaEpisodios } from './SagaEpisodios.jsx'
import { SagaElenco } from './SagaElenco.jsx'

// SAGA: a ficha resume numa linha, os episódios abrem na primeira dobra.
export default function SagaView({ sagaId }) {
  const { dados, update, nav } = useStudio()
  const { saga, si } = acharSaga(dados, sagaId)
  const byId = Object.fromEntries(dados.personagens.map((p) => [p.id, p]))
  const [confirm, setConfirm] = useState(null)

  function duplicarSaga() {
    const copia = dupSaga(saga, dados.sagas.map((s) => s.id))
    update((n) => { n.sagas.splice(si + 1, 0, copia) })
    nav.saga(copia.id)
  }
  function excluirSaga() {
    setConfirm({
      titulo: 'Excluir saga?',
      mensagem: `A saga "${saga.titulo}" e seus ${saga.episodios.length} episódio(s) saem dos dados.\n\nOs ARQUIVOS de imagem e vídeo continuam no disco. Salve depois para efetivar.`,
      confirmar: 'Excluir', perigo: true,
      onConfirm: () => { setConfirm(null); nav.ir('sagas'); update((n) => { n.sagas.splice(si, 1) }) },
    })
  }
  function excluirEp(ei) {
    const ep = saga.episodios[ei]
    setConfirm({
      titulo: 'Excluir episódio?',
      mensagem: `O episódio "${ep.titulo}" (${ep.id}) sai da saga. Os arquivos no disco continuam. Salve depois para efetivar.`,
      confirmar: 'Excluir', perigo: true,
      onConfirm: () => { setConfirm(null); update((n) => { n.sagas[si].episodios.splice(ei, 1) }) },
    })
  }
  function removerDoElenco(pid) {
    setConfirm({
      titulo: 'Tirar do elenco?',
      mensagem: `"${byId[pid]?.nome || pid}" sai do elenco desta saga.\n\nA ficha e a imagem continuam no pool: dá pra readicionar por "Adicionar do pool". Salve para efetivar.`,
      confirmar: 'Tirar do elenco', perigo: true,
      onConfirm: () => { setConfirm(null); update((n) => { n.sagas[si].elenco = n.sagas[si].elenco.filter((x) => x !== pid) }) },
    })
  }

  return (
    <div>
      {confirm && <ConfirmModal {...confirm} onCancel={() => setConfirm(null)} />}
      <SagaFicha saga={saga} si={si} onDuplicar={duplicarSaga} onExcluir={excluirSaga} />
      <SagaEpisodios saga={saga} si={si} onExcluirEp={excluirEp} />
      <SagaElenco saga={saga} si={si} byId={byId} onRemover={removerDoElenco} />
    </div>
  )
}
