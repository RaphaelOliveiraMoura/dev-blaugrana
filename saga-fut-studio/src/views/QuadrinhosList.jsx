import React, { useEffect, useMemo, useState } from 'react'
import { CharAvatar, Icon, GrupoEstiloHead } from '../components/index.js'
import { quadProgress } from '../lib/progresso.js'
import { TIPOS_QUADRINHO } from '../lib/formatos.js'
import { agruparPorEstilo } from '../lib/agrupar.js'
import { useStudio } from '../app/StudioContext.jsx'
import { ORDEM_PECAS, PECAS_POR_CODIGO, chaveSerie, ehPorCodigo, pecaPorCodigo, seriesDoAcervo } from '../../shared/quadrinho-familia.mjs'
import { doCanal, CANAL_PADRAO } from '../../shared/canais.mjs'
import { FiltroCanal } from '../components/FiltroCanal.jsx'

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
  // O CANAL É O PRIMEIRO CORTE, antes dos dois eixos de filtro: os chips de série e as contagens
  // de publicação são DO CANAL ESCOLHIDO, senão a barra promete "12 em O Dia Em Que" e a grade
  // mostra 5, porque os outros 7 são do outro perfil.
  //
  // O chip da tela NASCE no canal do header e pode divergir dele: o seletor global é a preferência
  // (grava no projeto), o chip é o gesto de dar uma olhada no outro perfil (não grava nada). Sem o
  // chip, ver o outro canal por dois segundos custava um save no project.json.
  const canalGlobal = dados?.projeto?.canalAtivo || CANAL_PADRAO
  const [canal, setCanal] = useState(canalGlobal)
  const todosQuadrinhos = useMemo(
    () => [...(dados.quadrinhos || [])].sort((a, b) => (b._criadoEm || 0) - (a._criadoEm || 0)),
    [dados.quadrinhos],
  )
  const quadrinhos = useMemo(() => doCanal(todosQuadrinhos, canal), [todosQuadrinhos, canal])
  const [filtro, setFiltro] = useState('pendentes') // todos | pendentes | publicados; default = foco no que falta postar
  const [serie, setSerie] = useState(TODAS) // todas | _codigo | _avulsas | chave do selo

  // trocar de canal no header reposiciona a tela: o chip acompanha, porque a preferência mudou
  useEffect(() => { setCanal(canalGlobal) }, [canalGlobal])

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
      <div className="section-head">
        <h3 className="section-title">Quadrinhos · imagem</h3>
      </div>

      {/* NÃO EXISTE "novo quadrinho" AQUI, e é de propósito (12/08/2026). Todo quadrinho nasce
          pela API, escrito pelo agente a partir do roteiro: a skill /o-dia-em-que monta o JSON
          inteiro (painéis, elenco, prompts, trilha, agenda) e manda de uma vez. Criar um em
          branco pela tela dava um esqueleto que alguém teria que preencher campo a campo, e o
          padrão da casa mora no roteiro, não no formulário. */}
      <p className="hint intro">
        Os quadrinhos nascem pela API, a partir do roteiro (<code>PUT /api/quadrinhos/&lt;id&gt;</code>),
        e esta tela serve pra acompanhar, ajustar texto e publicar. Peça um novo ao agente com a
        skill <code>/o-dia-em-que</code>, que monta painéis, elenco, prompts e trilha de uma vez.
      </p>

      {/* eixo 0, o corte mais grosso: de qual PERFIL é o conteúdo. Local, não grava no projeto. */}
      <FiltroCanal valor={canal} onChange={setCanal} itens={todosQuadrinhos} canalGlobal={canalGlobal} />

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

    </div>
  )
}
