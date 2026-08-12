// A FICHA DE CADA TRILHA DE QUADRINHO. Fonte ÚNICA, usada pelo script que baixa o acervo
// (scripts/baixar-musicas.mjs), pela API que lista pro studio e pelo modal de escolha.
//
// POR QUE EXISTE: o nome do arquivo não diz o que a faixa É. "tramoia-the-builder" e
// "tramoia-comic-plodding" são a mesma coisa lidas de fora, e a única forma de escolher era
// ouvir as 39 uma a uma. A ficha responde antes de tocar: que tom, quanto dura, se o público
// reconhece como meme, e em que beat ela serve.
//
// O acervo é reconstruível a partir daqui (`node scripts/baixar-musicas.mjs`), porque `*.mp3`
// está no .gitignore: o que se versiona é ESTA lista, não os arquivos.
//
// Todas são de Kevin MacLeod (incompetech.com), CC BY 4.0, e a atribuição é OBRIGATÓRIA. A
// linha pronta de cada uma sai no CREDITOS.md gerado ao lado dos arquivos.

// `tom` é o prefixo do nome do arquivo, e é por ele que se escolhe trilha na hora de montar o
// carrossel ("esse painel é deboche" / "esse é tramoia"). A ordem daqui é a ordem do modal:
// vai do mais usado (zoeira) pro mais pontual (sting).
// Os seis primeiros são COMÉDIA, que é o material do dia a dia. Os quatro últimos são a série
// "O Dia Em Que" quando ela conta uma história de verdade e não tem piada nenhuma: o gol do
// Iniesta com "Dani Jarque siempre con nosotros" por baixo da camisa não pede deboche, e o
// acervo cômico não tem UMA faixa que sirva. Foi essa lacuna que travou a escolha no o-dia-dani.
export const TONS = {
  zoeira: { rotulo: 'Zoeira', desc: 'deboche, gozação, vexame alheio' },
  tramoia: { rotulo: 'Tramoia', desc: 'VAR, arbitragem, janela de transferência' },
  epico: { rotulo: 'Épico', desc: 'gol, título, remontada' },
  suspense: { rotulo: 'Suspense', desc: 'pênalti, sorteio, expectativa' },
  derrota: { rotulo: 'Derrota', desc: 'eliminação, vexame próprio' },
  sting: { rotulo: 'Sting', desc: 'pontuação de 4 a 17s pro painel da virada' },
  memoria: { rotulo: 'Memória', desc: 'luto, homenagem, quem morreu; sem ironia nenhuma' },
  gloria: { rotulo: 'Glória', desc: 'triunfo com peso: a conquista que emociona em vez de empolgar' },
  historia: { rotulo: 'História', desc: 'fato antigo contado a sério, tom de documentário' },
  tensao: { rotulo: 'Tensão', desc: 'suspense SÉRIO, quando o que está em jogo é real' },
  caos: { rotulo: 'Caos', desc: 'pancadaria, confusão em campo, jogo que fugiu do controle' },
  resistencia: { rotulo: 'Resistência', desc: 'ditadura, censura, o clube contra o regime; grave e digno' },
}

