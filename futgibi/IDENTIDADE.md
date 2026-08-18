# futgibi — identidade do perfil

> **A FONTE ÚNICA DA MARCA É `marca/tokens.json`, e o manual navegável é `site/marca/`.**
> Este arquivo continua sendo o **porquê** de cada decisão (é o que nenhum JSON guarda). O que é
> valor (cor, tipo, espessura, formato) mora lá e é lido por todo mundo. Ver §10.

Canal de quadrinhos de futebol **em geral**, irmão do `@devblaugrana`. Mesmo traço (estilo
`rabisco-riso`), mesmo pipeline, e uma diferença que decide tudo o resto: **aqui não existe clube**.

## 1. A regra que gera as outras

O devblaugrana é grená e azul porque é canal de um time. Este não é de time nenhum, então **nenhum
elemento da MARCA pode pertencer a um clube ou a uma seleção**: nem cor, nem listra, nem escudo, nem
estrela. Marca aqui é o que se repete em toda peça e identifica o canal: avatar, paleta, mascote,
moldura, selo, banner. O que sobra de futebol universal é a grama, a linha branca do campo, a bola e
a arquibancada, e é daí que a identidade toda sai.

**A ARTE DOS EPISÓDIOS NÃO SEGUE ESSA REGRA (15/08/2026).** Até esta data a proibição valia também
para o conteúdo, e o Raphael reverteu: episódio sobre um time PODE mostrar a cor, a listra e o
uniforme daquele time, porque é isso que faz o torcedor se reconhecer na peça, e reconhecimento é o
que o canal quer. A separação que fica de pé é outra: **a marca é de futebol em geral, o episódio é
sobre quem ele fala.**

O preço de ter confundido as duas coisas está medido. No lote de 44 episódios de futebol brasileiro
de 15/08/2026, a regra antiga fez o `o-dia-camisa-flamengo`, que é justamente sobre a troca de cores
do clube, ser desenhado sem poder mostrar a cor de que fala, e obrigou o `o-dia-inter` a pintar
Grêmio e Internacional de creme e cinza num episódio cujo assunto é a rivalidade entre os dois.
Peça que não pode desenhar o próprio assunto é peça que nasce pela metade.

**No texto publicado, nomear times e pessoas continua obrigatório** (ver `EDITORIAL.md` §2). Isso
nunca esteve em jogo, e confundir arte com texto já custou um lote inteiro de legendas sem nome.

Verde e amarelo juntos ficaram de fora de propósito: viram seleção brasileira e brigam com o
conteúdo no dia em que o quadrinho for sobre Champions.

## 2. Paleta

**Os valores moram no `marca/tokens.json` e a lista completa está no manual** (`site/marca/`, §04).
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

**Nome de exibição:** `Fut Gibi · futebol em quadrinhos`

**Como o nome se escreve:** `Fut Gibi` em texto corrido, `Fut Gibi` onde a peça inteira é caixa alta
(logo, manchete, selo), `@futgibi` no handle. Uma palavra só, sempre.

Isso virou regra em 15/08/2026 porque **a marca tinha três grafias vivas ao mesmo tempo**, e cada
uma estava certa no seu canto: o token mandava escrever "Fut Gibi" com espaço, os quatro logos <!-- vigia:contraexemplo -->
desenhavam Fut Gibi e o site escrevia Fut Gibi. Nenhuma peça obedecia ao token. Venceu a que já estava
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

## 6.1 As quatro contas (16/08/2026)

O manual ganhou uma seção **Redes sociais**, que absorveu a antiga "Aplicações". Eram duas coisas
sobre o mesmo assunto vistas de dois lados: uma mostrava as peças de perfil sem dizer em que conta
cada uma vive, e a outra não existia. O que entrou no `tokens.json` é o que faltava pra conta
existir fora da cabeça de quem posta.

| campo | o que é | por que no token |
|---|---|---|
| `nome-exibicao` | "Fut Gibi · futebol em quadrinhos" | no Instagram e no YouTube o nome é campo de **busca**, não enfeite: quem procura "quadrinhos de futebol" só acha o perfil se a palavra estiver ali |
| `bio.curta` | 109 caracteres, cabe em qualquer rede | escrita uma vez, igual nas quatro. Bio inventada na hora de preencher o cadastro é como o canal fica com quatro descrições diferentes |
| `bio.longa` | a do YouTube, com palavra-chave | lá a busca pesa, e o campo é grande o bastante pra dizer o que o canal é |
| `perfis[]` | papel e **fatia de energia** de cada rede | sai da pesquisa (`DISTRIBUICAO.md` §6), e é a única coisa que distingue uma conta da outra na hora de trabalhar: a marca e o handle são os mesmos |
| `objetivo` | o alvo do canal | mora aqui e **não na bio**, de propósito |

