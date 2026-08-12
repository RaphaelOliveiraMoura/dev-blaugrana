# Peças de dado: a corrida e a queda

Dois formatos montados **por código**, sem geração de imagem, que existem por motivos opostos:

| | **corrida** (`gerar-corrida.mjs`) | **queda** (`gerar-queda.mjs`) |
|---|---|---|
| o que prende | o **loop de completude**: no frame 1 já se vê a meta e o quanto falta | o **suspense real**: quem decide é a física |
| o desfecho | já está no dado, o que prende é a virada | ninguém sabe, nem quem gerou |
| serve pra | pergunta com resposta conferível | pergunta **sem** resposta (futuro, palpite, sorteio) |
| custo | zero geração; usa os rigs `correr` do acervo | zero geração e zero asset |
| limite duro | 2 ou 3 corredores, cada um com rig de corrida | 2 a 12 competidores |

A regra editorial que separa os dois é uma só: **a corrida afirma, a queda pergunta.** Ancorar
palpite de campeão num sorteio seria vender sorte como análise, então a queda declara no
subtítulo quem decide e devolve a pergunta no fecho. E o inverso: corrida com número errado é
pior que vídeo feio, porque vira tribunal nos comentários.

---

## 1. O dado da corrida: `scripts/dados/fotmob.mjs`

Nunca digite o placar na mão. O coletor lê a fonte, monta a grade e **confere a soma contra o
total oficial da temporada** antes de gravar. Divergiu, ele para.

```bash
node scripts/dados/fotmob.mjs elenco <teamId>          # nome -> id (Barça 8634, Real 8633, Atleti 9906)
node scripts/dados/fotmob.mjs temporadas <playerId>    # que ligas e temporadas esse jogador tem
node scripts/dados/fotmob.mjs jogos <playerId> --liga=LaLiga --temporada=2025/2026
node scripts/dados/fotmob.mjs corrida <videoId>        # preenche corrida.jogos, e SALVA pela API
```

O vídeo declara de onde veio o número, em `corrida.fonte`, e é isso que torna a peça refazível:

```json
"fonte": {
  "provedor": "fotmob",
  "liga": 87,                    // nome ("LaLiga") ou ID; em peça histórica, SEMPRE o ID
  "temporada": "2025/2026",
  "eixo": "partidas",            // partidas | rodadas | fases | temporadas
  "tolerancia": 0,
  "metricas": [{ "icone": "bola", "campo": "gols" }]
}
```

Campos que o coletor entrega por partida: `gols`, `assistencias`, `participacoes`, `amarelos`,
`vermelhos`, `minutos`, `golsSofridos`, `cleanSheet`, `defesas`. Ícones que o motor desenha:
`bola`, `chuteira`, `luva` (métrica nova = uma função de ícone em `gerar-corrida.mjs`).

### As quatro armadilhas da fonte, todas medidas neste projeto

**1. O `seasonId` é relativo AO JOGADOR.** `1-0` é a La Liga 25/26 do Pedri e a La Liga **24/25**
do Joan García, que estava no Espanyol. Pedir pelo número devolve dado plausível de outra
temporada, sem erro nenhum: o Joan aparecia com 8 jogos sem sofrer gol em vez de 15. Por isso
ninguém passa `seasonId` ao coletor, só liga + temporada por nome.

**2. A liga TROCA DE NOME.** A La Liga (id 87) é `LaLiga` em 2012/13 e `Primera Division` em
2013/14. Casando por nome, a temporada 13/14 de Messi e Cristiano saiu como "não jogou", e a
corrida iria ao ar com um ano **zerado** no meio da era dos dois. Em peça histórica use o ID.

**3. Prefixo de nome engole competição vizinha.** `World Cup` casando por prefixo pega junto
`World Cup Qualification`, e a Copa do jogador vira Copa + eliminatórias. O casamento é por
`leagueId` (a Copa e a fase de grupos são ambas 77; a eliminatória é 10195).

**4. `recentMatches` lista quem foi RELACIONADO, não quem jogou.** Szczęsny aparecia com "35
jogos" numa temporada inteira de reserva. O coletor imprime "jogados de relacionados", e é esse
primeiro número que decide se o cara serve de corredor.

### O que a fonte NÃO tem

- **Jogo a jogo antes de ~2020.** `recentMatches` guarda só os 60 últimos jogos, e o `shotmap`
  histórico vem **vazio** mesmo em temporada marcada com `hasDeepStats: true` (medido em
  2016/17). Não existe Messi x Cristiano gol a gol na La Liga, e FBref, Transfermarkt e
  worldfootball devolvem **403** pra bot. A saída é o eixo `temporadas` (abaixo).
