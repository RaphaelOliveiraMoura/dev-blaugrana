import React, { useState, useEffect } from 'react'
import { Icon, FilePath } from '../components/index.js'
import { getCenarios, gerarVistaCenario, gerarVariacaoCenario } from '../api/acervo.js'

// CENÁRIOS — a biblioteca de LUGARES, com as vistas de cada um.
//
// POR QUE ESTA TELA EXISTE: cenário era um PNG dentro da pasta de um vídeo. Não havia lista, não
// havia reuso e não havia como ver o que já existia sem abrir diretório. Agora o lugar é uma ficha
// no acervo (`cenarios/<slug>/`) com uma vista por tipo de plano, e o studio mostra a ficha inteira:
// o que já foi desenhado e o que falta, com o botão de gerar ao lado do buraco.
export default function CenariosView() {
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState(null)
  const [gerando, setGerando] = useState(null)
  const [desc, setDesc] = useState({})
  const [novaVar, setNovaVar] = useState({})
  const [v, setV] = useState(0)

  const carregar = React.useCallback(() => {
    getCenarios().then(setDados).catch((e) => setErro(e.message))
  }, [])
  useEffect(() => { carregar() }, [carregar])

  async function gerar(slug, vista) {
    const d = (desc[`${slug}|${vista}`] || '').trim()
    if (!d) { setErro('descreva a vista antes de gerar'); return }
    setGerando(`${slug}|${vista}`); setErro(null)
    try { await gerarVistaCenario(slug, vista, d); setV(Date.now()); carregar() }
    catch (e) { setErro(e.message) }
    finally { setGerando(null) }
  }

  async function gerarVar(slug) {
    const nv = novaVar[slug] || {}
    const nome = (nv.nome || '').trim(), d = (nv.desc || '').trim()
    if (!nome || !d) { setErro('a variação precisa de nome e descrição'); return }
    setGerando(`${slug}|var`); setErro(null)
    try { await gerarVariacaoCenario(slug, nome, d); setNovaVar((s2) => ({ ...s2, [slug]: {} })); setV(Date.now()); carregar() }
    catch (e) { setErro(e.message) }
    finally { setGerando(null) }
  }

  if (erro && !dados) return <div className="hint erro">Erro: {erro}</div>
  if (!dados) return <div className="hint">carregando…</div>

  return (
    <div>
      <div className="panel">
        <div className="section-head">
          <h3 className="section-title">Cenários</h3>
          <span className="chip">{dados.itens.length} lugar(es)</span>
        </div>
        <p className="hint">
          Cada cenário é um <b>lugar com várias vistas</b>. A vista certa é escolhida pelo plano da
          câmera: <code>geral</code> usa o panorama e <code>close</code>/<code>detalhe</code> usam o perto,
          que é gerado a partir do panorama para continuar sendo o mesmo lugar. As <b>variações</b>
          são outros pedaços do lugar, na mesma vista lateral e com a mesma linha de chão.
        </p>
        {erro && <div className="hint erro">Erro: {erro}</div>}
      </div>

      {dados.itens.map((c) => (
        <div className="panel" key={c.slug}>
          <div className="section-head">
            <h3 className="section-title">{c.slug}</h3>
            <div className="row-actions">
              <span className="chip">{c.tem.length}/{c.vistas.length} vistas</span>
              {c.completo
                ? <span className="selo" style={{ color: '#5fbf6f' }}>ficha completa</span>
                : <span className="selo" style={{ color: '#d9a400' }}>faltam {c.vistas.length - c.tem.length}</span>}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 14, marginTop: 10 }}>
            {c.vistas.map((vi) => (
              <div key={vi.nome} style={{ border: '1px solid #333', borderRadius: 10, padding: 10, background: '#161616' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <b style={{ fontSize: 13 }}>{vi.nome}</b>
                  {vi.derivada && <span className="chip" style={{ fontSize: 10 }}>derivada</span>}
                </div>
                {vi.tem ? (
                  <>
                    <a href={`/files/${vi.arquivo}?v=${v}`} target="_blank" rel="noreferrer">
                      <img src={`/files/${vi.arquivo}?v=${v}`} alt={vi.nome}
                        style={{ width: '100%', borderRadius: 6, border: '1px solid #2a2a2a', display: 'block' }} />
                    </a>
                    <div className="hint" style={{ marginTop: 4 }}><FilePath path={vi.arquivo} /></div>
                  </>
                ) : (
                  <>
                    <p className="hint" style={{ minHeight: 52 }}>{vi.guia}</p>
                    <textarea rows={3} placeholder="o lugar, sem gente (em inglês)"
                      value={desc[`${c.slug}|${vi.nome}`] || ''}
                      onChange={(e) => setDesc((d) => ({ ...d, [`${c.slug}|${vi.nome}`]: e.target.value }))}
                      style={{ width: '100%', fontSize: 12 }} />
                    <button className="btn" style={{ marginTop: 6 }} disabled={gerando === `${c.slug}|${vi.nome}`}
                      onClick={() => gerar(c.slug, vi.nome)}>
                      <Icon name="estilos" size={12} /> {gerando === `${c.slug}|${vi.nome}` ? 'Gerando…' : 'Gerar vista'}
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* VARIAÇÕES: outros pedaços do MESMO lugar, em vista lateral e com a MESMA linha de chão.
              É o que tira a monotonia do fundo sem mudar a escala de ninguém — cortar de uma pra
              outra é de graça justamente porque o chão está na mesma altura. */}
          <div style={{ marginTop: 16, borderTop: '1px solid #2a2a2a', paddingTop: 12 }}>
            <div className="hint" style={{ marginBottom: 8 }}>
              <b>Variações</b> ({(c.variacoesArt || []).length}) — outros pedaços do mesmo lugar, para
              a cena trocar de fundo sem trocar de escala. No roteiro: <code>"variacao": "gol"</code>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {(c.variacoesArt || []).map((va) => (
                <figure key={va.nome} style={{ margin: 0 }}>
                  <a href={`/files/${va.arquivo}?v=${v}`} target="_blank" rel="noreferrer">
                    <img src={`/files/${va.arquivo}?v=${v}`} alt={va.nome}
                      style={{ width: '100%', borderRadius: 6, border: '1px solid #2a2a2a', display: 'block' }} />
                  </a>
                  <figcaption className="hint" style={{ marginTop: 3 }}><code>{va.nome}</code></figcaption>
                </figure>
              ))}
              <div style={{ border: '1px dashed #3a3a3a', borderRadius: 8, padding: 10 }}>
                <input placeholder="nome (ex: gol, bancos)" value={novaVar[c.slug]?.nome || ''}
                  onChange={(e) => setNovaVar((s) => ({ ...s, [c.slug]: { ...(s[c.slug] || {}), nome: e.target.value } }))}
                  style={{ width: '100%', fontSize: 12, marginBottom: 5 }} />
                <textarea rows={3} placeholder="que elementos tem esta parte do lugar (em inglês)"
                  value={novaVar[c.slug]?.desc || ''}
                  onChange={(e) => setNovaVar((s) => ({ ...s, [c.slug]: { ...(s[c.slug] || {}), desc: e.target.value } }))}
                  style={{ width: '100%', fontSize: 12 }} />
                <button className="btn" style={{ marginTop: 5 }} disabled={gerando === `${c.slug}|var`}
                  onClick={() => gerarVar(c.slug)}>
                  {gerando === `${c.slug}|var` ? 'Gerando…' : '+ variação'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}

      {!dados.itens.length && (
        <div className="panel">
          <p className="hint">
            Nenhuma ficha ainda. A primeira vista de um lugar é o panorama:{' '}
            <code>node scripts/asset.mjs cenario &lt;slug&gt; --desc="..."</code>
          </p>
        </div>
      )}
    </div>
  )
}
