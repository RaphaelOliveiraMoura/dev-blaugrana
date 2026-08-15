# dev-blaugrana — instruções do projeto

Perfil `@devblaugrana`: quadrinhos e vídeos animados de futebol, em português. Conteúdo em
`saga-fut/`, ferramentas em `saga-fut-studio/`.

**São DOIS canais, e o motor é um só.** O `@devblaugrana` é de clube (Barça); o `@futgibi`
(`futgibi/`, aberto em 14/08/2026, handle igual nas quatro redes) é de futebol em geral e a regra
que gera todas as outras dele é **não existe clube NA ARTE**: nem cor, nem listra, nem escudo, nem
em painel histórico. **No TEXTO é o contrário: nomeie tudo.** Time, jogador, árbitro, cidade e ano
entram nas legendas, porque a premissa da série é informar de forma objetiva. Confundir as duas
transforma "não desenhe o escudo" em "não diga o nome", e foi assim que sete episódios do primeiro
lote contaram fatos sem dizer de quem eram (o `o-dia-24-a-0` narrava a maior goleada do futebol
brasileiro sem escrever Botafogo nem Mangueira em painel nenhum). Marca em `futgibi/IDENTIDADE.md`, conteúdo em `futgibi/EDITORIAL.md` (que aceita humor,
fato, história, zoeira e curiosidade: o TOM é livre, o que a peça AFIRMA é que precisa ser
conferível), pendências em `futgibi/LANCAMENTO.md` e alcance de conta zerada em
`futgibi/DISTRIBUICAO.md`. Tudo o mais é
compartilhado (studio, acervo, estilo `rabisco-riso`, gates), inclusive o `project.json`. Ao criar
peça do futgibi confira o elenco na mão (não há gate de escudo) e assine só a arte dele
(`node futgibi/marca/assinar.mjs <arquivo.png>`, que aceita qualquer caminho).

### TODA PEÇA NOVA DECLARA O CANAL (15/08/2026)

Quadrinho, vídeo e saga levam um campo **`canal`**: `"futgibi"` ou `"devblaugrana"`.

```jsonc
"canal": "futgibi",     // no quadrinho, no vídeo ou na saga (o episódio herda o da saga)
```

- **Ausência vale como `devblaugrana`**, e é por isso que os 127 itens anteriores a esta data não
  precisaram de migração. O preço é que **peça nova do futgibi PRECISA declarar**: esquecer não dá
  erro, só faz o item nascer no canal errado.
- **Canal inventado é barrado com 400** (`problemaNoCanal`, em `shared/canais.mjs`). Um
  `canal: "futigibi"` sumiria da lista e do cronograma dos DOIS canais sem erro nenhum.
- O studio tem um **seletor de canal no header**, ao lado do de modelo. Ele filtra lista de
  quadrinhos, de vídeos, de sagas e o cronograma inteiro; "os dois" mostra tudo com a marca de
  canal em cada card. Ele NUNCA escreve canal em item nenhum: trocar de canal na tela não move
  conteúdo de perfil.
- **A fila de publicação é por canal.** A sugestão de próxima data (aba Publicar) olha só o último
  agendado DAQUELE canal, senão postar num perfil empurraria a data do outro.
- O que continua compartilhado de propósito: personagens, estilos, cenários, objetos e trilhas.
  Eles são a fábrica, não a publicação. Duplicar isso é o caminho conhecido para os dois estilos
  divergirem sem ninguém ver.

```bash
node scripts/testes/vigia.test.mjs   # "OS DOIS CANAIS CONTINUAM SEPARADOS"
```

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

**Então a criação é sua, e cada tipo tem seu caminho.** Não uniformize sem ler o porquê:

| o que criar | por onde | quem já faz assim |
|---|---|---|
| quadrinho de história | `PUT /api/quadrinhos/<id>` | a skill `/o-dia-em-que` |
| quadrinho por CÓDIGO (gol, escalação, quiz, A Conta) | `PUT /api/dados` + fallback `writeDados` | os seis `gerar-*.mjs` |
| vídeo novo | `node scripts/video/new-video.mjs <id> --titulo=… --legenda=…` | ele grava por `PUT /api/videos/<id>` |
| dado de corrida | `node scripts/dados/fotmob.mjs corrida <videoId>` | grava por `PUT /api/videos/<id>` |
| personagem | `node scripts/asset.mjs personagem <slug> --ref=<foto>` | grava por `PUT /api/dados` |
| cenário, objeto, estilo | `GET /api/dados` → edita → `PUT /api/dados` | vivem no `project.json` |

