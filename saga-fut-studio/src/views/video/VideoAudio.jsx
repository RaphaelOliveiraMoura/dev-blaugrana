import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Icon } from '../../components/index.js'
import { getVideoAudio } from '../../api/video.js'

// A LINHA DO TEMPO DO SOM — o player em cima, as faixas embaixo, como um editor de vídeo.
//
// POR QUE EXISTE (14/08/2026): o áudio era a única camada do vídeo sem NENHUMA representação na
// tela. Cenário, sprite e encenação se conferem olhando (Assets, Animatic, folha de revisão); som
// só se conferia assistindo o MP4 pronto, de fone, prestando atenção.
//
// O defeito que provocou esta tela: no `ferran-amor` o personagem chegava andando com som de passo,
// PARAVA, e o passo continuava por 3,6s. Sobreviveu ao render, à validação e à revisão, porque erro
// de som não tem sintoma visual e ninguém lê "10,5s de arquivo" num roteiro e imagina isso.
//
// Três decisões que fazem a tela valer o que custou:
//
//   1. O DADO É O MESMO QUE VAI PRO MUX. Vem da `montarCena`, nos mesmos segundos. Não é uma
//      estimativa do que o áudio vai ser; é o áudio. Uma tela que aproxima seria pior que nenhuma,
//      porque daria confiança sem base.
//
//   2. O BLOCO MOSTRA O ARQUIVO INTEIRO, com a parte cortada em listras. É o que responde a
//      pergunta que dá o defeito: "esse som ia até onde, se ninguém tivesse cortado?" Barra que só
//      mostra o trecho final esconde justamente a desproporção.
//
//   3. O PLAYER MANDA NO CURSOR, e o cursor manda no player. Ler a linha do tempo diz QUANDO cada
//      som toca; ouvir o vídeo diz SE está certo. Separados, é preciso contar segundos de cabeça
//      pra ligar um ao outro — que é exatamente o esforço que faz ninguém conferir. Aqui o bloco
//      ativo acende no instante em que o som entra, e clicar na faixa leva o vídeo pra lá.

const COR = {
  ambiente: 'var(--blue)',
  passos: 'var(--ok)',
  sfx: 'var(--gold)',
  voz: 'var(--garnet-hi)',
}

const pct = (v, dur) => `${Math.max(0, Math.min(100, (v / dur) * 100))}%`

function Regua({ dur, shots }) {
  // uma marca a cada 1s, número a cada 5s: mais que isso vira sujeira num vídeo de 40s
  const marcas = []
  for (let s = 0; s <= Math.floor(dur); s++) marcas.push(s)
  return (
    <div className="aud-regua">
      {marcas.map((s) => (
        <span key={s} className={'aud-tick' + (s % 5 === 0 ? ' forte' : '')} style={{ left: pct(s, dur) }}>
          {s % 5 === 0 ? <b>{s}s</b> : null}
        </span>
      ))}
      {shots.map((sh) => (
        <span key={sh.i} className="aud-shot-marca" style={{ left: pct(sh.ini, dur) }} />
      ))}
    </div>
  )
}

function Bloco({ ini, fim, iniArquivo, fimArquivo, dur, cor, children, titulo, alerta, pista = 0, ativo }) {
  // a faixa em listras é o que o arquivo TERIA tocado e foi cortado fora
  const sobra = fimArquivo != null && fimArquivo > fim + 0.05
  const linha = { top: pista * 26 + 2, height: 22 }
  return (
    <>
      {sobra && (
        <div className="aud-bloco aud-sobra" title={`o arquivo tem ${(fimArquivo - iniArquivo).toFixed(1)}s; ${(fimArquivo - fim).toFixed(1)}s foram cortados`}
          style={{ ...linha, left: pct(fim, dur), width: `${Math.min(((fimArquivo - fim) / dur) * 100, 100 - (fim / dur) * 100)}%` }} />
      )}
      <div className={'aud-bloco' + (alerta ? ' alerta' : '') + (ativo ? ' tocando' : '')} title={titulo}
        style={{ ...linha, left: pct(ini, dur), width: `${Math.max(0.4, ((fim - ini) / dur) * 100)}%`, '--cor': cor }}>
        <span className="aud-rotulo">{children}</span>
      </div>
    </>
  )
}

// Cada faixa são DOIS filhos diretos da grade (nome + pista), porque a grade é um grid de duas
// colunas: é o que faz o cursor de reprodução cair no mesmo x em todas as faixas sem ninguém medir
// px. Antes cada faixa era um flex próprio, e alinhar o cursor a elas dependia de repetir a largura
// do rótulo em três lugares.
function Faixa({ nome, children, vazia, pistas = 1 }) {
  return (
    <>
      <span className="aud-faixa-nome">{nome}</span>
      <div className="aud-faixa-pista" style={{ minHeight: 26 * pistas }}>
        {vazia ? <span className="aud-vazio">nada nesta faixa</span> : children}
      </div>
    </>
  )
}