- **Defesas exatas.** `defesas` sai do `keeperShotmap`, que é a lista de finalizações **com
  coordenada**, e fica 0 a 1 abaixo do total oficial (Joan García 73 de 74, Oblak 74 de 75,
  Courtois 70 de 70). Daí `fonte.tolerancia: 1` nessa métrica, declarada no vídeo. Gols e
  assistências batem exato e seguem com tolerância 0.

### O eixo decide o que é uma etapa

| eixo | uma etapa é | quando usar |
|---|---|---|
| `partidas` | uma partida do time | corredores do **mesmo time** (dá as 38 rodadas exatas, com o adversário no rótulo) |
| `rodadas` | uma janela de dias | corredores de **times diferentes** (Barça x Real x Atleti) |
| `fases` | GRUPOS, OITAVAS, ... FINAL | mata-mata; o rótulo vira narrativa e a disputa de 3º não se funde com a final |
| `temporadas` | um ano inteiro | **peça retrô**, onde não existe jogo a jogo |

Agrupar companheiros de time por data funde as rodadas de meio de semana e a temporada perde 4
das 38 etapas. Numa Copa, agrupar por data funde fases: os 8 jogos viravam 7 etapas e a disputa
de terceiro (onde Mbappé fez 2 gols) caía junto com a final.

---

## 2. Limites dos motores (achados batendo neles)

### Corrida

- **Ícone vira pacote acima de 4 por etapa** (`x50`). Os ícones entram em fila com 0,16 de
  intervalo: do quarto em diante a chegada cai **fora** da etapa, e o corredor não completa o
  avanço no tempo certo, se acertando só no corte. Numa etapa que é uma temporada inteira,
  50 bolas atravessavam a tela de uma vez.
- **As raias se distribuem pelo número de corredores.** Num duelo, o sprite cresce 25%.
- **A placa escolhe a cor do texto pelo fundo.** Corredor de camisa branca ganhava placa branca
  com letra branca, e nome e placar sumiam a peça inteira.
- **A margem do placar segue os dígitos.** Acumulado de três dígitos vazava a borda da placa.
- A escala tem folga (`META + 3`) pra ninguém encostar na bandeirinha antes do fim.

### Queda

- **Acaba quando o PÓDIO fecha**, não quando a última bolinha chega. Com 8 competidores isso
  custava 90s de vídeo morto (uma encalhou e o render foi ao teto de 120s).
- **Anti-encalhe**: bolinha parada meio segundo leva um peteleco lateral, tirado do mesmo rng com
  semente. O motor conta e imprime os petelecos.
- **Gate da pista**: acima de 8 petelecos ele **reprova** e manda trocar a semente. Medido: seed
  17 com 4 competidores deu 367 petelecos e 120s; o seed 5 da mesma peça deu 0.
- **A bolinha encolhe conforme a grade.** Com raio fixo, 12 competidores nasciam sobrepostos e o
  primeiro quadro era uma explosão, não uma queda.
- **HUD e chips se adaptam.** Com largura fixa, só cabiam 3: em 8, cinco chips eram desenhados
  fora da tela e sumiam justo os que estavam perdendo.
- Quanto mais competidores, menos bolinha aparece na tela (a câmera segue o líder). Com 8, o
  espectador acompanha mais pelo HUD que pela pista.

**A semente pode ser trocada por causa da PISTA, nunca por causa do vencedor.** É por isso que o
`SIM=1` imprime as duas coisas separadas: escolha a semente pelo número de encalhes, antes de
olhar quem ganhou. Caçar seed até o Barça ganhar é fraudar um vídeo que promete sorteio.

```bash
SIM=1 node gerar-queda.mjs <videoId>      # só simula: ordem, duração e encalhes
node gerar-queda.mjs <videoId>            # renderiza
```

---

## 3. A pauta: o que faz uma peça de dado dar certo

- **Corrida precisa de disputa.** Yamal fechou a La Liga 25/26 com 27 participações contra 11 do
  Pedri: corrida decidida na terceira rodada. Meça os finalistas ANTES de montar (`jogos` custa
  um comando) e troque o trio se um deles não briga. A de goleiros ficou 74 x 73 x 70.
- **Mais eventos, mais vida.** Defesas rende ~217 eventos numa temporada; assistências puras,
  ~20. Com poucos eventos, metade das etapas não tem nada acontecendo.
- **Confira se a peça não existe.** `corrida-atacantes-2526` já era GOLS + ASSISTÊNCIAS da La
  Liga 25/26; uma corrida nova com dois dos mesmos três corredores é quase um duplicado.
- **A queda aceita a piada.** "Quem o Barça contrata" com uma quarta bolinha escrita NINGUÉM é
  mais honesta que as outras três, e é a que rende comentário.
- **A queda é peça de véspera.** Bola de Ouro antes da lista sair, sorteio antes do sorteio: dá
  pra postar o palpite e depois o resultado, dois posts de uma pauta.
