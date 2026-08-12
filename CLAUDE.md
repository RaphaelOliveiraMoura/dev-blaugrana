# dev-blaugrana — instruções do projeto

Perfil `@devblaugrana`: quadrinhos e vídeos animados de futebol, em português. Conteúdo em
`saga-fut/`, ferramentas em `saga-fut-studio/`.

Este arquivo é o mínimo pra não estragar nada. As regras de animação **já estão no código** e se
impõem sozinhas (gates que reprovam, dados que viajam com o asset). O que está aqui é só o que o
código não tem como impor: por onde entrar.

## 1. Nunca edite `saga-fut/data/` direto

O studio (porta 4600) mantém o `project.json` em memória e **sobrescreve o disco no próximo save**.
Sua edição some sem aviso.

```bash
curl -s http://localhost:4600/api/videos/<id>                 # ler
curl -s -X PUT http://localhost:4600/api/videos/<id> -H 'Content-Type: application/json' -d @novo.json
```

O studio sobe com `npm run dev --prefix saga-fut-studio` (Vite 4610 + API 4600). Nunca rode o
servidor por Bash direto; use a ferramenta de preview.

### 1.1 Nada NASCE pela tela: a API é a única porta (12/08/2026)

O studio **não tem mais botão de criar coisa nenhuma**. Saíram todos: novo quadrinho, novo painel,
novo personagem, adicionar ao elenco, nova saga, novo episódio, nova cena, novo estilo, e os
duplicar. A tela serve pra ACOMPANHAR, AJUSTAR TEXTO e PUBLICAR.

Isso é regra editorial, não faxina: peça criada pela tela nasce **em branco** e alguém teria que
preencher campo a campo, sem o padrão da casa. Peça criada pelo roteiro nasce **completa** (painéis,
elenco, prompts, legendas, trilha, agenda) e passa pelas validações do PUT. Dois caminhos de
criação com regras diferentes é exatamente como o padrão se perde.

**Então a criação é sua, e é por aqui:**

```bash
# quadrinho, vídeo, saga: um arquivo por peça, PUT granular (já registra na ordem do projeto)
curl -s -X PUT http://localhost:4600/api/quadrinhos/<id> -H 'Content-Type: application/json' -d @novo.json

# personagem, cenário, objeto, estilo: vivem no project.json, então é GET + PUT do todo
curl -s http://localhost:4600/api/dados > d.json   # edite `personagens` etc.
curl -s -X PUT http://localhost:4600/api/dados -H 'Content-Type: application/json' -d @d.json
```

Quadrinho novo da série sai pela skill `/o-dia-em-que`, que monta o JSON inteiro na ordem certa.

**Consequência que importa: se uma rota de escrita quebrar, NADA novo entra no acervo e o sintoma
é o silêncio** (antes sobrava a tela como plano B). Por isso o `vigia` passou a exigir que as
portas existam e que a UI não volte a ter botão de criar:

```bash
node scripts/testes/vigia.test.mjs   # "A CRIAÇÃO POR API AINDA É POSSÍVEL"
```

## 2. Toda geração de asset passa pelo `asset.mjs`

Os `gen-*` **recusam execução direta** (exigem `SAGAFUT_VIA_ASSET=1`, que só o `asset.mjs` põe) e um
hook bloqueia a chamada por Bash. Isso não é burocracia: foi assim que entraram no acervo folha sem
`muda` (saiu pulsando), sprite com número no peito e cenário com escudo errado.

```bash
node scripts/asset.mjs status <slug>      # o que falta pro personagem entrar num vídeo
node scripts/asset.mjs model-sheet <slug> # pré-requisito de todo personagem
node scripts/asset.mjs video <id>         # build do vídeo (valida o manifesto ANTES de gerar)
node scripts/asset.mjs regras             # o contrato vigente, impresso
```

Personagem só entra em vídeo se estiver **apto** (base + model sheet + idle). O gate barra.

### "O personagem ficou estranho": nunca regere a base por cima

