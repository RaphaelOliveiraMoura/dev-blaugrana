import React, { useState } from 'react'
import {
  ConfirmModal, PromptBlock, Media, StatusPill, FilePath, GenerateButton, CenaCast, Icon, Recolhivel,
  MidiaCard, DetalheModal, CopyButton,
} from '../../components/index.js'
import { orcamentoNarracao, CLIPE_S } from '../../lib/narracao.js'
import { blankCena, dupCena } from '../../lib/scaffold.js'
import { useStudio } from '../../app/StudioContext.jsx'
import { useEp } from './EpContext.jsx'

// A barra de orçamento da narração: a cor entrega o recado antes da leitura.
function Orcamento({ texto }) {
  const o = orcamentoNarracao(texto)
  const msg = o.nivel === 'ok'
    ? `cabe no clipe de ${CLIPE_S}s, sem acelerar`
    : o.nivel === 'medio'
      ? `passa dos ${CLIPE_S}s e a voz acelera. Corte ~${o.cortar} palavra(s)`
      : `bem acima de ${CLIPE_S}s: acelera ao máximo e ainda congela quadro. Corte ~${o.cortar} palavra(s) ou divida em 2 clipes`
  return (
    <div className={'orcamento orcamento-' + o.nivel}>
      <Icon name={o.nivel === 'ok' ? 'check' : 'alerta'} size={12} />
      <span><b>≈{o.seg}s</b> · {o.palavras} palavras (meta ~{o.alvoPalavras}) · {msg}</span>
    </div>
  )
}

// O que a cena já tem, para ler de relance no card. A imagem é a capa, então ela
// mesma responde por si; o que o card não mostra é que precisa de sinal.
function CenaSinais({ cena, existing }) {
  const sinais = [
    { icon: 'video', ok: !!existing[cena.video], nome: 'vídeo' },
    { icon: 'narracao', ok: !!(cena.narracao || '').trim(), nome: 'narração escrita' },
  ]
  return (
    <span className="cena-sinais">
      {sinais.map((s) => (
        <span key={s.icon} className={'cena-sinal' + (s.ok ? ' ok' : '')} title={s.nome + (s.ok ? ': pronto' : ': falta')}>
          <Icon name={s.icon} size={12} />
        </span>
      ))}
    </span>
  )
}

// Um botão de gerar por cena, com o aviso certo. Vive no card (compacto, ao lado
// das outras ações) e no detalhe, embaixo da imagem que ele substitui.
function BotaoGerar({ cena, saga, ep, refs, compacto }) {
  const { existing, jobs, startGen } = useStudio()
  return (
    <GenerateButton
      payload={{ tipo: 'cena', sagaId: saga.id, epId: ep.id, cenaNumero: cena.numero }}
      targetPath={cena.imagem}
      existing={existing}
      jobs={jobs}
      startGen={startGen}
      compacto={compacto}
      refInfo={refs.length
        ? `Referências anexadas: ${refs.join(', ')}.`
        : 'Nenhuma ficha gerada ainda: vai gerar sem referência e o personagem pode variar. Gere as fichas primeiro.'}
    />
  )
}

// O detalhe da cena: a mídia à esquerda, o que a descreve à direita.
function CenaModal({ cena, i, byId, refs, onDuplicar, onExcluir, onFechar }) {
  const { dados, existing, bust } = useStudio()
  const { saga, ep, si, ei, update } = useEp()
  const setCena = (campo, v) => update((n) => { n.sagas[si].episodios[ei].cenas[i][campo] = v })

  const temImagem = !!existing[cena.imagem]
  // A etapa do vídeo só começa depois da imagem: abre junto quando ela existe.
  const [verVideoManual, setVerVideoManual] = useState(null)
  const verVideo = verVideoManual ?? temImagem

  return (
    <DetalheModal
      titulo={(
        <>
          <span className="modal-det-num">{cena.numero}</span>
          <input
            className="cena-titulo-input"
            value={cena.titulo}
            placeholder="Título da cena"
            onChange={(e) => setCena('titulo', e.target.value)}
          />
        </>
      )}
      meta={(
        <input
          className="cena-tempo-input"
          value={cena.tempo}
          placeholder="tempo"
          title="Tempo desta cena no episódio"
          onChange={(e) => setCena('tempo', e.target.value)}
        />
      )}
      acoes={(
        <>
          <button className="btn btn-ghost btn-icon btn-sm" title="Duplicar cena"
            onClick={() => { onFechar(); onDuplicar(i) }}>
            <Icon name="duplicar" size={13} />
          </button>
          <button className="btn btn-ghost btn-icon btn-sm btn-danger" title="Excluir cena"
            onClick={() => { onFechar(); onExcluir(i) }}>
            <Icon name="trash" size={13} />
          </button>
        </>
      )}
      midia={(
        <>
          <div className="media-slot">
            <div className="media-head">
              <span className="media-head-label"><Icon name="imagem" size={12} /> Imagem</span>
              <span className="media-head-acoes">
                <FilePath path={cena.imagem} compacto />
                <StatusPill value={cena.statusImagem} onChange={(v) => setCena('statusImagem', v)} />
              </span>
            </div>
            <Media existing={existing} src={cena.imagem} kind="img" bust={bust} />
          </div>
          <div className="media-slot">
            <div className="media-head">
              <span className="media-head-label"><Icon name="video" size={12} /> Vídeo</span>
              <span className="media-head-acoes">
                <FilePath path={cena.video} compacto />
                <StatusPill value={cena.statusVideo} onChange={(v) => setCena('statusVideo', v)} />
              </span>
            </div>
            <Media existing={existing} src={cena.video} kind="video" />
          </div>
        </>
      )}
      onFechar={onFechar}
    >
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
        <BotaoGerar cena={cena} saga={saga} ep={ep} refs={refs} />
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

      {/* Passo seguinte do pipeline: só faz sentido com a imagem na mão. */}
      <Recolhivel
        titulo="Vídeo e áudio"
        nota={temImagem ? 'Grok Imagine' : 'gere a imagem primeiro'}
        aberto={verVideo}
        onToggle={() => setVerVideoManual(!verVideo)}
      >
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
      </Recolhivel>

      {cena.montagem && (
        <div className="montagem">
          <Icon name="montar" size={13} />
          <span>{cena.montagem}</span>
        </div>
      )}
    </DetalheModal>
  )
}

