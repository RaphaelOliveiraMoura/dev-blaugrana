import React, { useEffect, useState } from 'react'
import {
  EditField, PromptBlock, Media, StatusPill, FilePath, GenerateButton, Icon, MidiaCard, DetalheModal, CopyButton,
} from '../../components/index.js'
import { FORMATOS } from '../../lib/formatos.js'
import { blankPainel, dupPainel } from '../../lib/scaffold.js'
import { numeroAncoraCenario } from '../../../shared/cenario.mjs'
import { quadrinhoSlide } from '../../../shared/caminhos.mjs'
import { balaoPorCodigo } from '../../../shared/quadrinho-config.mjs'
import { useStudio } from '../../app/StudioContext.jsx'
import { reverterImagem } from '../../api/geracao.js'
import { getFontesBalao } from '../../api/balao.js'
import { composePainelPrompt } from './prompt.js'
import { FalasInline } from './FalasInline.jsx'
import { BalaoEditor } from './BalaoEditor.jsx'

// quantas falas escritas o painel tem. O detalhe só INFORMA: quem edita a fala é o card da
// grade, e ter o editor nos dois lugares era o mesmo erro da aba separada.
const nFalasDo = (p) => (p?.falas || []).filter((f) => (f.texto || '').trim()).length

// As CAIXAS DE LEGENDA quando elas são desenhadas por CÓDIGO (quadrinho com
// `legendaPorCodigo`). Vive num campo próprio, `painel.legendas`, de propósito: o motor de
// prompt só lê `falas`, então o que está aqui NÃO vai pra IA e a arte nasce muda. A caixa
// entra no export do carrossel, vetorizada, e por isso trocar uma legenda custa zero
// geração — era o gasto maior da revisão de texto, e ainda tirava a ortografia do sorteio
// ("PEDRI PEGO A MOCHILA" saiu num painel já aprovado).
function LegendasEditor({ legendas, onChange }) {
  const add = () => onChange([...(legendas || []), ''])
  const setL = (i, v) => onChange((legendas || []).map((t, k) => (k === i ? v : t)))
  const del = (i) => onChange((legendas || []).filter((_, k) => k !== i))
  return (
    <div className="falas">
      {(legendas || []).map((t, i) => (
        <div className="fala-row" key={i}>
          <span className="fala-ordem">{i + 1}</span>
          <input className="field fala-text" value={t} placeholder="legenda (a caixa é desenhada por código)"
            onChange={(e) => setL(i, e.target.value)} />
          <button className="btn btn-ghost btn-icon btn-sm btn-danger" title="Remover legenda" onClick={() => del(i)}>
            <Icon name="x" size={12} />
          </button>
        </div>
      ))}
      <button className="btn btn-sm" onClick={add}><Icon name="plus" size={12} /> Legenda</button>
    </div>
  )
}

// Um botão de gerar por painel, com o aviso certo. Vive no card (compacto, ao lado
// das outras ações) e no detalhe aberto, embaixo da arte que ele substitui.
function BotaoGerar({ painel, quad, refs, compacto }) {
  const { existing, jobs, startGen } = useStudio()
  const ancora = numeroAncoraCenario(quad, painel)
  const ancoraPainel = ancora ? quad.paineis.find((p) => p.numero === ancora) : null
  const ancoraPronto = ancoraPainel && existing[ancoraPainel.imagem]
  const partes = []
  if (refs.length) partes.push(`fichas: ${refs.join(', ')}`)
  if (ancora) partes.push(ancoraPronto ? `cenário do painel ${ancora}` : `cenário do painel ${ancora} (gere-o primeiro)`)
  const refInfo = partes.length
    ? `Referências anexadas — ${partes.join('; ')}.`
    : 'Nenhuma ficha do elenco gerada ainda: vai sem referência e o personagem pode variar.'
  return (
    <GenerateButton
      payload={{ tipo: 'painel', quadrinhoId: quad.id, painelNumero: painel.numero }}
      targetPath={painel.imagem}
      existing={existing}
      jobs={jobs}
      startGen={startGen}
      label="Gerar painel"
      compacto={compacto}
      refInfo={refInfo}
    />
  )
}

