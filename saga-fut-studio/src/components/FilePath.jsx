import React from 'react'
import { CopyButton } from './CopyButton.jsx'
import { Icon } from './Icon.jsx'

// onde salvar/está o arquivo. É referência, não protagonista: fica apagado e,
// em coluna estreita, corta com reticências (o caminho todo vai no title).
export function FilePath({ path }) {
  return (
    <div className="file-path" title={'saga-fut/' + path}>
      <Icon name="pasta" size={12} />
      <span className="file-path-txt">saga-fut/<strong>{path}</strong></span>
      <CopyButton text={path} label="copiar" />
    </div>
  )
}
