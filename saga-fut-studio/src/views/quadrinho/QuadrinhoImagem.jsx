import React, { useState } from 'react'
import { FilePath, Icon, Media } from '../../components/index.js'
import { quadrinhoMosaico, quadrinhoSlide } from '../../../shared/caminhos.mjs'
import { montarImagemQuadrinho } from '../../api/render.js'
import { useStudio } from '../../app/StudioContext.jsx'

// Formatos que os feeds preferem. 4:5 é o padrão: cabe inteiro no Instagram e some
// pouco no X. 1:1 é o seguro em qualquer feed; 9:16 é o do TikTok/Shorts foto.
const FORMATOS = [
  { id: '4:5', label: '4:5', nota: 'Instagram, X' },
  { id: '1:1', label: '1:1', nota: 'qualquer feed' },
  { id: '9:16', label: '9:16', nota: 'TikTok, Shorts' },
  { id: '3:2', label: '3:2', nota: 'X, sem sobra com 2 cenas' },
]

// O quadrinho virando post em IMAGEM parada (o vídeo é a aba ao lado).
//
// Duas saídas do mesmo material, porque nenhum formato serve as quatro redes igual: o
// MOSAICO junta as cenas num quadro só (o X não tem carrossel bom, e ele serve de
// capa), e o CARROSSEL é um slide por painel, que é o que rende no Instagram e no
// TikTok fotos porque cada cena aparece inteira, sem espremer.
export function QuadrinhoImagem({ quad }) {
  const { existing, bust, marcarGerado } = useStudio()
  const [formato, setFormato] = useState('4:5')
  const [rend, setRend] = useState(false)
  const [msg, setMsg] = useState(null)
  const [err, setErr] = useState(null)

  const comArte = quad.paineis.filter((p) => existing[p.imagem])
  const mosaicoPath = quadrinhoMosaico(quad.id, formato)
  const slides = comArte.map((p) => quadrinhoSlide(quad.id, p.numero))
  const temMosaico = existing[mosaicoPath]
  const temSlides = slides.some((s) => existing[s])

  async function montar(opcoes) {
    setRend(true); setErr(null); setMsg(null)
    try {
      const r = await montarImagemQuadrinho({ quadrinhoId: quad.id, formato, ...opcoes })
      if (r.mosaico) marcarGerado(r.mosaico)
      ;(r.carrossel || []).forEach(marcarGerado)
      const feito = [r.mosaico && 'mosaico', r.carrossel && `carrossel (${r.carrossel.length} slides)`].filter(Boolean).join(' e ')
      setMsg(r.aviso ? `${feito} em ${r.formato}. ${r.aviso}.` : `${feito} pronto em ${r.formato}.`)
    } catch (e) { setErr(e.message) } finally { setRend(false) }
  }

  return (
    <div className="panel">
      <h3>Imagem pro post</h3>
      <p className="hint">
        Nenhum formato serve as quatro redes igual, então saem dois produtos das mesmas artes: o mosaico junta as
        cenas num quadro só (bom pro X e de capa) e o carrossel é um slide por painel (o que rende no Instagram e
        no TikTok fotos). O vídeo 9:16 fica na aba ao lado.
      </p>

      <div className="formato-pick mt-4">
        <span className="hint">Formato</span>
        <div className="formato-opts">
          {FORMATOS.map((f) => (
            <button
              key={f.id}
              className={'btn btn-sm' + (formato === f.id ? ' btn-primary' : '')}
              onClick={() => { setFormato(f.id); setMsg(null); setErr(null) }}
              title={f.nota}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="row-actions mt-4">
        <button className="btn btn-primary" onClick={() => montar({ mosaico: true, carrossel: true })} disabled={rend || !comArte.length}>
          {rend ? <span className="gen-spinner" /> : <Icon name="quadrinhos" size={14} />}
          {rend ? 'Montando…' : `Montar mosaico + carrossel (${formato})`}
        </button>
        {comArte.length > 1 && (
          <button className="btn" onClick={() => montar({ mosaico: true, carrossel: false })} disabled={rend}>
            <Icon name="quadrinhos" size={13} /> Só o mosaico
          </button>
        )}
      </div>

      {!comArte.length && <p className="hint mt-2">Nenhum painel com arte ainda: gere as artes antes.</p>}
      {comArte.length === 1 && <p className="hint mt-2">Só um painel com arte: o mosaico sai igual ao carrossel de 1 slide.</p>}
      {msg && <p className="render-msg ok mt-2"><Icon name="check" size={13} /> {msg}</p>}
      {err && <p className="render-msg no mt-2"><Icon name="alerta" size={13} /> {err}</p>}

      {temMosaico && (
        <div className="mt-4">
          <span className="label">Mosaico</span>
          <div className="post-mosaico">
            <Media existing={existing} src={mosaicoPath} kind="img" bust={bust} />
          </div>
          <FilePath path={mosaicoPath} />
        </div>
      )}

      {temSlides && (
        <div className="mt-4">
          <span className="label">Carrossel, na ordem</span>
          <div className="post-slides">
            {comArte.map((p) => {
              const s = quadrinhoSlide(quad.id, p.numero)
              return existing[s] ? (
                <div className="post-slide" key={p.numero}>
                  <span className="post-slide-n">{p.numero}</span>
                  <Media existing={existing} src={s} kind="img" bust={bust} />
                </div>
              ) : null
            })}
          </div>
        </div>
      )}
    </div>
  )
}