export function Cenas() {
  const { dados, existing, bust } = useStudio()
  const { saga, ep, si, ei, update } = useEp()
  const [confirm, setConfirm] = useState(null)
  const [aberta, setAberta] = useState(null) // o número da cena em detalhe, ou null

  const byId = Object.fromEntries(dados.personagens.map((p) => [p.id, p]))
  const midiaCarregada = Object.keys(existing).length > 0
  const pronta = (c) => !!existing[c.imagem] && !!existing[c.video]
  const iAberta = ep.cenas.findIndex((c) => c.numero === aberta)

  function novaCena() {
    const novo = (ep.cenas.length ? Math.max(...ep.cenas.map((c) => c.numero)) : 0) + 1
    update((n) => { n.sagas[si].episodios[ei].cenas.push(blankCena(ep.id, novo)) })
    setAberta(novo) // nasce vazia: o detalhe é o que ela precisa
  }
  function duplicarCena(i) {
    const novo = Math.max(...ep.cenas.map((c) => c.numero)) + 1
    const copia = dupCena(ep.cenas[i], ep.id, novo)
    update((n) => { n.sagas[si].episodios[ei].cenas.splice(i + 1, 0, copia) })
    setAberta(novo)
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

  const nProntas = ep.cenas.filter(pronta).length

  return (
    <>
      <div className="section-head">
        <h3 className="section-title">
          {ep.cenas.length} cenas
          {midiaCarregada && nProntas > 0 && <span className="section-nota">{nProntas} prontas</span>}
        </h3>
        <div className="row-actions">
          <button className="btn btn-sm" onClick={novaCena}><Icon name="plus" size={12} /> Nova cena</button>
        </div>
      </div>

      <div className="midia-grid midia-grid-alta">
        {ep.cenas.map((cena) => {
          const refs = cena.personagens.filter((id) => existing[byId[id]?.imagem]).map((id) => byId[id]?.nome || id)
          return (
            <MidiaCard
              key={cena.numero}
              numero={cena.numero}
              titulo={cena.titulo || <span className="muted">sem título</span>}
              sinais={<CenaSinais cena={cena} existing={existing} />}
              // a cena é 9:16 e a imagem é a capa; o vídeo toca no detalhe
              ar={existing[cena.imagem] ? '9 / 16' : undefined}
              midia={<Media existing={existing} src={cena.imagem} kind="img" bust={bust} />}
              onAbrir={() => setAberta(cena.numero)}
              acoes={(
                <>
                  <CopyButton
                    text={`${saga.stylePrefix}, ${cena.promptImagem}\n\n${dados.projeto.promptRules}`}
                    label={null}
                    title="Copiar o prompt da imagem (com estilo e regras da casa)"
                  />
                  <BotaoGerar cena={cena} saga={saga} ep={ep} refs={refs} compacto />
                </>
              )}
            />
          )
        })}
      </div>

      {iAberta >= 0 && (
        <CenaModal
          cena={ep.cenas[iAberta]}
          i={iAberta}
          byId={byId}
          refs={ep.cenas[iAberta].personagens.filter((id) => existing[byId[id]?.imagem]).map((id) => byId[id]?.nome || id)}
          onDuplicar={duplicarCena}
          onExcluir={excluirCena}
          onFechar={() => setAberta(null)}
        />
      )}

      {/* por último: os dois modais dividem o z-index, então quem vem depois no DOM
          pinta por cima. A confirmação tem que ficar acima do detalhe que a abriu. */}
      {confirm && <ConfirmModal {...confirm} onCancel={() => setConfirm(null)} />}
    </>
  )
}
