# futgibi — identidade do perfil

> **A FONTE ÚNICA DA MARCA É `marca/tokens.json`, e o manual navegável é `site/marca/`.**
> Este arquivo continua sendo o **porquê** de cada decisão (é o que nenhum JSON guarda). O que é
> valor (cor, tipo, espessura, formato) mora lá e é lido por todo mundo. Ver §10.

Canal de quadrinhos de futebol **em geral**, irmão do `@devblaugrana`. Mesmo traço (estilo
`rabisco-riso`), mesmo pipeline, e uma diferença que decide tudo o resto: **aqui não existe clube**.

## 1. A regra que gera as outras

O devblaugrana é grená e azul porque é canal de um time. Este não é de time nenhum, então **nenhum
elemento da marca pode pertencer a um clube ou a uma seleção**: nem cor, nem listra, nem escudo, nem
estrela. Isso vale para a MARCA e para a ARTE; **no texto publicado, nomear times e pessoas é
obrigatório** (ver `EDITORIAL.md` §2), e confundir as duas coisas já custou um lote inteiro de
legendas sem nome. O que sobra de futebol universal é a grama, a linha branca do campo, a bola e a
arquibancada, e é daí que a identidade toda sai.

Verde e amarelo juntos ficaram de fora de propósito: viram seleção brasileira e brigam com o
conteúdo no dia em que o quadrinho for sobre Champions.

## 2. Paleta

**Os valores moram no `marca/tokens.json` e a lista completa está no manual** (`site/marca/`, §3).
Aqui fica só o que o JSON não guarda, que é o porquê. Os quatro que geram todos os outros:

| papel | token | onde |
|---|---|---|
| verde-grama | `verde-campo` | fundo do avatar, moldura das capas, a cor da marca |
| creme de papel | `creme-papel` | fundo dos quadros, camisa do mascote, texto sobre o verde |
| laranja | `laranja-selo` | **bloco**, nunca texto: selo, número, a palavra que a capa destaca |
| preto de contorno | `preto-traco` | traço (já vem do estilo) |

As cores vivem **em código**, nunca no prompt. Cor pedida por texto o modelo acerta por aproximação
e o perfil fica com quatro verdes diferentes; cor por código é sempre o mesmo valor.

**A auditoria de contraste partiu a paleta em duas metades, e é a distinção que mais pega:** o
laranja da marca **reprova como texto em todo fundo dela** (2,25 sobre creme, 2,44 sobre verde). Ele
é cor de BLOCO. Quem escreve é o `laranja-tinta`, e **só sobre fundo claro**.

**Sobre o verde não existe destaque de texto, em nenhum tom**, e isso não é limitação a contornar: o
único âmbar claro o bastante pra passar 4,5 sobre o verde já é AMARELO, e verde com amarelo é a
primeira proibição da marca. A régua de contraste e a regra de cor apontam pro mesmo lugar, então
sobre verde o destaque é o SELO (bloco laranja com preto em cima), não a cor da letra.

Isso não se decora: **a peça PERGUNTA**. `tintaSobre(fundo, { destaque: true })` devolve a cor certa,
e a tabela medida vive em `cor.texto-permitido`. Escolher cor de texto na mão foi o que pôs o
subtítulo em laranja sobre verde nas duas peças de exemplo do próprio manual.

## 3. Perfil

**Handle:** `@futgibi` **nas quatro redes** (Instagram, TikTok, YouTube e X), registrado em
15/08/2026. Handle igual em tudo é o que deixa a marca ser citada de um jeito só, em print, em
comentário e na boca de quem indica; um `@futgibi_oficial` numa rede só quebra isso pra sempre,
porque handle não se troca sem perder o histórico.

**Nome de exibição:** `FutGibi · futebol em quadrinhos`

**Como o nome se escreve:** `FutGibi` em texto corrido, `FUTGIBI` onde a peça inteira é caixa alta
(logo, manchete, selo), `@futgibi` no handle. Uma palavra só, sempre.

Isso virou regra em 15/08/2026 porque **a marca tinha três grafias vivas ao mesmo tempo**, e cada
uma estava certa no seu canto: o token mandava escrever "Fut Gibi" com espaço, os quatro logos <!-- vigia:contraexemplo -->
desenhavam FUTGIBI e o site escrevia FutGibi. Nenhuma peça obedecia ao token. Venceu a que já estava
aprovada olhando, em desenho e em tela. Nome de marca é a única coisa que o leitor decora e nada
nele dá erro, então quem confere é o vigia (§10).

O `@` não entra na busca do Instagram, o nome de exibição entra. Por isso ele carrega "futebol" e
"quadrinhos" por extenso, que é o que a pessoa digita.

**Bio:**

```
Toda história do futebol vira tirinha ⚽
Fatos reais, resenha e memória, desenhados
Do jogo de ontem ao que ninguém lembra
```

