import React from 'react'

// O card da grade de artes (painel do quadrinho, cena do episódio).
//
// A arte é o conteúdo, então ela é o card: uma lista de "Painel 1, Painel 2" não
// diz nada sobre um quadrinho que já está pronto. O texto que descreve a arte vive
// no detalhe, a um clique.
//
// As ações ficam à vista e não em hover: regerar e copiar prompt são o trabalho
// repetido da tela, e escondê-las obrigaria a caçar o card certo com o mouse.
//
// ar: a proporção do quadro, só quando há arte. Vazio não merece o tamanho de
// cheio, e sem ela o quadro encolhe até a imagem existir.
export function MidiaCard({ numero, titulo, sinais, ar, midia, acoes, onAbrir }) {
  return (
    <div className="midia-card">
      <button className="midia-card-abrir" onClick={onAbrir} title="Abrir os detalhes">
        <span className="midia-card-quadro" style={{ aspectRatio: ar }}>{midia}</span>
        <span className="midia-card-num">{numero}</span>
      </button>
      <div className="midia-card-pe">
        {/* uma linha só, então o título inteiro fica no tooltip e no detalhe */}
        <span className="midia-card-titulo" title={typeof titulo === 'string' ? titulo : undefined}>{titulo}</span>
        {sinais}
        <span className="midia-card-acoes">{acoes}</span>
      </div>
    </div>
  )
}
