---
name: o-dia-em-que
description: Cria um episódio da série "O Dia Em Que..." do fato real ao carrossel gerado, na ordem que já custou geração pra descobrir (checagem antes do roteiro, ficha antes do painel, capa escolhida olhando). Use quando o pedido for criar/refinar um quadrinho da série "O Dia Em Que" do SagaFut.
---

# Um episódio de "O Dia Em Que...", do fato ao carrossel

A série está documentada em `saga-fut/docs/SERIE-O-DIA-EM-QUE.md` (o que é regra editorial) e o
motor em `saga-fut/docs/QUADRINHOS.md` (schema, estilo, elenco, cenário, prompt). **Leia os dois.**
Esta skill é só a ORDEM de execução: o que vem antes do quê, e onde o humano decide.

A ordem não é burocracia. Cada inversão dela já custou geração: roteiro escrito antes da checagem
que teve que ser reescrito, painel gerado antes da ficha que saiu com outro personagem, capa
decidida no texto que reprovou quando virou imagem.

## 0. Escolha a história E o ângulo

Banco de próximos episódios: §10 do `SERIE-O-DIA-EM-QUE.md`, agrupado pelo que cada um custa de
ficha nova. Antes de começar, confira o que já existe (`ls saga-fut/data/quadrinhos/o-dia-*.json`)
pra não repetir um ângulo já publicado.

Uma história serve se cumpre as quatro exigências: **real, evergreen, culé, desenhável**.

**Escolha também o `angulo` (§2.1 do doc da série), porque ele muda o ÚLTIMO PAINEL, e o último
painel não se conserta depois sem reescrever o episódio:**

- `fato` — a coisa aconteceu, e fecha em ponte com o hoje. É o padrão, e o que os 52 primeiros são.
- `quase` — a coisa NÃO aconteceu, e fecha em **pergunta sem resposta**. É o único fecho da série
  que pede resposta, e por isso o que mais rende comentário. Exige checagem mais dura que o
  normal: negociação que não aconteceu é o terreno mais lamacento do futebol.
- `outro-lado` — o mesmo fato pelos olhos de quem perdeu ou de quem ninguém viu, e fecha na
  **inversão**. É a única parte da série que aceita derrota nossa, e o tom (luto ou deboche
  assumido) é pergunta pro Raphael, na leva do §2.

**Rotacione:** não emende dois episódios do mesmo ângulo. Confira o campo `angulo` dos últimos.

```bash
node -e "const fs=require('fs');const d='saga-fut/data/quadrinhos';for(const f of fs.readdirSync(d)){const j=JSON.parse(fs.readFileSync(d+'/'+f,'utf8'));if(j.selo==='O Dia Em Que')console.log((j.angulo||'fato').padEnd(12),j.id)}"
```

O ângulo NÃO é selo. Já foi tentado dar selo próprio a `quase` e a `outro-lado`, e reprovou: a
capa escrita pro piloto de "Quase" dizia "O DIA EM QUE...", que é a fórmula da própria série. O
porquê inteiro está no §2.1.

## 1. CHECAGEM DE FATOS, antes de escrever qualquer beat

Não é etapa de revisão, é a primeira. Pesquise na internet, cruze pelo menos **três fontes** e
anote no que elas divergem. O que vai pro campo `contexto` do quadrinho:

- toda data, placar, valor, nome e idade, com as fontes listadas;
- **as divergências**, com a versão escolhida e por quê ("uma publicação catalã traz 08/08; a
  majoritária é 06/08 e é a usada");
- **o que NÃO foi confirmado e por isso não entrou no roteiro.** Este é o campo que mais evita
  retrabalho: escrito, ninguém tenta de novo daqui a um mês.

A checagem costuma MELHORAR o roteiro, e é normal o melhor beat do episódio sair dela: no Pedri
foi a neve que reduziu sete dias de teste a três; no Sunyol foi o subtítulo do jornal que ele
fundou, "esport i ciutadania", que é o que faz a morte dele significar alguma coisa.

## 2. As perguntas que são do Raphael (faça cedo, numa vez só)

Pergunte só o que muda o trabalho, com opções concretas e uma recomendação, e **antes de escrever
o JSON**. As que costumam aparecer:

- **De qual CANAL é o episódio**, se o pedido não disser: `@devblaugrana` (Barça) ou `@futgibi`
  (futebol em geral). É a primeira pergunta porque muda o campo `canal` do JSON, o que pode
  aparecer na arte (no futgibi não entra escudo nem cor de clube) e em qual cronograma ele cai.
- **Tom, quando o fato é pesado** (morte, doença, violência real). Ofereça o tratamento elíptico
  como padrão: o ato nunca desenhado, o corte acontecendo na legenda.
- **Quem fecha o episódio.** Personagem da casa, o próprio protagonista, ou só o lugar sem
  ninguém. Muda o elenco e às vezes elimina uma ficha nova.
- **A foto de referência**, se entra pessoa real sem ficha (ver §4).

Não pergunte formato, número de painéis, estilo nem acabamento: são regra da casa e você decide.

## 3. Roteiro: beats primeiro, JSON depois

Molde, voz das legendas e rotação da fórmula de gancho estão no `SERIE-O-DIA-EM-QUE.md` (§2, §3 e
§4). Os três que mais reprovam:

- **Teste do corte é etapa, não intenção.** Painel por painel: "se eu tirar, perde informação ou
  emoção?" Painel fraco costuma ser sintoma de beat FALTANDO, não de painel sobrando.
- **Voz de notícia.** Nomeia todo mundo, ordem direta, fato de cara. O efeito emocional sai do
  fato escolhido e da imagem, nunca do jeito de narrar.
- **Nome sozinho não apresenta ninguém** (§4). Todo nome de pessoa entra com aposto de três
  partes: o que ela faz, de onde vem quando isso importa, e por que importa NESTA história. "László
  Kubala" virou "um atacante húngaro que tinha fugido do regime comunista"; sem a terceira parte o
  `o-dia-ali-dia` perdia o golpe, porque o telefonema só assusta se Weah era Bola de Ouro. Teste:
  leia fingindo que nunca ouviu o nome. O dado quase sempre já está no `contexto`, vindo da
  checagem — o buraco aparece porque quem escreve acabou de ler tudo e acha que o nome se explica.
- **Nada de perífrase no miolo** (§4 do doc): "com a camisa do outro lado", "o técnico", "o
  presidente", "um jogador que o clube tinha emprestado" — o leitor não decifra no scroll e o beat
  morre. Se o nome está na checagem, ele vai na legenda. Exceções que se declaram: a capa (que
  guarda o nome de propósito), o anônimo de fonte e o menor de idade.
- **O EPISÓDIO TEM QUE DIZER QUEM FEZ. Sempre.** A premissa da série é levar informação de forma
  objetiva: o leitor termina o carrossel sabendo QUEM, QUANDO e ONDE. Um recorde sem o nome de
  quem bateu, e sem o nome dos times, não informa nada, e é o defeito mais fácil de cometer porque
  cada painel isolado parece correto.

  Aconteceu no lote de 15/08/2026, e em SETE dos oito episódios: as legendas diziam "um time fez
  24 gols", "um atacante de 18 anos", "o goleiro tomou café", "um caricaturista de 19 anos". O
  `o-dia-24-a-0` contava a maior goleada do futebol brasileiro sem escrever Botafogo nem Mangueira
  em painel nenhum.

  A causa vale mais que o caso: **a regra do futgibi proíbe clube na ARTE (escudo, cor, listra),
  não no TEXTO.** Confundir as duas transforma "não desenhe o escudo" em "não diga o nome", e aí
  o quadrinho vira adivinhação. Nomeie times, jogadores, árbitros e cidades; o que não pode é o
  escudo aparecer desenhado.

  Teste antes de gerar: **leia só as legendas, em sequência, e responda quem fez, quando e onde.**
  Se faltar um dos três, falta nome em algum painel. Consertar depois custa zero geração (a
  legenda é código), mas o episódio pode já ter sido publicado sem informar.
- **Rotacione a fórmula da capa.** Confira no `contexto` dos episódios anteriores qual já foi
  usada; a lista está na §3 do doc da série.
- **O último painel dá um VEREDITO ou a ponte com o hoje, nunca o último dado do fato** (§2.2).
  Teste: leia a última linha e pergunte "e daí?". Se houver resposta, ela é o painel que falta.
  E **veredito não é reafirmação**: se a frase pode ser deduzida dos painéis anteriores, ela ecoa
  com cadência de fecho e não conclui nada. Foi o que aconteceu na primeira correção do
  `seis-da-manha` ("eram os mesmos homens que vestiam a camisa no fim de semana"), reprovada por
  confusa mesmo tendo sido escrita já com a regra do fecho na mão.
- **Número que exige conversão mental não informa** (§4.0.1). "Custava uma peseta e meia" em 1915
  não diz a quem lê hoje se é caro ou barato. Ou vem a régua (e régua é checagem, não estimativa),
  ou o número sai e fica o fato. Exceção: número documental cujo significado a história já
  estabeleceu, como as 461 mil pesetas que salvaram o clube no `o-dia-mexico`.
  O `o-dia-rottweilers` fechava em "eles se chamavam Trotsky e Demon", passou em tudo, e o
  Raphael leu e disse que ficou em aberto. Cuidado também com fecho que SUBTRAI sem explicar
  ("cinco anos depois sobravam dois"): o leitor sai com a pergunta, não com a história.

Apresente os beats em texto pro Raphael antes de gerar qualquer coisa. Beat errado descoberto
depois da arte custa a arte inteira.

## 4. Elenco: ficha ANTES do painel, foto FRONTAL

Pessoa real só entra com ficha aprovada (§6 do doc da série). O caminho:

1. **Ache 2 ou 3 retratos FRONTAIS**, rosto olhando pra câmera. Regra do Raphael, 10/08/2026:
   perfil e três quartos entregam meio rosto, e o modelo inventa justamente o que faz a caricatura
   parecer a pessoa. Personagem histórico costuma não ter foto livre no Wikimedia Commons; nesse
   caso valem arquivos de clube, fundações biográficas e imprensa.
2. **Mostre as candidatas e deixe o Raphael escolher olhando** (`SendUserFile` + uma pergunta). A
   escolha muda a caricatura: no `sunyol-riso` a diferença entre elas era o bigode fino, que é a
   silhueta inteira de um rosto que ninguém reconhece de cara.
3. Instale a escolhida como `saga-fut/personagens/<slug>/ref.png`.
4. Crie o personagem (GET `/api/dados`, insere em `personagens`, PUT `/api/dados`) com `regras` em
   PT-BR e `promptFicha` em inglês. Copie a estrutura de uma ficha recente (`rexach-riso` é o
   melhor molde pra dirigente, `abidal-riso` pra jogador). **Registre no `regras` qual foto foi
   escolhida, a fonte e a data de aprovação.**
5. Gere e mostre a ficha pro Raphael aprovar **olhando**, antes de qualquer painel:

```bash
curl -s -X POST http://localhost:4600/api/generate/imagem -H 'Content-Type: application/json' \
  -d '{"tipo":"ficha","personagemId":"<slug>"}'
```

Dê ao personagem um **objeto-símbolo** (a caneta do Rexach, o jornal do Sunyol): é ele que carrega
a história quando o rosto não é reconhecível.

## 5. O JSON do episódio

Escreva o arquivo e salve pela API, nunca editando `data/` direto (o studio sobrescreve):

```bash
curl -s -X PUT http://localhost:4600/api/quadrinhos/<id> -H 'Content-Type: application/json' -d @<id>.json
```

O PUT granular já adiciona o id ao `quadrinhoOrder`. Depois crie as pastas:
`saga-fut/quadrinhos/<id>/paineis/` e `saga-fut/quadrinhos/<id>/capas/`.

Campos que o episódio novo SEMPRE tem: `tipo: carrossel`, `selo: "O Dia Em Que"`,
`estiloId: rabisco-riso`, `formato: "3:4"`, `moldura: "codigo"`, `legendaPorCodigo: true`,
`agenda` no aniversário do fato, `publicacao.titulo` e `legenda`.

**E O `canal`, que decide em qual PERFIL o episódio nasce** (15/08/2026). A série roda nos dois:
`"devblaugrana"` (Barça) e `"futgibi"` (futebol em geral, sem clube nenhum na arte).

```jsonc
"canal": "futgibi",
```

Ausência vale como `devblaugrana`, então **episódio do futgibi que esquecer o campo nasce no perfil
errado, e sem erro nenhum**: ele some da lista e do cronograma do futgibi e aparece no do Barça.
Canal escrito errado é barrado com 400. Pergunte de qual canal é o episódio ANTES de escrever o
JSON, junto das outras perguntas do §2, porque isso muda também o que pode aparecer na arte: no
futgibi não entra escudo, cor nem listra de clube, nem em painel histórico.

**`agenda` é `"YYYY-MM-DD"`, COM ANO, e o ano é o do próximo aniversário.** O fato de 1992 vira
`"2026-11-19"`, não `"19/11"`: o cronograma casa a data com a chave do dia, então data sem ano
não bate com dia nenhum E não conta como pendente, e o quadrinho some das duas listas da tela.
Foi assim que 58 episódios desta série ficaram invisíveis de uma vez. Hoje o PUT devolve 400,
mas escrever certo sai mais barato que descobrir pelo erro. Se o aniversário deste ano já
passou, use o do ano que vem ou deixe sem `agenda` (o item cai em Pendentes, pra você arrastar).

### A trilha nasce com o roteiro: 3 sugestões, a primeira é a default

Escolher música é a última coisa antes de postar, e é quando quem posta tem menos contexto do
que quis dizer. Quem acabou de escrever o roteiro sabe se aquilo é deboche ou luto; quem chega
no fim, com 56 faixas na frente, não sabe mais. Por isso a escolha sai daqui.

```json
"videoMusica": "memoria-lone-harvest.mp3",
"trilhaSugestoes": [
  { "arquivo": "memoria-lone-harvest.mp3", "porque": "somber e uplifting: o arco do luto ao título numa faixa só" },
  { "arquivo": "gloria-long-road-ahead.mp3", "porque": "coro épico, se o peso for no gol e não no morto" },
  { "arquivo": "memoria-reaching-out.mp3", "porque": "piano só: peso todo na homenagem" }
]
```

Regras que o PUT barra com 400: o `arquivo` tem que estar no catálogo
(`saga-fut-studio/shared/musica-quadrinho.mjs`, com o nome exato do MP3), cada sugestão precisa
de um `porque` (por que ela serve pra ESTE quadrinho, não o que a faixa é), e `videoMusica`
precisa ser uma das três.

**São três porque tom é julgamento, não dedução.** No `o-dia-dani` cabia a homenagem (piano) e
o triunfo (coro), leituras diferentes do mesmo fato. Ofereça as duas pontas e uma no meio, e
ponha como default a que você defenderia. Uma sugestão só vira imposição disfarçada.

Os dez tons e o que cada um cobre estão em `TONS`, no mesmo arquivo. Os seis primeiros são
comédia; **`memoria`, `gloria`, `historia` e `tensao` existem porque esta série tem episódio
sério**, e o acervo cômico não tinha uma faixa que servisse pro gol do Iniesta com "Dani Jarque
siempre con nosotros" por baixo da camisa.

Se NENHUMA das 56 servir, não force: diga isso e peça pra ampliar o acervo (o catálogo se
amplia por `scripts/baixar-musicas.mjs`, tudo Kevin MacLeod sob CC BY 4.0).

Com `legendaPorCodigo: true` o texto do painel vive em `legendas[]` e é desenhado no export, então
**a arte não leva letra nenhuma**: todo prompt termina proibindo texto, e cada painel reserva o
topo (carimbo de progresso) e a faixa de baixo (barras de legenda). Corrigir uma legenda não custa
geração; corrigir uma palavra desenhada custa o painel inteiro.

## 6. A capa nasce em 2 ou 3 opções, escolhida OLHANDO

A capa vale ~80% do carrossel. Gere as opções como painéis temporários apontando pra
`quadrinhos/<id>/capas/a.png`, `b.png`, `c.png`, mande as três com `SendUserFile`, e só depois
mova a escolhida pro painel 1 e apague os temporários do JSON.

**Antes de escrever a capa, ache o dado mais forte do episódio** (§3.1 do doc da série): olhe a
lista de beats e pergunte qual deles você contaria primeiro num boteco. Se não for o da capa, a
capa está errada, e o conserto é trocar de lugar, não caprichar na frase. Horário não é gancho,
"100 jogos" não é gancho; número que quebra recorde é, contradição é. Quatro episódios do acervo
nasceram com o dado forte enterrado no miolo (`seis-da-manha`, `gavi-100`, `goleiro-artilheiro`,
`socios`), e num deles a capa até contradizia o próprio miolo.

**Cheque também a capa contra o miolo**: número prometido na capa que muda lá dentro é o defeito
que mais confunde (o `o-dia-rottweilers` prometia dois cachorros e entregava quatro).

**A capa pode OMITIR o nome, não pode INDUZIR o nome errado** (§3.2). Leia a capa fingindo que não
conhece a história e pergunte quem é o sujeito: se a resposta automática for "o Barça" e o episódio
não for sobre o Barça, o nome entra na capa. O `o-dia-onze-um` dizia "O CLÁSSICO TERMINOU 11 A 1" e
quem tinha levado os onze era o Barça.

Direções que funcionam quando o protagonista é desconhecido: o **objeto** em cena, o **lugar**
vazio, o contraste de escala. Close de rosto só puxa quando o rosto significa algo, e já reprovou.

## 7. Gerar os painéis

Ordem: **painel-âncora de cenário primeiro** (o servidor só anexa o âncora se a imagem já existe em
disco), depois os dependentes. No máximo 2 gerações em paralelo.

```bash
curl -s -X POST http://localhost:4600/api/generate/imagem -H 'Content-Type: application/json' \
  -d '{"tipo":"painel","quadrinhoId":"<id>","painelNumero":3}'
```

Cada geração faz backup da anterior, então regerar não perde a versão boa.

## 7.1 Produzir vários episódios de uma vez

Um lote é diferente de um episódio, e as três coisas abaixo custaram meia produção em 10/08/2026,
quando 15 peças foram geradas na mesma sessão:

- **Erro que não PARA a fila vira cobertura parcial que se declara completa.** O servidor recusa
  com HTTP 429 acima de `MAX_GERACOES_PARALELAS` (4), e a recusa volta em milissegundos. Um laço
  que trata a resposta como "painel feito" pula metade dos painéis, termina com código 0 e parece
  sucesso. Sempre trate o 429 esperando e repetindo, nunca seguindo em frente.
- **Um lote grande enche o disco.** Cada painel são ~3 MB de PNG mais o backup da versão anterior
  que o servidor faz antes de sobrescrever. Quarenta painéis mais as montagens passam de um giga
  fácil. Cheque o espaço ANTES de cada geração e pare cedo: com o disco cheio o ffmpeg da montagem
  falha com ENOSPC e o episódio fica sem slide, também sem erro na fila.
- **Reinicie o studio depois de mexer no servidor.** Ele não recarrega sozinho (`server/`), então
  uma melhoria no prompt só vale para o que for gerado depois do restart.

Ordene a fila pelo que TRAVA: primeiro os episódios sem ficha nova, depois as fichas em lote, e só
então os episódios que dependem delas. Ficha exige aprovação humana e é o gargalo, não a geração.

## 8. Revisar olhando, e só então publicar

O catálogo de defeitos que já custaram regeração está na §8 do doc da série (contaminação de
ficha, versão menino herdando traje do adulto, negativa em caixa alta virando estampa na roupa,
"faceless extras" saindo com a cabeça em branco, escudo real aparecendo). Confira painel a painel
contra ele antes de dar por pronto.

Revise com os painéis **montados** (`POST /api/montar-imagem` com `mosaico` e `carrossel`), nunca
com os PNGs crus: moldura, legenda e carimbo mudam o julgamento, e defeito de traço só aparece com
os painéis lado a lado.

**Se a bola aparecer desenhada, confira a SILHUETA.** O modelo desenha bola de futebol americano
quando a bola é o sujeito do painel, e foi assim que seis peças entraram no acervo, cinco delas na
capa. O prompt já sai daqui com a âncora (o compositor troca a palavra sozinho), então isto é só
olhar: bola redonda como uma laranja, sem pontas, sem cadarço numa ponta só. Vale para o TROFÉU
também, que já voltou em formato de NFL sem a palavra "bola" aparecer no prompt.

**Defeito que o Raphael decidir NÃO consertar vai escrito no `contexto`**, com a data e o motivo.
Sem isso, a próxima pessoa que olhar o episódio acha o mesmo defeito, regera, e paga de novo por
uma decisão que já tinha sido tomada.

Se um defeito NOVO aparecer, ele volta pra §8 do doc da série junto com a cura. É assim que a
lista cresce, e é por isso que ela existe.