**O objetivo não vira texto de bio, e a razão é a mesma régua que a marca cobra do conteúdo.** A
ambição é ser referência de quadrinhos de futebol em português, e referência se prova com acervo
consultável, não se anuncia: a voz proíbe superlativo sobre si mesma, e num perfil de dia zero ele
ainda seria falso. Bio diz **o que é, pra quem é e por que confiar**, nessa ordem, e fecha com a
chamada da marca.

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
    compor-v2.mjs              a rodada anterior de composição (respiro e faixa, arte da rodada 1)
    compor-v3.mjs              o laboratório atual: SEIS candidatas com as artes do Grok e os spots
    recortar-objetos.mjs       fatia as folhas de objetos/detalhes em spots PNG transparentes
    spots/                     os assets auxiliares (bola, apito, radinho, rabiscos de ênfase...)
    assinar.mjs                carimba @futgibi na arte
    tokens.json / tokens.mjs   a FONTE e a ponte (§10). Gera o CSS e publica os ativos no site.
    vigia.mjs                  o gate da marca: hex à mão, grafia, contraste e estrela no peito
    gerar-svg.mjs              as peças (balão, tarja, moldura, carimbo) e os ícones, em SVG
    gerar-logo.mjs             rodada 1 de logotipo (6 direções) · REPROVADA
    gerar-logo2.mjs            rodada 2 (6 direções, o nome por dentro) · REPROVADA
    gerar-logo3.mjs            rodada 3 (8 direções, já com "Fut Gibi" em caixa mista)
    gerar-logo4.mjs            rodada 4 (8 direções: autógrafo, onomatopeia, selo, número...)
    gerar-logo-ia.mjs          os mesmos briefings no Codex e no Grok, pra comparar os dois
    gerar-logo-oficial.mjs     monta as peças oficiais a partir do PNG escolhido (recolore e apara)
    prova-logo3/4/-ia.mjs      as folhas de escolha, com os 3 testes e a redução real
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
- **O ÍNDICE FLUTUA, E A FOLHA LARGA VIROU GRADE** (v1.23). O sumário era uma **coluna da grade**,
  então abrir e fechar mudava a largura da prancha (928px contra 1400px): o manual inteiro
  repaginava, o texto refluía sob os olhos de quem lê, e a mesma seção tinha dois layouts. Hoje a
  folha tem **sempre** a largura de índice fechado e o menu abre **por cima**, com véu. Um painel
  flutuante precisa das três saídas, e faltar uma é o que faz um menu parecer preso: o botão, o
  clique fora e o `Esc`; mais o fechamento ao escolher uma seção, porque menu que cobre a folha
  não pode ficar na frente da página que a pessoa acabou de pedir. Sumiu junto a preferência em
  `localStorage`: não há mais o que lembrar.
  Com a prancha fixa em 1400px, o empilhamento em coluna única virou o defeito visível:
  **173 a 194 caracteres por linha** (o confortável é 68) e blocos curtos com metade da folha em
  branco. Duas saídas foram testadas na tela e **reprovadas**: limitar a largura da caixa deixa o
  quadro pela metade, e o vazio lê como caixa vazia, não como respiro; `columns` no texto cria o
  mesmo vazio dentro do quadro, porque texto de 1 a 3 linhas (o tamanho real das intros aqui) não
  preenche a segunda coluna. Ganhou a saída que o próprio manual prega em ÁREA: **o espaço
  horizontal recebe conteúdo, não linha mais longa.** Acima de `--tela-larga` a seção vira uma
  grade de duas colunas, os pares caem lado a lado sozinhos, quem já é grade por dentro atravessa
  a linha inteira, e o par dominante/satélite **deixou de usar `float`** (em grade eles são duas
  células, o que dispensa o `clear` que o float obrigava nos blocos seguintes).
  Três detalhes que custaram tentativa: `position` declarada em **dois lugares** manteve o menu
  `sticky` depois de ele virar flutuante, com a regra de baixo ganhando por ordem de arquivo;
  **item de grid recebe `stretch`**, então o cartucho de subtítulo esticava de ponta a ponta e
  deixava de ser carimbo para virar faixa de site (`justify-self:start`); e no celular o
  `position:static` que o menu tinha, de quando era coluna, o devolvia ao fluxo e empurrava a
  leitura para baixo de um sumário de dez linhas.
- **O ESPAÇO VIROU SISTEMA** (v1.22), e nasceu pensado para servir **qualquer frente**: o site que
  vem, a arte por código e o próprio manual. A auditoria mediu **37 valores distintos** de
  espaçamento no CSS, com 6, 7, 8, 9, 10, 11, 12, 13 e 14px vivos ao mesmo tempo. Ninguém decidiu
  isso: cada bloco novo copiou o vizinho e ajustou a olho. É a classe de defeito que revisão de
  peça isolada nunca pega, porque em cada peça o valor parece razoável, e que só aparece
  folheando o conjunto, que foi como o Raphael leu.
  - **A escala é base 4, oito degraus**, escolhida contra duas alternativas medidas (base 4 pura
    desloca 71% das declarações; base 4 mais 6 e 20 desloca 58%). Ganhou a pura, porque o critério
    não é quantas linhas mudam e sim **quantos degraus alguém segue sem pensar**.
  - **O nome do degrau é o valor** (`--esp-16`). Isso é a trava: usar 14px exige escrever 14 na
    mão, e o desvio fica visível na revisão em vez de se esconder atrás de um apelido como `md`.
  - **Escolha pelo PAPEL, não pelo número** (item, dentro, caixa, bloco, assunto, folha). Quem
    pergunta "quanto de espaço aqui?" erra; quem pergunta "isto é calha entre irmãos ou respiro de
    assunto?" acerta, e o valor vem junto.
  - **A escala é de TELA, e na arte vira proporção**: `esp(16, 1080)` relê o degrau na largura da
    peça. Sem isso a mesma decisão de espaço vira dois números diferentes, que é exatamente o que
    a fonte única existe para impedir.
  - Entraram os tokens que **faltavam para um site nascer certo**: `medida` (68ch de linha, teto
    de 92ch), `tela` (pontos de quebra tirados do CONTEÚDO, não de aparelho: 900px é onde a coluna
    dupla deixa de caber, 1200px é onde crescer para de ajudar) e `interacao` (sobe no hover,
    afunda no clique, 120ms, e o **anel de foco que nunca se remove**, porque quem navega por
    teclado só tem ele).
  - **Gate 5** reprova espaçamento fora da escala nos dois sites e prova que enxerga com uma
    cobaia de 14px e 7px. Manual e landing foram normalizados (232 valores) e passam.
  - Reorganização junto: **grade, calha, elevação e área saíram de "Compor uma peça"** e viraram a
    seção **Espaço e grade**, ao lado de Cor e Tipografia. Não são passos de fazer um post, são o
    sistema de layout da marca; enterradas num roteiro de produção, não seriam achadas por quem
    for construir outra frente.
  - **O RITMO VERTICAL PRECISOU DE DONO**, e isso o Raphael viu logo depois: "algumas seções não
    têm espaçamento vertical". A escala sozinha não resolve se cada bloco continuar decidindo a
    própria margem. Medidos os vãos de todas as seções, o mesmo tipo de separação ia de 0 a 24px
    na mesma folha. Passaram a mandar **três regras, e só elas**: entre blocos o vão é
    `bloco + sombra`; antes de um subtítulo é `assunto + sombra`, porque abrir tema pede mais
    respiro que separar dois blocos do mesmo tema; depois de um subtítulo **encolhe**, porque
    título mora perto do que titula e vão igual dos dois lados faz o h3 flutuar sem dono. Saíram
    junto **76 margens inline** do HTML, que eram segunda opinião sobre a mesma coisa e venciam a
    regra por especificidade. A regra operacional que fica: **margem não vai no elemento**.
    Quatro causas achadas na auditoria, todas silenciosas:
    1. A regra do float **zerava o `margin-top` do bloco dominante**, e num float essa é a única
       margem que existe: ele sai do fluxo, então o `* + *` do irmão seguinte não o alcança.
    2. `body.livro .intro{margin:0}` zerava **toda** intro, e desde a fusão de seções existe uma
       no meio da folha, não só depois da cabeça.
    3. O par dominante/satélite usava `~` em vez de `+`, então **toda** frase seguinte da seção
       herdava contorno fino, corpo reduzido e margem zero, inclusive uma que não é satélite.
    4. O cartucho de subtítulo era `inline-block`, e **`clear` não age em inline-block**: ele
       ficava pendurado na linha ao lado do bloco que flutua, a 570px da margem esquerda.
       `display:table` é block-level e continua abraçando o texto.
  - **A cabeça virou uma LINHA** (17/08/2026): o carimbo de página era `section::before` absoluto,
    sangrando no topo da folha, e passou a ser o `.num` da própria cabeça — título no cartucho
    laranja colado à esquerda, carimbo colado à direita, na mesma linha. A cabeça era `inline-flex`
    e ela mesma era o cartucho; o fundo laranja passou para o título, que é quem precisa dele. O
    número continua vindo do **contador CSS**, não do texto escrito no HTML: ter o número em dois
    lugares é ter um deles errado depois da primeira seção inserida no meio. Duas armadilhas: no
    HTML o `<span class="num">` vem **antes** do título (era assim quando morava dentro do
    cartucho), e com `space-between` isso invertia os dois — resolvido com `order:2`, que arruma a
    ordem visual sem editar as dez seções; e a margem de topo que a cabeça tinha no modo livro
    existia só para fugir do carimbo sangrado, então foi a zero.
