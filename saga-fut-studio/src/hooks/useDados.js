import { useEffect, useRef, useState } from 'react'
import { getDados, saveDados } from '../api/dados.js'

// Dono do objeto do projeto: carga, edição e gravação.
// Toda edição passa por `update`, que clona antes de mutar e marca como não salvo.
export function useDados() {
  const [dados, setDados] = useState(null)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    getDados().then(setDados).catch((e) => setError(e.message))
  }, [])

  const update = (mutator) => {
    setDados((prev) => {
      const next = structuredClone(prev)
      mutator(next)
      return next
    })
    setDirty(true)
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

  // avisa antes de sair com alterações não salvas + atalho ⌘/Ctrl+S
  // (via refs para o listener não capturar um `dirty`/`save` velho)
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

  return { dados, update, save, dirty, saving, error }
}