// `arquivo` só aparece quando o nome do MP3 no servidor NÃO é o título + .mp3, que acontece em
// duas faixas e devolve 404 silencioso se você derivar do título.
export const CATALOGO = [
  // ------------------------------------------------------- ZOEIRA
  { tom: 'zoeira', slug: 'monkeys-spinning-monkeys', titulo: 'Monkeys Spinning Monkeys', dur: '2:05', viral: true,
    nota: 'O meme sound mais usado do TikTok. Deboche puro, serve em quase todo carrossel de zoeira.' },
  { tom: 'zoeira', slug: 'fluffing-a-duck', titulo: 'Fluffing a Duck', dur: '1:07', viral: true,
    nota: 'O "algo bobo acontecendo". Curta, casa com carrossel de 6 a 8 painéis sem cortar.' },
  { tom: 'zoeira', slug: 'merry-go', titulo: 'Merry Go', dur: '2:00', viral: false,
    nota: 'Carrossel de circo. Para quando o assunto é bagunça administrativa, diretoria, novela de transferência.' },
  { tom: 'zoeira', slug: 'spazzmatica-polka', titulo: 'Spazzmatica Polka', dur: '1:36', viral: true,
    nota: 'Polca acelerada de desenho animado. O tom do "deu tudo errado ao mesmo tempo".' },
  { tom: 'zoeira', slug: 'pixel-peeker-polka', titulo: 'Pixel Peeker Polka - faster', dur: '3:22', viral: true,
    nota: 'Prima da anterior, mais longa e menos frenética. Cobre carrossel grande inteiro.' },
  { tom: 'zoeira', slug: 'super-circus', titulo: 'Super Circus', dur: '0:38', viral: false,
    nota: 'Só 38s: é o tamanho de um carrossel curto, sem precisar cortar no meio de um compasso.' },

  // ------------------------------------------------------- TRAMOIA
  { tom: 'tramoia', slug: 'sneaky-snitch', titulo: 'Sneaky Snitch', dur: '2:17', viral: true,
    nota: 'Meme clássico de "fazendo coisa errada na surdina". O tom natural de piada de arbitragem.' },
  { tom: 'tramoia', slug: 'scheming-weasel', titulo: 'Scheming Weasel (faster version)', arquivo: 'Scheming Weasel faster.mp3', dur: '1:29', viral: true,
    nota: 'A versão rápida é a que virou meme. Vilania cômica, pé ante pé.' },
  { tom: 'tramoia', slug: 'the-builder', titulo: 'The Builder', dur: '1:58', viral: true,
    nota: 'Tramando um plano. Serve pra "o rival montando o time" e pra janela de transferências.' },
  { tom: 'tramoia', slug: 'comic-plodding', titulo: 'Comic Plodding', dur: '1:36', viral: false,
    nota: 'Passo pesado de desenho. Bom pra zagueiro lento, VAR demorando, burocracia.' },
  { tom: 'tramoia', slug: 'investigations', titulo: 'Investigations', dur: '1:34', viral: true,
    nota: 'Detetive cômico. O tom de "vamos analisar esse lance quadro a quadro".' },
  { tom: 'tramoia', slug: 'sneaky-adventure', titulo: 'Sneaky Adventure', dur: '1:13', viral: false,
    nota: 'Irmã leve da Sneaky Snitch, menos saturada de meme. Quando a piada não é sobre trapaça.' },
  { tom: 'tramoia', slug: 'mischief-maker', titulo: 'Mischief Maker', dur: '3:22', viral: false,
    nota: 'Travessura com pegada, 125 BPM. A mais "com energia" do grupo.' },
  { tom: 'tramoia', slug: 'danger-storm', titulo: 'Danger Storm', dur: '3:15', viral: false,
    nota: 'Ameaça cômica. Para o clássico chegando, o rival crescendo na tabela.' },

  // ------------------------------------------------------- EPICO
  { tom: 'epico', slug: 'hall-of-the-mountain-king', titulo: 'Hall of the Mountain King', dur: '2:33', viral: true,
    nota: 'Grieg em domínio público, gravação do MacLeod. O crescendo é meme e é épico de verdade: a trilha certa pra remontada.' },
  { tom: 'epico', slug: 'danse-macabre-finale', titulo: 'Danse Macabre - Finale', dur: '0:22', viral: false,
    nota: 'Vinte e dois segundos de clímax. É o painel de virada do carrossel, não o carrossel.' },
  { tom: 'epico', slug: 'take-a-chance', titulo: 'Take a Chance', dur: '0:37', viral: false,
    nota: 'Épico ascendente e curto. Para o painel do gol, e pro beat da decisão.' },
  { tom: 'epico', slug: 'dark-star', titulo: 'Dark Star', dur: '0:55', viral: false,
    nota: '170 BPM, épico e uplifting. Glória sem ficar solene demais.' },
  { tom: 'epico', slug: 'evening-melodrama', titulo: 'Evening Melodrama', dur: '0:36', viral: false,
    nota: 'Épico com o pé na comédia (bouncy). O meio-termo pra quando a glória é meio ridícula.' },

  // ------------------------------------------------------- SUSPENSE
  { tom: 'suspense', slug: 'umbrella-pants', titulo: 'Umbrella Pants', dur: '1:10', viral: false,
    nota: 'O raro "suspense + humor" do catálogo. É o tom exato de pênalti em quadrinho de piada.' },
  { tom: 'suspense', slug: 'mystery', titulo: 'Mystery!', arquivo: 'mystery.mp3', dur: '1:04', viral: false,
    nota: 'Mistério de série policial antiga. Bom pra sorteio de chaveamento e "quem vai ser o reforço".' },
  { tom: 'suspense', slug: 'private-eye', titulo: 'Private Eye', dur: '1:16', viral: false,
    nota: 'Suspense com groove, 132 BPM. Não trava a leitura do carrossel como suspense parado trava.' },
  { tom: 'suspense', slug: 'quiet-panic', titulo: 'Quiet Panic', dur: '0:38', viral: false,
    nota: 'Tensão contida e curta. O painel do "e agora?".' },

  // ------------------------------------------------------- DERROTA
  { tom: 'derrota', slug: 'man-down', titulo: 'Man Down', dur: '3:19', viral: false,
    nota: 'Derrota pesada, sem ironia. Quando a piada é o silêncio depois.' },
  { tom: 'derrota', slug: 'night-on-the-docks-sax', titulo: 'Night on the Docks - Sax', dur: '2:54', viral: false,
    nota: 'Saxofone melancólico, que é meme de fracasso por si só. Derrota com deboche.' },
  { tom: 'derrota', slug: 'rains-will-fall', titulo: 'Rains Will Fall', dur: '3:42', viral: false,
    nota: 'Triste mas com saída (uplifting no fim). Para eliminação que ainda tem próxima temporada.' },
  { tom: 'derrota', slug: 'past-sadness', titulo: 'Past Sadness', dur: '3:33', viral: false,
    nota: 'Nostalgia de derrota antiga. Casa com a série "O Dia Em Que" quando o fim é amargo.' },

  // ------------------------------------------------------- STING
  { tom: 'sting', slug: 'loping-sting', titulo: 'Loping Sting', dur: '0:05', viral: true,
    nota: 'Os 5 segundos de "tcham" cômico. O sting de piada mais reconhecível que existe.' },
  { tom: 'sting', slug: 'der-kleber-sting', titulo: 'Der Kleber Sting', dur: '0:08', viral: false,
    nota: 'Revelação com humor e mistério. Para o painel que entrega a virada.' },
  { tom: 'sting', slug: 'gustav-sting', titulo: 'Gustav Sting', dur: '0:15', viral: false,
    nota: 'Sting de ação, 132 BPM. Entrada de personagem.' },
  { tom: 'sting', slug: 'discovery-hit', titulo: 'Discovery Hit', dur: '0:15', viral: false,
    nota: 'Épico e uplifting: a descoberta boa. O contrário do Trouble.' },
  { tom: 'sting', slug: 'trouble', titulo: 'Trouble', dur: '0:17', viral: false,
    nota: 'Deu ruim, em 17 segundos. O par natural do Discovery Hit.' },
  { tom: 'sting', slug: 'danse-macabre-big-hit', titulo: 'Danse Macabre - Big Hit 1', dur: '0:05', viral: false,
    nota: 'Pancada orquestral seca. Impacto puro, sem melodia pra atrapalhar a leitura.' },
  { tom: 'sting', slug: 'cowboy-sting', titulo: 'Cowboy Sting', dur: '0:08', viral: false,
    nota: 'Duelo de faroeste. O clássico, o encara antes do clássico.' },

  // ------------------------------------------------------- MEMORIA (luto, homenagem, quem morreu)
  //
  // Nenhuma tem groove, e isso não é detalhe: `derrota-past-sadness` é "Calm, Grooving" e por
  // isso soa como recordação simpática, não como homenagem a um morto. Groove tira o peso.
  { tom: 'memoria', slug: 'reaching-out', titulo: 'Reaching Out', dur: '1:01', viral: false,
    nota: 'Piano só, em rubato. Homenagem íntima, do tamanho de um carrossel de 6 painéis.' },
  { tom: 'memoria', slug: 'heartbreaking', titulo: 'Heartbreaking', dur: '1:36', viral: false,
    nota: 'O autor descreve como "decepção vinda da esperança". A perda em si, sem consolo.' },
  { tom: 'memoria', slug: 'lone-harvest', titulo: 'Lone Harvest', dur: '1:00', viral: false,
    nota: 'Somber E uplifting ao mesmo tempo: luto com uma réstia de luz. Para a homenagem que termina bem.' },
  { tom: 'memoria', slug: 'touching-moments', titulo: 'Touching Moments Two - Higher', dur: '1:24', viral: false,
    nota: 'Piano delicado, sem drama. Quando a história é sobre alguém, não sobre a tragédia.' },
  { tom: 'memoria', slug: 'feather-waltz', titulo: 'Feather Waltz', dur: '1:30', viral: false,
    nota: 'Valsa leve e triste. Movimento sem pressa, bom pra carrossel que respira.' },
  { tom: 'memoria', slug: 'disquiet', titulo: 'Disquiet', dur: '3:05', viral: false,
    nota: 'Piano solene e longo: a única de Memória que cobre carrossel de 10 painéis sem repetir.' },
  { tom: 'memoria', slug: 'serene', titulo: 'Serene', dur: '2:10', viral: false,
    nota: 'Orquestra inteira, contida. Mais formal que o piano, para quando o fato pede cerimônia.' },
  { tom: 'memoria', slug: 'ancient-rite', titulo: 'Ancient Rite', dur: '1:53', viral: false,
    nota: 'Coro grave. Reverência, ritual, minuto de silêncio.' },

  // ------------------------------------------------------- GLORIA (triunfo com peso)
  //
  // Diferente do tom `epico`, que é a glória alegre do gol. Aqui a conquista custou alguma coisa.
  { tom: 'gloria', slug: 'reign', titulo: 'Reign', dur: '2:42', viral: false,
    nota: 'Calmo, épico, somber e uplifting de uma vez. ATENÇÃO: é em duas partes, piano lento até 1:50 e só então a parte grandiosa. Num carrossel de 30s você ouve só o piano; ponha início em 110s pra pegar a virada.' },
  { tom: 'gloria', slug: 'thaxted-holst', titulo: 'Thaxted (Holst)', arquivo: 'Thaxted.mp3', dur: '2:32', viral: false,
    nota: 'O tema de Júpiter, de Holst, em domínio público. Hino: solene e triunfal ao mesmo tempo.' },
  { tom: 'gloria', slug: 'our-story-begins', titulo: 'Our Story Begins', dur: '1:25', viral: false,
    nota: 'Abertura épica com coro. O painel 1 de uma história que vai crescer.' },
  { tom: 'gloria', slug: 'long-road-ahead', titulo: 'Long Road Ahead B', dur: '1:44', viral: false,
    nota: 'Épico e somber com coro. A conquista que veio depois de muita coisa ruim.' },
  { tom: 'gloria', slug: 'tempting-secrets', titulo: 'Tempting Secrets', dur: '2:58', viral: false,
    nota: 'Cordas e coro, escuro mas ascendente. Glória com sombra por baixo.' },
  { tom: 'gloria', slug: 'egmont-finale', titulo: 'Egmont Overture Finale', dur: '1:44', viral: false,
    nota: 'Beethoven, domínio público. O finale puro: 1min44 de vitória sem ironia.' },

  // ------------------------------------------------------- HISTORIA (fato antigo, documentário)
  { tom: 'historia', slug: 'quinns-song', titulo: "Quinn's Song:  A New Man", arquivo: 'Quinns Song-A New Man.mp3', dur: '1:45', viral: false,
    nota: 'Piano, cordas e coro. O tom de "isto aconteceu de verdade, faz muito tempo".' },
  { tom: 'historia', slug: 'almost-new', titulo: 'Almost New', dur: '3:23', viral: false,
    nota: 'Piano com mistério leve. Boa pra abrir uma história cujo desfecho ainda não se sabe.' },
  { tom: 'historia', slug: 'there-is-romance', titulo: 'There is Romance', dur: '3:17', viral: false,
    nota: 'Piano caloroso. Para a história bonita, sem tragédia (a amizade, o gesto, a lealdade).' },
  { tom: 'historia', slug: 'midnight-tale', titulo: 'Midnight Tale', dur: '2:42', viral: false,
    nota: 'Violão e alaúde: alguém contando um causo antigo. O fato folclórico do futebol.' },

  // ------------------------------------------------------- TENSAO (suspense sério)
  //
  // O tom `suspense` do acervo é suspense CÔMICO (Umbrella Pants, Private Eye). Estas são pra
  // quando o que está em jogo é real e a piada não cabe.
  { tom: 'tensao', slug: 'constancy-um', titulo: 'Constancy Part One', dur: '1:05', viral: false,
    nota: 'Cordas e tímpano, aperto crescente. O antes do desfecho.' },
  { tom: 'tensao', slug: 'constancy-dois', titulo: 'Constancy Part Two', dur: '1:04', viral: false,
    nota: 'A continuação, mais épica. Emenda com a Parte Um se o carrossel for longo.' },
  { tom: 'tensao', slug: 'unease', titulo: 'Unease', arquivo: 'Unease Piano.mp3', dur: '1:28', viral: false,
    nota: 'Piano tenso e seco. Pressentimento, o assunto grave que ainda não foi dito.' },
  { tom: 'tensao', slug: 'grave-blow', titulo: 'Grave Blow', dur: '1:36', viral: false,
    nota: 'Metais e percussão pesados. A notícia ruim chegando.' },

  // ------------------------------------------------------- CAOS (pancadaria, jogo fora de controle)
  //
  // O tom `zoeira` debocha de fora; estas correm JUNTO com a confusão. Vieram do retroativo de
  // 11/08/2026: a briga do Maradona em 84, os 20 cartões de Nuremberg e a cabeça de porco no
  // Camp Nou não tinham nenhuma faixa que acompanhasse o ritmo do que estava acontecendo.
  { tom: 'caos', slug: 'run-amok', titulo: 'Run Amok', dur: '1:47', viral: false,
    nota: '148 BPM de correria cômica. Pancadaria de desenho animado, todo mundo ao mesmo tempo.' },
  { tom: 'caos', slug: 'le-grand-chase', titulo: 'Le Grand Chase', dur: '1:41', viral: false,
    nota: '166 BPM, perseguição. Quando alguém sai correndo e o resto vai atrás.' },
  { tom: 'caos', slug: 'the-cannery', titulo: 'The Cannery', dur: '3:02', viral: false,
    nota: '178 BPM, agressiva e ainda assim cômica. O caos completo, sem ninguém no controle.' },
  { tom: 'caos', slug: 'bet-you-can', titulo: 'Bet You Can', dur: '3:18', viral: false,
    nota: 'Escura e provocadora, 92 BPM. O encara antes do empurrão, não o empurrão.' },

  // ------------------------------------------------------- RESISTENCIA (ditadura, censura, o clube contra o regime)
  //
  // A história do Barça tem muito disso, e é grave sem ser luto pessoal: presidente fuzilado,
  // escudo censurado, língua proibida, estádio vazio por decisão política. `memoria` é íntimo
  // demais e `tensao` é pequeno demais; isso aqui pede peso institucional.
  { tom: 'resistencia', slug: 'for-the-fallen', titulo: 'For the Fallen', dur: '1:35', viral: false,
    nota: '52 BPM, épico e somber. Memorial aos mortos por uma causa: o tom exato de mártir.' },
  { tom: 'resistencia', slug: 'funeral-march-brass', titulo: 'Funeral March for Brass', dur: '2:11', viral: false,
    nota: 'Marcha fúnebre de metais, 62 BPM. Cortejo, luto público, não privado.' },
  { tom: 'resistencia', slug: 'crisis', titulo: 'Crisis', dur: '1:26', viral: false,
    nota: 'Escura, épica e em marcha. A ameaça institucional se fechando em volta.' },
  { tom: 'resistencia', slug: 'industrial-revolution', titulo: 'Industrial Revolution', dur: '2:26', viral: false,
    nota: 'Máquina pesada andando. O regime como engrenagem, não como vilão de cara.' },
  { tom: 'resistencia', slug: 'tectonic', titulo: 'Tectonic', dur: '1:22', viral: false,
    nota: 'Épica e inquietante. Para quando a coisa é maior que o futebol e ninguém controla.' },
]