Regerar `base.png` direto torra a versão anterior (às vezes a melhor), entrega uma candidata por vez
e mistura duas perguntas: o texto da ficha descreve o homem certo, e o modelo obedeceu ao texto?

```bash
node scripts/asset.mjs variacao <slug> --de=<variantes.json>   # N candidatas no rascunho + folha numerada
node scripts/asset.mjs promover <slug> <n>                     # a escolhida vira base.png E promptFicha
```

O JSON é `[{ nome, promptFicha, nota, estiloExtra? }]`: **cada candidata leva o SEU texto**, porque o
modo de falhar campeão daqui é a ficha descrevendo outra pessoa e o gerador só obedecendo (flick,
ferran, cucurella, gordon). As rodadas se acumulam na folha (`--limpar` recomeça), e o `promover`
troca arte e texto JUNTOS: só o PNG deixaria o `promptFicha` velho no cadastro e a próxima regeração
voltaria calada ao personagem antigo.

`"estiloExtra": ""` zera a cláusula de estilo do personagem, e às vezes é ela a culpada: no flick o
`estiloExtra` mandava "o rosto mais magro e comprido do elenco, bochechas fundas", e era isso que
saía com cara de doente em toda rodada, por mais que o promptFicha mudasse.

### Qual modelo desenha

Quatro: `codex` (ChatGPT Plus) · `grok` (SuperGrok) · `together` (Together AI, **paga por imagem**) · `cursor` (assinatura Cursor · GenerateImage).
Quem decide, do mais forte pro mais fraco:

1. `--modelo=<id>` no comando — vale **só naquela execução**
2. o seletor do studio (canto inferior da barra lateral, salvo em `projeto.modeloImagem`)
3. `codex`

O override viaja por variável de ambiente (`SAGAFUT_MODELO`), então nasce e morre no processo: dá
pra testar um modelo enquanto um lote roda em paralelo com outro, sem um encostar no outro.

```bash
node scripts/asset.mjs correr <slug> --modelo=grok   # só este comando
```

A Together precisa de `TOGETHER_API_KEY` no ambiente (nunca em arquivo do repo) e é a única que
cobra por imagem: um `asset lote` nela é fatura, não fila. O modelo dela sai de `TOGETHER_MODELO`
(padrão `FLUX.1-kontext-pro`, da família que aceita imagem de entrada, sem a qual as referências da
casa não funcionam).

**Vários personagens de uma vez: `asset lote`, nunca um `for` de shell.**

```bash
node scripts/asset.mjs lote vivo --faixa=ab --dry   # a fila e o custo, sem gerar
node scripts/asset.mjs lote vivo --faixa=ab         # roda
```

Kits: `apto` (model+idle) · `movimento` (andar+correr) · `vivo` (tudo que o motor consome hoje).
`--passo=correr` restringe o kit a um passo só, que é o caso "a corrida de meia dúzia deles ficou
estranha": sem ele, refazer só a corrida é `lote movimento --refazer`, que leva a caminhada boa
junto (o dobro de geração e arte boa jogada fora).
Ele existe por três motivos que um `for` não cobre: a **ordem** é o kit e passo com dependência
ausente não roda (o model sheet dá a proporção de toda folha seguinte); **pula o que já existe**,
então retomar uma rodada em que 20 estouraram o timeout não repaga as 126 que deram certo; e o
paralelismo é **entre** personagens, sequencial **dentro** de cada um.

A faixa sai do uso real (quantos quadrinhos e vídeos citam o slug): `a` ≥ 4, `b` 2 a 3, `c` 0 a 1.
Filtra por `estiloId` da casa por padrão, porque rodar num personagem de outra saga paga geração pra
devolver ele fora do próprio estilo.

**"Já existe" não quer dizer "está certo".** Nos passos com gate de ciclo (andar, correr) o lote MEDE
a folha que está no disco e põe na fila pra refazer a que reprova, com uma segunda tentativa
automática (o gerador acerta a passada uma vez sim outra não). E ele declara quantas pastas do disco
ficaram FORA da fila por não estarem no `project.json`, com os ciclos reprovados delas nomeados:
cobertura parcial que não se declara lê como completa.

