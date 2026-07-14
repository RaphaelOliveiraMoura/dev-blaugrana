import { useEffect, useRef, useState } from 'react'
import { gerarImagem } from '../api/geracao.js'
import { MAX_GERACOES_PARALELAS } from '../../shared/constantes.mjs'

// Fila de geração em SEGUNDO PLANO: até MAX_GERACOES_PARALELAS rodando ao mesmo
// tempo, o resto espera. Job: { id, payload, targetPath, label, status, err }
// com status em 'queued' | 'running' | 'done' | 'error'.
export function useGenQueue(onGerado) {
  const [jobs, setJobs] = useState([])
  const jobSeq = useRef(0)
  const despachados = useRef(new Set())
  const onGeradoRef = useRef(onGerado); onGeradoRef.current = onGerado

  const startGen = (payload, targetPath, label) => {
    setJobs((js) => js.some((j) => j.targetPath === targetPath && (j.status === 'queued' || j.status === 'running'))
      ? js // já está na fila/rodando, não duplica
      : [...js, { id: ++jobSeq.current, payload, targetPath, label, status: 'queued' }])
  }

  const dismissJob = (id) => setJobs((js) => js.filter((j) => j.id !== id))

  const marcar = (id, campos) => setJobs((js) => js.map((j) => (j.id === id ? { ...j, ...campos } : j)))

  async function runJob(job) {
    try {
      const r = await gerarImagem(job.payload)
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