- **DOIS BLOCOS E UMA ABERTURA** (v1.21). O índice tinha quatro grupos, um deles com **um item
  só** ("Sistema gráfico", que é rótulo sem nada pra agrupar) e duas entradas soltas fora de
  qualquer grupo. Agora cada bloco responde uma pergunta, na ordem de quem trabalha: **A marca**
  (o que o canal é e como fala), **Identidade** (de que ela é feita: logo, cor, tipografia,
  mascote, vocabulário gráfico) e **Na prática** (como se produz: compor, publicar, a fonte
  única). Fundação e Voz fundiram em "A marca", porque eram as duas menores seções e respondiam
  juntas à mesma pergunta; a primeira página passou a dizer tudo que define o canal, que é como
  um brandbook abre. Saiu junto o alerta "o modelo inventa estrela no peito", a pedido do
  Raphael: era a **terceira** aparição da mesma regra, viva no item 7 da receita do Compor e no
  par de erros da Cor, que são os dois lugares onde a decisão acontece. Ficaram 9 seções e 10
  folhas.
  Uma armadilha de refatoração que vale registrar: **renomear classe de seção por busca-e-troca
  junta as regras de densidade das duas seções antigas no mesmo seletor**, com valores diferentes
  brigando por ordem de arquivo. Aqui `.sec-fundacao` e `.sec-voz` viraram `.sec-marca` e
  nasceram nove declarações duplicadas, quatro delas contraditórias (dois `font-size` para o
  mesmo `.txt`, dois `margin-top` para o mesmo `> * + *`). Toda fusão de seção pede uma passada
  consolidando o CSS herdado, senão o que decide o layout é a ordem em que as regras caíram.