**Nada de cadência declarada em lugar nenhum** (nem bio, nem banner, nem capa): "quadrinho novo
terça e sexta" é promessa que o perfil passa a dever, e a primeira semana sem post transforma a
própria bio em prova de que o canal parou. A terceira linha faz o mesmo trabalho de dar motivo pra
seguir, mas pelo RECORTE (o que você vai encontrar aqui) em vez do calendário.

**Foto de perfil:** `marca/perfil.png`, o busto do mascote sobre o verde chapado.

### 3.1 Domínio: `futgibi.com` e `futgibi.com.br`

Comprados em 15/08/2026. **Nada aponta pra lugar nenhum ainda**, e isso está aqui pra que a próxima
sessão não presuma que existe site.

O destino declarado pelo Raphael é um **portal**, não um cartão de visita: o acervo público dos
quadrinhos navegável, as fichas dos personagens já criados, e um canal de sugestão da comunidade.
A ambição que orienta o tamanho disso é ser **a maior referência de quadrinhos de futebol do
Brasil**, e referência se prova com acervo consultável, que é exatamente o que o feed não é (feed
some, acervo acumula e é achável no Google).

Duas coisas que não dependem do portal ficar pronto e valem mais cedo:

- **e-mail no próprio domínio** como contato e recuperação das quatro contas. Enquanto o único
  endereço nas quatro redes for um gmail pessoal, a marca inteira depende de uma conta que não leva
  o nome dela;
- **o `.com.br` redirecionando pro `.com`**, pra existir um endereço só a ser divulgado.

O portal em si ainda não tem escopo escrito, e a rodada de ideias está em `PORTAL.md` (nada lá está
decidido). Acervo público muda o que é publicável: direito de imagem, crédito de trilha e fonte de
cada fato passam a ficar expostos fora do carrossel, onde o post não expira.

## 4. O mascote (`torcedor-12`)

Torcedor genérico **sem clube**, cadastrado no acervo do studio com a regra escrita na ficha:
camisa lisa, sem escudo, sem listra, sem estrela, e o número **12** no peito, porque o 12º jogador
é a torcida.

O número não é enfeite: é o que dá reconhecimento sem citar time, do mesmo jeito que os
personagens do devblaugrana levam o número real do jogador. E é o que deixa ele aparecer numa cena
do Real, do Flamengo ou da Argentina sem contradizer o canal.

**A ficha dele no acervo já o declara "mascote e narrador do canal futgibi", e a voz desse narrador
ainda não foi escolhida** (ver `EDITORIAL.md` §4). Enquanto não for, a ficha é quem manda, porque é
ela que o gerador lê. Se a decisão for que ele não fala, o conserto é na ficha primeiro: doc e
acervo discordando é como o personagem volta calado ou falante sem ninguém ter decidido.

Escolhido em 14/08/2026 entre três candidatas (camisa creme, camisa verde, camisa com cachecol),
olhando a folha e a prévia em tamanho de feed. A camisa creme ganhou por contraste sobre o verde: a
verde exigia fundo creme e sumia aos 56px, e o cachecol cobria justamente o 12. **O cachecol
continua existindo como acessório de cena**, só não entra no avatar.

## 5. Destaques

Quatro, um por série, gerados por `marca/gerar-destaques.mjs`. **Cada capa usa a COR DA SUA SÉRIE**
(tinta laranja, sépia, azul de esferográfica, grafite) e o pictograma vem do set próprio de ícones:

| destaque | o que vai lá |
|---|---|
| **O Dia Em Que** | histórias reais, o formato de carrossel que o pipeline já produz |
| **Resenha** | reação, meme, o quadrinho do jogo de ontem |
| **Memória** | futebol antigo, o que ninguém lembra |
| **Bastidor** | como o quadrinho é feito |

Eles saem em 1080x1920 e não em quadrado porque a capa de destaque é recortada do **centro de um
story**: tudo que importa mora dentro do círculo central, e capa quadrada tem o pictograma cortado
fora pelo recorte do Instagram.

**As quatro eram verdes e idênticas até 15/08/2026**, o que anulava a razão de as cores de série
existirem: elas nasceram porque "no feed o leitor não distinguia formato de relance", e a prateleira
era o único lugar onde essa diferença precisa aparecer. O modo com a cor no fundo foi escolhido
olhando, contra um modo com aro colorido sobre verde que quase não separava e ainda cortava o rótulo.

**Os pictogramas saíram do set próprio junto**, e dois nasceram pra isso (`icone-album` e
`icone-lapis`). Antes cada capa desenhava o seu inline, num traço arredondado que não é o da casa, e
o de Memória era uma bola de gomos que na tela lia como GLOBO. O álbum de figurinhas que entrou no
lugar conversa com o símbolo da marca, que é uma figurinha.

## 6. Banner

**O Instagram não tem banner**: o perfil de lá é só foto, nome e bio. Os dois que existem aqui são
pro X e pro YouTube, onde o mesmo handle vai ser registrado.

O que decide o layout é a **área segura**, e ela é diferente em cada um:

| plataforma | arquivo | o que a plataforma esconde |
|---|---|---|
| X | `banner-x.png` (1500x500) | corta as laterais em tela estreita e cobre o canto inferior esquerdo com a foto de perfil |
| YouTube | `banner-youtube.png` (2560x1440) | mostra só 1546x423 do centro na TV e no celular; o resto é sangria de desktop |

