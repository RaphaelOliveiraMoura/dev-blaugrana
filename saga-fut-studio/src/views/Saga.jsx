import React, { useState } from 'react'
import { ConfirmModal, EditField, Media, PromptBlock, GenerateButton, FilePath } from '../components/index.js'
import { epProgress } from '../lib/progresso.js'
import { dupSaga, blankEp, uniqueId, allEpIds, dupEp, blankChar } from '../lib/scaffold.js'

// SAGA: elenco + episódios + estilo
export default function SagaView({ dados, si, update, existing, progress, goEp, bust, jobs, startGen, goSaga, goHome }) {
  const saga = dados.sagas[si]
  const byId = Object.fromEntries(dados.personagens.map((p) => [p.id, p]))
  const elenco = saga.elenco.map((id) => byId[id]).filter(Boolean)
  const [confirm, setConfirm] = useState(null)
  const set = (campo, v) => update((n) => { n.sagas[si][campo] = v })

  function duplicarSaga() {
    const copia = dupSaga(saga, dados.sagas.map((s) => s.id))
    update((n) => { n.sagas.splice(si + 1, 0, copia) })
    goSaga(si + 1)
  }
  function excluirSaga() {
    setConfirm({
      titulo: 'Excluir saga?',
      mensagem: `A saga "${saga.titulo}" e seus ${saga.episodios.length} episódio(s) saem dos dados.\n\nOs ARQUIVOS de imagem/vídeo continuam no disco (não são apagados). Clique em Salvar depois para efetivar.`,
      confirmar: 'Excluir', perigo: true,
      onConfirm: () => { setConfirm(null); goHome(); update((n) => { n.sagas.splice(si, 1) }) },
    })
  }
  function novoEpisodio() {
    const epId = uniqueId(`${saga.id}-${String(saga.episodios.length + 1).padStart(2, '0')}`, allEpIds(dados))
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
    const nome = byId[pid]?.nome || pid
    setConfirm({
      titulo: 'Tirar do elenco?',
      mensagem: `"${nome}" sai do elenco desta saga.\n\nA ficha e a imagem continuam no pool (não são apagadas): dá pra readicionar depois por "＋ Adicionar do pool…". Salve para efetivar.`,
      confirmar: 'Tirar do elenco', perigo: true,
      onConfirm: () => { setConfirm(null); update((n) => { n.sagas[si].elenco = n.sagas[si].elenco.filter((x) => x !== pid) }) },
    })
  }
  function novoPersonagem() {
    const p = blankChar(dados.personagens.map((x) => x.id), '')
    update((n) => { n.personagens.push(p); n.sagas[si].elenco.push(p.id) })
  }
  const foraDoElenco = dados.personagens.filter((p) => !saga.elenco.includes(p.id))

  return (
    <div>
      {confirm && <ConfirmModal {...confirm} onCancel={() => setConfirm(null)} />}
      <div className="panel">
        <div className="saga-card-head">
          <span className="selo">{saga.selo}</span>
          <div className="row-actions">
            <button className="mini-btn" onClick={duplicarSaga}>⧉ Duplicar</button>
            <button className="mini-btn danger" onClick={excluirSaga}>🗑 Excluir</button>
          </div>
        </div>
        <EditField label="Título" value={saga.titulo} onChange={(v) => set('titulo', v)} />
        <div className="edit-row">
          <EditField label="Selo" value={saga.selo} onChange={(v) => set('selo', v)} />
          <EditField label="Gênero" value={saga.genero} onChange={(v) => set('genero', v)} />
          <EditField label="Status" value={saga.status} onChange={(v) => set('status', v)} />
        </div>
        <EditField label="Premissa" value={saga.premissa} onChange={(v) => set('premissa', v)} textarea />
        <EditField label="Tom do narrador (🎙)" value={saga.narradorTom} onChange={(v) => set('narradorTom', v)} textarea />
      </div>

      <div className="section-head">
        <h3 className="section-title">Episódios</h3>
        <button className="mini-btn" onClick={novoEpisodio}>＋ Novo episódio</button>
      </div>
      <div className="ep-list">
        {saga.episodios.map((ep, ei) => {
          const prog = epProgress(ep, progress)
          return (
            <div className="ep-row" key={ep.id}>
              <div className="ep-row-main" onClick={() => goEp(si, ei)}>
                <div className="ep-row-thumb">
                  {existing[ep.cenas[0]?.imagem]
                    ? <img src={'/files/' + ep.cenas[0].imagem + (bust ? '?v=' + bust : '')} alt="" />
                    : <span>{ei + 1}</span>}
                </div>
                <div className="ep-row-body">
                  <div className="ep-row-title">{ep.id.toUpperCase()}, {ep.titulo}</div>
                  <div className="muted ep-row-sub">{ep.publicar}</div>
                </div>
                <div className="ep-row-prog">
                  <span title="imagens" className={prog.img === prog.total ? 'ok' : ''}>🖼 {prog.img}/{prog.total}</span>
                  <span title="vídeos" className={prog.vid === prog.total ? 'ok' : ''}>🎬 {prog.vid}/{prog.total}</span>
                  <span title="narração (áudio)" className={prog.audio === prog.total ? 'ok' : ''}>🎙 {prog.audio}/{prog.total}</span>
                  {prog.done && <span className="ep-done">✓ pronto</span>}
                </div>
              </div>
              <div className="ep-row-actions">
                <button className="mini-btn" title="Duplicar episódio" onClick={() => duplicarEp(ei)}>⧉</button>
                <button className="mini-btn danger" title="Excluir episódio" onClick={() => excluirEp(ei)}>🗑</button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="section-head">
        <h3 className="section-title">Elenco da saga</h3>
        <div className="row-actions">
          {foraDoElenco.length > 0 && (
            <select className="add-select" value="" onChange={(e) => { if (e.target.value) addAoElenco(e.target.value) }}>
              <option value="">＋ Adicionar do pool…</option>
              {foraDoElenco.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          )}
          <button className="mini-btn" onClick={novoPersonagem}>＋ Novo personagem</button>
        </div>
      </div>
      {elenco.length === 0 && <p className="muted" style={{ marginBottom: 12 }}>Nenhum personagem ainda. Crie um novo ou adicione do pool acima.</p>}
      <div className="char-grid">
        {elenco.map((p) => {
          const pi = dados.personagens.findIndex((x) => x.id === p.id)
          const outras = dados.sagas.filter((s, j) => j !== si && s.elenco.includes(p.id)).map((s) => s.titulo)
          return (
            <div className="char-card" key={p.id}>
              <div className="char-img-wrap"><Media existing={existing} src={p.imagem} kind="img" bust={bust} /></div>
              <div className="char-body">
                <div className="char-card-top">
                  <span className="char-id" title="id (usado no nome do arquivo)">#{p.id}</span>
                  <button className="mini-btn danger" title="Tira do elenco desta saga (não apaga o personagem do pool)" onClick={() => removerDoElenco(p.id)}>remover</button>
                </div>
                <EditField label="Nome" value={p.nome} onChange={(v) => update((n) => { n.personagens[pi].nome = v })} />
                <EditField label="Arquétipo (quem evoca)" value={p.arquetipo} onChange={(v) => update((n) => { n.personagens[pi].arquetipo = v })} />
                {outras.length > 0 && <p className="char-cross">🔗 também em: {outras.join(', ')}</p>}
                <EditField label="Regras (âncoras visuais)" value={p.regras} onChange={(v) => update((n) => { n.personagens[pi].regras = v })} textarea />
                <PromptBlock
                  label="Prompt da ficha"
                  tool="ChatGPT Images"
                  value={p.promptFicha}
                  onChange={(v) => update((n) => { n.personagens[pi].promptFicha = v })}
                  copyText={`${saga.stylePrefix}, ${p.promptFicha}\n\n${dados.projeto.promptRules}`}
                  hint="Copia com o prefixo de estilo da saga + as regras da casa (negativos)."
                />
                <div className="gen-row">
                  <GenerateButton
                    payload={{ tipo: 'ficha', sagaId: saga.id, personagemId: p.id }}
                    targetPath={p.imagem}
                    existing={existing}
                    jobs={jobs}
                    startGen={startGen}
                    label="⚡ Gerar ficha"
                  />
                  <span className="gen-hint muted">gpt-image-2 · seu ChatGPT Plus</span>
                </div>
                <FilePath path={p.imagem} />
              </div>
            </div>
          )
        })}
      </div>

      <h3 className="section-title">Estilo visual da saga</h3>
      <div className="panel">
        <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>Estilo (centralizado no menu 🎨 Estilos)</div>
        <select
          className="endcard-input"
          value={saga.estiloId || ''}
          onChange={(e) => set('estiloId', e.target.value || undefined)}
        >
          <option value="">(estilo próprio / custom)</option>
          {(dados.estilos || []).map((es) => <option key={es.id} value={es.id}>{es.nome}</option>)}
        </select>
        {saga.estiloId ? (() => {
          const est = (dados.estilos || []).find((e) => e.id === saga.estiloId)
          const resolved = [est?.stylePrefix, saga.estiloExtra].filter(Boolean).join(', ')
          return (
            <>
              <EditField
                label="Detalhe de arte desta saga (paleta/cenário, somado ao estilo)"
                value={saga.estiloExtra || ''}
                onChange={(v) => set('estiloExtra', v)}
                textarea
              />
              <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                Prefixo resolvido (o que entra nos prompts): <code>{resolved || '(vazio)'}</code>
              </p>
              <p className="muted" style={{ fontSize: 12 }}>Pra mudar o traço base, edite o estilo no menu 🎨 Estilos.</p>
            </>
          )
        })() : (
          <PromptBlock
            label="Prefixo de estilo próprio (esta saga não usa o catálogo)"
            value={saga.stylePrefix || ''}
            onChange={(v) => update((n) => { n.sagas[si].stylePrefix = v })}
          />
        )}
      </div>
    </div>
  )
}
