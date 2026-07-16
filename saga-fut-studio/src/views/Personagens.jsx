import React, { useEffect, useState } from 'react'
import {
  ConfirmModal, DetalheModal, EditField, LinksDeUso, Media, NovoItemModal, PromptBlock, GenerateButton, FilePath, Icon, GrupoEstiloHead,
} from '../components/index.js'
import { blankChar } from '../lib/scaffold.js'
import { agruparPorEstilo } from '../lib/agrupar.js'
import { refInfoDaFicha } from '../lib/refs.js'
import { fichaImagem, refPersonagem } from '../../shared/caminhos.mjs'
import { useStudio } from '../app/StudioContext.jsx'

// Um botão de gerar por personagem, com o texto e o aviso certos. Vive no card
// enquanto a ficha não existe (é o motivo do card existir) e na ficha aberta,
// onde vira "Regerar" ao lado do prompt que o alimenta.
//
// O aviso diz o que vai junto como referência: as duas imagens mudam o resultado
// mais que qualquer palavra do prompt, e antes de substituir uma ficha você quer
// saber com o que ela vai ser gerada.
function BotaoGerar({ p, est }) {
  const { existing, jobs, startGen } = useStudio()
  return (
    <GenerateButton
      payload={{ tipo: 'ficha', personagemId: p.id }}
      targetPath={p.imagem}
      existing={existing}
      jobs={jobs}
      startGen={startGen}
      label="Gerar ficha"
      refInfo={refInfoDaFicha(p, est, existing)}
    />
  )
}

// O card da galeria: a cara, o nome e o estado da ficha bastam pra achar quem você
// procura. Clicar abre a ficha; ela vem por cima e a grade não se mexe.
function CharCard({ p, usos, onAbrir }) {
  const { dados, existing, bust } = useStudio()
  const est = (dados.estilos || []).find((e) => e.id === p.estiloId)
  const temFicha = !!existing[p.imagem]

  return (
    <div className="char-card" id={'char-' + p.id}>
      <button className="char-card-abrir" onClick={onAbrir}>
        <span className="char-img-wrap"><Media existing={existing} src={p.imagem} kind="img" bust={bust} /></span>
        <span className="char-body">
          <span className="char-card-top">
            <span className="char-nome" title={p.nome}>{p.nome || <span className="muted">sem nome</span>}</span>
            {/* a imagem já diz que a ficha existe; só a ausência precisa de aviso */}
            {!temFicha && (
              <span className="char-row-ficha" title="ficha ainda não gerada"><Icon name="alerta" size={12} /></span>
            )}
            <span className="char-card-chevron"><Icon name="chevron" size={11} /></span>
          </span>
          <span className="char-arquetipo" title={p.arquetipo}>{p.arquetipo}</span>
        </span>
      </button>

      {/* fora do botão de abrir: cada uso é um link e não pode roubar o clique dele */}
      <span className="char-usos" title={usos.length ? 'Aparece em: ' + usos.map((u) => u.titulo).join(', ') : undefined}>
        <LinksDeUso usos={usos} />
      </span>

      {!temFicha && <div className="char-card-acoes"><BotaoGerar p={p} est={est} /></div>}
    </div>
  )
}

// Quem o personagem É, quando descrever o rosto em palavras não dá conta: a foto do
// jogador real em que ele se baseia. Não é gerada pelo studio, você larga o arquivo
// na pasta, igual à referência de traço do estilo. Fica ao lado da ficha porque é o
// par que se compara: a pergunta é se a ficha ainda parece com ela.
function RefDeAparencia({ p }) {
  const { existing, bust } = useStudio()
  const rel = refPersonagem(p.id)
  return (
    <div className="field-group">
      <span className="label">Referência de aparência</span>
      {existing[rel]
        ? <img className="ref-img" src={'/files/' + rel + (bust ? '?v=' + bust : '')} alt={'Referência de ' + p.nome} />
        : <p className="hint">
            Nenhuma. Largue uma imagem em <code>{rel}</code> e ela passa a ir junto na geração
            desta ficha, como referência de quem ele é. O traço continua vindo do estilo.
          </p>}
    </div>
  )
}

