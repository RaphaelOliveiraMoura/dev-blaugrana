import React, { useState } from 'react'
import { ConfirmModal, PromptBlock, CopyButton, Icon } from '../../components/index.js'
import { dupQuadrinho } from '../../lib/scaffold.js'
import { useStudio } from '../../app/StudioContext.jsx'
import { acharQuadrinho } from '../../lib/localizar.js'
import { QuadrinhoFicha } from './QuadrinhoFicha.jsx'
import { QuadrinhoPaineis } from './QuadrinhoPaineis.jsx'
import { QuadrinhoElenco } from './QuadrinhoElenco.jsx'
import { QuadrinhoVideo } from './QuadrinhoVideo.jsx'
import { QuadrinhoAnimar } from './QuadrinhoAnimar.jsx'
import { QuadrinhoImagem } from './QuadrinhoImagem.jsx'
import { QuadrinhoBalao } from './QuadrinhoBalao.jsx'

const ABAS = [
  { id: 'conteudo', icon: 'quadrinhos', label: 'Conteúdo' },
  { id: 'balao', icon: 'balao', label: 'Balão' },
  { id: 'video', icon: 'video', label: 'Vídeo' },
  { id: 'animar', icon: 'montar', label: 'Animar' },
  { id: 'publicar', icon: 'publicar', label: 'Publicar' },
]

// QUADRINHO: a ficha resume numa linha, os painéis abrem na primeira dobra.
// O vídeo e a publicação ficam em abas próprias, como no episódio.
export default function QuadrinhoView({ quadId, sub }) {
  const { dados, update, existing, nav } = useStudio()
  const { quad, qi } = acharQuadrinho(dados, quadId)
  const byId = Object.fromEntries(dados.personagens.map((p) => [p.id, p]))
  const [confirm, setConfirm] = useState(null)

  function duplicar() {
    const copia = dupQuadrinho(quad, dados.quadrinhos.map((q) => q.id))
    update((n) => { n.quadrinhos.splice(qi + 1, 0, copia) })
    nav.quadrinho(copia.id)
  }
  function excluir() {
    setConfirm({
      titulo: 'Excluir quadrinho?',
      mensagem: `"${quad.titulo}" sai dos dados. As artes no disco continuam. Salve depois para efetivar.`,
      confirmar: 'Excluir', perigo: true,
      onConfirm: () => { setConfirm(null); nav.ir('quadrinhos'); update((n) => { n.quadrinhos.splice(qi, 1) }) },
    })
  }
  function excluirPainel(i) {
    const p = quad.paineis[i]
    setConfirm({
      titulo: 'Excluir painel?',
      mensagem: `O painel ${p.numero} sai do quadrinho. A arte no disco continua. Salve depois para efetivar.`,
      confirmar: 'Excluir', perigo: true,
      onConfirm: () => { setConfirm(null); update((n) => { n.quadrinhos[qi].paineis.splice(i, 1) }) },
    })
  }
  function removerDoElenco(pid) {
    setConfirm({
      titulo: 'Tirar do elenco?',
      mensagem: `"${byId[pid]?.nome || pid}" sai do elenco deste quadrinho.\n\nA ficha e a imagem continuam no pool: dá pra readicionar por "Adicionar do pool". Salve para efetivar.`,
      confirmar: 'Tirar do elenco', perigo: true,
      onConfirm: () => { setConfirm(null); update((n) => { n.quadrinhos[qi].elenco = n.quadrinhos[qi].elenco.filter((x) => x !== pid) }) },
    })
  }
  const aba = ABAS.find((a) => a.id === sub) || ABAS[0]

  return (
    <div>
      {confirm && <ConfirmModal {...confirm} onCancel={() => setConfirm(null)} />}

      <QuadrinhoFicha quad={quad} qi={qi} onDuplicar={duplicar} onExcluir={excluir} />

      <div className="subtabs" role="tablist">
        {ABAS.map((a) => (
          <button
            key={a.id}
            role="tab"
            aria-selected={a.id === aba.id}
            className={'subtab' + (a.id === aba.id ? ' active' : '')}
            onClick={() => nav.quadrinho(quad.id, a.id)}
          >
            <Icon name={a.icon} size={14} />
            {a.label}
          </button>
        ))}
      </div>

      {aba.id === 'conteudo' && (
        <>
          <QuadrinhoPaineis quad={quad} qi={qi} byId={byId} onExcluirPainel={excluirPainel} />
          <QuadrinhoElenco quad={quad} qi={qi} byId={byId} onRemover={removerDoElenco} />
        </>
      )}

      {aba.id === 'balao' && (
        /* preenche o balão de cada painel por cima da arte parada (vetorial) */
        <QuadrinhoBalao quad={quad} qi={qi} />
      )}

      {aba.id === 'video' && (
        /* o vídeo antes de publicar: é ele que a legenda vai acompanhar */
        <QuadrinhoVideo quad={quad} qi={qi} />
      )}

      {aba.id === 'animar' && (
        /* a versão em que os personagens se mexem (Grok), com transição entre painéis */
        <QuadrinhoAnimar quad={quad} qi={qi} />
      )}

      {aba.id === 'publicar' && (
        <>
          <QuadrinhoImagem quad={quad} />
          <div className="panel">
            {/* TÍTULO = gancho curto (publicacao.titulo, o "nome bonito" do post).
                DESCRIÇÃO = legenda-mãe, maior, com CTA + hashtags (quad.legenda). */}
            <PromptBlock
              label="Título do post"
              tool="gancho curto · 3 a 7 palavras"
              value={quad.publicacao?.titulo || ''}
              onChange={(v) => update((n) => {
                n.quadrinhos[qi].publicacao = { ...(n.quadrinhos[qi].publicacao || {}), titulo: v }
              })}
              hint="Uma linha que prende sem entregar a piada: tensão, exagero ou uma afirmação forte. Cabe 1 emoji. Ex.: 'O nosso ruim virou Rei do Mundo 👑'."
            />
            <PromptBlock
              label="Descrição do post"
              tool="gancho + contexto + CTA + hashtags"
              value={quad.legenda || ''}
              onChange={(v) => update((n) => { n.quadrinhos[qi].legenda = v })}
              hint="Estrutura: 1) linha de impacto que repete o gancho; 2) 1-2 linhas do take/piada; 3) CTA (marca alguém, salva, pergunta); 4) bloco de hashtags no fim (nicho amplo + tema/jogador + recorrentes da marca). No Instagram o save é o sinal nº 1; ponha a palavra-chave (jogador, clube) logo no começo."
            />
            <div className="quad-export">
              <span className="hint">Artes prontas, na ordem:</span>
              {quad.paineis.map((p) => (
                <span key={p.numero} className={'chip' + (existing[p.imagem] ? ' chip-ok' : '')}>
                  {p.numero}
                  {existing[p.imagem] && <Icon name="check" size={10} />}
                </span>
              ))}
              <CopyButton text={quad.paineis.map((p) => p.imagem).join('\n')} label="copiar caminhos" />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
