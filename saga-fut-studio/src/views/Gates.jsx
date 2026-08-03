import React, { useEffect, useRef, useState } from 'react'

// GATES — a bancada de calibragem.
//
// POR QUE EXISTE: cinco vezes um limiar deste projeto reprovou arte boa, e as cinco só apareceram
// porque alguém estava olhando o terminal na hora. Aqui cada reprovação vira uma linha que sobrevive
// à sessão, com a FOLHA guardada ao lado (o pipeline regera por cima, então a prova é uma cópia
// feita no instante da reprovação) e dois botões: o gate acertou, ou reprovou arte boa.
//
// O número que decide o que consertar é a TAXA DE FALSO POSITIVO por gate, não o total de
// reprovações: um gate que reprova muito e acerta sempre está trabalhando; um que erra metade das
// vezes ensina todo mundo a usar `--forcar`, e aí ele deixou de existir na prática.

const PCT = (v) => (v == null ? '—' : `${Math.round(v * 100)}%`)

function Resumo({ resumo, filtro, setFiltro }) {
  if (!resumo.length) return null
  return (
    <div className="gate-resumo">
      {resumo.map((g) => {
        const alerta = g.taxaFalsoPositivo != null && g.taxaFalsoPositivo >= 0.3
        return (
          <button
            key={g.gate}
            type="button"
            className={'gate-chip' + (filtro === g.gate ? ' active' : '') + (alerta ? ' alerta' : '')}
            onClick={() => setFiltro(filtro === g.gate ? null : g.gate)}
            title={alerta ? 'este gate está reprovando arte boa com frequência' : 'filtrar por este gate'}
          >
            <strong>{g.gate}</strong>
            <span>{g.total} reprovações · {g.fails} fail / {g.avisos} aviso</span>
            <span className={alerta ? 'gate-fp ruim' : 'gate-fp'}>
              {g.julgados ? `${PCT(g.taxaFalsoPositivo)} falso positivo (${g.julgados} julgados)` : 'nenhum julgado ainda'}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// PREVIEW ANIMADO — o defeito que estes gates medem só existe ENTRE quadros.
//
// "O corpo escorrega", "a perna não troca", "a animação para por um frame": nenhum desses se vê num
// quadro parado, e é exatamente por isso que eles passavam batido por todas as outras réguas, que
// mediam UM sprite por vez. Julgar se o gate acertou pede a mesma coisa que o defeito pede: ver
// rodando. O passo a passo fica ao lado porque a velocidade esconde tanto quanto revela — em 6 fps
// um quadro morto se disfarça de pausa intencional.
function Preview({ quadros }) {
  const [i, setI] = useState(0)
  const [tocando, setTocando] = useState(true)
  const [fps, setFps] = useState(6)
  // COMEÇA VISÍVEL e o observer só PAUSA quem sai da tela. O contrário (começar falso e esperar o
  // observer confirmar) parece mais correto e não é: na montagem as imagens da página ainda não
  // carregaram, o layout está esticado, e o primeiro registro é medido a 2700px do topo, ou seja,
  // "fora da tela". Todos nasciam pausados e só destravavam quando o layout assentava. Assumir
  // visível e deixar o observer desligar o que de fato está fora não tem esse ponto cego, e o custo
  // de errar é um ciclo de animação a mais, não a tela parecer quebrada.
  const [visivel, setVisivel] = useState(true)
  const palco = useRef(null)
  const n = quadros.length

  // A fila tem dezenas de registros: sem isto seriam dezenas de timers trocando imagem seis vezes
  // por segundo ao mesmo tempo, a maioria fora da vista.
  useEffect(() => {
    const el = palco.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => setVisivel(e.isIntersecting), { rootMargin: '300px' })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (!tocando || !visivel || n < 2) return
    const t = setInterval(() => setI((v) => (v + 1) % n), 1000 / fps)
    return () => clearInterval(t)
  }, [tocando, visivel, n, fps])

  const passo = (d) => { setTocando(false); setI((v) => (v + d + n) % n) }

  return (
    <div className="gate-preview">
      <span className="label">preview ({n} quadros)</span>
      <div className="gate-palco" ref={palco}><img src={`/files/${quadros[i]}`} alt={`quadro ${i + 1}`} /></div>
      <div className="gate-preview-ctrl">
        <button type="button" className="btn btn-sm" onClick={() => passo(-1)} title="quadro anterior">◀</button>
        <button type="button" className="btn btn-sm" onClick={() => setTocando((v) => !v)}>
          {tocando ? 'pausar' : 'animar'}
        </button>
        <button type="button" className="btn btn-sm" onClick={() => passo(1)} title="próximo quadro">▶</button>
        <span className="gate-preview-n">{i + 1}/{n}</span>
        {/* devagar é o que revela: a 2 fps dá pra seguir uma perna específica de um quadro ao outro */}
        <select value={fps} onChange={(e) => { setFps(Number(e.target.value)); setTocando(true) }} title="velocidade">
          <option value={2}>2 fps</option>
          <option value={6}>6 fps</option>
          <option value={12}>12 fps</option>
        </select>
      </div>
    </div>
  )
}

function Registro({ r, onJulgar }) {
  const [obs, setObs] = useState(r.observacao || '')
  const [salvando, setSalvando] = useState(null)

  async function julgar(veredito) {
    setSalvando(veredito)
    await onJulgar(r.id, veredito, obs.trim() || null)
    setSalvando(null)
  }

  return (
    <div className={'gate-item' + (r.veredito ? ` julgado ${r.veredito}` : '')}>
      <div className="gate-head">
        <span className={'gate-nivel ' + r.nivel}>{r.nivel === 'fail' ? 'REPROVOU' : 'avisou'}</span>
        <strong>{r.slug}</strong>
        <span className="gate-tipo">{r.tipo}</span>
        <span className="gate-nome">{r.gate}</span>
        <span className="hint">{String(r.quando).replace('T', ' ').slice(0, 16)}</span>
        {r.veredito && (
          <span className={'gate-veredito ' + r.veredito}>
            {r.veredito === 'real' ? 'defeito real' : 'falso positivo'}
          </span>
        )}
      </div>

      <p className="gate-msg">{r.msg}</p>

      {/* A PROVA. Sem a imagem não há julgamento: o cartão mostra os quadros lado a lado (é onde o
          defeito de ciclo aparece) e a folha mostra o que o modelo realmente desenhou. */}
      <div className="gate-provas">
        {!!(r.quadros || []).length && <Preview quadros={r.quadros} />}
        {r.card && (
          <a href={`/files/${r.card}`} target="_blank" rel="noreferrer" title="abrir em tamanho real">
            <span className="label">cartão (quadros lado a lado)</span>
            <img src={`/files/${r.card}`} alt="cartão" />
          </a>
        )}
        {r.folha && (
          <a href={`/files/${r.folha}`} target="_blank" rel="noreferrer" title="abrir em tamanho real">
            <span className="label">folha original</span>
            <img src={`/files/${r.folha}`} alt="folha" />
          </a>
        )}
        {!r.card && !r.folha && <span className="gate-vazio">sem imagem guardada</span>}
      </div>

      {/* MEDIDA E LIMIAR JUNTOS: meses depois, quando o limiar tiver mudado, é isto que permite ler
          o registro sem achar que ele está inconsistente. */}
      {r.metricas && (
        <details className="gate-metricas">
          <summary>o que foi medido, e contra que limiar</summary>
          <pre>{JSON.stringify(r.metricas, null, 2)}</pre>
        </details>
      )}

      <div className="gate-julgar">
        <input
          type="text"
          placeholder="o que você viu (opcional, mas é o que explica o veredito depois)"
          value={obs}
          onChange={(e) => setObs(e.target.value)}
        />
        <button type="button" className="btn btn-sm" disabled={!!salvando} onClick={() => julgar('real')}>
          {salvando === 'real' ? '…' : 'o gate acertou'}
        </button>
        <button type="button" className="btn btn-sm btn-ghost" disabled={!!salvando} onClick={() => julgar('falso-positivo')}>
          {salvando === 'falso-positivo' ? '…' : 'reprovou arte boa'}
        </button>
      </div>
    </div>
  )
}

export default function Gates() {
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState(null)
  const [filtro, setFiltro] = useState(null)
  const [sóPendentes, setSóPendentes] = useState(false)

  async function carregar() {
    try {
      const r = await fetch('/api/gates').then((x) => x.json())
      if (r.erro) setErro(r.erro); else { setDados(r); setErro(null) }
    } catch (e) { setErro(e.message) }
  }
  useEffect(() => { carregar() }, [])

  async function julgar(id, veredito, observacao) {
    await fetch(`/api/gates/${encodeURIComponent(id)}/veredito`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ veredito, observacao }),
    })
    await carregar()
  }

  if (erro) return <div className="panel"><h2>Gates</h2><p className="gate-erro">não consegui ler: {erro}</p></div>
  if (!dados) return <div className="panel"><h2>Gates</h2><p className="hint">carregando…</p></div>

  const lista = (dados.registros || [])
    .filter((r) => !filtro || r.gate === filtro)
    .filter((r) => !sóPendentes || !r.veredito)

  return (
    <div className="panel gate-panel">
      <div className="gate-topo">
        <div>
          <h2>Gates</h2>
          <p className="hint">
            Tudo que uma régua reprovou, com a folha guardada no instante da reprovação. Julgar cada
            caso é o que permite mexer num limiar sabendo o que ele estava barrando.
          </p>
        </div>
        <label className="gate-toggle">
          <input type="checkbox" checked={sóPendentes} onChange={(e) => setSóPendentes(e.target.checked)} />
          só os {dados.pendentes} não julgados
        </label>
      </div>

      <Resumo resumo={dados.resumo || []} filtro={filtro} setFiltro={setFiltro} />

      {!lista.length && (
        <p className="gate-vazio">
          {dados.registros?.length
            ? 'nada com esses filtros.'
            : 'nenhuma reprovação registrada ainda. Elas aparecem sozinhas quando um gate barrar uma folha.'}
        </p>
      )}

      {lista.map((r) => <Registro key={r.id + (r.veredito || '')} r={r} onJulgar={julgar} />)}
    </div>
  )
}