O desenho é **o nome dentro do gol**: a trave em creme, a rede em losango e a placa com o nome no
meio. Escolhido em 14/08/2026 entre cinco candidatas (explosão, rede de gol, cachecol, prancheta
tática e capa de gibi), na folha do `variacoes-banner.mjs`.

**A placa é a ASSINATURA, e até 15/08/2026 era um texto em Chalkboard SE.** Os dois banners nasceram
antes de existir logotipo e continuaram na letra antiga depois que ele chegou: as duas peças mais
públicas do canal escreviam o nome numa fonte que não pertence à marca. Hoje o centro do gol recebe
o arquivo do logo, que é o uso pra que a assinatura foi desenhada e que traz a Oswald embutida, então
o banner não depende mais do que está instalado na máquina de quem gera.

**O gol é desenhado dentro da área segura, não do quadro.** Gol proporcional ao arquivo ficaria com
as traves cortadas fora no YouTube, justamente onde quase todo mundo vê.

Três coisas ficaram de fora **por decisão**, e cada uma delas é um erro já cometido:

- **sem mascote**, porque a foto de perfil é o mesmo boneco a poucos pixels dali, e os dois juntos
  ficam repetidos (foi a primeira versão, reprovada);
- **sem bola**, porque é o símbolo óbvio de futebol e óbvio não chama atenção. A malha da rede diz
  "gol" sem precisar dela;
- **sem cadência**, pela mesma razão da bio.

Duas coisas que só apareceram porque a prova foi olhada, e que valem pra qualquer arte futura:

- **A foto de perfil tem fundo verde e o banner também**, então o avatar se dissolve no banner. Quem
  separa os dois é o anel que o X desenha na cor de fundo da página. Se algum dia o banner mudar de
  fundo, confira isso de novo.
- **O sharp aplica `resize` antes de `composite`**, mesmo quando o composite é chamado primeiro.
  Colar uma peça e só depois pedir resize põe a peça em coordenadas da imagem grande dentro da
  imagem pequena, e ela sai quase toda fora do quadro, sem erro nenhum.

## 7. Assinatura na arte

**Todo carrossel leva `@futgibi` carimbado dentro da imagem**, no rodapé, alinhado à direita.

```bash
node marca/assinar.mjs <arquivo.png> [...] [--posicao=esquerda]
```

Existe porque quadrinho é o formato mais roubado que há: um carrossel bom viaja em print, e o print
não leva a legenda junto. Sem assinatura dentro da arte, cada viral seu constrói a autoridade de
quem repostou.

O corpo sai da **largura** da imagem (2,4%), pra que o carimbo tenha o mesmo peso visual num
quadrinho 3:4 e num story, e ele vai sobre uma pílula creme com contorno preto: sem a pílula ele
some no fundo claro e briga com o desenho no fundo escuro.

**Decidido em 14/08/2026 que a assinatura entra e a numeração de edição e o selo de série NÃO.**
Os dois foram propostos como marcas de acervo (o que faz um perfil ser lido como referência em vez
de feed) e ficaram pra depois, de propósito: são decisões sobre o template do carrossel, que ainda
não existe. Quando existir, valem a conversa de novo.

## 7.1 A arte de convite e a landing (15/08/2026)

A peça que fica **fixada no topo dos quatro perfis** e a página de `futgibi.com`. As duas dizem a
mesma frase, escolhida pelo Raphael entre três leques:

> **Pra vestir a 12, basta gostar de futebol.**

**O que fez as descartadas caírem vale mais que a escolhida.** A primeira rodada girava toda em
torno de "o time tem onze, a doze é sua", e o Raphael matou com a razão certa: *parece que a pessoa
não faz parte do time*. Toda metáfora de escalação separa quem joga de quem lê ANTES de convidar, e
convite que começa excluindo não convida. A família que sobreviveu é a que **remove uma barreira**
("não precisa jogar bola", "basta gostar") em vez de descrever um lugar.

Corolário pra qualquer texto futuro da marca: **num canal cuja tese é caber todo mundo, chamada que
divide gente é erro de conteúdo, não de estilo.**

### Como a arte é feita: ilustração do modelo + texto por código

É o mesmo arranjo do acabamento dos quadrinhos, e aqui ele tem três motivos somados:

- **o mascote vem ilustrado** (`asset pose torcedor-12 chamar`), porque desenho geométrico não gera
  empatia e a peça inteira existe pra isso;
- **texto e cor entram por código**, porque texto pedido por prompt sai torto e cor pedida por
  prompt vira quatro verdes diferentes no perfil (§2);
- **a multidão da arquibancada também é por código**, e isso é decisão e não preguiça: multidão
  gerada por modelo é exatamente onde ele deforma rosto, a mesma lição que reprovou a primeira
  versão do fundo animado. Silhueta abstrata atrás, personagem ilustrado na frente.

