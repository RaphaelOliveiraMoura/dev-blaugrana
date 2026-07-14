import React from 'react'
import { CopyButton } from './CopyButton.jsx'

export function PromptBlock({ label, tool, value, onChange, copyText, hint }) {
  return (
    <div className="prompt-block">
      <div className="prompt-head">
        <span className="prompt-label">
          {label} {tool && <span className="tool-tag">{tool}</span>}
        </span>
        <CopyButton text={copyText ?? value} />
      </div>
      <textarea
        className="prompt-text"
        value={value}
        rows={Math.min(10, Math.max(3, Math.ceil(value.length / 90)))}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
      />
      {hint && <div className="prompt-hint">{hint}</div>}
    </div>
  )
}
