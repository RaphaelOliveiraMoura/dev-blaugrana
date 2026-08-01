---
name: novo-video
description: Cria um vídeo animado do SagaFut do roteiro ao render, aplicando as camadas de direção (planos, punch-in, ritmo, reação, profundidade) que separam um vídeo dirigido de um vídeo só correto. Use quando o pedido for criar/refinar um vídeo animado do SagaFut.
---

# Vídeo animado do SagaFut, do roteiro ao render

Os gates do projeto conferem **execução** (sprite existe, ninguém anda de costas, gesto acerta o
alvo). Eles não conferem **direção** — e um vídeo passa em tudo e sai chapado. Esta skill é a parte
que os gates não cobrem.

Referência longa: `saga-fut/docs/VIDEOS.md`. Entrada do projeto: `CLAUDE.md`.

## 1. Antes de escrever qualquer beat

Pergunte ao usuário só o que muda o trabalho, e decida o resto:

- **Qual a virada?** Um vídeo é UMA piada. Se você não consegue dizer a virada numa frase, o roteiro
  ainda não existe.
- **Quem NÃO reage?** Em quase todo gag do SagaFut existe um personagem impassível. O contraste
  entre o caos e a indiferença dele é o que faz graça.
- **Quantos personagens?** Cada um custa model sheet + idle (+ andar se ele se desloca). Prefira
  base de caricatura que já existe (`node scripts/asset.mjs elenco`).

Depois: `node scripts/video/new-video.mjs <id>`, e o roteiro entra pela API (nunca editando
`data/` direto — o studio sobrescreve).

## 1.5 DECUPAGEM antes do JSON (não pule)

O roteiro JSON é formato de EXECUÇÃO. Escrever direto nele faz as decisões de direção acontecerem
por omissão. **Preencha a tabela de decupagem primeiro** — notação, colunas obrigatórias e um
exemplo trabalhado inteiro estão em `decupagem.md`, ao lado deste arquivo.

A regra de maior retorno está lá e vale repetir aqui: **um cenário panorâmico é um SET, não um
fundo.** Ele tem 2 telas de largura pra a câmera navegar. Encenar todas as cenas no mesmo `x` joga
metade do cenário fora e é a causa nº 1 de "o vídeo parece sempre a mesma coisa". Mova a encenação
pelo mundo: mesma composição, lugares diferentes. Custo de geração: zero.

## 1.6 Princípios de direção 2D

`direcao-2d.md`, ao lado deste arquivo, traduz os princípios de storyboard, movimento de câmera,
regra dos 180° e timing de comédia para os campos deste motor. Leia antes de decupar. Os três que
mais mudam decisão:

- **Movimento de câmera precisa ter MOTIVO.** Se todo shot tem movimento, nenhum tem. Um movimento
  com intenção por cena (o punch-in do impacto não conta, é pontuação).
- **Regra dos 180°:** quem entra, entra sempre pelo MESMO lado; a câmera navega o mundo sempre no
  mesmo sentido. Alternar parece erro, não variação. O INV-4 não pega isso — é sua responsabilidade.
- **O gancho tem 3 segundos e ele NÃO é o estabelecimento.** Abrir com dois personagens parados
  esperando alguém chegar gasta o ativo mais caro do vídeo com nada.

## 1.7 ANIMATIC antes de gerar asset (o ponto de aprovação)

Decupagem preenchida e roteiro no JSON, **antes de gerar um único sprite**:

```bash
node scripts/video/animatic.mjs <id>
```

Ele roda o motor de verdade com **boneco** no lugar de todo sprite que ainda não existe e **grade com
régua de x** no lugar do cenário. Escala, posição, orientação, ritmo e movimento de câmera saem os
definitivos; só a arte é provisória. O boneco é assimétrico de propósito (nariz e seta pra direita),
então quem está andando de costas aparece de cara, antes do INV-4.

Este é o momento de aprovar a ENCENAÇÃO com o usuário, e a pergunta que se faz a ele é essa: quem
está onde, de que tamanho, olhando pra onde, em que ritmo. Ele julga olhando, por comparação; não
peça que ele descreva design em palavras. Se algo estiver errado, conserte o roteiro e rode de novo,
que custa ~10s e zero geração. Errar aqui é de graça; errar depois do `asset video` não é.

`--tudo` desenha todo mundo como boneco mesmo quem já tem arte, pra julgar só a encenação. `--cena=N`
foca numa cena. No fim, a **lista de compras**: o que ainda precisa ser gerado, com o comando ao lado.

No studio isso é a aba **Animatic** do vídeo: botão, folha e lista de compras com comando copiável.
Se o usuário estiver com o studio aberto, mande ele olhar por lá em vez de descrever a folha.

## 2. As sete camadas de direção

Aplique nesta ordem. As cinco primeiras são **de graça** (só dado no roteiro).