```bash
node futgibi/marca/variacoes-convite.mjs     # as candidatas + _folha.png pra escolher olhando
```

### Ilustração de marca: `gerar-ilustracao.mjs`

Quando a peça precisa de uma CENA (multidão, lugar, gente junta) e não de um personagem recortado, a
arte é gerada inteira pelo modelo e o texto entra por cima. As três razões de ela não passar pelo
`asset.mjs`:

- **aquilo é a porta dos ASSETS**, e o que justifica a porta única são os gates de sprite (ciclo,
  escala, orientação, recorte no pé). Arte de marca não é fatiada, não anima e não entra em cena;
- os banners e as capas de destaque **já nascem fora do asset** pelo mesmo motivo;
- o que ela precisa herdar, ela herda: o `stylePrefix` do `rabisco-riso` é **lido do
  `project.json`**, então marca e acervo são desenhados pela mesma regra e não divergem com o tempo.

**A referência é o mascote, e isso vale a linha.** A ficha do estilo registra três rodadas de
adjetivo que não seguraram e uma referência que segurou: o estilo da casa ensina por IMAGEM. Mandar
`torcedor-12/base.png` junto é o que faz uma arquibancada inteira de figurantes sair no mesmo traço.

```bash
node futgibi/marca/gerar-ilustracao.mjs [--so=arquibancada] [--modelo=grok]
node futgibi/marca/montar-lancamento.mjs --arte=arquibancada    # o texto por cima
```

O prompt **proíbe lettering** de propósito: o texto vem por código, e pedir texto ao modelo além de
sair torto sujaria a área onde a tarja vai entrar.

**A ARTE NÃO PODE GANHAR DO CONVITE, e essa foi a reprovação que corrigiu a peça.** A primeira
montagem punha a ilustração inteira e uma tarja de texto embaixo. Uma multidão de trinta rostos
desenhados ganha de qualquer frase que divida espaço com ela, e post de inauguração não existe pra
ser bonito, existe pra convidar. As quatro composições de hoje são quatro jeitos de fazer a arte
recuar: **velado** (véu da cor da marca por cima, a multidão vira textura), **faixa** (a arte encolhe
pra um rodapé), **balão** (um balão cobre o miolo) e **respiro** (o texto ocupa o espaço vazio que a
própria ilustração deixou).

**Respiro é a melhor quando a arte tem espaço negativo**, porque é a única que não esconde nada, e é
por isso que vale pedir esse vazio já no prompt da cena. Ela não serve com arte cheia até a borda:
na arquibancada a faixa cai em cima de rosto.

**As redes entram como ÍCONE, nunca como frase.** "@futgibi nas quatro redes" é um texto que o
leitor tem que ler e traduzir; quatro ícones ele reconhece antes de ler, e dizem mais ocupando
menos. O handle continua escrito, pequeno, porque sem ele ninguém sabe o que procurar. Os cartões
de ícone usam o mesmo creme com contorno e sombra dura dos botões da landing, então post e site
combinam.

**A fonte encolhe em vez de estourar** (`caber()`), que é a mesma regra dos cards de jogo da casa.
Sem ela a linha mais longa sai CORTADA nas laterais sem erro nenhum: o PNG é gerado, o script diz
OK, e só o olho pega. Aconteceu na primeira rodada desta peça.

### O modelo INVENTA escudo, e não há gate que pegue

A primeira geração da pose `chamar` saiu com uma **estrela dourada no peito**, acima do 12. A base
do personagem está limpa e o `promptFicha` já proíbe crest, logo e sponsor: a estrela foi inventada
na hora de gerar a pose, e passou por tudo, porque **não existe validador de escudo neste projeto**
(a conferência é na mão, como o `CLAUDE.md` avisa).

Isso é a violação da regra que gera todas as outras do canal, e vai acontecer de novo: estrela em
camisa lê como título de clube. O conserto foi regerar com a proibição explícita e exaustiva no
`--desc` (`NO star, NO crest, NO badge, NO logo, NO emblem`), porque "sem logo" não cobre estrela
na cabeça do modelo.

**Confira toda arte nova do futgibi olhando o peito do personagem antes de publicar.** É camada 4
(só humano) num projeto que prefere camada 1, e é candidata óbvia a virar gate.

## 7.2 A landing é uma PÁGINA DE GIBI (pesquisa de 15/08/2026)

A primeira versão era uma landing correta com enfeite de quadrinho por cima. A segunda usa a
**gramática** do formato, e a diferença veio de pesquisa sobre paginação de HQ:

- **quem controla o ritmo é a CALHA**, o vão entre painéis. Calha estreita lê como salto curto de
  tempo, calha larga como salto longo. Por isso as calhas da página **não são todas iguais**: a
  maior separa a apresentação do argumento, e a menor cola o grito no painel anterior, porque ele
  acontece no mesmo instante;
- **uma página tem de 4 a 6 painéis**, e a **splash** (painel único ocupando a página) é reservada
  ao beat emocional. Aqui ela é a abertura;
- **o cartucho** (a caixinha do narrador no alto do painel) é o detalhe que só quem conhece
  quadrinho põe, e sai de graça em CSS.

