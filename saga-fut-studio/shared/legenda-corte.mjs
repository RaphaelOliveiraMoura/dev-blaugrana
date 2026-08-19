// ONDE UMA CAIXA DE LEGENDA PODE ACABAR.
//
// POR QUE EXISTE: cada item de `painel.legendas` vira uma CAIXA creme separada, empilhada na
// base do painel, e o leitor lê uma caixa de cada vez. Quem escreve o roteiro vê um array de
// strings e quebra por TAMANHO, como se fosse quebra de linha — e aí uma frase única sai
// partida no meio, em duas caixas com moldura própria. Foi o que o Raphael leu no
// `o-dia-baleia` (painel 4):
//
//     [EM 1921, UMA CHARGE DO JORNAL ÍTALO-BRASILEIRO IL PASQUINO COLONIALE]
//     [JÁ TRATAVA O CLUBE COMO PEIXE.]
//
// O corte cai entre o sujeito e o verbo. A primeira caixa fecha sem a frase ter acabado, e
// como ela tem contorno preto e fundo próprio, ela LÊ como uma unidade terminada. Nenhum gate
// pegava isso: texto certo, ortografia certa, arte certa.
//
// QUEBRA DE LINHA JÁ É AUTOMÁTICA. O lib/legenda.mjs mede a largura real na fonte, quebra em
// linhas e ainda encolhe o corpo pra caber. Ou seja: NINGUÉM precisa quebrar por tamanho.
// Duas caixas são uma decisão EDITORIAL (dois tempos de leitura), nunca tipográfica.
//
// A RÉGUA É "CADA CAIXA, UMA FRASE INTEIRA", e ela custou quatro rodadas com o Raphael. Vale
// ler a história antes de mexer, porque duas delas foram longe demais para o lado errado:
//
//   1ª  corte em pontuação qualquer   → consertei o o-dia-baleia p4 pondo uma vírgula, e ele
//       releu: "por mais que tem uma vírgula, a frase não faz sentido estar em duas legendas
//       diferentes". A vírgula arruma a gramática e não muda o que se vê.
//   2ª  corte só entre FRASES         → nasceu o o-dia-baleia p5, com "ELE ERA DA GAZETA
//       ESPORTIVA." pendurado numa moldura própria.
//   3ª  UMA caixa por painel no miolo → matou o defeito e junto com ele a diagramação: "acho
//       que ficou radical demais", com dezenas de painéis virando um bloco só de texto.
//   4ª  cada caixa, uma frase inteira, E cada uma cabendo em três linhas.
//
// O QUE MUDOU DA 2ª PARA A 4ª NÃO FOI A RÉGUA, FOI A CAUSA. O p5 não era um problema de corte:
// "ELE ERA DA GAZETA ESPORTIVA" nasceu porque a legenda não cabia e alguém expulsou o aposto
// para uma segunda caixa. Com o teto de três linhas barrando no PUT (legenda-tamanho.mjs), o
// texto é encurtado na origem — ali o aposto voltou para dentro da frase ("MESSIAS DE MELO, DA
// GAZETA ESPORTIVA, DESENHOU...") e a segunda caixa deixou de existir sozinha.
//
// TESTAMOS UMA RÉGUA DE DEPENDÊNCIA e o Raphael reprovou olhando: barrar a caixa que abre com
// conjunção, pronome ou verbo (sujeito elíptico) derrubava justamente os melhores remates da
// série — "E SUMIU." depois da taça exposta, "TERMINOU 4 A 0." depois do 3 a 0 do intervalo,
// "FORAM DUZENTAS." depois do dia inteiro atendendo ligação. Numa moldura só, esses viram
// parágrafo; separados, são o segundo tempo da piada. Não reintroduza essa régua. Ela aceitava
// corte na VÍRGULA, com o argumento de que a pontuação já marcava a pausa. O Raphael releu o
// mesmo painel do o-dia-baleia depois do conserto e disse o óbvio: a vírgula arruma a gramática
// e não muda o que se vê, porque **uma frase só continua ocupando duas molduras**. Caixa é
// moldura, não linha; o leitor lê a primeira e ela não terminou.
//
// A CAUSA RAIZ CONTINUA SENDO O TAMANHO. Medido no acervo: a legenda de um painel
// tem 81 caracteres na mediana e chega a 166, e 74 dos 159 painéis com frase partida nem cabem
// numa caixa de três linhas depois de juntados. Quem escreveu não quis dois tempos de leitura:
// quis fazer caber. Por isso a régua do TAMANHO (uma frase que não cabe em três linhas está
// longa demais para um painel) é irmã desta, e as duas são barradas no PUT.
//
// CORREÇÃO DE ROTA (18/08/2026): a calibragem inicial dizia "zero apontamentos nos 99
// quadrinhos publicados", e isso era ausência de dado lido como sinal de qualidade — NENHUM
// quadrinho publicado usa `legendaPorCodigo`, e os 704 painéis com legenda são todos do lote
// novo. Não há acervo aprovado servindo de referência aqui: a régua sai do julgamento
// editorial, não da comparação.

