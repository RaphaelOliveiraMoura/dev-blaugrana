import React from 'react'
import { CopyButton } from './CopyButton.jsx'

// onde salvar o arquivo para o painel carregar
export function FilePath({ path }) {
  return (
    <div className="file-path">
      <span title="Salve o arquivo exatamente neste caminho (dentro de saga-fut/)">📁 saga-fut/<strong>{path}</strong></span>
      <CopyButton text={path} label="copiar caminho" />
    </div>
  )
}
