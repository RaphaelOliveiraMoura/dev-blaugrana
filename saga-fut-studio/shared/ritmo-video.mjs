// Quanto cada painel segura na tela, derivado do TEXTO que ele põe lá.
//
// O tempo fixo trata a capa de três palavras e o painel de duas falas como a mesma coisa: um
// passa antes de ser lido, o outro sobra e a pessoa sai antes da virada. Num episódio de 6
// painéis a 5s isso é meio minuto de vídeo em que metade do tempo é espera.
//
// A conta é a da LEGENDAGEM profissional, caracteres por segundo: a Netflix trabalha com 17 CPS
// para adulto (13 para infantil), a BBC com 160 a 180 palavras por minuto, que dá quase o mesmo
// número, e a TED aceita até 21 CPS como teto. Os três ritmos daqui são exatamente esse intervalo:
// 21 é o limite de quem lê rápido e motivado, 17 é o confortável, 13 é o de quem precisa de folga.
//
// Somado a isso, um PISO por painel, que é o tempo de reconhecer o DESENHO antes de procurar o
// texto. Sem ele, painel sem legenda nenhuma duraria zero, e é justamente o painel mudo (a reação,
// o detalhe) que precisa de um beat pra funcionar.
//
// Os textos da casa são quase todos em caixa alta, que se lê uns 10% mais devagar que caixa baixa.
// Isso já está embutido na escolha dos CPS: não há detecção, e não deve haver.

export const RITMOS = {
  agil: {
    id: 'agil',
    nome: 'Ágil',
    cps: 21,
    piso: 0.8,
    min: 1.6,
    max: 5.5,
    nota: 'No limite de quem lê rápido (21 CPS, o teto que a TED aceita). Vídeo curto, replay provável, e quem não acompanhou volta. Bom pra piada de uma sacada só.',
  },
  padrao: {
    id: 'padrao',
    nome: 'Padrão',
    cps: 17,
    piso: 1,
    min: 2,
    max: 7,
    nota: 'O confortável da legendagem (17 CPS, o padrão da Netflix pra adulto). Lê-se de primeira sem sobrar tempo. É o ponto de partida.',
  },
  calmo: {
    id: 'calmo',
    nome: 'Calmo',
    cps: 13,
    piso: 1.3,
    min: 2.5,
    max: 9,
    nota: 'Folga de leitura (13 CPS). Vídeo mais longo, que é o que o YouTube conta como tempo assistido. Bom pra episódio de história densa, ruim pra piada.',
  },
}

export const RITMO_PADRAO = 'padrao'

// A capa é o gancho: se ela passa antes da pessoa entender do que se trata, o resto do vídeo não
// existe. O último painel é onde a virada acontece e onde se decide seguir ou comentar, e corte
// seco em cima do punchline rouba o beat.
const BONUS_CAPA = 0.6
const BONUS_FINAL = 0.8

export function ehRitmoDinamico(ritmo) {
  return !!ritmo && ritmo !== 'fixo' && !!RITMOS[ritmo]
}

// O RITMO DE UM QUADRINHO, com a AUSÊNCIA VALENDO PADRÃO (17 CPS), e não tempo fixo (19/08/2026).
//
// O tempo fixo era o padrão só porque veio antes: quadrinho novo nascia sem o campo, e a caixa
// "tempo de cada painel conforme o texto dele" começava desmarcada em toda peça. Quem escreve o
// roteiro não vê motivo pra abrir o acabamento e mexer nisso, então a escolha real era sempre a
// omissão, e o vídeo saía com a capa de três palavras segurando os mesmos 5s do painel de duas
// falas. Invertido o padrão, esquecer passa a dar o certo.
//
// Os 115 quadrinhos JÁ POSTADOS levam `videoRitmo: "fixo"` gravado (migração de 19/08/2026): eles
// foram ao ar em tempo fixo, e remontar um deles tem que devolver o vídeo que está publicado, não
// um vídeo novo. Por isso o passado é dado explícito, e não uma regra do tipo "se postado, fixo",
// que envelhece calada.
//
// Ritmo desconhecido cai no padrão em vez de virar tempo fixo: um `videoRitmo: "padrao "` com
// espaço sobrando é erro de escrita, e escolher o oposto do que a pessoa quis é a pior saída.
export function ritmoDoQuadrinho(quad) {
  const r = quad?.videoRitmo
  if (r === 'fixo') return 'fixo'
  return RITMOS[r] ? r : RITMO_PADRAO
}

// Todo texto que aparece na tela do painel: as caixas de legenda e o que está nos balões.
export function textoDoPainel(painel) {
  const legendas = (painel?.legendas || []).map((l) => String(l || ''))
  const falas = (painel?.falas || []).map((f) => String(f?.texto || ''))
  return [...legendas, ...falas].join(' ').replace(/\s+/g, ' ').trim()
}

// O teto vale sobre a LEITURA, e o bônus de posição entra por fora dele. Se o clamp viesse depois
// da soma, capa e desfecho ficariam presos no mesmo número dos painéis do meio e o bônus não
// existiria justamente nos dois painéis em que ele importa.
//
// `estourou` é a única saída honesta pro painel que pede mais tempo do que o teto dá: o texto não
// cabe no ritmo escolhido e alguém vai ler pela metade. Não dá pra corrigir sozinho (esticar o
// painel arrebenta o vídeo, encurtar o texto é decisão editorial), então vira aviso.
export function medirPainel({ texto, ritmo, ehCapa = false, ehFinal = false }) {
  const r = RITMOS[ritmo] || RITMOS[RITMO_PADRAO]
  const n = (texto || '').length
  const leitura = r.piso + n / r.cps
  const cortado = Math.min(r.max, Math.max(r.min, leitura))
  const bonus = (ehCapa ? BONUS_CAPA : 0) + (ehFinal ? BONUS_FINAL : 0)
  return {
    dur: Math.round((cortado + bonus) * 10) / 10,
    chars: n,
    pedia: Math.round(leitura * 10) / 10,
    estourou: leitura > r.max,
  }
}

export function duracaoPainel(opts) {
  return medirPainel(opts).dur
}

// A medida de cada painel de uma sequência, na ordem em que entram no vídeo.
//
// Com UM painel só (o post do quadro isolado), ele é capa e desfecho ao mesmo tempo e leva os dois
// bônus: ali não há sequência pra segurar a pessoa, o painel sozinho é o post inteiro.
export function medirPaineis(paineis, ritmo) {
  const ultimo = paineis.length - 1
  return paineis.map((p, i) => ({
    ...medirPainel({ texto: textoDoPainel(p), ritmo, ehCapa: i === 0, ehFinal: i === ultimo }),
    numero: p?.numero ?? i + 1,
  }))
}

export function duracoesDinamicas(paineis, ritmo) {
  return medirPaineis(paineis, ritmo).map((m) => m.dur)
}

export function somaTempos(durs) {
  return Math.round(durs.reduce((a, b) => a + b, 0) * 10) / 10
}