- **UMA SEÇÃO, UMA PÁGINA** (v1.20). A quebra automática em folhas "continua" saiu, por decisão
  do Raphael: "melhor manter tudo na mesma página com scroll vertical". O paginador media bloco a
  bloco, cortava a seção em N folhas, fatiava grid clonando o container e tinha até regra de
  título viúvo. Ele funcionava; o custo era o **assunto picado**, com Publicar em quatro folhas e
  ninguém sabendo em qual estava a regra do avatar. A regra que fica no lugar: **conteúdo compacto
  é preferência, não obrigação**. A folha encolhe até 10% pra fechar sozinha e o que sobrar rola,
  com a faixa "continua ↓" avisando. O `MIN_FIT` subiu de 0,72 para 0,9 pela mesma lógica:
  espremer até 0,72 só valia quando a alternativa era abrir outra folha, e agora a alternativa é
  rolar, que não custa legibilidade nenhuma. Foram 25 folhas para 11.
  Junto vieram o **índice que recolhe** (marcador de página na lombada, atalho `i`, preferência
  lembrada), que devolve largura de prancha de 928px para 1400px num monitor de 1440, com o texto
  parando em 92ch para a linha não passar de ~90 caracteres e a largura extra indo para os grids,
  que têm `auto-fit`; a **capa como item do índice**; a descrição das quatro peças de logo em
  dobra, com o ONDE USAR à vista; e ícone e spot que pararam de esticar.
  **Quatro defeitos de CSS/DOM que valem além daqui**, todos do tipo que não dá erro nenhum:
  1. **`:not()` cru muda a especificidade de uma regra que já existia** e pode inverter uma
     disputa antiga. Acrescentar `:not(.capa-gibi)` a `main > section[id]` levou o seletor de
     (0,1,2) para (0,2,2), passando a vencer o `body.livro main > section` (0,1,3) que dá
     `position:absolute` à folha: a seção voltou a ser `relative`, cresceu 2295px para fora do
     palco e a tela ficou verde. `:where()` tem especificidade ZERO e mantém o equilíbrio.
  2. **Dois `::after` no mesmo elemento**: um sobrescreve o outro em silêncio (a faixa nasceu no
     canto superior esquerdo porque o `main::after` já era a pilha de folhas da borda).
  3. **`scroll` de elemento não sobe para o ancestral**, nem na fase de captura. Medido: zero
     eventos no `main` com `capture:true`. O listener tem que ir no elemento que rola.
  4. **`width:100%` com `max-height` achata a imagem só na vertical**, porque quem manda é a
     caixa. `width:auto` com os dois tetos deixa o navegador escolher o lado que limita.
  E um quinto, de INPUT: **roda e trackpad não emitem gestos, emitem uma chuva de eventos.** O
  mesmo movimento que leva a página ao fim continua pingando (a inércia do trackpad passa de um
  segundo), e a página virava sozinha ao encostar na borda. A regra que conserta: **só vira o
  gesto que já COMEÇA na borda**; o gesto que trouxe até a borda, inércia incluída, é engolido, e
  rolar de volta pra dentro desarma. Chegou no fim, parou; só um scroll novo vira a folha.
  O "gesto novo" precisou de DOIS sinais, e o segundo veio de um "fica travado" relatado pelo
  Raphael: a pausa de 300ms sozinha não basta, porque o scroll novo dado ENQUANTO a inércia ainda
  pinga chegava antes de qualquer pausa, era lido como continuação e engolido junto, travando
  justamente quem fazia o gesto certo. O segundo sinal é a **assinatura do delta: inércia só
  decai**, então um delta que salta pra 1,5x o anterior no meio de uma sequência decaindo só pode
  ser um empurrão novo do dedo (é a heurística dos fullpage scrolls, redescoberta na marra).
  Corolário de UX que fica: **mecânica de gesto engolido precisa se anunciar.** Ao chegar no fim,
  a faixa "continua ↓" troca pra "fim da página · role de novo e a folha vira" (na contracapa ela
  some), porque scroll sem efeito e sem aviso lê como travamento mesmo quando é a mecânica certa
  funcionando.
- **O MANUAL É REGRA E ESPÉCIME, NÃO DIÁRIO** (v1.19, reforma de 17/08/2026). Ele tinha virado
  três documentos misturados: o brandbook, o diário das decisões ("as quatro rodadas reprovadas",
  "o funil de três rodadas", "a arte da rodada 2 tem menos gente maior") e um manual de
  engenharia (woff2 contra ttf, `conferirFonte()`, `currentColor`, remapeamento pixel a pixel).
  Os dois últimos já tinham casa: **este arquivo** e o histórico de versões do próprio token. O
  corte foi de 16 entradas de índice para 10 e de 32 folhas para 25, **sem perder uma regra**, e
  os quatro critérios ficam como método pra próxima vez:
  1. **Regra fica, história sai.** O porquê vira uma linha, e só quando a regra é contraintuitiva.
  2. **Espécime vale mais que parágrafo.** Onde há prova visual, o texto que a descreve de novo sai.
  3. **Cada regra aparece UMA vez**, na seção em que a decisão é tomada; os outros lugares apontam.
     A proibição de clube estava em cinco seções, a grafia do nome em duas, "um destaque por peça"
     em duas. Repetição parece reforço e é o que faz o manual parecer maior que o sistema.
  4. **Engenharia sai do brandbook.** Comando de terminal fica só onde a pessoa executa.
  As fusões que isso permitiu: Componentes + Padrões + Iconografia + spots viraram **Vocabulário
  gráfico** (eram quatro entradas para a mesma pergunta, "de que formas a marca é feita?", cada
  uma repetindo o acabamento da casa na sua intro); Ilustração + Composição + Layout viraram
  **Compor uma peça**, com a receita numerada como bloco dominante e os erros que ela previne ao
  lado; e o "Como usar" foi absorvido pela contracapa, porque separados o leitor terminava o
  manual duas vezes. Duas medições que ficam: **o desperdício de folha não se resolve com folga
  de paginação** (subir a folga de 1,06 para 1,16 não tirou uma página sequer e levou uma folha a
  0,759 de encolhimento, porque a distância entre o que sobra e o bloco que não coube é de 66% e
  não de 16%; folha vazia se resolve com bloco menor ou bloco a menos); e **grid estica irmãos até
  a altura do mais alto**, então bloco dobrado ao lado de bloco longo virava uma caixa de 450px
  com um rótulo dentro, o que o `align-items:start` conserta.
- **O estilo de ilustração NÃO foi copiado pra cá.** O `rabisco-riso` continua sendo lido do
  `project.json` na hora de gerar. Copiar seria criar a segunda fonte e garantir que marca e
  acervo divergissem.
- **Ele é uma EDIÇÃO DE GIBI, não um site de design system** (v1.3). A direção veio de uma
  reprovação do Raphael ("queria a experiência de um quadrinho mesmo") e a referência é dupla: os
  próprios slides publicados (moldura preta de cantos redondos, calha de papel, cartucho de
  legenda, carimbo de página, selo redondo) e a anatomia da capa de banca vintage (corner box com
  o personagem, masthead, número da edição, selo de aprovação). No manual isso vira: capa com o
  selo no corner box, masthead com o lettering e uma cover line, legendas de quadrinho sobre a
  arte, cada seção como PRANCHA com carimbo "pág. NN",
  papel com grão e vinheta, títulos em cartucho de LETTERING
  (Comic Neue, o análogo aberto da Chalkboard SE dos vídeos, servida do domínio), e o mascote
  FALANDO em dois pontos, no balão desenhado com o rabicho apontando pra ele. O acabamento é o
  QUADRADO COM SOMBRA DURA, e a regra ficou explícita na v1.5: **canto vivo sempre que houver
  sombra**. Sombra dura e canto redondo não convivem; o raio sobrevive só onde não há sombra e a
  forma pede (carimbo de página, selo circular, balão desenhado).
