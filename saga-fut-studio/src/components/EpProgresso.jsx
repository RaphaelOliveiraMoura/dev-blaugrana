import React from 'react'
import { Icon } from './Icon.jsx'

// O progresso de um episódio na lista. Episódio pronto diz "pronto" e cala a boca:
// "4/4 4/4 4/4 ✓ pronto" são quatro jeitos de contar a mesma novidade, e numa saga
// fechada isso vira uma parede de verde onde nada chama atenção. Enquanto falta
// coisa, os contadores é que são o assunto, e só o que fechou fica verde.
export function EpProgresso({ p }) {
  if (p.done) {
    return (
      <div className="ep-row-prog">
        <span className="ep-done"><Icon name="check" size={12} /> pronto</span>
      </div>
    )
  }
  const etapas = [
    { icon: 'imagem', feito: p.img, nome: 'imagens' },
    { icon: 'video', feito: p.vid, nome: 'vídeos' },
    { icon: 'narracao', feito: p.audio, nome: 'narração' },
  ]
  return (
    <div className="ep-row-prog">
      {etapas.map((e) => (
        <span key={e.icon} title={e.nome} className={e.feito === p.total ? 'ok' : ''}>
          <Icon name={e.icon} size={12} /> {e.feito}/{p.total}
        </span>
      ))}
    </div>
  )
}