## 3. Vídeo novo: o caminho

**Use a skill `/novo-video`.** Ela carrega as sete camadas de direção (planos, reação, punch-in,
ritmo, profundidade, composição, consequência) que os gates NÃO conferem. Sem ela o vídeo sai
correto e chapado — passa em todos os validadores e não tem tratamento nenhum.

1. `node scripts/video/new-video.mjs <id>` — nasce 3:4, com `publicacao.titulo` e legenda
   obrigatórios (sem eles não salva).
2. Escreva o **roteiro** (lista de shots) no JSON do vídeo, via API.
3. `node scripts/video/animatic.mjs <id>` (ou a aba **Animatic** do vídeo no studio) — **antes de
   gerar asset**: o vídeo roda no motor de verdade com boneco no lugar do sprite que falta e grade
   com régua de x no lugar do cenário. Escala, posição, orientação e ritmo já são os definitivos.
   É aqui que a encenação é aprovada, porque aqui o conserto custa ~10s e zero geração.
4. Declare no manifesto `videos/<id>/sprites.json` o que o roteiro usa.
5. `node scripts/asset.mjs video <id>` — gera o que falta e roda os gates.
6. `POST /api/video/render {videoId}` — valida de novo e renderiza.

### O personagem-padrão

**`torcedor-cule` é a referência de animação da casa** (`scripts/sprites/referencia.mjs`). Ele tem o
kit inteiro feito de propósito pra isso — idle, andar, correr e 12 gestos do catálogo — e cada folha
dele viaja como REFERÊNCIA DE POSE na geração correspondente de qualquer outro personagem: o andar
de alguém nasce copiando o andar dele, o `comemorar` copia o `comemorar` dele.

Da folha de referência vem SÓ a pose. A identidade vem sempre da base do personagem, e o prompt diz
isso explicitamente, porque o modo de falhar óbvio aqui é misturar os dois personagens.

Ele nunca é referência de si mesmo (copiar-se não ensina nada), então regerar o padrão usa a
referência anterior, declarada em `REFERENCIA_DE_POSE.<tipo>.alternativa`: hoje `cucurella-riso` no
correr, `torcedor-cule-menino` no andar e `yamal-riso` no idle. Confira lá, não aqui: esta linha é
cópia e já ficou velha uma vez.

Existe porque os gates de silhueta pegam bem defeito grosseiro e mal **qualidade de animação**. O
caso que fechou o assunto: "a perna de trás está estática e a da frente só muda a dobra do joelho".
Isso é sobre a IDENTIDADE de cada perna ao longo do tempo, e a silhueta binária não mede — as duas
pernas se sobrepõem e têm a mesma cor. A saída não foi mais uma régua, foi **parar de descrever a
animação em inglês e mostrar uma que presta**.

Medido: a mesma folha, mesmo prompt, com e sem a referência — amplitude de passada de 40% para 52%
(o padrão-ouro dá 50%), abertura de 1,13 para 1,75, deriva de 16% para 12%, saindo de reprovada para
aprovada. Do arquivo de referência vem SÓ a pose; a identidade vem sempre da base do personagem.

Trocar a referência é trocar o padrão de qualidade de tudo que for gerado depois. Confira olhando:
`node scripts/sprites/ciclo.mjs <slug> <tipo> --perfil` põe qualquer ciclo lado a lado com ela.

**Prefira gesto do catálogo** (`scripts/sprites/gestos.mjs`): descrição, fases, cronometragem e
comportamento de loop já testados. Escrever fases na mão é a exceção.

### Animação nova NASCE no personagem-padrão

Todo gesto é feito primeiro no `torcedor-cule`, aprovado **olhando**, e só então replicado em quem
precisa. O `asset folha` **reprova** se o padrão ainda não tiver aquela folha.

