import React, { createContext, useContext } from 'react'

// Estado ambiente do studio: o projeto inteiro, o que existe em disco, a fila de
// geração e a navegação. As views puxam daqui em vez de receber tudo por prop.
const StudioCtx = createContext(null)

export function StudioProvider({ value, children }) {
  return <StudioCtx.Provider value={value}>{children}</StudioCtx.Provider>
}

export function useStudio() {
  const ctx = useContext(StudioCtx)
  if (!ctx) throw new Error('useStudio() só funciona dentro de <StudioProvider>')
  return ctx
}
