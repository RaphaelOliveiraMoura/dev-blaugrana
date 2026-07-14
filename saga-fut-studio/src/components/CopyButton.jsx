import React, { useState } from 'react'
import { Icon } from './Icon.jsx'

export function CopyButton({ text, label = 'Copiar' }) {
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
    <button className={'copy-btn' + (copied ? ' copied' : '')} onClick={copy}>
      <Icon name={copied ? 'check' : 'copiar'} size={12} />
      {copied ? 'Copiado' : label}
    </button>
  )
}
