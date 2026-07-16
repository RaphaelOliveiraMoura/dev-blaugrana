import React, { useState } from 'react'
import { Icon } from './Icon.jsx'
import { useStudio } from '../app/StudioContext.jsx'
import { MAX_GERACOES_PARALELAS } from '../../shared/constantes.mjs'

// botão Gerar com modal de confirmação. A geração vai pra uma FILA em segundo
// plano: confirmar fecha o modal e libera o studio; a imagem aparece sozinha quando
// termina. Só o botão do próprio alvo desabilita (evita enfileirar a mesma imagem 2x);
// os outros continuam clicáveis pra rodar junto.
//
// Com alteração pendente, o startGen do App salva antes (é o servidor que monta o
// prompt, lendo o disco). Isso é dito aqui, e não escondido: o clique grava o
// projeto inteiro, e quem aperta merece saber disso antes.
export function GenerateButton({ payload, targetPath, existing, jobs, startGen, label = 'Gerar imagem', refInfo, compacto }) {
  const { dirty } = useStudio()
  const [open, setOpen] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [falhou, setFalhou] = useState(false)
  const jaExiste = !!existing[targetPath]
  const myJob = jobs.find((j) => j.targetPath === targetPath && (j.status === 'queued' || j.status === 'running'))

  async function confirmar() {
    setSalvando(true)
    setFalhou(false)
    const ok = await startGen(payload, targetPath, label)
    setSalvando(false)
    // falhou o salvar: o modal FICA, senão o clique somiria sem imagem e sem motivo
    if (ok) setOpen(false) // foi pra fila e roda em segundo plano
    else setFalhou(true)
  }

  const texto = myJob?.status === 'running' ? 'gerando…'
    : myJob?.status === 'queued' ? 'na fila…'
      : jaExiste ? 'Regerar' : label

  return (
    <>
      {/* grená é ação: só grita onde a imagem falta. Com ela na mão isto vira um
          "regerar", que é raro e substitui o arquivo, então veste o secundário. */}
      <button
        className={'btn' + (jaExiste ? '' : ' btn-primary') + (compacto ? ' btn-icon btn-sm' : '')}
        onClick={() => setOpen(true)}
        disabled={!!myJob}
        // compacto o texto vira tooltip: numa barra de ícones não cabe, mas é o que
        // diz se este clique cria ou substitui
        title={compacto ? texto + (jaExiste ? ': substitui a imagem atual' : '') : jaExiste ? 'Substitui a imagem atual' : undefined}
      >
        {myJob ? <span className="gen-spinner" /> : <Icon name="gerar" size={14} />}
        {!compacto && texto}
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
            {/* quem monta o prompt é o servidor, lendo o disco: sem salvar, a imagem
                sairia com o texto de antes da sua última edição */}
            {dirty && (
              <p className="modal-warn">
                <Icon name="salvar" size={14} />
                <span>Você tem alterações não salvas. Elas serão <strong>salvas antes</strong>, senão a imagem sairia com o texto antigo.</span>
              </p>
            )}
            <p>
              Roda em segundo plano, pode fechar e disparar outras (até {MAX_GERACOES_PARALELAS} em
              paralelo). A imagem aparece sozinha ao terminar.
            </p>
            {falhou && (
              <p className="modal-warn modal-erro">
                <Icon name="alerta" size={14} />
                <span>Não deu pra salvar as alterações, então <strong>nada foi gerado</strong>. O erro está na barra do topo.</span>
              </p>
            )}
            <div className="modal-actions">
              <button className="btn" onClick={() => setOpen(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={confirmar} disabled={salvando}>
                {salvando ? <span className="gen-spinner" /> : <Icon name="gerar" size={14} />}
                {salvando ? 'salvando…' : dirty ? (jaExiste ? 'Salvar e substituir' : 'Salvar e gerar') : (jaExiste ? 'Substituir' : 'Gerar')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
