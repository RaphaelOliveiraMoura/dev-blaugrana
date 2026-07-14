import React from 'react'
import { GenTray } from './components/index.js'
import { useDados } from './hooks/useDados.js'
import { useMidia } from './hooks/useMidia.js'
import { useGenQueue } from './hooks/useGenQueue.js'
import { useNav } from './hooks/useNav.js'
import { StudioProvider } from './app/StudioContext.jsx'
import { Sidebar } from './app/Sidebar.jsx'
import { Topbar } from './app/Topbar.jsx'
import { Rotas } from './app/Rotas.jsx'
import { buildCrumbs } from './app/crumbs.js'
import { topOf } from './app/nav.js'
import { acharSaga, acharEpisodio, acharQuadrinho } from './lib/localizar.js'

export default function App() {
  const { dados, update, save, dirty, saving, error } = useDados()
  const { existing, progress, bust, marcarGerado } = useMidia(dados)
  const { jobs, startGen, dismissJob } = useGenQueue(marcarGerado)
  const [route, nav] = useNav()

  if (error && !dados) return <div className="boot-error">Erro: {error}</div>
  if (!dados) return <div className="boot-loading">Carregando…</div>

  // resolve os ids da URL contra os dados carregados (o link pode ser antigo)
  const naSaga = route.sagaId ? acharSaga(dados, route.sagaId) : null
  const noEp = route.epId ? acharEpisodio(dados, route.sagaId, route.epId) : null
  const noQuad = route.quadId ? acharQuadrinho(dados, route.quadId) : null
  const saga = naSaga?.saga || null
  const ep = noEp?.ep || null
  const quad = noQuad?.quad || null
  if ((route.page === 'saga' && !saga) || (route.page === 'ep' && !ep) || (route.page === 'quadrinho' && !quad)) {
    return <div className="boot-loading">Não encontrado. <a href="#/home" style={{ color: 'var(--gold)' }}>Voltar ao início</a></div>
  }

  return (
    <StudioProvider value={{ dados, update, existing, progress, bust, jobs, startGen, nav }}>
      <div className="layout">
        <Sidebar activeTop={topOf(route.page)} onIr={nav.ir} />
        <main className="content">
          <Topbar
            crumbs={buildCrumbs(route, { saga, ep, quad })}
            onCrumb={nav.rota}
            dirty={dirty}
            saving={saving}
            error={error}
            onSave={save}
          />
          <Rotas route={route} />
        </main>
        <GenTray jobs={jobs} dismissJob={dismissJob} />
      </div>
    </StudioProvider>
  )
}