- **A direção final saiu de um leque de CINCO variações** (v1.5), julgadas olhando e combinadas
  pelo Raphael peça por peça, que é o método da casa levado ao design da própria página. O que
  venceu são **TRÊS NÍVEIS**, e a hierarquia é a de uma revista aberta na mesa: a **MESA** é o
  verde da marca com a malha de rede, a **PRANCHA** é a folha de papel PONTILHADA com o ben-day da
  impressão barata, e o **QUADRO** é o painel creme LISO com borda e sombra. Os dois cremes saem
  do que o token já dizia que cada um é: `papel-fundo` é "o papel da PÁGINA, um tom abaixo do
  creme" e `creme-papel` é "fundo de quadro". Mais o **cartucho de título laranja e torto** e a
  estrutura de **quadros**: todo texto solto da prancha virou painel, porque o que o olho lê como
  página de gibi é a sequência de quadros com calha entre eles, não uma folha de texto corrido.
- **Onde o ben-day mora importa**, e eu errei isso uma vez: pontilhar o QUADRO faz a textura ler
  como fundo de site. A chapa de meio-tom é impressa na PÁGINA, então ela vive na prancha, e o
  quadro por cima é liso. Repetir os dois anula os dois.
- **Em tela larga o manual FOLHEIA em vez de rolar** (v1.4): cada prancha é uma página física num
  palco com perspectiva, o scroll rola o conteúdo da página e, na borda dela, o gesto vira a folha
  sobre a lombada esquerda, como revista. Índice, setas, teclado e hash navegam junto, e a pilha
  de folhas por vir aparece na borda direita do palco. No celular e com prefers-reduced-motion o
  manual segue rolando na vertical: folhear com o dedo em tela pequena é pior que rolar. O motor
  tem dois gatilhos de fim de virada de propósito (o `finished` da animação e um temporizador),
  porque o evento não resolve quando a aba perde a pintura no meio da animação, e um motor que
  espera um evento que não vem trava o livro inteiro.
- **A virada é uma DOBRA DE CANTO, no método do StPageFlip, portado e não importado** (v1.13,
  substituindo a folha rígida em rotateY da v1.12, que lia como porta porque numa rotação rígida
  o conteúdo inteiro se move junto). A lib foi avaliada duas vezes e a conclusão se manteve: ela
  é dona do DOM (página de tamanho fixo, container próprio, conteúdo estático) e brigaria com a
  repaginação viva, o scroll interno e o `--fit`. O que veio dela é a GEOMETRIA, que é onde o
  efeito mora, e ela cabe em quatro frases: o canto inferior direito da folha viaja num arco até
  o espelho dele do outro lado da lombada; a dobra é a MEDIATRIZ entre o canto original e onde
  ele está agora; a folha é recortada nessa linha por `clip-path`, então aquém da dobra o
  conteúdo fica PARADO (é isso que separa dobrar de girar); e a aba é o verso de papel REFLETIDO
  pela mediatriz (uma matrix 2D de determinante -1), recortado pela mesma linha. O vinco é um
  gradiente com paradas calculadas em px por quadro, porque gradiente CSS não tem como saber
  sozinho onde a dobra corta o eixo. Tudo roda por rAF: os polígonos mudam até de NÚMERO DE
  VÉRTICES entre quadros, o que nem WAAPI nem transition interpolam. Três detalhes que custaram:
  o recorte da folha leva 70px de sobra à direita e embaixo (senão o clip decapita a sombra dura
  no primeiro quadro), a borda da aba só aparece onde ela contém uma borda REAL da página (o
  recorte come o resto, como numa folha dobrada de verdade), e o fim continua com dois gatilhos
  (o próprio quadro e um temporizador), porque rAF congela quando a aba perde a pintura. A fila
  de clique e o `?lento` da v1.12 continuam valendo.
- **Ele é agrupado em quatro partes** (v1.2): Fundamentos (fundação, voz), Identidade (logo e
  nome, cor, tipografia, mascote, ilustração), Sistema gráfico (componentes, padrões, iconografia,
  layout) e Compor e publicar (composição, redes sociais, como usar). A Voz subiu pro começo de
  propósito: ela é premissa, não apêndice, e morava depois do layout.
- **Texto sobre imagem é LEGENDA, não card** (v1.10, virou regra escrita no token em v1.11:
  `tipografia.legenda-na-arte`). O cartucho da capa era um card de site
  (sombra dura, canto vivo, uma caixa larga com a frase em caixa mista), e a casa já tem uma
  linguagem própria pra isso: as caixas que o export desenha em cada painel publicado
  (`server/lib/legenda.mjs`), com proporções medidas contra os painéis que a IA desenhava. A capa
  passou a usar as mesmas: creme, contorno fino, canto arredondado como fração da ALTURA, caixa
  alta centralizada, sem sombra. **A diferença que mais importa não é a sombra, é a caixa ABRAÇAR
  o texto**: duas caixas curtas empilhadas em vez de um bloco ocupando a base inteira.
- **A PÁGINA CABE, e três defeitos do paginador saíram disso** (v1.10, calibrado num notebook de
  1366x768, que é onde a folha útil é menor). Nenhum deles tinha sintoma óbvio, e os três eram do
  mesmo tipo: uma medida chutada onde havia uma medida disponível.
  - o grid era dividido por REGRA DE TRÊS (`n * util / altura`), o que só vale se todos os filhos
    tiverem a mesma altura. O histórico da marca tem item de três linhas e item de doze, e a
    última folha estourava 71px. Hoje a divisão acumula LINHA a linha, medindo o filho mais alto
    de cada faixa de colunas;
  - a calha entre blocos era fixa em 16px, e as seções que apertam o respiro em tela baixa usam 8:
    com quatro blocos são 32px inventados, o bastante pra empurrar o último bloco pra uma folha
    que ele não precisava. Hoje ela é lida do `margin-top` computado;
  - o encolhimento (`--fit`) assintotava a 5 ou 10px do fim, porque nem tudo encolhe com ele
    (contorno, borda, imagem de altura fixa) e a razão medida sempre devolve um alvo alto demais.
    Uma mira de 1,5% fecha;
  - e a distribuição eram DUAS passadas: os grids grandes viravam pedaços do tamanho de uma folha
    inteira, e só depois os pedaços eram distribuídos. Um pedaço de folha inteira nunca cabe
    embaixo de uma intro, então a folha de abertura de várias seções ficava com título, um
    parágrafo e meia página em branco. Hoje é uma passada só, medindo o espaço que REALMENTE
    sobrou: o grid começa onde dá e continua na folha seguinte. O bloco que não é grid mas é uma
    lista por dentro (a escala tipográfica, o painel de layout) entra nisso com a classe
    `quebravel`, e era o último caso em que uma página ainda rolava no encolhimento mínimo.
  Duas peças ficaram FORA da lista de grids quebráveis de propósito: a paleta (paleta partida não
  deixa comparar duas cores sem folhear, que é a única coisa que ela serve pra fazer) e o par
  "cabe aqui / nunca" da Voz, que são as duas metades da mesma regra.
