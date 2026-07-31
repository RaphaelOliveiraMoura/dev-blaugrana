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

## 3. Vídeo novo: o caminho

1. `node scripts/video/new-video.mjs <id>` — nasce 3:4, com `publicacao.titulo` e legenda
   obrigatórios (sem eles não salva).
2. Escreva o **roteiro** (lista de shots) no JSON do vídeo, via API.
3. Declare no manifesto `videos/<id>/sprites.json` o que o roteiro usa.
4. `node scripts/asset.mjs video <id>` — gera o que falta e roda os gates.
5. `POST /api/video/render {videoId}` — valida de novo e renderiza.

**Prefira gesto do catálogo** (`scripts/sprites/gestos.mjs`): descrição, fases, cronometragem e
comportamento de loop já testados. Escrever fases na mão é a exceção.

## 4. O que os gates reprovam (não tente contornar)

`POST /api/video/render` roda `validar-cena` e devolve **422** se houver erro. `?forcar=1` existe
para falso-positivo — se você está prestes a usar, é quase certo que o problema é real.

- fala de quem não está no enquadramento · gesto dirigido pro lado errado
- personagem andando **de costas** (a folha de movimento declara pra que lado olha)
- rig sem direção declarada — conserto: `node scripts/asset.mjs dir <slug> <rig> <left|right>`
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
| **2. Barrado** | gate reprova e o render devolve 422 | andar de costas, gesto pro alvo errado, fala fora do quadro, gesto reiniciando no corte |
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
