import React, { useState } from 'react'
import {
  ConfirmModal, PromptBlock, Media, StatusPill, FilePath, GenerateButton, CenaCast, Icon,
} from '../../components/index.js'
import { orcamentoNarracao } from '../../lib/narracao.js'
import { blankCena, dupCena } from '../../lib/scaffold.js'
import { useStudio } from '../../app/StudioContext.jsx'
import { useEp } from './EpContext.jsx'

// A barra de orçamento da narração: a cor entrega o recado antes da leitura.
function Orcamento({ texto }) {
  const o = orcamentoNarracao(texto)
  const msg = o.nivel === 'ok'
    ? 'cabe no clipe de 10s, sem acelerar'
    : o.nivel === 'medio'
      ? `passa dos 10s e a voz acelera. Corte ~${o.cortar} palavra(s)`
      : `bem acima de 10s: acelera ao máximo e ainda congela quadro. Corte ~${o.cortar} palavra(s) ou divida em 2 clipes`
  return (
    <div className={'orcamento orcamento-' + o.nivel}>
      <Icon name={o.nivel === 'ok' ? 'check' : 'alerta'} size={12} />
      <span><b>≈{o.seg}s</b> · {o.palavras} palavras (meta ~{o.alvoPalavras}) · {msg}</span>
    </div>
  )
}

