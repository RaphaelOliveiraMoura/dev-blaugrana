# Princípios de direção 2D, traduzidos para este motor

Teoria de storyboard e comédia é abundante e genérica. O que vale aqui é a tradução: cada princípio
vira um campo do roteiro ou uma regra de encenação. Sem a tradução, vira frase bonita que não muda
nenhuma decisão.

---

## 1. Movimento de câmera precisa ter MOTIVO

O princípio mais citado e o mais violado: mover a câmera "porque dá" distrai e **dilui as escolhas
deliberadas**. Se todo shot tem movimento, nenhum tem.

Vocabulário e para que serve cada um:

| movimento | o que ele diz ao espectador | como fazer aqui |
|---|---|---|
| **push-in lento** | intimidade, ou revelação chegando | `camera.plano` fechando com `dur` alto (24-40) |
| **pan lento** | antecipação; entrega informação aos poucos | `camera.em` viajando com `dur` alto |
| **pan de revelação** | esconde e mostra na hora exata | `camera.em` que termina apontando pra algo que estava fora |
| **whip pan** | energia; transição; passagem de tempo | `camera.em` com `dur` MUITO baixo (8-12) entre dois pontos distantes |
| **câmera parada** | deixa a ação carregar | não declare `camera` na cena |

**Regra prática:** por cena, no máximo UM movimento com intenção. O punch-in do impacto não conta
(é pontuação, não movimento).

## 2. Regra dos 180° — vale ESPECIALMENTE aqui

A linha imaginária entre dois personagens (ou ao longo do caminho de quem anda) define de que lado a
câmera pode ficar. Cruzar sem querer faz os personagens **trocarem de lado** entre cortes e o
espectador se perder.

Neste motor a regra é ainda mais dura, porque personagem numerado **não pode ser espelhado**:

- **Quem entra sempre entra pelo mesmo lado.** Se as vítimas chegam pela esquerda na cena 1, chegam
  pela esquerda em todas. Alternar parece erro, não variação.
- **Quem sai pela esquerda entra pela direita** no shot seguinte, se a cena for contínua.
- **A câmera navega no mundo sempre no mesmo sentido** dentro de uma sequência. Ir 700 → 1180 → 1620
  mantém a linha; ir 700 → 1620 → 1180 a cruza.
- O INV-4 pega o caso extremo (andar de costas). A troca de lado entre cenas ele NÃO pega — é sua.

## 3. Variedade de plano com propósito, não por variedade

Muitos planos iguais seguidos cansam; planos diferentes só pra ter variedade distraem. O critério é
o tipo de beat:

| tipo de beat | enquadramento | ritmo |
|---|---|---|
| **ação** (chute, corrida, queda) | mais ABERTO, para caber o movimento inteiro | rápido |
| **emoção** (reação, fala, decisão) | mais FECHADO, para ler o rosto | lento |

Ação em close corta o movimento; emoção em plano geral some. É o erro mais comum.

## 4. Profundidade em camadas

Componha em quatro planos: **frente / meio / fundo / fundo distante**. Composição chapada é o que
faz cenário 2D parecer papel de parede.

Aqui: `mundo.frente` (z>1) · personagens (z=1) · `mundo.cenario` (z=1) · `mundo.fundo` (z<1).
E `w` diferente por personagem: quem está mais ao fundo é menor. Três personagens do mesmo tamanho
na mesma linha é diagrama, não cena.

## 5. Contraste guia o olho

O olho vai ao ponto de maior contraste. Use isso de propósito:
`sh.grade.vinheta` escurece as bordas e empurra o olhar pro centro; `sh.grade.cor` separa uma cena
das outras. Numa cena de tensão, feche a vinheta.

## 6. Comédia: a pausa é onde a risada mora

O que a pesquisa converge:

- **Beat = tensão e alívio.** A tensão se constrói na PAUSA antes do golpe; o alívio é o golpe.
  Sem pausa não há tensão, e sem tensão o golpe é só um acontecimento.
- **Segure um beat DEPOIS da punchline.** A plateia precisa de espaço pra reagir. Cortar em cima do
  golpe mata a risada.
- Meio segundo faz ou quebra a piada. Em 30fps, isso é **15 frames** — a diferença entre um `hold`
  de 30 e de 45 é literalmente a piada.

**Regra de três:** os dois primeiros beats estabelecem o padrão, o terceiro desvia. E não faça um
quarto: depois de três punchlines parecidas o tema está esgotado.

## 7. O gancho tem 3 segundos, e ele não é o "estabelecer"

Vídeo vertical curto se decide nos primeiros segundos: quem passa dos 3s tende fortemente a ficar
até o fim, e entregar o conflito logo aumenta muito a retenção. O espectador decide de novo a cada
poucos segundos.