O acabamento é **neobrutalista** porque é a mesma família visual: traço grosso, sombra DURA sem
desfoque, geometria seca, imperfeição proposital (os painéis são levemente tortos de propósito). Ele
carrega de brinde uma defesa que interessa a este projeto: em 2026 estilo expressivo lê como
**humano**, e o risco declarado de um canal produzido com IA é justamente parecer template.

Nada disso usa arquivo externo. Halftone é `radial-gradient` repetido em duas escalas (a fina no
papel da calha, a grossa dentro do painel), as linhas de foco são `repeating-conic-gradient` com
máscara, o balão tem rabicho de borda e a explosão é `clip-path` de 14 pontas. Fonte é a mesma
Helvetica da marca: o peso de lettering vem de sombra dura, não de fonte baixada.

### A landing (`site/index.html`)

Um arquivo só, sem dependência externa, mais o `mascote.png`. Três decisões que valem a leitura:

- **A segunda dobra é o manifesto, não a lista de redes**: "todo perfil de futebol no Brasil torce
  pra alguém, por isso nenhum deles cabe o Brasil inteiro". A regra sem clube nasceu como restrição
  de arte e é, na verdade, o maior argumento de comunidade que o canal tem.
- **O selo conta os dias de verdade** (dia N, depois "no ar há N dias", depois só o mês). Não há
  contador de seguidores nem número inventado: FOMO fabricado é o caminho fácil e destrói
  exatamente a confiança que a página pede, ainda mais num canal que quer publicar as suas fontes.
- **Nenhuma cadência declarada**, pelo mesmo motivo da bio (§3).

```bash
npx -y serve -l 4699 futgibi/site      # ou o preview "futgibi-site" do .claude/launch.json
```

## 8. Os arquivos e como refazer

```
futgibi/
  IDENTIDADE.md              a marca: paleta, perfil, mascote, banner, assinatura
  EDITORIAL.md               o conteúdo: recorte, formatos, o que o canal não faz, legenda
  LANCAMENTO.md              o que falta pra abrir, inclusive o que é fora do repo (contas, domínio)
  DISTRIBUICAO.md            como conta zerada consegue alcance nas quatro redes (pesquisa 15/08/2026)
  marca/
    perfil.png                 a foto de perfil, pronta pra subir
    banner-x.png               1500x500
    banner-youtube.png         2560x1440
    _prova-perfil.png          a foto no círculo, em 420 / 150 / 56 / 32px
    _prova-banner.png          os banners como cada plataforma mostra
    _variacoes-banner/         as cinco candidatas + _folha.png
    destaques/*.png            as quatro capas + _folha.png
    gerar-avatar-perfil.mjs    avatar do acervo -> foto de perfil (troca o magenta pelo verde)
    gerar-destaques.mjs        as capas, desenhadas por código
    gerar-banner.mjs           os dois banners
    variacoes-banner.mjs       as candidatas, pra escolher olhando
    variacoes-convite.mjs      as candidatas da arte FIXADA no topo dos perfis
    _variacoes-convite/        as candidatas + _folha.png
    variacoes-lancamento.mjs   as candidatas do POST DE INAUGURAÇÃO (peça de uma vez só)
    _variacoes-lancamento/     as candidatas + _folha.png
    compor-v2.mjs              os dois modos aprovados (respiro e faixa), que alimentam o manual
    assinar.mjs                carimba @futgibi na arte
    tokens.json / tokens.mjs   a FONTE e a ponte (§10). Gera o CSS e publica os ativos no site.
    vigia.mjs                  o gate da marca: hex à mão, grafia, contraste e estrela no peito
    gerar-svg.mjs              as peças (balão, tarja, moldura, carimbo) e os ícones, em SVG
    gerar-logo.mjs             as seis direções de logotipo, pra escolher olhando
  site/
    index.html                 a landing de futgibi.com, um arquivo só
    mascote.png                a pose "chamar" do torcedor-12, a mesma da arte fixada
    prova-perfil.mjs           folha de prova do círculo
    prova-banner.mjs           folha de prova das áreas seguras
```

```bash
cd futgibi && node marca/gerar-avatar-perfil.mjs && node marca/gerar-banner.mjs
node marca/prova-perfil.mjs && node marca/prova-banner.mjs
```

O mascote em si vive no acervo do studio, como qualquer outro personagem, e se refaz pelo caminho
normal da casa:

```bash
node scripts/asset.mjs variacao torcedor-12 --de=<candidatas.json>
node scripts/asset.mjs promover torcedor-12 <n>
node gerar-avatar.mjs torcedor-12
```

**Aprove sempre pela `_prova-perfil.png`, nunca pelo `perfil.png`.** O quadrado só existe no
arquivo: o Instagram mostra o avatar recortado em círculo e quase sempre pequeno. Foi por isso que
a camisa creme ganhou da verde, e é o teste que reprova qualquer versão futura em que o 12 deixe de
ser legível aos 32px.

## 10. O sistema: uma fonte, três consumidores (15/08/2026)

