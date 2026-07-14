import React, { useState } from 'react'
import {
  ConfirmModal, PromptBlock, Media, StatusPill, FilePath, GenerateButton, CenaCast, Icon, Recolhivel,
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

// O que a cena já tem, para ler de relance na linha recolhida.
function CenaSinais({ cena, existing }) {
  const sinais = [
    { icon: 'imagem', ok: !!existing[cena.imagem], nome: 'imagem' },
    { icon: 'video', ok: !!existing[cena.video], nome: 'vídeo' },
    { icon: 'narracao', ok: !!(cena.narracao || '').trim(), nome: 'narração escrita' },
  ]
  return (
    <span className="cena-sinais">
      {sinais.map((s) => (
        <span key={s.icon} className={'cena-sinal' + (s.ok ? ' ok' : '')} title={s.nome + (s.ok ? ': pronta' : ': falta')}>
          <Icon name={s.icon} size={12} />
        </span>
      ))}
    </span>
  )
}

function Cena({ cena, i, aberta, onToggle, onDuplicar, onExcluir }) {
  const { dados, existing, bust, jobs, startGen } = useStudio()
  const { saga, ep, si, ei, update } = useEp()
  const byId = Object.fromEntries(dados.personagens.map((p) => [p.id, p]))
  const setCena = (campo, v) => update((n) => { n.sagas[si].episodios[ei].cenas[i][campo] = v })

  const temImagem = !!existing[cena.imagem]
  // A etapa do vídeo só começa depois da imagem: abre junto quando ela existe.
  // Derivado, não congelado no mount: a varredura de mídia chega depois do 1º render.
  const [verVideoManual, setVerVideoManual] = useState(null)
  const verVideo = verVideoManual ?? temImagem

  const refs = cena.personagens.filter((id) => existing[byId[id]?.imagem]).map((id) => byId[id]?.nome || id)

  return (
    <div className={'panel cena' + (aberta ? ' aberta' : '')}>
      <div className="cena-head">
        <button className="cena-num" onClick={onToggle} aria-expanded={aberta}
          title={aberta ? 'Recolher cena' : 'Expandir cena'}>
          <Icon name="chevron" size={11} className="cena-chevron" />
          {cena.numero}
        </button>
        <input
          className="cena-titulo-input"
          value={cena.titulo}
          placeholder="Título da cena"
          onChange={(e) => setCena('titulo', e.target.value)}
        />
        {!aberta && <CenaSinais cena={cena} existing={existing} />}
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

      {aberta && (
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
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function Cenas() {
  const { existing } = useStudio()
  const { ep, si, ei, update } = useEp()
  const [confirm, setConfirm] = useState(null)
  // Só os cliques do usuário: o resto sai do estado da cena, então recolhe sozinho
  // quando a varredura de mídia chega.
  const [aberturaManual, setAberturaManual] = useState({})

  const midiaCarregada = Object.keys(existing).length > 0
  const pronta = (c) => !!existing[c.imagem] && !!existing[c.video]
  // Cena pronta é referência; cena em aberto é o trabalho. Enquanto a mídia não
  // carregou, ninguém abre: melhor abrir depois do que despencar 5000px na cara.
  const estaAberta = (c) => aberturaManual[c.numero] ?? (midiaCarregada && !pronta(c))

  const todasAbertas = ep.cenas.every(estaAberta)
  function alternarTodas() {
    const v = !todasAbertas
    setAberturaManual(Object.fromEntries(ep.cenas.map((c) => [c.numero, v])))
  }

  function novaCena() {
    const novo = (ep.cenas.length ? Math.max(...ep.cenas.map((c) => c.numero)) : 0) + 1
    update((n) => { n.sagas[si].episodios[ei].cenas.push(blankCena(ep.id, novo)) })
    setAberturaManual((prev) => ({ ...prev, [novo]: true }))
  }
  function duplicarCena(i) {
    const novo = Math.max(...ep.cenas.map((c) => c.numero)) + 1
    const copia = dupCena(ep.cenas[i], ep.id, novo)
    update((n) => { n.sagas[si].episodios[ei].cenas.splice(i + 1, 0, copia) })
    setAberturaManual((prev) => ({ ...prev, [novo]: true }))
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
      {confirm && <ConfirmModal {...confirm} onCancel={() => setConfirm(null)} />}
      <div className="section-head">
        <h3 className="section-title">
          {ep.cenas.length} cenas
          {midiaCarregada && nProntas > 0 && <span className="section-nota">{nProntas} prontas</span>}
        </h3>
        <div className="row-actions">
          <button className="btn btn-ghost btn-sm" onClick={alternarTodas}>
            {todasAbertas ? 'Recolher todas' : 'Expandir todas'}
          </button>
          <button className="btn btn-sm" onClick={novaCena}><Icon name="plus" size={12} /> Nova cena</button>
        </div>
      </div>
      {ep.cenas.map((cena, i) => (
        <Cena
          key={cena.numero}
          cena={cena}
          i={i}
          aberta={estaAberta(cena)}
          onToggle={() => setAberturaManual((prev) => ({ ...prev, [cena.numero]: !estaAberta(cena) }))}
          onDuplicar={duplicarCena}
          onExcluir={excluirCena}
        />
      ))}
    </>
  )
}
