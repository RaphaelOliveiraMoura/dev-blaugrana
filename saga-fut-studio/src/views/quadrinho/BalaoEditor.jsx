import React, { useEffect, useMemo, useRef, useState } from 'react'
import { DetalheModal, Icon, FilePath } from '../../components/index.js'
import { useStudio } from '../../app/StudioContext.jsx'
import { quadrinhoSlide } from '../../../shared/caminhos.mjs'
import { BALAO_POS_PADRAO, posAutomatica } from '../../../shared/balao-pos.mjs'
import { caminhoDoBalao, geometriaDoBalao } from '../../../shared/balao-geometria.mjs'
import { CAIXA, CREME, TINTA, contornoPx } from '../../../shared/caixa-estilo.mjs'

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
const temTexto = (f) => !!(f && (f.texto || '').trim())

// Fonte real do sistema pra prévia no browser: são fontes do macOS, então o CSS as encontra
// pelo nome. O PESO importa e já custou: o bake vetoriza o arquivo `... Bold.ttf` pela
// opentype, então medir aqui no peso regular daria uma largura menor e a linha quebraria em
// outro lugar que no slide. Só bradley e comic têm arquivo Bold no catálogo.
const FONT_CSS = {
  bradley: { familia: "'Bradley Hand', cursive", peso: 'bold' },
  comic: { familia: "'Comic Sans MS', 'Comic Sans', cursive", peso: 'bold' },
  chalk: { familia: "'Chalkduster', fantasy", peso: 'normal' },
  rounded: { familia: "'SF Pro Rounded', system-ui, sans-serif", peso: 'normal' },
  tinta: { familia: "'Trattatello', 'Papyrus', fantasy", peso: 'normal' },
}

// A RÉGUA DO BROWSER. O desenho que vai pro post mede com a opentype lendo o .ttf; aqui quem
// mede é o canvas, sobre a mesma família no mesmo corpo. São réguas diferentes de propósito
// (o browser não abre arquivo de fonte), e é só por isso que shared/balao-geometria.mjs
// recebe a medição de fora: o que não pode divergir é a geometria, e ela é a mesma nos dois.
function medidorDeTexto(fonteId) {
  const cv = document.createElement('canvas')
  const ctx = cv.getContext('2d')
  const f = FONT_CSS[fonteId] || FONT_CSS.comic
  return (txt, fontSize) => {
    ctx.font = `${f.peso} ${fontSize}px ${f.familia}`
    return ctx.measureText(txt).width
  }
}