// A ficha aberta, em modal: o mesmo detalhe do painel e da cena (ver DetalheModal),
// com a arte à esquerda e os textos que a descrevem à direita.
function FichaModal({ p, pi, usos, onExcluir, onFechar }) {
  const { dados, update, existing, bust } = useStudio()
  const estilos = dados.estilos || []
  const est = estilos.find((e) => e.id === p.estiloId)
  // espelha o readDados do server: estilo base + detalhe de arte do personagem
  const prefixo = est ? [est.stylePrefix, p.estiloExtra].filter(Boolean).join(', ') : ''
  const setChar = (campo, v) => update((n) => { n.personagens[pi][campo] = v })
  const temFicha = !!existing[p.imagem]

  return (
    <DetalheModal
      titulo={<span className="char-id" title="id, usado no nome do arquivo">{p.id}</span>}
      meta={<span className="char-usos"><LinksDeUso usos={usos} /></span>}
      acoes={<button className="btn btn-ghost btn-sm btn-danger" onClick={() => onExcluir(p.id)}>excluir</button>}
      // a ficha é a âncora de consistência: fica grande e à vista enquanto se
      // escreve a regra e o prompt que a descrevem
      midia={(
        <>
          <Media existing={existing} src={p.imagem} kind="img" bust={bust} />
          <FilePath path={p.imagem} />
          {temFicha && <BotaoGerar p={p} est={est} />}
          <RefDeAparencia p={p} />
        </>
      )}
      onFechar={onFechar}
    >
      <div className="field-row">
        <EditField label="Nome" value={p.nome} onChange={(v) => setChar('nome', v)} />
        <EditField label="Arquétipo" value={p.arquetipo} onChange={(v) => setChar('arquetipo', v)} />
      </div>
      <div className="field-row">
        <label className="field-group">
          <span className="label">Estilo</span>
          <select className="field" value={p.estiloId || ''} onChange={(e) => setChar('estiloId', e.target.value || undefined)}>
            <option value="">nenhum</option>
            {estilos.map((es) => <option key={es.id} value={es.id}>{es.nome}</option>)}
          </select>
        </label>
        <EditField label="Detalhe de arte" hint="Soma ao estilo." value={p.estiloExtra || ''}
          onChange={(v) => setChar('estiloExtra', v)} />
      </div>
      <EditField label="Regras" hint="Âncoras visuais que nunca mudam." value={p.regras}
        onChange={(v) => setChar('regras', v)} textarea />
      <PromptBlock
        label="Prompt da ficha"
        tool="ChatGPT Images"
        value={p.promptFicha}
        onChange={(v) => setChar('promptFicha', v)}
        copyText={`${prefixo}, ${p.promptFicha}\n\n${dados.projeto.promptRules}`}
        hint={`Copia com o estilo "${est?.nome || 'escolha um acima'}" e as regras da casa.`}
      />
      {/* sem ficha ainda, gerar é o próximo passo e fica no fim da leitura */}
      {!temFicha && <div className="gen-row"><BotaoGerar p={p} est={est} /></div>}
    </DetalheModal>
  )
}