// Refino pontual: um fluxo À PARTE da geração. Com a arte já pronta, você descreve uma
// mudança pequena e a IA reusa a PRÓPRIA arte como base, mexendo só no que você pediu (em
// vez de regerar do roteiro). Sobrescreve o painel com backup; o "Reverter" traz a versão
// anterior de volta. Usa a mesma fila da geração, então divide o "gerando…" com o Gerar.
function RefinarPainel({ painel, quad }) {
  const { existing, jobs, startGen, marcarGerado } = useStudio()
  const [texto, setTexto] = useState('')
  const [revertendo, setRevertendo] = useState(false)
  const [msg, setMsg] = useState(null)
  const alvo = painel.imagem
  if (!existing[alvo]) return null // só refina o que já tem arte
  const myJob = jobs.find((j) => j.targetPath === alvo && (j.status === 'queued' || j.status === 'running'))

  async function refinar() {
    const t = texto.trim()
    if (!t) return
    setMsg(null)
    const ok = await startGen(
      { tipo: 'painel', quadrinhoId: quad.id, painelNumero: painel.numero, refino: t },
      alvo, 'Refinar painel', 'imagem',
    )
    if (ok) setTexto('')
  }

  async function reverter() {
    setRevertendo(true); setMsg(null)
    try {
      await reverterImagem(alvo)
      marcarGerado(alvo) // recarrega a arte revertida na tela (cache-bust)
      setMsg('revertido pra versão anterior')
    } catch (e) {
      setMsg(e.message || 'não deu pra reverter')
    } finally {
      setRevertendo(false)
    }
  }

  return (
    <div className="refino">
      <span className="label">Refinar (mudança pontual)</span>
      <textarea
        className="field" rows={2}
        placeholder="ex.: deixe o cabelo do 10 mais escuro; aumente a placa"
        value={texto} onChange={(e) => setTexto(e.target.value)} disabled={!!myJob}
      />
      <div className="row-actions">
        <button className="btn btn-sm btn-primary" onClick={refinar} disabled={!texto.trim() || !!myJob}>
          {myJob ? <span className="gen-spinner" /> : <Icon name="editar" size={13} />}
          {myJob ? 'refinando…' : 'Refinar'}
        </button>
        <button className="btn btn-sm" onClick={reverter} disabled={revertendo || !!myJob} title="Volta pra versão anterior da arte">
          {revertendo ? 'revertendo…' : 'Reverter'}
        </button>
        {msg && <span className="gen-hint">{msg}</span>}
      </div>
      <span className="gen-hint">
        Usa a arte atual como base e muda só o que você descreve. Sobrescreve o painel (dá pra reverter).
      </span>
    </div>
  )
}

// O detalhe do painel: a arte à esquerda, o que a descreve à direita.
function PainelModal({ painel, i, quad, qi, byId, refs, onDuplicar, onExcluir, onFechar }) {
  const { dados, update, existing, bust } = useStudio()
  const setPainel = (campo, v) => update((n) => { n.quadrinhos[qi].paineis[i][campo] = v })

  return (
    <DetalheModal
      titulo={`Painel ${painel.numero}`}
      meta={<StatusPill value={painel.status} onChange={(v) => setPainel('status', v)} />}
      acoes={(
        <>
          <button className="btn btn-ghost btn-icon btn-sm" title="Duplicar painel"
            onClick={() => { onFechar(); onDuplicar(i) }}>
            <Icon name="duplicar" size={13} />
          </button>
          <button className="btn btn-ghost btn-icon btn-sm btn-danger" title="Excluir painel"
            onClick={() => { onFechar(); onExcluir(i) }}>
            <Icon name="trash" size={13} />
          </button>
        </>
      )}
      midia={(
        <>
          <Media existing={existing} src={painel.imagem} kind="img" bust={bust} />
          <FilePath path={painel.imagem} />
          <BotaoGerar painel={painel} quad={quad} refs={refs} />
          <span className="gen-hint">
            as fichas do elenco vão como referência
            {numeroAncoraCenario(quad, painel) ? ` + o cenário do painel ${numeroAncoraCenario(quad, painel)}` : ''}
          </span>
          <RefinarPainel painel={painel} quad={quad} />
        </>
      )}
      onFechar={onFechar}
    >
      <EditField label="Roteiro do painel" hint="O que acontece. Nota interna."
        value={painel.roteiro} onChange={(v) => setPainel('roteiro', v)} textarea />
      <PromptBlock
        label="Prompt da arte"
        tool="ChatGPT Images"
        value={painel.promptImagem}
        onChange={(v) => setPainel('promptImagem', v)}
        copyText={composePainelPrompt(painel, quad, dados, byId)}
        hint="O copiar já monta estilo + cena + falas (como balões) + regras. A IA desenha os balões."
      />
      {/* A FALA NÃO SE REPETE AQUI. Ela é editada no card da grade, à vista, porque é o
          texto que se escreve em série. Duplicar o editor no detalhe seria o mesmo erro que
          a aba separada cometeu: dois lugares pro mesmo dado, e ninguém sabendo qual vale. */}
      <p className="hint">
        {nFalasDo(painel)
          ? `${nFalasDo(painel)} fala(s), editáveis no card do painel, na grade.`
          : 'Sem fala. Escreva no card do painel, na grade.'}
      </p>
      {quad.legendaPorCodigo && (
        <>
          <span className="label mt-3">Legendas (desenhadas por código)</span>
          <LegendasEditor legendas={painel.legendas} onChange={(v) => setPainel('legendas', v)} />
          <p className="hint">
            Não vão pro prompt: a arte nasce muda e a caixa entra no export do carrossel (aba Publicar).
            Corrigir um texto aqui não gasta geração nenhuma, mas o card só mostra o texto novo
            depois de montar o carrossel de novo.
          </p>
        </>
      )}
    </DetalheModal>
  )
}

