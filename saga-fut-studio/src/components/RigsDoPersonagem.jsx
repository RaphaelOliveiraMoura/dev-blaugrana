import React, { useEffect, useState } from 'react'

// RIGS DO PERSONAGEM — o que existe dele no disco, dentro da própria ficha.
//
// SEM `loading="lazy"` NAS MINIATURAS, e isso não é descuido: dentro do modal da ficha o lazy NÃO
// dispara — as 16 imagens do torcedor-cule ficavam todas com naturalWidth 0, ou seja, a aba abria
// com os quadros em branco e parecia que os assets não existiam. A rota `/files` respondia 200 o
// tempo todo; o que faltava era o browser pedir. São ~20 thumbs pequenas por personagem, então
// carregar direto não custa nada e é a diferença entre a tela funcionar e não funcionar.
//
// POR QUE EXISTE: a ficha mostrava só a arte-base, e tudo que decide se o personagem pode entrar
// num vídeo (model sheet, respiração, andar, correr, folhas de gesto) vivia em pastas soltas sem
// nenhuma tela. Saber se um personagem estava pronto exigia abrir o Finder. Aqui a ficha responde
// três coisas de uma vez: o que ele SABE fazer (com preview animado), o que FALTA (com o comando
// pronto pra copiar) e em que vídeos ele já entrou.

// Preview animado de um ciclo: troca os quadros num intervalo fixo. Sem canvas nem lib — é a mesma
// ideia do motor (mostrar o quadro N do ciclo), só que no navegador. Clique abre o frame a frame.
function CicloAnimado({ ciclo, ligado, onAbrir }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    if (!ligado || ciclo.frames.length < 2) return
    const t = setInterval(() => setI((v) => (v + 1) % ciclo.frames.length), 1000 / 6)
    return () => clearInterval(t)
  }, [ligado, ciclo.frames.length])
  const src = `/files/${ciclo.frames[ligado ? i : 0]}`
  return (
    <button type="button" className="rig-ciclo" onClick={() => onAbrir(ciclo)} title="ver frame a frame">
      <div className="rig-thumb"><img src={src} alt={ciclo.rotulo} /></div>
      <div className="rig-legenda">
        <strong>{ciclo.rotulo}</strong>
        <span>{ciclo.frames.length} quadros{ciclo.classe ? ` · ${ciclo.classe}` : ''}</span>
      </div>
    </button>
  )
}

