// QUEM É "ELE"? — O CARROSSEL QUE CONTA A HISTÓRIA INTEIRA SEM DIZER DE QUEM É.
//
// POR QUE EXISTE: o `o-dia-goleiro-artilheiro` narrava os 131 gols do Rogério Ceni em cinco
// painéis e não escrevia "Rogério Ceni" em nenhum deles. O leitor via isto, nesta ordem:
//
//     [O DIA EM QUE UM GOLEIRO FEZ 131 GOLS]  [BRASIL]
//     [ELE SUBIA PARA BATER AS FALTAS E OS PÊNALTIS.]
//     [ELE TERMINOU A CARREIRA COM 131 GOLS.]
//
// O Raphael leu e disse que ficava "misterioso", que é exatamente o efeito: o nome morava só na
// legenda do POST, que o Instagram esconde atrás do "mais" e o TikTok corta. O carrossel tem que
// se sustentar sozinho.
//
// A REGRA JÁ EXISTIA E A RÉGUA ERA CEGA. A §4 do SERIE-O-DIA-EM-QUE.md manda nomear desde
// 05/08/2026, e o `asset doutor` tinha um bloco medindo isso desde 12/08/2026 — que devolvia
// ZERO no dia em que este episódio foi lido. Dois filtros o cegavam, e os dois pareciam
// inofensivos quando foram escritos:
//
//   `if (!elenco.length) continue`   procurava o nome do PERSONAGEM CADASTRADO no texto. 97 dos
//                                    123 episódios têm `elenco: []` — e não por descuido: peça
//                                    sobre gente sem ficha no acervo (que é o caso do Ceni, que
//                                    aparece de costas e de longe justamente por isso) nasce com
//                                    elenco vazio. A régua checava só os 26 que menos precisavam.
//   `if (!/O Dia Em Que|.../)`       filtrava por SELO, então tirinha e bastidor ficavam de fora.
//                                    O `song-dois-passos` (Bastidores) tem os três personagens
//                                    cadastrados e escreve "O CAPITÃO CHAMA ALGUÉM" / "UM DELES
//                                    ENTENDEU QUE ERA COM ELE" / "NÃO ERA".
//
// A LIÇÃO É A DA CASA, e vale mais que o gate: **cobertura parcial que não se declara lê como
// completa**. "CARROSSEL QUE NUNCA NOMEIA O PROTAGONISTA: 0" não queria dizer que o acervo
// estava limpo, queria dizer que a régua olhava 21% dele. Por isso a fonte de nomes aqui não é
// mais o cadastro: é o TEXTO que o próprio quadrinho já carrega.
//
// A FONTE DE NOMES É A LEGENDA DO POST. Ela existe em todo quadrinho, é escrita em prosa (com
// maiúscula, ao contrário das caixas, que são todas em caixa alta e não dão para distinguir
// nome próprio de palavra comum) e, por regra da casa, leva o nome REAL de quem aparece. Se um
// nome está bom o bastante para a descrição, ele está bom o bastante para o painel.
//
// DUAS RÉGUAS, e a diferença entre elas é a diferença entre barrar e avisar:
//
//   ANÔNIMO   nenhum nome da legenda do post aparece em painel NENHUM. É o caso inequívoco, e
//             por isso BARRA no PUT. Medido no acervo inteiro (125 quadrinhos com caixa de
//             legenda, 70 deles publicados): 3 apontamentos, os 3 reais, zero falso positivo.
//   SÓ-CAPA   o nome aparece na capa e some do painel 2 em diante. Isto AVISA e não barra: a
//             §3 da série deixa a capa guardar o nome de propósito, e episódio cujo miolo fala
//             do "clube" depois de a capa dizer qual clube é legítimo. Medido: 20 casos, a
//             maioria deles boa. Gate que barra 20 casos bons vira opt-out automático.
//
// O OPT-OUT É `protagonistaSemNome`, com o motivo escrito, e os casos legítimos são três: menor
// de idade (que a casa não nomeia por regra), protagonista coletivo, e o anônimo de fonte —
// ninguém sabe quem escondeu o arquivo em 1925, e é disso que o episódio vive.
//
// O QUE ISTO NÃO MEDE: se o nome vem com APOSTO ("o atacante húngaro que fugiu do regime"). A
// §4 da série exige, e detectar aposto por texto dá falso positivo demais — continua sendo
// leitura humana.

import { legendaPorCodigo } from './quadrinho-config.mjs'

const semAcento = (s) => String(s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '')
export const chaveDeBusca = (s) => semAcento(s).toUpperCase()

