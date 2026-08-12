import React, { useState } from 'react'
import { ConfirmModal, Icon } from '../../components/index.js'
import { useStudio } from '../../app/StudioContext.jsx'
import { acharQuadrinho } from '../../lib/localizar.js'
import { QuadrinhoFicha } from './QuadrinhoFicha.jsx'
import { QuadrinhoPaineis } from './QuadrinhoPaineis.jsx'
import { QuadrinhoElenco } from './QuadrinhoElenco.jsx'
import { QuadrinhoVideo } from './QuadrinhoVideo.jsx'
import { QuadrinhoAnimar } from './QuadrinhoAnimar.jsx'
import { QuadrinhoAjustes } from './QuadrinhoAjustes.jsx'
import { QuadrinhoPublicar } from './QuadrinhoPublicar.jsx'
import Baixar from '../Baixar.jsx'

// NÃO existe aba de "Falas". Existiu, e era uma segunda grade de painéis ao lado desta,
// com a mesma arte: ninguém conseguia dizer para que servia cada uma. A fala se escreve no
// card do painel, em Conteúdo, que é onde ela já era resumida ("2 fala(s) · 1 legenda(s)").
const ABAS = [
  { id: 'conteudo', icon: 'quadrinhos', label: 'Conteúdo' },
  { id: 'video', icon: 'video', label: 'Vídeo' },
  { id: 'animar', icon: 'montar', label: 'Animar' },
  // UMA aba só pra publicação (12/08/2026). Eram duas, "Publicar" (escrever o texto, montar a
  // imagem) e "Postar" (pegar o material), e elas eram etapas do MESMO ato: separadas, obrigavam
  // a pular de uma pra outra no meio da publicação, com o celular na mão.
  { id: 'publicar', icon: 'publicar', label: 'Publicar' },
  { id: 'baixar', icon: 'baixar', label: 'Baixar' },
  // Acabamento: quem desenha moldura, legenda e numeração (IA ou código). Fica no fim
  // porque é config da peça, não etapa do fluxo.
  { id: 'ajustes', icon: 'editar', label: 'Ajustes' },
]

// QUADRINHO: a ficha resume numa linha, os painéis abrem na primeira dobra.
// O vídeo e a publicação ficam em abas próprias, como no episódio.
export default function QuadrinhoView({ quadId, sub }) {
  const { dados, update, nav } = useStudio()
  const { quad, qi } = acharQuadrinho(dados, quadId)
  const byId = Object.fromEntries(dados.personagens.map((p) => [p.id, p]))
  const [confirm, setConfirm] = useState(null)

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
      mensagem: `"${byId[pid]?.nome || pid}" sai do elenco deste quadrinho.\n\nA ficha e a imagem continuam no acervo. Pra devolver, peça ao agente (o elenco vem no JSON). Salve para efetivar.`,
      confirmar: 'Tirar do elenco', perigo: true,
      onConfirm: () => { setConfirm(null); update((n) => { n.quadrinhos[qi].elenco = n.quadrinhos[qi].elenco.filter((x) => x !== pid) }) },
    })
  }
  const aba = ABAS.find((a) => a.id === sub) || ABAS[0]

  return (
    <div>
      {confirm && <ConfirmModal {...confirm} onCancel={() => setConfirm(null)} />}

      <QuadrinhoFicha quad={quad} qi={qi} onExcluir={excluir} />

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

      {aba.id === 'video' && (
        /* o vídeo antes de publicar: é ele que a legenda vai acompanhar */
        <QuadrinhoVideo quad={quad} qi={qi} />
      )}

      {aba.id === 'animar' && (
        /* a versão em que os personagens se mexem (Grok), com transição entre painéis */
        <QuadrinhoAnimar quad={quad} qi={qi} />
      )}

      {aba.id === 'ajustes' && <QuadrinhoAjustes quad={quad} qi={qi} />}

      {aba.id === 'publicar' && <QuadrinhoPublicar quad={quad} qi={qi} />}

      {aba.id === 'baixar' && (
        /* baixa vídeo de referência (TikTok) direto pra pasta deste quadrinho */
        <Baixar quadrinhoId={quad.id} />
      )}
    </div>
  )
}