```bash
curl -s -X PUT http://localhost:4600/api/quadrinhos/<id> -H 'Content-Type: application/json' -d @novo.json
```

**Por que os geradores por código usam `/api/dados` e não o granular:** eles precisam funcionar com
o studio FECHADO (o fallback grava direto no disco, o que é seguro justamente porque não há
ninguém em memória pra sobrescrever). Trocar isso pelo granular quebra o fallback.

**Título e legenda são obrigatórios em VÍDEO**, nas duas portas (`validarPayload` e
`problemaNoItem`). Foi por isso que o `new-video.mjs` gravava direto no disco até 12/08/2026: o
stub nascia vazio e não passaria na API — a regra que protege o acervo empurrava o script pra fora
dela. Hoje ele exige os dois como argumento e entra pela porta.

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

### O vídeo é feito de POSES, não de ciclos (14/08/2026)

O primeiro vídeo narrado foi reprovado pelo Raphael com a palavra certa: **engessado**. Não era a
animação, era o método. O roteiro tinha sido escrito em cima do que o acervo já tinha (idle, andar,
os gestos do catálogo), e encenar com o estoque disponível é como se escreve cena burocrática.

A referência da casa (Comentarista Edu) quase não anima: ela **troca de imagem**. Se o personagem
precisa apontar, entra o desenho dele apontando. Cada beat pede a SUA pose:

```bash
node scripts/asset.mjs pose ferran-riso taca --desc="<o que o corpo faz, em inglês>"
```

Pose estática sai por geração única (sem gate de ciclo, sem cabeça pulsando entre quadros, sem
refazer duas vezes) e aceita PROP, que é o que uma folha de gesto não dá: a taça erguida, a mala na
mão, o papel na altura do peito. Foram três poses e dois cenários num vídeo inteiro.

**O PERSONAGEM NÃO PODE MUDAR DE TAMANHO ENTRE UMA POSE E OUTRA.** Toda peça é encaixada no canvas
pela SILHUETA, então o que a pose põe acima da cabeça (braço erguido, taça, bola de ouro) entra na
conta e o corpo encolhe pra caber: medido, 30% no `ferran/taca` e 28% no `rodri/taca-espanha`. Na
tela é o mesmo personagem diminuindo no meio do próprio vídeo, sem nada no roteiro ter mudado.

O conserto é o mesmo que as folhas de ação já tinham (`aperto`), agora nas poses: o fator é MEDIDO
contra o idle do personagem e gravado no `poses/_meta.json`, e o motor desfaz o encolhimento no `w`.
Mora no acervo de propósito, não no roteiro: qualquer vídeo que use aquela pose já nasce certo.

```bash
node scripts/sprites/medir-escala-pose.mjs --acervo             # mede e grava tudo
node scripts/sprites/medir-escala-pose.mjs <slug> --comparar    # folha: idle x pose x pose corrigida
```

O `asset pose` já chama sozinho, e regerar o **idle** remede todas as poses (ele é a régua).

**O APERTO VALE NOS DOIS SENTIDOS.** O motor testava `aperto > 1.03`, então só aplicava correção
que AUMENTA — tudo que precisava DIMINUIR era descartado em silêncio. Esse foi o defeito que
sobreviveu a três rodadas de conserto, porque era invisível de todos os ângulos: o medidor media
certo, o `_meta.json` guardava o número certo, o verificador de conjunto lia o arquivo e aprovava, e
só o motor sabia que tinha jogado fora. A caminhada do Rodri tinha 0.963 gravado e desenhava em 1.0,
chegando 10% maior que os companheiros e "encolhendo" ao virar pose.

Lição que vale além daqui: **filtro assimétrico em fator multiplicativo é sempre suspeito.** 0.96 e
1.04 são o mesmo tamanho de erro em direções opostas, e um `>` no lugar de um `Math.abs(x-1) >`
esconde metade dos casos sem nunca dar erro.

