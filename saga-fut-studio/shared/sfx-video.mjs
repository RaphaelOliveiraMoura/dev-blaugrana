// A FICHA DE CADA SOM DO ACERVO. Fonte ÚNICA: usada pelo script que baixa (scripts/audio/
// baixar-sons.mjs), pela API que lista pro studio e por quem escreve roteiro.
//
// Espelha `musica-quadrinho.mjs` de propósito, e pelo mesmo motivo: o nome do arquivo não diz o
// que o som É nem QUANDO usar. "crowd-2.mp3" e "crowd-4.mp3" são indistinguíveis de fora, e a
// única forma de escolher seria ouvir os vinte.
//
// O acervo é reconstruível a partir daqui (`node scripts/audio/baixar-sons.mjs`), porque `*.mp3`
// está no .gitignore: o que se versiona é ESTA lista, não os arquivos.
//
// ## Por que todo som carrega `licenca` e `risco`
//
// São duas perguntas diferentes e as duas só têm resposta na hora em que o som ENTRA no acervo.
// Depois ninguém lembra de onde veio: os cinco sons que já existiam em remotion/assets/sfx não
// têm procedência nenhuma registrada, e por isso não dá pra afirmar que são seguros.
//
//   licenca: cc0    domínio público, sem crédito obrigatório (é o único que o buscador aceita)
//            cc-by  livre, crédito OBRIGATÓRIO no CREDITOS.md
//            nossa  gerada aqui (voz do Eddy, síntese por código)
//
//   risco:   livre     pode ir pra qualquer plataforma, inclusive YouTube monetizado
//            tolerado  meme já viral, sem dono claro: TikTok e Reels sim, YouTube não
//            evitar    música comercial ou transmissão de TV: não entra, e o PUT recusa
//
// O vídeo herda o PIOR risco dos sons que usa. Um som sem esses dois campos não é "provavelmente
// ok", é desconhecido, e desconhecido é tratado como `evitar`.
//
// Hoje o acervo inteiro é `cc0` + `livre`, e é assim que ele deve continuar até alguém decidir o
// contrário por escrito.

export const CATEGORIAS = {
  ambiente: { rotulo: 'Ambiente', desc: 'leito contínuo que roda por baixo da cena inteira' },
  torcida: { rotulo: 'Torcida', desc: 'reação coletiva: comemoração, vaia, aplauso' },
  jogo: { rotulo: 'Jogo', desc: 'apito, buzina, vuvuzela: o vocabulário do estádio' },
  cena: { rotulo: 'Cena', desc: 'porta, celular, passos, câmera: o mundo fora do campo' },
  pontuacao: { rotulo: 'Pontuação', desc: 'boing, swoosh, caixa: sublinha a piada' },
}

