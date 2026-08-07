import React, { useState, useEffect } from 'react'
import { FilePath } from '../components/index.js'
import { getObjetos } from '../api/acervo.js'

// OBJETOS — os props da cena: bola, cadeira, troféu.
//
// A distinção que a tela precisa deixar clara é a que o catálogo faz: objeto de CÓDIGO é desenhado
// pelo motor (a bola: forma perfeita em qualquer tamanho, sombra que descola do chão, giro
// proporcional à distância rolada) e nunca deve virar sprite; objeto de ARTE é asset gerado, com o
// mesmo contrato de folha dos personagens. Sem isso, alguém acaba pedindo uma bola desenhada.
export default function ObjetosView() {
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState(null)
  useEffect(() => { getObjetos().then(setDados).catch((e) => setErro(e.message)) }, [])

  if (erro) return <div className="hint erro">Erro: {erro}</div>
  if (!dados) return <div className="hint">carregando…</div>

  const codigo = dados.itens.filter((o) => o.tipo === 'codigo')
  const arte = dados.itens.filter((o) => o.tipo !== 'codigo')

  return (
    <div>
      <div className="panel">
        <div className="section-head">
          <h3 className="section-title">Objetos</h3>
          <span className="chip">{dados.itens.length}</span>
        </div>
        <p className="hint">
          O terceiro cidadão do acervo, ao lado de personagem e cenário. Vive no mesmo nível porque
          se reusa: uma cadeira serve vários vídeos, do mesmo jeito que um personagem serve.
        </p>
      </div>

      <div className="panel">
        <div className="section-head"><h3 className="section-title">Desenhados por código</h3></div>
        <p className="hint">
          O motor desenha. Não geram imagem, não têm sprite e não custam geração nenhuma.
        </p>
        {codigo.map((o) => (
          <div key={o.slug} style={{ border: '1px solid #333', borderRadius: 10, padding: 12, background: '#161616', marginTop: 10, display: 'flex', gap: 14 }}>
            {/* O PREVIEW vem do mesmo módulo que o motor usa (shared/bola-svg.mjs), servido pela
                rota. Objeto de código não tem PNG no disco, então sem isto a ficha nascia vazia e
                a única forma de ver a bola era renderizar um vídeo. */}
            {o.svg && (
              <div
                className="obj-preview"
                title={`${o.nome}: desenhado pelo motor, sem arquivo no disco`}
                dangerouslySetInnerHTML={{ __html: o.svg }}
              />
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <b>{o.nome}</b>
                <span className="chip">código</span>
                {o.desenhadaPor && <span className="hint">{o.desenhadaPor}</span>}
              </div>
              {o.comoUsar && <div className="hint" style={{ marginTop: 6 }}>uso no roteiro: <code>{o.comoUsar}</code></div>}
              {o.porQue && <p className="hint" style={{ marginTop: 6 }}><b>por que não é sprite:</b> {o.porQue}</p>}
            </div>
          </div>
        ))}
      </div>

      <div className="panel">
        <div className="section-head"><h3 className="section-title">Arte gerada</h3></div>
        {arte.length ? arte.map((o) => (
          <div key={o.slug} style={{ border: '1px solid #333', borderRadius: 10, padding: 12, background: '#161616', marginTop: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <b>{o.nome}</b>
              {!o.catalogado && <span className="chip" style={{ color: '#d9a400' }}>fora do catálogo</span>}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {o.arquivos.map((f) => (
                <figure key={f} style={{ margin: 0, width: 120 }}>
                  <img src={'/files/' + f} alt={f} style={{ width: '100%', borderRadius: 6, border: '1px solid #2a2a2a' }} />
                  <figcaption className="hint" style={{ fontSize: 10 }}><FilePath path={f} /></figcaption>
                </figure>
              ))}
            </div>
            {!o.arquivos.length && <p className="hint">sem arte ainda</p>}
          </div>
        )) : <p className="hint">Nenhum objeto de arte no acervo ainda.</p>}
      </div>
    </div>
  )
}