- **A DOBRA: regra à vista, porquê fechado** (v1.11). O manual tem duas camadas, e elas têm pesos
  muito diferentes: a regra cabe em duas linhas, o porquê é sempre o dobro dela. Aberto, o porquê
  empurrava a peça seguinte pra outra folha, e o manual chegou a 51 páginas de revista. Fechando
  só o porquê, ele caiu para **35 sem perder uma linha**. O que dobra: a nota de cada cor (a
  paleta inteira passou a caber numa folha), o porquê de cada frase-destaque, o apoio longo de
  subseção, as listas de "nunca" e o histórico de versões, que sozinho valia seis páginas. As
  listas de proibição foram a decisão difícil, porque são regra dura e não comentário; elas ficam
  com o **rótulo e a contagem à vista** ("Nunca · 6 regras"), então a folha continua avisando que
  existe uma proibição ali, e o que fica fechado é o texto, não a existência da regra.
- **A folga de 6% no paginador** (v1.11). Bloco indivisível que passa raspando do fim da folha
  abria uma página só pra ele e deixava um palmo de papel em branco na anterior. Hoje ele entra e
  o encolhimento fino absorve, porque é exatamente pra isso que o `--fit` existe. A folga NÃO vale
  na quebra de grid: grid é divisível por definição, e ali estourar só empurra o problema pro
  encolhimento, que já está no limite.
- **O `--fit` tinha que morrer no despaginar, e não morria** (v1.11). Ele fica no style inline da
  folha, então a segunda paginação (a que roda quando as imagens carregam) media tudo com o
  encolhimento da primeira ainda aplicado: o conteúdo parecia menor do que é, a folha aceitava
  blocos a mais e a página estourava depois. Medir sempre em escala 1 é o que torna a medida
  comparável entre passadas.
- **PESO E ÁREA: a hierarquia dentro da página** (v1.17). O sintoma foi lido pelo Raphael na
  página 1: "três cards, um deles verde, e não tem muita hierarquia; parece que todo conteúdo é
  igual". A causa é que a prancha empilhava blocos de mesma sombra, mesmo contorno e mesma
  largura, e a lição que generaliza é esta: **cor sozinha não faz hierarquia, porque cor diz "sou
  diferente" e não "sou o primeiro"**. Um leque de cinco alavancas foi ao teste com seletor ao
  vivo (escala, área, elevação, âncora, combinada) e duas foram escolhidas:
  - **ELEVAÇÃO em três degraus.** Alta (sombra 12px, contorno 6px) pro bloco dominante, que fica
    parecendo um recorte colado por cima da prancha; média (o padrão) pro quadro comum; baixa
    (sem sombra, contorno 3px) pro apoio e pro satélite, que assentam no papel. **Um alto por
    página**: dois recortes saltando disputam, e disputa é o mesmo que empate.
  - **ÁREA.** O dominante toma 58% da largura e o satélite sobe ao lado dele, como abertura de
    matéria de revista; e o que é irmão vai lado a lado por padrão. Em tela estreita tudo volta a
    empilhar, porque 58% no celular é coluna espremida.
  Três detalhes que custaram tentativa: `:first-of-type` não seleciona "a primeira frase" (ele
  olha o TIPO do elemento, e o primeiro div da seção é a cabeça); o satélite precisa de
  `flow-root` pra subir ao lado do float, senão a caixa dele passa por trás e sobra um rombo de
  papel; e o float só pode existir quando HÁ satélite (`:has(~ .frase)`), senão a seção de uma
  frase só fica com 42% de papel em branco e ainda empurra o bloco seguinte pra outra folha.
- **A CALHA SE MEDE NO PAPEL VISÍVEL, e a sombra faz parte do bloco** (v1.18). A hierarquia da
  v1.17 estreou com os quadros da página 1 colados, e a causa era de régua, não de valor: a
  margem de 14px era medida de caixa a caixa, e os 12px de sombra do bloco elevado comiam quase
  tudo (sobrava um fio de 2px). A regra que entrou no manual e no token (`traco._calha`):
  **margem = calha desejada + sombra do bloco de cima**; abaixo de ~10px de papel visível, cole
  de vez ou afaste de vez, porque o quase-encostado lê como erro de registro. Corolário: quem
  cria um nível de elevação novo muda a pegada de todos os vãos ao redor dele, então sombra nova
  exige rever margem junto. Na mesma leitura do Raphael entraram mais três consertos:
  - **NEGRITO É PONTEIRO, NÃO CORPO.** A frase-destaque longa saía INTEIRA em display bold, seis
    linhas de manchete, e "se tudo é importante, nada é importante". Agora a manchete é a
    primeira sentença e o resto desce pra fonte de leitura em peso normal, regra que a seção de
    Tipografia já dava ("condensada é para manchete, nunca para texto corrido") e que os próprios
    cards do manual quebravam. O corte é por código (o texto vem do token, que não sabe onde o
    layout quebra), com duas guardas: frase curta fica inteira, e primeira sentença longa demais
    não é manchete de nada.
  - **A dobra "por quê" sobre card verde saía em laranja-tinta**, contraste 1,13, quase
    invisível. A regra "sobre fundo escuro nenhum laranja passa" valia pro `.destaque` desde a
    v1.9, e a dobra era a última peça fora dela: virou creme (5,65).
  - **A capa recalibrada**: wordmark menor (a capa tinha ganhado um scroll curto) e as legendas
    sobre a arte no corpo proporcional ao painel publicado (~4% da altura da arte, contorno de
    3px que é os 0,38% da largura DESTA arte). No corpo anterior as duas caixas cobriam uma faixa
    inteira da cena, personagem incluído, e legenda é coadjuvante da arte.