**CORRIGIR PEÇA POR PEÇA NÃO BASTA: o conjunto tem que fechar.** O projeto passou a ter DUAS
réguas medindo a mesma coisa (a folha de ação usa a largura da cabeça, a pose usa olhos-aos-pés), e
duas réguas discordam por construção. No `rodri-riso` a caminhada saiu com `aperto` 1.068 e a pose
com 1.0, cada uma "certa" pela sua — e na tela ele chegava andando **18% maior** do que ficava ao
parar, na mesma cena. Nenhum medidor de peça isolada enxerga isso.

```bash
node scripts/sprites/coerencia-escala.mjs <slug>              # o tamanho EFETIVO de cada peça
node scripts/sprites/coerencia-escala.mjs --acervo --corrigir # grava o aperto que faz tudo fechar
```

Ele compara o que o motor VAI DESENHAR (medida × aperto) entre todas as peças do personagem e
reprova acima de 8% de amplitude. O `asset` roda sozinho depois de gerar pose, ação e idle, e o
vigia tranca. Rodado no acervo: 6 personagens estavam fora, 4 foram corrigidos.

**Como ele sabe quando uma régua não vale: pelas DUAS.** Olhos-aos-pés só mede escala com o
personagem em pé (no carrinho, no espalmar, no tombo o corpo sai da vertical e a distância encurta
de verdade); a largura da cabeça não sofre disso mas erra com prop erguido. Quando as duas
concordam, a peça está em pé e a medida vale; quando discordam muito, a peça sai da conta em vez de
virar falso positivo. Sem isso o verificador acusava o goleiro do `defender` em -33%, e aquele
goleiro está esticado no chão, não encolhido.

**`--corrigir` EXIGE UM PERSONAGEM, e isso custou pra aprender.** Rodar no acervo inteiro parece o
atalho óbvio: gravou 19 peças de uma vez, e entre elas o `khelaifi-riso`, que é uma túnica longa sem
pernas visíveis — olhos-aos-pés acusa 15% de diferença onde a folha de prova mostra as duas do mesmo
tamanho. Reverter custou refatiar tudo (`slice-acao`, sem geração) e três não voltaram porque a
folha reprova em outros gates. Um personagem por vez obriga a olhar a folha antes de aceitar.

**Dois medidores escrevem o `poses/_meta.json`** (orientação e escala), e o `medir-orientacao`
substituía o objeto inteiro: rodá-lo apagava o `aperto` de TODAS as poses do acervo, em silêncio.
Hoje os dois fazem merge. Quem pegou foi o vigia, não o olho — é a classe de defeito favorita daqui.

**Sobrou um buraco declarado:** `rig/correr` do `araujo-riso` (-8,8%) e do `messi-riso` (-13,6%).
Rig não tem campo `aperto` (o motor não aplica em rig), então o conserto ali é regerar a folha, não
gravar número.

**A régua é dos OLHOS aos PÉS, e as outras três foram testadas e reprovadas:** largura da cabeça
(a que o `slice-acao` usa) mede o TROFÉU, porque procura a cabeça no topo da silhueta; largura na
linha dos olhos é contaminada por braço colado à cabeça; distância entre os olhos confunde rotação
com escala. Calibragem: das 27 poses medíveis, 23 caem dentro de 5% e as 3 pontas são exatamente as
de braço erguido.

**12 poses do acervo NÃO são medidas** (olho fechado no grito, personagem de costas), e o script as
lista. A pele do rosto foi testada como plano B e reprovou pelo motivo mais irônico: braço erguido
mostra antebraço, antebraço é pele, e a régua fica cega no único caso que importa. Pra essas, o
`aperto` pode ser escrito à mão no `_meta.json` decidindo pela folha do `--comparar`.

**Os gates de imobilidade foram ajustados junto, e o motivo importa:** eles nasceram quando o vídeo
era MUDO, onde personagem parado com legenda é tela congelada (foi assim que o `mbappe-ditador` foi
reprovado). Com voz saindo do balão a conta muda. Hoje o INV mede **tempo morto** (segundos sem
ação NEM fala) em vez de "alguém agiu?", e o limite de sprite parada dobra em shot com voz. O que
continua reprovando é imagem parada em silêncio, que é defeito em qualquer método.

