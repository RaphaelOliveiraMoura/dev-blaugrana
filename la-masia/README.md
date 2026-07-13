# ⚽ La Masia

Central do culé brasileiro — sistema local, zero dependências, para produzir o conteúdo do **@dev_blaugrana** no dia a dia.

## Rodar

```bash
node server.mjs
# → http://localhost:4870
```

Só precisa de Node 18+. Sem npm install, sem build.

## Filosofia

Ferramenta enxuta, focada em **produzir valor** (não em medir métrica). A IA faz o trabalho pesado de pesquisa e estruturação — você copia, cola, gera a arte e posta manualmente. Nenhuma integração posta por você.

## As quatro abas

| Aba | O que faz |
|---|---|
| **Prompts** | Biblioteca de prompts prontos pra colar no Claude: **Coletar rumores** (pesquisa as fontes e devolve as linhas do radar), **Comparativo de estatísticas** (Lamine × Messi alinhado por idade), **Estruturar a rodada do Bolão** e o **Briefing do estado** (contexto do perfil pra pedir ideias) |
| **Estúdio** | Gera a **imagem pronta** (1200×675) de cada formato: Radar do dia, Versus, Carreira (quiz, com vídeo), Que jogo é esse?, Top 5, Fato empacotado, Antes/Depois e posts de texto. O template **Radar Blaugrana** traz embutido o *Importar da IA* (cola a resposta do Claude), a lista de rumores ativos e o formulário manual — o card atualiza sozinho |
| **Ideias** | As **três frentes** (Radar, Lamine × Messi, Bolão) com o que é, por que existe, impacto esperado e como rodar. Embaixo, um banco de ideias soltas de post |
| **Alvos** | A **sessão guiada de replies** (abre os posts frescos dos alvos, um a um), a rota de replies em 4 tiers e as buscas estratégicas do X prontas |

## O fluxo do Radar (diário, ~10 min)

1. **Prompts → "Coletar rumores"** → Copiar prompt → colar numa conversa com o Claude.
2. O Claude pesquisa as fontes e devolve as linhas no formato `jogador | time | direção | estágio | fonte | tier | resumo | link`.
3. **Estúdio → Radar Blaugrana → Importar da IA** → colar a resposta → **Analisar** → **Aplicar no radar** (jogador existente é atualizado; novo é criado).
4. Marque no **☑** da lista quais rumores entram na arte do dia — o card mostra só os marcados (com o escudo de cada time e o do Barça em destaque no topo).
5. Escolha o **formato**: *vertical 4:5* (1080×1350, padrão — ocupa mais o feed no celular) ou *paisagem 16:9* (1200×675, clássico, nunca corta). Depois **Baixar PNG** do card + **Copiar texto** do post.
6. Postar o card no X. Colar o **comentário com as fontes** (mostrado no preview) como primeira reply — link no post principal mata o alcance.

## Tiers de confiabilidade das fontes

- **A** — oficial (clube / jogador)
- **B** — confiáveis: Fabrizio Romano, David Ornstein, RAC1, Toni Juanmartí
- **C** — mídia catalã: Sport, Mundo Deportivo, Gerard Romero (histórico misto)
- **D** — ruído: agregadores, caça-clique, "fontes próximas"

## Automação (leitura, apoio)

- **Escudos automáticos**: o Estúdio busca o escudo de cada clube (TheSportsDB, via servidor local, cache em `data/badges/`). Sem internet ou clube não encontrado → círculo com as iniciais. Aliases em PT no mapa `BADGE_ALIAS` (app.js).
- **Vídeo revelação** (template Carreira): grava a animação do canvas e exporta MP4 (fallback WebM + comando ffmpeg quando o navegador não suportar MP4).
- A página recarrega os dados do disco sozinha ao voltar ao foco.

## Onde ficam os dados

`data/state.json` — um único arquivo JSON, legível, versionável. Use **Exportar/Importar** no topo para backup.

## Fundamentos da estratégia (jul/2026)

- 1 reply ≈ 27× um like; conversa com o autor ≈ 150× — replies são o motor
- Link externo no post = alcance zero (link vai na reply)
- Report = −738× — nada de engajamento farming barato
- Bio: *"Central do culé brasileiro 🟦🟥 Radar de rumores com nota de confiabilidade · Estatísticas · Bolão com prêmios. Tudo grátis, construído por um dev"*
