import React from 'react'
import { Icon } from '../components/Icon.jsx'
import { useStudio } from './StudioContext.jsx'
import { useModelosImagem } from '../hooks/useModelosImagem.js'

// SELETOR DO MODELO DE IMAGEM — o que ele escolhe vale em TODO o projeto.
//
// Estava no rodapé da barra lateral, abaixo do menu, que é onde se põe configuração que se mexe uma
// vez e esquece. Este não é esse tipo de controle: ele decide de onde sai cada geração e, no caso da
// Together, se ela é cota de assinatura ou fatura por imagem. No header ele fica no campo de visão
// junto do estado de "salvo", que é o outro indicador que vale a cada ação.
//
// O que está selecionado aqui é o padrão de verdade, verificado ponta a ponta: o valor grava em
// `projeto.modeloImagem`, a rota de geração do studio o lê por `resolverModeloImagem(dados)` e o CLI
// o lê por `modeloEfetivo()`. Um `--modelo=` na linha de comando vence os dois, e só naquela
// execução (ver scripts/sprites/modelo.mjs).
export function SeletorModelo() {
  const { dados, update } = useStudio()
  const { modelos, padrao } = useModelosImagem()
  const atual = dados?.projeto?.modeloImagem || padrao
  const modelo = modelos.find((m) => m.id === atual)
  // a ASSINATURA na dica não é enfeite: é a diferença entre gastar cota e gastar dinheiro
  const dica = modelo
    ? `Geração de imagem via ${modelo.nome}, na ${modelo.assinatura}. Vale para todo o projeto, no studio e nos scripts.`
    : 'Modelo que gera as imagens em todo o projeto'
  // paga por imagem ganha marca própria: trocar pra cá tem consequência de fatura, não de fila
  const pago = /paga/i.test(modelo?.assinatura || '')

  return (
    <label className={'topbar-modelo' + (pago ? ' pago' : '')} title={dica}>
      <Icon name="imagem" size={13} />
      <select
        className="field"
        value={atual}
        onChange={(e) => update((n) => { n.projeto.modeloImagem = e.target.value })}
        title={dica}
      >
        {modelos.map((m) => (
          <option key={m.id} value={m.id}>{m.curto || m.nome}</option>
        ))}
      </select>
    </label>
  )
}
