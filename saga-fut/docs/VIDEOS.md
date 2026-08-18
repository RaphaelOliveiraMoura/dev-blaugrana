# Vídeos animados do SagaFut — padrões, pipeline e workflow

Guia pra criar os vídeos animados (estilo "Defesa do Barça", "Data FIFA", "Campeões Rivais",
"Janela: Real x Barça"). Complementa o [QUADRINHOS.md](QUADRINHOS.md). O objetivo deste doc é
padronizar a produção de **sprites** e **movimento** pra não repetir os erros que já pegamos.

O módulo de vídeo vive em `saga-fut-studio/` (motor Remotion + composer data-driven). Cada vídeo
é um JSON em `saga-fut/data/videos/<id>.json`; os assets ficam em `saga-fut/videos/<id>/`
(`cenario/`, `kf/` = sprites prontos, `sheets/` = folhas cruas, `final.mp4`).

---

## 1. Formato padrão

- **Proporção 3:4** (1080x1440). No JSON: `"formato": "3:4"`. É o padrão ÚNICO da casa: **o mesmo
  dos quadrinhos**, então todo material do SagaFut sai na mesma proporção. `new-video` já nasce 3:4
  e os validadores (`check-video`/`validar-cena`) avisam se um vídeo fugir disso. Cenário e posições
  dos personagens são calibrados pra a altura 1440 (o `gen-cenario` reserva o terço inferior pros
  personagens). Fonte de verdade no código: `FORMATO_PADRAO` em `server/video/montar-cena.mjs`.
  - Antes o vídeo era 9:16 e o quadrinho 3:4. Unificou em 3:4 porque os 52 quadrinhos já estavam
    nele (regerar era impensável), o gerador de imagem entrega 2:3 nativo — então o cenário sofre
    MENOS upscale que num 9:16 — e cenário passa a ser reaproveitável entre quadrinho e vídeo.
  - **Converter um vídeo de formato NÃO é escalar tudo pela razão das alturas.** O cenário é
    regerado e a linha do chão cai em outro lugar; o que se preserva é a posição RELATIVA no
    gramado (quem estava no fundo continua no fundo). Meça o topo da grama no cenário novo e
    converta os `piso` por essa proporção, ou melhor: use âncoras (ver 5.4).
- **Moldura de quadrinho** ligada: `"moldura": true` → margem creme + moldura arredondada escura
  + selo de **estrela** dourada no canto superior direito (desenhado por código no `Cena.jsx`,
  componente `ComicFrame`). Dá identidade de gibi e é reutilizável em qualquer vídeo.
- Fonte cartoon (`Luckiest Guy`), **texto mínimo** na tela (ver regra abaixo).

---

## 2. Pipeline de sprites (o padrão)

Ferramentas em `saga-fut-studio/scripts/sprites/` (rodar com `node`, cwd = `saga-fut/`).
**Toda regra (parâmetros de canvas + contrato de prompt) mora em `scripts/sprites/config.mjs`** —
os tools só importam de lá. Mudou como as sprites saem? Muda no config, uma vez. README dos tools:
`saga-fut-studio/scripts/sprites/README.md`.

1. **Caricatura base** (identidade do personagem) — `gen-char.mjs <foto-ref> <slug> [descrição]`
   - Foto de referência real em `personagens/<slug>/ref-riso.png`.
   - Saída: `personagens/<slug>-riso.png` (corpo inteiro, frente, neutro, fundo CREME).
   - **Essa base é o SPRITE DE REFERÊNCIA** do personagem: toda pose/animação nova é gerada
     passando ela como referência (mantém rosto/cabelo/kit).
2. **Poses/ações** — `gen-pose.mjs <slug-base> <videoId> <nome-saida> <descrição>`
   - Gera UMA pose (corpo inteiro) em **fundo MAGENTA** (`#FF00FF`), referenciando a base + estilo.
   - Saída em `videos/<videoId>/sheets/<nome>.png`.
3. **Caminhada / corrida** — `gen-walk.mjs <slug> <kit> <número>` → folha 2x2 de walk cycle
   (direção travada, só as pernas mudam) em `personagens/<slug>/rigs/andar/_sheet.png`; `gen-run.mjs
   <slug> <kit> <número>` → folha 2x2 de run cycle (inclinado, pernas E braços em passada) em
   `personagens/<slug>/rigs/correr/_sheet.png`.
4. **Fatiar/normalizar** — `slice-pose.mjs <in> <out>` (pose única); `slice-walk.mjs <slug>`
   (→ `personagens/<slug>/rigs/andar/w1..w4`); `slice-run.mjs <slug>` (→ `personagens/<slug>/rigs/correr/r1..r4`).
   Todos: chroma-key magenta + normalização (canvas 480x620, CHAR_H 580).
5. **Validar (gate obrigatório)** — `check-sprite.mjs <sprite.png> [...]` antes de montar/renderizar.
   Sai com código `!=0` se houver **FAIL** (canvas errado, vazio, tamanho fora, fantasma, magenta
   residual). WARN é heads-up. Só NÃO checa orientação do olhar (esse fica no olho + `flop-sprite`).

**Convenção de canvas (CRÍTICA, é o que mata o "personagem cresce/encolhe"):** todo sprite é
normalizado num canvas **480x620**, pés travados em **y=610**, e o personagem escalado pra uma
**altura fixa `CHAR_H=580`**. Assim walk e parado do MESMO personagem têm o MESMO tamanho.
Pose larga (corrida, braços abertos) também encaixa por largura e clampa a posição horizontal
dentro do canvas (senão corta braço/perna na borda).

