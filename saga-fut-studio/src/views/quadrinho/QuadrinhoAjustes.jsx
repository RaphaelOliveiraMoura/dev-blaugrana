import React from 'react'
import { Icon } from '../../components/index.js'
import { useStudio } from '../../app/StudioContext.jsx'
import {
  MOLDURAS, molduraDe, legendaPorCodigo, temCarimbo, resumoDoAcabamento,
} from '../../../shared/quadrinho-config.mjs'
import { FORMATOS } from '../../lib/formatos.js'

// AJUSTES DE ACABAMENTO do quadrinho: o que é desenhado pela IA e o que é desenhado por
// código no export. A tela existe porque isso mudou de mãos em 05/08/2026 e sem ela não
// dava pra saber, olhando o quadrinho, quem vai desenhar a moldura e a legenda — só
// abrindo o JSON. A regra de resolução mora em shared/quadrinho-config.mjs, então esta
// tela mostra exatamente o que o export vai fazer, sem uma segunda cópia da regra.
function Opcao({ ativo, titulo, resumo, onClick, aviso }) {
  return (
    <button className={'ajuste-opt' + (ativo ? ' ativo' : '')} onClick={onClick}>
      <span className="ajuste-opt-topo">
        <Icon name={ativo ? 'check' : 'chevron'} size={13} />
        <strong>{titulo}</strong>
      </span>
      <span className="hint">{resumo}</span>
      {aviso && <span className="ajuste-aviso"><Icon name="alerta" size={11} /> {aviso}</span>}
    </button>
  )
}

export function QuadrinhoAjustes({ quad, qi }) {
  const { update } = useStudio()
  const set = (campo, v) => update((n) => { n.quadrinhos[qi][campo] = v })

  const moldura = molduraDe(quad)
  const legendas = legendaPorCodigo(quad)
  const carimbo = temCarimbo(quad)
  const temArte = (quad.paineis || []).some((p) => p.imagem)

  return (
    <>
      <div className="panel">
        <span className="label">Como este quadrinho é acabado</span>
        <p className="hint mt-1">{resumoDoAcabamento(quad)}</p>
        <p className="hint">
          Moldura, legenda e numeração podem vir da IA (desenhadas junto com a arte) ou do studio
          (desenhadas por código no export). Por código elas ficam idênticas em todo painel e
          corrigir um texto deixa de custar geração.
        </p>
      </div>

      <div className="panel">
        <span className="label">Moldura e selo</span>
        <div className="ajuste-opts mt-2">
          {Object.values(MOLDURAS).map((m) => (
            <Opcao
              key={m.id}
              ativo={moldura === m.id}
              titulo={m.nome}
              resumo={m.resumo}
              onClick={() => set('moldura', m.id)}
              aviso={temArte && m.id !== moldura
                ? 'a arte atual foi gerada no modo anterior: regere os painéis depois de trocar'
                : null}
            />
          ))}
        </div>
        <p className="hint mt-2">
          <strong>Sem moldura</strong> é o modo dos cards que não são quadrinho de história (escalação,
          gol, fim de jogo): neles a borda e o selo atrapalham a leitura.
        </p>
      </div>

      <div className="panel">
        <span className="label">Legendas</span>
        <div className="ajuste-opts mt-2">
          <Opcao
            ativo={legendas}
            titulo="Por código"
            resumo="A arte nasce muda e as caixas entram no export. Ortografia sempre certa e trocar um texto não gasta geração."
            onClick={() => set('legendaPorCodigo', true)}
            aviso={temArte && !legendas ? 'a arte atual já tem legenda desenhada: regere os painéis depois de trocar' : null}
          />
          <Opcao
            ativo={!legendas}
            titulo="Pela IA"
            resumo="O modelo escreve as legendas dentro da arte, como nos quadrinhos antigos. Cada geração é um sorteio de ortografia."
            onClick={() => set('legendaPorCodigo', false)}
          />
        </div>
      </div>

      <div className="panel">
        <span className="label">Carimbo de progresso</span>
        <div className="ajuste-opts mt-2">
          <Opcao
            ativo={carimbo}
            titulo={'Numerar os slides ("3/6")'}
            resumo="Reduz o abandono no meio do carrossel. Entra no canto superior esquerdo, por código, só quando há mais de um slide."
            onClick={() => set('carimboProgresso', true)}
          />
          <Opcao
            ativo={!carimbo}
            titulo="Sem numeração"
            resumo="Para peça única ou card avulso, onde o número não faz sentido."
            onClick={() => set('carimboProgresso', false)}
          />
        </div>
      </div>

      <div className="panel">
        <span className="label">Resumo da peça</span>
        <ul className="ajuste-resumo mt-2">
          <li><span>Estilo</span><strong>{quad.estiloId || <em className="muted">nenhum</em>}</strong></li>
          <li><span>Formato</span><strong>{FORMATOS[quad.formato]?.label || quad.formato}</strong></li>
          <li><span>Tipo</span><strong>{quad.tipo}</strong></li>
          <li><span>Selo</span><strong>{quad.selo || <em className="muted">nenhum</em>}</strong></li>
          <li><span>Painéis</span><strong>{(quad.paineis || []).length}</strong></li>
          <li><span>Post sai em</span><strong>{FORMATOS[quad.formato]?.label || quad.formato}</strong></li>
        </ul>
        <p className="hint mt-2">
          O post herda o formato do painel: exportar um 3:4 em 4:5 engrossaria a moldura lateral,
          porque o painel cabe pela altura e sobra creme dos dois lados.
        </p>
      </div>
    </>
  )
}
