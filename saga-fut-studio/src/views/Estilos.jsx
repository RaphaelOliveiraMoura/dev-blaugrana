import React, { useState } from 'react'
import {
  ConfirmModal, DetalheModal, EditField, FilePath, LinksDeUso, NovoItemModal, PromptBlock, Icon,
} from '../components/index.js'
import { useStudio } from '../app/StudioContext.jsx'
import { estiloImagem } from '../../shared/caminhos.mjs'
import { getEstilosTeste, gerarEstudoEstilo } from '../api/acervo.js'

// A referência de traço é a cara do estilo: com ela no card, você acha o que
// procura pelo olho, sem abrir nada. Sem ela, o card avisa que falta.
function RefDeTraco({ e }) {
  const { existing, bust } = useStudio()
  const rel = estiloImagem(e.id)
  if (!existing[rel]) {
    return <span className="estilo-thumb estilo-thumb-vazio"><Icon name="imagem" size={16} /> sem referência</span>
  }
  return (
    <span className="estilo-thumb">
      <img src={'/files/' + rel + (bust ? '?v=' + bust : '')} alt={e.nome} />
    </span>
  )
}

// O card da galeria: traço, nome, descrição e quem usa. Clicar abre o editor por
// cima e a grade não se mexe.
function EstiloCard({ e, usos, onAbrir }) {
  return (
    <div className="estilo-card">
      <button className="char-card-abrir" onClick={onAbrir}>
        <RefDeTraco e={e} />
        <span className="char-body">
          <span className="char-card-top">
            <span className="char-nome" title={e.nome}>{e.nome || <span className="muted">sem nome</span>}</span>
            <span className="char-card-chevron"><Icon name="chevron" size={11} /></span>
          </span>
          <span className="char-arquetipo" title={e.descricao}>{e.descricao}</span>
        </span>
      </button>

      {/* fora do botão de abrir: cada uso é um link e não pode roubar o clique dele */}
      <span className="char-usos" title={usos.length ? 'Usado por: ' + usos.map((u) => u.titulo).join(', ') : undefined}>
        <LinksDeUso usos={usos} vazio="ninguém usa ainda" />
      </span>
    </div>
  )
}

// O editor do estilo, em modal: a referência de traço à esquerda, e à direita o
// texto que tenta dizer em palavras o mesmo que ela mostra.
function EstiloModal({ e, i, usos, onExcluir, onFechar }) {
  const { update, existing, bust } = useStudio()
  const set = (campo, v) => update((n) => { n.estilos[i][campo] = v })
  const rel = estiloImagem(e.id)
  const temRef = existing[rel]

  return (
    <DetalheModal
      titulo={<span className="char-id" title="id, usado no nome do arquivo">{e.id}</span>}
      meta={<span className="char-usos"><LinksDeUso usos={usos} vazio="ninguém usa ainda" /></span>}
      acoes={(
        <button className="btn btn-ghost btn-sm btn-danger" disabled={usos.length > 0}
          title={usos.length ? 'Em uso, não dá pra excluir' : 'Excluir estilo'}
          onClick={() => onExcluir(e.id)}>
          excluir
        </button>
      )}
      midia={temRef
        ? (
          <>
            <img className="media" src={'/files/' + rel + (bust ? '?v=' + bust : '')} alt={e.nome} />
            <FilePath path={rel} />
          </>
        )
        : (
          <p className="hint">
            Nenhuma referência de traço. Largue uma imagem em <code>{rel}</code> e ela passa a ir junto
            em toda ficha deste estilo.
          </p>
        )}
      onFechar={onFechar}
    >
      <EditField label="Nome" value={e.nome} onChange={(v) => set('nome', v)} />
      <EditField label="Descrição" hint="Pra você achar o estilo, não entra em prompt."
        value={e.descricao} onChange={(v) => set('descricao', v)} textarea />
      <PromptBlock
        label="Prefixo de estilo"
        tool="entra em todo prompt deste estilo"
        value={e.stylePrefix}
        onChange={(v) => set('stylePrefix', v)}
      />
    </DetalheModal>
  )
}

