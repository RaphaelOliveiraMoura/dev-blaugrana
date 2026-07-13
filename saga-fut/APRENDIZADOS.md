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
- Narração maior que o clipe de 10s → o render **acelera a voz** (`atempo`, até 1.35x) e
  ela "corre", perdendo a gravidade. **Cura na origem: ~20 palavras por cena** (≈10s), o
  studio mostra o orçamento verde/amarelo/vermelho abaixo de cada narração. Acima de ~13s,
  enxugar ou dividir a cena em 2 clipes. Ver DIRETRIZES-NARRACAO § Tamanho da narração por cena.

## Continuidade e história

- Contradição de enredo (TV mostrando algo errado, roupa fora de hora, linha do tempo)
  → **revisão de continuidade humana**; nenhum prompt conserta isso.
- "Pequeno rei"/gênio (Messi) e o "velho camisa 9" (Lewandowski) → silhueta/contraluz,
  sem caricatura direta.

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
