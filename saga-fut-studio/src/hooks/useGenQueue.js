import { useEffect, useRef, useState } from 'react'
import { gerarImagem, gerarVideo } from '../api/geracao.js'
import { MAX_GERACOES_PARALELAS } from '../../shared/constantes.mjs'

// Qual API cada tipo de job chama. Imagem via Codex, vídeo via Grok; a fila é a
// mesma, só o disparo muda.
const DISPARO = { imagem: gerarImagem, video: gerarVideo }

// Fila de geração em SEGUNDO PLANO: até MAX_GERACOES_PARALELAS rodando ao mesmo
// tempo, o resto espera. Job: { id, payload, targetPath, label, kind, status, err }
// com kind em 'imagem' | 'video' e status em 'queued' | 'running' | 'done' | 'error'.
export function useGenQueue(onGerado) {
  const [jobs, setJobs] = useState([])
  const jobSeq = useRef(0)
  const despachados = useRef(new Set())
  const onGeradoRef = useRef(onGerado); onGeradoRef.current = onGerado

  const startGen = (payload, targetPath, label, kind = 'imagem') => {
    setJobs((js) => js.some((j) => j.targetPath === targetPath && (j.status === 'queued' || j.status === 'running'))
      ? js // já está na fila/rodando, não duplica
      : [...js, { id: ++jobSeq.current, payload, targetPath, label, kind, status: 'queued' }])
  }

  const dismissJob = (id) => setJobs((js) => js.filter((j) => j.id !== id))

  const marcar = (id, campos) => setJobs((js) => js.map((j) => (j.id === id ? { ...j, ...campos } : j)))

  async function runJob(job) {
    try {
      const r = await (DISPARO[job.kind] || gerarImagem)(job.payload)
      onGeradoRef.current(r.path || job.targetPath)
      marcar(job.id, { status: 'done' })
      setTimeout(() => setJobs((js) => js.filter((j) => !(j.id === job.id && j.status === 'done'))), 3000)
    } catch (e) {
      marcar(job.id, { status: 'error', err: e.message })
    }
  }

  // bomba da fila: mantém o teto de paralelas ocupado, disparando os próximos
  useEffect(() => {
    const livres = MAX_GERACOES_PARALELAS - jobs.filter((j) => j.status === 'running').length
    if (livres <= 0) return
    const proximos = jobs.filter((j) => j.status === 'queued' && !despachados.current.has(j.id)).slice(0, livres)
    if (!proximos.length) return
    proximos.forEach((j) => despachados.current.add(j.id))
    setJobs((js) => js.map((j) => (proximos.some((p) => p.id === j.id) ? { ...j, status: 'running' } : j)))
    proximos.forEach(runJob)
  }, [jobs])

  return { jobs, startGen, dismissJob }
}
