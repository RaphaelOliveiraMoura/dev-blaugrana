import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { DetalheModal, Icon, FilePath } from '../../components/index.js'
import { useStudio } from '../../app/StudioContext.jsx'
import { quadrinhoSlide } from '../../../shared/caminhos.mjs'
import { BALAO_POS_PADRAO, posAutomatica } from '../../../shared/balao-pos.mjs'
import { gerarPrevia } from '../../api/balao.js'

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
const temTexto = (f) => !!(f && (f.texto || '').trim())

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

// Editor de posição: arrasta o balão, a largura e a ponta do rabinho sobre a arte do painel.
// Grava em `falas[k].pos` (fração da ARTE, não do slide: é por isso que a mesma posição vale
// na prévia daqui, no slide do carrossel e no clipe animado, que têm três tamanhos).
//
// Um painel pode ter VÁRIAS falas, então o editor tem um seletor de qual está sendo movida.
// As outras aparecem apagadas atrás, senão dá pra arrastar duas pro mesmo lugar sem perceber.
export function BalaoEditor({ quad, qi, painel, i, fonte, fontes = [], onFonte, byId = {}, onFechar }) {
  const { update, existing, bust, marcarGerado } = useStudio()
  const contRef = useRef(null)
  const balaoRef = useRef(null)

  const falas = (painel.falas || [])
  const idxComTexto = falas.map((f, k) => (temTexto(f) ? k : -1)).filter((k) => k >= 0)
  const [sel, setSel] = useState(idxComTexto[0] ?? 0)
  const fala = falas[sel] || { texto: '' }
  // a ordem entre as falas COM TEXTO é o que o desenho usa pro automático: a segunda bolha
  // nasce deslocada da primeira, e a prévia tem que concordar com isso
  const ordem = Math.max(0, idxComTexto.indexOf(sel))
  const posAuto = idxComTexto.length > 1 ? posAutomatica(ordem, idxComTexto.length) : BALAO_POS_PADRAO

  const [pos, setPos] = useState(fala.pos || posAuto)
  const posRef = useRef(pos); posRef.current = pos
  const [cw, setCw] = useState(0) // largura do container em px (pro tamanho da fonte)
  const [bhNorm, setBhNorm] = useState(0.14) // altura do balão em fração da imagem
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState(null)

  const slideRel = quadrinhoSlide(quad.id, painel.numero)
  const temSlide = !!existing[slideRel]

  // trocar de fala recarrega a posição daquela fala (ou o automático da vez dela)
  useEffect(() => { setPos(falas[sel]?.pos || posAuto); posRef.current = falas[sel]?.pos || posAuto }, [sel])

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
  }, [fala.texto, pos.w, cw, fonte])

  const mexerNaFala = (fn) => update((n) => {
    const lista = n.quadrinhos[qi].paineis[i].falas || []
    if (!lista[sel]) lista[sel] = { personagem: (quad.elenco || [])[0] || '', texto: '' }
    fn(lista[sel])
    n.quadrinhos[qi].paineis[i].falas = lista
  })
  const commitPos = () => mexerNaFala((f) => { f.pos = posRef.current })
  const setTexto = (v) => mexerNaFala((f) => { f.texto = v })
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
    aplica(posAuto)
    mexerNaFala((f) => { delete f.pos })
  }

  async function gerar() {
    if (gerando) return
    setGerando(true); setErro(null)
    try {
      const r = await gerarPrevia({ quadrinhoId: quad.id, painelNumero: painel.numero })
      marcarGerado(r.path)
    } catch (e) { setErro(e.message) } finally { setGerando(false) }
  }

  const fontePreview = FONT_CSS[fonte] || FONT_CSS.bradley
  const fontePx = Math.max(11, Math.round(cw * 0.052))
  // base do rabinho: centro-baixo do balão, acompanhando a ponta (como no bake)
  const baseX = clamp(pos.tipX, pos.x + pos.w * 0.14, pos.x + pos.w * 0.86)
  const baseY = pos.y + bhNorm
  const nome = (id) => byId[id]?.nome || id || 'sem personagem'
  // O rótulo da aba é o TEXTO, não o personagem: no deck de coringas o elenco tem um só, e
  // duas abas com o mesmo nome não dizem qual é qual. Com dois personagens o nome entra junto.
  const rotulo = (f) => {
    const t = (f.texto || '').trim();
    const curto = t.length > 22 ? t.slice(0, 22).trimEnd() + '…' : (t || 'sem texto')
    return (quad.elenco || []).length > 1 ? `${nome(f.personagem)}: ${curto}` : curto
  }

  return (
    <DetalheModal
      titulo={`Falas do painel ${painel.numero}`}
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

                {/* as OUTRAS falas, apagadas: sem elas dá pra empilhar duas no mesmo canto */}
                {idxComTexto.filter((k) => k !== sel).map((k) => {
                  const p = falas[k].pos || posAutomatica(idxComTexto.indexOf(k), idxComTexto.length)
                  return (
                    <div key={k} className="balao-ed-balao fantasma"
                      style={{ left: p.x * 100 + '%', top: p.y * 100 + '%', width: p.w * 100 + '%',
                        fontFamily: fontePreview, fontSize: fontePx, lineHeight: 1.14 }}
                      onClick={() => setSel(k)} title={`Editar a fala de ${nome(falas[k].personagem)}`}>
                      {(falas[k].texto || '').toUpperCase()}
                    </div>
                  )
                })}

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
                  {(fala.texto || '…').toUpperCase()}
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
            {/* coluna 2: o slide acabado, que é o que vai pro post */}
            <div className="balao-ed-col">
              <span className="label">Slide do post</span>
              {temSlide ? (
                <img className="balao-ed-result" src={'/files/' + slideRel + (bust ? '?v=' + bust : '')} alt="slide acabado" draggable={false} />
              ) : (
                <div className="balao-ed-result-vazio hint">Atualize a prévia pra ver o slide com moldura, traço trêmulo e legendas.</div>
              )}
            </div>
          </div>
          <p className="hint balao-ed-dica">
            Arrasta o balão pra mover, a alça da direita pra largura, e a bolinha pra mirar o
            rabinho. A prévia da esquerda é aproximada; o slide ao lado é o que vai pro post.
          </p>
        </div>
      )}
    >
      {/* qual fala está sendo posicionada: só aparece quando há mais de uma */}
      {idxComTexto.length > 1 && (
        <div className="balao-ed-abas" role="tablist" aria-label="Fala em edição">
          {idxComTexto.map((k) => (
            <button key={k} type="button" role="tab" aria-selected={k === sel}
              className={'quad-filtro' + (k === sel ? ' active' : '')} onClick={() => setSel(k)}>
              {rotulo(falas[k])}
            </button>
          ))}
        </div>
      )}

      <label className="label">Texto da fala</label>
      <textarea
        className="field balao-input"
        rows={2}
        value={fala.texto || ''}
        placeholder="fala do personagem (curta, CAIXA ALTA rende mais)"
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
        <button className={'btn' + (temSlide ? '' : ' btn-primary')} onClick={gerar} disabled={gerando}>
          {gerando ? <span className="gen-spinner" /> : <Icon name="balao" size={14} />}
          {gerando ? 'gerando…' : 'Atualizar prévia'}
        </button>
        {temSlide && <FilePath path={slideRel} />}
      </div>
      {erro && <p className="hint balao-erro"><Icon name="alerta" size={12} /> {erro}</p>}
      <p className="hint">
        Posição: {Math.round(pos.x * 100)},{Math.round(pos.y * 100)} · largura {Math.round(pos.w * 100)}% ·
        ponta {Math.round(pos.tipX * 100)},{Math.round(pos.tipY * 100)}. A fonte vale pro quadrinho todo.
      </p>
    </DetalheModal>
  )
}
