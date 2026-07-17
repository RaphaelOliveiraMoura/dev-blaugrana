import { useEffect, useState } from 'react'
import { getModelosImagem } from '../api/geracao.js'

// A lista de modelos de imagem (Codex/Grok) e o padrão, do servidor. Usado pelo seletor
// no Início e pelo indicador da sidebar. A busca é cacheada na camada de API, então
// montar vários consumidores não multiplica requests.
export function useModelosImagem() {
  const [modelos, setModelos] = useState([])
  const [padrao, setPadrao] = useState('codex')

  useEffect(() => {
    let vivo = true
    getModelosImagem()
      .then((r) => { if (vivo) { setModelos(r.modelos || []); setPadrao(r.padrao || 'codex') } })
      .catch(() => {})
    return () => { vivo = false }
  }, [])

  return { modelos, padrao }
}
