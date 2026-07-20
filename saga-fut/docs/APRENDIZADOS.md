# Aprendizados, erros → curas (ler antes de produzir)

Tudo que já quebrou e a cura certa. **A cura quase nunca é "mais texto no prompt"**, 
é PADRÃO + ÂNCORA. Narração tem doc próprio: [DIRETRIZES-NARRACAO.md](DIRETRIZES-NARRACAO.md).

## Imagem (geração)

| Sintoma | Cura |
|---|---|
| Personagem muda entre cenas (rosto, cabelo, roupa) | **Âncora:** anexar a ficha como imagem de referência (`-i`, alta fidelidade). Nunca descrever o personagem só por texto. |
| Marca real / escudo / nome escrito na roupa | Bloco de negativos (regras da casa em `projeto.promptRules`), o studio anexa sozinho. |
| Estilo muda entre cenas (Pixar → foto, etc.) | `stylePrefix` da saga no começo + "same style as the other scenes". |
| Prompt fica pior quanto mais eu descrevo | Prompt longo piora. Encurtar: prefixo de estilo + sujeito com âncoras + ação + regras da casa. |
| Preciso de 9:16 exato | O `gpt-image-2` gera retrato **~1024×1536 (2:3)**, não 9:16. Ok: o Grok/ffmpeg cortam pra 1080×1920. |
| Adversário coletivo / terceiro jogador | SEMPRE silhueta sem rosto (evita caricaturar 11 pessoas e problemas de semelhança). |
| Foto de referência do jogador barra a geração (`moderation_blocked`, `public-figure`) | Morre no filtro de **entrada**, antes de desenhar: é o ANEXO, não o prompt. A régua é o tamanho da fama (o Presidente e o Xeque passam; o Messi não). Tirar a foto de `personagens/refs/` (guardar em `refs/_bloqueadas/`) e fazer a semelhança **por texto**, descrevendo construção. Não se disfarça foto pra driblar filtro. |
| **Todas as cenas do episódio com a MESMA cara** | A ficha travou uma emoção. A ficha é âncora de QUEM o personagem é, nunca de como ele está: vai em **pose viva e simpática, expressão neutra**. Quem escolhe a emoção é a cena. |

### Ficha que trava emoção (15/07/2026, custou a ficha + 6 cenas do "O Buraco 1")