Nasceu de uma reprovação que era estrutural e não estética. Depois de três rodadas de arte sem
convergir, a causa apareceu na medição: **as cores da marca estavam escritas à mão em 9 arquivos,
27 vezes.** Cada peça nova recomeçava a decisão, então o resultado não podia convergir, por mais
que cada peça isolada fosse ajustada.

```
marca/tokens.json          ← a FONTE. Cor, tipo, traço, formato, mascote, voz.
   ├─ marca/tokens.mjs         → os scripts de arte importam (VERDE, CREME, caber…)
   ├─ site/marca/tokens.css    → gerado; o site e o manual leem as variáveis
   └─ site/marca/index.html    → o MANUAL, que lê os dois em tempo de renderização
```

```bash
node futgibi/marca/tokens.mjs        # regrava tokens.css e a cópia publicada do JSON
npx -y serve -l 4699 futgibi/site    # o manual em /marca/
```

Três decisões que valem a leitura:

- **O manual não declara uma cor sequer.** Se declarasse, viraria o décimo lugar onde a marca
  diverge, que é o problema que ele nasceu pra resolver. Os hex ao lado de cada amostra são
  **lidos do CSS computado**, então a página não tem como mentir sobre a própria marca.
- **O estilo de ilustração NÃO foi copiado pra cá.** O `rabisco-riso` continua sendo lido do
  `project.json` na hora de gerar. Copiar seria criar a segunda fonte e garantir que marca e
  acervo divergissem.
- **`caber()` mora no `tokens.mjs`**, não em cada script, porque o defeito que ela evita não dá
  erro: o PNG é gerado, o script diz OK, e a linha longa sai cortada nas laterais.

**A regra operacional é uma só: se você escrever um `#hex` dentro de uma peça, pare.** Ou o valor
pertence ao `tokens.json`, ou a peça está saindo da marca.

### O vigia: a marca deixou de ser camada 4

```bash
node futgibi/marca/vigia.mjs [arte-nova.png ...]
```

O projeto inteiro defende regra em quatro camadas e a marca estava 100% na última (só humano). São
quatro gates, e **cada um nasceu de um defeito real desta pasta**:

| gate | o que barra | o defeito que existiu |
|---|---|---|
| hex à mão | cor escrita fora do token | a landing linkava o `tokens.css` e redeclarava a paleta inteira dez linhas abaixo |
| grafia | as formas proibidas do nome | três grafias vivas ao mesmo tempo, uma delas dentro dos logos |
| contraste | a tabela mentindo, e o laranja escrevendo | as duas peças de exemplo do manual violavam a regra que ele chama de "a que mais pega" |
| peito do mascote | mancha de tinta saturada onde a camisa é lisa | o modelo inventou uma estrela dourada sozinho, com o prompt proibindo em caixa alta |

Três coisas nele valem a leitura, e as duas primeiras são as que fazem um gate durar:

- **Ele se alimenta do caso sabidamente ruim.** O gate do mascote FABRICA uma estrela dourada em
  memória e exige que o detector acuse. Sem isso, detector que parou de detectar imprime a mesma
  lista de OK de um acervo limpo, e as duas telas são idênticas. É a regra número um do vigia do
  motor, e a classe de defeito favorita da casa.
- **Ele reclama quando fica CEGO.** Varredura que não acha arquivo nenhum devolve "tudo ok", e foi
  assim que duas réguas deste projeto viraram no-op por mudança de pasta.
- **Exceção que continua sendo medida não é buraco.** O `theme-color` do HTML não aceita `var()`,
  então o hex ali é obrigatório; em vez de ignorar a linha, o gate CONFERE o valor contra o token.

O detector do peito é **rede, não prova**: ele mede a maior mancha compacta de tinta saturada na
faixa do peito, com a pele fora da conta, e tem 4x de margem entre a pior arte limpa e uma estrela
fabricada. Emblema laranja ele não pega (o matiz cai na faixa da pele, que precisa sair pra não
acusar rosto e braço em toda arte), e estrela abaixo de ~5% da largura passa. **Confira o peito
olhando, como sempre.**

### O logo (15/08/2026), e o teste que decidiu

Até esta data **não existia logotipo**: "FUTGIBI" era uma palavra digitada com espaçamento
aumentado, ou seja, trocar a palavra virava outra marca. Era a maior lacuna do sistema.

Escolhido entre seis direções (`gerar-logo.mjs`), e a decisão veio de um teste, não de gosto:

> **Só o símbolo sobreviveu a 32px.** As outras cinco direções dependiam de o leitor LER a palavra,
> e nesse tamanho ninguém lê nada. O que resiste à redução é um elemento DOMINANTE, e o 12 é ele.

São duas peças que dividem a mesma ideia, **a marca é um objeto impresso e numerado**, e se separam
por USO:

| peça | o que é | onde |
|---|---|---|
| **símbolo** | a figurinha de álbum com o 12 dentro | a marca principal |
| **símbolo nu** | sem o nome | avatar, favicon, carimbo |
| **assinatura** | a capa de gibi, com o nome na faixa e o Nº 1 | rodapé, banner, cabeçalho |
| **wordmark** | só a palavra | assinar arte, onde moldura vira ruído |