function Cena({ cena, i, onDuplicar, onExcluir }) {
  const { dados, existing, bust, jobs, startGen } = useStudio()
  const { saga, ep, si, ei, update } = useEp()
  const byId = Object.fromEntries(dados.personagens.map((p) => [p.id, p]))
  const setCena = (campo, v) => update((n) => { n.sagas[si].episodios[ei].cenas[i][campo] = v })

  const refs = cena.personagens.filter((id) => existing[byId[id]?.imagem]).map((id) => byId[id]?.nome || id)

  return (
    <div className="panel cena">
      <div className="cena-head">
        <span className="cena-num">{cena.numero}</span>
        <input
          className="cena-titulo-input"
          value={cena.titulo}
          placeholder="Título da cena"
          onChange={(e) => setCena('titulo', e.target.value)}
        />
        <input
          className="cena-tempo-input"
          value={cena.tempo}
          placeholder="tempo"
          title="Tempo desta cena no episódio"
          onChange={(e) => setCena('tempo', e.target.value)}
        />
        <button className="btn btn-ghost btn-icon btn-sm" title="Duplicar cena" onClick={() => onDuplicar(i)}>
          <Icon name="duplicar" size={13} />
        </button>
        <button className="btn btn-ghost btn-icon btn-sm btn-danger" title="Excluir cena" onClick={() => onExcluir(i)}>
          <Icon name="trash" size={13} />
        </button>
      </div>

      <div className="cena-corpo">
        <span className="label">Quem aparece</span>
        <CenaCast
          elencoIds={saga.elenco}
          byId={byId}
          personagens={cena.personagens}
          naoAparecem={cena.naoAparecem}
          onChange={(p, n) => update((nv) => {
            nv.sagas[si].episodios[ei].cenas[i].personagens = p
            nv.sagas[si].episodios[ei].cenas[i].naoAparecem = n
          })}
        />

        <div className="cena-cols">
          <div className="cena-media">
            <div className="media-slot">
              <div className="media-head">
                <span className="media-head-label"><Icon name="imagem" size={12} /> Imagem</span>
                <StatusPill value={cena.statusImagem} onChange={(v) => setCena('statusImagem', v)} />
              </div>
              <Media existing={existing} src={cena.imagem} kind="img" bust={bust} />
              <FilePath path={cena.imagem} />
            </div>
            <div className="media-slot">
              <div className="media-head">
                <span className="media-head-label"><Icon name="video" size={12} /> Vídeo</span>
                <StatusPill value={cena.statusVideo} onChange={(v) => setCena('statusVideo', v)} />
              </div>
              <Media existing={existing} src={cena.video} kind="video" />
              <FilePath path={cena.video} />
            </div>
          </div>

          <div className="cena-prompts">
            <PromptBlock
              label="Narração"
              tool="ElevenLabs"
              value={cena.narracao}
              onChange={(v) => setCena('narracao', v)}
            />
            <Orcamento texto={cena.narracao} />

            <PromptBlock
              label="Prompt da imagem"
              tool="ChatGPT Images"
              value={cena.promptImagem}
              onChange={(v) => setCena('promptImagem', v)}
              copyText={`${saga.stylePrefix}, ${cena.promptImagem}\n\n${dados.projeto.promptRules}`}
              hint="Copia já com o prefixo de estilo e as regras da casa. Anexe as fichas dos marcados."
            />
            <div className="gen-row">
              <GenerateButton
                payload={{ tipo: 'cena', sagaId: saga.id, epId: ep.id, cenaNumero: cena.numero }}
                targetPath={cena.imagem}
                existing={existing}
                jobs={jobs}
                startGen={startGen}
                refInfo={refs.length
                  ? `Referências anexadas: ${refs.join(', ')}.`
                  : 'Nenhuma ficha gerada ainda: vai gerar sem referência e o personagem pode variar. Gere as fichas primeiro.'}
              />
              <span className="gen-hint">as fichas marcadas vão como referência</span>
            </div>

            {cena.promptImagemEdit && (
              <PromptBlock
                label="Corrigir a imagem"
                tool="ChatGPT / Nano Banana"
                value={cena.promptImagemEdit}
                onChange={(v) => setCena('promptImagemEdit', v)}
                hint="Anexe a imagem ATUAL e mande este prompt: preserva o resto e muda só o apontado."
              />
            )}

            <PromptBlock
              label="Prompt do vídeo"
              tool="Grok Imagine"
              value={cena.promptVideo}
              onChange={(v) => setCena('promptVideo', v)}
              copyText={`${cena.promptVideo}\n${cena.promptAudio}`}
              hint="Copia junto com o bloco de áudio. Suba a imagem da cena no modo image-to-video."
            />
            <PromptBlock
              label="Bloco de áudio"
              tool="Grok Imagine · ambiência"
              value={cena.promptAudio}
              onChange={(v) => setCena('promptAudio', v)}
            />

            {cena.montagem && (
              <div className="montagem">
                <Icon name="montar" size={13} />
                <span>{cena.montagem}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function Cenas() {
  const { ep, si, ei, update } = useEp()
  const [confirm, setConfirm] = useState(null)

  function novaCena() {
    const novo = (ep.cenas.length ? Math.max(...ep.cenas.map((c) => c.numero)) : 0) + 1
    update((n) => { n.sagas[si].episodios[ei].cenas.push(blankCena(ep.id, novo)) })
  }
  function duplicarCena(i) {
    const novo = Math.max(...ep.cenas.map((c) => c.numero)) + 1
    const copia = dupCena(ep.cenas[i], ep.id, novo)
    update((n) => { n.sagas[si].episodios[ei].cenas.splice(i + 1, 0, copia) })
  }
  function excluirCena(i) {
    const c = ep.cenas[i]
    setConfirm({
      titulo: 'Excluir cena?',
      mensagem: `A cena ${c.numero} "${c.titulo}" sai do episódio. Os arquivos no disco continuam. Salve depois para efetivar.`,
      confirmar: 'Excluir', perigo: true,
      onConfirm: () => { setConfirm(null); update((n) => { n.sagas[si].episodios[ei].cenas.splice(i, 1) }) },
    })
  }

  return (
    <>
      {confirm && <ConfirmModal {...confirm} onCancel={() => setConfirm(null)} />}
      <div className="section-head">
        <h3 className="section-title">{ep.cenas.length} cenas</h3>
        <button className="btn btn-sm" onClick={novaCena}><Icon name="plus" size={12} /> Nova cena</button>
      </div>
      {ep.cenas.map((cena, i) => (
        <Cena key={cena.numero} cena={cena} i={i} onDuplicar={duplicarCena} onExcluir={excluirCena} />
      ))}
    </>
  )
}