**ANDAR PRO FUNDO NÃO É PULAR.** `moveY` serve pra duas coisas opostas: LEVANTAR o personagem
(pulo, escalar muro) e ANDAR EM DIAGONAL pro fundo em perspectiva. Pra sombra elas são o inverso uma
da outra — no pulo ela fica no chão, encolhe e desbota; andando pro fundo ela vai JUNTO e encolhe só
pela perspectiva. Sem separar as duas, quem caminha na diagonal parece que está pulando o trecho
inteiro, porque sombra parada e desbotada é exatamente o sinal visual de "está no ar".

Hoje o composer separa sozinho: `moveY` num beat de `andar`/`correr`/`ciclo` (e sem `pulo`) vira a
trilha `soloY`, e o motor move a sombra com ela em vez de tratar como voo. Não há nada a declarar no
roteiro. A sombra também passou a encolher junto com `escala`, senão ela gruda o personagem na
frente da cena enquanto o corpo já está lá no fundo.

**Fundo animado (`sh.animado: true`)**: troca a camada do chão pelo `.mp4` da mesma vista, gerado
no Grok a partir do panorama. O que decide se presta é **o que se move**: mexer na MULTIDÃO é o que
deforma gente e o que fez a primeira versão ser reprovada ("torcedores estranhos"), junto com o
confete que o modelo inventa sozinho. A versão aprovada (14/08/2026, escolhida entre três) move só
**a luz dos flashes e o tecido das bandeiras**, com a torcida parada: o que se move não tem rosto.
O prompt proíbe explicitamente confete, movimento de câmera e qualquer coisa caindo do céu. Custo
escondido: o render fica ~2,5x mais lento, porque o Remotion extrai frame do MP4 a cada quadro.

**Duas locações num vídeo:** `sh.set` troca a ficha de lugar no shot, mantendo o modo mundo. A
troca de cenário é o corte mais barato que existe e costuma ser a própria virada (o estádio celebra,
o escritório dispensa).

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

**A capa leva o dado mais FORTE, o fecho leva o significado.** Se o número que faz o torcedor
parar o dedo só aparece no último painel, a capa está errada, e o conserto é trocar de lugar, não
caprichar na frase. O teste: olhe os beats e pergunte qual você contaria primeiro num boteco.
Quatro episódios nasceram com o dado forte enterrado no miolo (o `o-dia-seis-da-manha` abria com
o horário do treino, quando o absurdo era o elenco ser amador e ter emprego), e no
`o-dia-socios` a capa até contradizia o próprio miolo. Confira também se o número prometido na
capa é o mesmo lá dentro. Detalhe em §3.1 do doc da série.

**O último painel dá um VEREDITO ou a ponte com o hoje, nunca o último dado do fato.** Nenhum gate
lê isso, e é o defeito que mais engana: o `o-dia-rottweilers` fechava em "eles se chamavam Trotsky
e Demon", fato certo e checado, passou em tudo, e o Raphael leu e disse que "ficou meio em aberto e
estranho". Dado não fecha, parece que vai continuar. Teste antes de gerar: leia a última linha e
pergunte "e daí?" — se houver resposta, ela é o painel que falta, porque fecho ausente é beat
faltando, não frase faltando. O veredito também pode vir por FALA (o `o-dia-abidal` fecha num
balão), então revise legendas e falas juntas. **Veredito não é reafirmação**: se a frase pode ser
deduzida dos painéis anteriores, ela ecoa com cadência de fecho e não conclui nada. O porquê, os
dois modos de falhar e a medição que mostrou que isso não pode virar régua estão na §2.2 do doc da
série.

**Número que exige conversão mental não informa.** "O café da manhã custava uma peseta e meia" não
diz a quem lê em 2026 se aquilo era caro ou barato, e o beat dependia disso. Vale pra moeda antiga,
moeda estrangeira e medida de época: ou vem a régua de comparação (que é CHECAGEM, não estimativa,
e em fonte única quase nunca existe), ou o número sai e fica o fato. Fica sem régua só o número
documental cujo significado a história já estabeleceu. Detalhe em §4.0.1 do doc da série.

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

## 3.3 Som: o vídeo não sai mais mudo (13/08/2026)

