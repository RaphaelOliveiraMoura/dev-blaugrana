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

Os dois lados recarregam sozinhos ao editar: o Vite por HMR, a API pelo `--watch`
do Node (que reinicia o processo a cada mudança em `server/` ou `shared/`). Antes
disso, a API só carregava o código na hora de subir, e mexer nela sem reiniciar
dava 404 em rota nova, sem nenhum sinal de que o servidor estava velho.

O `npm run api` mata quem estiver na porta 4600 antes de subir. É o que impede o
caso pior: o Ctrl+C mata o Vite mas deixa a API viva em background, e a próxima
subida esbarraria nela (porta ocupada) e continuaria servindo o código antigo.

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

## Estrutura do código

Regra geral: **um assunto por arquivo**. Se você não sabe onde mexer, procure
pelo assunto, não pela tela.

```
shared/constantes.mjs   regras que valem nos dois lados (ex.: gerações em paralelo)

src/
  App.jsx        só composição: hooks + layout + rotas
  app/           StudioContext (estado ambiente), Sidebar, Topbar, Rotas, nav, crumbs
  hooks/         useDados (carga/edição/save), useMidia (o que existe em disco),
                 useGenQueue (fila de geração), useRoute + useNav
  api/           uma função por endpoint; http.js transforma erro do servidor em exceção
  components/    peças de UI reusadas (PromptBlock, Media, GenerateButton, …)
  lib/           domínio puro: narracao, progresso, formatos, scaffold, canvas,
                 router (hash) e localizar (id → objeto)
  views/         uma por página

server/
  index.mjs      monta o express e sobe (PORT no ambiente sobrescreve a porta)
  config.mjs     todos os caminhos e constantes
  store.mjs      lê/grava os JSONs de data/ + valida o payload
  prompts.mjs    como cada tipo de imagem (ficha/cena/painel) vira prompt
  lib/           arquivos (backup + escrita atômica), midia, ffmpeg
  render/        segmentos (cena, hook, card final) e trilha (blocos + crossfade)
  routes/        um router por área
  providers/     codex-image.mjs (geração via assinatura Plus)
```

As views não recebem o estado por prop: puxam do `useStudio()`. **A rota é por
id, nunca por posição** (`#/saga/o-duende-da-sorte`), porque reordenar ou apagar
uma saga não pode fazer um link salvo abrir outra. O índice ainda é o caminho de
edição (`n.sagas[si]…`), mas é derivado do id a cada render, nunca guardado.

## Modelo de dados

Fonte de verdade: `../saga-fut/data/project.json` (global) + `data/sagas/<id>.json`
(uma por saga). O servidor monta/distribui via `readDados`/`writeDados`, em
`server/store.mjs`, que é o único lugar que sabe desse split. Objeto completo
(o que o front vê):

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
- Mídia: `personagens/<id>.png` e `episodios/<sagaId>/<NN>/cenas/N.png|mp4` dentro de
  `../saga-fut/`. Salvou o arquivo com o nome certo, aparece. A regra dos caminhos mora
  em `shared/caminhos.mjs`, ver a convenção em [../saga-fut/README.md](../saga-fut/README.md).
- Nova saga = adicionar um objeto em `data/sagas/` (peça ao Claude);
  o painel renderiza automaticamente.

## Geração (harness), estado

- **Imagem: ATIVA.** `server/providers/codex-image.mjs` roda `codex exec` (gpt-image-2
  pela assinatura ChatGPT Plus, sem API key). `POST /api/generate/imagem` compõe o prompt
  (`server/prompts.mjs`: estilo + regras da casa), anexa as fichas da cena como referência,
  salva na pasta certa e faz backup da versão anterior. Fila no front, com o teto de
  paralelas em `shared/constantes.mjs` (o servidor recusa o que passar disso).
- **Vídeo e áudio: manuais** por ora (sem API pública boa de image-to-video; narração
  no ElevenLabs). Candidatos naturais da próxima fase.

## Segurança de dados

Antes de sobrescrever imagem, `rough-cut.mp4` ou os JSONs de `data/`, o servidor salva a
versão anterior em `saga-fut/_backups/`. O save é atômico e
validado. Mídia (mp4/mp3) está no `.gitignore`, faça backup próprio dessas pastas.