// Palavras que abrem frase ou sentença em português e por isso saem maiúsculas sem serem nome
// próprio. A lista é curta de propósito: ela só precisa cobrir o que aparece de fato nas
// legendas de post da casa (CTA, data por extenso, número escrito). Nome que escapar daqui vira
// candidato, e candidato a mais só torna a régua mais PERMISSIVA (basta um casar para o
// quadrinho passar), nunca mais agressiva.
const NAO_E_NOME = new Set((
  'SALVA MANDA SEGUE COMENTA MARCA COMPARTILHA SE SEM COM PARA POR DEPOIS ANTES ENTRE CONTRA '
  + 'SOBRE SOB DESDE ATE APOS QUANDO ONDE COMO PORQUE ISSO ELE ELA ELES ELAS ESSE ESSA ESTE '
  + 'ESTA AQUELE AQUELA NAO SIM FOI ERA TEM TINHA MAS QUE QUEM TODO TODA TUDO UMA UNS HOJE '
  + 'ONTEM AINDA NUNCA SEMPRE APENAS EXISTE DEU VEZ VEZES NENHUM NUMA NUM DOIS DUAS TRES '
  + 'QUATRO CINCO SEIS SETE OITO NOVE DEZ CEM MIL JANEIRO FEVEREIRO MARCO ABRIL MAIO JUNHO '
  + 'JULHO AGOSTO SETEMBRO OUTUBRO NOVEMBRO DEZEMBRO SEGUNDA TERCA QUARTA QUINTA SEXTA SABADO '
  + 'DOMINGO ANO ANOS DIA DIAS JOGO JOGOS GOL GOLS TIME TIMES CLUBE COPA LIGA FINAL TITULO '
  + 'CAMPEAO TORCIDA TORCEDOR BOLA CAMPO ESTADIO JUIZ ARBITRO TECNICO JOGADOR GOLEIRO ATACANTE '
  + 'ZAGUEIRO PRESIDENTE PARTIDA PARTIDAS PONTO PONTOS TRILHA KEVIN MACLEOD'
).split(' '))

// Os nomes próprios que a legenda do post cita. Hashtag e link saem antes: `#RogérioCeni` não
// conta como o nome ter sido escrito (é etiqueta de busca, não texto lido), e deixá-la valer
// faria a régua aprovar exatamente o quadrinho que ela existe para pegar.
export function nomesCitados(texto) {
  const limpo = String(texto || '').replace(/#\S+/g, ' ').replace(/https?:\/\/\S+/g, ' ')
  const achados = []
  const re = /(?<![\p{L}\d])(\p{Lu}[\p{L}'’-]{2,})/gu
  let m
  while ((m = re.exec(limpo))) {
    const nome = chaveDeBusca(m[1])
    if (NAO_E_NOME.has(nome)) continue
    if (!achados.includes(nome)) achados.push(nome)
  }
  return achados
}

// Todo o texto que o leitor vê DESENHADO no painel: caixas de legenda e balões de fala.
const textoDoPainel = (p) => [
  ...(p?.legendas || []),
  ...(p?.falas || []).map((f) => (typeof f === 'string' ? f : f?.texto)),
].filter(Boolean).join(' ')

// O primeiro painel é a CAPA, e ela tem regra própria (§3 da série: pode guardar o nome). Sai do
// menor `numero` e não do índice 0 porque a ordem do array já veio trocada por edição.
function capaEMiolo(paineis) {
  const numeros = paineis.map((p) => Number(p?.numero) || 0).filter((n) => n > 0)
  const primeiro = numeros.length ? Math.min(...numeros) : 1
  return {
    capa: chaveDeBusca(paineis.filter((p) => Number(p?.numero) === primeiro).map(textoDoPainel).join(' ')),
    miolo: chaveDeBusca(paineis.filter((p) => Number(p?.numero) !== primeiro).map(textoDoPainel).join(' ')),
  }
}

// O laudo completo, para a varredura e para o doutor. `null` quando não há o que medir.
export function laudoDeNomes(quad) {
  if (!legendaPorCodigo(quad)) return null          // legenda DESENHADA: o texto não está no JSON
  const paineis = quad?.paineis || []
  if (paineis.length < 2) return null               // peça de um painel não tem miolo
  const citados = nomesCitados(quad?.legenda)
  if (!citados.length) return null                  // sem nome na descrição não há o que exigir
  const { capa, miolo } = capaEMiolo(paineis)
  return {
    citados,
    noMiolo: citados.filter((n) => miolo.includes(n)),
    soNaCapa: citados.filter((n) => capa.includes(n) && !miolo.includes(n)),
    foraDaArte: citados.filter((n) => !capa.includes(n) && !miolo.includes(n)),
    dispensado: String(quad?.protagonistaSemNome || '').trim(),
  }
}

// A RÉGUA QUE BARRA NO PUT: a história não diz de quem é em painel nenhum.
export function problemaNoAnonimato(quad) {
  const laudo = laudoDeNomes(quad)
  if (!laudo || laudo.dispensado) return null
  if (laudo.noMiolo.length || laudo.soNaCapa.length) return null
  return `Quadrinho "${quad.id}": nenhum nome citado na legenda do post aparece nos painéis.\n`
    + `  a descrição diz: ${laudo.citados.slice(0, 6).join(', ')}\n`
    + '  o carrossel conta a história por "ele" e o nome fica só na legenda do post, que o\n'
    + '  Instagram esconde atrás do "mais" e o TikTok corta. Nomeie no painel 2, junto com quem\n'
    + '  a pessoa É (o que faz, de onde vem, por que importa aqui) — isso quase sempre já está\n'
    + '  no campo `contexto`, vindo da checagem. Zero geração: a legenda é vetorial.\n'
    + '  Caso legítimo (menor de idade, protagonista coletivo, anônimo de fonte): declare o\n'
    + '  motivo em `protagonistaSemNome`.'
}