// SONS QUE SE SOBREPÕEM VÃO PRA PISTAS DIFERENTES, como em qualquer editor de vídeo. Numa pista só,
// a buzina cai em cima da torcida e os dois rótulos viram um borrão ilegível — que é exatamente o
// momento em que esta tela mais precisa ser lida, porque som empilhado é onde a mixagem some.
// Guloso pela ordem de entrada: cada bloco desce até achar uma pista livre naquele instante.
function emPistas(itens, ini = (x) => x.at, fim = (x) => x.fim) {
  const pistas = []
  const out = itens.map((it) => {
    let p = pistas.findIndex((livreEm) => ini(it) >= livreEm - 0.02)
    if (p < 0) { p = pistas.length; pistas.push(0) }
    pistas[p] = fim(it)
    return { it, p }
  })
  return { blocos: out, n: Math.max(1, pistas.length) }
}

export function VideoAudio({ videoId, bust }) {
  const [dado, setDado] = useState(null)
  const [erro, setErro] = useState(null)
  const [t, setT] = useState(0)              // onde o player está, em segundos
  const [tocando, setTocando] = useState(false)
  const [semVideo, setSemVideo] = useState(false)
  const vid = useRef(null)
  const pistaRef = useRef(null)

  useEffect(() => {
    setDado(null); setErro(null); setT(0); setSemVideo(false)
    getVideoAudio(videoId).then(setDado).catch((e) => setErro(e.message))
  }, [videoId, bust])

  // O CURSOR ANDA POR requestAnimationFrame, NÃO por `timeupdate`. O evento do <video> dispara umas
  // 4x por segundo, e nessa taxa o cursor anda aos saltos de 250ms — o suficiente pra ele parecer
  // dessincronizado do som justo quando se está tentando julgar sincronia. Só roda enquanto toca.
  useEffect(() => {
    if (!tocando) return
    let vivo = true
    const passo = () => {
      if (!vivo) return
      if (vid.current) setT(vid.current.currentTime)
      requestAnimationFrame(passo)
    }
    requestAnimationFrame(passo)
    return () => { vivo = false }
  }, [tocando])

  // clique/arraste na faixa leva o vídeo pra aquele instante
  const irPara = useCallback((ev) => {
    if (!dado || !pistaRef.current) return
    const r = pistaRef.current.getBoundingClientRect()
    const s = Math.max(0, Math.min(dado.durSec, ((ev.clientX - r.left) / r.width) * dado.durSec))
    setT(s)
    if (vid.current) vid.current.currentTime = s
  }, [dado])

  // O SILÊNCIO É UM DADO. A referência da casa (Comentarista Edu) não tem 0,2s de vácuo, e o buraco
  // de som é invisível numa lista: só aparece quando se olha a linha inteira de uma vez. Aqui ele
  // vira uma faixa própria, do tamanho exato do buraco.
  const buracos = useMemo(() => {
    if (!dado || dado.ambiente) return []          // com leito por baixo, não existe silêncio
    const janelas = [
      ...(dado.sfx || []).map((s) => [s.at, s.fim]),
      ...(dado.falas || []).filter((f) => f.fim).map((f) => [f.at, f.fim]),
    ].sort((a, b) => a[0] - b[0])
    const out = []; let cursor = 0
    for (const [a, b] of janelas) {
      if (a - cursor > 1.2) out.push([cursor, a])
      cursor = Math.max(cursor, b)
    }
    if (dado.durSec - cursor > 1.2) out.push([cursor, dado.durSec])
    return out
  }, [dado])

  if (erro) return <p className="render-msg no"><Icon name="alerta" size={13} /> {erro}</p>
  if (!dado) return <p className="hint">Montando a linha do tempo…</p>
  if (dado.semAudio) return <div className="panel"><p className="hint">Este vídeo está marcado como <code>semAudio</code>: sai mudo, e o mux nem roda.</p></div>

  const { durSec: dur, shots, sfx, falas, ambiente } = dado
  const passos = sfx.filter((s) => s.derivado)
  const efeitos = sfx.filter((s) => !s.derivado)
  // o som de LEITO ocupa a pista até o fim do ARQUIVO, não do corte: a faixa em listras é desenho
  // com a mesma largura, e ignorá-la aqui faria o próximo bloco cair por cima dela
  const pSons = emPistas(efeitos, (s) => s.at, (s) => (s.continuo ? s.at + s.seg : s.fim))
  const pPassos = emPistas(passos, (s) => s.at, (s) => s.at + s.seg)
  const pVoz = emPistas(falas, (f) => f.at, (f) => f.fim ?? f.at + 1)
  const no = (a, b) => t >= a && t < b

  // O QUE ESTÁ TOCANDO NESTE INSTANTE, em texto. O bloco aceso na faixa responde "onde"; esta lista
  // responde "o quê" sem obrigar a caçar a cor certa enquanto o vídeo corre.
  const agora = [
    ...(ambiente ? [{ q: 'ambiente', txt: ambiente.id, cor: COR.ambiente }] : []),
    ...passos.filter((s) => no(s.at, s.fim)).map(() => ({ q: 'passos', txt: 'passo (do movimento)', cor: COR.passos })),
    ...efeitos.filter((s) => no(s.at, s.fim)).map((s) => ({ q: 'som', txt: s.id, cor: COR.sfx })),
    ...falas.filter((f) => no(f.at, f.fim ?? f.at + 1)).map((f) => ({ q: f.quem, txt: `"${f.texto}"`, cor: COR.voz })),
  ]
  const cenaAgora = shots.find((sh) => no(sh.ini, sh.fim))

  return (
    <div className="aud">
      {/* O MP4 pode ser mais velho que o roteiro, e aí o player toca uma coisa enquanto a linha do
          tempo mostra outra. O aviso vem ANTES do player de propósito: quem chegou aqui pra julgar
          som vai apertar play antes de ler qualquer coisa embaixo. */}
      {dado.desatualizado && !semVideo && (
        <p className="render-msg no">
          <Icon name="alerta" size={13} /> o MP4 é anterior à última edição do roteiro: o que você
          OUVE aqui é o render antigo, e a linha do tempo abaixo já é a nova. Renderize de novo antes de julgar o som.
        </p>
      )}
      {!semVideo ? (
        <div className="aud-player">
          <video ref={vid} className="aud-video" controls preload="metadata"
            src={`/files/videos/${videoId}/final.mp4${bust ? '?v=' + bust : ''}`}
            onError={() => setSemVideo(true)}
            onPlay={() => setTocando(true)}
            onPause={() => setTocando(false)}
            onSeeked={() => vid.current && setT(vid.current.currentTime)}
          />
          <div className="aud-agora">
            <div className="aud-agora-t">
              {t.toFixed(2)}<span className="hint">s</span>
              <span className="hint"> · frame {Math.round(t * dado.fps)}{cenaAgora ? ` · cena ${cenaAgora.i + 1}` : ''}</span>
            </div>
            {agora.length ? agora.map((a, i) => (
              <div key={i} className="aud-agora-item" style={{ '--cor': a.cor }}>
                <span className="aud-agora-q">{a.q}</span> {a.txt}
              </div>
            )) : <div className="aud-agora-item aud-agora-mudo"><Icon name="alerta" size={12} /> silêncio</div>}
          </div>
        </div>
      ) : (
        <p className="hint">O MP4 ainda não foi renderizado: a linha do tempo abaixo já vale (ela sai do roteiro, não do vídeo), mas sem player pra ouvir junto.</p>
      )}

      <div className="aud-topo">
        <span className="hint">{dur.toFixed(1)}s · {dado.totalFrames} frames · {sfx.length} som(ns) · {falas.length} fala(s)</span>
        {!!buracos.length && (
          <span className="render-msg no" title={buracos.map(([a, b]) => `${a.toFixed(1)}s a ${b.toFixed(1)}s`).join(' · ')}>
            <Icon name="alerta" size={13} /> {buracos.length} trecho(s) em silêncio
          </span>
        )}
      </div>

      <div className="aud-grade" onMouseDown={irPara}>
        <span />
        <div className="aud-regua-wrap" ref={pistaRef}><Regua dur={dur} shots={shots} /></div>

        <span className="aud-faixa-nome">cenas</span>
        <div className="aud-faixa-pista aud-pista-cenas">
          {shots.map((sh, i) => (
            <div key={sh.i} className={'aud-cena' + (i > 0 && sh.set !== shots[i - 1].set ? ' troca' : '') + (cenaAgora?.i === sh.i ? ' tocando' : '')}
              title={sh.beat || `cena ${sh.i + 1}`}
              style={{ left: pct(sh.ini, dur), width: `${((sh.fim - sh.ini) / dur) * 100}%` }}>
              <span className="aud-rotulo">{sh.i + 1}. {sh.set || 'cena'}</span>
            </div>
          ))}
        </div>

        <Faixa nome="ambiente" vazia={!ambiente}>
          {ambiente && (
            <Bloco ini={0} fim={dur} dur={dur} cor={COR.ambiente} ativo titulo={`leito ${ambiente.id} · vol ${ambiente.vol}`}>
              {ambiente.id}
            </Bloco>
          )}
        </Faixa>

        {/* PASSOS numa faixa própria, e não misturado nos efeitos, porque ele é a única coisa aqui
            que o roteiro NÃO declara: sai do movimento. Ver quantos trechos existem e onde é como
            se confere que o som acompanha o corpo. */}
        <Faixa nome="passos" vazia={!passos.length} pistas={pPassos.n}>
          {pPassos.blocos.map(({ it: s, p }, i) => (
            <Bloco key={i} pista={p} ini={s.at} fim={s.fim} iniArquivo={s.at} fimArquivo={s.at + s.seg} dur={dur} cor={COR.passos}
              ativo={no(s.at, s.fim)}
              titulo={`derivado do movimento · ${s.at.toFixed(2)}s a ${s.fim.toFixed(2)}s (${s.dur.toFixed(2)}s)`}>
              {s.dur.toFixed(1)}s
            </Bloco>
          ))}
        </Faixa>

        <Faixa nome="sons" vazia={!efeitos.length} pistas={pSons.n}>
          {pSons.blocos.map(({ it: s, p }, i) => (
            <Bloco key={i} pista={p} ini={s.at} fim={s.fim} iniArquivo={s.at} fimArquivo={s.continuo ? s.at + s.seg : null}
              dur={dur} cor={COR.sfx} ativo={no(s.at, s.fim)}
              titulo={`${s.id} · cena ${(s.si ?? 0) + 1} · ${s.at.toFixed(2)}s a ${s.fim.toFixed(2)}s · arquivo ${s.seg}s${s.cortado ? ' (cortado no fim da cena)' : ''}`}>
              {s.id}
            </Bloco>
          ))}
        </Faixa>

        <Faixa nome="voz" vazia={!falas.length} pistas={pVoz.n}>
          {pVoz.blocos.map(({ it: f, p }, i) => (
            <Bloco key={i} pista={p} ini={f.at} fim={f.fim ?? f.at + 1} dur={dur} cor={COR.voz} alerta={!f.seg}
              ativo={no(f.at, f.fim ?? f.at + 1)}
              titulo={`${f.quem}: "${f.texto}"${f.seg ? ` · ${f.seg}s` : ' · a síntese FALHOU: sai mudo'}`}>
              {f.texto}
            </Bloco>
          ))}
        </Faixa>

        {!!buracos.length && (
          <Faixa nome="silêncio">
            {buracos.map(([a, b], i) => (
              <div key={i} className={'aud-buraco' + (no(a, b) ? ' tocando' : '')} title={`${(b - a).toFixed(1)}s sem som nenhum`}
                style={{ left: pct(a, dur), width: `${((b - a) / dur) * 100}%` }}>
                <span className="aud-rotulo">{(b - a).toFixed(1)}s</span>
              </div>
            ))}
          </Faixa>
        )}

        {/* O CURSOR atravessa todas as faixas de uma vez: é a linha que liga o que se ouve ao que
            se lê. Vive na coluna 2 do grid (a das pistas), então não precisa saber a largura do
            rótulo — e o alinhamento não pode sair do lugar quando um nome de faixa mudar. */}
        <div className="aud-ph-wrap">
          <div className="aud-playhead" style={{ left: pct(t, dur) }}>
            <span className="aud-ph-bolha">{t.toFixed(1)}s</span>
          </div>
        </div>
      </div>

      <details className="pub-mais">
        <summary className="hint">a lista, em segundos</summary>
        <table className="tabela">
          <thead><tr><th>som</th><th>cena</th><th>entra</th><th>sai</th><th>dura</th><th>arquivo</th><th>de onde vem</th></tr></thead>
          <tbody>
            {sfx.map((s, i) => (
              <tr key={i} className={no(s.at, s.fim) ? 'aud-linha-ativa' : undefined}>
                <td>{s.id}</td>
                <td>{(s.si ?? 0) + 1}</td>
                <td>{s.at.toFixed(2)}s</td>
                <td>{s.fim.toFixed(2)}s</td>
                <td>{(s.dur ?? 0).toFixed(2)}s</td>
                <td>{s.seg}s{s.cortado ? <span className="hint"> (cortado)</span> : null}</td>
                <td className="hint">{s.derivado ? 'do movimento' : s.continuo ? 'roteiro, leito' : 'roteiro, evento'}</td>
              </tr>
            ))}
            {falas.map((f, i) => (
              <tr key={'v' + i} className={no(f.at, f.fim ?? f.at + 1) ? 'aud-linha-ativa' : undefined}>
                <td>voz · {f.quem}</td>
                <td />
                <td>{f.at.toFixed(2)}s</td>
                <td>{f.fim != null ? f.fim.toFixed(2) + 's' : '—'}</td>
                <td>{f.seg != null ? f.seg.toFixed(2) + 's' : '—'}</td>
                <td className="hint">say</td>
                <td className="hint">"{f.texto}"</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}
