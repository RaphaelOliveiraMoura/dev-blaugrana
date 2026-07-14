import React, { useState } from 'react'

// ---------- utilitários de UI compartilhados ----------

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

export function StatusPill({ value, onChange }) {
  const opts = ['pendente', 'gerada', 'aprovada', 'refazer']
  return (
    <select className={'status-pill s-' + value} value={value} onChange={(e) => onChange(e.target.value)}>
      {opts.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  )
}

export function Media({ existing, src, kind, bust }) {
  if (!existing[src]) return <div className="media-missing">{kind === 'video' ? '🎬' : '🖼'} ainda não gerado</div>
  const url = '/files/' + src + (bust ? '?v=' + bust : '')
  return kind === 'video'
    ? <video className="media" src={url} controls preload="metadata" />
    : <img className="media" src={url} alt={src} />
}

// botão ⚡ Gerar com modal de confirmação. A geração vai pra uma FILA em segundo
// plano (até 4 em paralelo): confirmar fecha o modal e libera o studio; a imagem
// aparece sozinha quando termina. Só o botão do próprio alvo desabilita (evita
// enfileirar a mesma imagem 2x); os outros continuam clicáveis pra rodar junto.
export function GenerateButton({ payload, targetPath, existing, jobs, startGen, label = '⚡ Gerar imagem', refInfo }) {
  const [open, setOpen] = useState(false)
  const jaExiste = !!existing[targetPath]
  const myJob = jobs.find((j) => j.targetPath === targetPath && (j.status === 'queued' || j.status === 'running'))

  function confirmar() {
    startGen(payload, targetPath, label)
    setOpen(false) // vai pra fila e roda em segundo plano
  }

  return (
    <>
      <button className="gen-btn" onClick={() => setOpen(true)} disabled={!!myJob}>
        {myJob?.status === 'running' ? '⏳ gerando…' : myJob?.status === 'queued' ? '⏳ na fila…' : label}
      </button>
      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h4>⚡ Gerar imagem com IA</h4>
            {jaExiste
              ? <p className="modal-warn">⚠ Isso vai <strong>substituir</strong> a imagem atual, não dá pra desfazer.</p>
              : <p>Gera via Codex (gpt-image-2, sua assinatura ChatGPT Plus). Sem custo de API.</p>}
            <p className="modal-path">📁 saga-fut/<strong>{targetPath}</strong></p>
            {refInfo && <p className="muted" style={{ fontSize: 12 }}>{refInfo}</p>}
            <p className="muted" style={{ fontSize: 12.5 }}>
              Roda em segundo plano, pode fechar e disparar outras (até 4 em paralelo). A imagem aparece sozinha ao terminar.
            </p>
            <div className="modal-actions">
              <button className="ctrl" onClick={() => setOpen(false)}>Cancelar</button>
              <button className="save-btn" onClick={confirmar}>{jaExiste ? 'Substituir' : 'Gerar'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// onde salvar o arquivo para o painel carregar
export function FilePath({ path }) {
  return (
    <div className="file-path">
      <span title="Salve o arquivo exatamente neste caminho (dentro de saga-fut/)">📁 saga-fut/<strong>{path}</strong></span>
      <CopyButton text={path} label="copiar caminho" />
    </div>
  )
}

export function CharAvatar({ p, existing, bust }) {
  return existing[p.imagem]
    ? <img className="avatar" src={'/files/' + p.imagem + (bust ? '?v=' + bust : '')} alt={p.nome} title={p.nome} />
    : <span className="avatar avatar-empty" title={p.nome}>{p.nome[0]}</span>
}

// editor de elenco da cena: chips que ciclam aparece(✓) → não aparece(✗) → neutro
export function CenaCast({ elencoIds, byId, personagens, naoAparecem, onChange }) {
  const stateOf = (id) => personagens.includes(id) ? 'in' : naoAparecem.includes(id) ? 'out' : 'off'
  const cycle = (id) => {
    const s = stateOf(id)
    let p = personagens.filter((x) => x !== id)
    let n = naoAparecem.filter((x) => x !== id)
    if (s === 'off') p = [...p, id]
    else if (s === 'in') n = [...n, id]
    onChange(p, n)
  }
  return (
    <div className="cast-editor">
      {elencoIds.length === 0
        ? <span className="muted" style={{ fontSize: 12 }}>Adicione personagens ao elenco da saga primeiro (aba da saga).</span>
        : elencoIds.map((id) => {
          const s = stateOf(id)
          return (
            <button key={id} className={'cast-chip ' + s} onClick={() => cycle(id)}
              title="clique: aparece → não aparece → neutro">
              {s === 'in' ? '✓ ' : s === 'out' ? '✗ ' : ''}{byId[id]?.nome || id}
            </button>
          )
        })}
    </div>
  )
}

// modal de confirmação reutilizável (para ações destrutivas)
export function ConfirmModal({ titulo, mensagem, confirmar, onConfirm, onCancel, perigo }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h4>{titulo}</h4>
        <p style={{ whiteSpace: 'pre-wrap' }}>{mensagem}</p>
        <div className="modal-actions">
          <button className="ctrl" onClick={onCancel}>Cancelar</button>
          <button className={perigo ? 'gen-btn' : 'save-btn'} onClick={onConfirm}>{confirmar || 'Confirmar'}</button>
        </div>
      </div>
    </div>
  )
}

// input inline editável (rótulo pequeno em cima), para metadados de saga/episódio/quadrinho
export function EditField({ label, value, onChange, textarea, placeholder }) {
  return (
    <label className="edit-field">
      <span className="edit-label">{label}</span>
      {textarea
        ? <textarea value={value || ''} placeholder={placeholder} rows={Math.min(6, Math.max(2, Math.ceil((value || '').length / 80)))} onChange={(e) => onChange(e.target.value)} />
        : <input value={value || ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />}
    </label>
  )
}

// bandeja da fila de geração (canto inferior direito), múltiplos jobs em paralelo
export function GenTray({ jobs, dismissJob }) {
  if (!jobs.length) return null
  const c = (s) => jobs.filter((j) => j.status === s).length
  const parts = []
  if (c('running')) parts.push(`${c('running')} gerando`)
  if (c('queued')) parts.push(`${c('queued')} na fila`)
  if (c('done')) parts.push(`${c('done')} ok`)
  if (c('error')) parts.push(`${c('error')} erro`)
  return (
    <div className="gen-tray" role="status">
      <div className="gen-tray-head"><span>⚡ {parts.join(' · ') || 'geração'}</span></div>
      <div className="gen-tray-list">
        {jobs.map((j) => (
          <div key={j.id} className={'gen-tray-row ' + j.status}>
            <span className="gen-tray-ic">
              {j.status === 'running' ? <span className="gen-spinner" /> : j.status === 'queued' ? '⏳' : j.status === 'done' ? '✓' : '⚠'}
            </span>
            <span className="gen-tray-name">
              {j.targetPath.split('/').pop()}
              {j.status === 'error' && <span className="gen-tray-err">, {j.err}</span>}
            </span>
            {j.status === 'error' && <button className="toast-x" onClick={() => dismissJob(j.id)}>✕</button>}
          </div>
        ))}
      </div>
    </div>
  )
}
