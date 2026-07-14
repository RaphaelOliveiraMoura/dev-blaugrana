import React, { useState } from 'react'
import {
  ConfirmModal, EditField, Media, PromptBlock, GenerateButton, FilePath, Icon,
} from '../components/index.js'
import { epProgress } from '../lib/progresso.js'
import { dupSaga, blankEp, uniqueId, allEpIds, dupEp, blankChar } from '../lib/scaffold.js'
import { epIdDe } from '../../shared/caminhos.mjs'
import { useStudio } from '../app/StudioContext.jsx'
import { acharSaga } from '../lib/localizar.js'

// SAGA: metadados + episódios + elenco + estilo
export default function SagaView({ sagaId }) {
  const { dados, update, existing, progress, bust, jobs, startGen, nav } = useStudio()
  const { saga, si } = acharSaga(dados, sagaId)
  const byId = Object.fromEntries(dados.personagens.map((p) => [p.id, p]))
  const elenco = saga.elenco.map((id) => byId[id]).filter(Boolean)
  const [confirm, setConfirm] = useState(null)
  const set = (campo, v) => update((n) => { n.sagas[si][campo] = v })

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
  function novoEpisodio() {
    const epId = uniqueId(epIdDe(saga.id, saga.episodios.length + 1), allEpIds(dados))
    update((n) => { n.sagas[si].episodios.push(blankEp(epId)) })
  }
  function duplicarEp(ei) {
    const copia = dupEp(saga.episodios[ei], dados)
    update((n) => { n.sagas[si].episodios.splice(ei + 1, 0, copia) })
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
  function addAoElenco(pid) { update((n) => { if (!n.sagas[si].elenco.includes(pid)) n.sagas[si].elenco.push(pid) }) }
  function removerDoElenco(pid) {
    setConfirm({
      titulo: 'Tirar do elenco?',
      mensagem: `"${byId[pid]?.nome || pid}" sai do elenco desta saga.\n\nA ficha e a imagem continuam no pool: dá pra readicionar por "Adicionar do pool". Salve para efetivar.`,
      confirmar: 'Tirar do elenco', perigo: true,
      onConfirm: () => { setConfirm(null); update((n) => { n.sagas[si].elenco = n.sagas[si].elenco.filter((x) => x !== pid) }) },
    })
  }
  function novoPersonagem() {
    const p = blankChar(dados.personagens.map((x) => x.id), '')
    update((n) => { n.personagens.push(p); n.sagas[si].elenco.push(p.id) })
  }
  const foraDoElenco = dados.personagens.filter((p) => !saga.elenco.includes(p.id))
  const est = (dados.estilos || []).find((e) => e.id === saga.estiloId)

  return (
    <div>
      {confirm && <ConfirmModal {...confirm} onCancel={() => setConfirm(null)} />}

      <div className="panel">
        <div className="saga-card-head">
          <span className="selo">{saga.selo}</span>
          <div className="row-actions">
            <button className="btn btn-sm" onClick={duplicarSaga}><Icon name="duplicar" size={12} /> Duplicar</button>
            <button className="btn btn-sm btn-danger" onClick={excluirSaga}><Icon name="trash" size={12} /> Excluir</button>
          </div>
        </div>
        <EditField label="Título" value={saga.titulo} onChange={(v) => set('titulo', v)} />
        <div className="field-row">
          <EditField label="Selo" value={saga.selo} onChange={(v) => set('selo', v)} />
          <EditField label="Gênero" value={saga.genero} onChange={(v) => set('genero', v)} />
          <EditField label="Status" value={saga.status} onChange={(v) => set('status', v)} />
        </div>
        <EditField label="Premissa" value={saga.premissa} onChange={(v) => set('premissa', v)} textarea />
        <EditField label="Tom do narrador" value={saga.narradorTom} onChange={(v) => set('narradorTom', v)} textarea />
      </div>

      <div className="section-head">
        <h3 className="section-title">{saga.episodios.length} episódios</h3>
        <button className="btn btn-sm" onClick={novoEpisodio}><Icon name="plus" size={12} /> Novo episódio</button>
      </div>
      <div className="ep-list">
        {saga.episodios.map((ep, ei) => {
          const prog = epProgress(ep, progress)
          return (
            <div className="ep-row" key={ep.id}>
              <div className="ep-row-main" onClick={() => nav.episodio(saga.id, ep.id)} role="button" tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') nav.episodio(saga.id, ep.id) }}>
                <div className="ep-row-thumb">
                  {existing[ep.cenas[0]?.imagem]
                    ? <img src={'/files/' + ep.cenas[0].imagem + (bust ? '?v=' + bust : '')} alt="" />
                    : <span>{ei + 1}</span>}
                </div>
                <div className="ep-row-body">
                  <div className="ep-row-title">{ep.id.toUpperCase()}, {ep.titulo}</div>
                  <div className="ep-row-sub">{ep.publicar}</div>
                </div>
                <div className="ep-row-prog">
                  <span title="imagens" className={prog.img === prog.total ? 'ok' : ''}>
                    <Icon name="imagem" size={12} /> {prog.img}/{prog.total}
                  </span>
                  <span title="vídeos" className={prog.vid === prog.total ? 'ok' : ''}>
                    <Icon name="video" size={12} /> {prog.vid}/{prog.total}
                  </span>
                  <span title="narração" className={prog.audio === prog.total ? 'ok' : ''}>
                    <Icon name="narracao" size={12} /> {prog.audio}/{prog.total}
                  </span>
                  {prog.done && <span className="ep-done"><Icon name="check" size={12} /> pronto</span>}
                </div>
              </div>
              <div className="ep-row-actions">
                <button className="btn btn-ghost btn-icon btn-sm" title="Duplicar episódio" onClick={() => duplicarEp(ei)}>
                  <Icon name="duplicar" size={13} />
                </button>
                <button className="btn btn-ghost btn-icon btn-sm btn-danger" title="Excluir episódio" onClick={() => excluirEp(ei)}>
                  <Icon name="trash" size={13} />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="section-head">
        <h3 className="section-title">Elenco da saga</h3>
        <div className="row-actions">
          {foraDoElenco.length > 0 && (
            <select className="field" value="" onChange={(e) => { if (e.target.value) addAoElenco(e.target.value) }}>
              <option value="">Adicionar do pool…</option>
              {foraDoElenco.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          )}
          <button className="btn btn-sm" onClick={novoPersonagem}><Icon name="plus" size={12} /> Novo personagem</button>
        </div>
      </div>
      {elenco.length === 0 && <p className="hint">Nenhum personagem ainda. Crie um novo ou adicione do pool acima.</p>}

      <div className="char-grid">
        {elenco.map((p) => {
          const pi = dados.personagens.findIndex((x) => x.id === p.id)
          const outras = dados.sagas.filter((s, j) => j !== si && s.elenco.includes(p.id)).map((s) => s.titulo)
          return (
            <div className="char-card" key={p.id}>
              <div className="char-img-wrap"><Media existing={existing} src={p.imagem} kind="img" bust={bust} /></div>
              <div className="char-body">
                <div className="char-card-top">
                  <span className="char-id" title="id, usado no nome do arquivo">{p.id}</span>
                  <button className="btn btn-ghost btn-sm btn-danger" onClick={() => removerDoElenco(p.id)}
                    title="Tira do elenco desta saga; não apaga o personagem do pool">
                    remover
                  </button>
                </div>
                <EditField label="Nome" value={p.nome} onChange={(v) => update((n) => { n.personagens[pi].nome = v })} />
                <EditField label="Arquétipo" value={p.arquetipo} onChange={(v) => update((n) => { n.personagens[pi].arquetipo = v })} />
                {outras.length > 0 && <p className="char-cross">também em: {outras.join(', ')}</p>}
                <EditField label="Regras" hint="Âncoras visuais que nunca mudam." value={p.regras}
                  onChange={(v) => update((n) => { n.personagens[pi].regras = v })} textarea />
                <PromptBlock
                  label="Prompt da ficha"
                  tool="ChatGPT Images"
                  value={p.promptFicha}
                  onChange={(v) => update((n) => { n.personagens[pi].promptFicha = v })}
                  copyText={`${saga.stylePrefix}, ${p.promptFicha}\n\n${dados.projeto.promptRules}`}
                  hint="Copia com o prefixo de estilo da saga e as regras da casa."
                />
                <div className="gen-row">
                  <GenerateButton
                    payload={{ tipo: 'ficha', sagaId: saga.id, personagemId: p.id }}
                    targetPath={p.imagem}
                    existing={existing}
                    jobs={jobs}
                    startGen={startGen}
                    label="Gerar ficha"
                  />
                </div>
                <FilePath path={p.imagem} />
              </div>
            </div>
          )
        })}
      </div>

      <div className="section-head"><h3 className="section-title">Estilo visual</h3></div>
      <div className="panel">
        <label className="field-group">
          <span className="label">Estilo do catálogo</span>
          <select className="field" value={saga.estiloId || ''} onChange={(e) => set('estiloId', e.target.value || undefined)}>
            <option value="">estilo próprio (custom)</option>
            {(dados.estilos || []).map((es) => <option key={es.id} value={es.id}>{es.nome}</option>)}
          </select>
        </label>

        {saga.estiloId ? (
          <>
            <EditField
              label="Detalhe de arte"
              hint="Paleta ou cenário desta saga, somado ao estilo base."
              value={saga.estiloExtra || ''}
              onChange={(v) => set('estiloExtra', v)}
              textarea
            />
            <p className="hint">
              Prefixo resolvido: <code>{[est?.stylePrefix, saga.estiloExtra].filter(Boolean).join(', ') || 'vazio'}</code>
            </p>
            <p className="hint">Pra mudar o traço base, edite o estilo no menu Estilos.</p>
          </>
        ) : (
          <PromptBlock
            label="Prefixo de estilo próprio"
            tool="esta saga não usa o catálogo"
            value={saga.stylePrefix || ''}
            onChange={(v) => set('stylePrefix', v)}
          />
        )}
      </div>
    </div>
  )
}