// FRAME A FRAME: o preview em loop esconde o quadro morto e a perna que não troca apoio. Aqui
// cada desenho fica parado até você avançar — é o olho que o gate de silhueta não substitui.
function CicloFrameAFrame({ ciclo, onFechar }) {
  const [i, setI] = useState(0)
  const [tocando, setTocando] = useState(false)
  const n = ciclo.frames.length

  useEffect(() => {
    if (!tocando || n < 2) return
    const t = setInterval(() => setI((v) => (v + 1) % n), 1000 / 6)
    return () => clearInterval(t)
  }, [tocando, n])

  useEffect(() => {
    function tecla(e) {
      if (e.key === 'Escape') { onFechar(); return }
      if (e.key === 'ArrowLeft') { setTocando(false); setI((v) => (v - 1 + n) % n) }
      if (e.key === 'ArrowRight') { setTocando(false); setI((v) => (v + 1) % n) }
      if (e.key === ' ') { e.preventDefault(); setTocando((v) => !v) }
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [n, onFechar])

  const passo = (d) => { setTocando(false); setI((v) => (v + d + n) % n) }

  return (
    <div className="rig-inspecao">
      <div className="rig-inspecao-head">
        <strong>{ciclo.rotulo}</strong>
        <span className="hint">{ciclo.classe ? ciclo.classe + ' · ' : ''}{n} quadros · ← → espaço Esc</span>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onFechar}>fechar</button>
      </div>

      <div className="rig-inspecao-palco">
        <img src={`/files/${ciclo.frames[i]}`} alt={`${ciclo.rotulo} quadro ${i + 1}`} />
      </div>

      <div className="rig-inspecao-ctrl">
        <button type="button" className="btn btn-sm" onClick={() => passo(-1)} title="quadro anterior">◀</button>
        <button type="button" className="btn btn-sm" onClick={() => setTocando((v) => !v)}>
          {tocando ? 'pausar' : 'animar'}
        </button>
        <button type="button" className="btn btn-sm" onClick={() => passo(1)} title="próximo quadro">▶</button>
        <span className="rig-inspecao-n">{i + 1} / {n}</span>
      </div>

      <div className="rig-inspecao-faixa">
        {ciclo.frames.map((f, k) => (
          <button
            key={f}
            type="button"
            className={'rig-inspecao-quadro' + (k === i ? ' active' : '')}
            onClick={() => { setTocando(false); setI(k) }}
            title={`quadro ${k + 1}`}
          >
            <img src={`/files/${f}`} alt="" />
            <span>{k + 1}</span>
          </button>
        ))}
      </div>

      {/* A FOLHA ORIGINAL: a imagem única que a IA gerou, com todos os quadros juntos, antes do
          slicer cortar. É o que se olha pra julgar o que o modelo realmente desenhou — os quadros
          já saíram recortados, com o magenta removido e a escala normalizada, então defeito de
          enquadramento ou de fundo some deles e continua visível aqui. */}
      {ciclo.folha && (
        <div className="rig-folha">
          <span className="label">Folha original — a imagem única que a IA gerou, antes de fatiar</span>
          {/* clique abre em tamanho real numa aba: a miniatura serve pra conferir de relance */}
          <a href={`/files/${ciclo.folha}`} target="_blank" rel="noreferrer" title="abrir em tamanho real">
            <img src={`/files/${ciclo.folha}`} alt={`folha de ${ciclo.rotulo}`} />
          </a>
        </div>
      )}
    </div>
  )
}

export function RigsDoPersonagem({ slug }) {
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState(null)
  const [animando, setAnimando] = useState(true)
  const [inspecao, setInspecao] = useState(null)

  useEffect(() => {
    let vivo = true
    setDados(null); setErro(null); setInspecao(null)
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
        {dados.ciclos.length > 1 && !inspecao && (
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

      {(dados.modelSheet || dados.avatar) && (
        <div className="rig-identidade">
          {dados.modelSheet && (
            <div className="rig-model">
              <span className="label">Model sheet (referência de toda geração dele)</span>
              <img src={`/files/${dados.modelSheet}`} alt="model sheet" />
            </div>
          )}
          {/* avatar: recorte de rosto usado no card de escalação e nas redes. Fica aqui junto do
              model sheet porque os dois são IDENTIDADE, não animação. */}
          {dados.avatar && (
            <div className="rig-avatar">
              <span className="label">Avatar</span>
              <img src={`/files/${dados.avatar}`} alt="avatar" />
            </div>
          )}
        </div>
      )}

      {inspecao
        ? <CicloFrameAFrame ciclo={inspecao} onFechar={() => setInspecao(null)} />
        : dados.ciclos.length
          ? <div className="rig-grid">{dados.ciclos.map((c) => (
              <CicloAnimado key={c.id} ciclo={c} ligado={animando} onAbrir={setInspecao} />
            ))}</div>
          : <span className="rig-vazio">nenhuma animação ainda</span>}

      {/* POSES ÚNICAS: um desenho só, sem ciclo (do `asset pose`). Ficavam fora desta tela, então
          53 poses do acervo eram invisíveis pra quem abria a ficha — e asset que ninguém vê é asset
          que se paga de novo. Ficam depois dos ciclos porque são a exceção: a regra da casa é folha. */}
      {!!(dados.poses || []).length && (
        <div className="rig-poses">
          <span className="label">Poses ({dados.poses.length})</span>
          <div className="rig-grid">
            {dados.poses.map((p) => (
              <div key={p.nome} className="rig-ciclo">
                <div className="rig-thumb"><img src={`/files/${p.arquivo}`} alt={p.nome} /></div>
                <div className="rig-legenda"><strong>{p.nome}</strong><span>pose única</span></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!!dados.videos.length && (
        <div className="rig-videos">
          <span className="label">Aparece em</span>
          {dados.videos.map((v) => <a key={v.id} className="rig-video" href={`#/videos/${v.id}`}>{v.titulo}</a>)}
        </div>
      )}
    </div>
  )
}
