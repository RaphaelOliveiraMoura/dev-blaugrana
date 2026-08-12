import React from 'react'
import { Icon } from '../../components/index.js'
import { useStudio } from '../../app/StudioContext.jsx'
import {
  MOLDURAS, molduraDe, legendaPorCodigo, balaoPorCodigo, temCarimbo,
} from '../../../shared/quadrinho-config.mjs'

// AJUSTES DE ACABAMENTO do quadrinho: o que é desenhado pela IA e o que é desenhado por
// código no export. A tela existe porque isso mudou de mãos em 05/08/2026 e sem ela não
// dava pra saber, olhando o quadrinho, quem vai desenhar a moldura e a legenda, só
// abrindo o JSON. A regra de resolução mora em shared/quadrinho-config.mjs, então esta
// tela mostra exatamente o que o export vai fazer, sem uma segunda cópia da regra.
//
// CADA OPÇÃO SE ESCOLHE OLHANDO. Acabamento é geometria: a diferença entre "moldura por
// código" e "moldura pela IA" é a margem ser igual ou variar, e isso se vê num desenho e
// não se lê num parágrafo. As miniaturas abaixo são o painel esquemático COM as escolhas
// atuais aplicadas, mudando só a variável daquele bloco, então o cartão aceso é uma
// prévia do que o export produz.

// ---------- miniatura do painel ----------
const PAPEL = '#efe7d6'      // creme da moldura, o mesmo do export
const CEU = '#7089ad'
const CHAO = '#414c60'
const TINTA = '#1a1e27'
const OURO = '#e5b437'

// Margem da moldura por modo. A da IA é desigual de propósito: é exatamente o defeito
// que tirou o acabamento das mãos do modelo (4,9% a 7,1% entre painéis do mesmo quadrinho).
const MARGENS = {
  codigo: { t: 5, r: 5, b: 5, l: 5 },
  ia: { t: 7, r: 3.5, b: 5, l: 2.5 },
  nenhuma: { t: 0, r: 0, b: 0, l: 0 },
}

// O balão da miniatura, na mesma gramática das outras: por CÓDIGO ele sai reto, com a ponta
// mirando a cabeça e as duas linhas de texto alinhadas; pela IA sai torto, com a ponta
// desencontrada e as linhas irregulares, que é o defeito real (a fala é redesenhada, e a
// ortografia sorteada, a cada geração). O exagero é proposital: a escolha tem que se ver.
function MiniBalao({ x, y, w, h, cabeca, porCodigo }) {
  const bw = w * (porCodigo ? 0.58 : 0.62)
  const bh = h * 0.145
  const bx = x + w * (porCodigo ? 0.2 : 0.17)
  const by = y + h * 0.07
  // por código a ponta encosta na cabeça; pela IA ela para no meio do caminho e torta
  const alvoX = porCodigo ? cabeca.x : bx + bw * 0.2
  const alvoY = porCodigo ? cabeca.y - h * 0.05 : by + bh * 1.7
  const base = bx + bw * 0.42
  const pts = `${base - bw * 0.1},${by + bh} ${base + bw * 0.1},${by + bh} ${alvoX},${alvoY}`
  const linha = porCodigo ? 0.6 : 0.95
  return (
    <g transform={porCodigo ? undefined : `rotate(-5 ${bx + bw / 2} ${by + bh / 2})`}>
      <polygon points={pts} fill="#fbf9f4" stroke={TINTA} strokeWidth={linha} strokeLinejoin="round" />
      <rect x={bx} y={by} width={bw} height={bh} rx={bh * 0.42}
        fill="#fbf9f4" stroke={TINTA} strokeWidth={linha} />
      <rect x={bx + bw * 0.13} y={by + bh * 0.28} width={porCodigo ? bw * 0.74 : bw * 0.46} height={bh * 0.17}
        rx={bh * 0.09} fill={TINTA} />
      <rect x={bx + bw * (porCodigo ? 0.13 : 0.22)} y={by + bh * 0.58}
        width={porCodigo ? bw * 0.52 : bw * 0.66} height={bh * 0.17} rx={bh * 0.09} fill={TINTA} />
    </g>
  )
}

