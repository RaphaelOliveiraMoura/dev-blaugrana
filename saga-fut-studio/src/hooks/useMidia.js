import { useCallback, useEffect, useRef, useState } from 'react'
import { getMediaExists, getProgress } from '../api/dados.js'
import { estiloImagem, painelVideo, quadrinhoAnimado, quadrinhoMosaico, quadrinhoSlide, quadrinhoVideo, refPersonagem } from '../../shared/caminhos.mjs'

// Formatos de mosaico que a UI oferece: o padrão e os que cada feed prefere.
const FORMATOS_POST = ['4:5', '1:1', '9:16', '3:2']

// Todo caminho de mídia que o projeto referencia (fichas, cenas, painéis, os vídeos
// que a arte do quadrinho vira, referências de traço dos estilos e de aparência dos
// personagens). As referências não são geradas pelo studio: ou o arquivo está lá, ou
// aquele estilo/personagem vive só de texto.
function caminhosDeMidia(dados) {
  return [
    ...dados.personagens.map((p) => p.imagem),
    ...dados.personagens.map((p) => refPersonagem(p.id)),
    ...(dados.estilos || []).map((e) => estiloImagem(e.id)),
    ...dados.sagas.flatMap((s) => s.episodios.flatMap((e) => e.cenas.flatMap((c) => [c.imagem, c.video]))),
    ...(dados.quadrinhos || []).flatMap((q) => [
      quadrinhoVideo(q.id),
      quadrinhoAnimado(q.id),
      ...FORMATOS_POST.map((f) => quadrinhoMosaico(q.id, f)),
      ...(q.paineis || []).flatMap((p) => [p.imagem, painelVideo(q.id, p.numero), quadrinhoSlide(q.id, p.numero)]),
    ]),
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