// BANCO DE PROVAS: o mesmo personagem, na mesma cena, em cada linguagem visual candidata.
//
// POR QUE FICA AQUI EMBAIXO: o catálogo de cima são os estilos EM USO; isto é a bancada onde se
// experimenta antes de adotar. A regra que justifica a tela: trocar o estilo da casa custa o acervo
// inteiro (model sheet, folha de movimento, pose e cenário de todo mundo saem do estilo vigente),
// então a decisão tem que ser tomada olhando, lado a lado, e antes de gerar qualquer asset.
function BancoDeProvas() {
  const [d, setD] = useState(null)
  const [erro, setErro] = useState(null)
  const [slug, setSlug] = useState('raphinha-riso')
  const [rodando, setRodando] = useState(null)
  const [v, setV] = useState(0)

  const carregar = React.useCallback(() => {
    getEstilosTeste().then((r) => { setD(r); if (r.personagens?.length && !r.personagens.includes(slug)) setSlug(r.personagens[0]) })
      .catch((e) => setErro(e.message))
  }, [slug])
  React.useEffect(() => { carregar() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function provar(estilo) {
    setRodando(estilo || 'todos'); setErro(null)
    try { await gerarEstudoEstilo({ slug, estilo, todos: !estilo }); setV(Date.now()); carregar() }
    catch (e) { setErro(e.message) }
    finally { setRodando(null) }
  }

  if (!d) return null
  const doSlug = (d.estudos || []).filter((e) => e.slug === slug)
  const arteDe = (id) => doSlug.find((e) => e.estilo === id)?.arquivo || null

  return (
    <div className="panel" style={{ marginTop: 22 }}>
      <div className="section-head">
        <h3 className="section-title">Banco de provas</h3>
        <div className="row-actions">
          <select value={slug} onChange={(e) => setSlug(e.target.value)} style={{ fontSize: 12 }}>
            {(d.personagens || []).map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <button className="btn btn-sm" disabled={!!rodando} onClick={() => provar(null)}>
            {rodando === 'todos' ? 'Gerando…' : `Provar os ${d.candidatos.length}`}
          </button>
        </div>
      </div>
      <p className="hint">
        O <b>mesmo personagem</b>, na <b>mesma cena</b>, em cada linguagem candidata: só assim o que se
        julga é o estilo e não a pose. A identidade fica travada (rosto, cabelo, kit e número), então
        o que muda de um card pro outro é só o meio. Isto é <b>amostra, não asset</b>: vive em{' '}
        <code>estilos/testes/</code> e nenhum vídeo enxerga.
      </p>
      {erro && <div className="hint erro">Erro: {erro}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 14, marginTop: 10 }}>
        {d.candidatos.map((c, i) => {
          const arq = arteDe(c.id)
          return (
            <div key={c.id} style={{ border: '1px solid #333', borderRadius: 10, padding: 10, background: '#161616' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
                <b style={{ fontSize: 13 }}>{i + 1}. {c.rotulo}</b>
              </div>
              {arq ? (
                <a href={`/files/${arq}?v=${v}`} target="_blank" rel="noreferrer">
                  <img src={`/files/${arq}?v=${v}`} alt={c.rotulo}
                    style={{ width: '100%', borderRadius: 6, border: '1px solid #2a2a2a', display: 'block' }} />
                </a>
              ) : (
                <div style={{ height: 150, display: 'grid', placeItems: 'center', border: '1px dashed #3a3a3a', borderRadius: 6 }}>
                  <button className="btn btn-sm" disabled={!!rodando} onClick={() => provar(c.id)}>
                    {rodando === c.id ? 'Gerando…' : 'Provar'}
                  </button>
                </div>
              )}
              {/* a NOTA é o que a imagem não mostra e é o que decide: o custo de produção do estilo */}
              <p className="hint" style={{ marginTop: 6 }}>{c.nota}</p>
            </div>
          )
        })}
      </div>

      {!!(d.folhas || []).length && (
        <p className="hint" style={{ marginTop: 12 }}>
          Folha comparativa: {d.folhas.map((f) => (
            <a key={f} href={`/files/${f}?v=${v}`} target="_blank" rel="noreferrer" style={{ marginRight: 10 }}>
              <code>{f.split('/').pop()}</code>
            </a>
          ))}
        </p>
      )}
    </div>
  )
}

// ESTILOS: catálogo central de traço visual (compartilhado por sagas e quadrinhos).
// Mesma forma da tela de personagens: galeria pra achar, modal pra editar. São dois
// catálogos com a mesma pergunta ("qual deles é este?"), e o traço responde por si.
export default function EstilosView() {
  const [abertoId, setAbertoId] = useState(null)
  const [criando, setCriando] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const { dados, update } = useStudio()
  const estilos = dados.estilos || []
  const aberto = abertoId ? estilos.find((e) => e.id === abertoId) : null

  const usosDe = (id) => [
    ...(dados.sagas || []).filter((s) => s.estiloId === id).map((s) => ({ tipo: 'saga', id: s.id, titulo: s.titulo })),
    ...(dados.quadrinhos || []).filter((q) => q.estiloId === id)
      .map((q) => ({ tipo: 'quadrinho', id: q.id, titulo: q.titulo })),
  ]

  function criarEstilo({ id, titulo }) {
    update((n) => {
      if (!n.estilos) n.estilos = []
      n.estilos.push({ id, nome: titulo, descricao: '', stylePrefix: '' })
    })
    setCriando(false)
    setAbertoId(id) // já abre o editor em branco pra preencher
  }
  function excluir(id) {
    const e = estilos.find((x) => x.id === id)
    setConfirm({
      titulo: 'Excluir estilo?',
      mensagem: `"${e.nome}" sai do catálogo.\n\nA referência de traço no disco continua. Salve depois para efetivar.`,
      confirmar: 'Excluir', perigo: true,
      onConfirm: () => {
        setConfirm(null)
        setAbertoId(null)
        update((n) => { n.estilos = n.estilos.filter((x) => x.id !== id) })
      },
    })
  }

  return (
    <div>
      {criando && (
        <NovoItemModal
          titulo="Novo estilo"
          rotuloNome="Nome do estilo"
          exemploNome="Ex: Rabisco de riso"
          idsExistentes={estilos.map((e) => e.id)}
          previewPasta={(id) => estiloImagem(id)}
          onCriar={criarEstilo}
          onCancel={() => setCriando(false)}
        />
      )}

      <div className="section-head">
        <h3 className="section-title">{estilos.length} estilos visuais</h3>
        <div className="row-actions">
          <button className="btn btn-sm" onClick={() => setCriando(true)}><Icon name="plus" size={12} /> Novo estilo</button>
        </div>
      </div>
      <p className="hint intro">
        Cada estilo é o traço compartilhado por vários vídeos e quadrinhos. Uma saga ou quadrinho só aponta qual estilo
        usar e herda esse prefixo em todo prompt de imagem: edite aqui num lugar só e todos mudam juntos. Cada um ainda
        pode somar um detalhe de arte próprio (paleta, cenário).
      </p>

      <div className="estilo-grid">
        {estilos.map((e) => (
          <EstiloCard key={e.id} e={e} usos={usosDe(e.id)} onAbrir={() => setAbertoId(e.id)} />
        ))}
      </div>

      {aberto && (
        <EstiloModal
          e={aberto}
          i={estilos.findIndex((x) => x.id === aberto.id)}
          usos={usosDe(aberto.id)}
          onExcluir={excluir}
          onFechar={() => setAbertoId(null)}
        />
      )}

      <BancoDeProvas />

      {/* por último de propósito: os dois modais dividem o mesmo z-index, então quem
          vem depois no DOM pinta por cima da ficha que abriu a confirmação. */}
      {confirm && <ConfirmModal {...confirm} onCancel={() => setConfirm(null)} />}
    </div>
  )
}