import { legendaPorCodigo } from './quadrinho-config.mjs'

// Pontuação que FECHA uma FRASE. Só terminal: vírgula, ponto e vírgula e dois-pontos ficaram
// de fora na revisão de 18/08/2026, porque eles marcam pausa DENTRO da frase — e uma pausa
// dentro da frase não justifica uma segunda moldura.
const FECHA = /[.!?…]$/

// Conjunção abrindo o bloco seguinte: o que vem depois dela é continuação da oração anterior.
const ABRE_COM_CONJUNCAO = /^(E|MAS|OU|PORÉM|POREM|PORQUE|POIS|ENQUANTO|EMBORA|ENTÃO|ENTAO)[ ,]/i

// Palavra funcional NUNCA termina uma caixa: ela pede o que vem depois. Vale inclusive na
// capa, onde o resto da regra afrouxa.
const FUNCIONAL = new Set([
  'DE', 'DA', 'DO', 'DAS', 'DOS', 'EM', 'NA', 'NO', 'NAS', 'NOS', 'NUM', 'NUMA',
  'A', 'O', 'AS', 'OS', 'AO', 'AOS', 'À', 'ÀS', 'UM', 'UMA', 'UNS', 'UMAS',
  'COM', 'SEM', 'POR', 'PARA', 'PRA', 'PRO', 'PELO', 'PELA', 'PELOS', 'PELAS',
  'ENTRE', 'SOBRE', 'SOB', 'ATÉ', 'ATE', 'DESDE', 'CONTRA', 'APÓS', 'APOS', 'PERANTE',
  'E', 'MAS', 'OU', 'QUE', 'SE', 'COMO', 'QUANDO', 'ONDE', 'CUJO', 'CUJA',
  'SEU', 'SUA', 'SEUS', 'SUAS', 'MEU', 'MINHA', 'ESSE', 'ESSA', 'ESTE', 'ESTA', 'AQUELE', 'AQUELA',
])

// Teto de caixas no miolo. Não é régua de leitura, é de diagramação.
const MAX_CAIXAS = 2

const limpar = (lista) => (lista || []).map((t) => String(t || '').trim()).filter(Boolean)

const ultimaPalavra = (t) => (t.toUpperCase().match(/[A-ZÁÀÂÃÉÊÍÓÔÕÚÜÇ]+$/) || [''])[0]

// O corte entre a caixa `a` e a caixa `b` é legítimo? Devolve null, ou { motivo, dica }.
//
// A DICA VEM JUNTO DO MOTIVO de propósito. A primeira versão tinha um texto de conserto só,
// escrito para o caso do miolo ("junte as duas numa caixa"), e ele apareceu colado a uma
// reprovação de CAPA, onde o conserto é outro (tirar a conjunção, não juntar). Mensagem de gate
// que descreve o conserto errado custa mais tempo do que gate nenhum: manda consertar o que não
// está quebrado.
//
// `capa` afrouxa a régua da frase, e só ela: no primeiro painel a manchete pode ocupar dois
// blocos, porque ali eles se leem como manchete de jornal — setup e virada ("O TIME APELIDADO
// DE PEIXE" / "TEM UMA BALEIA COMO MASCOTE"), ou manchete + TARJA de lugar e data ("...NASCEU
// DE UM ANÚNCIO DE JORNAL" / "BARCELONA, 1899"). A decisão é do Raphael, 18/08/2026: dois
// blocos valem "apenas se não ficar confuso ou sem sentido as frases".
//
// O QUE SEGUE BARRADO NA CAPA são as duas formas de bloco que NÃO se leem sozinhas:
//   - a caixa que acaba em palavra funcional (sintagma partido no meio);
//   - a caixa seguinte que abre com CONJUNÇÃO ("E CHEGOU À SÉRIE A", "PORQUE NINGUÉM TINHA UMA
//     BOLA"): conjunção inicial diz, por definição, que aquilo é a continuação da oração de
//     cima, e o bloco vira um pedaço solto.
// Preposição abrindo o segundo bloco ("SEM TOCAR NA BOLA UMA VEZ") NÃO é barrada: às vezes é
// remate de manchete e às vezes é adjunto pendurado, e a diferença é do olho. Essa fica como
// apontamento do varrer-legendas.mjs, não como erro.
export function problemaNoCorte(a, b, { capa = false } = {}) {
  const fim = ultimaPalavra(a)
  if (FUNCIONAL.has(fim)) {
    return {
      motivo: `a caixa termina em "${fim}", que pede o que vem depois: o corte parte o sintagma no meio`,
      dica: 'Mova a palavra para a caixa seguinte, ou junte as duas: nenhum leitor para de ler numa preposição.',
    }
  }
  if (capa) {
    // a conjunção só denuncia continuação quando a caixa anterior NÃO fechou. Com o ponto lá,
    // "ENTÃO ELES FUNDARAM UM CLUBE PARA TODO MUNDO" é uma frase inteira (o-dia-inter), e
    // barrá-la era falso positivo — o tipo de ruído que faz um gate deixar de ser lido.
    if (FECHA.test(a)) return null
    if (!ABRE_COM_CONJUNCAO.test(`${b} `)) return null
    return {
      motivo: `a caixa seguinte abre com conjunção ("${b.split(/\s+/)[0]}"), então ela é a continuação desta e não se lê sozinha`,
      dica: 'Na CAPA a manchete PODE ocupar dois blocos, desde que cada um se leia sozinho. Aqui o conserto '
        + 'costuma ser tirar a conjunção e deixar o bloco de pé ("E A ARBITRAGEM VALIDOU" vira "A ARBITRAGEM '
        + 'VALIDOU"), ou pôr ponto no fim do primeiro bloco. Juntar tudo numa caixa também resolve.',
    }
  }
  if (FECHA.test(a)) return null
  return {
    motivo: 'a frase continua na caixa seguinte: cada caixa é uma moldura, e uma frase só não se divide em duas',
    dica: 'A vírgula no fim não resolve, porque a frase segue na moldura de baixo. Não quebre por TAMANHO, o '
      + 'código já quebra em linhas e encolhe o corpo sozinho. Junte as duas numa caixa só; se aí não couber, o '
      + 'texto está longo demais para um painel, e o conserto é cortar palavra ou virar duas frases de verdade.',
  }
}

