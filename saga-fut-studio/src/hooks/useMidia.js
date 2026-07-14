import { useCallback, useEffect, useRef, useState } from 'react'
import { getMediaExists, getProgress } from '../api/dados.js'

// Todo caminho de mídia que o projeto referencia (fichas, cenas, painéis).
function caminhosDeMidia(dados) {
  return [
    ...dados.personagens.map((p) => p.imagem),
    ...dados.sagas.flatMap((s) => s.episodios.flatMap((e) => e.cenas.flatMap((c) => [c.imagem, c.video]))),
    ...(dados.quadrinhos || []).flatMap((q) => (q.paineis || []).map((p) => p.imagem)),
  ]
}

// O que existe em disco. O studio só mostra a mídia que realmente está lá, e
// `bust` força o browser a recarregar a imagem que acabou de ser regerada.
export function useMidia(dados) {
  const [existing, setExisting] = useState({})
  const [progress, setProgress] = useState(null)
  const [bust, setBust] = useState(0)
  const jaConsultou = useRef(false)

  const atualizarProgresso = useCallback(() => {
    getProgress().then(setProgress).catch(() => {})
  }, [])

  useEffect(() => { atualizarProgresso() }, [atualizarProgresso])

  // uma varredura só, quando os dados chegam (a lista de caminhos vem deles)
  useEffect(() => {
    if (!dados || jaConsultou.current) return
    jaConsultou.current = true
    getMediaExists(caminhosDeMidia(dados)).then(setExisting).catch(() => {})
  }, [dados])

  // após gerar uma imagem: marca como existente, recarrega (cache-bust) e reconta o progresso
  const marcarGerado = useCallback((path) => {
    if (path) setExisting((prev) => ({ ...prev, [path]: true }))
    setBust(Date.now())
    atualizarProgresso()
  }, [atualizarProgresso])

  return { existing, progress, bust, marcarGerado }
}
