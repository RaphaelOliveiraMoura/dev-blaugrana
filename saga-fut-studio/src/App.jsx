import React, { useEffect, useRef, useState } from 'react'
import { getDados, saveDados } from './api.js'
import { parseHash, routeToHash } from './lib/helpers.js'
import { blankSaga, blankQuadrinho } from './lib/scaffold.js'
import { GenTray } from './ui.jsx'
import Home from './views/Home.jsx'
import SagasList from './views/SagasList.jsx'
import SagaView from './views/Saga.jsx'
import EpView from './views/Episodio.jsx'
import QuadrinhosList from './views/QuadrinhosList.jsx'
import QuadrinhoView from './views/Quadrinho.jsx'
import PersonagensView from './views/Personagens.jsx'
import EstilosView from './views/Estilos.jsx'
import RedesView from './views/Redes.jsx'
import Melhorias from './views/Melhorias.jsx'

// grupo do menu que fica ativo para cada página (detalhe herda o grupo do pai)
function topOf(page) {
  if (page === 'sagas' || page === 'saga' || page === 'ep') return 'sagas'
  if (page === 'quadrinhos' || page === 'quadrinho') return 'quadrinhos'
  return page
}

const NAV_GROUPS = [
  { label: 'Criar', items: [
    { page: 'home', icon: '🏠', label: 'Início' },
    { page: 'sagas', icon: '📺', label: 'Sagas' },
    { page: 'quadrinhos', icon: '🗯', label: 'Quadrinhos' },
  ] },
  { label: 'Biblioteca', items: [
    { page: 'personagens', icon: '👥', label: 'Personagens' },
    { page: 'estilos', icon: '🎨', label: 'Estilos' },
  ] },
  { label: 'Estratégia', items: [
    { page: 'redes', icon: '📱', label: 'Redes' },
    { page: 'melhorias', icon: '🛠', label: 'Melhorias' },
  ] },
]