function Mini({ moldura, legenda, balao, carimbo, ar = 3 / 4 }) {
  const W = 60
  const H = Math.round(W / ar)
  const m = MARGENS[moldura] || MARGENS.codigo
  const x = m.l
  const y = m.t
  const w = W - m.l - m.r
  const h = H - m.t - m.b
  const horizonte = y + h * 0.62

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="ajuste-mini" role="img" aria-hidden="true">
      <rect x="0" y="0" width={W} height={H} fill={moldura === 'nenhuma' ? CEU : PAPEL} />

      {/* a arte: céu, chão e uma silhueta, só pra leitura ser de painel e não de caixa */}
      <rect x={x} y={y} width={w} height={h} fill={CEU} />
      <rect x={x} y={horizonte} width={w} height={y + h - horizonte} fill={CHAO} />
      <circle cx={x + w * 0.42} cy={horizonte - h * 0.28} r={h * 0.075} fill={TINTA} />
      <rect
        x={x + w * 0.34} y={horizonte - h * 0.2}
        width={w * 0.16} height={h * 0.2} rx={1.5} fill={TINTA}
      />

      {/* o balão de fala, no alto da arte, com a ponta mirando a cabeça da silhueta acima */}
      <MiniBalao x={x} y={y} w={w} h={h} porCodigo={balao}
        cabeca={{ x: x + w * 0.42, y: horizonte - h * 0.28 }} />

      {/* selo da série: só existe quando a moldura existe */}
      {moldura !== 'nenhuma' && (
        <rect
          x={moldura === 'ia' ? W - 21 : W - 20} y={moldura === 'ia' ? 1.2 : 1.4}
          width="14" height="2.6" rx="1.3" fill={OURO}
          transform={moldura === 'ia' ? `rotate(-2 ${W - 14} 2.5)` : undefined}
        />
      )}

      {/* Legenda: reta e uniforme por código, torta e desalinhada pela IA. O exagero é
          proposital, é a diferença que se quer enxergar sem ler o cartão. */}
      <g transform={legenda ? undefined : `rotate(-4.5 ${W / 2} ${y + h - 8})`}>
        <rect
          x={x + (legenda ? 3 : 4.5)} y={y + h - 13} width={w - (legenda ? 6 : 9)} height="10" rx="1.2"
          fill="#fbf9f4" stroke={TINTA} strokeWidth={legenda ? 0.6 : 0.9}
        />
        <rect
          x={x + (legenda ? 6 : 7)} y={y + h - 10.2}
          width={legenda ? w - 12 : w - 20} height="1.6" rx="0.8" fill={TINTA}
        />
        <rect
          x={x + (legenda ? 6 : 9)} y={y + h - 7}
          width={legenda ? w - 18 : w - 17} height="1.6" rx="0.8" fill={TINTA}
        />
      </g>

      {/* carimbo de progresso, no canto superior esquerdo, como no export */}
      {carimbo && (
        <g>
          <rect x={x + 2.5} y={y + 2.5} width="13" height="7" rx="3.5" fill="rgba(10,12,16,.72)" />
          <text
            x={x + 9} y={y + 7.6} textAnchor="middle"
            fontSize="5" fontWeight="700" fill="#fff" fontFamily="system-ui, sans-serif"
          >3/6</text>
        </g>
      )}
    </svg>
  )
}

// ---------- cartão de opção ----------
function Opcao({ ativo, titulo, resumo, mini, onClick }) {
  return (
    <button
      type="button" role="radio" aria-checked={ativo}
      className={'ajuste-opt' + (ativo ? ' ativo' : '')}
      onClick={onClick}
    >
      <span className="ajuste-opt-quadro">
        {mini}
        {ativo && <span className="ajuste-opt-check"><Icon name="check" size={11} /></span>}
      </span>
      <span className="ajuste-opt-nome">{titulo}</span>
      <span className="ajuste-opt-hint">{resumo}</span>
    </button>
  )
}

