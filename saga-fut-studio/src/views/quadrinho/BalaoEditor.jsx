import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { DetalheModal, Icon, FilePath } from '../../components/index.js'
import { useStudio } from '../../app/StudioContext.jsx'
import { painelBalao } from '../../../shared/caminhos.mjs'
import { BALAO_POS_PADRAO } from '../../../shared/balao-pos.mjs'
import { gerarBalao } from '../../api/balao.js'

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

// Fonte real do sistema pra prévia no browser (o bake usa a mesma via opentype). São
// fontes do macOS, então o CSS as encontra pelo nome. A prévia é aproximada (sem o
// contorno trêmulo); o resultado exato sai ao gerar.
const FONT_CSS = {
  bradley: "'Bradley Hand', cursive",
  comic: "'Comic Sans MS', 'Comic Sans', cursive",
  chalk: "'Chalkduster', fantasy",
  rounded: "'SF Pro Rounded', system-ui, sans-serif",
  tinta: "'Trattatello', 'Papyrus', fantasy",
}

// Editor do balão: arrasta o balão, a largura e a ponta do rabinho sobre o preview do
// painel. Grava painel.balaoPos (fração da imagem). Gerar assa o PNG com essa posição.
export function BalaoEditor({ quad, qi, painel, i, fonte, fontes = [], onFonte, onFechar }) {
  const { update, existing, bust, marcarGerado } = useStudio()
  const contRef = useRef(null)
  const balaoRef = useRef(null)

  const [pos, setPos] = useState(painel.balaoPos || BALAO_POS_PADRAO)
  const posRef = useRef(pos); posRef.current = pos
  const [texto, setTextoLocal] = useState(painel.balaoTexto || '')
  const [cw, setCw] = useState(0) // largura do container em px (pro tamanho da fonte)
  const [bhNorm, setBhNorm] = useState(0.14) // altura do balão em fração da imagem
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState(null)

  const balaoRel = painelBalao(quad.id, painel.numero)
  const temBalao = !!existing[balaoRel]

  // largura do container (o preview escala com a janela): a fonte da prévia acompanha
  useEffect(() => {
    const el = contRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setCw(el.clientWidth))
    ro.observe(el)
    setCw(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  // mede a altura real do balão renderizado, em fração da imagem (pro rabinho sair da base)
  useLayoutEffect(() => {
    const b = balaoRef.current, c = contRef.current
    if (b && c && c.clientHeight) setBhNorm(b.offsetHeight / c.clientHeight)
  }, [texto, pos.w, cw, fonte])

  const commitPos = () => update((n) => { n.quadrinhos[qi].paineis[i].balaoPos = posRef.current })
  const setTexto = (v) => { setTextoLocal(v); update((n) => { n.quadrinhos[qi].paineis[i].balaoTexto = v }) }
  const aplica = (np) => { posRef.current = np; setPos(np) }

  // arraste genérico: `calc(prev, nx, ny)` devolve a nova pos a cada movimento
  function arrastar(e, calc) {
    e.preventDefault(); e.stopPropagation()
    const rect = contRef.current.getBoundingClientRect()
    const n0x = (e.clientX - rect.left) / rect.width
    const n0y = (e.clientY - rect.top) / rect.height
    const base = posRef.current
    const move = (ev) => {
      const nx = clamp((ev.clientX - rect.left) / rect.width, 0, 1)
      const ny = clamp((ev.clientY - rect.top) / rect.height, 0, 1)
      aplica(calc(base, nx, ny, n0x, n0y))
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      commitPos()
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const dragBalao = (e) => arrastar(e, (b, nx, ny, n0x, n0y) => ({
    ...b,
    x: clamp(b.x + (nx - n0x), 0, 1 - b.w),
    y: clamp(b.y + (ny - n0y), 0, 0.92),
  }))
  const dragLargura = (e) => arrastar(e, (b, nx) => ({ ...b, w: clamp(nx - b.x, 0.18, 0.94) }))
  const dragPonta = (e) => arrastar(e, (b, nx, ny) => ({ ...b, tipX: nx, tipY: ny }))

  function auto() {
    aplica(BALAO_POS_PADRAO)
    update((n) => { n.quadrinhos[qi].paineis[i].balaoPos = null })
  }

  async function gerar() {
    if (!texto.trim() || gerando) return
    setGerando(true); setErro(null)
    try {
      const r = await gerarBalao({ quadrinhoId: quad.id, painelNumero: painel.numero, texto, fonte, pos })
      marcarGerado(r.path)
    } catch (e) { setErro(e.message) } finally { setGerando(false) }
  }

  const fontePreview = FONT_CSS[fonte] || FONT_CSS.bradley
  const fontePx = Math.max(11, Math.round(cw * 0.052))
  // base do rabinho: centro-baixo do balão, acompanhando a ponta (como no bake)
  const baseX = clamp(pos.tipX, pos.x + pos.w * 0.14, pos.x + pos.w * 0.86)
  const baseY = pos.y + bhNorm

  return (
    <DetalheModal
      titulo={`Balão do painel ${painel.numero}`}
      acoes={<button className="btn btn-ghost btn-sm" onClick={auto} title="Volta pro posicionamento automático">
        <Icon name="gerar" size={13} /> Auto
      </button>}
      onFechar={onFechar}
      midia={(
        <div className="balao-ed">
          <div className="balao-ed-imgs">
            {/* coluna 1: prévia editável (arrastável) */}
            <div className="balao-ed-col">
              <span className="label">Editar (arraste)</span>
              <div className="balao-ed-palco" ref={contRef}>
                <img className="balao-ed-img" src={'/files/' + painel.imagem + (bust ? '?v=' + bust : '')} alt="" draggable={false} />
                {/* rabinho: linha da base do balão até a ponta */}
                <svg className="balao-ed-svg" viewBox="0 0 1000 1000" preserveAspectRatio="none">
                  <line x1={baseX * 1000} y1={baseY * 1000} x2={pos.tipX * 1000} y2={pos.tipY * 1000}
                    stroke="#1a1a1a" strokeWidth="3" strokeDasharray="10 8" vectorEffect="non-scaling-stroke" />
                </svg>
                {/* balão arrastável (prévia com a fonte real) */}
                <div
                  ref={balaoRef}
                  className="balao-ed-balao"
                  onPointerDown={dragBalao}
                  style={{
                    left: pos.x * 100 + '%', top: pos.y * 100 + '%', width: pos.w * 100 + '%',
                    fontFamily: fontePreview, fontSize: fontePx, lineHeight: 1.14,
                  }}
                >
                  {(texto || '…').toUpperCase()}
                  <span className="balao-ed-largura" onPointerDown={dragLargura} title="Arrastar pra mudar a largura" />
                </div>
                {/* ponta do rabinho arrastável */}
                <span
                  className="balao-ed-ponta"
                  onPointerDown={dragPonta}
                  style={{ left: pos.tipX * 100 + '%', top: pos.tipY * 100 + '%' }}
                  title="Arrastar pra mirar o rabinho"
                />
              </div>
            </div>
            {/* coluna 2: resultado gerado (traço trêmulo + fonte real) */}
            <div className="balao-ed-col">
              <span className="label">Resultado gerado</span>
              {temBalao ? (
                <img className="balao-ed-result" src={'/files/' + balaoRel + (bust ? '?v=' + bust : '')} alt="balão gerado" draggable={false} />
              ) : (
                <div className="balao-ed-result-vazio hint">Gere pra ver aqui o resultado com o traço trêmulo e a fonte real.</div>
              )}
            </div>
          </div>
          <p className="hint balao-ed-dica">
            Arrasta o balão pra mover, a alça da direita pra largura, e a bolinha pra mirar o
            rabinho. A prévia é aproximada; o resultado ao lado é o final.
          </p>
        </div>
      )}
    >
      <label className="label">Texto do balão</label>
      <textarea
        className="field balao-input"
        rows={2}
        value={texto}
        placeholder="texto do balão (curto, CAIXA ALTA rende mais)"
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') gerar() }}
      />
      <label className="balao-ed-fonte">
        <span className="label">Fonte</span>
        <select className="field" value={fonte} onChange={(e) => onFonte && onFonte(e.target.value)}>
          {fontes.length === 0 && <option value={fonte}>{fonte}</option>}
          {fontes.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
        </select>
      </label>
      <div className="balao-card-acoes">
        <button className={'btn' + (temBalao ? '' : ' btn-primary')} onClick={gerar} disabled={!texto.trim() || gerando}>
          {gerando ? <span className="gen-spinner" /> : <Icon name="balao" size={14} />}
          {gerando ? 'gerando…' : temBalao ? 'Regerar balão' : 'Gerar balão'}
        </button>
        {temBalao && <FilePath path={balaoRel} />}
      </div>
      {erro && <p className="hint balao-erro"><Icon name="alerta" size={12} /> {erro}</p>}
      <p className="hint">
        Posição: {Math.round(pos.x * 100)},{Math.round(pos.y * 100)} · largura {Math.round(pos.w * 100)}% ·
        ponta {Math.round(pos.tipX * 100)},{Math.round(pos.tipY * 100)}. A fonte vale pro quadrinho todo.
      </p>
    </DetalheModal>
  )
}
