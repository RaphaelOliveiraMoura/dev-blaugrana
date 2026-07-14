import React from 'react'
import { PromptBlock } from '../components/index.js'

// INÍCIO: painel de visão geral + referências da casa (ferramentas, regras, áudio)
export default function Home({ dados, goSagas, goQuadrinhos, goPersonagens, onEditRules }) {
  const nSagas = (dados.sagas || []).length
  const nEps = (dados.sagas || []).reduce((a, s) => a + s.episodios.length, 0)
  const nQuad = (dados.quadrinhos || []).length
  const nChar = (dados.personagens || []).length
  return (
    <div>
      <div className="cards-row">
        <div className="stat-card hub-card" onClick={goSagas} role="button" tabIndex={0}>
          <div className="stat-num">📺 {nSagas}</div>
          <div className="stat-label">sagas · {nEps} episódios (vídeo)</div>
          <div className="hub-go">Abrir sagas →</div>
        </div>
        <div className="stat-card hub-card" onClick={goQuadrinhos} role="button" tabIndex={0}>
          <div className="stat-num">🗯 {nQuad}</div>
          <div className="stat-label">quadrinhos (imagem)</div>
          <div className="hub-go">Abrir quadrinhos →</div>
        </div>
        <div className="stat-card hub-card" onClick={goPersonagens} role="button" tabIndex={0}>
          <div className="stat-num">👥 {nChar}</div>
          <div className="stat-label">personagens no pool</div>
          <div className="hub-go">Abrir pool →</div>
        </div>
      </div>

      <div className="panel">
        <h3>Pipeline de ferramentas</h3>
        <table className="tools-table">
          <tbody>
            {(dados.ferramentas || []).map((f) => (
              <tr key={f.etapa}>
                <td className="tool-etapa">{f.etapa}</td>
                <td className="tool-nome">{f.nome}</td>
                <td className="muted">{f.nota}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h3>Regras da casa (negativos anexados a todo prompt de imagem)</h3>
        <p className="muted">Isto vai junto automaticamente quando você copia qualquer prompt de ficha ou cena, evita marcas, quebra de consistência e desvio de estilo.</p>
        <PromptBlock
          label="Bloco de negativos/consistência"
          value={dados.projeto.promptRules}
          onChange={(v) => onEditRules(v)}
        />
      </div>

      <div className="panel">
        <h3>Áudio da casa (todos os projetos)</h3>
        <p className="muted">{dados.audio.narradorVoz}</p>
        <PromptBlock label="Vinheta (gerar 1x e reusar)" tool="Suno" value={dados.audio.vinhetaPrompt} onChange={() => {}} />
      </div>
    </div>
  )
}
