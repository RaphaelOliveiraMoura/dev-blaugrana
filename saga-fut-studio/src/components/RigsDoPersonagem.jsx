import React, { useEffect, useState } from 'react'

// RIGS DO PERSONAGEM — o que existe dele no disco, dentro da própria ficha.
//
// POR QUE EXISTE: a ficha mostrava só a arte-base, e tudo que decide se o personagem pode entrar
// num vídeo (model sheet, respiração, andar, correr, folhas de gesto) vivia em pastas soltas sem
// nenhuma tela. Saber se um personagem estava pronto exigia abrir o Finder. Aqui a ficha responde
// três coisas de uma vez: o que ele SABE fazer (com preview animado), o que FALTA (com o comando
// pronto pra copiar) e em que vídeos ele já entrou.

// Preview animado de um ciclo: troca os quadros num intervalo fixo. Sem canvas nem lib — é a mesma
// ideia do motor (mostrar o quadro N do ciclo), só que no navegador.
function CicloAnimado({ ciclo, ligado }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    if (!ligado || ciclo.frames.length < 2) return
    const t = setInterval(() => setI((v) => (v + 1) % ciclo.frames.length), 1000 / 6)
    return () => clearInterval(t)
  }, [ligado, ciclo.frames.length])
  const src = `/files/${ciclo.frames[ligado ? i : 0]}`
  return (
    <div className="rig-ciclo">
      <div className="rig-thumb"><img src={src} alt={ciclo.rotulo} loading="lazy" /></div>
      <div className="rig-legenda">
        <strong>{ciclo.rotulo}</strong>
        <span>{ciclo.frames.length} quadros{ciclo.classe ? ` · ${ciclo.classe}` : ''}</span>
      </div>
    </div>
  )
}

export function RigsDoPersonagem({ slug }) {
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState(null)
  const [animando, setAnimando] = useState(true)

  useEffect(() => {
    let vivo = true
    setDados(null); setErro(null)
    fetch(`/api/rigs/${slug}`)
      .then((r) => r.json())
      .then((d) => { if (vivo) (d.erro ? setErro(d.erro) : setDados(d)) })
      .catch((e) => vivo && setErro(e.message))
    return () => { vivo = false }
  }, [slug])

  if (erro) return <div className="rig-bloco"><span className="rig-erro">não consegui ler os rigs: {erro}</span></div>
  if (!dados) return <div className="rig-bloco"><span className="rig-vazio">carregando animações…</span></div>

  const faltaEssencial = (dados.faltando || []).filter((f) => f.essencial)

  return (
    <div className="rig-bloco">
      <div className="rig-head">
        <strong>Animações e rigs</strong>
        <span className={dados.apto ? 'rig-tag rig-ok' : 'rig-tag rig-falta'}>
          {dados.apto ? 'apto pra vídeo' : 'ficha incompleta'}
        </span>
        {dados.ciclos.length > 1 && (
          <button className="btn btn-ghost btn-sm" onClick={() => setAnimando((v) => !v)}>
            {animando ? 'pausar' : 'animar'}
          </button>
        )}
      </div>

      {!!faltaEssencial.length && (
        <div className="rig-pendencias">
          {faltaEssencial.map((f) => (
            <div key={f.id} className="rig-pendencia">
              <span>falta <strong>{f.rotulo}</strong></span>
              <code>{f.comoFazer}</code>
            </div>
          ))}
        </div>
      )}

      {dados.modelSheet && (
        <div className="rig-model">
          <span className="label">Model sheet (referência de toda geração dele)</span>
          <img src={`/files/${dados.modelSheet}`} alt="model sheet" loading="lazy" />
        </div>
      )}

      {dados.ciclos.length
        ? <div className="rig-grid">{dados.ciclos.map((c) => <CicloAnimado key={c.id} ciclo={c} ligado={animando} />)}</div>
        : <span className="rig-vazio">nenhuma animação ainda</span>}

      {!!dados.videos.length && (
        <div className="rig-videos">
          <span className="label">Aparece em</span>
          {dados.videos.map((v) => <a key={v.id} className="rig-video" href={`#/videos/${v.id}`}>{v.titulo}</a>)}
        </div>
      )}
    </div>
  )
}
