import React, { useState } from 'react'

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
      {copied ? '✓ Copiado!' : label}
    </button>
  )
}