### 2.1 Cobertura de planos
Nunca deixe o vídeo inteiro num plano só. `camera.plano`: `geral` estabelece, `medio` conversa,
`close` reage, `detalhe` pontua.
Num gag de repetição, mantenha o **enquadramento base igual** (a repetição é a piada) e varie
**dentro** dele com `zooms`. Fixe a base com `enquadramento: { escala, origem }`, não com um zoom de
hold longo.

### 2.2 Reação antes da ação
Vítima que só chega e apanha não é vítima, é alvo — e alvo não dá risada. Ela precisa reagir antes.
**Se o personagem não tem folha de reação, quem reage é a CÂMERA:** um push-in nele nos frames que
antecedem o golpe cria a antecipação sem custar geração nenhuma. Use isso antes de gastar uma folha.

### 2.3 Pontuação do impacto (punch-in)
Todo contato merece 3-4 frames de aperto e volta:
```json
{ "at": <frame do contato - 1>, "to": 1.15, "ramp": 3, "hold": 4, "out": 10, "origin": "48% 62%" }
```
O frame do contato você não chuta: é `inicioDoQuadro(i, tempos)` do gesto (`contato` no
`_meta.json` da folha).

### 2.4 Ritmo de montagem
Cenas de duração parecida = montagem sem aceleração. Num gag de três tempos: a primeira ESTABELECE
(mais longa), a segunda ACELERA (mais curta, sem apresentação), e a terceira **quebra o ritmo**
(alonga de novo, porque é onde a piada precisa doer). O INV-7 avisa quando as durações ficam iguais.

### 2.4.5 Fundo gráfico no beat de virada
O fundo NÃO precisa ser o cenário. `sh.fundo` dá cor chapada, gradiente, explosão radial, listras e
faixa de patrocínio por código, e o shot sai do modo mundo. O beat de revelação das referências é
sempre esse: piscada preta, fundo radial, close, pictograma. Custa zero geração e é o que mais
diferencia um vídeo do anterior. Detalhe e campos em `direcao-2d.md` §7.5.

### 2.5 Profundidade e clima
- `mundo.frente` com `z > 1`: camada de primeiro plano no pan. **Cuidado:** ela passa na frente de
  tudo, inclusive da sombra — peça a faixa abaixo da linha do chão e `z` baixo (~1.10) para ela não
  cair em cima de quem está em cena no plano fechado.
- `sh.grade`: véu de cor + vinheta por shot. Diferencia cenas no mesmo cenário sem gerar nada.
- `sh.ambiente`: torcida/bandeiras/chuva por código — **só se a arquibancada do cenário for lisa**,
  senão as silhuetas boiam por cima da que está desenhada.

### 2.6 Composição
Personagens equidistantes, do mesmo tamanho, na mesma linha, é diagrama e não cena. Varie `w` (quem
está mais ao fundo é menor), use `junto`/`sobrepor` pra encostar de verdade, e deixe alguém sair
parcialmente do quadro.

### 2.7 Consequência
Depois do golpe, um beat de nada. A piada respira no silêncio. Sem isso o vídeo é uma lista de
acontecimentos.

## 3. O que os gates cobram (não brigue com eles)

- **INV-6** reprova cena longa em que ninguém age. Respirar não conta como ação.
- **INV-7** avisa plano único, ausência de `zooms` e ritmo chapado.
- **INV-5** reprova gesto de uma vez reexecutado no corte. Se for de propósito (ele chuta três
  vezes), marque `denovo: true`; se ele deve CONTINUAR no estado final, use `{ "mantem": "<gesto>" }`.
- **INV-4** reprova quem anda pro lado oposto da folha. Personagem numerado **pode espelhar** (desde
  01/08/2026, o número invertido é aceito): a folha `-esq` é preferência, não requisito. Quem não
  pode espelhar de jeito nenhum é `preOrientado`, cuja sprite já foi desenhada virada.
- **INV-8** avisa quando o vídeo inteiro vive na mesma faixa de escala, e quando nenhum beat chega
  perto do personagem. Close nítido pede pose gerada com `--close` (canvas 2x).
- **INV-9** avisa quando todas as cenas usam o mesmo fundo. `sh.fundo` resolve sem gerar nada.

## 4. Fechamento

1. `node scripts/asset.mjs video <id>` — gera o que falta e roda os gates.
2. `node scripts/video/check-video.mjs <id>` — leia os WARN, não só os FAIL.
3. `POST /api/video/render {videoId}`.
4. **Confira a folha `_review.png`**, não o MP4. E confira a TRAJETÓRIA de quem voa/se desloca
   interpolando a trilha: corpo arremessado costuma sair da janela da câmera em 3 frames e o
   espectador vê ele SUMIR em vez de voar.

## 5. Regras de escrita

Texto MÍNIMO na tela: conte pela imagem. Uma fala interrompida vale mais que três balões. Personagem
baseado em jogador real leva sempre o número real dele; na descrição do post, nome real do jogador.
Nunca use travessão.