function Bloco({ titulo, sub, aviso, nota, children }) {
  return (
    <section className="ajuste-bloco">
      <div className="ajuste-bloco-head">
        <h4>{titulo}</h4>
        <p className="hint">{sub}</p>
      </div>
      <div className="ajuste-opts" role="radiogroup" aria-label={titulo}>{children}</div>
      {aviso && (
        <p className="ajuste-aviso"><Icon name="alerta" size={12} /> {aviso}</p>
      )}
      {nota && <p className="ajuste-nota">{nota}</p>}
    </section>
  )
}

// Resumos curtos: o cartão diz o que muda, o parágrafo de contexto fica no cabeçalho do
// bloco. Texto longo dentro do botão faz a decisão parecer documentação.
const RESUMO_MOLDURA = {
  codigo: 'Margem idêntica em todo painel. A arte nasce sangrada.',
  ia: 'O modelo desenha a borda. A margem varia de painel pra painel.',
  nenhuma: 'Arte de ponta a ponta. É o modo dos cards de jogo.',
}

export function QuadrinhoAjustes({ quad, qi }) {
  const { update, existing } = useStudio()
  const set = (campo, v) => update((n) => { n.quadrinhos[qi][campo] = v })

  const moldura = molduraDe(quad)
  const legendas = legendaPorCodigo(quad)
  const baloes = balaoPorCodigo(quad)
  const carimbo = temCarimbo(quad)

  const paineis = quad.paineis || []
  const comArte = paineis.filter((p) => p.imagem && existing[p.imagem]).length
  const [aw, ah] = String(quad.formato || '3:4').split(':').map(Number)
  const ar = aw && ah ? aw / ah : 3 / 4

  // O aviso de regerar é UM por bloco, não um por opção: repetido em cada cartão ele vira
  // moldura de aviso e some da vista, e ainda aparece antes de a pessoa trocar qualquer coisa.
  const avisoArte = comArte
    ? (comArte === 1 && paineis.length === 1
        ? 'O painel já tem arte no disco: trocar aqui pede regerar a arte.'
        : `${comArte} de ${paineis.length} painéis já têm arte no disco: trocar aqui pede regerar essas artes.`)
    : null

  const estado = [
    { rot: 'Moldura', val: MOLDURAS[moldura].nome },
    { rot: 'Legendas', val: legendas ? 'Por código' : 'Pela IA' },
    { rot: 'Balões', val: baloes ? 'Por código' : 'Pela IA' },
    { rot: 'Numeração', val: carimbo ? 'ligada' : 'desligada' },
  ]

  // quantos painéis já têm fala escrita. É o MESMO campo nos dois modos (`painel.falas`), então
  // trocar o eixo não deixa texto pra trás: muda só quem desenha.
  const comFala = paineis.filter((p) => (p.falas || []).some((f) => f.personagem && (f.texto || '').trim())).length

  return (
    <>
      <div className="panel ajuste-topo">
        <div className="ajuste-topo-txt">
          <span className="label">Como esta peça é acabada</span>
          <p className="hint mt-1">
            Moldura, legenda e numeração podem vir da IA (desenhadas junto com a arte) ou do studio
            (desenhadas por código no export). Por código elas ficam idênticas em todo painel e
            corrigir um texto deixa de custar geração.
          </p>
        </div>
        <div className="ajuste-estado">
          {estado.map((e) => (
            <span key={e.rot} className="ajuste-estado-item">
              <span className="label">{e.rot}</span>
              <strong>{e.val}</strong>
            </span>
          ))}
          <span className="ajuste-estado-item">
            <span className="label">Arte pronta</span>
            <strong>{comArte}/{paineis.length}</strong>
          </span>
        </div>
      </div>

      <div className="panel ajuste-blocos">
        <Bloco
          titulo="Moldura e selo"
          sub="quem desenha a borda do painel e o selo da série"
          aviso={avisoArte}
          nota="Sem moldura é o modo dos cards que não são quadrinho de história (escalação, gol, fim de jogo): neles a borda e o selo atrapalham a leitura."
        >
          {Object.values(MOLDURAS).map((m) => (
            <Opcao
              key={m.id}
              ativo={moldura === m.id}
              titulo={m.nome}
              resumo={RESUMO_MOLDURA[m.id] || m.resumo}
              mini={<Mini moldura={m.id} legenda={legendas} balao={baloes} carimbo={carimbo} ar={ar} />}
              onClick={() => set('moldura', m.id)}
            />
          ))}
        </Bloco>

        <Bloco
          titulo="Legendas"
          sub="a caixa de texto do painel, aquela que conta a história por fora da fala"
          aviso={legendas ? null : avisoArte}
        >
          <Opcao
            ativo={legendas}
            titulo="Por código"
            resumo="A arte nasce muda. Ortografia sempre certa e trocar o texto não gasta geração."
            mini={<Mini moldura={moldura} legenda balao={baloes} carimbo={carimbo} ar={ar} />}
            onClick={() => set('legendaPorCodigo', true)}
          />
          <Opcao
            ativo={!legendas}
            titulo="Pela IA"
            resumo="Escrita dentro da arte. Cada geração é um sorteio de ortografia."
            mini={<Mini moldura={moldura} legenda={false} balao={baloes} carimbo={carimbo} ar={ar} />}
            onClick={() => set('legendaPorCodigo', false)}
          />
        </Bloco>

        <Bloco
          titulo="Balões de fala"
          sub="a fala dentro do quadro, aquela que sai da boca do personagem"
          aviso={baloes ? null : avisoArte}
          nota={comFala
            ? `A fala é a mesma nos dois modos (${comFala} painel(is) com texto): trocar aqui muda só QUEM desenha. Posição e prévia ficam na aba Falas.`
            : 'A fala vive em painel.falas, editável no detalhe do painel ou, todos de uma vez, na aba Falas.'}
        >
          <Opcao
            ativo={baloes}
            titulo="Por código"
            resumo="Desenhado no export, com posição arrastável. Trocar a fala não gasta geração."
            mini={<Mini moldura={moldura} legenda={legendas} balao carimbo={carimbo} ar={ar} />}
            onClick={() => set('balaoPorCodigo', true)}
          />
          <Opcao
            ativo={!baloes}
            titulo="Pela IA"
            resumo="Desenhado junto com a arte, integrado à cena. Cada geração é um sorteio de ortografia."
            mini={<Mini moldura={moldura} legenda={legendas} balao={false} carimbo={carimbo} ar={ar} />}
            onClick={() => set('balaoPorCodigo', false)}
          />
        </Bloco>

        <Bloco
          titulo="Numeração do carrossel"
          sub={'o carimbo "3/6" no canto, desenhado por código no export'}
          nota={paineis.length > 1
            ? null
            : 'Este quadrinho tem um painel só, então o carimbo não entra mesmo ligado.'}
        >
          <Opcao
            ativo={carimbo}
            titulo="Numerar os slides"
            resumo="Segura quem está no meio do carrossel. Entra só quando há mais de um painel."
            mini={<Mini moldura={moldura} legenda={legendas} balao={baloes} carimbo ar={ar} />}
            onClick={() => set('carimboProgresso', true)}
          />
          <Opcao
            ativo={!carimbo}
            titulo="Sem numeração"
            resumo="Para peça única ou card avulso, onde o número não faz sentido."
            mini={<Mini moldura={moldura} legenda={legendas} balao={baloes} carimbo={false} ar={ar} />}
            onClick={() => set('carimboProgresso', false)}
          />
        </Bloco>
      </div>
    </>
  )
}