**Placement no motor:** `place(cx, floorY, w)` → `cy = floorY - 0.625*w`, pés em `floorY`. O
tamanho relativo entre personagens vem do `w` no template, NÃO do sprite.

---

### 2.1 Como as regras se defendem (as quatro camadas)

Este doc é longo porque explica o PORQUÊ de cada regra. Mas na prática você não precisa lembrar da
maioria delas: elas estão embutidas em camadas de força diferente. Vale conhecer o modelo, porque é
ele que diz onde investir quando aparecer um problema novo.

| camada | como funciona | quem mora aqui |
|---|---|---|
| **1. Impossível de errar** | o dado carrega a regra; não existe botão pra errar | cronometragem do gesto (`_meta.json`), grid pela classe, ritmo do ciclo, velocidade de passada, arco do pulo, sombra, squash, poeira, tremor |
| **2. Barrado** | o gate reprova; `POST /api/video/render` devolve 422 | INV-1 fala fora do quadro, INV-2 gesto pro alvo errado, INV-4 andando de costas / rig sem direção, INV-5 gesto reiniciando, sprite faltando, cabeça pulsando, personagem não apto |
| **3. Avisado** | sai no relatório com o conserto na mensagem | INV-3 nunca enquadrado, INV-6 cena sem ação física, alvo longe demais, sprite parada demais, escala fora do tom entre folhas |
| **4. Só humano** | nada mecaniza | ver 3.6 |

**Ao resolver um problema novo, tente subir de camada.** A diferença entre a 1 e a 4 é a diferença
entre "não acontece" e "não aconteceu dessa vez". Duas heurísticas que vieram da prática:

- **Erro com saída declarada vence aviso.** Quando o caso legítimo existe mas é raro, bloqueie e
  ofereça opt-out explícito (`denovo: true`) em vez de rebaixar pra aviso. Aviso ninguém lê.
- **Ausência não aparece em relatório de FAIL.** Rig sem direção declarada não é erro de nada — é um
  buraco, e o validador fica cego nele. Daí o `asset doutor`, que transforma buraco em fila.

### 2.2 O vigia: os validadores AINDA estão validando?

A pior classe de defeito que este projeto teve não foi código errado, foi **guarda que parou de
guardar**, e em silêncio: um validador que não encontra nada devolve "tudo ok". Aconteceu duas vezes
em 31/07/2026, as duas por mudança de pasta:

- `check-sprite` agrupava os sprites pelo NOME do arquivo (`<slug>-w1.png`). Quando o acervo virou
  pasta por personagem e o arquivo passou a se chamar só `w1.png`, cada grupo ficou com um sprite só
  e a régua de escala virou **no-op** — meses medindo nada e imprimindo OK.
- A respiração era ligada testando `videos/<id>/kf/<slug>-i1.png`. O `kf/` deixou de existir, o teste
  passou a dar sempre falso e a respiração ficou **desligada em todos os vídeos**.

```bash
node scripts/testes/vigia.test.mjs
```

Ele alimenta cada guarda com um caso sabidamente ruim e exige que ela reclame. **Rode depois de
mexer em caminho, pasta ou nome de arquivo** — é exatamente quando esse tipo de defeito nasce.

---

## 3. Regras de ouro (resolvem os gaps que tivemos)