Três coisas que valem a leitura:

- **A fonte vai EMBUTIDA no SVG**, em base64. Sem isso o logo depende de a Oswald estar instalada na
  máquina de quem abre, e um logo que muda de forma conforme a máquina não é um logo.
- **O fundo do símbolo traz a mesma malha de rede do padrão gráfico.** Símbolo e sistema
  compartilhando um motivo é o que faz parecer sistema em vez de peças soltas.
- **Todo desenho novo passa por três testes**: uma cor só, invertido, e reduzido. Foi assim que se
  descobriu que as versões invertidas estavam desenhando creme sobre transparente e sumindo: o SVG
  não tinha fundo declarado, e o teste sem fundo é um teste que mente.

### O padrão gráfico e a iconografia

**Padrão:** a malha da rede de gol, em duas densidades. Escolhida porque é o único elemento de
futebol que não pertence a clube nenhum e que a marca já usava, mas só como desenho isolado no
banner.

**Ícones:** 12, no mesmo peso de traço das peças grandes, pra que ícone e balão pareçam da mesma
mão. O critério de entrada é a regra da marca: **só objeto que não pertence a clube nenhum**. Antes
deles os únicos ícones do sistema eram os das redes sociais, que são marcas de terceiros.

### A paleta, depois da auditoria de contraste

O laranja da marca **reprova em todo fundo dela**: 2,25 sobre creme, 2,44 sobre verde, 2,11 sobre
papel, contra o mínimo de 4,5. Ele estava sendo usado como cor de texto de destaque em toda parte.