- **A linha de TRÊS e a segunda passada de densidade** (v1.16): o manual caiu de 38 pra 31
  páginas sem tirar uma linha, e o critério ficou escrito no CSS: numa folha de brandbook, quem
  merece tamanho é a PEÇA e a REGRA; o que ilustra (prova, galeria, exemplo, histórico) pode ser
  menor, porque quem precisa dele de perto abre o arquivo. O instrumento novo é a `.tres`, pra
  blocos irmãos que ninguém lê em sequência (nome/bio/objetivo, prova/nunca/carimbo): empilhados,
  cada um empurrava o outro de página; lado a lado são uma linha. E um bug de ORDEM que fica de
  lição: a dobra de "nunca" conta os itens quando embrulha a lista, e embrulhar lista que o
  código ainda vai preencher imprimia "0 regras" no rótulo. Transformação de DOM roda depois de
  toda população, sempre.
- **O índice não rola** (v1.10). Num notebook de 768px ele rolava, e índice que rola é pior que
  índice nenhum: o leitor perde a única visão do todo que a página oferece e ainda ganha dois
  scrolls concorrentes na mesma tela. O que fez caber não foi diminuir a letra, foi tirar CHROME:
  eram dezoito linhas de 1px desenhando uma tabela que ninguém pediu. Ele também passou a marcar a
  PÁGINA ATUAL, que um índice sempre à vista de uma revista de 50 folhas precisa ter.
- **Padrões são sete** desde a v1.2 (rede, rede densa, pontos, grama, hachura, listras, campo),
  cada um com o emprego típico escrito no §09. Padrão único vira papel de parede.
- **Os balões foram redesenhados na v1.2.** O corpo e o rabicho eram duas formas coladas (elipse
  mais triângulo) e o olho lia sorvete de casquinha. Hoje são UM caminho só: o contorno desce pra
  dentro do rabicho e volta, e o rabicho é uma vírgula (os dois lados curvam pro mesmo lado), não
  uma cunha. A ponta entra duplicada na lista de pontos porque o Catmull-Rom arredonda tudo, e
  dois pontos quase juntos são o que mantém o bico afiado.
- **Os SPOTS são o vocabulário de detalhe** (v1.2): objetos (bola, apito, chuteira, gibi, cone,
  bandeirinha, radinho) e rabiscos de ênfase (movimento, espiral, impacto, gotas, poeira, confete,
  nota, traços), gerados no Grok em folha única e recortados por `recortar-objetos.mjs`. Dois
  descartes com motivo declarado no script: o cachecol saiu listrado e o gibi fechado, camuflado.
  A regra de uso mora no manual: um ou dois por peça, onde o gesto aponta.
- **`caber()` mora no `tokens.mjs`**, não em cada script, porque o defeito que ela evita não dá
  erro: o PNG é gerado, o script diz OK, e a linha longa sai cortada nas laterais.

**A regra operacional é uma só: se você escrever um `#hex` dentro de uma peça, pare.** Ou o valor
pertence ao `tokens.json`, ou a peça está saindo da marca.

### O logotipo (ESCOLHIDO em 15/08/2026)

São **quatro peças que dividem função**, e é isso que separa esta rodada das reprovadas: cada uma
delas tentava ser a marca inteira sozinha.

| peça | o que é | onde vai |
|---|---|---|
| **wordmark** | o lettering de quadrinho (letra gorda, inclinada, contorno preto, sombra laranja) | É A MARCA. Onde houver espaço horizontal |
| **símbolo** | o PAINEL-BOLA laranja: um painel de quadrinho com a bola em velocidade dentro | favicon (direto, sem moldura extra), corner box, ao lado do wordmark |
| **selo** | a capa de gibi quadrada, com o nome dentro e a bola no canto | avatar, carimbo, todo bloco fechado. NUNCA ao lado do wordmark |
| **assinatura** | símbolo + lettering + subtítulo, na horizontal | banner, rodapé, cabeçalho |

**O símbolo saiu de um FUNIL de três rodadas** (16 e 17/08/2026), todas julgadas olhando, e o
teste que decidiu cada rodada não foi a peça sozinha: foi ela **ao lado do wordmark**, que é onde
um símbolo vive de verdade. A ordem do funil é a lição de método: primeiro o **acabamento**
(rodadas da bola-balão, onde a meio-tom foi aprovada: traço inkado, ben-day nos claros, sombra
dura), depois o **assunto** (oito conceitos nesse acabamento, três finalistas), por último a
**cor** (as mesmas quatro perguntas pros três, senão a folha não compara). Ganhou o **painel-bola
LARANJA**: o painel diz FORMATO além de futebol, a silhueta quadrada é a ideal de favicon, e o
laranja ecoa a sombra do lettering, deixando o lockup de uma temperatura só. Três lições que
ficam: **bola de gomos desenhada por código com linha reta lê como RODA** (os gomos são a
projeção de um icosaedro truncado numa esfera, e o olho percebe), então a arte é a do modelo;
**refinar peça aprovada exige referência com papel nomeado**, senão volta ícone de biblioteca; e
**a folha de prova de símbolo sempre tem a coluna do lockup**.

