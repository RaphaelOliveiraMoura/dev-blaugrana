import React, { useEffect, useState } from 'react'
import { Icon, Media, FilePath } from '../../components/index.js'
import { FORMATOS } from '../../lib/formatos.js'
import { useStudio } from '../../app/StudioContext.jsx'
import { painelBalao } from '../../../shared/caminhos.mjs'
import { gerarBalao, getFontesBalao } from '../../api/balao.js'
import { BalaoEditor } from './BalaoEditor.jsx'

// Um card por painel: a arte base MUDA à esquerda, o texto do balão à direita. Gerar
// desenha o balão rabiscado por cima (vetorial, instantâneo) e troca só o balao-<n>.png.
function PainelBalaoCard({ quad, qi, painel, i, ar, fonte, onEditar }) {
  const { update, existing, bust, marcarGerado } = useStudio()
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState(null)

  const texto = painel.balaoTexto || ''
  const temBase = !!existing[painel.imagem]
  const balaoRel = painelBalao(quad.id, painel.numero)
  const temBalao = !!existing[balaoRel]
  // com balão pronto mostra ele; senão a arte base; senão o vazio
  const mostrar = temBalao ? balaoRel : painel.imagem

  const setTexto = (v) => update((n) => { n.quadrinhos[qi].paineis[i].balaoTexto = v })

  async function gerar() {
    if (!texto.trim() || gerando) return
    setGerando(true); setErro(null)
    try {
      // respeita a posição editada (se houver); senão o servidor posiciona no automático
      const r = await gerarBalao({ quadrinhoId: quad.id, painelNumero: painel.numero, texto, fonte, pos: painel.balaoPos || undefined })
      marcarGerado(r.path) // marca o balao-<n>.png como existente + cache-bust
    } catch (e) {
      setErro(e.message)
    } finally {
      setGerando(false)
    }
  }

  return (
    <div className="balao-card">
      <button className="balao-card-quadro midia-card-quadro" style={{ aspectRatio: ar }}
        onClick={() => temBase && onEditar(i)} title={temBase ? 'Abrir o editor de posição' : undefined}>
        <Media existing={existing} src={mostrar} kind="img" bust={bust} />
        <span className="midia-card-num">{painel.numero}</span>
        {temBase && <span className="balao-card-editar"><Icon name="editar" size={12} /> posição</span>}
      </button>

      <div className="balao-card-form">
        {!temBase ? (
          <p className="hint balao-aviso">
            <Icon name="alerta" size={13} /> gere a arte base na aba Conteúdo primeiro
          </p>
        ) : (
          <>
            <textarea
              className="field balao-input"
              rows={2}
              value={texto}
              placeholder="texto do balão (curto, CAIXA ALTA rende mais)"
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') gerar() }}
            />
            <div className="balao-card-acoes">
              <button
                className={'btn btn-sm' + (temBalao ? '' : ' btn-primary')}
                onClick={gerar}
                disabled={!texto.trim() || gerando}
                title={temBalao ? 'Regera o balão com o texto e a fonte atuais' : 'Desenha o balão por cima da arte'}
              >
                {gerando ? <span className="gen-spinner" /> : <Icon name="balao" size={13} />}
                {gerando ? 'gerando…' : temBalao ? 'Regerar balão' : 'Gerar balão'}
              </button>
              {temBalao && <FilePath path={balaoRel} />}
            </div>
            {erro && <p className="hint balao-erro"><Icon name="alerta" size={12} /> {erro}</p>}
          </>
        )}
      </div>
    </div>
  )
}

// A aba "Balão": preenche o balão de cada painel por cima da arte parada. Serve pros
// coringas de reação (mesma arte, só troca o texto) e pra qualquer quadrinho.
export function QuadrinhoBalao({ quad, qi }) {
  const { update, existing } = useStudio()
  const [fontes, setFontes] = useState([])
  const [padraoFonte, setPadraoFonte] = useState('bradley')
  const [editando, setEditando] = useState(null) // índice do painel no editor, ou null

  useEffect(() => {
    getFontesBalao().then((r) => { setFontes(r.fontes); setPadraoFonte(r.padrao) }).catch(() => {})
  }, [])

  const ar = FORMATOS[quad.formato]?.ar || '3 / 4'
  const fonte = quad.balaoFonte || padraoFonte
  const nComBase = quad.paineis.filter((p) => existing[p.imagem]).length
  const nComBalao = quad.paineis.filter((p) => existing[painelBalao(quad.id, p.numero)]).length

  const setFonte = (v) => update((n) => { n.quadrinhos[qi].balaoFonte = v })

  return (
    <div className="panel">
      <div className="section-head">
        <h3 className="section-title">
          Balão por painel
          <span className="section-nota">
            {nComBalao} de {quad.paineis.length} com balão
          </span>
        </h3>
      </div>
      <p className="hint balao-intro">
        O balão é desenhado por cima da arte parada (vetorial, na hora): trocar o texto ou a
        fonte e regerar não gasta geração de imagem nem muda a arte base. Ideal pros coringas
        de reação, um post pronto por texto. Clique num painel pra abrir o editor (texto, fonte
        e posição do balão).
      </p>

      {nComBase === 0 ? (
        <p className="hint">Nenhum painel tem arte ainda. Gere as artes na aba Conteúdo.</p>
      ) : (
        <div className="balao-grid">
          {quad.paineis.map((painel, i) => (
            <PainelBalaoCard key={painel.numero} quad={quad} qi={qi} painel={painel} i={i} ar={ar} fonte={fonte}
              onEditar={setEditando} />
          ))}
        </div>
      )}

      {editando != null && quad.paineis[editando] && (
        <BalaoEditor quad={quad} qi={qi} painel={quad.paineis[editando]} i={editando}
          fonte={fonte} fontes={fontes} onFonte={setFonte}
          onFechar={() => setEditando(null)} />
      )}
    </div>
  )
}