```bash
node scripts/asset.mjs folha torcedor-cule espalmar   # 1. nasce no padrão
node scripts/asset.mjs folha vozinha-riso  espalmar   # 2. replica, já com referência de pose
```

Três motivos, e nenhum é organização:

- **A referência de pose só existe se o padrão tiver a folha.** Gerar um gesto direto no alvo é
  gerar sem exemplo, que é exatamente quando o modelo inventa. Medido: com referência, a amplitude
  de passada foi de 40% para 52%.
- **O padrão vira o acervo completo de encenação da casa**, então personagem novo se replica dele
  em vez de nascer do zero.
- **Aprovar uma vez sai mais barato** que descobrir o defeito depois de gerar a mesma folha em cinco
  personagens.

O opt-out é `--sem-padrao`, e existe para o gesto que só faz sentido num personagem (o goleiro que
espalma, o ditador que bate o martelo). É erro com saída declarada, não aviso: aviso ninguém lê.

Corolário prático: **num vídeo de teste, use o padrão em todos os papéis.** Nada impede dois
`torcedor-cule` em cena, um chutando e outro defendendo, e assim a bancada não espera arte de mais
ninguém.

### Toda geração leva DUAS imagens, nunca mais

`Image 1` = a **mesma folha** do personagem-padrão (a pose, o layout) · `Image 2` = o alvo (a
identidade: o model sheet dele, ou a base se ainda não tiver model sheet). A regra mora em
`referencia.mjs` e um teste do `vigia` lê o código dos geradores e reprova quem montar a própria
pilha de referências.

Antes cada gerador empilhava até cinco imagens (base + model sheet + folha anterior + pose +
estilo), e três delas eram do MESMO personagem. Medido no bake-off de 02/08/2026: quanto mais
referências do alvo entram, mais a identidade dele atropela a pose que se quer copiar; e quanto mais
peso a folha do padrão tem, mais ela contamina a identidade. Duas imagens é o par que separa as duas
perguntas. A ficha de estilo saiu porque o personagem-padrão já é a casa desenhada no estilo da casa.

Isso vale para model sheet, andar, correr, idle, gestos, poses, reações e avatar. Fica de fora só o
que não tem personagem correspondente (cenário, estilo, keyframe) e o `gen-char`, que nasce da foto
de uma pessoa real.

### Calibrar os gates: studio → Ferramentas → Gates

Toda reprovação (fail e aviso) vira uma linha em `data/gates.jsonl`, com uma **cópia** da folha, do
cartão e dos quadros feita no instante da reprovação, porque quem reprova regera por cima e a prova
some. Na tela dá para ver a animação rodando (o defeito que estes gates medem só existe ENTRE
quadros) e julgar: **o gate acertou** ou **reprovou arte boa**.

O número que decide o que consertar é a **taxa de falso positivo por gate**, não o total de
reprovações. Cinco vezes um limiar deste projeto reprovou arte boa, e as cinco só apareceram porque
alguém estava olhando o terminal na hora.

```bash
node scripts/sprites/varrer-gates.mjs        # mede o acervo inteiro e registra o que reprova
```

## 3.1 Quadrinho novo da série "O Dia Em Que": a skill `/o-dia-em-que`

Histórias REAIS do futebol em carrossel, o formato editorial vigente dos quadrinhos. A skill carrega
a ORDEM que já custou geração pra descobrir, e ela não é intuitiva:

1. **checagem de fatos ANTES do roteiro** (a checagem costuma ser a dona do melhor beat);
2. as perguntas que são do Raphael feitas de uma vez, **antes do JSON** (tom, quem fecha, a foto);
3. **ficha ANTES do painel**, e pessoa real exige retrato **FRONTAL** aprovado olhando;
4. **capa em 2 ou 3 opções**, escolhida olhando, porque ela vale ~80% do carrossel.

Regra editorial completa em `saga-fut/docs/SERIE-O-DIA-EM-QUE.md`; o motor (schema, estilo, elenco,
cenário, prompt) em `saga-fut/docs/QUADRINHOS.md`.