**Consequência direta para o SagaFut:** abrir com o estabelecimento (dois personagens parados,
respirando, esperando alguém chegar) é gastar o ativo mais caro do vídeo com nada. O primeiro
movimento tem que estar quase no frame 1.

Como corrigir sem reescrever: comece a cena com a vítima **já entrando** (`atraso: 0`, sem espera),
ou abra na cena 2 e conte a 1 depois, ou corte os frames iniciais parados. O estabelecimento pode
acontecer DURANTE a ação — ninguém precisa de 2 segundos parado pra entender quem é quem.

## 7.5 O que as referências fazem e nós não fazíamos

Medição de 01/08/2026: 8 vídeos baixados (Omar Momani, Hamid Sahari) contra os 4 vídeos do acervo.

| | nossos | referências |
|---|---|---|
| fundos por vídeo | 1 | 4 a 6, mudando por beat |
| razão entre maior e menor `w` | 1,0x a 2,2x | do rosto em meia tela ao personagem minúsculo |
| planos usados | só `geral` e `medio` | os quatro |
| efeitos acionados no roteiro | só `grade` | fundo gráfico, blackout, pictograma, desfoque, confete |

**O fundo não precisa ser cenário, e essa é a maior de todas.** O Momani usa amarelo chapado com uma
curva, vermelho sólido, radial laranja no impacto, preto total, verde com placa de patrocínio
repetida. Cenário desenhado é a exceção lá, e era o nosso único recurso. Campos:

```json
{ "fundo": { "tipo": "radial", "cor": "#c8342b", "cor2": "#f0a92e", "faixa": 12, "gira": 0.35 } }
{ "fundo": { "tipo": "chapado", "cor": "#e8b93a", "cor2": "#f2d478" } }
{ "fundo": { "tipo": "faixas", "cor": "#4a7c3f", "cor2": "#3d6835", "texto": "SAGAFUT" } }
```

`gradiente` e `listras` completam a família. Um shot com `fundo` **sai do modo mundo**: não tem
panorama pra navegar, `spot` volta a ser coordenada de tela. É o beat que corta o pan de propósito.

**Blackout entre beats.** `"piscada": { "cor": "preto", "frames": 4 }` põe o quadro cheio de preto no
começo do shot. Não é transição (não mexe em duração nem em overlap), é pontuação.

**Pictograma no lugar de folha de reação.** `"emote": { "tipo": "exclamacao", "em": 8, "dur": 32 }` no
personagem. Tipos: `fogo`, `notas`, `estrelas`, `gotas`, `moedas`, `interrogacao`, `exclamacao`.
Funciona para quem não tem folha de reação nenhuma, que é o ponto: emoção sem custar geração.

**Amplitude de escala.** O INV-8 avisa quando o vídeo inteiro vive na mesma faixa de `w`. Um beat de
reação pede rosto grande (`w` acima de 60% da largura) e um beat de isolamento pede o personagem
pequeno num quadro vazio. Para o close ficar NÍTIDO, a pose tem que ser gerada com
`asset pose <slug> <emoção> --close`, que grava no canvas 2x; folha de gesto ampliada borra, porque a
folha nasce 1254x1254 e cada célula já é menor que o canvas normal.

## 8. Uma ideia por quadro

Encene só o que serve à história do beat; agrupe ou reduza o secundário. Se o espectador precisa
procurar onde olhar, a cena tem coisa demais.

---

## Fontes

- [Staging in Animation: Visual Composition Guide — Animotions](https://animotionsstudio.com/animation-staging/)
- [The ABCs of Staging in Animation — Pixune](https://pixune.com/blog/animation-staging/)
- [Guide to Camera Moves — MasterClass](https://www.masterclass.com/articles/guide-to-camera-moves)
- [Ultimate Guide to Camera Movement — StudioBinder](https://www.studiobinder.com/blog/different-types-of-camera-movements-in-film/)
- [What is a Whip Pan or Swish Pan — StudioBinder](https://www.studiobinder.com/blog/swish-pan-whip-pan-definition-film/)
- [How Strategic Camera Movements Shape Narrative Impact — Clapboard](https://www.clapboard.com/blog/directing/cinematography/camera-movements-storytelling)
- [180-degree rule — Wikipedia](https://en.wikipedia.org/wiki/180-degree_rule)
- [What is the 180 Degree Rule in Film — StudioBinder](https://www.studiobinder.com/blog/what-is-the-180-degree-rule-film/)
- [Animation for Comedy: Art of Timing and Visual Gags — Educational Voice](https://educationalvoice.co.uk/animation-for-comedy/)
- [Comic timing — Wikipedia](https://en.wikipedia.org/wiki/Comic_timing)
- [How to Write Video Hooks for the First 3 Seconds — SocialKit](https://socialk.it/en/blog/video-hooks-first-three-seconds)
- [TikTok Hook Formulas That Drive 3-Second Holds — OpusClip](https://www.opus.pro/blog/tiktok-hook-formulas)
