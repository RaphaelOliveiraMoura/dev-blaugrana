import React, { useMemo, useState } from 'react'
import { CharAvatar, NovoItemModal, Icon, GrupoEstiloHead } from '../components/index.js'
import { quadProgress } from '../lib/progresso.js'
import { TIPOS_QUADRINHO } from '../lib/formatos.js'
import { agruparPorEstilo } from '../lib/agrupar.js'
import { blankQuadrinho } from '../lib/scaffold.js'
import { useStudio } from '../app/StudioContext.jsx'
import { ORDEM_PECAS, PECAS_POR_CODIGO, chaveSerie, ehPorCodigo, pecaPorCodigo, seriesDoAcervo } from '../../shared/quadrinho-familia.mjs'

// As duas categorias que não são série: a natureza "peça por código" e o balaio dos selos
// que só têm um quadrinho (sem ele a barra nasceria com 19 chips, 12 deles de um item só).
const CODIGO = '_codigo'
const AVULSAS = '_avulsas'
const TODAS = 'todas'

// QUADRINHOS: grade dos quadrinhos (imagem). Criar por tipo (charge/tirinha/carrossel).
export default function QuadrinhosList() {
  const { dados, update, existing, progress, bust, nav } = useStudio()
  const byId = Object.fromEntries(dados.personagens.map((p) => [p.id, p]))
  // MAIS NOVO PRIMEIRO, mesma regra da lista de vídeos: `_criadoEm` vem do disco (ver store.mjs)
  // e a ordem de inserção do `quadrinhoOrder` deixava o recém-criado no fim de 68 itens.
  const quadrinhos = [...(dados.quadrinhos || [])].sort((a, b) => (b._criadoEm || 0) - (a._criadoEm || 0))
  const [criando, setCriando] = useState(null) // o tipo escolhido, ou null
  const [filtro, setFiltro] = useState('pendentes') // todos | pendentes | publicados; default = foco no que falta postar
  const [serie, setSerie] = useState(TODAS) // todas | _codigo | _avulsas | chave do selo

  // ---------------------------------------------------------------- os dois eixos
  // Eixo 1, PUBLICAÇÃO: o que falta postar. Eixo 2, SÉRIE: de que família é o quadrinho.
  // Cada contagem considera o OUTRO eixo já aplicado, senão o chip promete 54 e a grade
  // mostra 3.
  const series = useMemo(() => seriesDoAcervo(quadrinhos), [quadrinhos])
  const chips = useMemo(() => series.filter((s) => s.n > 1), [series])
  const avulsa = useMemo(() => new Set(series.filter((s) => s.n === 1).map((s) => s.chave)), [series])

  const naSerie = (q) => {
    if (serie === TODAS) return true
    if (serie === CODIGO) return ehPorCodigo(q)
    if (ehPorCodigo(q)) return false // peça por código só aparece na categoria dela (e em "Todas")
    if (serie === AVULSAS) return avulsa.has(chaveSerie(q.selo)) || !chaveSerie(q.selo)
    return chaveSerie(q.selo) === serie
  }
  // "publicado" = quad.postado (booleano no topo do quadrinho)
  const naPublicacao = (q) => (filtro === 'pendentes' ? !q.postado : filtro === 'publicados' ? !!q.postado : true)

  const porSerie = quadrinhos.filter(naSerie)
  const porPublicacao = quadrinhos.filter(naPublicacao)
  const filtrados = porSerie.filter(naPublicacao)

  const contagem = {
    todos: porSerie.length,
    pendentes: porSerie.filter((q) => !q.postado).length,
    publicados: porSerie.filter((q) => q.postado).length,
  }
  const FILTROS = [
    { id: 'todos', label: 'Todos' },
    { id: 'pendentes', label: 'Não publicados' },
    { id: 'publicados', label: 'Publicados' },
  ]
  // quantos a série tem, no recorte de publicação atual (`emTudo` = ignorando esse eixo)
  const nSerie = (chave, emTudo) => {
    // a categoria por código conta sempre o acervo INTEIRO: ela ignora o eixo de publicação
    // de propósito (ver abaixo), então contar o recorte publicado mentiria.
    if (chave === CODIGO) return quadrinhos.filter(ehPorCodigo).length
    const base = emTudo ? quadrinhos : porPublicacao
    if (chave === TODAS) return base.length
    const lista = base.filter((q) => !ehPorCodigo(q))
    if (chave === AVULSAS) return lista.filter((q) => avulsa.has(chaveSerie(q.selo)) || !chaveSerie(q.selo)).length
    return lista.filter((q) => chaveSerie(q.selo) === chave).length
  }

  // Peça por código NÃO se aposenta ao ser publicada: a escalação da semana passada é o
  // gabarito da próxima, e o card de gol anterior é a referência de layout. Por isso entrar
  // na categoria já abre o eixo de publicação em "Todos" — em vez de escondê-lo, que faria
  // a barra mentir sobre o que está filtrado.
  //
  // Mesma ideia vale pra série cheia que está TODA publicada ("Nova Temporada", 3 de 3): com o
  // eixo em "Não publicados" o chip marcava 0 e o clique levava a uma grade vazia. Clicar num
  // chip é pedir pra VER aquela série, então o eixo de publicação abre junto.
  function escolherSerie(chave) {
    setSerie(chave)
    if (chave === CODIGO || (nSerie(chave) === 0 && nSerie(chave, true) > 0)) setFiltro('todos')
  }

  // cria um quadrinho em branco do tipo pedido e abre ele
  function novoQuadrinho({ id, titulo }) {
    const q = blankQuadrinho(quadrinhos.map((x) => x.id), criando, { id, titulo })
    update((n) => { if (!n.quadrinhos) n.quadrinhos = []; n.quadrinhos.push(q) })
    setCriando(null)
    nav.quadrinho(q.id)
  }

  // Na categoria por código o agrupamento é por PEÇA, não por estilo: são todas do mesmo
  // traço, e o que se procura ali é "a última escalação", não "as do rabisco".
  const grupos = serie === CODIGO
    ? ORDEM_PECAS
      .map((id) => ({
        estiloId: 'peca-' + id,
        nome: PECAS_POR_CODIGO[id].label,
        itens: filtrados.filter((q) => pecaPorCodigo(q)?.id === id),
      }))
      .filter((g) => g.itens.length)
    : agruparPorEstilo(filtrados, dados.estilos, (q) => q.titulo,
      (a, b) => (b._criadoEm || 0) - (a._criadoEm || 0))

  return (
    <div>
      {criando && (
        <NovoItemModal
          titulo={`Novo quadrinho, ${TIPOS_QUADRINHO[criando]?.label || criando}`}
          rotuloNome="Nome do quadrinho"
          exemploNome="Ex: Nada a Declarar"
          idsExistentes={quadrinhos.map((q) => q.id)}
          previewPasta={(id) => `quadrinhos/${id}/`}
          onCriar={novoQuadrinho}
          onCancel={() => setCriando(null)}
        />
      )}

      <div className="section-head">
        <h3 className="section-title">Quadrinhos · imagem</h3>
        <div className="row-actions">
          {Object.entries(TIPOS_QUADRINHO).map(([tipo, meta]) => (
            <button key={tipo} className="btn btn-sm" onClick={() => setCriando(tipo)} title={meta.label}>
              <Icon name="plus" size={12} /> {tipo}
            </button>
          ))}
        </div>
      </div>

      <p className="hint intro">
        Motor barato e rápido: a IA desenha os painéis (e os balões) a partir do seu roteiro. Charge = 1 painel de reação;
        tirinha = setup + punchline; carrossel = a saga desliza em 6-10 quadros (o save é o sinal nº 1 do Instagram).
      </p>

      {/* filtro por status de publicação: por padrão o foco é o que falta postar */}
      <div className="quad-filtros" role="group" aria-label="Filtrar por publicação">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={'quad-filtro' + (filtro === f.id ? ' active' : '')}
            aria-pressed={filtro === f.id}
            onClick={() => setFiltro(f.id)}
          >
            {f.label}
            <span className="quad-filtro-n">{contagem[f.id]}</span>
          </button>
        ))}
      </div>

      {/* segundo eixo: a série editorial (o selo) e a categoria das peças montadas por código */}
      <div className="quad-filtros quad-filtros-serie" role="group" aria-label="Filtrar por série">
        <span className="quad-filtros-rot">Série</span>
        <button
          type="button"
          className={'quad-filtro' + (serie === TODAS ? ' active' : '')}
          aria-pressed={serie === TODAS}
          onClick={() => escolherSerie(TODAS)}
        >
          Todas<span className="quad-filtro-n">{nSerie(TODAS)}</span>
        </button>
        {chips.map((s) => {
          const n = nSerie(s.chave)
          return (
            <button
              key={s.chave}
              type="button"
              className={'quad-filtro' + (serie === s.chave ? ' active' : '') + (n === 0 ? ' vazio' : '')}
              aria-pressed={serie === s.chave}
              onClick={() => escolherSerie(s.chave)}
              title={n === 0 ? `Nada nesse recorte; clicar mostra os ${s.n} da série` : undefined}
            >
              {s.label}<span className="quad-filtro-n">{n}</span>
            </button>
          )
        })}
        {avulsa.size > 0 && (
          <button
            type="button"
            className={'quad-filtro' + (serie === AVULSAS ? ' active' : '')}
            aria-pressed={serie === AVULSAS}
            onClick={() => escolherSerie(AVULSAS)}
            title={'Selos com um quadrinho só: ' + series.filter((s) => s.n === 1).map((s) => s.label).join(', ')}
          >
            Avulsas<span className="quad-filtro-n">{nSerie(AVULSAS)}</span>
          </button>
        )}
        <button
          type="button"
          className={'quad-filtro quad-filtro-codigo' + (serie === CODIGO ? ' active' : '')}
          aria-pressed={serie === CODIGO}
          onClick={() => escolherSerie(CODIGO)}
          title="Escalação, gol, fim de jogo, substituição, adivinha, a conta: montados por código (gerar-*.mjs) e sempre visíveis, publicados ou não"
        >
          <Icon name="montar" size={11} /> Por código<span className="quad-filtro-n">{nSerie(CODIGO)}</span>
        </button>
      </div>

      {serie === CODIGO && (
        <p className="hint intro">
          Peças montadas por código (<code>gerar-escalacao.mjs</code>, <code>gerar-gol.mjs</code> e família), não pela IA:
          placar, minuto e nome de time são texto, e texto é onde o modelo erra. Elas continuam aqui depois de publicadas,
          porque a peça anterior é o gabarito da próxima.
        </p>
      )}

      {/* A capa é o card: o contexto é quase o mesmo em todos (a rodada da semana),
          então a descrição repetia 6 vezes sem distinguir nada. A arte distingue. */}
      {filtrados.length === 0 && (
        <p className="hint intro">Nenhum quadrinho {filtro === 'pendentes' ? 'pendente de publicação' : filtro === 'publicados' ? 'publicado' : ''} por aqui.</p>
      )}

      {grupos.map((g) => (
        <div key={g.estiloId || '_sem'}>
          <GrupoEstiloHead nome={g.nome} n={g.itens.length} />
          <div className="quad-grid">
            {g.itens.map((q) => {
              const prog = quadProgress(q, progress)
              const capa = (q.paineis || [])[0]
              return (
                <div className="quad-card" key={q.id} onClick={() => nav.quadrinho(q.id)} role="button" tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') nav.quadrinho(q.id) }}>
                  <div className="quad-capa">
                    {capa && existing[capa.imagem]
                      ? <img src={'/files/' + capa.imagem + (bust ? '?v=' + bust : '')} alt="" />
                      : <Icon name="quadrinhos" size={22} className="quad-capa-empty" />}
                    {/* publicado precisa aparecer no CARD: em "Todos" (e na categoria por
                        código, que ignora o eixo) a grade mistura postado e pendente */}
                    {q.postado && <span className="quad-postado" title="Já publicado"><Icon name="check" size={10} /></span>}
                  </div>
                  <div className="quad-card-corpo">
                    <div className="quad-card-top">
                      <h3 title={q.titulo}>{q.titulo}</h3>
                      <div className="saga-card-cast">
                        {(q.elenco || []).map((id) => byId[id] && <CharAvatar key={id} p={byId[id]} existing={existing} bust={bust} />)}
                      </div>
                    </div>
                    {/* o tipo não vem: "3/3 painéis" já diz se é charge, tirinha ou
                        carrossel, e o rodapé de 240px não comporta os dois */}
                    <div className="quad-card-foot">
                      <span className="selo" title={TIPOS_QUADRINHO[q.tipo]?.label || q.tipo}>{q.selo}</span>
                      <span className={'quad-card-prog' + (prog.img === prog.total ? ' ok' : '')}>
                        {prog.img}/{prog.total} painéis
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* criar fica fora dos grupos: não pertence a estilo nenhum */}
      <div className="quad-grid">
        <div className="quad-card quad-card-new" onClick={() => setCriando('tirinha')} role="button" tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') setCriando('tirinha') }}>
          <Icon name="plus" size={14} /> Novo quadrinho
        </div>
      </div>
    </div>
  )
}