export function QuadrinhoPaineis({ quad, qi, byId, onExcluirPainel }) {
  const { dados, update, existing, bust } = useStudio()
  const [aberto, setAberto] = useState(null) // o número do painel em detalhe, ou null
  const [posicionando, setPosicionando] = useState(null) // índice do painel no posicionador
  const [fontes, setFontes] = useState([])
  const [padraoFonte, setPadraoFonte] = useState('bradley')
  const porCodigo = balaoPorCodigo(quad)

  // catálogo de fontes do balão: só importa no modo por código, e é estático na sessão
  useEffect(() => {
    if (!porCodigo) return
    getFontesBalao().then((r) => { setFontes(r.fontes); setPadraoFonte(r.padrao) }).catch(() => {})
  }, [porCodigo])

  const ar = FORMATOS[quad.formato]?.ar || '3 / 4'
  const refs = (quad.elenco || []).filter((id) => existing[byId[id]?.imagem]).map((id) => byId[id]?.nome || id)
  const iAberto = quad.paineis.findIndex((p) => p.numero === aberto)

  function novoPainel() {
    const novo = (quad.paineis.length ? Math.max(...quad.paineis.map((p) => p.numero)) : 0) + 1
    update((n) => { n.quadrinhos[qi].paineis.push(blankPainel(quad.id, novo)) })
    setAberto(novo) // nasce vazio: o detalhe é o que ele precisa
  }
  function duplicarPainel(i) {
    const novo = Math.max(...quad.paineis.map((p) => p.numero)) + 1
    update((n) => { n.quadrinhos[qi].paineis.splice(i + 1, 0, dupPainel(quad.paineis[i], quad.id, novo)) })
    setAberto(novo)
  }

  const nProntos = quad.paineis.filter((p) => existing[p.imagem]).length
  // quadrinho de legenda pura (o texto vive em `legendas`) não tem balão nenhum pra desenhar
  const temFala = quad.paineis.some((p) => (p.falas || []).some((f) => (f.texto || '').trim()))

  return (
    <>
      <div className="section-head">
        <h3 className="section-title">
          {quad.paineis.length} painéis
          {nProntos > 0 && <span className="section-nota">{nProntos} com arte</span>}
          {/* QUEM DESENHA A FALA. Sem isto, escrever no card e não ver o balão no slide não
              tem explicação na tela: no modo da IA a fala só vira desenho ao gerar o painel.
              A escolha em si mora em Ajustes; aqui fica só o estado.

              SÓ APARECE SE HOUVER FALA, ou se o modo por código tiver sido ligado de propósito.
              Num quadrinho de legenda (a série "O Dia Em Que" e as irmãs dela não têm balão
              nenhum: o texto todo vive em `legendas`), o chip anunciava "balão pela IA" sobre
              uma coisa que não existe, e o default lia como decisão tomada. Estado que não se
              aplica não é informação, é ruído, e ruído gasta a confiança no chip que importa.
              Assim que a primeira fala entra, ele volta, que é exatamente quando o modo passa
              a mudar o resultado. */}
          {(temFala || porCodigo) && (
            <span className={'fala-modo ' + (porCodigo ? 'ok' : 'ia')}
              title={porCodigo
                ? 'As falas são desenhadas no export, com posição arrastável (Ajustes → Balões de fala)'
                : 'As falas viram instrução no prompt e o modelo as desenha na arte: mudar o texto só vale na próxima geração (Ajustes → Balões de fala)'}>
              <Icon name={porCodigo ? 'check' : 'gerar'} size={11} />
              {porCodigo ? 'balão por código' : 'balão pela IA'}
            </span>
          )}
        </h3>
        <div className="row-actions">
          <button className="btn btn-sm" onClick={novoPainel}><Icon name="plus" size={12} /> Novo painel</button>
        </div>
      </div>

      <div className="midia-grid">
        {quad.paineis.map((painel, i) => {
          const temArte = !!existing[painel.imagem]
          const nFalas = (painel.falas || []).filter((f) => (f.texto || '').trim()).length
          // com legenda por código o painel tem texto sem ter `falas`: sem isto o card
          // mentia "sem falas" num painel cheio de legenda
          const nLeg = (painel.legendas || []).filter((t) => (t || '').trim()).length
          const resumo = [nFalas && `${nFalas} fala(s)`, nLeg && `${nLeg} legenda(s)`].filter(Boolean).join(' · ')
          // Com legenda por código a arte do painel é MUDA, e ver o quadrinho sem texto na
          // tela de conteúdo engana: o card mostra o SLIDE exportado quando ele existe, que
          // é a peça como vai ao ar. A arte muda continua sendo o material de origem (é ela
          // que aparece no detalhe, que é onde se regera e se refina).
          const slide = quadrinhoSlide(quad.id, painel.numero)
          const mostrarSlide = !!(quad.legendaPorCodigo && existing[slide])
          // O slide é DERIVADO da arte, e regerar a arte não o regera: sem este aviso o card
          // exibia tranquilamente o slide de quatro dias atrás como se fosse a peça atual.
          // Ver o mtime em routes/media-exists.
          const slideVelho = mostrarSlide && existing[painel.imagem] > existing[slide]
          return (
            <MidiaCard
              key={painel.numero}
              numero={painel.numero}
              titulo={mostrarSlide
                ? <>{resumo} <span className={slideVelho ? 'slide-velho' : 'muted'}>
                  · {slideVelho ? 'slide desatualizado' : 'como vai ao ar'}
                </span></>
                : (resumo || <span className="muted">sem texto</span>)}
              // o slide sai no formato do PRÓPRIO quadrinho: proporção fixa aqui fazia o card
              // do quadrinho por código aparecer com forma diferente do gerado pela IA
              ar={mostrarSlide || temArte ? ar : undefined}
              midia={<Media existing={existing} src={mostrarSlide ? slide : painel.imagem} kind="img" bust={bust} />}
              onAbrir={() => setAberto(painel.numero)}
              acoes={(
                <>
                  <CopyButton
                    text={composePainelPrompt(painel, quad, dados, byId)}
                    label={null}
                    title="Copiar o prompt da arte (estilo + cena + falas + regras)"
                  />
                  <BotaoGerar painel={painel} quad={quad} refs={refs} compacto />
                </>
              )}
              // a fala fica À VISTA no card, não atrás do detalhe: escrever a frase de 19
              // coringas é trabalho em série, e foi por isso que existiu uma aba só pra ele
              corpo={temArte && (
                <FalasInline quad={quad} qi={qi} painel={painel} i={i} byId={byId}
                  porCodigo={porCodigo} onPosicionar={() => setPosicionando(i)} />
              )}
            />
          )
        })}
      </div>

      {/* o posicionador do balão: mesmo dado do card, com a arte grande pra arrastar */}
      {posicionando != null && quad.paineis[posicionando] && (
        <BalaoEditor
          quad={quad} qi={qi} painel={quad.paineis[posicionando]} i={posicionando}
          fonte={quad.balaoFonte || padraoFonte} fontes={fontes} byId={byId}
          onFonte={(v) => update((n) => { n.quadrinhos[qi].balaoFonte = v })}
          onFechar={() => setPosicionando(null)}
        />
      )}

      {iAberto >= 0 && (
        <PainelModal
          painel={quad.paineis[iAberto]}
          i={iAberto}
          quad={quad}
          qi={qi}
          byId={byId}
          refs={refs}
          onDuplicar={duplicarPainel}
          onExcluir={onExcluirPainel}
          onFechar={() => setAberto(null)}
        />
      )}
    </>
  )
}
