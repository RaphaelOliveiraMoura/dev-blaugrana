# Série "O Dia Em Que..." — histórias reais do futebol, desenhadas

> Como fazer um episódio. O que é regra, o que é gosto, e o que já custou geração pra
> descobrir. Complementa [QUADRINHOS.md](QUADRINHOS.md) (o schema e o motor) e a Parte 6 do
> [PESQUISA-VIRALIZACAO.md](PESQUISA-VIRALIZACAO.md) (os números de gancho e carrossel).
> Nasceu em 04/08/2026 e foi calibrada nos três primeiros episódios.

## 1. Por que a série existe (e por que não é ficção)

A decisão vem de uma exploração longa que reprovou quase tudo antes de achar isto. Foram
descartadas, nesta ordem: novela animada em sprites, saga ficcional serializada, universo
próprio com vilão recorrente, sitcom de vestiário. Todas morreram no mesmo teste: **o
Raphael, que é o público-alvo, não se interessou por nenhuma.**

O que sobrou foi olhar o que ele consome de verdade: notícia de futebol e vídeo curto. O
fio comum não é o formato, é o gatilho — **descobrir algo que não se sabia, em 30 segundos**.
Notícia entrega isso com o presente e cobra curadoria diária. Esta série entrega o mesmo com
o passado, que é infinito, não expira e pode ser produzido em lote.

Daí as quatro exigências que qualquer episódio precisa cumprir:

- **REAL.** Torcedor apaixonado não consome ficção de futebol. Ficção de futebol foi testada
  e reprovada pelo próprio público-alvo.
- **EVERGREEN.** Nada que dependa da rodada. O episódio pode ser escrito hoje e postado em
  março.
- **CULÉ.** O assunto é sempre Barça e o entorno dele. Humor genérico de futebol atrai o
  público errado, e o algoritmo entrega pra quem engaja com o parecido.
- **DESENHADO.** Quem conta essas histórias hoje faz vídeo de narração com corte de jogo,
  todos iguais. Ninguém DESENHA. A caricatura é o que torna reconhecível no primeiro frame.

## 2. O molde do episódio

**5 a 8 painéis**, decidido pela história, nunca por cota.

1. **Capa** com o gancho.
2. **Setup**: quem é, quando, o que estava em jogo.
3 a 5. **Os beats**, cada um mudando informação OU emoção.
6. **Ponte com o hoje**: o fato de hoje que dá sentido ao de ontem.

**Teste do corte, e é etapa, não intenção.** Antes de gerar, passe painel por painel:
"se eu tirar, a história perde informação ou emoção?" Se não perde, sai. No episódio 3 um
painel reprovou nesse teste (o menino batendo bola no muro: era atmosfera, não história), e
**painel fraco costuma ser sintoma de beat faltando** — ali faltava a volta por cima, e o
episódio pulava de "voltou pra casa" direto pra "hoje vale 1 bilhão".

**Painel mudo só quando o clímax da história É visual.** No episódio do guardanapo o mudo era
o próprio título (o guardanapo sendo assinado). No do Pedri virou enfeite e foi reprovado.
Mudo é consequência da história, nunca cota de formato.

**NUNCA "A SEGUIR: ..." no último painel.** Decisão do Raphael: ele não quer amarração entre
episódios. Cada um fecha em si; a série se sustenta pelo selo e pelo formato, não por gancho
de novela.

## 2.1 Os três ÂNGULOS (campo `angulo`)

O molde acima é o ângulo **fato**, e por 52 episódios ele foi o único. O problema disso não é o
selo, é que todo episódio fechava do mesmo jeito, e um feed inteiro com a mesma estrutura de
roteiro cansa mesmo quando cada história é boa.

A cura NÃO é selo novo. Foi tentada em 12/08/2026, com dois pilotos ganhando selo próprio
("Quase" e "O Outro Lado"), e reprovada pelo Raphael no mesmo dia com um argumento que fecha o
assunto: **a capa escrita pro piloto de "Quase" dizia literalmente "O DIA EM QUE UM TELEFONEMA
MUDOU DOIS CLUBES DE UMA VEZ".** Um selo novo cuja capa é a fórmula da série antiga não é série
nova, é episódio. E fragmentar selo custa o que já custou no acervo, onde "mercado" tem quatro
nomes diferentes e nenhum é reconhecido.

