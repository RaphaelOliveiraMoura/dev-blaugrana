import React from 'react'
import { PromptBlock } from '../../components/index.js'
import { useEp } from './EpContext.jsx'

const PLATAFORMAS = [
  { key: 'tiktok', label: 'TikTok', tag: 'legenda + hashtags', hint: 'Cole na descrição. Use Séries/Playlist do TikTok para agrupar os capítulos.' },
  { key: 'instagram', label: 'Instagram Reels', tag: 'legenda + hashtags', hint: 'Cole na legenda. Hashtags podem ir no fim ou no 1º comentário.' },
  { key: 'twitter', label: 'Twitter / X', tag: 'até 280 caracteres', hint: 'Poucas hashtags. Anexe o vídeo nativo, não o link.' },
]

export function Publicar() {
  const { ep, si, ei, update } = useEp()
  const pub = ep.publicacao || { titulo: '', tiktok: '', instagram: '', twitter: '' }
  const yt = pub.youtube || { titulo: '', descricao: '' }
  const setPub = (campo, v) => update((n) => { n.sagas[si].episodios[ei].publicacao[campo] = v })
  const setYt = (campo, v) => update((n) => {
    const p = n.sagas[si].episodios[ei].publicacao
    p.youtube = { ...(p.youtube || {}), [campo]: v }
  })

  return (
    <div>
      <div className="panel">
        <h3>Título de capa</h3>
        <p className="hint">Texto da thumbnail. Cada plataforma tem seu campo próprio abaixo.</p>
        <PromptBlock label="Título" value={pub.titulo || ''} onChange={(v) => setPub('titulo', v)} />
      </div>

      {PLATAFORMAS.map((p) => (
        <div className="panel" key={p.key}>
          <h3>{p.label}</h3>
          <PromptBlock
            label="Texto do post"
            tool={p.tag}
            value={pub[p.key] || ''}
            onChange={(v) => setPub(p.key, v)}
            hint={p.hint}
          />
        </div>
      ))}

      <div className="panel">
        <h3>YouTube Shorts</h3>
        <PromptBlock
          label="Título do vídeo"
          tool="≤ 100 caracteres · pesa na busca"
          value={yt.titulo || ''}
          onChange={(v) => setYt('titulo', v)}
          hint="No YouTube o título é separado da descrição e é o que mais importa na busca. Mantenha #Shorts no fim."
        />
        <PromptBlock
          label="Descrição"
          tool="descrição + hashtags"
          value={yt.descricao || ''}
          onChange={(v) => setYt('descricao', v)}
          hint="As 3 primeiras hashtags aparecem acima do título. Agrupe a saga numa playlist."
        />
      </div>
    </div>
  )
}