// `seg` é a duração ORIGINAL do arquivo, e ela importa na hora de escrever o roteiro: um som de
// 138s posto num shot de 3s toca 3s e corta, mas um som de 0,5s esticado não existe.
// `vol` é o volume padrão sugerido no mix (1 = cheio). Ambiente entra baixo por definição, senão
// engole a voz.
//
// ## `continuo`: o campo que decide se o som pode acabar sozinho (14/08/2026)
//
// Os sons são de duas naturezas, e tratá-los igual foi o defeito que o `ferran-amor` mostrou.
//
//   EVENTO (apito, buzina, flash, porta, boing): o arquivo é a coisa inteira, do ataque ao
//   decaimento. Deixar tocar até o fim é o comportamento certo, inclusive atravessando o corte.
//
//   LEITO (`continuo: true` — passos, relógio, torcida, fotógrafos): o arquivo é um pedaço
//   ARBITRÁRIO de uma tomada longa. Ele não acaba, ele PARA quando o gravador parou. Deixar tocar
//   até o fim do arquivo é deixar um número aleatório decidir quando o som some.
//
// Foi assim que o Ferran andou com som de passo e continuou soando 3,6s depois de parar: `passos`
// tem 10,5s de arquivo, entrou aos 10,53s, e nada no motor sabia que aquilo tinha que terminar
// junto com a caminhada. Hoje som `continuo` é cortado no fim da CENA, e o de locomoção nem se
// declara mais (ver `locomocao` abaixo).
//
// `locomocao: true` marca o som que o composer DERIVA do movimento. Ele não se declara no roteiro:
// o motor já sabe, frame a frame, quem está andando, e emite o som exatamente nessa janela.
export const SONS = [
  // ---- ambiente: o leito. Um por cena, volume baixo, é o que faz o corte não soar a vácuo.
  { id: 'estadio-ambiente', arquivo: 'estadio-ambiente.mp3', cat: 'ambiente', seg: 138, vol: 0.35, loop: true, continuo: true,
    uso: 'leito de qualquer cena em estádio, e serve de burburinho genérico de multidão',
    titulo: 'voetbalstad.aiff', autor: 'facemusic', licenca: 'cc0', risco: 'livre',
    url: 'https://cdn.freesound.org/previews/39/39972_402676-hq.mp3',
    pagina: 'https://freesound.org/people/facemusic/sounds/39972' },
  { id: 'vento', arquivo: 'vento.mp3', cat: 'ambiente', seg: 41, vol: 0.3, loop: true, continuo: true,
    uso: 'vazio, abandono, o beat de silêncio depois da punchline',
    titulo: 'Looping Gentle Wind Ambience on an Open Desert Plain', autor: 'dhallcomposer', licenca: 'cc0', risco: 'livre',
    url: 'https://cdn.freesound.org/previews/697/697217_7678208-hq.mp3',
    pagina: 'https://freesound.org/people/dhallcomposer/sounds/697217' },
  { id: 'chuva', arquivo: 'chuva.mp3', cat: 'ambiente', seg: 42, vol: 0.35, loop: true, continuo: true,
    uso: 'melancolia, derrota, eliminação',
    titulo: 'Rain Ambience', autor: 'nick121087', licenca: 'cc0', risco: 'livre',
    url: 'https://cdn.freesound.org/previews/234/234317_3840537-hq.mp3',
    pagina: 'https://freesound.org/people/nick121087/sounds/234317' },

  // ---- torcida: reação coletiva. Entra POR CIMA do ambiente, não no lugar dele.
  { id: 'torcida-comemora', arquivo: 'torcida-comemora.mp3', cat: 'torcida', seg: 13.2, vol: 0.8, continuo: true,
    uso: 'gol, título, entrada em campo',
    titulo: 'Crowd Cheering', autor: 'SoundsExciting', licenca: 'cc0', risco: 'livre',
    url: 'https://cdn.freesound.org/previews/365/365132_3279490-hq.mp3',
    pagina: 'https://freesound.org/people/SoundsExciting/sounds/365132' },
  { id: 'torcida-comemora-curta', arquivo: 'torcida-comemora-curta.mp3', cat: 'torcida', seg: 7.7, vol: 0.8, continuo: true,
    uso: 'a mesma comemoração quando o beat é curto e não cabe a longa',
    titulo: 'Short Crowd Cheer 2', autor: 'qubodup', licenca: 'cc0', risco: 'livre',
    url: 'https://cdn.freesound.org/previews/182/182572_71257-hq.mp3',
    pagina: 'https://freesound.org/people/qubodup/sounds/182572' },
  { id: 'torcida-vaia', arquivo: 'torcida-vaia.mp3', cat: 'torcida', seg: 16.2, vol: 0.8, continuo: true,
    uso: 'dirigente, arbitragem, jogador saindo de campo',
    titulo: 'Crowd Booing 3', autor: 'mrrap4food', licenca: 'cc0', risco: 'livre',
    url: 'https://cdn.freesound.org/previews/619/619047_781461-hq.mp3',
    pagina: 'https://freesound.org/people/mrrap4food/sounds/619047' },
  { id: 'aplauso', arquivo: 'aplauso.mp3', cat: 'torcida', seg: 6.3, vol: 0.7, continuo: true,
    uso: 'aplauso educado: apresentação, coletiva, homenagem. NÃO é comemoração',
    titulo: 'Applause 2', autor: 'Sandermotions', licenca: 'cc0', risco: 'livre',
    url: 'https://cdn.freesound.org/previews/277/277021_1402315-hq.mp3',
    pagina: 'https://freesound.org/people/Sandermotions/sounds/277021' },

  // ---- jogo
  { id: 'apito', arquivo: 'apito.mp3', cat: 'jogo', seg: 0.5, vol: 0.9,
    uso: 'início, fim, falta. Curto o bastante pra pontuar um corte',
    titulo: 'Referee whistle sound', autor: 'Rosa-Orenes256', licenca: 'cc0', risco: 'livre',
    url: 'https://cdn.freesound.org/previews/538/538422_11966684-hq.mp3',
    pagina: 'https://freesound.org/people/Rosa-Orenes256/sounds/538422' },
  { id: 'buzina', arquivo: 'buzina.mp3', cat: 'jogo', seg: 2.8, vol: 0.85,
    uso: 'buzina de torcida; também serve de pontuação cômica no lugar de um sting',
    titulo: 'Air Horn Hype', autor: 'zar.265', licenca: 'cc0', risco: 'livre',
    url: 'https://cdn.freesound.org/previews/581/581334_11304525-hq.mp3',
    pagina: 'https://freesound.org/people/zar.265/sounds/581334' },
  { id: 'vuvuzela', arquivo: 'vuvuzela.mp3', cat: 'jogo', seg: 5.9, vol: 0.7, continuo: true,
    uso: 'torcida caricata, deboche',
    titulo: 'Vuvuzela', autor: 'nomerodin1', licenca: 'cc0', risco: 'livre',
    url: 'https://cdn.freesound.org/previews/557/557277_9855978-hq.mp3',
    pagina: 'https://freesound.org/people/nomerodin1/sounds/557277' },

  // ---- cena: o mundo fora do campo. É o que faz uma esquete acontecer num LUGAR.
  { id: 'porta-batida', arquivo: 'porta-batida.mp3', cat: 'cena', seg: 1.9, vol: 0.9,
    uso: 'alguém chegando; três batidas com pressa',
    titulo: 'Door Knock - with urgency', autor: 'FreqMan', licenca: 'cc0', risco: 'livre',
    url: 'https://cdn.freesound.org/previews/144/144510_92661-hq.mp3',
    pagina: 'https://freesound.org/people/FreqMan/sounds/144510' },
  { id: 'porta-abre', arquivo: 'porta-abre.mp3', cat: 'cena', seg: 1, vol: 0.85,
    uso: 'porta abrindo, revelação de quem estava atrás dela',
    titulo: 'Door - Creak', autor: 'JarredGibb', licenca: 'cc0', risco: 'livre',
    url: 'https://cdn.freesound.org/previews/219/219499_4056007-hq.mp3',
    pagina: 'https://freesound.org/people/JarredGibb/sounds/219499' },
  { id: 'celular', arquivo: 'celular.mp3', cat: 'cena', seg: 3.8, vol: 0.8, continuo: true,
    uso: 'celular tocando no meio da cena; interrompe quem está falando',
    titulo: 'Phone Ringtone', autor: 'NeoSpica', licenca: 'cc0', risco: 'livre',
    url: 'https://cdn.freesound.org/previews/504/504611_7704891-hq.mp3',
    pagina: 'https://freesound.org/people/NeoSpica/sounds/504611' },
  { id: 'flash', arquivo: 'flash.mp3', cat: 'cena', seg: 1.6, vol: 0.8,
    uso: 'UM clique de câmera, pra pontuar uma pose',
    titulo: 'Camera Shutter Click', autor: 'Kodack', licenca: 'cc0', risco: 'livre',
    url: 'https://cdn.freesound.org/previews/271/271010_2276808-hq.mp3',
    pagina: 'https://freesound.org/people/Kodack/sounds/271010' },
  { id: 'fotografos', arquivo: 'fotografos.mp3', cat: 'cena', seg: 9.6, vol: 0.7, continuo: true,
    uso: 'rajada de cliques: chegada, coletiva, apresentação de reforço',
    titulo: 'camera shutter fast', autor: 'semccab', licenca: 'cc0', risco: 'livre',
    url: 'https://cdn.freesound.org/previews/154/154374_2592496-hq.mp3',
    pagina: 'https://freesound.org/people/semccab/sounds/154374' },
  { id: 'passos', arquivo: 'passos.mp3', cat: 'cena', seg: 10.5, vol: 0.5, continuo: true, locomocao: true,
    // 0.5 e não 0.7: agora que o passo é DERIVADO, ele aparece em todo deslocamento em vez de
    // ser escolhido beat a beat, então errar por excesso passou a custar mais. O 0.7 vinha de
    // quando era pontual; nas duas vezes em que alguém plantou passo à mão, escolheu ~0.45.
    uso: 'chegada e saída de personagem a pé (DERIVADO do movimento: não declare no roteiro)',
    titulo: 'Footsteps Walking', autor: 'deleted_user_7146007', licenca: 'cc0', risco: 'livre',
    url: 'https://cdn.freesound.org/previews/383/383660_7146007-hq.mp3',
    pagina: 'https://freesound.org/people/deleted_user_7146007/sounds/383660' },
  { id: 'relogio', arquivo: 'relogio.mp3', cat: 'cena', seg: 5.9, vol: 0.6, continuo: true,
    uso: 'espera, silêncio constrangedor, o beat de nada depois da piada',
    titulo: 'Clock ticking', autor: 'olver', licenca: 'cc0', risco: 'livre',
    url: 'https://cdn.freesound.org/previews/130/130388_2037384-hq.mp3',
    pagina: 'https://freesound.org/people/olver/sounds/130388' },

  // ---- pontuação
  { id: 'caixa-registradora', arquivo: 'caixa-registradora.mp3', cat: 'pontuacao', seg: 1.1, vol: 0.9,
    uso: 'dinheiro, preço, negociação: sublinha o número na tela',
    titulo: 'Cash register', autor: 'MaoDin204', licenca: 'cc0', risco: 'livre',
    url: 'https://cdn.freesound.org/previews/721/721774_15555277-hq.mp3',
    pagina: 'https://freesound.org/people/MaoDin204/sounds/721774' },
  { id: 'boing', arquivo: 'boing.mp3', cat: 'pontuacao', seg: 2.3, vol: 0.8,
    uso: 'tombo, susto, reação exagerada',
    titulo: 'Cartoon Boing', autor: 'reelworldstudio', licenca: 'cc0', risco: 'livre',
    url: 'https://cdn.freesound.org/previews/161/161122_2750714-hq.mp3',
    pagina: 'https://freesound.org/people/reelworldstudio/sounds/161122' },
  { id: 'swoosh', arquivo: 'swoosh.mp3', cat: 'pontuacao', seg: 0.5, vol: 0.8,
    uso: 'transição, entrada rápida, whip pan',
    titulo: 'Swosh swoosh whoosh air sound', autor: 'qubodup', licenca: 'cc0', risco: 'livre',
    url: 'https://cdn.freesound.org/previews/60/60026_71257-hq.mp3',
    pagina: 'https://freesound.org/people/qubodup/sounds/60026' },
]