O que muda entre os ângulos é o **FECHO**, e é ele que produz o comportamento diferente:

| `angulo` | a história é | o último painel | exemplo |
|---|---|---|---|
| `fato` | a coisa aconteceu | ponte com o hoje | `o-dia-abidal` |
| `quase` | a coisa NÃO aconteceu | **pergunta sem resposta** | `quase-ronaldinho` |
| `outro-lado` | aconteceu, contado por quem perdeu ou por quem ninguém viu | a **inversão**, nunca consolo | `outro-lado-anfield` |

- **`fato` fecha o assunto; `quase` abre a caixa de comentário.** "E se o telefone não tivesse
  tocado?" é o oposto exato da ponte com o hoje, e é o único fecho da série que pede resposta.
  Contra-indicação: negociação que não aconteceu é o terreno mais lamacento do futebol, cheio de
  lenda repetida como fato. Sem três fontes firmes, o episódio se descarta, não se suaviza.
- **`outro-lado` aceita derrota nossa, e é a única parte da série que aceita.** O culé comenta
  muito mais a própria dor que a própria glória. Exige decidir o tom ANTES de escrever (luto ou
  deboche assumido, nunca choro), e essa é pergunta pro Raphael, na leva do §2 da skill.
- **Rotacione, como já se rotaciona a fórmula da capa (§3).** Não emende dois episódios do mesmo
  ângulo. Confira o campo `angulo` dos últimos antes de escolher.

Episódio sem `angulo` declarado é `fato`, que é o que os 52 anteriores são.

**O que NÃO virou ângulo, e por quê.** "Antes de Ser" (o jogador antes de ser o jogador, tipo o
`antes-puyol`) continua série própria: ela não é sobre um DIA, é sobre anos, e o teste da capa
mostra a diferença. "Antes de ser o capitão, ele era goleiro" não vira "o dia em que o Puyol era
goleiro", porque não foi um dia. Ângulo muda o fecho dentro do mesmo molde; ali o molde inteiro é
outro, e a promessa ao leitor também: um entrega um acontecimento, o outro uma trajetória.

## 3. A capa vale 80% do resultado

O slide 1 responde por quase todo o desempenho do carrossel, e o swipe do 1 pro 2 é o número
que diz se o gancho funcionou (60-75% é saudável). O esforço de ARTE pode ser igual entre os
painéis; o esforço de PENSAMENTO é 80% na capa.

**A capa nasce em 2 ou 3 opções e é escolhida OLHANDO.** Foi assim que a do episódio 3 foi
resolvida: três direções geradas, e venceu a única em que o gancho era elemento GRÁFICO
(um carimbo "NÃO TEM NÍVEL" ocupando o terço superior) em vez de legenda no rodapé.

**Como gerar as opções sem sujar o episódio:** crie painéis temporários numerados a partir de 90,
com a `imagem` apontando pra `quadrinhos/<id>/capas/a.png`, `b.png`, `c.png`. Depois da escolha,
copie a vencedora pra `paineis/1.png`, mova o `promptImagem` dela pro painel 1 e apague os
temporários. As perdedoras ficam em `capas/` como registro do que foi descartado e por quê.

**O critério que decide é a MINIATURA, não a arte.** No episódio do Sunyol a opção mais bonita
(vista aérea da serra, o carro minúsculo lá embaixo) perdeu porque em tamanho de feed não se via
nem o carro nem a ameaça; venceu a que tinha UM objeto grande e legível (a bandeira no carro) e as
sombras dos fuzis avançando, que conta a história inteira sem desenhar violência nenhuma.

**O que reprovou:** rosto em close de um personagem que o público NÃO reconhece, paleta fria
e a frase-gancho pequena embaixo. Close de rosto só puxa quando o rosto significa algo.

**Rotacione a fórmula do gancho** — repetir a mesma estrutura ensina a audiência a pular:

| fórmula | exemplo |
|---|---|
| resultado impossível | "3 GOLS EM 7 MINUTOS" (ep. 1) |
| segredo / objeto | "O CONTRATO FOI ESCRITO NUM GUARDANAPO" (ep. 2) |
| citação / veredito | "«NÃO TEM NÍVEL»" (ep. 3) |
| in medias res | "3 A 1. TODO MUNDO INDO EMBORA." |
| contrarian | "O MAIOR JOGO DA HISTÓRIA DO BARÇA NÃO FOI UMA FINAL" |
| desafio | "APOSTO QUE VOCÊ NÃO LEMBRA QUEM FEZ O SEXTO" |
| callout | "SE VOCÊ É CULÉ, SABE ONDE ESTAVA NESSE DIA" |

## 4. A voz das legendas: notícia, não épico

Definida em 05/08/2026 depois de duas rodadas de texto reprovado. Três regras:

1. **NOMEIA.** "O Real Madrid", "o Las Palmas", "Valdebebas", "Tenerife", "Pedri". Nada de
   perífrase de suspense ("o clube mais rico do mundo", "um clube da ilha", "o menino, você
   conhece"). **Nome real é permitido e desejado na NARRAÇÃO**; a regra de não se chamarem
   pelo nome vale só para as FALAS dos personagens.
2. **Ordem direta.** "Em junho de 2018, o Las Palmas contratou ele", nunca "quatro meses
   depois, quem assinou com ele foi um clube da ilha".
3. **O fato de cara**, sem construir revelação, e nenhuma palavra a mais. Gíria de
   preenchimento reprova ("aí nevou" virou "nevou a semana inteira").

Nomear deixa o texto MAIS específico, não menos: Valdebebas e Juventud Laguna são o tipo de
detalhe que o torcedor raiz reconhece e comenta. **O efeito emocional sai do fato escolhido e
da imagem, nunca do jeito de narrar.**

**ONDE nomear, que é o que faltava aqui.** A regra existia desde 05/08/2026 e mesmo assim cinco
episódios a violaram, porque ela não dizia o lugar. Diz agora:

- **Nomeia no PAINEL 2, não na legenda do post.** O carrossel tem que se sustentar sozinho: no
  Instagram a legenda do post exige clicar "mais", e no TikTok ela é cortada. Nome que mora só
  ali não apresenta ninguém.
- **A capa pode guardar o nome** (é o gancho, §3), mas o painel 2 entrega. Do 2 em diante, "ELE"
  só depois de o nome já ter aparecido.
- **Nome sem contexto não apresenta.** "László Kubala" não diz nada a quem não o conhece: vai
  junto quem a pessoa É, e isso quase sempre já está no `contexto`, vindo da checagem. No
  episódio da tuberculose, "o maior ídolo do clube naquela década, que tinha fugido da Hungria a
  pé pela neve" estava escrito no post e faltava no painel.
- **Teste de um segundo:** troque cada `ELE` do miolo por `[NOME]`. Se a frase melhorar, era pra
  estar lá.

O caso mais caro foi o `o-dia-bernabeu`, que **nomeia Eto'o, Maradona e Messi e nunca o
Ronaldinho**, dono da história, chegando a escrever "MARADONA, EM 1983, E ELE".

Régua no `node scripts/asset.mjs doutor` (bloco CARROSSEL QUE NUNCA NOMEIA O PROTAGONISTA). Ela
AVISA, não barra, e a razão é medida: no dia em que nasceu achava 9 episódios e 4 eram falso
positivo (protagonista coletivo, menor de idade que a casa não nomeia por regra, legenda desenhada
na arte). 44% de falso positivo num gate que barra vira opt-out automático. O caso legítimo se
declara em `protagonistaSemNome` com o motivo escrito.

## 4.1 Fonte única: declare, e não preencha o buraco

Boa parte dos episódios curtos sai de UMA fonte só, em geral a lista oficial dos 125 anos do
clube. Fonte única não desqualifica a história, mas muda como o roteiro se comporta: escreva no
`contexto` que não foi possível cruzar, e **não acrescente nada que a fonte não traga**. Nada de
nome inventado para o funcionário anônimo, de diálogo atribuído a quem não falou, nem de
consequência que ninguém afirmou.

O anônimo, aliás, costuma ser a melhor parte: quem escondeu o arquivo do clube em 1925 não tem
nome em fonte nenhuma, e é justamente por isso que ele aparece sempre de costas e o episódio
fecha dizendo que ninguém nunca soube quem foi.

## 5. Checagem de fatos é obrigatória

O público é apaixonado; um número errado transforma o comentário em tribunal. Toda data,
placar, valor e nome vai checado, e as fontes ficam no campo `contexto` do quadrinho.

A checagem costuma MELHORAR o roteiro. No episódio 3 ela revelou que o teste do Pedri era pra
durar uma semana, mas nevou e sobraram três dias — detalhe que virou a melhor legenda do
episódio e a ironia central (uma ilha onde nunca neva contra uma semana inteira de neve).

## 6. Elenco: pessoa real exige ficha aprovada ANTES

Regra da casa, vale para a série inteira. Jogador, técnico ou dirigente real só entra num
painel se já existir personagem no acervo, e **cada ficha nova é aprovada pelo Raphael**,
com referências de foto buscadas na internet quando ajuda.

Reconhecimento é o produto: caricatura + número real é a identidade da casa, e um "camisa 20
qualquer" joga fora justamente o momento em que o torcedor reconhece o herói improvável (foi
o que aconteceu no episódio 1 antes da regra).

