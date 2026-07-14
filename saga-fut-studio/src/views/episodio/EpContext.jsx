import React, { createContext, useContext } from 'react'

// O episódio aberto, resolvido uma vez pelo index e lido pelas sub-abas.
// Evita repassar { saga, si, ep, ei, setEp } por cinco componentes.
const EpCtx = createContext(null)

export function EpProvider({ value, children }) {
  return <EpCtx.Provider value={value}>{children}</EpCtx.Provider>
}

export function useEp() {
  const ctx = useContext(EpCtx)
  if (!ctx) throw new Error('useEp() só funciona dentro de <EpProvider>')
  return ctx
}