export const arquivoDe = (m) => `${m.tom}-${m.slug}.mp3`

// Formato de crédito do próprio incompetech, e SEM TRAVESSÃO: esta linha vai colada na
// descrição do post, onde travessão é regra da casa não usar (CLAUDE.md §7).
export const creditoDe = (m) =>
  `"${m.titulo}" by Kevin MacLeod (incompetech.com). Licensed under Creative Commons: By Attribution 4.0 (creativecommons.org/licenses/by/4.0/)`

// Ficha por nome de arquivo, pra API casar a lista do disco com os metadados.
export const FICHAS = Object.fromEntries(CATALOGO.map((m) => [arquivoDe(m), m]))

// Faixa que está no disco mas não no catálogo (as .mp4 antigas, ou MP3 solto que alguém jogou
// na pasta) vira uma ficha MÍNIMA em vez de sumir da lista: some do modal é pior que aparecer
// sem descrição, porque some sem explicar por quê.
export function fichaDe(arquivo) {
  return FICHAS[arquivo] || {
    tom: 'sem-ficha',
    titulo: arquivo.replace(/\.[^.]+$/, ''),
    dur: null,
    viral: false,
    nota: null,
    semFicha: true,
  }
}

// ---------------------------------------------------------------------------
// TRILHA SUGERIDA: todo quadrinho nasce com 3 candidatas e uma default.
//
// POR QUE EXISTE: escolher trilha é a última coisa antes de postar, e é quando a pessoa está
// mais cansada e com menos contexto do que quis dizer. Quem escreveu o roteiro sabe se aquilo
// é deboche ou luto; quem chega no fim, com 56 faixas na frente, não sabe mais. Então a escolha
// nasce JUNTO do roteiro, por quem tem o contexto na mão.
//
// São TRÊS e não uma porque tom é julgamento, não dedução: no o-dia-dani cabia tanto a
// homenagem (piano) quanto o triunfo (coro), e são leituras diferentes do mesmo fato. Três dá
// range pra ouvir e decidir; uma só vira imposição disfarçada de sugestão.
//
// A PRIMEIRA é a default e é copiada pro `videoMusica`, que é o que o render usa de fato. Assim
// o vídeo já sai com som sem ninguém escolher nada, e trocar depois não perde as outras duas.
export const N_SUGESTOES = 3