// Editor de posição: arrasta o balão, a largura e a ponta do rabinho sobre a arte do painel.
// Grava em `falas[k].pos` (fração da ARTE, não do slide: é por isso que a mesma posição vale
// na prévia daqui, no slide do carrossel e no clipe animado, que têm três tamanhos).
//
// Um painel pode ter VÁRIAS falas, então o editor tem um seletor de qual está sendo movida.
// As outras aparecem apagadas atrás, senão dá pra arrastar duas pro mesmo lugar sem perceber.
export function BalaoEditor({ quad, qi, painel, i, fonte, fontes = [], onFonte, byId = {}, onFechar }) {
  const { update, existing, bust, previaPainel } = useStudio()
  const contRef = useRef(null)

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
  const [cw, setCw] = useState(0) // tamanho do palco em px: a geometria é calculada nele,
  const [ch, setCh] = useState(0) // e o resultado sai igual ao do slide porque a conta é a mesma
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
    const ler = () => { setCw(el.clientWidth); setCh(el.clientHeight) }
    const ro = new ResizeObserver(ler)
    ro.observe(el)
    ler()
    return () => ro.disconnect()
  }, [])

  const mexerNaFala = (fn) => update((n) => {
    const lista = n.quadrinhos[qi].paineis[i].falas || []
    if (!lista[sel]) lista[sel] = { personagem: (quad.elenco || [])[0] || '', texto: '' }
    fn(lista[sel])
    n.quadrinhos[qi].paineis[i].falas = lista
  })
  const commitPos = () => mexerNaFala((f) => { f.pos = posRef.current })
  const setTexto = (v) => mexerNaFala((f) => { f.texto = v })
  const aplica = (np) => { posRef.current = np; setPos(np) }

  // Arraste genérico: `calc(prev, nx, ny)` devolve a nova pos a cada movimento.
  //
  // O ARRASTE PRECISA TER FIM GARANTIDO. A primeira versão só desamarrava os listeners no
  // `pointerup`, e quem solta o botão fora da janela (ou tem o gesto cancelado pelo sistema)
  // nunca recebe esse evento: o balão continuava seguindo o mouse depois de solto e gravava
  // sozinho a posição onde o próximo clique acontecesse. É um jeito de "coloquei numa posição
  // e ela mudou" que não deixa rastro nenhum de como aconteceu.
  //
  // Três coisas fecham isso: `setPointerCapture` prende o gesto ao elemento (movimento rápido
  // pra fora deixa de perder eventos), `pointercancel` também encerra, e o `pointerId` é
  // conferido pra um segundo dedo/mouse não pilotar um arraste que não é dele.
  //
  // E só grava se MEXEU: sem isso um clique simples no balão reescreve `pos` com o mesmo
  // valor, sujando o diff do save e a fila de "o que mudou desde que a aba abriu".
  function arrastar(e, calc) {
    e.preventDefault(); e.stopPropagation()
    const alvo = e.currentTarget
    const id = e.pointerId
    const rect = contRef.current.getBoundingClientRect()
    const n0x = (e.clientX - rect.left) / rect.width
    const n0y = (e.clientY - rect.top) / rect.height
    const base = posRef.current
    let mexeu = false
    try { alvo.setPointerCapture(id) } catch { /* mouse antigo sem capture: segue no window */ }
    const move = (ev) => {
      if (ev.pointerId !== id) return
      const nx = clamp((ev.clientX - rect.left) / rect.width, 0, 1)
      const ny = clamp((ev.clientY - rect.top) / rect.height, 0, 1)
      if (Math.abs(nx - n0x) + Math.abs(ny - n0y) > 0.002) mexeu = true
      aplica(calc(base, nx, ny, n0x, n0y))
    }
    const fim = (ev) => {
      if (ev && ev.pointerId !== id) return
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', fim)
      window.removeEventListener('pointercancel', fim)
      try { alvo.releasePointerCapture(id) } catch { /* já solto */ }
      if (mexeu) commitPos()
      else aplica(base)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', fim)
    window.addEventListener('pointercancel', fim)
  }

  // MOVER O BALÃO LEVA O RABINHO JUNTO. A ponta é um ponto absoluto no quadro, então sem isto
  // arrastar a caixa mudava o comprimento e a direção da perninha de brinde, e cada vez que
  // você reposicionava o balão tinha que remirar. O deslocamento aplicado é o EFETIVO (depois
  // do clamp da borda), senão a ponta descola da caixa assim que ela encosta no limite.
  const dragBalao = (e) => arrastar(e, (b, nx, ny, n0x, n0y) => {
    const x = clamp(b.x + (nx - n0x), 0, 1 - b.w)
    const y = clamp(b.y + (ny - n0y), 0, 0.92)
    return { ...b, x, y, tipX: clamp(b.tipX + (x - b.x), 0, 1), tipY: clamp(b.tipY + (y - b.y), 0, 1) }
  })
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
      await previaPainel(quad.id, painel.numero)
    } catch (e) { setErro(e.message) } finally { setGerando(false) }
  }

  const fontePreview = FONT_CSS[fonte] || FONT_CSS.comic
  // A MESMA CONTA DO SLIDE, rodada no tamanho do palco. Antes daqui saía um balão de CSS com
  // largura fixa, corpo em 5,2% da largura e um rabinho tracejado, e nada disso era o que o
  // export desenhava: era a razão de "coloco numa posição e fica diferente no quadrinho".
  const medir = useMemo(() => medidorDeTexto(fonte), [fonte])
  const geo = (txt, p, i, tot) => (cw && ch && String(txt || '').trim()
    ? geometriaDoBalao({ W: cw, H: ch, texto: txt, medir, pos: p, indice: i, total: tot })
    : null)
  const g = geo(fala.texto || '…', pos, ordem, idxComTexto.length || 1)
  // onde a ponta foi PEDIDA: quando o rabinho é encurtado pelo limite, a guia tracejada até
  // aqui é o que explica por que a bolinha está mais longe que a perninha
  const alvo = { x: pos.tipX * cw, y: pos.tipY * ch }
  const encurtado = g && Math.hypot(alvo.x - g.tail.tipX, alvo.y - g.tail.tipY) > 4
  const tetoX = (pos.x + pos.w) * cw
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

                {/* TUDO num SVG só, desenhado pela geometria do shared: é o mesmo desenho do
                    slide, no tamanho do palco. As alças de arrastar são HTML por cima. */}
                <svg className="balao-ed-svg" viewBox={`0 0 ${cw || 1} ${ch || 1}`}>
                  {/* as OUTRAS falas, apagadas: sem elas dá pra empilhar duas no mesmo canto */}
                  {idxComTexto.filter((k) => k !== sel).map((k) => {
                    const gf = geo(falas[k].texto, falas[k].pos || null, idxComTexto.indexOf(k), idxComTexto.length)
                    if (!gf) return null
                    return (
                      <g key={k} className="balao-ed-fantasma" onClick={() => setSel(k)}>
                        <title>{`Editar a fala de ${nome(falas[k].personagem)}`}</title>
                        <path d={caminhoDoBalao(gf)} fill={CREME} stroke={TINTA} strokeWidth={contornoPx(cw)}
                          strokeLinejoin="round" strokeLinecap="round" />
                        {gf.linhas.map((l, li) => (
                          <text key={li} x={gf.centroX} y={gf.primeiraBase + li * gf.lineH} textAnchor="middle"
                            fontFamily={fontePreview.familia} fontWeight={fontePreview.peso} fontSize={gf.fontSize}
                            fill={TINTA}>{l}</text>
                        ))}
                      </g>
                    )
                  })}

                  {g && (
                    <g>
                      {/* o teto de largura: é ELE que a alça da direita move, e é onde o texto
                          quebra. A caixa abraça o texto, então quase sempre para antes daqui. */}
                      <line x1={tetoX} y1={g.y} x2={tetoX} y2={g.y + g.h} stroke={TINTA}
                        strokeDasharray="5 6" strokeWidth="1.5" opacity=".5" />
                      {/* a perninha é limitada: a guia mostra pra onde ela ESTÁ MIRANDO */}
                      {encurtado && (
                        <line x1={g.tail.tipX} y1={g.tail.tipY} x2={alvo.x} y2={alvo.y} stroke={TINTA}
                          strokeDasharray="5 7" strokeWidth="1.5" opacity=".45" />
                      )}
                      <path className="balao-ed-arrasta" d={caminhoDoBalao(g)} fill={CREME} stroke={TINTA}
                        strokeWidth={contornoPx(cw)} strokeLinejoin="round" strokeLinecap="round"
                        onPointerDown={dragBalao} />
                      {g.linhas.map((l, li) => (
                        <text key={li} x={g.centroX} y={g.primeiraBase + li * g.lineH} textAnchor="middle"
                          fontFamily={fontePreview.familia} fontWeight={fontePreview.peso} fontSize={g.fontSize}
                          fill={TINTA}>{l}</text>
                      ))}
                    </g>
                  )}
                </svg>

                {/* alça da largura: pousa no TETO, não na borda da caixa, porque é o teto que
                    ela move (a caixa em si acompanha o texto) */}
                {g && (
                  <span className="balao-ed-largura" onPointerDown={dragLargura}
                    title="Arrastar pra mudar onde o texto quebra"
                    style={{ left: (tetoX / (cw || 1)) * 100 + '%', top: (g.y / (ch || 1)) * 100 + '%',
                      height: (g.h / (ch || 1)) * 100 + '%' }} />
                )}
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
            Arrasta o balão pra mover, a alça da direita pra onde o texto quebra, e a bolinha
            pra mirar o rabinho. A caixa abraça o texto e a perninha só APONTA pro alvo (a guia
            tracejada mostra a mira), então é assim que ela sai no slide também.
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
