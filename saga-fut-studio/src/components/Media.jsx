import React from 'react'
import { Icon } from './Icon.jsx'

export function Media({ existing, src, kind, bust }) {
  if (!existing[src]) {
    return (
      <div className="media-missing">
        <Icon name={kind === 'video' ? 'video' : 'imagem'} size={18} />
        ainda não gerado
      </div>
    )
  }
  const url = '/files/' + src + (bust ? '?v=' + bust : '')
  return kind === 'video'
    ? <video className="media" src={url} controls preload="metadata" />
    : <img className="media" src={url} alt={src} />
}

export function CharAvatar({ p, existing, bust }) {
  return existing[p.imagem]
    ? <img className="avatar" src={'/files/' + p.imagem + (bust ? '?v=' + bust : '')} alt={p.nome} title={p.nome} />
    : <span className="avatar avatar-empty" title={p.nome}>{p.nome[0]}</span>
}