### 3.1 Recorte limpo = MAGENTA, nunca creme
Recortar a arte-base (fundo creme #f2ead6) come o BRANCO — olhos viram buraco, kit branco do Real
fica fantasma/semi-transparente. **Sempre que precisar de branco/olhos limpos, gere a pose em
fundo MAGENTA** (`gen-pose`) e fatie com `slice-pose`. `cream-key.mjs` só serve pra personagem de
roupa ESCURA (terno, etc.), como atalho.

### 3.2 A FOLHA DECLARA pra que lado olha (e o INV-4 confere)

A orientação automática funciona espelhando o sprite — e **quem tem número na camisa não pode ser
espelhado** (o número sairia ao contrário). Até aqui isso significava que um jogador numerado só
sabia andar pra **um** lado, e mandá-lo pro outro o fazia andar **de costas**, em silêncio: nenhum
validador olhava pra que lado a folha olha, porque essa informação não existia em lugar nenhum.

Agora:

- **A folha declara.** `rigs/<tipo>/_meta.json` guarda `dir: "right"|"left"`. Folha nova grava
  sozinha (o gerador já recebia `dir`); folha antiga se declara uma vez com
  `node scripts/asset.mjs dir <slug> <andar|correr|idle> <left|right>`.
- **A direção oposta é uma folha PRÓPRIA**, em `rigs/<tipo>-esq` (quadros `wL1..4` / `rL1..4`),
  gerada com `"andar": { "dir": "left" }` no manifesto. O composer escolhe sozinho: personagem
  numerado indo pra esquerda usa a `-esq` se ela existir.
- **INV-4 reprova** quem se desloca contra a direção da folha, com o conserto na mensagem. Roda nos
  dois gates (`check-video` e o gate de render), custo zero, e vale pros vídeos que já existem.

Ao rodar pela primeira vez, o INV-4 achou o mesmo defeito em **dois vídeos já publicados**
(`julian-fuga`, 2 ocorrências, e `muralha`, 1). Ou seja: não era um caso isolado, era um buraco
estrutural que vinha embarcando.

O `build-video` também **não repassava** o `dir` do manifesto pro gerador — toda folha saía pra
direita independentemente do que o manifesto pedisse. Corrigido junto.

### 3.3 Orientação — AUTOMÁTICA pelo MOVIMENTO (não seta na mão)
Foi o erro mais recorrente ("olha pra um lado, anda pro outro"). Solução final: o composer `roteiro`
deriva o facing sozinho.
- **REGRA:** quem se **MOVE** olha pra **DIREÇÃO DO MOVIMENTO** (automático — o composer soma
  entra/sai/`move`); quem fica **PARADO** usa `olhar:'esquerda'|'direita'` (mira o alvo). **Não sete
  direção na mão pra quem anda.**
- **Base dos sprites SEM número = olha pra DIREITA** (canônica). Confere UMA vez ao gerar; se veio
  espelhado, `flop-sprite`. O motor espelha (`c.flip` → `scaleX(-1)`) pra esquerda quando precisa.
- **Personagem COM número** (`numerado:true`): NUNCA espelha (inverteria o número). Gere as sprites já
  na direção certa: `gen-walk <slug> ... left` (andar pra esquerda), `-r` (correr pra direita), poses
  de ação já viradas pro alvo (`-costas`, etc.). Uma sprite por orientação.
- Andar/correr usam `w`/`r` + o flip automático para quem NÃO tem número. Quem tem número usa a
  folha própria `rigs/<tipo>-esq` (`wL`/`rL`) — ver 3.2.1, que é a regra vigente.

### 3.4 Menos estático = MAIS sprites
Personagem parado como cutout único fica morto (o Raphael reprovou isso). **Todo personagem em
cena precisa de movimento:** no mínimo `motion:'idle'` (balanço por código), mas o ideal é dar
uma AÇÃO em 2+ quadros ciclando. Exemplos que funcionaram: abraço em 3 quadros (balanço), Laporta
chacoalhando o cofrinho, Florentino gargalhando (2 quadros), Cholo balançando o dedo "não",
Julián alternando agarrar/esticar na jaula. **Regra: ao montar a cena, pergunte "o que cada
personagem está FAZENDO (animado)?".**

**O piso disso agora é automático: a folha de IDLE** (4.2). Gerada uma vez por personagem, o
composer liga o ciclo de respiração sozinho em quem está em repouso. E `check-video` virou
**WARN** quando qualquer pose parada segura a tela por mais de **2,5s** — o "cutout fantasma"
deixou de depender de alguém lembrar da regra.

### 3.5 Staging de interação: SPRITE-FIRST (cena estática não anima = sem graça)
**Regra do Raphael: fazer QUASE TUDO em SPRITE** (se mexe). Cena inteira como imagem composta parada
foi REPROVADA por ficar estática (o gerador dela saiu do repo em 18/08/2026). Sprite recortado + fundo plano encaixa fácil em
chão aberto, mas desencaixa em interação (cadeira, topo do muro, um pegar o outro) SE você deixar tudo
por pé-no-chão. Como encaixar mantendo sprite (feito no julian-fuga v4):
- **`moveY`** (beat): move no vertical (negativo=sobe). Escalar muro, pendurar, cair — vira ANIMAÇÃO.
- **`piso`** (personagem, menor=mais alto): coloca o personagem elevado (pendurado no topo do muro).
- **`bob`** (personagem): respiro/balanço em loop (Cholo dormindo não fica 100% parado).
- **`movel`** (flag do gen-react/gen-pose): embute a cadeira/cama que ele senta/deita no sprite → alinha.
- **Cenário na ESCALA do sprite:** muro alto deixa a mão do sprite no meio; faça o muro BAIXO (topo
  alcançável) + zoom. Ajuste a altura do CENÁRIO pro alcance do sprite, não o contrário.
Contato milimétrico (agarrão exato) o sprite não faz, anime a aproximação/quase-toque (lê bem em
movimento).

### 3.6 Texto mínimo
Nada de carimbo/rótulo/legenda decorativa (o "CONTRATADO" foi reprovado). Contar pela imagem e
animação. No máximo um balão de fala curtíssimo em momento-chave. Ver `feedback-pouco-texto-tela`.

---

### 3.7 O que NENHUM validador pega (a camada 4)

Se o vídeo sair ruim mesmo passando em tudo, é quase sempre por um destes. Não existe conserto
automático; existe checklist.

| ponto | por que nenhum gate pega | como conferir |
|---|---|---|
| **o roteiro tem graça** | nenhum validador lê piada | leia o beat em voz alta: tem virada? |
| **cada beat tem ação física** | o INV-6 só pega o caso extremo (cena inteira sem ninguém agir) | percorra beat a beat: alguém está FAZENDO algo, ou só falando? |
| **o gancho segura nos 2s** | é comportamento de audiência | os 2 primeiros segundos têm movimento e conflito? |
| **a folha ficou boa** | os números pegam pulsação e escala, não desenho ruim | `_card.png` do rig e o preview animado no studio |
| **olhar de personagem PARADO** | o INV-4 confere quem se desloca | quem está parado olha pra quem deveria? |
| **texto na tela** | ninguém conta caracteres | carimbo/legenda só em caso extremo; conte pela imagem |
| **o personagem é reconhecível** | não há como medir | caricatura + número real da camisa |

## 4. Bibliotecas reutilizáveis de MOVIMENTO

Movimentos que se repetem em quase todo vídeo (só muda o personagem) viram **biblioteca**, geradas
UMA vez por personagem e reusadas:

- **Andar:** `personagens/<slug>/rigs/andar/w1..w4.png` (`gen-walk` + `slice-walk`). Pro sentido oposto,
  flopar os quadros no kf.
- **Correr:** `personagens/<slug>/rigs/correr/r1..r4.png` (`gen-run` + `slice-run`), mesmos moldes do andar.
  No motor: `cycle:['<slug>-r1.png',...], hz:~8` (staged pro kf do vídeo).
- **Por código (não precisa de sprite novo):** `motion:'idle'` (balanço), `bob` (pulo em loop, ex:
  torcida), `moveX`/`moveY` (deslocamento), **shuttle/"ir buscar"** (personagem sai pra fora da tela
  `OFFX` e volta trazendo outro, parando JUNTO da pilha — padrão do Florentino).

**Pra usar um movimento num personagem novo:** rode o gerador uma vez (`gen-walk <slug> ...`) →
a biblioteca é populada → referencie no template. O sprite de identidade (base `-riso`) é o que
garante que todos os movimentos saiam com o mesmo rosto/kit.

### 4.1 Biblioteca de IDLE (respiração) — a de MAIOR retorno
`personagens/<slug>/rigs/idle/i1..i4.png` (`gen-idle <slug> [kit] [num]` + `slice-idle <slug>`). Folha 2x2 de
**respiração**: ombros e peito subindo/descendo e uma piscada, o resto travado.

- **Por que é a de maior retorno:** um render por personagem passa a valer em TODO vídeo dele, pra
  sempre. E o composer **liga sozinho**: se existe `personagens/<slug>/rigs/idle/i1.png`, quem está em
  repouso respira; se não existe, nada muda (foi feito assim de propósito — se o default viesse do
  dado, todo vídeo antigo passaria a pedir uma sprite que não existe e quebraria no render).
- **No roteiro:** beat `{ parado: true, hold: N }` = repouso VIVO (era o beat que faltava; antes
  "esperar" só podia ser pose congelada). `idle: false` no personagem desliga; `idleHz` muda o
  ritmo (default 2.6, ~1,5s por ciclo).
- **Personagem que entra andando e não tem pose depois** agora entra em repouso — antes o ciclo de
  caminhada continuava rodando e ele ficava **andando no lugar** até o fim do shot.
- **Cuidado do slicer:** `slice-idle` usa uma escala ÚNICA pros 4 quadros, não a normalização
  por-quadro do `slice-walk`. Normalizando quadro a quadro, a variação de altura (que É a
  respiração) seria justamente o que se apaga, e o ciclo sairia morto sem dar erro nenhum. O
  slicer reporta a **amplitude** e avisa se as 4 células saíram iguais.
- Confira no `personagens/<slug>/rigs/idle/_card.png`: os ombros MUDAM entre os quadros?
- **Regressão consertada em 31/07/2026:** a presença da folha era conferida em
  `videos/<id>/kf/<slug>-i1.png`, e o `kf/` deixou de existir quando o acervo por personagem virou a
  fonte única. O teste passou a dar sempre falso e a **respiração ficou desligada em todos os
  vídeos**, sem erro nenhum — os beats `parado: true` viravam no-op silencioso. Agora a pergunta é
  feita no acervo. Ao mover pasta, procure quem faz `existsSync` no caminho antigo.

### 4.2 Biblioteca de REAÇÕES (mesma ideia, pra expressão)
Poses de reação (comemorar, bravo, mão-na-cabeça...) também viram biblioteca reutilizável:
`personagens/<slug>/poses/<emocao>.png` (`gen-react <slug> <emocao> "..."`). Use o **vocabulário canônico**
(`config.REACTION_VOCAB`: `comemorar, bravo, triste, maos-cabeca, apontar, pensativo, apaixonado,
assustado, rindo, chocado`) pra o nome ser reaproveitável. Isso ataca o 3.3 (menos estático): em vez
de gerar pose de reação e jogar fora por vídeo, acumula uma biblioteca por personagem.

### 4.3 FOLHA DE EXPOSIÇÃO — o tempo de cada desenho (e a sincronia do pulo)

Um ciclo tinha **um `hz` só**, ou seja todo desenho ficava o mesmo tempo na tela. Numa respiração
isso está certo; num salto ou num empurrão está errado por definição: em animação 2D a
**antecipação SEGURA**, o meio passa voando e o ápice **FLUTUA**. Exposição uniforme é o que faz um
gesto amplo ler como flipbook mecânico.

Agora cada gesto do catálogo (`scripts/sprites/gestos.mjs`) pode declarar:

- `tempos9` / `tempos4` — **quantos frames de tela cada desenho segura**.
  Ex. comemorar: `[4, 5, 2, 2, 6, 2, 4, 3, 5]` (33 frames = 1,1s por ciclo).
- `chao9` / `chao4` — **em quais desenhos o pé está no chão**. Delimita a janela de VOO.

`slice-acao` copia as duas pro `_meta.json` ao lado da folha, então **a cronometragem viaja com o
asset**: quem tem a folha tem o tempo dela. Sem `tempos`, tudo segue uniforme pelo `hz`, como antes.

**Por que isso conserta o pulo.** O deslocamento vertical por código é construído a partir da MESMA
tabela, então o desenho na tela e a altura do personagem avançam nos mesmos frames por construção:

| desenho | o que o código faz |
|---|---|
| antes do voo | **nada** — a subida desenhada é a impulsão, cancelar seria apagar a antecipação |
| no voo | levanta pela **parábola** da janela (subida rápida, flutuação, queda acelerada de graça) |
| depois do voo | **compensa pra baixo** o resíduo da arte, colando o pé no chão |

A terceira linha é a que fecha o ciclo. A tentativa anterior usava a altura MEDIDA de cada desenho
como curva do deslocamento, e a medição não fecha: na comemoração ela sai `0→56→…→40` e volta a `0`
no loop, ou seja **o personagem caía 40px num frame só, a cada repetição**. Junto com isso, o
composer contava o quadro pelo `hz` e o motor contava pelo **frame absoluto do shot** — as duas
contas só coincidiam por sorte aritmética. Hoje as duas importam `shared/exposicao.mjs`, e a suíte
`cadeia.test.mjs` reprova se alguém voltar a duplicar essa lógica.

No roteiro: `{ ciclo:'comemorar', quadros:9, repete:2, pulo:{ altura:150 } }`. **Não conte frames na
mão:** sem `hold`, o beat dura exatamente um ciclo do gesto, e `repete: N` dá N passadas. O default
antigo era 20 frames, um número sem relação com gesto nenhum — cortava um empurrão de 30 no meio e
deixava uma respiração de 17 rodando pela metade. `tempos` e `chao` também podem vir no beat, pra
sobrescrever o catálogo num vídeo específico.

### 4.3.1 LOOP ou UMA VEZ (`loop` / `fim`)

Todo ciclo repetia enquanto o beat durasse. Na prática isso fazia o empurrão do adversário
**reiniciar sozinho** e o susto **piscar em loop** — lê como defeito, não como cena. Agora o gesto
declara no catálogo:

| campo | efeito |
|---|---|
| `loop: true` | repete enquanto o beat durar — respiração, espera, comemoração, gargalhada |
| (ausente) | **acontece UMA VEZ e para** — empurrão, tombo, susto, apontar |
| `fim: 'segura'` | default: congela no ÚLTIMO desenho, que nos gestos do catálogo é a pose de consequência (ele em pé de novo, ele sentado zonzo) |
| `fim: 'volta'` | retorna ao primeiro desenho (o repouso) |

O default é UMA VEZ de propósito: um gesto de uma vez que repete parece bug; um gesto de loop que
para é só uma cena mais parada. O roteiro sobrescreve com `loop:`/`fim:` no beat. Folha antiga que
não declarou nada (`loop: null` no `_meta.json`) continua repetindo, como sempre repetiu.

Consequência que vem de graça: num gesto de uma vez, o **contato** dispara só na primeira passada —
antes o tremor de câmera reincidia num impacto que já não estava mais na tela.

### 4.3.2 `mantem` — CONTINUAR no estado final (o "reset" no corte)

Cada shot **recomeça a lista de beats do zero**. Repetir `ciclo: 'assustar'` no shot seguinte faz o
personagem se assustar OUTRA VEZ, do desenho neutro — na tela lê como a animação resetando no corte.
Quase sempre a intenção é ele CONTINUAR no estado em que ficou:

```json
{ "mantem": "assustar", "hold": 60 }
```

Mostra direto o último desenho da folha (ou o primeiro, se o gesto tem `fim: 'volta'`), sem contar
número de desenho na mão. **INV-5** avisa quando um gesto de uma vez é reexecutado em shots
seguidos e sugere a troca.

Uma pose congelada por muito tempo cai no limite de "sprite parada na tela" (2,5s). Combine com
`bob: { amp, hz }` — respiro por código sobre a pose parada — pra ele continuar assustado sem virar
estátua.

### 4.3.3 VELOCIDADE DE PASSADA — sai da distância, nunca de um número

O ciclo de andar/correr rodava sempre a `hz: 8`, um valor que não sabia nada sobre quanto o
personagem estava percorrendo. Dois defeitos vinham juntos:

1. **Patinação** — a perna dá N passos enquanto o corpo percorre uma distância que não corresponde a
   N passos, e o pé desliza. Medido: a corrida do piloto tinha passada desenhada de 260px e avançava
   162px por passo.
2. **Velocidade absurda** — `entraDur` era escolhido a olho. 940px em 30 frames = 940px/s, que na
   escala do personagem (400px de largura ≈ 1,75m) é **3,2 m/s**: um adversário "andando" mais rápido
   do que gente corre.

Agora o personagem avança `PASSO × largura` px por ciclo completo (`0.70` andando, `1.30` correndo) e
o `hz` sai daí. E sem `entraDur`/`saiDur` no roteiro, a **duração vem da distância** numa velocidade
humana (`VEL`: `1.20 × largura` px/s andando, `2.60` correndo) em vez de um default de 24 frames.
Declarar `entraDur` continua valendo — a diferença é que o ritmo das pernas passa a acompanhá-lo.

### 4.4 PACOTE DE CONTATO — sombra, impacto e peso (tudo por código)

Personagem **não tinha sombra nenhuma** (só a bola tinha). Sprite recortado sem sombra de contato
fica *por cima* do cenário, não *dentro* dele: não existe nada dizendo onde o pé encosta, e num
salto fica gritante — ele sobe e o chão não reage. Os três efeitos abaixo são automáticos, saem da
folha de exposição e **não custam geração nenhuma**:

- **Sombra de contato** — elipse na linha `chao` do personagem, que **encolhe e clareia** conforme
  ele sobe (trilha `alturaPe`, derivada do mesmo arco do pulo). Desligar num personagem que está no
  ar ou em cima de algo: `sombra: false`.
- **Squash de aterrissagem** — no frame em que o pé bate, o corpo achata 11% e volta em 7 frames,
  ancorado nos pés. O desenho de aterrissagem já tem o joelho dobrado; o squash é o que transforma
  isso em IMPACTO em vez de mais uma pose.
- **Poeira + tremor de câmera** — baforada curta nos pés e ~6 frames de tremor por aterrissagem.
  `sh.tremorImpacto: 0` desliga, número maior exagera (default 3px).

Os frames de impacto o composer **deriva sozinho**, de duas fontes, e nada se declara no roteiro:

- **janela de voo** (`chao`) — a aterrissagem de um pulo, uma por repetição do ciclo. Levanta poeira.
- **`contato` no catálogo** — os desenhos em que algo BATE num gesto **sem voo**: o empurrão, a
  freada, as costas no chão. Sem isso o impacto ficava amarrado ao pulo, e um empurrão tinha o
  momento de contato desenhado sem o mundo reagir. `contatoPe` é o subconjunto que bate NO CHÃO e é
  o único que levanta poeira — poeira nos pés num empurrão (que acontece na altura das mãos) leria
  como erro.

**Gesto HORIZONTAL** (`horizontal: true`, hoje só o `cair`): a régua da cabeça mede a faixa 6-24% a
partir do TOPO do desenho, o que só é a cabeça enquanto o personagem está em pé. Num tombo ela mede
pernas pro alto e reprova uma folha perfeita com 50% de variação. Nesses gestos o número sai como
informação e o veredito é o olho — o `slice-acao` e o `check-sprite` respeitam a marca.

### 4.5 GRADE DE COR (`sh.grade`) — dois shots no mesmo cenário sem parecer o mesmo plano

```json
"grade": { "cor": "#ff8a2b", "op": 0.28, "mistura": "soft-light", "vinheta": 0.55 }
```

Véu de cor + vinheta por código, fora do mundo (é atmosfera entre a câmera e a cena) e antes das
falas (texto não é tingido). No cenário panorâmico, dois enquadramentos do MESMO cenário liam como o
mesmo plano repetido; com grade um vira fim de tarde e o outro vira noite **sem gerar nada**.

### 4.6 PARALLAX DE VERDADE — a camada de FRENTE

`video.mundo.frente = { nome, z }` com `z > 1` já existia no motor mas quase nenhum vídeo usava: os
panorâmicos rodavam com **uma camada só**, ou seja o pan movia tudo no mesmo ritmo e não havia
profundidade. A camada de frente corre mais rápido que o chão e passa NA FRENTE do personagem.

Gera-se pelo manifesto, junto com o resto (`camada: "frente"` sai em magenta e o `key-camada`
converte em PNG transparente):

```json
{ "nome": "relva-frente", "camada": "frente", "panoramico": true,
  "desc": "faixa estreita de relva desfocada só na borda de BAIXO (5% da altura) + uma bandeirinha
           de escanteio em cada extremidade; o meio e todo o alto ficam vazios" }
```

**Cuidado que custa um render:** a camada de frente passa por cima de TUDO, inclusive da sombra.
Peça a faixa **abaixo da linha do chão** dos personagens (no 3:4, o piso costuma ficar em y≈1300 de
1440, então a faixa tem que começar depois disso) e mantenha o meio do quadro vazio.

---

## 5. Vocabulário do motor (`Cena.jsx`)

O que o motor já sabe fazer (usar isso antes de inventar):
- **Fundo:** `image` | `video` (loop) | `blur` | `rays`.
- **Personagem:** `poses` (keyframes cronometrados com `in`, e `cycle:[...]`+`hz` pra ciclo),
  `moveX`/`moveY` (trilhas `[[frame,offset],...]`, precisam ser CRESCENTES), `motion` (`static`|
  `idle`|default), `bob:{amp,hz,phase}`, `appear`/`vanish` (janela de render), `src` (.png|.webm
  transparente).
- **Câmera:** deriva viva + `camera:'punch'`, `zooms:[{at,to,origin,ramp,hold,out}]`, `shake` e
  `shakeWin:[ini,fim,amp]` (tremor sustentado), `fx:'flash'`.
- **Overlays:** `balloons` (só texto, sem balão), `cages` (jaula), `split` (rótulos), `board`
  (0-0-10), `iris` (fecho desenho), `endCard` (@marca no preto), `confetti`, `Dust`, e a **moldura
  de quadrinho** (`scene.moldura`).
- **Prop BOLA (`shot.balls`)** — objeto animado independente dos personagens, desenhado 100% por
  CÓDIGO (SVG de bola cartoon, sem asset/IA → forma perfeita, reutilizável, não entra no check-video).
  Cada bola tem `x`/`y` (trilhas `[[frame,px]]`; **x** = centro horizontal, **y** = ALTURA acima do
  chão, 0 = rolando), `groundY` (linha do chão), `r`, `spin`. O motor desenha uma **sombra** que
  descola/clareia quando a bola sobe (vende o "no ar") e um **giro** proporcional à distância rolada
  (rola sem escorregar) + `s` (trilha de escala, encolhe a bola que vai ao fundo). No composer
  `roteiro`, dirige-se por LANCES declarativos em `sh.bola.lances` (cada lance começa onde o anterior
  parou): `{passe:x,dur}` (rasteiro), `{arco:x,pico,dur}` (parábola que volta ao chão),
  `{quique:x,pico,saltos,dur}` (quiques decrescentes), `{chute:x,alturaFim,pico,dur,escala}` (CHUTE A
  GOL: arqueia e TERMINA elevado na boca do gol encolhendo pela perspectiva, não volta ao chão),
  `{parada:frames}`. `escala` em qualquer lance = tamanho-alvo no fim. É a BIBLIOTECA DE TRAJETÓRIAS
  reutilizável pra qualquer vídeo com bola (passe, chute, gol, drible).
- **Multi-cena:** `shots[]` com `transition` (`none`=corte seco | `slideL` | `fade` | `wipe`).

### 5.4 MUNDO panorâmico + câmera que navega (`video.mundo` + `sh.camera`)

Antes, o cenário tinha o tamanho EXATO do quadro e a câmera só sabia dar zoom em volta do centro:
cada enquadramento novo exigia CORTAR pra outro shot, e cada locação exigia gerar outro cenário
(que sai com estilo levemente diferente do anterior). Com `mundo`, o cenário é **panorâmico** e
existe um espaço de mundo em pixels; **trocar de cena passa a ser MOVER a câmera no mesmo lugar**.

```json
"mundo": { "cenario": "panorama", "telas": 2,
           "frente": { "nome": "grade", "z": 1.18 },
           "fundo":  { "nome": "ceu",   "z": 0.55 } }
```
- `telas` = largura do mundo em múltiplos da tela. **2 telas num 3:4 = 2160x1440**, que é 3:2 — o
  mais largo que o gerador entrega. Gere com `gen-cenario ... --panoramico` (o `build-video`
  reamostra pro tamanho do mundo com `resize-cenario`, senão o navegador esticaria e borraria o
  contorno preto, que é o que sustenta o estilo).
- `spot` dos personagens passa a ser coordenada de **MUNDO** (0..mundo.w), não de tela.
- **Câmera por shot:** `sh.camera = { em: "<slug>"|<x>, plano: "geral"|"medio"|"close"|"detalhe",
  espera?, dur? }`. A trilha sai em frame ABSOLUTO e parte do enquadramento do shot ANTERIOR, então
  a "troca de cena" é um movimento contínuo. O primeiro shot **abre já enquadrado** (senão o vídeo
  começaria com um pan que ninguém pediu). A câmera é clampada na borda do mundo.
- **VARIAR O PLANO é o ganho de linguagem mais barato que existe.** Enquadramento uniforme em todo
  shot é o que mais faz a animação parecer amadora, e com `plano` nomeado não é preciso escolher
  número de escala nenhum.
- **Camadas e parallax:** a camada que contém o **CHÃO é SEMPRE z=1** — é o plano em que o
  personagem pisa, e um chão com z≠1 faz ele escorregar em relação ao cenário durante o pan. `z<1`
  = fundo distante (move menos), `z>1` = primeiro plano (move mais e é desenhado **na frente** dos
  personagens). Camada de frente: `gen-cenario ... --camada=frente` (sai em magenta) + `key-camada`.
- Fala (`baloes`) no modo mundo acompanha o falante no pan e se contra-escala pra o texto não
  crescer no close.

### 5.5 AMBIENTE — vida no cenário por CÓDIGO (`sh.ambiente`)

O cenário gerado é uma foto parada: sem isso, o fundo é um PNG imóvel atrás de gente que se move, e
a cena lê como slide. Custo ZERO de geração, tudo determinístico (nada de random, senão cada frame
do render sorteia de novo):
- `torcida: { y, h, n, amp, hz }` — faixa de silhuetas na arquibancada, cada uma balançando em fase
  própria. São silhuetas **de propósito**: ao fundo ninguém repara em rosto, e sprite gerado pra
  isso seria dinheiro jogado fora.
- `bandeiras: { y, n, size, cores }` — panos em mastro ondulando. Serve o alto do quadro, onde
  cenário costuma ser parede/céu vazio.
- `chuva: { n, vel, incl }` — riscos caindo + véu. Fica **fora** do mundo (é atmosfera entre a
  câmera e a cena, não sofre parallax).

**Templates prontos** (dispatcher por `video.template` em `montar-cena.mjs`):
`roteiro` (GENÉRICO, data-driven — **use este pra conceito novo**: o arco vira `video.roteiro`, sem
composer novo; schema no comentário do `montarRoteiro` em `montar-cena.mjs`; 1º vídeo: julian-fuga) ·
`esteira` (defesa-barca) · `gags-sequencia` (data-fifa) · `dupla-briga` (campeoes-rivais) ·
`alternado` (janela-real-barca, cortes alternando foco). *`split-janela` (split fixo) foi
REPROVADO — tudo parado/apertado, não usar.* Composer dedicado só quando a coreografia for muito
específica (ex.: shuttle do Florentino); o comum cabe no `roteiro`.

---

## 6. Checklist pra criar um vídeo novo

**Kit de tooling** (todos em `saga-fut-studio/scripts/video/`, ver README de lá): `new-video`
(scaffold no padrão), `build-video` (runner do manifesto `sprites.json`), `check-video` (preflight/gate).

0. **Scaffold:** `new-video <id> <template> [3:4]` — cria as pastas e o JSON já com os defaults
   obrigatórios (3:4, moldura, semAudio, publicacao placeholder). O vídeo NASCE no padrão.
1. **Roteiro** e template (ou novo composer em `montar-cena.mjs`). Formato 3:4 + moldura.
2. **Lista de compras:** `check-video <id>` lista TODO sprite/cenário que o template exige (e o que
   falta). É por onde você descobre o que produzir.
3. **Elenco:** quais personagens? `node scripts/asset.mjs status <slug>` diz o que falta em cada um.
   Personagem só entra em vídeo se estiver APTO (base + model sheet + idle).
   > **Os `gen-*` não rodam mais direto:** tudo passa por `node scripts/asset.mjs` (ver 2.1). A
   > chamada direta é recusada pela porta única, e um hook bloqueia por Bash.
4. **Sprites:** pra cada personagem, liste as POSES/AÇÕES (lembre 3.4 — cada um animado) e a DIREÇÃO
   de cada uma (lembre 3.2 e 3.3). Gere em magenta (`gen-pose`) + andar/correr + reações da biblioteca.
5. **Cenário(s):** `gen-cenario <id> <nome> "..."` — sem personagens, chão aberto embaixo, 3:4.
6. **Fatiar** tudo (`slice-pose`/`slice-walk`/`slice-run`) pro ACERVO do personagem
   (`personagens/<slug>/...`, canvas 480x620, CHAR_H 580). O vídeo não guarda cópia: o render monta
   a pasta plana do motor na hora, a partir do acervo (`server/video/sprites-do-roteiro.mjs`).
   > **Atalho declarativo:** em vez de 4-6 na mão, preencha `videos/<id>/sprites.json` (modelo:
   > `scripts/video/sprites.example.json`) e rode `build-video <id>` — gera+fatia+copia+valida tudo.
7. **Validar** (`check-sprite personagens/<slug>/**/*.png`) — **FAIL não passa**.
   O olhar de quem se DESLOCA o INV-4 confere sozinho (3.2); o de quem está PARADO continua no olho.
   `node scripts/asset.mjs doutor` lista o que ficou declarado pela metade (direção de rig,
   cronometragem de folha, model sheet faltando).
8. **Preencher** `publicacao.titulo`/`legenda` no JSON (OBRIGATÓRIOS; legenda com nome real do jogador).
9. **Preflight (gate):** `check-video <id>` — todo sprite/cenário existe? publicacao ok? **FAIL não renderiza.**
10. **Preview (posição/timing):** `preview-video <id>` → `_preview.png` (folha de contato, ~15s). Ajusta
    posição no roteiro (use ÂNCORAS: mede o cenário 1x em `cenario/_anchors.json` e usa `piso:"chao"`/
    `spot:"cadeira"` em vez de pixel) e re-preview até a encenação fechar. NÃO posicione às cegas.
11. **Render** (`renderVideo`) só quando a folha de contato estiver certa, **conferir** (mudo, `semAudio:true`).
12. **Depois de mexer em caminho/pasta:** `node scripts/testes/vigia.test.mjs` (2.2). É o único jeito
    de perceber que um validador parou de validar em silêncio.

> Nota: o servidor do studio (porta 4600) roda com `node --watch` (recarrega ao editar `server/*.mjs`).
> Pra renderizar por fora, rode um script que importa `render-video.mjs` fresco.

## 7. Produzir VÁRIOS vídeos ao mesmo tempo

O gargalo do pipeline é a geração de asset (100 a 370s por sprite; um vídeo pede ~25). Dá pra
rodar N agentes em paralelo, desde que cada um respeite as regras abaixo. O que protege é lock
em ARQUIVO (`saga-fut/.locks/`), não trava em memória: cada `node scripts/...` é um processo
novo e não enxerga o vizinho.

**Salve com as rotas granulares, nunca com o `PUT /api/dados`.** O `/api/dados` manda o
projeto INTEIRO e apaga todo item que não veio na lista — dois agentes salvando, o último
apaga o vídeo do outro. Use:

```bash
curl -s localhost:4600/api/videos/<id>                        # ler
curl -X PUT   localhost:4600/api/videos/<id> -H 'Content-Type: application/json' -d @video.json
curl -X PATCH localhost:4600/api/videos/<id> -H 'Content-Type: application/json' -d '{"gancho":"..."}'
```

`PATCH` mescla no que já está lá, então não precisa reenviar o vídeo todo pra mudar um campo.
Mesmas rotas pra `/api/quadrinhos/:id` e `/api/sagas/:id`. O gate de `publicacao.titulo` e
`publicacao.legenda` continua valendo aqui. O `PUT /api/dados` segue sendo o certo pro front,
que tem o estado completo na aba.

**O que já é automático** (não precisa fazer nada):

| Recurso | Limite | Onde |
|---|---|---|
| Gerações de imagem simultâneas | `MAX_GERACOES_PARALELAS` (4) | `codex-image.mjs`, vale pra CLI e rota |
| Renders simultâneos | `MAX_RENDERS_PARALELOS` (1) | `render-video.mjs`, fila entre processos |
| Mesmo asset pedido por 2 builds | serializado + re-checagem | `build-video.mjs` (`SKIP ... outro build acabou de gerar`) |
| Assets de cada render | pasta própria por execução | `remotion/_runs/<id>-<pid>-<ts>/` |

Lock de processo morto é detectado e roubado (PID + idade), então um `Ctrl+C` não trava a fila.
Se precisar, `rm -rf saga-fut/.locks` limpa tudo com segurança quando nada está rodando.

**Onde ainda dá conflito**: dois vídeos que usam o MESMO personagem com kits diferentes. As
bibliotecas (`personagens/<slug>.png`, `personagens/<slug>/rigs/andar/`) são globais de propósito, então
regerar o andar do Lamini com outro kit muda pra todo mundo. Combine o kit antes, ou use slug
próprio (`lamini-riso-2016`).