// TRILHA: as 65 faixas do Kevin MacLeod já estavam no acervo, usadas só em quadrinho. Aqui elas
// entram no vídeo pelo mesmo caminho de um efeito (id + `at` + `vol`), o que permite a coisa que a
// faixa de ambiente não permitia: música que ENTRA num beat específico, no frame exato da virada,
// em vez de rodar por baixo do vídeo inteiro.
//
// `local: true` = o arquivo já está no repo (baixado por scripts/baixar-musicas.mjs), então o
// baixar-sons não tenta buscar e não precisa de `url`.
//
// **CC BY**: crédito obrigatório na descrição do post, ao contrário do resto do acervo, que é CC0.
const TRILHAS = [
  { id: 'trilha-tristeza', arquivo: '../musica-quadrinhos/derrota-past-sadness.mp3', cat: 'trilha', seg: 141, vol: 0.5, local: true, continuo: true,
    uso: 'o fecho melancólico: alguém saindo, perdendo, indo embora',
    titulo: 'Past Sadness', autor: 'Kevin MacLeod', licenca: 'cc-by', risco: 'livre',
    pagina: 'https://incompetech.com/' },
  { id: 'trilha-luto', arquivo: '../musica-quadrinhos/memoria-heartbreaking.mp3', cat: 'trilha', seg: 143, vol: 0.5, local: true, continuo: true,
    uso: 'luto de verdade, sem ironia nenhuma',
    titulo: 'Heartbreaking', autor: 'Kevin MacLeod', licenca: 'cc-by', risco: 'livre',
    pagina: 'https://incompetech.com/' },
]
CATEGORIAS.trilha = { rotulo: 'Trilha', desc: 'música que entra num beat, não por baixo do vídeo todo' }
SONS.push(...TRILHAS)

/** Caminho do arquivo relativo à raiz de conteúdo (saga-fut/). */
export const caminhoDe = (som) => `assets/sons/${som.arquivo}`.replace('assets/sons/../', 'assets/')

export const porId = Object.fromEntries(SONS.map(s => [s.id, s]))

// O pior risco de uma lista de ids. É isto que o vídeo herda.
const ORDEM_RISCO = { livre: 0, tolerado: 1, evitar: 2 }
export function riscoDe (ids = []) {
  return (ids || []).reduce((pior, id) => {
    const r = porId[id]?.risco || 'evitar'   // som desconhecido não é "livre"
    return ORDEM_RISCO[r] > ORDEM_RISCO[pior] ? r : pior
  }, 'livre')
}