- **`laranja-selo` é cor de BLOCO**, e só recebe preto em cima;
- **`laranja-tinta` (#A8450E) é a que escreve**, e passa (4,87 sobre creme);
- entrou o **`verde-meio`**, o degrau que faltava: a paleta saltava de creme claro pra verde escuro,
  e sem meio-tom toda hierarquia intermediária virava opacidade, que é remendo e não sistema;
- entraram **5 neutros quentes**, puxados pro papel, porque cinza puro ao lado de creme lê como
  sujeira.

**Cada série ganhou cor, e nenhuma delas é gosto:** vêm de um material do gibi. Tinta laranja (O Dia
Em Que), sépia de papel envelhecido (Memória), azul de esferográfica (Resenha), grafite (Bastidor).
As quatro passam contraste, então servem como texto e como bloco. Elas existem porque as quatro
prateleiras eram visualmente idênticas e, no feed, o leitor não distinguia formato de relance.

### O carimbo é o BURST, nunca a estrela

Decidido em 15/08/2026. O carimbo da marca é a **explosão de pontas irregulares** das capas antigas
("NOVO!", "GRÁTIS!"). A **estrela de cinco pontas está proibida** e a proibição mora no
`tokens.json`: em camisa e escudo ela lê como título de clube, e o modelo já inventou uma sozinho
no peito do mascote. As duas nunca podem se confundir.

### A tipografia: Oswald, direção condensada de cartaz

Escolhida pelo Raphael em 15/08/2026 na folha de prova (`provar-tipografia.mjs`, oito direções com
fonte de sistema como parente da webfont). **Servida do próprio domínio**, nunca de CDN: fonte de
terceiro é uma requisição a mais, um ponto de falha a mais e um visitante vazado a mais. A licença
é OFL, e o texto dela viaja junto em `site/marca/fontes/OFL-*.txt`, porque a OFL exige.

A alternativa da mesma direção (`Big Shoulders Display`, mais estreita e angular) está baixada ao
lado: trocar é mudar a ordem em `tipografia.familia.display` e rodar o gerador.

**Condensada serve pra manchete e número, nunca pra texto corrido**, onde ela cansa a vista. Por
isso o token de texto continua sendo a de leitura.

**Resolvido em 15/08/2026, e o conserto tem duas metades.** O sharp não lê `.woff2` nem `@font-face`
em base64: ele só enxerga o `.ttf` que o fontconfig indexa. Então a mesma Oswald é servida duas
vezes, como webfont pro site e como arquivo instalado pro gerador (`marca/fontes-ttf/Oswald.ttf` em
`~/Library/Fonts`). A segunda metade é o que impede a volta silenciosa: `conferirFonte()` MEDE a
largura da tinta com a Oswald e com a Helvetica antes de desenhar e aborta se derem igual, porque
fallback de fonte não dá erro nenhum, gera o PNG e só o olho pega.

**O `caber()` também era Helvetica sem ninguém ver.** Ele estimava a largura multiplicando a
contagem de caracteres por 0,62em, que é o passo da Helvetica; a Oswald mede 0,485em. O resultado
era a função encolhendo texto que cabia inteiro. Hoje ela **mede a linha** em vez de estimar, o que
tira o fator de fonte da conta pra sempre. Fator por caractere é sempre um chute sobre a fonte de
ontem.

### As peças desenhadas, e por que elas têm ÁREA ÚTIL medida

Balão, moldura e tarja não são CSS, e o motivo é impossível de escrever em folha de estilo:
**contorno de quadrinho é trêmulo**, e `border-radius` mais um triângulo sempre entrega que é CSS.

**Elas já foram PNG recortado de uma folha do modelo, e hoje são SVG desenhado** (`gerar-svg.mjs`).
A troca resolveu o "corte branco" que aparecia na moldura (o recorte levava resto de traço da peça
vizinha) e trouxe duas coisas que o PNG não dava: a peça herda a cor por `currentColor` e escala sem
borrar. O que segue valendo do tempo do recorte é a lição da área útil, abaixo.

Duas coisas que o recorte por grade errava, e as duas só apareceram olhando:

- **o corte encostava na peça vizinha** e levava um pedaço dela junto; apertar a folga cortava a
  peça boa ao meio. Hoje cada peça é achada por **componentes conectados**: mancha contínua de
  tinta é uma peça, esteja onde estiver na folha;
- **o texto boiava dentro do balão**, porque era centrado no ARQUIVO e não no MIOLO, e num balão
  com rabicho os dois centros não coincidem. Hoje o **maior retângulo inscrito no miolo** é medido
  e gravado em `pecas/pecas.json` em proporção. Quem usa a peça põe o texto nessa caixa, e o balão
  passa a vestir o texto.

Uma terceira, de bônus: **o fundo não se separa por limiar de brilho.** O modelo pinta o miolo do
balão quase tão claro quanto o papel, então qualquer limiar apaga os dois. A diferença não é de
cor, é de posição: fundo é o que encosta na borda. Daí a inundação a partir das quatro bordas.

### Assets e composição (§8 do manual)

Sobraram **dois modos aprovados**, e a poda é o conteúdo: **respiro** (a gente no alto, o texto ocupa
o chão vazio da cena) e **faixa** (a gente embaixo, o texto ocupa o céu). Caíram o **velado** e o
**balão**, que resolviam a leitura escondendo a arte, e o **recorte**, que sem chão fazia a figura
parecer adesivo. A regra que governa a seção: **numa peça que convida, a arte nunca ganha do texto**,
e a arte é gerada JÁ COM a composição em mente, senão o conserto vira sempre o mesmo remendo, que é
escurecer a ilustração até o texto ler.

**A EMENDA ERA O DEFEITO QUE SOBRAVA.** O respiro cortava a arte onde os personagens acabam e pintava
o resto do quadro de verde chapado: uma linha reta atravessando a peça, com papel de um lado e nada
do outro, embaixo de uma legenda que prometia "peça única". Hoje a arte cobre o quadro inteiro e o
VAZIO dela é TINGIDO na cor da marca, mantendo o grão do papel, com uma rampa na transição (tingir a
partir de uma linha seca só troca uma emenda por outra). A tinta só pode pegar o vazio: na primeira
tentativa ela pegou a imagem toda e lavou os personagens junto.

Vocabulário, porque os três termos são usados como sinônimos por aí e não são: **brand book** é o
porquê (mora nos `.md` daqui), **style guide** é o como (cor, tipo, layout), **design system** é a
camada em código que o resto importa. O `site/marca/` é os dois últimos juntos, que é o formato que
sobrou em 2026, e os `.md` seguem sendo o primeiro.

## 9. O que ainda não está decidido

Marca (aqui). O que é de conteúdo está em `EDITORIAL.md` §8, e tudo isso aparece priorizado, com o
que é fora do repo, em `LANCAMENTO.md`.

- **Fonte das capas de carrossel.** Hoje as capas do devblaugrana saem pelo acabamento por código
  (moldura, selo, legenda). Falta decidir se este canal usa o mesmo selo com outra cor ou um
  próprio. Com as cores de série no ar, a resposta provável é o mesmo selo na cor da série.
- **Numeração de edição e selo de série na capa**, adiados em 14/08/2026 (ver §7).
- **A voz do mascote**, que é decisão editorial e mora no `EDITORIAL.md` §4. Ela decide quantas
  poses o `torcedor-12` vai precisar, então segura o orçamento de geração dele.
- **Como o acervo separa os dois canais.** Os 145 quadrinhos vivem num `project.json` só e **nenhum
  deles declara a que canal pertence**; o primeiro episódio daqui (`o-dia-jules-rimet`) só se
  identifica numa frase de prosa dentro do `contexto`, que nenhum código lê. Enquanto for assim,
  nada mecânico impede um personagem com escudo de clube entrar num painel do futgibi, nem o
  `assinar.mjs` carimbar `@futgibi` numa arte do outro canal (ele aceita qualquer caminho). Decisão
  em curso pelo Raphael em 15/08/2026.
- **O escopo do portal** (§3.1).
- **O ícone de Resenha é um balão só**, herdado do set, e a capa anterior tinha dois cruzados (que
  dizem "conversa" melhor). Se incomodar, o conserto é um `icone-baloes` novo no set, não um desenho
  solto dentro do gerador de capas.
