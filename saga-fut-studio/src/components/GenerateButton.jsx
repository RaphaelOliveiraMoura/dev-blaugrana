import React, { useState } from 'react'
import { Icon } from './Icon.jsx'
import { MAX_GERACOES_PARALELAS } from '../../shared/constantes.mjs'

// botão Gerar com modal de confirmação. A geração vai pra uma FILA em segundo
// plano: confirmar fecha o modal e libera o studio; a imagem aparece sozinha quando
// termina. Só o botão do próprio alvo desabilita (evita enfileirar a mesma imagem 2x);
// os outros continuam clicáveis pra rodar junto.
export function GenerateButton({ payload, targetPath, existing, jobs, startGen, label = 'Gerar imagem', refInfo }) {
  const [open, setOpen] = useState(false)
  const jaExiste = !!existing[targetPath]
  const myJob = jobs.find((j) => j.targetPath === targetPath && (j.status === 'queued' || j.status === 'running'))

  function confirmar() {
    startGen(payload, targetPath, label)
    setOpen(false) // vai pra fila e roda em segundo plano
  }

  return (
    <>
      <button className="btn btn-primary" onClick={() => setOpen(true)} disabled={!!myJob}>
        {myJob ? <span className="gen-spinner" /> : <Icon name="gerar" size={14} />}
        {myJob?.status === 'running' ? 'gerando…' : myJob?.status === 'queued' ? 'na fila…' : label}
      </button>

      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <h4>Gerar imagem com IA</h4>
            {jaExiste
              ? <p className="modal-warn">
                  <Icon name="alerta" size={14} />
                  <span>Isso vai <strong>substituir</strong> a imagem atual, não dá pra desfazer.</span>
                </p>
              : <p>Gera via Codex (gpt-image-2, sua assinatura ChatGPT Plus). Sem custo de API.</p>}
            <p className="modal-path">
              <Icon name="pasta" size={12} />
              saga-fut/<strong>{targetPath}</strong>
            </p>
            {refInfo && <p>{refInfo}</p>}
            <p>
              Roda em segundo plano, pode fechar e disparar outras (até {MAX_GERACOES_PARALELAS} em
              paralelo). A imagem aparece sozinha ao terminar.
            </p>
            <div className="modal-actions">
              <button className="btn" onClick={() => setOpen(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={confirmar}>
                <Icon name="gerar" size={14} />
                {jaExiste ? 'Substituir' : 'Gerar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