// PERSONAGENS: o pool global, compartilhado entre sagas e quadrinhos.
// A rota #/personagens/<id> abre a ficha daquele personagem: é o endereço que o
// elenco das sagas e dos quadrinhos usa pra mandar você "editar no pool".
export default function PersonagensView({ personagemId }) {
  const { dados, update, existing, nav } = useStudio()
  const personagens = dados.personagens || []
  const [confirm, setConfirm] = useState(null)
  const [criando, setCriando] = useState(false)
  const [busca, setBusca] = useState('')
  const [soSemFicha, setSoSemFicha] = useState(false)

  // a rota é o estado: nada de "qual card está aberto" em paralelo com ela
  const aberto = personagemId ? personagens.find((p) => p.id === personagemId) : null

  // deixa o card do personagem à vista ATRÁS do modal: quem chegou por link de uma
  // saga cai numa galeria rolada no topo e, ao fechar, precisa achar de quem era
  useEffect(() => {
    if (!aberto) return
    document.getElementById('char-' + aberto.id)?.scrollIntoView({ block: 'nearest' })
  }, [personagemId])

  function criarPersonagem({ id, titulo }) {
    const p = blankChar(personagens.map((x) => x.id), { id, nome: titulo })
    update((n) => { n.personagens.push(p) })
    setCriando(false)
    nav.personagem(p.id) // já abre a ficha em branco pra preencher
  }
  function usosDe(pid) {
    return [
      ...(dados.sagas || []).filter((s) => s.elenco.includes(pid))
        .map((s) => ({ tipo: 'saga', id: s.id, titulo: s.titulo })),
      ...(dados.quadrinhos || []).filter((q) => (q.elenco || []).includes(pid))
        .map((q) => ({ tipo: 'quadrinho', id: q.id, titulo: q.titulo })),
    ]
  }
  function excluir(pid) {
    const p = personagens.find((x) => x.id === pid)
    const usos = usosDe(pid)
    setConfirm({
      titulo: 'Excluir personagem do pool?',
      mensagem: `"${p.nome}" sai do pool` + (usos.length ? ` e do elenco de: ${usos.map((u) => u.titulo).join(', ')}.` : '.') +
        '\n\nA imagem no disco continua. Salve depois para efetivar.',
      confirmar: 'Excluir', perigo: true,
      onConfirm: () => {
        setConfirm(null)
        nav.personagem() // fecha a ficha: ela não tem mais dono
        update((n) => {
          n.personagens = n.personagens.filter((x) => x.id !== pid)
          for (const s of n.sagas) s.elenco = s.elenco.filter((x) => x !== pid)
          for (const q of (n.quadrinhos || [])) q.elenco = (q.elenco || []).filter((x) => x !== pid)
        })
      },
    })
  }

  // com 17 fichas e crescendo, achar alguém pelo olho já custa mais que digitar
  const termo = busca.trim().toLowerCase()
  const lista = personagens.filter((p) => {
    if (soSemFicha && existing[p.imagem]) return false
    if (!termo) return true
    return [p.nome, p.arquetipo, p.id].some((v) => (v || '').toLowerCase().includes(termo))
  })
  const nSemFicha = personagens.filter((p) => !existing[p.imagem]).length
  // por estilo, na ordem do catálogo; dentro de cada grupo, por nome
  const grupos = agruparPorEstilo(lista, dados.estilos, (p) => p.nome || p.id)

  return (
    <div>
      {criando && (
        <NovoItemModal
          titulo="Novo personagem"
          rotuloNome="Nome do personagem"
          exemploNome="Ex: O Barbeiro"
          idsExistentes={personagens.map((p) => p.id)}
          previewPasta={(id) => fichaImagem(id)}
          onCriar={criarPersonagem}
          onCancel={() => setCriando(false)}
        />
      )}

      <div className="section-head">
        <h3 className="section-title">
          {personagens.length} personagens no pool
          {lista.length !== personagens.length && <span className="section-nota">{lista.length} na busca</span>}
        </h3>
        <div className="row-actions">
          <input className="field field-busca" value={busca} placeholder="Buscar por nome, arquétipo ou id…"
            onChange={(e) => setBusca(e.target.value)} />
          {nSemFicha > 0 && (
            <button className={'btn btn-sm' + (soSemFicha ? ' btn-primary' : '')} onClick={() => setSoSemFicha(!soSemFicha)}>
              <Icon name="alerta" size={12} /> Sem ficha ({nSemFicha})
            </button>
          )}
          <button className="btn btn-sm" onClick={() => setCriando(true)}><Icon name="plus" size={12} /> Novo personagem</button>
        </div>
      </div>
      <p className="hint intro">
        Reusado por qualquer saga ou quadrinho. A ficha é a âncora de consistência e vai como referência nas cenas
        onde ele aparece.
      </p>

      {lista.length === 0 && <p className="hint">Ninguém bate com esse filtro.</p>}

      {grupos.map((g) => (
        <div key={g.estiloId || '_sem'}>
          <GrupoEstiloHead nome={g.nome} n={g.itens.length} />
          <div className="char-grid">
            {g.itens.map((p) => (
              <CharCard key={p.id} p={p} usos={usosDe(p.id)} onAbrir={() => nav.personagem(p.id)} />
            ))}
          </div>
        </div>
      ))}

      {aberto && (
        <FichaModal
          p={aberto}
          pi={personagens.findIndex((x) => x.id === aberto.id)}
          usos={usosDe(aberto.id)}
          onExcluir={excluir}
          onFechar={() => nav.personagem()}
        />
      )}

      {/* por último de propósito: os dois modais dividem o mesmo z-index, então
          quem vem depois no DOM pinta por cima. A confirmação tem que ficar
          acima da ficha que a abriu. */}
      {confirm && <ConfirmModal {...confirm} onCancel={() => setConfirm(null)} />}
    </div>
  )
}