export default function App() {
  const [dados, setDados] = useState(null)
  const [route, setRouteState] = useState(parseHash)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [existing, setExisting] = useState({})
  const [progress, setProgress] = useState(null)
  const [bust, setBust] = useState(0)

  // após gerar uma imagem: marca como existente, força reload (cache-bust) e atualiza contadores
  const onGenerated = (path) => {
    if (path) setExisting((prev) => ({ ...prev, [path]: true }))
    setBust(Date.now())
    fetch('/api/progress').then((r) => r.json()).then(setProgress).catch(() => {})
  }

  // fila de geração em SEGUNDO PLANO: até MAX_PARALLEL rodando ao mesmo tempo
  const MAX_PARALLEL = 4
  const [jobs, setJobs] = useState([]) // {id, payload, targetPath, label, status:'queued'|'running'|'done'|'error', err}
  const jobSeq = useRef(0)
  const dispatched = useRef(new Set())

  const startGen = (payload, targetPath, label) => {
    setJobs((js) => js.some((j) => j.targetPath === targetPath && (j.status === 'queued' || j.status === 'running'))
      ? js // já está na fila/rodando, não duplica
      : [...js, { id: ++jobSeq.current, payload, targetPath, label, status: 'queued' }])
  }
  const dismissJob = (id) => setJobs((js) => js.filter((j) => j.id !== id))

  async function runJob(job) {
    try {
      const r = await fetch('/api/generate/imagem', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(job.payload),
      }).then((r) => r.json())
      if (r.error) { setJobs((js) => js.map((j) => (j.id === job.id ? { ...j, status: 'error', err: r.error } : j))); return }
      onGenerated(r.path || job.targetPath)
      setJobs((js) => js.map((j) => (j.id === job.id ? { ...j, status: 'done' } : j)))
      setTimeout(() => setJobs((js) => js.filter((j) => !(j.id === job.id && j.status === 'done'))), 3000)
    } catch (e) {
      setJobs((js) => js.map((j) => (j.id === job.id ? { ...j, status: 'error', err: e.message } : j)))
    }
  }

  // bomba da fila: mantém até MAX_PARALLEL rodando; dispara os próximos da fila
  useEffect(() => {
    const rodando = jobs.filter((j) => j.status === 'running').length
    const livres = MAX_PARALLEL - rodando
    if (livres <= 0) return
    const proximos = jobs.filter((j) => j.status === 'queued' && !dispatched.current.has(j.id)).slice(0, livres)
    if (!proximos.length) return
    proximos.forEach((j) => dispatched.current.add(j.id))
    setJobs((js) => js.map((j) => (proximos.some((p) => p.id === j.id) ? { ...j, status: 'running' } : j)))
    proximos.forEach(runJob)
  }, [jobs])

  // grava a rota na URL sempre que muda
  const setRoute = (r) => setRouteState(r)
  useEffect(() => {
    const h = routeToHash(route)
    if (window.location.hash !== h) window.location.hash = h
  }, [route])
  // sincroniza com voltar/avançar do navegador
  useEffect(() => {
    const onHash = () => setRouteState(parseHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    getDados()
      .then((n) => {
        setDados(n)
        const paths = [
          ...n.personagens.map((p) => p.imagem),
          ...n.sagas.flatMap((s) => s.episodios.flatMap((e) => e.cenas.flatMap((c) => [c.imagem, c.video]))),
          ...(n.quadrinhos || []).flatMap((q) => (q.paineis || []).map((p) => p.imagem)),
        ]
        return fetch('/api/media-exists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paths }),
        }).then((r) => r.json())
      })
      .then(setExisting)
      .catch((e) => setError(e.message))
    fetch('/api/progress').then((r) => r.json()).then(setProgress).catch(() => {})
  }, [])

  const update = (mutator) => {
    setDados((prev) => {
      const next = structuredClone(prev)
      mutator(next)
      return next
    })
    setDirty(true)
  }

  // cria uma saga em branco (template) e navega para ela
  const onNewSaga = () => {
    const saga = blankSaga(dados.sagas.map((s) => s.id))
    const idx = dados.sagas.length
    update((n) => { n.sagas.push(saga) })
    setRoute({ page: 'saga', si: idx })
  }
  // cria um quadrinho em branco (por tipo) e navega para ele
  const onNewQuad = (tipo = 'tirinha') => {
    const q = blankQuadrinho((dados.quadrinhos || []).map((x) => x.id), tipo)
    const idx = (dados.quadrinhos || []).length
    update((n) => { if (!n.quadrinhos) n.quadrinhos = []; n.quadrinhos.push(q) })
    setRoute({ page: 'quadrinho', qi: idx })
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      await saveDados(dados)
      setDirty(false)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  // avisa antes de sair com alterações não salvas + atalho ⌘/Ctrl+S (via refs p/ evitar closure velho)
  const dirtyRef = useRef(dirty); dirtyRef.current = dirty
  const saveRef = useRef(() => {}); saveRef.current = () => { if (dirty && !saving) save() }
  useEffect(() => {
    const onUnload = (e) => { if (dirtyRef.current) { e.preventDefault(); e.returnValue = '' } }
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 's' || e.key === 'S')) { e.preventDefault(); saveRef.current() }
    }
    window.addEventListener('beforeunload', onUnload)
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('beforeunload', onUnload); window.removeEventListener('keydown', onKey) }
  }, [])

  if (error && !dados) return <div className="boot-error">Erro: {error}</div>
  if (!dados) return <div className="boot-loading">Carregando…</div>

  // valida a rota vinda da URL contra os dados carregados (evita índice inexistente)
  const saga = route.si != null ? dados.sagas[route.si] : null
  const ep = saga && route.ei != null ? saga.episodios[route.ei] : null
  const quad = route.qi != null ? (dados.quadrinhos || [])[route.qi] : null
  if ((route.page === 'saga' && !saga) || (route.page === 'ep' && !ep) || (route.page === 'quadrinho' && !quad)) {
    return <div className="boot-loading">Não encontrado. <a href="#/home" style={{ color: 'var(--gold)' }}>Voltar ao início</a></div>
  }
  const activeTop = topOf(route.page)

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand" onClick={() => setRoute({ page: 'home' })} style={{ cursor: 'pointer' }}>
          <div className="brand-title">⚽ SagaFut Studio</div>
          <div className="brand-sub">Universo de sagas de futebol</div>
        </div>
        <nav className="nav">
          {NAV_GROUPS.map((g) => (
            <div className="nav-group" key={g.label}>
              <div className="nav-group-label">{g.label}</div>
              {g.items.map((it) => (
                <button
                  key={it.page}
                  className={'nav-btn' + (activeTop === it.page ? ' active' : '')}
                  onClick={() => setRoute({ page: it.page })}
                >
                  {it.icon} {it.label}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-foot muted">⚡ Imagens: geração via Codex<br />(gpt-image-2 · ChatGPT Plus) ✓</div>
      </aside>

      <main className="content">
        <header className="topbar">
          <div className="crumbs">
            <span className="crumb" onClick={() => setRoute({ page: 'home' })}>Início</span>
            {activeTop === 'sagas' && <><span className="crumb-sep">›</span><span className={route.page === 'sagas' ? 'crumb-current' : 'crumb'} onClick={() => setRoute({ page: 'sagas' })}>Sagas</span></>}
            {activeTop === 'quadrinhos' && <><span className="crumb-sep">›</span><span className={route.page === 'quadrinhos' ? 'crumb-current' : 'crumb'} onClick={() => setRoute({ page: 'quadrinhos' })}>Quadrinhos</span></>}
            {route.page === 'personagens' && <><span className="crumb-sep">›</span><span className="crumb-current">Personagens</span></>}
            {route.page === 'estilos' && <><span className="crumb-sep">›</span><span className="crumb-current">Estilos</span></>}
            {route.page === 'redes' && <><span className="crumb-sep">›</span><span className="crumb-current">Redes</span></>}
            {route.page === 'melhorias' && <><span className="crumb-sep">›</span><span className="crumb-current">Melhorias</span></>}
            {saga && <><span className="crumb-sep">›</span><span className={ep ? 'crumb' : 'crumb-current'} onClick={() => setRoute({ page: 'saga', si: route.si })}>{saga.titulo}</span></>}
            {ep && <><span className="crumb-sep">›</span><span className="crumb-current">{ep.id.toUpperCase()}, {ep.titulo}</span></>}
            {quad && <><span className="crumb-sep">›</span><span className="crumb-current">{quad.titulo}</span></>}
          </div>
          <div className="topbar-actions">
            {error && <span className="save-error">⚠ {error}</span>}
            {dirty ? (
              <>
                <span className="dirty-dot" title="Há alterações não salvas">● não salvo</span>
                <button className="save-btn" onClick={save} disabled={saving}>
                  {saving ? 'Salvando…' : '💾 Salvar'} <kbd>⌘S</kbd>
                </button>
              </>
            ) : <span className="saved-ok muted">tudo salvo ✓</span>}
          </div>
        </header>

        {route.page === 'home' && <Home dados={dados} goSagas={() => setRoute({ page: 'sagas' })} goQuadrinhos={() => setRoute({ page: 'quadrinhos' })} goPersonagens={() => setRoute({ page: 'personagens' })} onEditRules={(v) => update((n) => { n.projeto.promptRules = v })} />}
        {route.page === 'sagas' && <SagasList dados={dados} existing={existing} progress={progress} goSaga={(si) => setRoute({ page: 'saga', si })} bust={bust} onNewSaga={onNewSaga} />}
        {route.page === 'quadrinhos' && <QuadrinhosList dados={dados} existing={existing} progress={progress} goQuad={(qi) => setRoute({ page: 'quadrinho', qi })} bust={bust} onNewQuad={onNewQuad} />}
        {route.page === 'personagens' && <PersonagensView dados={dados} update={update} existing={existing} bust={bust} jobs={jobs} startGen={startGen} />}
        {route.page === 'melhorias' && <Melhorias dados={dados} update={update} />}
        {route.page === 'redes' && <RedesView />}
        {route.page === 'estilos' && <EstilosView dados={dados} update={update} />}
        {route.page === 'saga' && <SagaView dados={dados} si={route.si} update={update} existing={existing} progress={progress} goEp={(si, ei) => setRoute({ page: 'ep', si, ei })} bust={bust} jobs={jobs} startGen={startGen} goSaga={(si) => setRoute({ page: 'saga', si })} goHome={() => setRoute({ page: 'sagas' })} />}
        {route.page === 'ep' && <EpView dados={dados} si={route.si} ei={route.ei} update={update} existing={existing} sub={route.sub || 'cenas'} setSub={(s) => setRoute({ page: 'ep', si: route.si, ei: route.ei, sub: s })} bust={bust} jobs={jobs} startGen={startGen} />}
        {route.page === 'quadrinho' && <QuadrinhoView dados={dados} qi={route.qi} update={update} existing={existing} bust={bust} jobs={jobs} startGen={startGen} goQuad={(qi) => setRoute({ page: 'quadrinho', qi })} goQuadrinhos={() => setRoute({ page: 'quadrinhos' })} />}
      </main>

      <GenTray jobs={jobs} dismissJob={dismissJob} />
    </div>
  )
}