**O funil aprovou mais do que o posto comporta, e nasceu a RESERVA DE ÍCONES**
(`marca/icones-reserva/`, publicada no site, galeria na seção de logo do manual): os três
finalistas nas três cores (creme, verde, laranja) mais a bola-balão, que foi símbolo oficial por
um dia. Todas preparadas (fundo fora, paleta normalizada), prontas pra capa de destaque, carimbo,
vinheta e peça de série. A regra de uso está no token: **a reserva é vocabulário, não
concorrente**; num mesmo contexto, o papel de símbolo da marca é sempre do painel-bola laranja.

**Havia uma quarta e ela foi APAGADA (16/08/2026, decisão do Raphael): o selo nu**, o quadrado
verde com o 12 e sem nome. O argumento que o criou era de redução e continua verdadeiro: abaixo de
~64px o nome vira mancha, e o que resta tem que ser FORMA. O preço de tirá-lo está declarado no
favicon de 32px, que não se lê como palavra e sim como bloco verde de moldura preta, que aliás é
como favicon é lido de fato numa aba com quinze irmãos. O que não se sustentava era o outro lado
da conta: **uma marca com dois símbolos concorrentes, um com nome e outro sem, faz cada peça
escolher o seu**, e é assim que uma identidade se parte em duas.

Uma coisa caiu por consequência, e não por descuido: a **assinatura perdeu o símbolo**, porque o
que sobrou já tem o nome desenhado dentro, e encostá-lo no lettering escreve o nome duas vezes na
mesma linha, que é erro conhecido de lockup. (Ela o recuperou horas depois, quando a bola-balão
entrou: o problema nunca foi ter emblema na assinatura, era o emblema escrever o nome.)

Na **capa do manual** o selo mora no corner box, à esquerda do lettering, que é onde a banca
vintage põe a figurinha da edição. Ele chegou a ser carimbado no canto da arte e a ficar em todas
as 48 páginas do modo livro; as duas coisas foram revertidas em 16/08/2026 pelo Raphael, e a
segunda tem regra geral dentro: **marca repetida em toda página deixa de ser assinatura e vira
papel de parede**, perdendo o peso justamente onde ela deveria ter.

**O desenho é o PNG do Codex, e fica assim.** Houve uma tentativa de traçar os PNGs em vetor (um
`vetorizar.mjs` que quantizava a cor e seguia as fronteiras) e o Raphael reprovou olhando: o
traçado engrossa canto, come o miolo das curvas e entrega um desenho pior que o original. **A lição
vale além do logo: vetorizar arte de modelo automaticamente não devolve o mesmo desenho, devolve
uma imitação dele.** Melhor um PNG bom que um vetor ruim, e a tentativa foi descartada.

O que o PNG custa está resolvido sem redesenhar nada: o fundo branco vira transparente por
inundação a partir das bordas, e **mono e invertido saem por remapeamento de cor pixel a pixel**,
que é exato porque a arte é chapada (poucas cores, sem gradiente). O mesmo passo normaliza a
paleta, porque o modelo chega perto do hex da marca mas não crava.

Duas decisões que valem além do logo:

- **As variantes são POR PEÇA, nunca por tabela global.** Trocar "creme por verde" no invertido
  apaga o miolo das letras contra o fundo, e o selo, que já É um bloco verde, não se resolve
  trocando cor por dentro: sobre verde ele ganha um ARO creme. O que muda no invertido nunca é o
  miolo, é **o que separa a peça do fundo**.
- **A camisa 12 é PICTOGRAMA, não marca.** Ela foi escolhida junto, e o lugar dela é o set de
  ícones. Dois símbolos disputando o papel de logo é problema conhecido, e decidir qual é qual
  antes de usar é o que evita isso.

### As rodadas ficam guardadas

Quatro rodadas por código e uma por modelo, todas com folha de prova (`_prova-logo*.png`). Elas
não são lixo: **rodada reprovada é informação**, e o que fez cada uma cair está escrito no topo do
gerador dela. Três aprendizados que valem além do logo:

- **A grafia decide o desenho.** Com o nome numa palavra só, em caixa alta <!-- vigia:contraexemplo -->
  (um bloco de sete letras iguais), toda direção virava
  "palavra dentro de uma moldura". Com "Fut Gibi" apareceram ganchos que não existiam: ascendentes,
  o vão no meio e os dois pingos de i (que viraram bolas, escrevendo o nome com o `ı` sem pingo).
- **Letra desenhada à mão em path não fecha.** A direção "autógrafo" saiu "AutGnibi" na primeira
  tentativa. O conceito sobreviveu trocando o método (lettering inclinado com floreio), não
  insistindo no path.
- **Modelo de imagem não desenha logo, desenha ILUSTRAÇÃO de logo.** Ele acerta forma e atmosfera
  e erra letra, então os briefings de IA vêm em duas famílias: SÍMBOLO sem texto (onde ele é forte)
  e completo com o nome (arriscado). O que sair de lá é DIREÇÃO, e precisa ser redesenhado em vetor
  antes de virar marca, senão a identidade fica presa num PNG que não recolore nem reduz.
- **REFINAR PEÇA APROVADA EXIGE REFERÊNCIA, e essa custou uma rodada inteira** (16/08/2026). As
  seis primeiras variantes da bola-balão rodaram com `refs: []`, como o leque original tinha
  rodado, e voltaram corretas e **sem estilo nenhum**: ícone flat de biblioteca. O Raphael leu na
  hora ("parece que está fugindo do estilo visual"). A diferença entre os dois casos é que no
  leque não havia peça de referência ainda, e no refinamento HÁ. Vale a mesma regra das folhas de
  personagem, que o `CLAUDE.md` já registra: **duas imagens, com papéis nomeados** — uma dá o
  TRAÇO (aqui o lettering oficial: peso de contorno, irregularidade, sombra dura, o creme e o
  laranja exatos) e a outra dá a FORMA a variar. E é preciso dizer ao modelo o que cada uma é,
  senão ele mistura as duas e devolve a bola com letras dentro.

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

Até esta data **não existia logotipo**: "Fut Gibi" era uma palavra digitada com espaçamento
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

### Composição (§12 do manual)

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
