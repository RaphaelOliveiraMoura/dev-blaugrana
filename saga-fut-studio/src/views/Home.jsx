import React from 'react'
import { PromptBlock, Icon } from '../components/index.js'
import { useStudio } from '../app/StudioContext.jsx'

// INÍCIO: painel de visão geral + referências da casa (ferramentas, regras, áudio)
export default function Home() {
  const { dados, update, nav } = useStudio()
  const nEps = (dados.sagas || []).reduce((a, s) => a + s.episodios.length, 0)

  const hubs = [
    { page: 'sagas', icon: 'sagas', num: (dados.sagas || []).length, label: `sagas · ${nEps} episódios`, ir: 'Abrir sagas' },
    { page: 'quadrinhos', icon: 'quadrinhos', num: (dados.quadrinhos || []).length, label: 'quadrinhos', ir: 'Abrir quadrinhos' },
    { page: 'personagens', icon: 'personagens', num: (dados.personagens || []).length, label: 'personagens no pool', ir: 'Abrir pool' },
  ]

  return (
    <div>
      <div className="cards-row">
        {hubs.map((h) => (
          <div key={h.page} className="stat-card hub-card" onClick={() => nav.ir(h.page)} role="button" tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') nav.ir(h.page) }}>
            <Icon name={h.icon} size={18} className="muted" />
            <div className="stat-num">{h.num}</div>
            <div className="stat-label">{h.label}</div>
            <div className="hub-go">{h.ir} <Icon name="chevron" size={12} /></div>
          </div>
        ))}
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
        <h3>Regras da casa</h3>
        <p className="hint">
          Vai junto automaticamente quando você copia ou gera qualquer prompt de ficha ou cena. Evita marcas,
          quebra de consistência e desvio de estilo.
        </p>
        <PromptBlock
          label="Negativos e consistência"
          value={dados.projeto.promptRules}
          onChange={(v) => update((n) => { n.projeto.promptRules = v })}
        />
      </div>

      <div className="panel">
        <h3>Áudio da casa</h3>
        <p className="hint">{dados.audio.narradorVoz}</p>
        <PromptBlock label="Vinheta" tool="Suno · gerar 1x e reusar" value={dados.audio.vinhetaPrompt} onChange={() => {}} />
      </div>
    </div>
  )
}