// Todos os cortes ruins de UM painel. `capa` = é o primeiro painel do carrossel.
//
// No MIOLO cabem até DUAS caixas, e cada uma precisa ser uma frase inteira. O teto de duas é de
// diagramação: três molduras empilhadas comem a arte e a pilha passa a competir com o desenho.
export function cortesRuins(legendas, { capa = false } = {}) {
  const L = limpar(legendas)
  if (!capa && L.length > MAX_CAIXAS) {
    return [{
      i: MAX_CAIXAS - 1,
      a: L[MAX_CAIXAS - 1],
      b: L[MAX_CAIXAS],
      motivo: `o painel tem ${L.length} caixas de legenda, e no miolo cabem ${MAX_CAIXAS}`,
      dica: 'Três molduras empilhadas comem a arte. Junte duas das frases numa caixa só, ou leve a '
        + 'terceira para o painel seguinte.',
    }]
  }
  const ruins = []
  for (let i = 0; i < L.length - 1; i++) {
    const problema = problemaNoCorte(L[i], L[i + 1], { capa })
    if (problema) ruins.push({ i, a: L[i], b: L[i + 1], ...problema })
  }
  return ruins
}

// A REDE: junta as caixas cujo corte é ilegítimo, para que o slide saia com a frase inteira
// numa caixa só mesmo quando o dado está errado. Não conserta o dado (o texto pode ficar longo
// demais e virar parede) — quem conserta é o gate do PUT, que obriga a decidir na escrita.
// Esta função existe pro que já está gravado e pro que entrar por fora da API.
export function unirCortesRuins(legendas, { capa = false } = {}) {
  const L = limpar(legendas)
  if (!capa && L.length > MAX_CAIXAS) return [...L.slice(0, MAX_CAIXAS - 1), L.slice(MAX_CAIXAS - 1).join(' ')]
  const saida = []
  for (const t of L) {
    const ant = saida[saida.length - 1]
    if (ant && problemaNoCorte(ant, t, { capa })) saida[saida.length - 1] = `${ant} ${t}`
    else saida.push(t)
  }
  return saida
}

// O GATE do PUT: devolve a mensagem do primeiro painel com corte ruim, ou null.
//
// SÓ VALE COM `legendaPorCodigo`, igual ao gate irmão do tamanho. A régua é sobre a CAIXA
// desenhada no export: quando quem escreve a legenda é o modelo de imagem, o campo `legendas`
// não vira moldura nenhuma (o motor de prompt nem o lê), e reprovar ali seria barrar um texto
// que não chega à arte. Hoje nenhum quadrinho do acervo está nesse estado — os 125 que têm
// `legendas` declaram `legendaPorCodigo` —, mas os dois gates precisam concordar sobre o que
// estão medindo, senão o mesmo quadrinho passa num e reprova no outro.
export function problemaNasLegendas(quad) {
  if (!legendaPorCodigo(quad)) return null
  const paineis = quad?.paineis || []
  // a CAPA é o primeiro painel do carrossel, e é ele que carrega a fórmula de manchete. Sai
  // do menor `numero` (e não do índice 0) porque a ordem do array já veio trocada por edição.
  const primeiro = Math.min(...paineis.map((p) => Number(p?.numero) || 0).filter((n) => n > 0))
  for (const p of paineis) {
    const capa = Number(p?.numero) === primeiro
    const [ruim] = cortesRuins(p?.legendas, { capa })
    if (!ruim) continue
    return `Quadrinho "${quad.id}", painel ${p.numero}${capa ? ' (capa)' : ''}: ${ruim.motivo}.\n`
      + `  [${ruim.a}]\n  [${ruim.b}]\n  ${ruim.dica}`
  }
  return null
}
