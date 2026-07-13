# SagaFut Studio

Painel central de produção do **SagaFut**, múltiplas sagas de
futebol em IA para TikTok, cada uma com seu elenco, estilo visual e episódios.

## Rodar

```bash
cd saga-fut-studio
npm install
npm run dev        # sobe a API (porta 4600) + Vite (porta 4610)
```

Abrir http://localhost:4610.

## Organização (3 níveis)

1. **🏠 Home, Todas as sagas**: grade de cards com selo (ex.: Mercado da Bola / Lendas da Copa),
   status, elenco (avatares) e progresso (episódios prontos). Também mostra o
   pipeline de ferramentas e o áudio da casa (voz do narrador + vinheta).
2. **📺 Saga**: premissa, tom do narrador, lista de episódios com progresso
   (🖼 imagens / 🎬 vídeos aprovados), elenco da saga com fichas e prompts, e o
   **prefixo de estilo próprio da saga** (cada saga tem seu visual).
3. **🎬 Episódio**: contexto real + cliffhanger e 3 sub-abas:
   - **Cenas**: cada cena com quem aparece/não aparece, imagem/vídeo com status,
     e os prompts copiáveis (imagem já compõe com o estilo da saga; vídeo já
     inclui o bloco de ÁUDIO).
   - **Prévia**: player 9:16 que toca os clipes em sequência (animatic).
   - **Narração**: bloco completo do episódio para o ElevenLabs.
   - **Montar**: junta os clipes + narração por cena (ffmpeg no servidor) num
     `rough-cut.mp4`, com **legendas queimadas** da narração (toggle, faixa opcional)
     e card final. Salve a narração em `episodios/<ep>/audio/<n>.mp3` (uma por cena)
     e clique em Montar. O acabamento fino (sync perfeito, zoom) fica pro CapCut.

   Cada ficha e cena tem um botão **⚡ Gerar** (Codex → gpt-image-2 pela assinatura
   ChatGPT Plus, sem custo de API; até 4 em paralelo). Requer `codex login`.

Sidebar = árvore de navegação (sagas → episódios); breadcrumb no topo.

## Modelo de dados

Fonte de verdade: `../saga-fut/data/project.json` (global) + `data/sagas/<id>.json`
(uma por saga). O servidor monta/distribui via `readDados`/`writeDados`. Objeto
completo (o que o front vê):

```
projeto { nome, descricao }
ferramentas[], pipeline (etapa, ferramenta, nota)
audio { narradorVoz, vinhetaPrompt, efeitos }
personagens[], POOL GLOBAL (permite personagem em 2+ sagas)
sagas[] {
  id, titulo, selo, genero, status, premissa,
  stylePrefix, estilo visual DA saga
  narradorTom, variação de tom do narrador
  elenco: [ids], referencia o pool global
  episodios[] {
    id, titulo, status, contextoReal, cliffhanger, publicar,
    narracaoCompleta,
    cenas[] { numero, titulo, tempo, personagens, naoAparecem, narracao,
              promptImagem, promptVideo, promptAudio, montagem,
              imagem, video, statusImagem, statusVideo }
  }
}
```

- Progresso deriva dos status das cenas (não há mais checklist).
- Personagens que aparecem em mais de uma saga ganham a marcação
  "🔗 também em: ..." no card, é assim que sagas se interligam.
- Mídia: `personagens/personagem-<id>.png` e `episodios/<ep-id>/cenas/N.png|mp4`
  dentro de `../saga-fut/`. Salvou o arquivo com o nome certo, aparece.
- Nova saga = adicionar um objeto em `data/sagas/` (peça ao Claude);
  o painel renderiza automaticamente.

## Geração (harness), estado

- **Imagem: ATIVA.** `providers/codex-image.mjs` roda `codex exec` (gpt-image-2 pela
  assinatura ChatGPT Plus, sem API key). `POST /api/generate/imagem` compõe o prompt
  (estilo da saga + regras da casa), anexa as fichas da cena como referência, salva na
  pasta certa e faz backup da versão anterior. Fila no front, até 4 em paralelo.
- **Vídeo e áudio: manuais** por ora (sem API pública boa de image-to-video; narração
  no ElevenLabs). Candidatos naturais da próxima fase.

## Segurança de dados

Antes de sobrescrever imagem, `rough-cut.mp4` ou os JSONs de `data/`, o servidor salva a
versão anterior em `saga-fut/_backups/`. O save é atômico e
validado. Mídia (mp4/mp3) está no `.gitignore`, faça backup próprio dessas pastas.