**A válvula pra não explodir o elenco:** figurante sem ficha aparece SEM ROSTO (de costas) ou
como figurante comum de rosto simples, e nunca como protagonista de beat.

**Quando a pessoa real não tem retrato, promova o OBJETO a protagonista.** História antiga
costuma não ter foto de ninguém (Gustavo Biosca em 1954, George Meyer em 1904), e ficha sem
referência sai um homem genérico qualquer, que é o pior dos dois mundos: custa geração e não
parece ninguém. A saída não é furar a regra da ficha, é trocar de protagonista, porque nesses
episódios a história é do objeto de qualquer jeito: o quadro tático coberto de setas, o olho de
vidro na grama. A pessoa aparece como figuração de época, sem close de rosto. Decidido em
10/08/2026, e vale também quando caricaturar a pessoa seria indelicado.

**A foto de referência é sempre um retrato FRONTAL** (regra do Raphael, 10/08/2026; o porquê está
na seção de referência de aparência do [QUADRINHOS.md](QUADRINHOS.md)). Personagem histórico
costuma não ter foto livre no Wikimedia: no `sunyol-riso` o retrato saiu de uma fundação
biográfica, e as três candidatas foram mostradas pro Raphael escolher olhando. Guarde a fonte no
campo `regras` da ficha.

**Versão MENINO de um personagem é ficha própria**, e o objeto-símbolo dele é conquistado: o
`messi-menino` não tem a coroa, o `pedri-menino` não tem os óculos nem a varinha. Quando as
duas idades aparecem no mesmo episódio, essa ausência é a narrativa.

## 7. Produção: o que é código e o que é IA

Episódio novo nasce com **acabamento por código** (ver a seção de
acabamento em [QUADRINHOS.md](QUADRINHOS.md)): a arte é gerada
SANGRADA, sem moldura, sem margem e sem selo, e o studio desenha a moldura, o selo, as caixas
de legenda e o carimbo de progresso no export.

Consequências práticas na hora de escrever:

- **Corrigir uma legenda não custa geração.** O texto vive no campo `legendas` do painel e é
  editável na aba Conteúdo. Isso muda o método: escreva o texto rápido, gere a arte, e refine
  o texto depois olhando a peça montada.
- **Área de segurança.** Como não há margem sobrando, o que ficar encostado na borda vai pra
  debaixo da moldura. O prompt já pede os 86% centrais para o que importa, mas ao descrever
  uma cena, coloque rosto, bola e qualquer letreiro longe das bordas.
- **A arte nasce numa razão própria** (1152x1585 no 3:4), que é a da área interna da moldura.
  Não é engano: é o que faz o enquadramento não cortar nada.

Card que não é quadrinho de história (escalação, gol, substituição, fim de jogo) declara
`moldura: 'nenhuma'` e não recebe nada disso.

## 8. Os defeitos que já custaram geração

Todos medidos gerando os três primeiros episódios no Grok. Aparecem sem erro nenhum, só no
olho:

- **Contaminação de ficha.** Com 3+ personagens, traços de um vazam pro outro (o torcedor
  saiu com a barba e as tatuagens do Neymar). Cura: bloco IDENTITY explícito dizendo o que o
  personagem NÃO tem. Tatuagem é o traço que mais vaza.
- **Versão menino herda o traje do adulto.** O Pedri de 15 anos saiu de óculos, varinha e
  camisa 8 num teste do Madrid. Cura: nomear o dono ("esses pertencem a um personagem
  DIFERENTE e MAIS VELHO que não está neste painel").
- **Negativa em CAIXA ALTA colada na roupa vira estampa.** "bibs with NO number, NO crest"
  saiu com a palavra **NO** impressa no peito de quatro figurantes. Cura: negativa em prosa
  minúscula ("plain blank bibs, free of any number, crest, letter or word").
- **O nome do personagem vira rótulo desenhado.** Já resolvido no motor (o nome perde o
  sufixo de estilo e vai com instrução de nunca ser desenhado), mas se reaparecer, é isso.
- **"Faceless extras" é lido ao pé da letra** e sai cabeça em branco. Peça "figurantes com
  rosto simples e normal, nunca em branco".
- **Personagem de seleção em episódio de clube** sai com a camisa errada e escudo real. O
  painel tem que declarar a camisa, senão a ficha manda.
- **O PAINEL contradizendo a FICHA, e o gerador obedecendo ao painel** (12/08/2026,
  `quase-ronaldinho` p5). O Ronaldinho saiu com um dente faltando. O modelo não inventou nada: o
  prompt daquele painel dizia "wide **gap-toothed** smile", e gap-toothed é literalmente falha
  entre os dentes. A ficha manda o oposto ("a big row of LARGE WHITE UPPER FRONT TEETH... this
  toothy grin is his TRADEMARK"), e entre os dois textos vence o mais específico, que é o do
  painel. É a mesma família do modo de falhar campeão da casa (a ficha descrevendo outra pessoa),
  uma camada abaixo. **Cura em duas pontas:** reescrever o painel no vocabulário da ficha, e
  **blindar a ficha com a negativa** ("NOT gap-toothed, NOT missing a tooth"), que é o que
  protege TODA geração futura do personagem e não só aquele painel. 83 das 102 fichas do acervo
  já têm negativa, num total de 299: é assim que a casa fecha essa classe, uma de cada vez.

**Um gate automático pra isso foi medido e REJEITADO** (12/08/2026), e fica registrado pra
ninguém pagar de novo pela mesma ideia. A proposta era comparar o `promptImagem` do painel com as
negativas "NOT x" das fichas do elenco e reprovar a contradição. Medido no acervo: com extração
solta, **31,3% dos painéis reprovavam** (166 medidos), quase tudo falso positivo, porque negativas
curtas viram fragmentos genéricos ("dark", "white", "curly") que casam com "dark room" e "white
shirt". Restringindo a negativas de 2+ palavras, caiu pra **1,4% (2 casos)**, e **os dois eram
falso positivo**: em `o-dia-guardanapo` p3 o "dark hair" negado pela ficha do Rexach descrevia
FIGURANTES de fundo, e em `o-dia-remontada` p2 o "clean-shaven" negado pela ficha do Sergi Roberto
descrevia o TORCEDOR. O gate erra porque não sabe **a quem** cada adjetivo do painel se refere, e
painel tem vários personagens: resolver isso é interpretar linguagem natural, não casar regex. E
ainda que funcionasse, ele só pegaria o defeito DEPOIS da ficha ter sido blindada, que é
exatamente quando a blindagem já resolveu sozinha.
- **Escudo real** aparece em placar e peito mesmo sendo proibido nas regras globais. Peça
  placar "in plain text" e camisa com "only a plain golden star".
- **Painel SEM personagem sai fora do traço da casa.** Medido em 10/08/2026 nas três capas do
  episódio do Sunyol (carro numa estrada, paisagem aérea): saíram ilustração detalhada, com
  textura e sombreado, em vez do rabisco chapado, mesmo com "flat washed risograph cartoon style
  matching the style reference" no prompt. O motivo é estrutural: **quem carrega o traço no painel
  é a ficha do personagem**, e num painel só de cenário não há ficha nenhuma puxando (o servidor
  anexa as fichas do elenco, mas o modelo desenha só quem o texto descreve). Isso importa porque
  episódio histórico é cheio de painel sem gente: no do Sunyol são 5 de 8. Cura, quando o carrossel
  precisar ficar homogêneo: cláusula dura de traço no prompt do painel de cenário (contorno preto
  grosso, cor chapada, sem textura nem sombreado de ilustração), e comparar os painéis LADO A LADO
  antes de aprovar, porque isolado cada um parece bom.

## 9. Publicação

- **Carrossel** de 5 a 8 slides, no formato do próprio painel (3:4). Cada painel é um slide,
  e o número "3/6" entra por código.
- **Descrição do post com nome real** do jogador, e um CTA de salvar.
- **Agende no aniversário do fato** quando existir: remontada em 8 de março, guardanapo em 14
  de dezembro, teste do Pedri em fevereiro. "On this day" dá alcance de graça.
- Save é o sinal nº 1 do Instagram em 2026, acima de like e comentário: o último painel pede
  UMA ação só.

## 10. O banco de episódios

Prontos: remontada (6x1), guardanapo do Messi, o dia em que o Madrid dispensou o Pedri, a
braçadeira do Abidal em Wembley, a camisa do Dani Jarque, e o presidente Sunyol fuzilado em 1936.

**Fato pesado tem regra própria**, aprendida no Sunyol (10/08/2026), o primeiro episódio da série
sem piada nenhuma: o ato violento NUNCA é desenhado (no clímax só os fuzis em silhueta e o carro
parado, e o corte acontece na legenda), o episódio pode fechar sem personagem nenhum, e um OBJETO
atravessa os painéis no lugar do rosto (ali, a senyera: na capa, no carro e dobrada num assento
vazio no último painel). Objeto funciona melhor que rosto quando o protagonista é alguém que o
público não reconhece.

Na fila, agrupados pelo que custam de ficha nova:

**Sem ficha nova:** a estreia do Lamine aos 15.

### Pesquisado em 11/08/2026 e ainda não roteirizado

Material já checado, com a fonte na mão, esperando decisão:

- **Roma 3 a 0 em 2018**, a eliminação depois do 4 a 1 no jogo de ida. Mesmo formato do Anfield, e
  por isso talvez não valha os dois.
- **Ronaldo Fenômeno**, temporada 1996-97: 47 gols em 49 jogos, o gol do Compostela em 12/10/1996
  saindo do próprio campo, e a saída para a Inter no fim do ano. **Precisa de ficha.**
- **A Espanha de 2010** com sete convocados do Barcelona e o gol do Iniesta na final. Cuidado: o
  gesto da camisa do Dani Jarque já é o `o-dia-dani`, e os dois se sobrepõem.
- **A reforma do Camp Nou e o exílio em Montjuïc** (2023 em diante). Ainda em curso, então não é
  evergreen até o clube voltar em definitivo.
- **O caso Rubiales e Jenni Hermoso** depois da final de 2023. É assédio, matéria grave, e não
  entra como beat de carrossel: se um dia virar episódio, é episódio inteiro e com tratamento
  próprio, jamais um painel dentro da história do título.

**Três roteiros já cadastrados estão BLOQUEADOS por falta de ficha**, e o motivo está escrito no
`contexto` de cada um: `o-dia-manita-1994` (Romário), `o-dia-sexteto` (Guardiola) e
`o-dia-maradona-briga` (Maradona). Aprovar essas três fichas de uma vez destrava os três.

**Uma ficha nova:** Ronaldinho aplaudido no Bernabéu · a bicicleta do Rivaldo · a cabeça de
porco no Figo · Abidal capitão em Wembley.

**Um lote de fichas destrava vários:** Iniesta, Xavi, Puyol e Guardiola abrem o Iniestazo, a
manita, Wembley 2011 e o sexteto. Cruyff e Koeman abrem Wembley 92 e o Dream Team.

Aprovar um lote de fichas de uma vez rende mais que aprovar uma por episódio: os mesmos
rostos reaparecem pra sempre.
