import React, { useEffect, useState } from 'react'
import { Icon, Media } from '../../components/index.js'
import { useStudio } from '../../app/StudioContext.jsx'
import { quadrinhoSlide, quadrinhoVideo } from '../../../shared/caminhos.mjs'
import { YoutubeAgendar } from './YoutubeAgendar.jsx'

// A ABA DE LEVAR PRO APP. Não é onde se escreve o post (isso é Publicar), é onde se PEGA o que
// já está pronto: as imagens na ordem e o texto num toque.
//
// Feita pra ser aberta NO CELULAR (o Vite escuta na rede local, ver vite.config.js), porque é lá
// que a publicação termina: Instagram e TikTok só aceitam a música nativa pelo app, e a música é
// o que dá alcance nos dois. O caminho antigo era mandar tudo por WhatsApp Web pra si mesmo, que
// reordena as imagens, recomprime e deixa o texto preso num balão de conversa.
//
// SLIDE, NÃO PAINEL. O que vai pro app é `posts/slide-N.png` (o acabado: moldura, legenda, selo
// e o carimbo "3/6"), nunca `paineis/N.png`, que é a arte sangrada e MUDA. Postar o painel cru é
// postar o quadrinho sem texto nenhum, e no acervo de hoje a legenda é vetorial: ela só existe
// depois do export. Se os slides não existirem, esta aba manda montar em vez de oferecer o cru.
//
// A ORDEM É O PRODUTO. Salvar do navegador pra galeria perde o nome do arquivo (vira IMG_0042),
// então quem garante a ordem é a sequência em que ele salva. Daí o número gigante em cima de cada
// imagem e o check de "já salvei esta": num carrossel de 6, pular uma e só perceber no app custa
// recomeçar a seleção inteira.
export function QuadrinhoPostar({ quad, qi }) {
  const { existing, bust, update } = useStudio()
  const [copiado, setCopiado] = useState(null)
  const [salvos, setSalvos] = useState({}) // marcação local, só pra não perder a conta
  const [baixando, setBaixando] = useState(null) // {i, total} enquanto a fila roda
  const [erroFila, setErroFila] = useState(null)

  const titulo = (quad.publicacao?.titulo || '').trim()
  const descricao = (quad.legenda || '').trim()
  const video = quadrinhoVideo(quad.id)

  const slides = (quad.paineis || [])
    .map((p) => ({ numero: p.numero, src: quadrinhoSlide(quad.id, p.numero) }))
    .filter((s) => existing[s.src])

  // O X aceita no máximo 4 imagens por post, e os carrosséis da casa têm 5 a 8. A divisão em
  // grupos de 4 era feita na mão a cada publicação; aqui ela é derivada, na mesma ordem de
  // leitura. Grupo 1 é o post, os seguintes são as respostas encadeadas.
  const gruposX = []
  for (let i = 0; i < slides.length; i += 4) gruposX.push(slides.slice(i, i + 4))

  async function copiar(texto, qual) {
    try {
      await navigator.clipboard.writeText(texto)
    } catch {
      // Safari no iOS recusa a área de transferência fora de gesto direto em alguns contextos:
      // o fallback seleciona o texto pra dar pra copiar na mão, em vez de falhar calado
      const ta = document.createElement('textarea')
      ta.value = texto
      document.body.appendChild(ta); ta.select()
      try { document.execCommand('copy') } catch { /* aí não dá mesmo */ }
      ta.remove()
    }
    setCopiado(qual)
    setTimeout(() => setCopiado(null), 1600)
  }

  const tudo = [titulo, descricao].filter(Boolean).join('\n\n')

  // BAIXAR TODAS, UMA DE CADA VEZ, ESPERANDO ENTRE ELAS.
  //
  // O que decide a ordem na galeria não é o nome do arquivo (ele se perde ao salvar), é o
  // INSTANTE em que cada um chega. Disparar os seis downloads juntos deixa o navegador terminá-los
  // fora de ordem, e o carrossel sai embaralhado no app. Por isso a fila é serial de verdade:
  // cada arquivo é buscado por completo (fetch → blob) ANTES de ser salvo, e só depois de uma
  // pausa a próxima começa. O fetch primeiro também torna o clique instantâneo, então o intervalo
  // entre dois arquivos salvos é o PASSO, e não a sorte da rede.
  const PASSO_MS = 900

  async function baixarTodas() {
    setErroFila(null)
    try {
      for (const [i, s] of slides.entries()) {
        setBaixando({ i: i + 1, total: slides.length })
        const resp = await fetch(`/files/${s.src}`)
        if (!resp.ok) throw new Error(`slide ${i + 1}: HTTP ${resp.status}`)
        const blob = await resp.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${quad.id}-${String(i + 1).padStart(2, '0')}.png`
        document.body.appendChild(a)
        a.click()
        a.remove()
        // revoga depois de um instante: revogar na hora cancela o download em alguns navegadores
        setTimeout(() => URL.revokeObjectURL(url), 4000)
        setSalvos((p) => ({ ...p, [s.numero]: true }))
        if (i < slides.length - 1) await new Promise((r) => setTimeout(r, PASSO_MS))
      }
    } catch (e) {
      setErroFila(e.message)
    } finally {
      setBaixando(null)
    }
  }

  return (
    <div className="postar">
      {!slides.length ? (
        <div className="panel">
          <p className="hint">
            Nenhum slide montado ainda. O que vai pro app é o slide ACABADO (com moldura, legenda e
            o carimbo de progresso), não a arte crua do painel. Monte em <strong>Publicar → Montar
            mosaico + carrossel</strong> e volte aqui.
          </p>
        </div>
      ) : null}

      {/* O YOUTUBE FICA FORA DA CONDIÇÃO DOS SLIDES: ele consome o VÍDEO, não os slides do
          carrossel. Estava dentro, e um quadrinho com vídeo montado e slides ainda não exportados
          escondia o agendamento sem explicar por quê. */}
      {existing[video] && (
        <>
          <div className="panel">
            <h3>Vídeo</h3>
            <p className="hint">O mesmo post em 9:16 com trilha, pro Shorts e pro Reels.</p>
            <a className="btn mt-2" href={`/files/${video}`} download={`${quad.id}.mp4`}>
              <Icon name="baixar" size={14} /> baixar o vídeo
            </a>
          </div>
          <YoutubeAgendar quad={quad} qi={qi} update={update} />
        </>
      )}

      {!!slides.length && (
        <>
          {/* O TEXTO VEM PRIMEIRO: no app, colar a legenda é o passo que trava (o teclado do
              celular some, a seleção escapa). Com o botão, é um toque antes de abrir o app. */}
          <div className="panel">
            <h3>Texto do post</h3>
            <button className="btn btn-primary btn-lg postar-copiar" onClick={() => copiar(tudo, 'tudo')}>
              <Icon name={copiado === 'tudo' ? 'check' : 'copiar'} size={16} />
              {copiado === 'tudo' ? 'Copiado!' : 'Copiar título + descrição'}
            </button>
            <div className="postar-copias">
              <button className="btn btn-sm" onClick={() => copiar(titulo, 't')} disabled={!titulo}>
                <Icon name={copiado === 't' ? 'check' : 'copiar'} size={12} />
                {copiado === 't' ? 'copiado' : 'só o título'}
              </button>
              <span className="hint">é o que vai no X, que não usa a descrição</span>
            </div>
            <div className="postar-previa">
              {titulo && <p className="postar-titulo">{titulo}</p>}
              {descricao && <p className="postar-desc">{descricao}</p>}
              {!titulo && !descricao && <p className="hint">Sem título nem descrição. Escreva em Publicar.</p>}
            </div>
          </div>

          <div className="panel">
            <h3>Imagens, na ordem</h3>
            <button
              className="btn btn-primary btn-lg"
              onClick={baixarTodas}
              disabled={!!baixando}>
              {baixando
                ? <><span className="gen-spinner" /> baixando {baixando.i} de {baixando.total}…</>
                : <><Icon name="baixar" size={16} /> Baixar todas na ordem ({slides.length})</>}
            </button>
            <p className="hint mt-2">
              Uma de cada vez, com pausa entre elas: o que decide a ordem na galeria é o instante em
              que cada arquivo chega, não o nome dele. Se o navegador perguntar se permite vários
              downloads, aceite.
            </p>
            {erroFila && <p className="render-msg no mt-2"><Icon name="alerta" size={13} /> {erroFila}</p>}

            <p className="hint mt-3">
              <strong>No iPhone</strong> o download vai pro app Arquivos, não pra galeria, e o
              Instagram precisa da galeria. Ali o caminho é <strong>toque longo na imagem e
              "adicionar às fotos"</strong>, uma por uma, de cima pra baixo. É pra isso que serve o
              marcar: num carrossel de {slides.length}, pular uma e só ver dentro do app custa
              refazer a seleção inteira.
            </p>
            {salvos && Object.keys(salvos).length > 0 && (
              <p className="hint mt-2">
                {Object.values(salvos).filter(Boolean).length} de {slides.length} marcadas
                {' · '}
                <button className="btn-link" onClick={() => setSalvos({})}>limpar</button>
              </p>
            )}

            <div className="postar-slides">
              {slides.map((s, i) => (
                <div className={'postar-slide' + (salvos[s.numero] ? ' ok' : '')} key={s.numero}>
                  {/* o número vai numa faixa ACIMA da arte, não sobreposto: o slide já leva o
                      carimbo de progresso ("1/6") no canto superior esquerdo, e um badge por
                      cima cobria justamente ele */}
                  <div className="postar-slide-topo">
                    <span className="postar-slide-num">{i + 1}</span>
                    <span>de {slides.length}</span>
                    {salvos[s.numero] && <span className="postar-slide-ok"><Icon name="check" size={12} /> salva</span>}
                  </div>
                  <Media existing={existing} src={s.src} bust={bust} />
                  <div className="postar-slide-acoes">
                    <a className="btn btn-sm" href={`/files/${s.src}`} download={`${quad.id}-${String(i + 1).padStart(2, '0')}.png`}>
                      <Icon name="baixar" size={12} /> baixar
                    </a>
                    <button
                      className={'btn btn-sm' + (salvos[s.numero] ? ' btn-primary' : '')}
                      onClick={() => setSalvos((p) => ({ ...p, [s.numero]: !p[s.numero] }))}>
                      <Icon name="check" size={12} /> {salvos[s.numero] ? 'salva' : 'marcar'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {gruposX.length > 1 && (
            <div className="panel">
              <h3>Para o X</h3>
              <p className="hint">
                O X aceita 4 imagens por post. Este carrossel tem {slides.length}, então vira
                {' '}{gruposX.length} posts encadeados: o primeiro é o post, os outros são respostas
                nele. No texto vai só o título.
              </p>
              {gruposX.map((g, i) => (
                <div className="postar-xgrupo" key={i}>
                  <span className="trilha-cena">{i === 0 ? 'post' : `resposta ${i}`}</span>
                  <span className="hint">imagens {g.map((s) => slides.indexOf(s) + 1).join(', ')}</span>
                </div>
              ))}
            </div>
          )}

          {/* fecha o ciclo aqui: com o critério da casa, `postado` = "terminei de agendar", e é
              justamente no fim desta tela que isso acontece */}
          <div className="panel">
            <button
              className={'btn btn-lg ' + (quad.postado ? '' : 'btn-primary')}
              onClick={() => update((n) => {
                if (quad.postado) delete n.quadrinhos[qi].postado
                else n.quadrinhos[qi].postado = true
              })}>
              <Icon name={quad.postado ? 'x' : 'check'} size={16} />
              {quad.postado ? 'Desmarcar: ainda não agendei' : 'Pronto, agendei em todas'}
            </button>
            <p className="hint mt-2">
              Some da fila de não publicados. Não esqueça de salvar (⌘S) antes de fechar.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
