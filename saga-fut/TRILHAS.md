# Trilhas musicais — SagaFut

Som é uma das maiores alavancas de retenção. Todo episódio leva uma **cama musical**
por baixo da narração (volume ~18%), escolhida pelo **humor da cena** no seletor 🎵 da
aba Montar. As faixas ficam em `assets/musica/` (o seletor lê essa pasta sozinho).

## ⚠️ ATRIBUIÇÃO OBRIGATÓRIA (ler antes de publicar)

As 17 trilhas já baixadas são do **Kevin MacLeod (incompetech.com)**, licença
**Creative Commons BY 4.0**: uso comercial liberado, MAS **exige crédito** em todo post
que usar a música. Sem o crédito, a licença é violada.

Colar na descrição/legenda de cada vídeo com trilha (uma linha):

> Música: Kevin MacLeod (incompetech.com), Creative Commons BY 4.0

(Basta uma linha por post. Já dá pra deixar salvo no campo de publicação do episódio.)

Se um dia quiser trilha **sem precisar creditar** (CC0/domínio público), as fontes boas
secaram (FreePD fechou, Pixabay bloqueia download automático). Dá pra caçar em
OpenGameArt (filtro CC0) ou baixar manual do Pixabay Music. Por ora, o acervo é CC-BY.

## Acervo já baixado (17 faixas, por humor)

O nome do arquivo começa pelo humor, então o seletor agrupa sozinho. Duração entre
parênteses (faixas longas dão loop automático; curtas repetem).

| Humor | Arquivos | Quando usar |
|---|---|---|
| **épico/ascensão** | `epico-ascensao-rising-tide` (4:37), `epico-ascensao-heroic-age` (1:37) | glória, gol, título, virada de esperança |
| **épico/batalha** | `epico-batalha-clash-defiant` (6:16), `epico-batalha-killers` (5:05), `epico-batalha-hitman` (3:21), `epico-batalha-volatile-reaction` (2:45) | jogo, confronto, o martelo, ação |
| **melancólico** | `melancolico-anguish` (3:59), `melancolico-wounded` (3:21), `melancolico-reawakening` (3:34) | origem, dor, derrota com honra |
| **nostálgico** | `nostalgico-fireflies` (4:15) | o menino, memória, o sonho, o quarto |
| **esperança** | `esperanca-deliberate-thought` (2:57) | fim aberto, luz no fim, "gigante hiberna" |
| **tenso/sombrio** | `tenso-sombrio-darkest-child` (3:59), `tenso-sombrio-ossuary-air` (4:10), `tenso-sombrio-anxiety` (1:51), `tenso-sombrio-static-motion` (3:09) | bloqueio, vilão, jaula, portão, medo |
| **tensão (bed longo/curto)** | `tenso-longo-long-note-four` (10:00, drone), `tenso-curto-epic-unease` (0:38) | drone contínuo sob cena longa / sting curto |

## Mapa humor → episódio (humor BASE de cada episódio)

Estes são o humor de abertura sugerido por episódio (já pré-selecionado). A partir dele,
refine **por cena** onde a história virar (ver seção do crossfade acima). O aranha-01 já
está montado como exemplo de virada por cena.

### O Gigante do Norte
- **Ep 1** O Menino: `nostalgico-fireflies`
- **Ep 2** A Maldição dos 28 Anos: `melancolico-anguish`
- **Ep 3** O Desembarque: `epico-ascensao-rising-tide`
- **Ep 4** O Martelo contra o Império: `epico-batalha-clash-defiant`
- **Ep 5** A Terra onde Ele Nasceu: `tenso-sombrio-darkest-child`
- **Ep 6** Valhalla: `esperanca-deliberate-thought`

### A Aranha e a Catedral
- **Ep 1** O Menino da Aranha: `nostalgico-fireflies`
- **Ep 2** A Sombra e a Coroa do Mundo: `epico-ascensao-heroic-age`
- **Ep 3** O Rei que Só Queria uma Casa: `tenso-sombrio-ossuary-air`

## Trilha POR CENA com crossfade (já implementado)

A música é escolhida **por cena** no seletor 🎵 do Montar: cada cena pega uma faixa ou
**"(continua a anterior)"**. Cenas seguidas com a mesma faixa viram um bloco; quando a
faixa muda, o servidor faz um **crossfade de ~0,9s** na troca (nada de corte seco).
Assim a música acompanha a virada da história (ex.: sonho nostálgico que vira tenso
quando o portão se fecha). Regra prática: só escolha faixa **onde o clima vira**; no
resto, deixe "(continua)".

- **Volume** por episódio no slider (padrão **8%**, ajustável 1% a 30%).
- **▶** ao lado de cada cena toca a faixa pra você escolher antes de montar.
- **Ponto de início por faixa (campo "s"):** muita trilha longa tem intro quieta e o tema
  só entra mais tarde (ex.: `tenso-sombrio-ossuary-air` só "acorda" aos 0:36). O campo "s"
  faz o render começar a faixa nesse ponto (pula a intro), sem cortar o arquivo. É uma
  propriedade GLOBAL da faixa (vale em qualquer cena/episódio), guardada em
  `assets/musica/inicios.json`. Os valores já vêm **sugeridos automaticamente** (análise
  de onde a energia da faixa sobe); ajuste fino com o ▶, que toca a partir do ponto.
- Entra por baixo de tudo (narração + ambiência); o aviso "Trilha por cena com
  crossfade (N trechos)" confirma. A música faz fade-out no fim das cenas (o card
  "CONTINUA" fica limpo).

Exemplo montado (aranha-01): cena 1-2 `nostalgico-fireflies`, cena 3
`tenso-sombrio-ossuary-air` (a porta se fecha), cena 4 `esperanca-deliberate-thought`.

## Como adicionar mais faixas

Baixar MP3 livres de uso e jogar em `assets/musica/` com o nome no padrão
`humor-descricao.mp3`. Aparece no seletor na hora (o endpoint relê a pasta). Fontes:
- Kevin MacLeod: https://incompetech.com (CC-BY, creditar). Download direto:
  `https://incompetech.com/music/royalty-free/mp3-royaltyfree/<Nome%20Da%20Faixa>.mp3`
- Pixabay Music: https://pixabay.com/music/ (CC0, sem crédito; baixar manual, o site
  bloqueia download automático).

## Regra para os próximos episódios

Ao fechar o roteiro, **definir a trilha por cena junto** (faixa onde o clima vira,
"(continua)" no resto). A trilha é branding sonoro tanto quanto a voz do narrador: uma
saga inteira deve soar coesa (mesma família de humores, variando pelo momento). E
**sempre** colar o crédito do Kevin MacLeod na publicação enquanto o acervo for CC-BY.
