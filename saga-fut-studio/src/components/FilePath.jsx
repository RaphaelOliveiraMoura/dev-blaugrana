import React from 'react'
import { CopyButton } from './CopyButton.jsx'
import { Icon } from './Icon.jsx'

// onde salvar/está o arquivo. É referência, não protagonista: fica apagado.
export function FilePath({ path }) {
  return (
    <div className="file-path">
      <span className="file-path-txt" title={'saga-fut/' + path}>
        <Icon name="pasta" size={12} />
        saga-fut/<strong>{path}</strong>
      </span>
      <CopyButton text={path} label="copiar" />
    </div>
  )
}