Nunca escreva em `saga-fut/data/` direto: `PUT /api/quadrinhos/<id>` (§1), que já registra o id no
`quadrinhoOrder`.

### Todo quadrinho nasce com trilha sugerida

Vale pra QUALQUER quadrinho, não só pra série: junto do roteiro vão **3 sugestões de música e uma
default**, e o PUT devolve 400 sem elas estarem coerentes.

```json
"videoMusica": "memoria-lone-harvest.mp3",
"trilhaSugestoes": [
  { "arquivo": "memoria-lone-harvest.mp3", "porque": "por que ELA serve neste quadrinho" },
  { "arquivo": "gloria-long-road-ahead.mp3", "porque": "..." },
  { "arquivo": "memoria-reaching-out.mp3", "porque": "..." }
]
```

Existe porque escolher trilha era a última coisa antes de postar, e é quando quem posta tem menos
contexto do que quis dizer: dos 127 quadrinhos, UM tinha música escolhida. Quem acabou de escrever
o roteiro sabe se aquilo é deboche ou luto; quem chega no fim, com 65 faixas na frente, não sabe
mais.

São três porque tom é julgamento, não dedução: no `o-dia-dani` (o gol do Iniesta com "Dani Jarque
siempre con nosotros") cabia tanto a homenagem quanto o triunfo. Ofereça as duas pontas e uma no
meio, e ponha como default a que você defenderia.

O catálogo (65 faixas, dez tons, todas Kevin MacLeod sob **CC BY 4.0, crédito obrigatório**) mora
em `saga-fut-studio/shared/musica-quadrinho.mjs`, e o acervo se reconstrói com
`node scripts/baixar-musicas.mjs` (os MP3 estão no .gitignore, só o catálogo é versionado). Os
seis primeiros tons são comédia; `memoria`, `gloria`, `historia`, `tensao`, `caos` e `resistencia`
existem porque a série tem episódio sério, e o acervo cômico não servia pra presidente fuzilado.
**Se nenhuma faixa servir, diga, não force**: o catálogo se amplia.

## 3.2 Peças de dado (corrida e queda): nunca digite o placar na mão

Dois formatos montados **por código**, sem geração de imagem: a **corrida** (`gerar-corrida.mjs`,
2 ou 3 personagens correndo, empurrados por dado real) e a **queda** (`gerar-queda.mjs`, marble
race com 2 a 12 bolinhas, onde quem decide é a física). A regra que separa os dois: **a corrida
afirma, a queda pergunta.** Queda serve pra pergunta SEM resposta (campeão do ano que vem, Bola de
Ouro antes da lista sair); corrida serve pra dado conferível.

O número da corrida sai do coletor, que confere a soma contra o total oficial e **para** se
divergir. Ele é a única porta:

```bash
node scripts/dados/fotmob.mjs elenco <teamId>          # nome -> id
node scripts/dados/fotmob.mjs jogos <playerId> --liga=LaLiga --temporada=2025/2026
node scripts/dados/fotmob.mjs corrida <videoId>        # preenche corrida.jogos e salva pela API
SIM=1 node gerar-queda.mjs <videoId>                   # simula: ordem, duração e encalhes
```

Três coisas que só se descobre apanhando, e que já custaram vídeo errado aqui:

- **O `seasonId` do FotMob é relativo ao jogador** (`1-0` é 25/26 pro Pedri e 24/25 pro Joan
  García) e **a liga troca de nome** (`LaLiga` virou `Primera Division` em 2013/14). Por isso o
  coletor pede liga + temporada por nome, e peça histórica usa o **ID** da liga.
- **Meça os corredores antes de montar.** Corrida sem disputa é corrida decidida na terceira
  rodada; um `jogos <playerId>` custa um comando e evita o vídeo inteiro.
- **A semente da queda se troca pela PISTA, nunca pelo vencedor.** O gate reprova pista com mais
  de 8 encalhes; caçar seed até o Barça ganhar é fraudar um vídeo que promete sorteio.

Regra completa, com os limites de cada motor e o que a fonte não tem: `saga-fut/docs/PECAS-DE-DADO.md`.

## 4. O que os gates reprovam (não tente contornar)

`POST /api/video/render` roda `validar-cena` e devolve **422** se houver erro. `?forcar=1` existe
para falso-positivo — se você está prestes a usar, é quase certo que o problema é real.

- **ciclo de locomoção com dois desenhos iguais.** Quatro quadros em que a perna quase não muda não
  é caminhada, é o personagem tremendo enquanto desliza, e passava batido por tudo (as outras réguas
  medem UM sprite por vez; este defeito só existe ENTRE quadros). O gate mede os seis pares na faixa
  das pernas e pega os dois modos: **quadro morto** (vizinhos idênticos) e **ciclo pendular** (w1≈w3
  e w2≈w4, o personagem balança entre duas poses em vez de trocar o apoio). Fica no `slice-walk`/
  `slice-run`, então reprova na hora de fatiar. Panorama do acervo:
  `node scripts/sprites/ciclo.mjs --acervo`
- **corpo escorregando** (`deriva`): o ciclo corre NO LUGAR, quem desloca o personagem é o motor. Se
  a massa de cabeça+tronco anda sozinha dentro do canvas, na tela ele desliza além do roteiro. A
  âncora medida é o TRONCO, não os pés (os pés se mexem por definição, e a âncora do slicer escorrega
  junto com eles). Calibrado contra `bellingham-riso/correr`, a melhor corrida do acervo.
- **personagem mudando de tamanho**: a cabeça é a régua (não muda com a pose), medida por AMPLITUDE
  entre quadros e não por desvio da mediana — desvio da mediana esconde justamente o par que o olho
  compara, e foi assim que uma folha com 13% de variação passou como "consistente"
- **quadros olhando pra lados diferentes**: um quadro espelhado no meio do ciclo. Barra acima de 2x
  espelhado, avisa entre 1,6x e 2x (personagem quase frontal dá sinal fraco sem ter defeito)
- fala de quem não está no enquadramento · gesto dirigido pro lado errado
- personagem andando **de costas**. Desde 02/08/2026 isso é quase impossível por construção: existe
  **UMA folha por rig, sempre olhando pra direita**, e ir pra esquerda é o motor espelhando (o número
  sai invertido e tudo bem). Não existe mais folha `-esq`, nem `--dir=left`, nem `asset dir`, nem o
  campo `numerado` com efeito. O INV-4 hoje só pega `preOrientado` (pose já desenhada virada, que não
  pode espelhar) mandado pro lado errado
- rig sem `_meta.json` — conserto: refaça o rig, ele grava a direção e a cronometragem sozinho
- gesto de uma vez **reiniciando** no corte — use `{ "mantem": "<gesto>" }`, ou `denovo: true` se for
  mesmo pra repetir
- sprite parada demais na tela, folha com a cabeça pulsando, sprite faltando

Os testes rodam de graça e sem gerar nada:

```bash
node scripts/testes/contrato.test.mjs   # os invariantes de encenação pegam o que prometem
node scripts/testes/cadeia.test.mjs     # o número de sprites atravessa contrato→prompt→slicer
node scripts/testes/vigia.test.mjs      # os validadores AINDA estão ligados (ver abaixo)
node scripts/asset.mjs doutor           # o que está declarado pela metade no acervo
```

**Rode o `vigia` depois de mexer em caminho, pasta ou nome de arquivo.** A pior classe de defeito
deste projeto não foi código errado, foi guarda que parou de guardar em silêncio: um validador que
não encontra nada devolve "tudo ok". Aconteceu duas vezes, as duas por mudança de pasta — a régua de
escala virou no-op por meses e a respiração dos personagens ficou desligada em todos os vídeos. O
`vigia` alimenta cada guarda com um caso sabidamente ruim e exige que ele reclame.

## 4.1 O que os gates NÃO pegam (é aqui que você precisa pensar)

Tudo abaixo passa batido por qualquer validador. Se o vídeo ficar ruim, é quase sempre por um destes:

- **O roteiro tem graça?** Nenhum gate lê piada. O material é humor de futebol; se o beat não tem
  virada, animação boa não salva.
- **Cada beat tem AÇÃO FÍSICA?** O INV-6 só pega o caso extremo (cena inteira sem ninguém agir).
  Personagem em pose falando é quadrinho com áudio, não animação — foi assim que um vídeo inteiro
  foi reprovado.
- **O gancho segura nos 2 primeiros segundos?** É TikTok. Ninguém mede isso por você.
- **A folha de sprite ficou boa?** Os números pegam cabeça pulsando e escala fora do tom, mas o
  veredito é o olho no `_card.png` / no preview do studio. Em gesto amplo (salto, tombo) a própria
  régua fica torta e o validador diz isso.
- **A orientação do OLHAR numa pose parada.** O INV-4 confere quem se desloca; quem está parado
  olhando pro lado errado ninguém pega.
- **Texto na tela.** A regra da casa é MÍNIMO: carimbo e legenda só em caso extremo, conte pela
  imagem. Nenhum validador conta caracteres.
- **O personagem é reconhecível?** Caricatura + número real da camisa é o que dá reconhecimento sem
  citar nome. Nada verifica isso.

## 5. Ao criar mecanismo novo: suba de camada

O projeto defende as regras em quatro camadas, da mais forte pra mais fraca. Ao resolver um problema
novo, tente sempre a camada mais alta possível — a diferença entre camada 1 e camada 4 é a diferença
entre "não acontece" e "não aconteceu dessa vez".

| camada | como funciona | exemplo |
|---|---|---|
| **1. Impossível de errar** | o dado carrega a regra, não existe botão pra errar | a cronometragem do gesto viaja no `_meta.json`; o composer deriva velocidade, arco e impacto |
| **2. Barrado** | gate reprova e o render devolve 422 | ciclo de passada que não anda, gesto pro alvo errado, fala fora do quadro, gesto reiniciando no corte |
| **3. Avisado** | aparece no relatório, com o conserto na mensagem | cena sem ação física, personagem nunca enquadrado, alvo longe demais |
| **4. Só humano** | nada mecaniza | se o roteiro tem graça, se o gancho segura, se a arte ficou boa |

Duas regras que valem a pena seguir:

- **Erro com saída declarada vence aviso.** Quando o caso "legítimo" existe mas é raro, bloqueie e
  ofereça um opt-out explícito (`denovo: true`) em vez de rebaixar pra aviso. Aviso ninguém lê;
  opt-out obriga quem quer mesmo a dizer que quer.
- **Ausência não aparece em relatório de FAIL.** Rig sem direção declarada não é erro de nada, é um
  buraco — e o validador fica cego nele. Por isso existe `asset doutor`, que transforma buraco em
  fila de trabalho.

## 6. Ao mexer no motor de animação

O que o composer deriva sozinho (não passe na mão, não hardcode): ritmo do ciclo, velocidade de
passada, arco do pulo, frames de impacto, sombra, squash, poeira, tremor. Tudo sai da **folha de
exposição** que o `slice-acao` grava no `_meta.json` ao lado da folha.

Ao mover pasta ou renomear caminho, procure quem faz `existsSync` no caminho antigo — a respiração
dos personagens ficou desligada em todos os vídeos por meses exatamente assim, sem erro nenhum.

Referência longa (por que cada regra existe, com as medições): `saga-fut/docs/VIDEOS.md` e
`saga-fut/docs/QUADRINHOS.md`.

## 7. Escrita

Português do Brasil. **Nunca use travessão** em texto para o usuário — vírgula, ponto ou hífen.
Personagem baseado em jogador real leva sempre o número real dele. Nos quadrinhos, os personagens
não se chamam pelo nome nas falas; na descrição do post, use o nome real do jogador.