A regra já existia na ficha do `torcedor-cule` ("ficha que trava uma emoção contamina toda cena
que herda dela") e mesmo assim a ficha do `irmao-lamini-riso` nasceu com **"a expressão é TUDO:
boca escancarada num berro, olho fechado de tanto gritar"**. Resultado: as 6 cenas saíram com a
MESMA cara, inclusive a cena 1, cujo prompt pedia explicitamente um sorriso. **A ficha vence o
texto do prompt**, e nos estilos onde o rosto vem da imagem (Rabisco Riso) ela vence sempre.

Três coisas que este erro ensinou, além da regra velha:

1. **Confundir arquétipo com expressão é a raiz.** "Ele é a alegria pura" é quem ele É; virou
   "ele está berrando", que é como ele ESTÁ. Descrever o arquétipo na linha da expressão trava
   a cara. Arquétipo vai no `arquetipo`, cara neutra vai no `promptFicha`.
2. **A emoção repetida se anula, e o custo é a piada.** Com o berro em toda cena, a comemoração
   idêntica no erro e no acerto (que ERA a piada do episódio) virava ruído: não dá pra rimar
   duas cenas se as seis são iguais. Variar as outras expressões não enfraquece o motivo
   recorrente, é o que faz ele existir. Mesmo princípio do commit "sinal que se repete para de
   ser sinal".
3. **Expressão travada pode inverter o sentido da cena.** No tropeço, boca escancarada + olho
   fechado lê como **choro**, e transformou a criança em alvo da piada, exatamente o que a regra
   do personagem proíbe. A cura foi olho **arregalado** (susto): olho fechado vs. arregalado é o
   que separa choro de susto.

**Cheque na revisão:** ponha as imagens das cenas lado a lado. Se as caras forem iguais, o
problema é a ficha, não os prompts, e não adianta reescrever cena.

## Geração via Codex (studio → gpt-image-2 pela assinatura Plus)

- Comando: `codex exec -s workspace-write -i <ficha1> -i <ficha2>`, **prompt pelo stdin**
  (o `-i` é variádico e engole o prompt se ele for argumento posicional).
- Custo **zero de API** (usa a franquia do ChatGPT Plus). Requer `codex login` feito.
- **Moderação de saída** às vezes bloqueia; o Codex **refaz sozinho** (retry) → por isso
  às vezes demora bem mais. Não é bug.
- **Cenas com 2 fichas de referência são LENTAS (~200s sozinhas).** Regra de paralelismo:
  **até 4** cenas leves (1 ficha) juntas; **no máx. 2** cenas pesadas (2 fichas) juntas, 
  senão dividem a banda e estouram o timeout.
- Infra (já resolvido no provider): timeout de 10min, `server.requestTimeout=0`, retorno
  assim que o PNG aparece estável + `SIGKILL` no grupo (detached) pra não deixar processo órfão.
- Falso positivo conhecido: `pgrep -f 'codex exec'` casa com o próprio shell, checar com
  `pgrep -xl codex`.

### Elenco grande (4+ personagens no mesmo painel): cast sheet única (19/07/2026, quadrinho `tubarao-rei`)

O `gerar-painel` anexa **1 ficha de referência por personagem** do elenco. Com **8** (Ferran no
trono + 7 companheiros exaltando), o Codex passou de 10min sem convergir e **morreu no timeout**;
e mesmo forçando, a fidelidade de 8 rostos num quadro rabisco despencaria (a casa não passa de ~3
refs). **Cura: juntar as fichas numa ÚNICA imagem — uma _cast sheet_, grid rotulado com o NÚMERO
de cada um — e passar só ELA + o estilo (2 refs em vez de 8).** A instrução diz que a Image 1 é uma
folha de identidade com VÁRIOS personagens, que cada um se casa com o prompt **pelo número da
camisa**, e que é grade NEUTRA (não copiar poses nem os rótulos, não desenhar o grid; desenhar UMA
cena única). Resultado: os 8 saíram numa cena só, todos reconhecíveis.

- CLI: `node gerar-painel-elenco.mjs <quadrinhoId> [painelNumero]` — monta a cast sheet do elenco
  do quadrinho automaticamente (número extraído do `promptFicha`) e gera. `CAST_ONLY=1 …` só monta
  a folha (pra conferir antes de gerar). A cast sheet fica em `quadrinhos/<id>/_elenco.png`.
- Ajuda o reconhecimento **quebrar o mar de camisas iguais** com um traço forte por jogador: o
  loiro platinado (20) e o goleiro de **verde** (13) foram as âncoras visuais nesse quadro.
- Regra geral: **até ~3 personagens** → fichas separadas (fluxo normal); **4+** → cast sheet única.

## Vídeo (Grok Imagine, manual)

| Sintoma | Cura |
|---|---|
| Corta pra outro enquadramento sozinho | `single continuous shot, no camera cuts, keep the exact same framing`. |
| Personagem fala / mexe a boca (episódio só-narrador) | `characters do not speak, mouths stay closed`. |
| Acessório some no meio (coroa, brinco) | Citar o que permanece: `keeps his crown at all times`. |
| Movimento morto (ação acontece 1x e para) | Ação contínua: `repeatedly, one after another, throughout the clip`. |
| Áudio do Grok diferente a cada cena | O áudio do Grok é **só ambiência**, mutar e reusar baixo sob a narração única do ElevenLabs. Todo prompt termina com o bloco `AUDIO: ... no voices, no narration`. |
| Cena precisa de +10s | NÃO usar "estender" por padrão (cada extensão dá drift). Dividir em 2 clipes com corte seco; se estender, repetir TODAS as restrições. |

## Montagem e legendas (studio → ffmpeg)

- **Este ffmpeg não renderiza texto** (sem `drawtext`/`libass`). Todo texto no vídeo
  (card final, legendas) vem de **PNG desenhado no canvas do navegador → overlay**.
- **Legendas automáticas:** quebra por "..." (+6 palavras, juntando sobras de 1-2 pra
  não deixar órfãs), sync **aproximado** (peso por caractere ao longo do áudio da cena),
  faixa semitransparente **opcional**. CapCut só pra sync palavra-a-palavra em tentpole.
- Narração maior que o clipe → o render **acelera a voz** (`atempo`, até 1.35x) e
  ela "corre", perdendo a gravidade. **Cura na origem: ~12 palavras por cena** (≈6s), o
  studio mostra o orçamento verde/amarelo/vermelho abaixo de cada narração. Acima de ~8s,
  enxugar ou dividir a cena em 2 clipes. Ver DIRETRIZES-NARRACAO § Tamanho da narração por cena.
- **A régua mudou de 10s para 6s por cena em 15/07/2026** (era ~20 palavras, virou ~12). O
  render NÃO precisou mudar: ele mede a duração real do clipe (`probeDuration`) e se adapta
  sozinho. Quem tinha o 10 cravado era só o `CLIPE_S` do studio (`src/lib/narracao.js`) e os
  docs. **12 palavras é UMA frase**: a cena de 6s não comporta setup + remate, e narração com
  dois pontos finais virou duas cenas. O que sobra do texto vai pro visual. As sagas
  anteriores a essa data seguem escritas na régua de 10s e aparecem amarelas/vermelhas no
  studio de propósito, não foram reescritas.

## Continuidade e história

- Contradição de enredo (TV mostrando algo errado, roupa fora de hora, linha do tempo)
  → **revisão de continuidade humana**; nenhum prompt conserta isso.
- "Pequeno rei"/gênio (Messi) e o "velho camisa 9" (Lewandowski) → silhueta/contraluz,
  sem caricatura direta.
  **Exceção (15/07/2026):** a regra vale no **épico 3D**. Na linha **Rabisco Riso** (meme)
  o Messi tem cara: ficha `rei-riso`, "O Pequeno Rei". Registro de lenda e registro de
  zoeira são separados de propósito. O Lewandowski segue só silhueta em toda linha.

## Alcance / retenção / distribuição

Playbook completo em [ESTRATEGIA-REDES.md](ESTRATEGIA-REDES.md). Resumo dos erros → curas:

| Sintoma | Cura |
|---|---|
| Views baixas, retenção 3-4s, completude ~0% (1ª saga) | **Gancho VISUAL de abertura**: texto grande sobre a 1ª cena nos 3 primeiros segundos (toggle 🪝 no Montar). No frame 1, máx. ~7 palavras, fórmula chamada-de-identidade ou lacuna-de-curiosidade. Teste no mudo. Retenção é a métrica-mãe; view é consequência. |
| Olhar pra taxa de like como sinal de sucesso | **Ilusão:** like/view conta quem viu 1s e é o sinal MAIS FRACO desde 2025. Hierarquia real (TikTok/Shorts/Reels): tempo assistido > completude > re-watch/loop > share/save > comentário > like. Otimizar pra tempo assistido e loop, nunca pra curtida. |
| Vídeo seriado mostrado a estranho que não viu o ep1 → swipe | Cada episódio funciona **sozinho** (gancho próprio + mini-payoff) + Playlist/Séries pra agrupar. Nunca contar com "viu a parte anterior". |
| Post da novela falando "fiz com IA" morre (testado no X) | **Novela NUNCA menciona IA.** São dois públicos: a saga vende a história; o making-of é conta dev/build-in-public. Não cruzar. |
| Alcance orgânico não decola | Postar o **capítulo que termina em suspense perto de um jogo real** (o jogo "responde" a história e cola a saga no assunto do momento). É a vantagem do formato "capítulo no dia seguinte ao jogo". |
| Produção lenta perde a rodada / o assunto esfria | **Velocidade sobre perfeição** (playbook 442oons): **banco de cenas e personagens pré-renderizado** pra montar episódio-reação em horas. Janela de ouro do newsjacking: 0 a 2h após o assunto estourar. Calendário preso aos jogos do Barça + Copa 2026. |
| Medo de o canal ser desmonetizado por ser "IA" | Política do YouTube mudou em 15/07/2025 (de "repetitivo" para **"conteúdo inautêntico"**), encerrou canais 100% automatizados. IA NÃO é banida: a linha é **aumento vs. substituição** da criatividade humana. Manter camada humana visível (roteiro autoral, curadoria, olhar de torcedor), nunca pipeline cego. |
| Vídeos antigos sem gancho | **Retrofit:** remontar com 🪝, re-exportar, repostar, e só então medir retenção antes/depois. |

## Dados e infra do studio (já implementado)

- **Backups automáticos** antes de sobrescrever imagem, rough-cut e os JSONs de `data/`
  (pasta `_backups/`, últimas N versões). Escrita **atômica** + **validação** no save do JSON.
- **mp4/mp3 estão fora do git** (`.gitignore`) → têm backup em `_backups/` só quando o
  studio os sobrescreve; clipes/áudios adicionados à mão precisam de backup próprio
  (ver estratégia no WORKFLOW).
