import React, { useState } from 'react'
import { Icon } from './Icon.jsx'

// label={null} deixa só o ícone (para barra de ferramentas apertada).
export function CopyButton({ text, label = 'Copiar', title, icon = 'copiar' }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }
  return (
    <button
      className={'copy-btn' + (copied ? ' copied' : '') + (label === null ? ' copy-btn-icon' : '')}
      onClick={copy}
      title={title}
    >
      <Icon name={copied ? 'check' : icon} size={12} />
      {label !== null && (copied ? 'Copiado' : label)}
    </button>
  )
}
