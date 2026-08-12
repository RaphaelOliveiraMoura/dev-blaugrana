import { useCallback, useEffect, useRef, useState } from 'react'

// Arrastar-e-soltar por pointer events, no lugar do drag nativo do HTML5.
//
// O nativo CANCELA o gesto quando o nó de origem sai do DOM, e qualquer state
// mexido no dragover remonta a lista inteira no meio do arraste. Era isso que
// obrigava a tentar duas ou três vezes pra mover um card, e era isso que zerava
// o scroll da faixa horizontal (filhos trocados = offset clampado pelo browser).
//
// A regra que sustenta tudo aqui: durante o arraste a tela NÃO renderiza por
// movimento do mouse. A posição do fantasma vai direto no DOM (transform) e o
// gesto mora numa ref; só o ALVO mudar de coluna vira render. Um setState por
// quadro seria o mesmo remonte que quebrava o gesto.
//
// De brinde, coisas que o nativo não dá: fantasma com a arte real sob o cursor,
// limiar que separa clique de arrasto (clicar num card ainda abre o item) e
// auto-scroll nas bordas, sem o qual uma fila longa fica inalcançável no meio
// do gesto.
//
// Contrato do DOM:
//   [data-drop="<valor>"]  área de soltar; o valor chega em aoSoltar
//   [data-autoscroll]      container que rola sozinho quando o cursor beira a borda

const LIMIAR = 5   // px de folga antes de virar arrasto; abaixo disso é clique
const BORDA = 76   // faixa junto à borda que aciona o auto-scroll
const VEL = 24     // px por quadro com o cursor colado na borda

// Quanto rolar: zero no limite da faixa, VEL na borda. O sinal é a direção.
function empurrao(p, ini, fim) {
  if (p - ini < BORDA) return -VEL * (1 - Math.max(0, p - ini) / BORDA)
  if (fim - p < BORDA) return VEL * (1 - Math.max(0, fim - p) / BORDA)
  return 0
}

function zonaEm(x, y) {
  const el = document.elementFromPoint(x, y)
  const zona = el && el.closest('[data-drop]')
  return zona ? zona.dataset.drop : null
}

export function useArrastar({ aoSoltar, aoClicar }) {
  const [arrastando, setArrastando] = useState(null) // item em gesto (só p/ opacidade)
  const [alvo, setAlvo] = useState(null)             // data-drop sob o cursor

  // callbacks lidos por ref: `iniciar` precisa ser estável pro React.memo dos
  // cards valer alguma coisa, e aoSoltar/aoClicar nascem de novo a cada render.
  const cbs = useRef({ aoSoltar, aoClicar })
  cbs.current = { aoSoltar, aoClicar }

  const emCurso = useRef(null)
  // desmontar no meio do arraste deixaria o fantasma preso na tela
  useEffect(() => () => emCurso.current?.encerrar(false), [])

  const iniciar = useCallback((e, item) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    // × e check têm ação própria; segurar neles não arrasta o card
    if (e.target.closest('button, a, input, textarea')) return

    const no = e.currentTarget
    const r = no.getBoundingClientRect()
    const ctrl = new AbortController()
    const sig = { signal: ctrl.signal }

    const g = {
      ativo: false, fantasma: null, zona: null, raf: 0, rolaveis: [],
      x0: e.clientX, y0: e.clientY,           // onde pegou (pro limiar)
      dx: e.clientX - r.left, dy: e.clientY - r.top, // pegada dentro do card
      x: e.clientX, y: e.clientY,             // cursor agora
    }

    function pintar(z) {
      if (g.zona === z) return // só renderiza quando a coluna sob o cursor muda
      g.zona = z
      setAlvo(z)
    }

    function seguir() {
      g.fantasma.style.transform = `translate3d(${g.x - g.dx}px, ${g.y - g.dy}px, 0) rotate(-2.5deg)`
    }

    function comecar() {
      g.ativo = true
      // resolvidos uma vez: getComputedStyle por quadro não paga o que entrega
      g.rolaveis = [...document.querySelectorAll('[data-autoscroll]')]
      const f = no.cloneNode(true)
      f.classList.add('drag-fantasma')
      f.style.width = `${r.width}px`
      f.style.height = `${r.height}px`
      document.body.appendChild(f)
      g.fantasma = f
      document.body.classList.add('arrastando-ativo')
      seguir()
      setArrastando(item)
      g.raf = requestAnimationFrame(rolar)
    }

    // auto-scroll: roda enquanto o cursor estiver parado na borda, então mora
    // no rAF e não no pointermove.
    function rolar() {
      g.raf = requestAnimationFrame(rolar)
      let andou = false
      for (const c of g.rolaveis) {
        const b = c.getBoundingClientRect()
        if (g.x < b.left || g.x > b.right || g.y < b.top || g.y > b.bottom) continue
        const d = empurrao(g.x, b.left, b.right)
        if (d) { c.scrollLeft += d; andou = true }
      }
      const dy = empurrao(g.y, 0, window.innerHeight)
      if (dy) { window.scrollBy(0, dy); andou = true }
      // rolou = o conteúdo sob o cursor mudou sem o cursor sair do lugar
      if (andou) pintar(zonaEm(g.x, g.y))
    }

    function mover(ev) {
      g.x = ev.clientX
      g.y = ev.clientY
      if (!g.ativo) {
        if (Math.hypot(ev.clientX - g.x0, ev.clientY - g.y0) < LIMIAR) return
        comecar()
      }
      ev.preventDefault()
      seguir()
      pintar(zonaEm(ev.clientX, ev.clientY))
    }

    function encerrar(soltou) {
      cancelAnimationFrame(g.raf)
      g.fantasma?.remove()
      document.body.classList.remove('arrastando-ativo')
      ctrl.abort()
      emCurso.current = null
      const { ativo, zona } = g
      if (ativo) { setArrastando(null); setAlvo(null) }
      if (!soltou) return
      if (ativo) { if (zona) cbs.current.aoSoltar?.(item, zona) }
      else cbs.current.aoClicar?.(item) // não passou do limiar: foi clique
    }

    emCurso.current = { encerrar }
    window.addEventListener('pointermove', mover, sig)
    window.addEventListener('pointerup', () => encerrar(true), sig)
    window.addEventListener('pointercancel', () => encerrar(false), sig)
    window.addEventListener('blur', () => encerrar(false), sig)
    window.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') encerrar(false) }, sig)
  }, [])

  return { arrastando, alvo, iniciar }
}
