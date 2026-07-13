import React, { useEffect, useRef, useState } from 'react'
import { getDados, saveDados } from './api.js'

// ---------- utilitários ----------

function CopyButton({ text, label = 'Copiar' }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }
  return (
    <button className={'copy-btn' + (copied ? ' copied' : '')} onClick={copy}>
      {copied ? '✓ Copiado!' : label}
    </button>
  )
}

function PromptBlock({ label, tool, value, onChange, copyText, hint }) {
  return (
    <div className="prompt-block">
      <div className="prompt-head">
        <span className="prompt-label">
          {label} {tool && <span className="tool-tag">{tool}</span>}
        </span>
        <CopyButton text={copyText ?? value} />
      </div>
      <textarea
        className="prompt-text"
        value={value}
        rows={Math.min(10, Math.max(3, Math.ceil(value.length / 90)))}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
      />
      {hint && <div className="prompt-hint">{hint}</div>}
    </div>
  )
}

function StatusPill({ value, onChange }) {
  const opts = ['pendente', 'gerada', 'aprovada', 'refazer']
  return (
    <select className={'status-pill s-' + value} value={value} onChange={(e) => onChange(e.target.value)}>
      {opts.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  )
}

function Media({ existing, src, kind, bust }) {
  if (!existing[src]) return <div className="media-missing">{kind === 'video' ? '🎬' : '🖼'} ainda não gerado</div>
  const url = '/files/' + src + (bust ? '?v=' + bust : '')
  return kind === 'video'
    ? <video className="media" src={url} controls preload="metadata" />
    : <img className="media" src={url} alt={src} />
}

// botão ⚡ Gerar com modal de confirmação. A geração vai pra uma FILA em segundo
// plano (até 4 em paralelo): confirmar fecha o modal e libera o studio; a imagem
// aparece sozinha quando termina. Só o botão do próprio alvo desabilita (evita
// enfileirar a mesma imagem 2x); os outros continuam clicáveis pra rodar junto.
function GenerateButton({ payload, targetPath, existing, jobs, startGen, label = '⚡ Gerar imagem', refInfo }) {
  const [open, setOpen] = useState(false)
  const jaExiste = !!existing[targetPath]
  const myJob = jobs.find((j) => j.targetPath === targetPath && (j.status === 'queued' || j.status === 'running'))

  function confirmar() {
    startGen(payload, targetPath, label)
    setOpen(false) // vai pra fila e roda em segundo plano
  }

  return (
    <>
      <button className="gen-btn" onClick={() => setOpen(true)} disabled={!!myJob}>
        {myJob?.status === 'running' ? '⏳ gerando…' : myJob?.status === 'queued' ? '⏳ na fila…' : label}
      </button>
      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h4>⚡ Gerar imagem com IA</h4>
            {jaExiste
              ? <p className="modal-warn">⚠ Isso vai <strong>substituir</strong> a imagem atual, não dá pra desfazer.</p>
              : <p>Gera via Codex (gpt-image-2, sua assinatura ChatGPT Plus). Sem custo de API.</p>}
            <p className="modal-path">📁 saga-fut/<strong>{targetPath}</strong></p>
            {refInfo && <p className="muted" style={{ fontSize: 12 }}>{refInfo}</p>}
            <p className="muted" style={{ fontSize: 12.5 }}>
              Roda em segundo plano, pode fechar e disparar outras (até 4 em paralelo). A imagem aparece sozinha ao terminar.
            </p>
            <div className="modal-actions">
              <button className="ctrl" onClick={() => setOpen(false)}>Cancelar</button>
              <button className="save-btn" onClick={confirmar}>{jaExiste ? 'Substituir' : 'Gerar'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// onde salvar o arquivo para o painel carregar
function FilePath({ path }) {
  return (
    <div className="file-path">
      <span title="Salve o arquivo exatamente neste caminho (dentro de saga-fut/)">📁 saga-fut/<strong>{path}</strong></span>
      <CopyButton text={path} label="copiar caminho" />
    </div>
  )
}

// estimativa de duração da narração (calibrada com áudio real do ElevenLabs: ~2.1 palavras/s
// + ~0.5s por pausa "..."). O clipe do Grok tem 10s.
function estimaSegundos(texto) {
  const palavras = (texto || '').trim().split(/\s+/).filter(Boolean).length
  const pausas = ((texto || '').match(/\.\.\./g) || []).length
  return Math.round(palavras / 2.1 + pausas * 0.5)
}

// orçamento de tempo da cena contra o clipe de 10s do Grok
const CLIPE_S = 10   // duração fixa do clipe do Grok
const MAX_S = 13.5   // acima disso, além de acelerar 1.35x, precisa congelar quadro
function orcamentoNarracao(texto) {
  const palavras = (texto || '').trim().split(/\s+/).filter(Boolean).length
  const pausas = ((texto || '').match(/\.\.\./g) || []).length
  const seg = estimaSegundos(texto)
  const alvoPalavras = Math.max(0, Math.round((CLIPE_S - pausas * 0.5) * 2.1))
  const cortar = Math.max(0, palavras - alvoPalavras)
  const nivel = seg > MAX_S ? 'alto' : seg > CLIPE_S ? 'medio' : 'ok'
  return { palavras, seg, nivel, cortar, alvoPalavras }
}

// progresso: conta arquivos que existem em disco (via /api/progress); fallback nos status
function epProgress(ep, progress) {
  const total = ep.cenas.length
  const p = progress && progress[ep.id]
  if (p) {
    return { img: p.img, vid: p.vid, audio: p.audio, total, done: p.img === total && p.vid === total && p.audio === total }
  }
  const img = ep.cenas.filter((c) => c.statusImagem === 'aprovada').length
  const vid = ep.cenas.filter((c) => c.statusVideo === 'aprovada').length
  return { img, vid, audio: 0, total, done: img === total && vid === total }
}

function sagaProgress(saga, progress) {
  const eps = saga.episodios.map((e) => epProgress(e, progress))
  return { prontos: eps.filter((e) => e.done).length, total: eps.length }
}

function CharAvatar({ p, existing, bust }) {
  return existing[p.imagem]
    ? <img className="avatar" src={'/files/' + p.imagem + (bust ? '?v=' + bust : '')} alt={p.nome} title={p.nome} />
    : <span className="avatar avatar-empty" title={p.nome}>{p.nome[0]}</span>
}

// ---------- scaffold: criar/duplicar sagas, episódios e cenas ----------

function slugify(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'saga'
}
function uniqueId(base, existing) {
  let id = base, i = 2
  while (existing.includes(id)) { id = `${base}-${i}`; i++ }
  return id
}
function allEpIds(dados) {
  return dados.sagas.flatMap((s) => s.episodios.map((e) => e.id))
}
function blankCena(epId, numero) {
  return {
    numero, titulo: 'Nova cena', tempo: '', personagens: [], naoAparecem: [],
    narracao: '', promptImagem: '', promptVideo: '', promptAudio: '', montagem: '',
    imagem: `episodios/${epId}/cenas/${numero}.png`, video: `episodios/${epId}/cenas/${numero}.mp4`,
    statusImagem: 'pendente', statusVideo: 'pendente',
  }
}
function blankEp(epId) {
  return {
    id: epId, titulo: 'Novo episódio', status: 'roteiro', contextoReal: '', cliffhanger: '',
    publicar: '', narracaoCompleta: '', cenas: [1, 2, 3, 4].map((k) => blankCena(epId, k)),
    endCardText: 'CONTINUA...',
    publicacao: { titulo: '', tiktok: '', instagram: '', twitter: '', youtube: { titulo: '', descricao: '' } },
  }
}
function blankSaga(existingIds) {
  const id = uniqueId('nova-saga', existingIds)
  return {
    id, titulo: 'Nova saga', selo: 'Mercado da Bola', genero: '', status: 'roteiro',
    premissa: '', narradorTom: '',
    stylePrefix: '3D animated caricature in Pixar style, cinematic lighting, exaggerated expressions, vertical 9:16',
    elenco: [], episodios: [blankEp(`${id}-01`)],
  }
}
// re-ids os episódios e re-aponta a mídia das cenas para as novas pastas (esqueleto limpo)
function reidEpisodios(saga, sagaId) {
  saga.episodios = saga.episodios.map((ep, i) => {
    const epId = `${sagaId}-${String(i + 1).padStart(2, '0')}`
    ep.id = epId
    ep.cenas = ep.cenas.map((c) => ({
      ...c, imagem: `episodios/${epId}/cenas/${c.numero}.png`, video: `episodios/${epId}/cenas/${c.numero}.mp4`,
      statusImagem: 'pendente', statusVideo: 'pendente',
    }))
    return ep
  })
  return saga
}
function dupSaga(saga, existingSagaIds) {
  const id = uniqueId(slugify(saga.titulo) + '-copia', existingSagaIds)
  const s = structuredClone(saga)
  s.id = id; s.titulo = saga.titulo + ' (cópia)'; s.status = 'roteiro'
  return reidEpisodios(s, id)
}
function dupEp(ep, dados) {
  const e = structuredClone(ep)
  const newId = uniqueId(ep.id + '-copia', allEpIds(dados))
  e.id = newId; e.titulo = ep.titulo + ' (cópia)'; e.status = 'roteiro'
  e.cenas = e.cenas.map((c) => ({
    ...c, imagem: `episodios/${newId}/cenas/${c.numero}.png`, video: `episodios/${newId}/cenas/${c.numero}.mp4`,
    statusImagem: 'pendente', statusVideo: 'pendente',
  }))
  return e
}
function dupCena(cena, epId, novoNumero) {
  return {
    ...structuredClone(cena), numero: novoNumero, titulo: cena.titulo + ' (cópia)',
    imagem: `episodios/${epId}/cenas/${novoNumero}.png`, video: `episodios/${epId}/cenas/${novoNumero}.mp4`,
    statusImagem: 'pendente', statusVideo: 'pendente',
  }
}
function blankChar(existingIds, nome) {
  const id = uniqueId(slugify(nome) || 'personagem', existingIds)
  return { id, nome: nome || 'Novo personagem', arquetipo: '', regras: '', imagem: `personagens/personagem-${id}.png`, promptFicha: '' }
}

// editor de elenco da cena: chips que ciclam aparece(✓) → não aparece(✗) → neutro
function CenaCast({ elencoIds, byId, personagens, naoAparecem, onChange }) {
  const stateOf = (id) => personagens.includes(id) ? 'in' : naoAparecem.includes(id) ? 'out' : 'off'
  const cycle = (id) => {
    const s = stateOf(id)
    let p = personagens.filter((x) => x !== id)
    let n = naoAparecem.filter((x) => x !== id)
    if (s === 'off') p = [...p, id]
    else if (s === 'in') n = [...n, id]
    onChange(p, n)
  }
  return (
    <div className="cast-editor">
      {elencoIds.length === 0
        ? <span className="muted" style={{ fontSize: 12 }}>Adicione personagens ao elenco da saga primeiro (aba da saga).</span>
        : elencoIds.map((id) => {
          const s = stateOf(id)
          return (
            <button key={id} className={'cast-chip ' + s} onClick={() => cycle(id)}
              title="clique: aparece → não aparece → neutro">
              {s === 'in' ? '✓ ' : s === 'out' ? '✗ ' : ''}{byId[id]?.nome || id}
            </button>
          )
        })}
    </div>
  )
}

// modal de confirmação reutilizável (para ações destrutivas)
function ConfirmModal({ titulo, mensagem, confirmar, onConfirm, onCancel, perigo }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h4>{titulo}</h4>
        <p style={{ whiteSpace: 'pre-wrap' }}>{mensagem}</p>
        <div className="modal-actions">
          <button className="ctrl" onClick={onCancel}>Cancelar</button>
          <button className={perigo ? 'gen-btn' : 'save-btn'} onClick={onConfirm}>{confirmar || 'Confirmar'}</button>
        </div>
      </div>
    </div>
  )
}

// input inline editável (rótulo pequeno em cima), para metadados de saga/episódio
function EditField({ label, value, onChange, textarea, placeholder }) {
  return (
    <label className="edit-field">
      <span className="edit-label">{label}</span>
      {textarea
        ? <textarea value={value || ''} placeholder={placeholder} rows={Math.min(6, Math.max(2, Math.ceil((value || '').length / 80)))} onChange={(e) => onChange(e.target.value)} />
        : <input value={value || ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />}
    </label>
  )
}

// ---------- HOME: grade de sagas ----------

function Home({ dados, existing, progress, goSaga, onEditRules, bust, onNewSaga }) {
  const byId = Object.fromEntries(dados.personagens.map((p) => [p.id, p]))
  return (
    <div>
      <div className="saga-grid">
        {dados.sagas.map((saga, si) => {
          const prog = sagaProgress(saga, progress)
          return (
            <div className="saga-card" key={saga.id} onClick={() => goSaga(si)}>
              <div className="saga-card-head">
                <span className="selo">{saga.selo}</span>
                <span className={'saga-status st-' + saga.status.split(' ')[0]}>{saga.status}</span>
              </div>
              <h3>{saga.titulo}</h3>
              <p className="muted">{saga.genero}</p>
              <div className="saga-card-cast">
                {saga.elenco.map((id) => byId[id] && <CharAvatar key={id} p={byId[id]} existing={existing} bust={bust} />)}
              </div>
              <div className="saga-card-foot">
                <span>{prog.prontos}/{prog.total} episódios prontos</span>
                <div className="bar"><div className="bar-fill" style={{ width: `${prog.total ? (prog.prontos / prog.total) * 100 : 0}%` }} /></div>
              </div>
            </div>
          )
        })}
        <div className="saga-card saga-card-new" onClick={onNewSaga} title="Cria uma saga em branco (template) e abre para edição">
          <h3>＋ Nova saga</h3>
          <p className="muted">Cria uma saga em branco (1 episódio, 4 cenas) e abre pra você preencher. Ou duplique uma existente dentro dela.</p>
        </div>
      </div>

      <div className="panel">
        <h3>Pipeline de ferramentas</h3>
        <table className="tools-table">
          <tbody>
            {dados.ferramentas.map((f) => (
              <tr key={f.etapa}>
                <td className="tool-etapa">{f.etapa}</td>
                <td className="tool-nome">{f.nome}</td>
                <td className="muted">{f.nota}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h3>Regras da casa (negativos anexados a todo prompt de imagem)</h3>
        <p className="muted">Isto vai junto automaticamente quando você copia qualquer prompt de ficha ou cena, evita marcas, quebra de consistência e desvio de estilo.</p>
        <PromptBlock
          label="Bloco de negativos/consistência"
          value={dados.projeto.promptRules}
          onChange={(v) => onEditRules(v)}
        />
      </div>

      <div className="panel">
        <h3>Áudio da casa (todos os projetos)</h3>
        <p className="muted">{dados.audio.narradorVoz}</p>
        <PromptBlock label="Vinheta (gerar 1x e reusar)" tool="Suno" value={dados.audio.vinhetaPrompt} onChange={() => {}} />
      </div>
    </div>
  )
}

// ---------- MELHORIAS: backlog do projeto ----------

function Melhorias({ dados, update }) {
  const itens = dados.melhorias || []
  const ordem = { alta: 0, média: 1, baixa: 2 }
  const sorted = [...itens].sort((a, b) => (a.feito - b.feito) || (ordem[a.prioridade] - ordem[b.prioridade]))
  return (
    <div>
      <div className="panel">
        <h3>Backlog de melhorias</h3>
        <p className="muted">Pontos identificados para elevar os próximos lotes. Marque conforme for fazendo.</p>
      </div>
      {sorted.map((m) => {
        const idx = itens.findIndex((x) => x.id === m.id)
        return (
          <div className={'panel melhoria' + (m.feito ? ' feito' : '')} key={m.id}>
            <label className="melhoria-head">
              <input type="checkbox" checked={!!m.feito} onChange={(e) => update((n) => { n.melhorias[idx].feito = e.target.checked })} />
              <span className="melhoria-titulo">{m.titulo}</span>
              <span className={'prio prio-' + m.prioridade}>{m.prioridade}</span>
            </label>
            <p className="melhoria-desc">{m.desc}</p>
            <div className="melhoria-tags">
              <span>impacto: <strong>{m.impacto}</strong></span>
              <span>esforço: <strong>{m.esforco}</strong></span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ---------- SAGA: elenco + episódios + estilo ----------

function SagaView({ dados, si, update, existing, progress, goEp, bust, jobs, startGen, goSaga, goHome }) {
  const saga = dados.sagas[si]
  const byId = Object.fromEntries(dados.personagens.map((p) => [p.id, p]))
  const elenco = saga.elenco.map((id) => byId[id]).filter(Boolean)
  const [confirm, setConfirm] = useState(null)
  const set = (campo, v) => update((n) => { n.sagas[si][campo] = v })

  function duplicarSaga() {
    const copia = dupSaga(saga, dados.sagas.map((s) => s.id))
    update((n) => { n.sagas.splice(si + 1, 0, copia) })
    goSaga(si + 1)
  }
  function excluirSaga() {
    setConfirm({
      titulo: 'Excluir saga?',
      mensagem: `A saga "${saga.titulo}" e seus ${saga.episodios.length} episódio(s) saem dos dados.\n\nOs ARQUIVOS de imagem/vídeo continuam no disco (não são apagados). Clique em Salvar depois para efetivar.`,
      confirmar: 'Excluir', perigo: true,
      onConfirm: () => { setConfirm(null); goHome(); update((n) => { n.sagas.splice(si, 1) }) },
    })
  }
  function novoEpisodio() {
    const epId = uniqueId(`${saga.id}-${String(saga.episodios.length + 1).padStart(2, '0')}`, allEpIds(dados))
    update((n) => { n.sagas[si].episodios.push(blankEp(epId)) })
  }
  function duplicarEp(ei) {
    const copia = dupEp(saga.episodios[ei], dados)
    update((n) => { n.sagas[si].episodios.splice(ei + 1, 0, copia) })
  }
  function excluirEp(ei) {
    const ep = saga.episodios[ei]
    setConfirm({
      titulo: 'Excluir episódio?',
      mensagem: `O episódio "${ep.titulo}" (${ep.id}) sai da saga. Os arquivos no disco continuam. Salve depois para efetivar.`,
      confirmar: 'Excluir', perigo: true,
      onConfirm: () => { setConfirm(null); update((n) => { n.sagas[si].episodios.splice(ei, 1) }) },
    })
  }
  function addAoElenco(pid) { update((n) => { if (!n.sagas[si].elenco.includes(pid)) n.sagas[si].elenco.push(pid) }) }
  function removerDoElenco(pid) { update((n) => { n.sagas[si].elenco = n.sagas[si].elenco.filter((x) => x !== pid) }) }
  function novoPersonagem() {
    const p = blankChar(dados.personagens.map((x) => x.id), '')
    update((n) => { n.personagens.push(p); n.sagas[si].elenco.push(p.id) })
  }
  const foraDoElenco = dados.personagens.filter((p) => !saga.elenco.includes(p.id))

  return (
    <div>
      {confirm && <ConfirmModal {...confirm} onCancel={() => setConfirm(null)} />}
      <div className="panel">
        <div className="saga-card-head">
          <span className="selo">{saga.selo}</span>
          <div className="row-actions">
            <button className="mini-btn" onClick={duplicarSaga}>⧉ Duplicar</button>
            <button className="mini-btn danger" onClick={excluirSaga}>🗑 Excluir</button>
          </div>
        </div>
        <EditField label="Título" value={saga.titulo} onChange={(v) => set('titulo', v)} />
        <div className="edit-row">
          <EditField label="Selo" value={saga.selo} onChange={(v) => set('selo', v)} />
          <EditField label="Gênero" value={saga.genero} onChange={(v) => set('genero', v)} />
          <EditField label="Status" value={saga.status} onChange={(v) => set('status', v)} />
        </div>
        <EditField label="Premissa" value={saga.premissa} onChange={(v) => set('premissa', v)} textarea />
        <EditField label="Tom do narrador (🎙)" value={saga.narradorTom} onChange={(v) => set('narradorTom', v)} textarea />
      </div>

      <div className="section-head">
        <h3 className="section-title">Episódios</h3>
        <button className="mini-btn" onClick={novoEpisodio}>＋ Novo episódio</button>
      </div>
      <div className="ep-list">
        {saga.episodios.map((ep, ei) => {
          const prog = epProgress(ep, progress)
          return (
            <div className="ep-row" key={ep.id}>
              <div className="ep-row-main" onClick={() => goEp(si, ei)}>
                <div className="ep-row-thumb">
                  {existing[ep.cenas[0]?.imagem]
                    ? <img src={'/files/' + ep.cenas[0].imagem + (bust ? '?v=' + bust : '')} alt="" />
                    : <span>{ei + 1}</span>}
                </div>
                <div className="ep-row-body">
                  <div className="ep-row-title">{ep.id.toUpperCase()}, {ep.titulo}</div>
                  <div className="muted ep-row-sub">{ep.publicar}</div>
                </div>
                <div className="ep-row-prog">
                  <span title="imagens" className={prog.img === prog.total ? 'ok' : ''}>🖼 {prog.img}/{prog.total}</span>
                  <span title="vídeos" className={prog.vid === prog.total ? 'ok' : ''}>🎬 {prog.vid}/{prog.total}</span>
                  <span title="narração (áudio)" className={prog.audio === prog.total ? 'ok' : ''}>🎙 {prog.audio}/{prog.total}</span>
                  {prog.done && <span className="ep-done">✓ pronto</span>}
                </div>
              </div>
              <div className="ep-row-actions">
                <button className="mini-btn" title="Duplicar episódio" onClick={() => duplicarEp(ei)}>⧉</button>
                <button className="mini-btn danger" title="Excluir episódio" onClick={() => excluirEp(ei)}>🗑</button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="section-head">
        <h3 className="section-title">Elenco da saga</h3>
        <div className="row-actions">
          {foraDoElenco.length > 0 && (
            <select className="add-select" value="" onChange={(e) => { if (e.target.value) addAoElenco(e.target.value) }}>
              <option value="">＋ Adicionar do pool…</option>
              {foraDoElenco.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          )}
          <button className="mini-btn" onClick={novoPersonagem}>＋ Novo personagem</button>
        </div>
      </div>
      {elenco.length === 0 && <p className="muted" style={{ marginBottom: 12 }}>Nenhum personagem ainda. Crie um novo ou adicione do pool acima.</p>}
      <div className="char-grid">
        {elenco.map((p) => {
          const pi = dados.personagens.findIndex((x) => x.id === p.id)
          const outras = dados.sagas.filter((s, j) => j !== si && s.elenco.includes(p.id)).map((s) => s.titulo)
          return (
            <div className="char-card" key={p.id}>
              <div className="char-img-wrap"><Media existing={existing} src={p.imagem} kind="img" bust={bust} /></div>
              <div className="char-body">
                <div className="char-card-top">
                  <span className="char-id" title="id (usado no nome do arquivo)">#{p.id}</span>
                  <button className="mini-btn danger" title="Tira do elenco desta saga (não apaga o personagem do pool)" onClick={() => removerDoElenco(p.id)}>remover</button>
                </div>
                <EditField label="Nome" value={p.nome} onChange={(v) => update((n) => { n.personagens[pi].nome = v })} />
                <EditField label="Arquétipo (quem evoca)" value={p.arquetipo} onChange={(v) => update((n) => { n.personagens[pi].arquetipo = v })} />
                {outras.length > 0 && <p className="char-cross">🔗 também em: {outras.join(', ')}</p>}
                <EditField label="Regras (âncoras visuais)" value={p.regras} onChange={(v) => update((n) => { n.personagens[pi].regras = v })} textarea />
                <PromptBlock
                  label="Prompt da ficha"
                  tool="ChatGPT Images"
                  value={p.promptFicha}
                  onChange={(v) => update((n) => { n.personagens[pi].promptFicha = v })}
                  copyText={`${saga.stylePrefix}, ${p.promptFicha}\n\n${dados.projeto.promptRules}`}
                  hint="Copia com o prefixo de estilo da saga + as regras da casa (negativos)."
                />
                <div className="gen-row">
                  <GenerateButton
                    payload={{ tipo: 'ficha', sagaId: saga.id, personagemId: p.id }}
                    targetPath={p.imagem}
                    existing={existing}
                    jobs={jobs}
                    startGen={startGen}
                    label="⚡ Gerar ficha"
                  />
                  <span className="gen-hint muted">gpt-image-2 · seu ChatGPT Plus</span>
                </div>
                <FilePath path={p.imagem} />
              </div>
            </div>
          )
        })}
      </div>

      <h3 className="section-title">Estilo visual da saga</h3>
      <div className="panel">
        <PromptBlock
          label="Prefixo de estilo (vai junto em todo prompt de imagem desta saga)"
          value={saga.stylePrefix}
          onChange={(v) => update((n) => { n.sagas[si].stylePrefix = v })}
        />
      </div>
    </div>
  )
}

// ---------- EPISÓDIO: cenas + prévia + narração ----------

function Previa({ ep, existing }) {
  const cenas = ep.cenas
  const [idx, setIdx] = useState(0)
  const [auto, setAuto] = useState(false)
  const [muted, setMuted] = useState(true)
  const videoRef = useRef(null)

  const cena = cenas[idx]
  const hasVideo = existing[cena.video]
  const total = cenas.length

  useEffect(() => {
    const v = videoRef.current
    if (!auto || !hasVideo || !v) return
    const tryPlay = () => v.play().catch(() => {})
    if (v.readyState >= 2) {
      tryPlay()
    } else {
      v.addEventListener('canplay', tryPlay, { once: true })
      return () => v.removeEventListener('canplay', tryPlay)
    }
  }, [idx, auto, hasVideo])

  function onEnded() {
    if (idx < total - 1) setIdx(idx + 1)
    else setAuto(false)
  }

  return (
    <div className="previa-player">
      <div className="phone">
        {hasVideo ? (
          <video
            ref={videoRef}
            src={'/files/' + cena.video + '#t=0.01'}
            muted={muted}
            controls={!auto}
            onEnded={onEnded}
            playsInline
            preload="auto"
          />
        ) : (
          existing[cena.imagem]
            ? <img src={'/files/' + cena.imagem} alt="" />
            : <div className="media-missing">cena {cena.numero} ainda sem mídia</div>
        )}
        <div className="phone-caption">
          <div className="phone-scene">CENA {cena.numero}/{total}, {cena.titulo}</div>
          <div className="phone-narracao">“{cena.narracao}”</div>
        </div>
      </div>

      <div className="previa-side">
        <div className="panel">
          <h3>Prévia do episódio</h3>
          <p className="muted">
            Toca os clipes em sequência (~{total * 10}s). O corte final terá a narração por cima, isto é a animatic para sentir o ritmo.
          </p>
          <div className="previa-controls">
            <button className="ctrl" onClick={() => { setAuto(false); setIdx(Math.max(0, idx - 1)) }} disabled={idx === 0}>⏮ anterior</button>
            <button className="ctrl main" onClick={() => { setIdx(0); setAuto(true) }}>▶ Assistir tudo</button>
            <button className="ctrl" onClick={() => { setAuto(false); setIdx(Math.min(total - 1, idx + 1)) }} disabled={idx === total - 1}>próxima ⏭</button>
          </div>
          <label className="mute-toggle">
            <input type="checkbox" checked={muted} onChange={(e) => setMuted(e.target.checked)} />
            <span>sem som (ambiência desligada)</span>
          </label>
        </div>

        <div className="panel">
          <h3>Linha do tempo</h3>
          <div className="thumbs">
            {cenas.map((c, i) => (
              <button
                key={c.numero}
                className={'thumb' + (i === idx ? ' active' : '')}
                onClick={() => { setAuto(false); setIdx(i) }}
                title={c.titulo}
              >
                {existing[c.imagem]
                  ? <img src={'/files/' + c.imagem} alt={c.titulo} />
                  : <span className="thumb-empty">{c.numero}</span>}
                <span className="thumb-num">{c.numero}</span>
              </button>
            ))}
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
            {cena.tempo} • 🎬 {cena.montagem}
          </div>
        </div>
      </div>
    </div>
  )
}

// desenha o card final "continua..." no canvas → PNG (data URL)
function drawEndCard(text) {
  const c = document.createElement('canvas')
  c.width = 1080; c.height = 1920
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#08090d'; ctx.fillRect(0, 0, 1080, 1920)
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  try { ctx.letterSpacing = '6px' } catch {}
  // linha decorativa dourada
  ctx.strokeStyle = '#edbb00'; ctx.lineWidth = 3
  ctx.beginPath(); ctx.moveTo(440, 860); ctx.lineTo(640, 860); ctx.stroke()
  ctx.fillStyle = '#f0ece0'
  ctx.font = '700 96px Georgia, "Times New Roman", serif'
  ctx.fillText(text || 'CONTINUA...', 540, 970)
  return c.toDataURL('image/png')
}

// desenha o gancho de abertura (pergunta/afirmação forte) no terço superior → PNG transparente
// sobreposto à 1ª cena. Sempre com faixa: precisa ser legível sobre qualquer footage.
function drawHook(text) {
  const W = 1080, H = 1920
  const c = document.createElement('canvas')
  c.width = W; c.height = H
  const ctx = c.getContext('2d')
  ctx.font = '800 76px -apple-system, "Segoe UI", Roboto, Arial, sans-serif'
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'
  const maxW = W - 130
  const words = (text || '').trim().split(/\s+/)
  const lines = []
  let line = ''
  for (const w of words) {
    const test = line ? line + ' ' + w : w
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w }
    else line = test
  }
  if (line) lines.push(line)
  const lineH = 92
  const firstY = Math.round(H * 0.24) - ((lines.length - 1) * lineH) / 2 // terço superior (não colide com legenda)

  // faixa semitransparente atrás (legibilidade sobre qualquer cena)
  let maxLine = 0
  for (const ln of lines) maxLine = Math.max(maxLine, ctx.measureText(ln).width)
  const halfLine = 46, padX = 48, padY = 28
  const bandW = Math.min(W - 24, maxLine + padX * 2)
  const bandH = (lines.length - 1) * lineH + halfLine * 2 + padY * 2
  const bandX = (W - bandW) / 2
  const bandY = firstY - halfLine - padY
  ctx.fillStyle = 'rgba(0,0,0,0.62)'
  ctx.beginPath()
  if (ctx.roundRect) ctx.roundRect(bandX, bandY, bandW, bandH, 28)
  else ctx.rect(bandX, bandY, bandW, bandH)
  ctx.fill()

  // filete dourado (marca da casa) acima do texto
  ctx.strokeStyle = '#edbb00'; ctx.lineWidth = 4
  ctx.beginPath(); ctx.moveTo(W / 2 - 70, bandY - 18); ctx.lineTo(W / 2 + 70, bandY - 18); ctx.stroke()

  let y = firstY
  for (const ln of lines) {
    ctx.lineWidth = 10; ctx.strokeStyle = 'rgba(0,0,0,0.92)'; ctx.strokeText(ln, W / 2, y)
    ctx.fillStyle = '#ffffff'; ctx.fillText(ln, W / 2, y)
    y += lineH
  }
  return c.toDataURL('image/png')
}

// quebra a narração em blocos curtos: nas batidas "..." e depois em ~6 palavras
function splitNarracao(text) {
  const beats = (text || '').split(/\.{3}|…/).map((s) => s.trim()).filter(Boolean)
  const chunks = []
  const MAXW = 6
  for (const b of beats) {
    const limpo = b.replace(/^["“”']+|["“”']+$/g, '').trim()
    const words = limpo.split(/\s+/).filter(Boolean)
    for (let i = 0; i < words.length;) {
      const rest = words.length - (i + MAXW)
      // se depois deste bloco sobrar só 1-2 palavras, junta tudo aqui (evita legenda órfã)
      const take = rest > 0 && rest <= 2 ? words.length - i : MAXW
      chunks.push(words.slice(i, i + take).join(' '))
      i += take
    }
  }
  return chunks
}

// desenha um bloco de legenda estilo TikTok (texto grande + contorno) → PNG
// comFaixa: adiciona uma faixa semitransparente atrás do texto (melhora leitura)
function drawCaption(text, comFaixa) {
  const W = 1080, H = 1920
  const c = document.createElement('canvas')
  c.width = W; c.height = H
  const ctx = c.getContext('2d')
  ctx.font = '800 66px -apple-system, "Segoe UI", Roboto, Arial, sans-serif'
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'
  // quebra de linha respeitando a largura
  const maxW = W - 160
  const words = (text || '').trim().split(/\s+/)
  const lines = []
  let line = ''
  for (const w of words) {
    const test = line ? line + ' ' + w : w
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w }
    else line = test
  }
  if (line) lines.push(line)
  const lineH = 84
  const firstY = Math.round(H * 0.76) - ((lines.length - 1) * lineH) / 2 // terço inferior

  if (comFaixa) {
    let maxLine = 0
    for (const ln of lines) maxLine = Math.max(maxLine, ctx.measureText(ln).width)
    const halfLine = 42, padX = 44, padY = 22
    const bandW = Math.min(W - 40, maxLine + padX * 2)
    const bandH = (lines.length - 1) * lineH + halfLine * 2 + padY * 2
    const bandX = (W - bandW) / 2
    const bandY = firstY - halfLine - padY
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.beginPath()
    if (ctx.roundRect) ctx.roundRect(bandX, bandY, bandW, bandH, 26)
    else ctx.rect(bandX, bandY, bandW, bandH)
    ctx.fill()
  }

  let y = firstY
  for (const ln of lines) {
    ctx.lineWidth = comFaixa ? 8 : 16; ctx.strokeStyle = 'rgba(0,0,0,0.92)'; ctx.strokeText(ln, W / 2, y)
    ctx.fillStyle = '#ffffff'; ctx.fillText(ln, W / 2, y)
    y += lineH
  }
  return c.toDataURL('image/png')
}

function Montar({ ep, update, si, ei }) {
  const [status, setStatus] = useState(null)
  const [rendering, setRendering] = useState(false)
  const [msg, setMsg] = useState(null)
  const [err, setErr] = useState(null)
  const [bust, setBust] = useState(0)
  const [comCard, setComCard] = useState(true)
  const [comHook, setComHook] = useState(true)
  const [comLegenda, setComLegenda] = useState(true)
  const [comFaixa, setComFaixa] = useState(false)
  const [musicas, setMusicas] = useState([])
  const [inicios, setInicios] = useState({})
  const [preview, setPreview] = useState('')
  const [musicaVol, setMusicaVol] = useState(ep.musicaVol ?? 0.08)
  function salvarInicio(file, seg) {
    const v = Math.max(0, Math.round(Number(seg) || 0))
    setInicios((prev) => ({ ...prev, [file]: v }))
    fetch('/api/musica-inicio', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ file, inicio: v }) }).catch(() => {})
  }
  const n = ep.cenas.length

  async function refresh() {
    const r = await fetch(`/api/render-status/${ep.id}/${n}`).then((r) => r.json())
    setStatus(r)
  }
  useEffect(() => { refresh() }, [ep.id])
  useEffect(() => { fetch('/api/musicas').then((r) => r.json()).then((d) => { setMusicas(d.musicas || []); setInicios(d.inicios || {}) }).catch(() => {}) }, [])

  async function montar() {
    setRendering(true); setErr(null); setMsg(null)
    try {
      let captions = null
      if (comLegenda) {
        captions = {}
        for (const c of ep.cenas) {
          const chunks = splitNarracao(c.narracao)
          if (chunks.length) captions[c.numero] = chunks.map((t) => ({ text: t, png: drawCaption(t, comFaixa) }))
        }
      }
      // resolve a trilha efetiva por cena: faixa própria, ou herda a da cena anterior
      let curTrilha = ''
      const trilhaPorCena = ep.cenas.map((c, i) => {
        const own = c.musica ?? (i === 0 ? (ep.musica || '') : '')
        if (own) curTrilha = own
        return curTrilha
      })
      const r = await fetch('/api/render', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          epId: ep.id, nCenas: n,
          endCardPng: comCard ? drawEndCard(ep.endCardText) : null,
          hookCardPng: comHook && (ep.hookText || '').trim() ? drawHook(ep.hookText) : null,
          captions,
          trilhaPorCena,
          musicaVol,
        }),
      }).then((r) => r.json())
      if (r.error) setErr(r.error)
      else { setMsg(r.aviso || 'Rascunho montado!'); setBust(Date.now()); refresh() }
    } catch (e) { setErr(e.message) } finally { setRendering(false) }
  }

  const clipesOk = status?.cenas.every((c) => c.video)
  const algumAudio = status?.cenas.some((c) => c.audio)

  return (
    <div className="previa-player">
      <div className="phone">
        {status?.roughCut
          ? <video src={'/files/' + status.roughCut + '?v=' + bust} controls preload="metadata" />
          : <div className="media-missing">o rascunho aparece aqui depois de montar</div>}
      </div>
      <div className="previa-side">
        <div className="panel">
          <h3>Montar rascunho (clipes + narração)</h3>
          <p className="muted">
            O servidor junta os 4 clipes na ordem, sobrepõe a narração de cada cena e abaixa a
            ambiência. Sai um <code>rough-cut.mp4</code>, o acabamento (legendas, zoom) é no CapCut.
          </p>
          <div className="render-files">
            {status?.cenas.map((c) => (
              <div className="render-row" key={c.numero}>
                <span>Cena {c.numero}</span>
                <span className={c.video ? 'ok' : 'no'}>{c.video ? '✓ clipe' : '✗ clipe'}</span>
                <span className={c.audio ? 'ok' : 'no'}>{c.audio ? '✓ narração' : ', narração'}</span>
              </div>
            ))}
          </div>
          <label className="mute-toggle" style={{ marginTop: 12 }}>
            <input type="checkbox" checked={comHook} onChange={(e) => setComHook(e.target.checked)} />
            <span>🪝 gancho de abertura (texto grande sobre a 1ª cena, ~3s)</span>
          </label>
          {comHook && (
            <>
              <input
                className="endcard-input"
                value={ep.hookText || ''}
                onChange={(e) => update((nv) => { nv.sagas[si].episodios[ei].hookText = e.target.value })}
                placeholder="Ex: Se você é do Barça, isso vai doer…"
              />
              <div className="muted" style={{ fontSize: 11, marginTop: 4, marginLeft: 2 }}>
                No frame 1, máx. ~7 palavras. As duas fórmulas de maior retenção pra conta pequena:
                <ul style={{ margin: '4px 0 0', paddingLeft: 16 }}>
                  <li><strong>Chamada de identidade:</strong> "Se você é do Barça, isso vai doer" (especificidade &gt; alcance).</li>
                  <li><strong>Lacuna de curiosidade:</strong> abre uma pergunta e NÃO responde ("Ninguém viu o que ele fez no túnel").</li>
                </ul>
                <span style={{ display: 'block', marginTop: 4 }}>Teste no mudo: se o 1º frame sozinho não passa tensão, o gancho falhou. Deixe vazio para pular.</span>
              </div>
            </>
          )}
          <label className="mute-toggle" style={{ marginTop: 12 }}>
            <input type="checkbox" checked={comLegenda} onChange={(e) => setComLegenda(e.target.checked)} />
            <span>🔤 queimar legendas (da narração, sync aproximado)</span>
          </label>
          {comLegenda && (
            <label className="mute-toggle" style={{ marginTop: 8, marginLeft: 24 }}>
              <input type="checkbox" checked={comFaixa} onChange={(e) => setComFaixa(e.target.checked)} />
              <span>faixa semitransparente atrás do texto</span>
            </label>
          )}
          <label className="mute-toggle" style={{ marginTop: 8 }}>
            <input type="checkbox" checked={comCard} onChange={(e) => setComCard(e.target.checked)} />
            <span>incluir card final</span>
          </label>
          {comCard && (
            <input
              className="endcard-input"
              value={ep.endCardText || ''}
              onChange={(e) => update((nv) => { nv.sagas[si].episodios[ei].endCardText = e.target.value })}
              placeholder="CONTINUA..."
            />
          )}
          <label className="mute-toggle" style={{ marginTop: 12, display: 'block' }}>
            <span>🎵 trilha por cena (crossfade automático na troca)</span>
          </label>
          {musicas.length === 0 ? (
            <p className="muted" style={{ fontSize: 11, marginTop: 4, marginLeft: 2 }}>
              Nenhuma trilha em saga-fut/assets/musica/ ainda. Baixe MP3 livres de uso lá (ver TRILHAS.md).
            </p>
          ) : (
            <>
              <div style={{ display: 'grid', gap: 6, marginTop: 6 }}>
                {ep.cenas.map((c, i) => {
                  const val = c.musica ?? (i === 0 ? (ep.musica || '') : '')
                  return (
                    <div key={c.numero} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="muted" style={{ fontSize: 12, width: 54 }}>Cena {c.numero}</span>
                      <select
                        className="endcard-input"
                        style={{ flex: 1, marginTop: 0 }}
                        value={val}
                        onChange={(e) => update((nv) => { nv.sagas[si].episodios[ei].cenas[i].musica = e.target.value })}
                      >
                        <option value="">{i === 0 ? '(sem trilha)' : '(continua a anterior)'}</option>
                        {musicas.map((m) => <option key={m} value={m}>{m.replace(/\.[^.]+$/, '')}</option>)}
                      </select>
                      {val && (
                        <span title="início da faixa em segundos (pula a intro; vale pra ela em todo lugar)" style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <input
                            type="number" min="0" step="1"
                            value={inicios[val] ?? 0}
                            onChange={(e) => salvarInicio(val, e.target.value)}
                            style={{ width: 42, padding: '4px 4px', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 8, color: 'var(--fg, #f0ece0)', fontSize: 12, textAlign: 'right' }}
                          />
                          <span className="muted" style={{ fontSize: 11 }}>s</span>
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setPreview(val ? '/files/assets/musica/' + encodeURIComponent(val) + '#t=' + (inicios[val] ?? 0) : '')}
                        disabled={!val}
                        title="ouvir esta faixa a partir do início escolhido"
                        style={{ padding: '4px 9px', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 8, color: val ? 'var(--gold)' : 'var(--muted)', cursor: val ? 'pointer' : 'default' }}
                      >▶</button>
                    </div>
                  )
                })}
              </div>
              {preview && <audio controls src={preview} autoPlay style={{ width: '100%', marginTop: 8, height: 36 }} />}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <span className="muted" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>🔊 volume no vídeo</span>
                <input
                  type="range" min="0.01" max="0.30" step="0.01"
                  value={musicaVol}
                  onChange={(e) => { const v = Number(e.target.value); setMusicaVol(v); update((nv) => { nv.sagas[si].episodios[ei].musicaVol = v }) }}
                  style={{ flex: 1 }}
                />
                <span className="muted" style={{ fontSize: 12, width: 86, textAlign: 'right' }}>
                  {Math.round(musicaVol * 100)}%{musicaVol <= 0.05 ? ' (sutil)' : musicaVol >= 0.18 ? ' (alto)' : ''}
                </span>
              </div>
              <p className="muted" style={{ fontSize: 11, marginTop: 2, marginLeft: 2 }}>
                Deixe "(continua)" onde o clima não muda; escolha uma faixa só onde ele vira. O campo "s" pula a intro da faixa (sugerido automático, ajustável); o ▶ toca a partir dele; o slider define o volume sob a narração.
              </p>
            </>
          )}
          <button className="save-btn" style={{ marginTop: 12 }} onClick={montar} disabled={rendering || !clipesOk}>
            {rendering ? 'Montando…' : '🎬 Montar rascunho'}
          </button>
          {!clipesOk && <p className="muted" style={{ marginTop: 8 }}>Faltam clipes de vídeo, gere as cenas primeiro.</p>}
          {!algumAudio && clipesOk && <p className="muted" style={{ marginTop: 8 }}>Sem narração ainda: dá pra montar mesmo assim (usa o áudio dos clipes).</p>}
          {msg && <p className="render-msg ok" style={{ marginTop: 8 }}>✓ {msg}</p>}
          {err && <p className="render-msg no" style={{ marginTop: 8 }}>⚠ {err}</p>}
          {status?.roughCut && <FilePath path={status.roughCut} />}
        </div>
        <div className="panel">
          <h3>Onde salvar a narração</h3>
          <p className="muted">Uma narração por cena (melhor sincronia). Salve os MP3 do ElevenLabs em:</p>
          {ep.cenas.map((c) => <FilePath key={c.numero} path={`episodios/${ep.id}/audio/${c.numero}.mp3`} />)}
          <p className="muted" style={{ marginTop: 10 }}>
            Depois clique em Montar. Sem narração numa cena, o rascunho usa o áudio do próprio clipe.
          </p>
        </div>
      </div>
    </div>
  )
}

function Publicar({ ep, si, ei, update }) {
  const pub = ep.publicacao || { titulo: '', tiktok: '', instagram: '', twitter: '' }
  const yt = pub.youtube || { titulo: '', descricao: '' }
  const plataformas = [
    { key: 'tiktok', label: 'TikTok', tag: 'legenda + hashtags', hint: 'Cole na descrição. Use a função Séries/Playlist do TikTok para agrupar os capítulos.' },
    { key: 'instagram', label: 'Instagram Reels', tag: 'legenda + hashtags', hint: 'Cole na legenda. Hashtags podem ir no fim ou no 1º comentário.' },
    { key: 'twitter', label: 'Twitter / X', tag: 'até 280 caracteres', hint: 'Poucas hashtags. Anexe o vídeo nativo (não link).' },
  ]
  return (
    <div>
      <div className="panel">
        <h3>Título / gancho do episódio</h3>
        <p className="muted">Texto de capa (thumbnail). Cada plataforma tem seu campo próprio abaixo.</p>
        <PromptBlock
          label="Título"
          value={pub.titulo || ''}
          onChange={(v) => update((n) => { n.sagas[si].episodios[ei].publicacao.titulo = v })}
        />
      </div>
      {plataformas.map((p) => (
        <div className="panel" key={p.key}>
          <h3>{p.label}</h3>
          <PromptBlock
            label="Texto do post"
            tool={p.tag}
            value={pub[p.key] || ''}
            onChange={(v) => update((n) => { n.sagas[si].episodios[ei].publicacao[p.key] = v })}
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
          onChange={(v) => update((n) => {
            const ep2 = n.sagas[si].episodios[ei]
            ep2.publicacao.youtube = { ...(ep2.publicacao.youtube || {}), titulo: v }
          })}
          hint="Título é separado da descrição no YouTube e é o que mais importa na busca. Mantenha #Shorts no fim."
        />
        <PromptBlock
          label="Descrição"
          tool="descrição + hashtags"
          value={yt.descricao || ''}
          onChange={(v) => update((n) => {
            const ep2 = n.sagas[si].episodios[ei]
            ep2.publicacao.youtube = { ...(ep2.publicacao.youtube || {}), descricao: v }
          })}
          hint="As 3 primeiras hashtags aparecem acima do título. Agrupe a saga numa playlist."
        />
      </div>
    </div>
  )
}

//  Menu Redes Sociais: playbook de distribuição (espelha saga-fut/ESTRATEGIA-REDES.md) 
const REDES = [
  {
    nome: 'TikTok', emoji: '🎵', cor: '#25F4EE',
    papel: 'A única rede que ignora seu nº de seguidores e distribui por descoberta pura. Foco principal (70% da energia). Testa todo vídeo num lote de 200-500 pessoas nos primeiros 30-60min; se o sinal for forte, escala em ondas. Precisa de ~70% de completude pra viralizar.',
    cadencia: 'Prioridade 1 · ~1/dia',
    funciona: [
      'Gancho de texto nos 3 primeiros segundos + caricatura reconhecível já no 1º.',
      'Função Séries/Playlist pra agrupar os capítulos.',
      'Responder comentário com VÍDEO-resposta (a maior alavanca de alcance, e gera os próximos capítulos).',
      'SEO de busca: palavra-chave (jogador, clube) nos 1ºs 150 caracteres da legenda, no texto da tela (o OCR lê) e falada em voz alta (o app transcreve).',
    ],
    evita: [
      'Depender de a pessoa ter visto o ep1, cada vídeo fisga um estranho sozinho.',
      'Abertura lenta / cena de estabelecimento antes do gancho.',
    ],
  },
  {
    nome: 'YouTube Shorts', emoji: '▶️', cor: '#FF0033',
    papel: 'Reaproveita o mesmo vertical, custo quase zero. Rampa atrasada: pode ficar 24-72h em views baixas e só então deslanchar, e acumula por semanas. Nunca mate um Short cedo. O sinal nº 1 é o swipe-through (a pessoa não pular pro próximo).',
    cadencia: 'Prioridade 1-B · em paralelo',
    funciona: [
      'Título com palavra-chave forte (a partir de 2026 tem busca só-Shorts, o SEO pesa de verdade).',
      'Primeiro frame forte: ele vira a capa (thumbnail) no feed de Shorts.',
      'Compilado longo horizontal da saga (8-20min): puxa quem quer maratonar e cresce inscritos ~3x mais rápido.',
      'Agrupar a saga numa playlist.',
    ],
    evita: [
      'Perder tempo com #Shorts (hoje é irrelevante, o YouTube detecta o formato pela proporção).',
      'Matar um Short cedo, ele tem cauda longa e ressurge semanas depois.',
    ],
  },
  {
    nome: 'Instagram', emoji: '📸', cor: '#E1306C',
    papel: 'O mais lento do zero (Reels de conta nova raramente passa de ~200 views). Só depois de ter episódios validados. Tração real em 4-8 semanas com consistência.',
    cadencia: 'Prioridade 2 · ~3-5/semana',
    funciona: [
      'O sinal mais forte hoje é ENVIO por DM: gancho "manda pro teu amigo que torce pro rival".',
      'Otimizar pra saves e shares ("salva pra ver o próximo", "marca um culé").',
      'Áudio em alta pesa mais que hashtag (usar faixa em ascensão antes de saturar).',
      'Stories com enquete ("quem vence?") apontando pro Reel novo.',
    ],
    evita: [
      'Listão de hashtags: desde dez/2025 o teto é 5, e específicas batem genéricas.',
      'Esperar viralização de descoberta como no TikTok, aqui é mais lento.',
    ],
  },
  {
    nome: 'X / Twitter', emoji: '✖️', cor: '#71767b',
    papel: 'Amplificação em jogo AO VIVO e comunidade, não descoberta. Suporte, não canal primário. Desde nov/2025 o feed é rankeado pela Grok, que sufoca tom combativo/negativo.',
    cadencia: 'Suporte · durante partidas reais',
    funciona: [
      'Responder perfis grandes de futebol no minuto do lance (reply vale mais que like).',
      '1º tweet = gancho da HISTÓRIA. Vídeo NATIVO, subir direto no X.',
      'Quote-tweet de momentos reais amarrando o enredo fictício. Provocação leve e celebratória.',
    ],
    evita: [
      'Link no corpo do post: derruba o alcance 50-90% (se precisar, joga na 1ª reply).',
      '"Olha, fiz com IA", vende a ferramenta, não a história (é público da conta dev).',
    ],
  },
]

const PADROES = [
  ['Gancho de abertura em TODO vídeo', 'Texto grande sobre a 1ª cena nos ~3s iniciais (toggle 🪝 no Montar), no frame 1, máx. ~7 palavras. Duas fórmulas de maior retenção: chamada de identidade ("se você é do Barça, isso vai doer") ou lacuna de curiosidade (abre uma pergunta e não responde). Teste no mudo: se o 1º frame sozinho não passa tensão, falhou.'],
  ['Caricatura reconhecível no 1º segundo', 'Teste do scroll aplicado ao vídeo: em 0,5s o feed tem que entender "é futebol + quem é o jogador".'],
  ['A novela NUNCA menciona "IA"', 'A saga vende a HISTÓRIA, não a ferramenta. Os bastidores de "fiz com IA" são outro público (a conta dev). Não misturar.'],
  ['Capítulo que termina em suspense, postado perto de um jogo real', 'Um final em aberto (o "cliffhanger") sincronizado com uma partida de verdade cola a história no assunto do momento. O cliffhanger tem que ser NOMEADO, não vago. Bônus: o último frame conecta de volta ao primeiro (loop) e a completude passa de 100%. É a vantagem única do formato "capítulo no dia seguinte ao jogo".'],
]

const CADENCIA = [
  ['Episódio (a história em si)', '~1 por dia', 'TikTok + Shorts + Reels'],
  ['Capítulo que termina em suspense, perto de um jogo real', 'toda partida relevante', 'TikTok + X (ao vivo)'],
  ['Vídeo longo com a saga inteira', '1 por saga', 'YouTube'],
  ['Bastidores / enquete', '2-3 por semana', 'Instagram Stories'],
]

const CHECKLIST = [
  'Gancho no frame 1 (chamada-de-identidade ou lacuna-de-curiosidade) e legível no mudo?',
  'Caricatura reconhecível aparece no 1º segundo?',
  'Legenda/descrição sem NENHUMA menção a "IA"?',
  'Palavra-chave (jogador/clube) na legenda, no texto da tela E falada (SEO de busca)?',
  'Cliffhanger NOMEADO no fim (não vago) e sem tela preta morta (loop preservado)?',
  'Dá pra postar um capítulo que termina em suspense perto de um jogo real desta semana?',
  'Episódio adicionado à Playlist/Série da saga (TikTok e YouTube)?',
  '"Parte X" (aberto) no título e nas legendas? #sagafut como 1ª hashtag?',
]

function RedesView() {
  return (
    <div>
      <div className="panel">
        <h3>📱 Redes Sociais: estratégia e padrões da casa</h3>
        <p className="muted" style={{ marginBottom: 8 }}>
          Diagnóstico da 1ª saga (dia 1): no TikTok, retenção média de <strong>3-4s</strong> em
          vídeos de 40-70s e completude <strong>0-3%</strong>, quase ninguém passa do 3º segundo.
          O gargalo não é distribuição: é o <strong>gancho de abertura</strong>. Retenção é a
          métrica-mãe; view é consequência. Playbook completo em <code>saga-fut/ESTRATEGIA-REDES.md</code>.
        </p>
        <p className="muted" style={{ marginBottom: 0, fontSize: 13 }}>
          <strong>Hierarquia de sinais (TikTok, Shorts e Reels, do mais forte ao mais fraco):</strong> tempo
          assistido &gt; completude &gt; re-watch/loop &gt; compartilhamento e save &gt; comentário &gt; like.
          Like é o mais fraco desde 2025. Otimize cada vídeo pra tempo assistido e loop, nunca pra curtida.
        </p>
      </div>

      <div className="panel">
        <h3>Os 4 padrões inegociáveis <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}>(valem para vídeos antigos e novos)</span></h3>
        <ol style={{ margin: '6px 0 0', paddingLeft: 20, display: 'grid', gap: 8 }}>
          {PADROES.map(([t, d], i) => (
            <li key={i}><strong>{t}.</strong> <span className="muted">{d}</span></li>
          ))}
        </ol>
      </div>

      <div className="panel">
        <h3>Cadência-alvo <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}>(mais agressiva que 1/dia, sem queimar produção)</span></h3>
        <table className="tools-table" style={{ width: '100%' }}>
          <thead><tr><th>Peça</th><th>Frequência</th><th>Onde</th></tr></thead>
          <tbody>
            {CADENCIA.map(([p, f, o], i) => (
              <tr key={i}><td>{p}</td><td className="muted">{f}</td><td className="muted">{o}</td></tr>
            ))}
          </tbody>
        </table>
        <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
          O "post diário" morreu como meta: consistência com boa retenção bate volume bruto. O que funciona é
          <strong> gravar a saga inteira (3 a 5 episódios) ANTES de lançar a Parte 1</strong> e soltar de 24 a 72h
          entre capítulos. Regra: acerte o gancho <strong>antes</strong> de aumentar a frequência. Postar mais vídeo
          com abertura fraca só desperdiça as entregas que o algoritmo te dá.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
        {REDES.map((r) => (
          <div className="panel" key={r.nome} style={{ borderTop: `3px solid ${r.cor}`, margin: 0 }}>
            <h3 style={{ margin: 0 }}>{r.emoji} {r.nome}</h3>
            <p className="muted" style={{ margin: '4px 0 10px' }}>{r.papel}</p>
            <div style={{ fontSize: 12, marginBottom: 10 }}>
              <span style={{ border: `1px solid ${r.cor}`, color: r.cor, borderRadius: 6, padding: '2px 8px' }}>⏱ {r.cadencia}</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#3fb950', marginBottom: 4 }}>✓ Funciona</div>
            <ul style={{ margin: '0 0 10px', paddingLeft: 18, display: 'grid', gap: 4 }}>
              {r.funciona.map((f, i) => <li key={i} className="muted" style={{ fontSize: 13 }}>{f}</li>)}
            </ul>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#f85149', marginBottom: 4 }}>✕ Evita</div>
            <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>
              {r.evita.map((f, i) => <li key={i} className="muted" style={{ fontSize: 13 }}>{f}</li>)}
            </ul>
          </div>
        ))}
      </div>

      <div className="panel" style={{ marginTop: 14 }}>
        <h3>✅ Checklist antes de postar</h3>
        <ul style={{ margin: '6px 0 0', paddingLeft: 20, display: 'grid', gap: 6 }}>
          {CHECKLIST.map((c, i) => <li key={i} className="muted">{c}</li>)}
        </ul>
      </div>

      <div className="panel">
        <h3>⚡ Velocidade: carona no jogo real (a maior alavanca que falta)</h3>
        <p className="muted" style={{ margin: '0 0 8px' }}>
          O 442oons (4,5M inscritos) provou o nicho com <strong>velocidade sobre perfeição</strong>: cartoon de
          um dia pro outro reagindo à rodada. A vantagem do SagaFut é juntar três coisas que bombam e quase
          ninguém combina: animação de futebol + micro-drama serial + carona no jogo real.
        </p>
        <ul style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 6 }}>
          <li className="muted"><strong>Banco de cenas/personagens pré-renderizado</strong> pra montar um episódio-reação em horas. Janela de ouro: 0 a 2h após o assunto estourar.</li>
          <li className="muted"><strong>Calendário preso ao Barça:</strong> Clásico, Champions, janela de transferência e Copa 2026 (torneios fizeram o 442oons saltar de 900k pra 1M). Um especial por marco.</li>
          <li className="muted"><strong>Formato-relâmpago de 15-20s</strong> de reação a notícia quente, separado da novela principal.</li>
        </ul>
      </div>

      <div className="panel">
        <h3>⚠️ Risco de monetização (política de IA do YouTube)</h3>
        <p className="muted" style={{ margin: 0 }}>
          Em 15/07/2025 o YouTube trocou "conteúdo repetitivo" por <strong>"conteúdo inautêntico"</strong> e já
          encerrou canais 100% automatizados. IA NÃO é banida: a linha é <strong>IA como aumento vs. IA como
          substituição</strong> da criatividade humana. O SagaFut está do lado seguro (roteiro autoral, curadoria,
          olhar de torcedor, personagens próprios), mas precisa manter isso vivo e nunca virar pipeline cego.
          Reforça a regra dos dois públicos: a novela vende a história, o making-of "com IA" é a conta dev.
        </p>
      </div>

      <div className="panel">
        <h3>🔁 Retrofit dos vídeos antigos</h3>
        <p className="muted" style={{ margin: 0 }}>
          Os 6 primeiros (Gigante do Norte) foram publicados SEM gancho de abertura. Antes de
          julgar os números: remontar cada um com o toggle 🪝, re-exportar e repostar. Só então
          medir a retenção antes/depois: é o teste A/B que prova se o gancho funciona.
        </p>
      </div>
    </div>
  )
}

function EpView({ dados, si, ei, update, existing, sub, setSub, bust, jobs, startGen }) {
  const saga = dados.sagas[si]
  const ep = saga.episodios[ei]
  const byId = Object.fromEntries(dados.personagens.map((p) => [p.id, p]))
  const [confirm, setConfirm] = useState(null)
  const setEp = (campo, v) => update((n) => { n.sagas[si].episodios[ei][campo] = v })

  function novaCena() {
    const novo = (ep.cenas.length ? Math.max(...ep.cenas.map((c) => c.numero)) : 0) + 1
    update((n) => { n.sagas[si].episodios[ei].cenas.push(blankCena(ep.id, novo)) })
  }
  function duplicarCena(i) {
    const novo = Math.max(...ep.cenas.map((c) => c.numero)) + 1
    const copia = dupCena(ep.cenas[i], ep.id, novo)
    update((n) => { n.sagas[si].episodios[ei].cenas.splice(i + 1, 0, copia) })
  }
  function excluirCena(i) {
    const c = ep.cenas[i]
    setConfirm({
      titulo: 'Excluir cena?',
      mensagem: `A cena ${c.numero} "${c.titulo}" sai do episódio. Os arquivos no disco continuam. Salve depois para efetivar.`,
      confirmar: 'Excluir', perigo: true,
      onConfirm: () => { setConfirm(null); update((n) => { n.sagas[si].episodios[ei].cenas.splice(i, 1) }) },
    })
  }

  return (
    <div>
      {confirm && <ConfirmModal {...confirm} onCancel={() => setConfirm(null)} />}
      <div className="panel">
        <EditField label="Título do episódio" value={ep.titulo} onChange={(v) => setEp('titulo', v)} />
        <EditField label="Contexto real (fato que a saga usa)" value={ep.contextoReal} onChange={(v) => setEp('contextoReal', v)} textarea />
        <div className="edit-row">
          <EditField label="Fim em suspense (o gancho que fecha o episódio e faz querer o próximo)" value={ep.cliffhanger} onChange={(v) => setEp('cliffhanger', v)} textarea />
          <EditField label="Publicar (nota interna)" value={ep.publicar} onChange={(v) => setEp('publicar', v)} textarea />
        </div>
      </div>

      <div className="subtabs">
        <button className={'subtab' + (sub === 'cenas' ? ' active' : '')} onClick={() => setSub('cenas')}>🎬 Cenas</button>
        <button className={'subtab' + (sub === 'previa' ? ' active' : '')} onClick={() => setSub('previa')}>🎞 Prévia</button>
        <button className={'subtab' + (sub === 'audio' ? ' active' : '')} onClick={() => setSub('audio')}>🎙 Narração</button>
        <button className={'subtab' + (sub === 'montar' ? ' active' : '')} onClick={() => setSub('montar')}>🎬 Montar</button>
        <button className={'subtab' + (sub === 'publicar' ? ' active' : '')} onClick={() => setSub('publicar')}>📢 Publicar</button>
      </div>

      {sub === 'previa' && <Previa key={ep.id} ep={ep} existing={existing} />}
      {sub === 'montar' && <Montar key={ep.id} ep={ep} update={update} si={si} ei={ei} />}
      {sub === 'publicar' && <Publicar key={ep.id} ep={ep} si={si} ei={ei} update={update} />}

      {sub === 'audio' && (
        <div className="panel">
          <h3>Narração completa do episódio</h3>
          <p className="muted">{dados.audio.narradorVoz}, {saga.narradorTom}</p>
          <PromptBlock
            label="Bloco completo"
            tool="ElevenLabs"
            value={ep.narracaoCompleta}
            onChange={(v) => update((n) => { n.sagas[si].episodios[ei].narracaoCompleta = v })}
          />
        </div>
      )}

      {sub === 'cenas' && (
        <>
          <div className="section-head">
            <h3 className="section-title">Cenas</h3>
            <button className="mini-btn" onClick={novaCena}>＋ Nova cena</button>
          </div>
          {ep.cenas.map((cena, i) => (
        <div className="panel cena" key={cena.numero}>
          <div className="cena-head">
            <h3>CENA {cena.numero}, {cena.titulo}</h3>
            <div className="row-actions">
              <span className="tempo">{cena.tempo}</span>
              <button className="mini-btn" title="Duplicar cena" onClick={() => duplicarCena(i)}>⧉</button>
              <button className="mini-btn danger" title="Excluir cena" onClick={() => excluirCena(i)}>🗑</button>
            </div>
          </div>
          <div className="edit-row">
            <EditField label="Título da cena" value={cena.titulo} onChange={(v) => update((n) => { n.sagas[si].episodios[ei].cenas[i].titulo = v })} />
            <EditField label="Tempo" value={cena.tempo} onChange={(v) => update((n) => { n.sagas[si].episodios[ei].cenas[i].tempo = v })} />
          </div>
          <div className="cast-label">Quem aparece nesta cena <span className="muted">(clique pra alternar)</span></div>
          <CenaCast
            elencoIds={saga.elenco}
            byId={byId}
            personagens={cena.personagens}
            naoAparecem={cena.naoAparecem}
            onChange={(p, n) => update((nv) => {
              nv.sagas[si].episodios[ei].cenas[i].personagens = p
              nv.sagas[si].episodios[ei].cenas[i].naoAparecem = n
            })}
          />

          <div className="cena-cols">
            <div className="cena-media">
              <div className="media-slot">
                <div className="media-head"><span>Imagem</span><StatusPill value={cena.statusImagem} onChange={(v) => update((n) => { n.sagas[si].episodios[ei].cenas[i].statusImagem = v })} /></div>
                <Media existing={existing} src={cena.imagem} kind="img" bust={bust} />
                <FilePath path={cena.imagem} />
              </div>
              <div className="media-slot">
                <div className="media-head"><span>Vídeo</span><StatusPill value={cena.statusVideo} onChange={(v) => update((n) => { n.sagas[si].episodios[ei].cenas[i].statusVideo = v })} /></div>
                <Media existing={existing} src={cena.video} kind="video" />
                <FilePath path={cena.video} />
              </div>
            </div>

            <div className="cena-prompts">
              <PromptBlock
                label="Narração"
                tool="ElevenLabs (por cena)"
                value={cena.narracao}
                onChange={(v) => update((n) => { n.sagas[si].episodios[ei].cenas[i].narracao = v })}
              />
              {(() => {
                const o = orcamentoNarracao(cena.narracao)
                const cor = o.nivel === 'alto' ? '#f85149' : o.nivel === 'medio' ? '#d29922' : '#3fb950'
                const icon = o.nivel === 'alto' ? '⛔' : o.nivel === 'medio' ? '⚠' : '✓'
                const msg = o.nivel === 'ok'
                  ? 'cabe no clipe de 10s, sem acelerar'
                  : o.nivel === 'medio'
                    ? `passa dos 10s: a voz acelera. Corte ~${o.cortar} palavra(s) pra encaixar natural`
                    : `bem acima de 10s: acelera ao máximo e ainda congela quadro. Corte ~${o.cortar} palavra(s) ou divida em 2 clipes`
                return (
                  <div style={{ margin: '2px 0 10px', padding: '4px 8px', borderRadius: 8, background: cor + '22', border: '1px solid ' + cor + '66', fontSize: 12, color: cor }}>
                    {icon} ≈ {o.seg}s · {o.palavras} palavras (meta ~{o.alvoPalavras} pra 10s) · {msg}
                  </div>
                )
              })()}
              <PromptBlock
                label="Prompt da imagem"
                tool="ChatGPT Images"
                value={cena.promptImagem}
                onChange={(v) => update((n) => { n.sagas[si].episodios[ei].cenas[i].promptImagem = v })}
                copyText={`${saga.stylePrefix}, ${cena.promptImagem}\n\n${dados.projeto.promptRules}`}
                hint="Copia com o prefixo de estilo + as regras da casa (negativos). Anexe as fichas dos personagens marcados com ✓."
              />
              <div className="gen-row">
                <GenerateButton
                  payload={{ tipo: 'cena', sagaId: saga.id, epId: ep.id, cenaNumero: cena.numero }}
                  targetPath={cena.imagem}
                  existing={existing}
                  jobs={jobs}
                  startGen={startGen}
                  label="⚡ Gerar imagem"
                  refInfo={(() => {
                    const refs = cena.personagens.filter((id) => existing[byId[id]?.imagem]).map((id) => byId[id]?.nome || id)
                    return refs.length
                      ? `Referências anexadas: ${refs.join(', ')}.`
                      : '⚠ Nenhuma ficha gerada ainda, vai gerar sem referência (personagem pode variar). Gere as fichas primeiro.'
                  })()}
                />
                <span className="gen-hint muted">as fichas ✓ da cena vão como referência</span>
              </div>
              {cena.promptImagemEdit && (
                <PromptBlock
                  label="✏️ Corrigir imagem em cima (sem regerar do zero)"
                  tool="ChatGPT / Nano Banana"
                  value={cena.promptImagemEdit}
                  onChange={(v) => update((n) => { n.sagas[si].episodios[ei].cenas[i].promptImagemEdit = v })}
                  hint="Anexe a imagem ATUAL da cena e mande este prompt de edição, preserva o resto e muda só o apontado."
                />
              )}
              <PromptBlock
                label="Prompt do vídeo"
                tool="Grok Imagine"
                value={cena.promptVideo}
                onChange={(v) => update((n) => { n.sagas[si].episodios[ei].cenas[i].promptVideo = v })}
                copyText={`${cena.promptVideo}\n${cena.promptAudio}`}
                hint="Copia já com o bloco de ÁUDIO junto. Suba a imagem da cena no modo image-to-video."
              />
              <PromptBlock
                label="Bloco de áudio (ambiência)"
                tool="Grok Imagine"
                value={cena.promptAudio}
                onChange={(v) => update((n) => { n.sagas[si].episodios[ei].cenas[i].promptAudio = v })}
              />
              <div className="montagem">🎬 <strong>Montagem:</strong> {cena.montagem}</div>
            </div>
          </div>
        </div>
      ))}
        </>
      )}
    </div>
  )
}

// ---------- app ----------

// --- rota persistida na URL (hash) para sobreviver a refresh ---
function parseHash() {
  const h = window.location.hash.replace(/^#\/?/, '')
  const p = h.split('/')
  if (p[0] === 'melhorias') return { page: 'melhorias' }
  if (p[0] === 'saga' && p[1] != null) return { page: 'saga', si: Number(p[1]) }
  if (p[0] === 'ep' && p[1] != null && p[2] != null) return { page: 'ep', si: Number(p[1]), ei: Number(p[2]), sub: p[3] || 'cenas' }
  return { page: 'home' }
}
function routeToHash(r) {
  if (r.page === 'melhorias') return '#/melhorias'
  if (r.page === 'saga') return `#/saga/${r.si}`
  if (r.page === 'ep') return `#/ep/${r.si}/${r.ei}/${r.sub || 'cenas'}`
  return '#/home'
}

export default function App() {
  const [dados, setDados] = useState(null)
  const [route, setRouteState] = useState(parseHash)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [existing, setExisting] = useState({})
  const [progress, setProgress] = useState(null)
  const [bust, setBust] = useState(0)

  // após gerar uma imagem: marca como existente, força reload (cache-bust) e atualiza contadores
  const onGenerated = (path) => {
    if (path) setExisting((prev) => ({ ...prev, [path]: true }))
    setBust(Date.now())
    fetch('/api/progress').then((r) => r.json()).then(setProgress).catch(() => {})
  }

  // fila de geração em SEGUNDO PLANO: até MAX_PARALLEL rodando ao mesmo tempo
  const MAX_PARALLEL = 4
  const [jobs, setJobs] = useState([]) // {id, payload, targetPath, label, status:'queued'|'running'|'done'|'error', err}
  const jobSeq = useRef(0)
  const dispatched = useRef(new Set())

  const startGen = (payload, targetPath, label) => {
    setJobs((js) => js.some((j) => j.targetPath === targetPath && (j.status === 'queued' || j.status === 'running'))
      ? js // já está na fila/rodando, não duplica
      : [...js, { id: ++jobSeq.current, payload, targetPath, label, status: 'queued' }])
  }
  const dismissJob = (id) => setJobs((js) => js.filter((j) => j.id !== id))

  async function runJob(job) {
    try {
      const r = await fetch('/api/generate/imagem', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(job.payload),
      }).then((r) => r.json())
      if (r.error) { setJobs((js) => js.map((j) => (j.id === job.id ? { ...j, status: 'error', err: r.error } : j))); return }
      onGenerated(r.path || job.targetPath)
      setJobs((js) => js.map((j) => (j.id === job.id ? { ...j, status: 'done' } : j)))
      setTimeout(() => setJobs((js) => js.filter((j) => !(j.id === job.id && j.status === 'done'))), 3000)
    } catch (e) {
      setJobs((js) => js.map((j) => (j.id === job.id ? { ...j, status: 'error', err: e.message } : j)))
    }
  }

  // bomba da fila: mantém até MAX_PARALLEL rodando; dispara os próximos da fila
  useEffect(() => {
    const rodando = jobs.filter((j) => j.status === 'running').length
    const livres = MAX_PARALLEL - rodando
    if (livres <= 0) return
    const proximos = jobs.filter((j) => j.status === 'queued' && !dispatched.current.has(j.id)).slice(0, livres)
    if (!proximos.length) return
    proximos.forEach((j) => dispatched.current.add(j.id))
    setJobs((js) => js.map((j) => (proximos.some((p) => p.id === j.id) ? { ...j, status: 'running' } : j)))
    proximos.forEach(runJob)
  }, [jobs])

  // grava a rota na URL sempre que muda
  const setRoute = (r) => setRouteState(r)
  useEffect(() => {
    const h = routeToHash(route)
    if (window.location.hash !== h) window.location.hash = h
  }, [route])
  // sincroniza com voltar/avançar do navegador
  useEffect(() => {
    const onHash = () => setRouteState(parseHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    getDados()
      .then((n) => {
        setDados(n)
        const paths = [
          ...n.personagens.map((p) => p.imagem),
          ...n.sagas.flatMap((s) => s.episodios.flatMap((e) => e.cenas.flatMap((c) => [c.imagem, c.video]))),
        ]
        return fetch('/api/media-exists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paths }),
        }).then((r) => r.json())
      })
      .then(setExisting)
      .catch((e) => setError(e.message))
    fetch('/api/progress').then((r) => r.json()).then(setProgress).catch(() => {})
  }, [])

  const update = (mutator) => {
    setDados((prev) => {
      const next = structuredClone(prev)
      mutator(next)
      return next
    })
    setDirty(true)
  }

  // cria uma saga em branco (template) e navega para ela
  const onNewSaga = () => {
    const saga = blankSaga(dados.sagas.map((s) => s.id))
    const idx = dados.sagas.length
    update((n) => { n.sagas.push(saga) })
    setRoute({ page: 'saga', si: idx })
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      await saveDados(dados)
      setDirty(false)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  // avisa antes de sair com alterações não salvas + atalho ⌘/Ctrl+S (via refs p/ evitar closure velho)
  const dirtyRef = useRef(dirty); dirtyRef.current = dirty
  const saveRef = useRef(() => {}); saveRef.current = () => { if (dirty && !saving) save() }
  useEffect(() => {
    const onUnload = (e) => { if (dirtyRef.current) { e.preventDefault(); e.returnValue = '' } }
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 's' || e.key === 'S')) { e.preventDefault(); saveRef.current() }
    }
    window.addEventListener('beforeunload', onUnload)
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('beforeunload', onUnload); window.removeEventListener('keydown', onKey) }
  }, [])

  if (error && !dados) return <div className="boot-error">Erro: {error}</div>
  if (!dados) return <div className="boot-loading">Carregando…</div>

  // valida a rota vinda da URL contra os dados carregados (evita índice inexistente)
  const saga = route.si != null ? dados.sagas[route.si] : null
  const ep = saga && route.ei != null ? saga.episodios[route.ei] : null
  if ((route.page === 'saga' && !saga) || (route.page === 'ep' && !ep)) {
    return <div className="boot-loading">Episódio não encontrado. <a href="#/home" style={{ color: 'var(--gold)' }}>Voltar ao início</a></div>
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand" onClick={() => setRoute({ page: 'home' })} style={{ cursor: 'pointer' }}>
          <div className="brand-title">⚽ SagaFut Studio</div>
          <div className="brand-sub">Universo de sagas de futebol</div>
        </div>
        <nav className="saga-tree">
          <button className={'nav-btn' + (route.page === 'home' ? ' active' : '')} onClick={() => setRoute({ page: 'home' })}>
            🏠 Todas as sagas
          </button>
          {dados.sagas.map((s, si) => (
            <div key={s.id} className="tree-saga">
              <button
                className={'nav-btn' + (route.page === 'saga' && route.si === si ? ' active' : '')}
                onClick={() => setRoute({ page: 'saga', si })}
              >
                📺 {s.titulo}
              </button>
              {(route.si === si) && s.episodios.map((e, ei) => (
                <button
                  key={e.id}
                  className={'nav-btn nav-ep' + (route.page === 'ep' && route.ei === ei ? ' active' : '')}
                  onClick={() => setRoute({ page: 'ep', si, ei })}
                >
                  {epProgress(e, progress).done ? '✓ ' : ''}{e.id.toUpperCase()}
                </button>
              ))}
            </div>
          ))}
          <button className={'nav-btn' + (route.page === 'redes' ? ' active' : '')} onClick={() => setRoute({ page: 'redes' })}>
            📱 Redes Sociais
          </button>
          <button className={'nav-btn' + (route.page === 'melhorias' ? ' active' : '')} onClick={() => setRoute({ page: 'melhorias' })}>
            🛠 Melhorias
          </button>
        </nav>
        <div className="sidebar-foot muted">⚡ Imagens: geração via Codex<br />(gpt-image-2 · ChatGPT Plus) ✓</div>
      </aside>

      <main className="content">
        <header className="topbar">
          <div className="crumbs">
            <span className="crumb" onClick={() => setRoute({ page: 'home' })}>Sagas</span>
            {route.page === 'redes' && <><span className="crumb-sep">›</span><span className="crumb-current">Redes Sociais</span></>}
            {route.page === 'melhorias' && <><span className="crumb-sep">›</span><span className="crumb-current">Melhorias</span></>}
            {saga && <><span className="crumb-sep">›</span><span className="crumb" onClick={() => setRoute({ page: 'saga', si: route.si })}>{saga.titulo}</span></>}
            {ep && <><span className="crumb-sep">›</span><span className="crumb-current">{ep.id.toUpperCase()}, {ep.titulo}</span></>}
          </div>
          <div className="topbar-actions">
            {error && <span className="save-error">⚠ {error}</span>}
            {dirty ? (
              <>
                <span className="dirty-dot" title="Há alterações não salvas">● não salvo</span>
                <button className="save-btn" onClick={save} disabled={saving}>
                  {saving ? 'Salvando…' : '💾 Salvar'} <kbd>⌘S</kbd>
                </button>
              </>
            ) : <span className="saved-ok muted">tudo salvo ✓</span>}
          </div>
        </header>

        {route.page === 'home' && <Home dados={dados} existing={existing} progress={progress} goSaga={(si) => setRoute({ page: 'saga', si })} onEditRules={(v) => update((n) => { n.projeto.promptRules = v })} bust={bust} onNewSaga={onNewSaga} />}
        {route.page === 'melhorias' && <Melhorias dados={dados} update={update} />}
        {route.page === 'redes' && <RedesView />}
        {route.page === 'saga' && <SagaView dados={dados} si={route.si} update={update} existing={existing} progress={progress} goEp={(si, ei) => setRoute({ page: 'ep', si, ei })} bust={bust} jobs={jobs} startGen={startGen} goSaga={(si) => setRoute({ page: 'saga', si })} goHome={() => setRoute({ page: 'home' })} />}
        {route.page === 'ep' && <EpView dados={dados} si={route.si} ei={route.ei} update={update} existing={existing} sub={route.sub || 'cenas'} setSub={(s) => setRoute({ page: 'ep', si: route.si, ei: route.ei, sub: s })} bust={bust} jobs={jobs} startGen={startGen} />}
      </main>

      {jobs.length > 0 && (
        <div className="gen-tray" role="status">
          <div className="gen-tray-head">
            {(() => {
              const c = (s) => jobs.filter((j) => j.status === s).length
              const parts = []
              if (c('running')) parts.push(`${c('running')} gerando`)
              if (c('queued')) parts.push(`${c('queued')} na fila`)
              if (c('done')) parts.push(`${c('done')} ok`)
              if (c('error')) parts.push(`${c('error')} erro`)
              return <span>⚡ {parts.join(' · ') || 'geração'}</span>
            })()}
          </div>
          <div className="gen-tray-list">
            {jobs.map((j) => (
              <div key={j.id} className={'gen-tray-row ' + j.status}>
                <span className="gen-tray-ic">
                  {j.status === 'running' ? <span className="gen-spinner" /> : j.status === 'queued' ? '⏳' : j.status === 'done' ? '✓' : '⚠'}
                </span>
                <span className="gen-tray-name">
                  {j.targetPath.split('/').pop()}
                  {j.status === 'error' && <span className="gen-tray-err">, {j.err}</span>}
                </span>
                {j.status === 'error' && <button className="toast-x" onClick={() => dismissJob(j.id)}>✕</button>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