Até esta data todo vídeo animado nascia `semAudio: true` e saía mudo, e não era só a flag: o
`montar-cena` montava o áudio **sempre zerado**, então o roteiro não tinha como declarar som nenhum.
A referência da casa (Comentarista Edu) tem som contínuo do primeiro ao último frame, sem um
silêncio acima de 0,2s. Três camadas entram hoje:

```jsonc
"ambiente": "estadio-ambiente",                      // leito, roda por baixo da cena inteira
"sons": [{ "id": "porta-abre", "at": 4 }],           // no SHOT, `at` em frames
"baloes": [{ "texto": "50 MILHOES", "voz": "laporta", "in": 56 }]   // a voz sai do BALÃO
```

**A voz sai do balão de propósito.** Legenda e áudio no mesmo campo é o que torna impossível o
vídeo sair com a legenda nova e a voz velha. O escape é `dizer`, só pra sigla que a voz soletra
errado ou número que a tela quer em dígito.

**TODO SOM TEM HORA DE ACABAR, e quem decide não é o tamanho do MP3.** A ficha diz se o som é
**evento** (apito, porta, flash: toca inteiro, pode atravessar o corte) ou **leito**
(`continuo: true` — passos, torcida, relógio: é cortado no fim da CENA, que é a corrida de shots no
mesmo `set`). Sem isso o `passos` tocava seus 10,5s de arquivo e o personagem continuava fazendo
barulho de pé depois de parar, por 3,6s no `ferran-amor`. Ninguém lê o tamanho de um MP3 num
roteiro e imagina isso, e erro de som não tem sintoma visual: atravessou render, validação e folha
de revisão.

**Passo NÃO se declara: sai do movimento.** O composer já sabe quem se desloca a pé em cada frame e
emite o som na janela exata; `{"id":"passos"}` no roteiro é ignorado com aviso. Isso é camada 1
(não há um segundo número pra manter alinhado), e de quebra apareceu som onde faltava — o mesmo
vídeo tinha o personagem saindo de cena com a mala em SILÊNCIO porque ninguém lembrou de declarar.
`semPassos: true` desliga no shot. Os opt-outs (`dur` no som, `manual: true` no passo) têm guarda:
o INV-11 reprova leito que vaza da cena e passo com todo mundo parado.

**E dá pra VER E OUVIR JUNTO: aba Linha do tempo do vídeo no studio.** Player em cima, e embaixo a linha do
tempo com ambiente, passos, sons e voz na mesma régua, fronteira de cena marcada e a parte cortada
de cada arquivo em listras. O cursor atravessa as faixas, o bloco acende quando o som entra, e
clicar leva o vídeo pra lá: separados, ligar "ouvi um passo estranho" ao bloco certo custa contar
segundos de cabeça, que é o esforço que faz ninguém conferir. O dado sai da mesma `montarCena` do
mux, então a tela não aproxima o áudio, ela é o áudio. Era a única camada do vídeo sem
representação na tela, e por isso a única onde um defeito atravessava tudo sem ninguém ver.
A tela avisa quando o MP4 é anterior à última edição do roteiro, porque as duas metades vêm de
fontes diferentes e som velho embaixo de linha do tempo nova tem todo o ar de estar de acordo.

### Cada aba do vídeo responde UMA pergunta (não uniformize)

| aba | pergunta |
|---|---|
| **Render** | o vídeo está pronto e passou nos gates? |
| **Animatic** | a encenação funciona, antes de gerar asset? |
| **Assets** | de que este vídeo é feito (sprite, cenário, o que sai por código)? |
| **Linha do tempo** | QUANDO cada som, cena e fala acontece (com o player junto) |
| **Roteiro** | O QUE ACONTECE, beat a beat, em português |
| **Palco** | ONDE cada um está no quadro |

Duas dessas telas já ficaram **mostrando nada em silêncio**, pelo mesmo tipo de causa: código lendo
um formato ou um caminho que deixou de existir, sem erro nenhum. A aba Roteiro passou meses
imprimindo uma linha em branco por cena porque lia `personagem`/`veredito`, campos dos templates
anteriores ao motor de shots (nenhum dos 13 vídeos do acervo os tem). O Palco montava
`/files/videos/<id>/kf/…` na unha, pasta que só existe DURANTE o render desde a migração pro
acervo, e abria com um retângulo preto por personagem.

