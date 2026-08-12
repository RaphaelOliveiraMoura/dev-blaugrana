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

## 0. Escolha a história

Banco de próximos episódios: §10 do `SERIE-O-DIA-EM-QUE.md`, agrupado pelo que cada um custa de
ficha nova. Antes de começar, confira o que já existe (`ls saga-fut/data/quadrinhos/o-dia-*.json`)
pra não repetir um ângulo já publicado.

Uma história serve se cumpre as quatro exigências: **real, evergreen, culé, desenhável**.

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
- **Rotacione a fórmula da capa.** Confira no `contexto` dos episódios anteriores qual já foi
  usada; a lista está na §3 do doc da série.

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

**Defeito que o Raphael decidir NÃO consertar vai escrito no `contexto`**, com a data e o motivo.
Sem isso, a próxima pessoa que olhar o episódio acha o mesmo defeito, regera, e paga de novo por
uma decisão que já tinha sido tomada.

Se um defeito NOVO aparecer, ele volta pra §8 do doc da série junto com a cura. É assim que a
lista cresce, e é por isso que ela existe.