// Só faixa do catálogo entra: nome inventado ou faixa apagada viraria trilha faltando na hora
// do render, que é silencioso (o render só avisa "sem trilha" e segue).
export function problemaNasSugestoes(q) {
  const s = q?.trilhaSugestoes
  if (s == null) return null // quadrinho antigo, sem sugestão: legítimo
  if (!Array.isArray(s)) return `Quadrinho "${q.id}": trilhaSugestoes deve ser um array.`
  for (const item of s) {
    if (!item || typeof item !== 'object') return `Quadrinho "${q.id}": cada sugestão é { arquivo, porque }.`
    if (!FICHAS[item.arquivo]) {
      return `Quadrinho "${q.id}": trilha sugerida "${item.arquivo}" não está no catálogo (shared/musica-quadrinho.mjs). Use o nome exato do arquivo, ex: "memoria-lone-harvest.mp3".`
    }
    if (!String(item.porque || '').trim()) {
      return `Quadrinho "${q.id}": a sugestão "${item.arquivo}" precisa de um "porque" (uma linha dizendo por que ela serve pra ESTE quadrinho).`
    }
  }
  // A default tem que ser uma das sugeridas, senão a lista não explica a escolha que está valendo.
  if (s.length && q.videoMusica && !s.some((x) => x.arquivo === q.videoMusica)) {
    return `Quadrinho "${q.id}": videoMusica "${q.videoMusica}" não está entre as trilhaSugestoes. Ou inclua nas sugestões, ou escolha uma delas.`
  }
  return null
}