Ao abrir uma tela do vídeo e ver conteúdo vazio, **suspeite do leitor antes do dado**: tela sem
dado deveria dizer que não tem dado, e a que não diz está lendo o lugar errado.

**A FALA FICA EM CIMA DE QUEM FALA. Sempre.** Declare `de: "<slug>"` e **não ponha `x`**: num shot
com dois personagens, fala no centro da tela é atribuída ao personagem errado, e o espectador não
volta atrás pra conferir. Isso só é regra viável porque o motor resolve os dois motivos que
empurravam a fala pro centro na mão: frase longa **quebra em linhas** (era `nowrap`) e o bloco é
**clampado na janela visível**, então falante encostado na borda tem o texto empurrado pra dentro em
vez de cortado. Frase grande pode e deve virar duas ou três falas curtas em sequência. O INV avisa
quando um balão com dono tem `x` fixo.

**ACENTO ERRADO VIRA VOZ ERRADA, e isso é barrado.** Como legenda e fala saem do mesmo campo, um
acento faltando estraga as duas: o `say` lê "e" como conjunção átona e "é" como o verbo tônico, e
os áudios são medidamente diferentes (2,208s contra 2,304s na mesma frase). Antes da voz isso era
um errinho de digitação; hoje é uma frase falada errada no vídeo publicado. O gate
(`shared/acentuacao.mjs`) pega as formas que não existem sem acento ("voce", "nao", "ninguem",
"milhoes") e o "e" que devia ser "é" depois de sujeito ou pronome. Foi calibrado contra os 700
textos do acervo: 8 apontamentos, os 8 reais, zero falso positivo (e por isso `la` de "La Masia" e
"ele e outros" ficaram deliberadamente de fora). **Revise a acentuação antes de gerar a voz**, ou o
áudio sai errado e você só descobre ouvindo.

A voz é a **Eddy em português**, do `say` (custo zero, offline, escolhida ouvindo). Cuidado:
`say -v Eddy` pega a Eddy **inglesa**, que lê português com fonética de inglês; o nome completo
`"Eddy (Portuguese (Brazil))"` mora numa constante em `scripts/audio/falar.mjs` justamente por isso.
Timbre por personagem também mora lá, não no roteiro: pitch escolhido cena a cena faz o mesmo
personagem mudar de voz entre shots.

Meça a fala ANTES de dimensionar o shot: `node scripts/audio/falar.mjs "<texto>" --quem=ferran`
devolve segundos e frames.

Som novo entra por uma porta só, e ela **só enxerga CC0**, pra que o caminho fácil e o caminho
seguro sejam o mesmo:

```bash
node scripts/audio/buscar-sons.mjs "crowd boo"    # termo em INGLÊS ("vaia" devolve zero)
node scripts/audio/baixar-sons.mjs                # reconstrói o acervo e normaliza em -20 LUFS
```

Cada som carrega `licenca` E `risco`, e o vídeo herda o pior risco dos sons que usa. Som sem ficha
não é "provavelmente ok", é `evitar`. Regra completa, com o que a lei brasileira diz e o que o robô
da plataforma faz na prática: `saga-fut/docs/AUDIO.md`.

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
- personagem andando **de costas**. Este é o defeito mais teimoso do projeto, e desde 14/08/2026 a
  orientação deixou de ser convenção e virou **dado medido da própria arte**: o slicer roda o
  medidor (`scripts/sprites/orientacao.mjs`, que acha os olhos e a pele na faixa da cabeça) e grava
  `olhaPara` no `_meta.json`. O motor tira o espelho DESSE campo, o INV-4 compara com a direção do
  movimento, e o vigia alimenta o medidor com uma imagem espelhada pra garantir que ele não ficou
  cego. Folha desenhada virada passa a ser **compensada**, não a virar defeito.
  A varredura que criou o campo achou **12 peças do acervo desenhadas viradas** que ninguém sabia:
  `node scripts/sprites/medir-orientacao.mjs --acervo`.
  Corolário: **não declare `preOrientado` na mão.** Ele agora contradiz a medição e o INV-4 reprova
  (declarar numa folha que estava certa faz o personagem andar de costas do mesmo jeito que
  esquecer numa folha virada, e foi assim que o `ferran-amor` saiu errado)
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
