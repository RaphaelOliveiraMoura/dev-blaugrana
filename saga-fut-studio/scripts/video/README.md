# Ferramentas de vídeo (orquestração)

Nível ACIMA dos sprites: criar, montar e validar um vídeo inteiro. Rodar com `node`, a partir de
`saga-fut-studio/`. Assets individuais (sprites, cenários) ficam em [`../sprites/`](../sprites/README.md).
Guia humano completo: [`saga-fut/docs/VIDEOS.md`](../../../saga-fut/docs/VIDEOS.md).

| Ferramenta | O que faz | Uso |
|---|---|---|
| `new-video.mjs` | **Scaffold**: cria pastas + JSON já no padrão (3:4, moldura, semAudio, publicacao) | `<id> [template] [formato]` |
| `build-video.mjs` | **Runner**: lê `sprites.json` e gera+fatia+copia+valida tudo num comando | `<id\|manifest.json> [--dry] [--force]` |
| `check-video.mjs` | **Preflight**: roda o composer e confere que todo sprite/cenário existe + publicacao/formato + aspecto do cenário + pose PARADA demais na tela | `<id>` (exit≠0 se FAIL) |
| `preview-video.mjs` | **Folha de contato**: ~10 stills do vídeo (motor real) num PNG — vê posição/orientação/timing SEM render completo (~15s) | `<id> [n=10]` → `videos/<id>/_preview.png` |

## Posicionar sem chutar (âncoras + preview)
Posicionar personagem é o que mais dá retrabalho (a gente escrevia pixel no escuro e só via depois de
renderizar 600 frames). Duas ferramentas matam isso:
- **`preview-video <id>`** → `_preview.png`: storyboard do vídeo inteiro em ~15s. Ajusta o roteiro,
  re-preview, repete. Só renderiza o vídeo completo quando a encenação já está certa na folha.
- **Âncoras** (`videos/<id>/cenario/_anchors.json`): mede UMA vez os pontos de cada cenário
  (`{ "muro": {"chao":1050,"topo":900}, "cela": {"chao":1300,"cadeira":830} }`) e no roteiro usa o
  NOME em `spot`/`piso` (`"piso":"chao"`, `"spot":"cadeira"`) em vez de pixel. A posição referencia o
  cenário; o composer resolve por cenário do shot. Número cru ainda funciona como fallback.

## Fluxo de um vídeo novo (o padrão)

```bash
# cwd = saga-fut-studio/
node scripts/video/new-video.mjs meu-video dupla-briga     # 1. nasce no padrão

# 2. descubra a "lista de compras" (o que o template exige):
node scripts/video/check-video.mjs meu-video               #    lista os sprites/cenários que faltam

# 3. gere os assets. OU manual (gen-*/slice-* + check-sprite), OU declarativo:
#    edite videos/meu-video/sprites.json (veja sprites.example.json) e rode:
node scripts/video/build-video.mjs meu-video --dry          #    confira o plano
node scripts/video/build-video.mjs meu-video                #    gera + fatia + copia + valida

# 4. preencha publicacao.titulo/legenda no data/videos/meu-video.json

# 5. gate final antes de renderizar:
node scripts/video/check-video.mjs meu-video                #    FAIL não passa
```

## Manifesto (`videos/<id>/sprites.json`)

Declara o que o vídeo precisa; o `build-video` cuida da ordem. Modelo comentado em
[`sprites.example.json`](sprites.example.json). Blocos (todos opcionais):

- **`personagens[]`** — `slug`, `ref` (foto→gen-char), `desc`, `idle`/`andar`/`correr` (`{kit,num}` →
  gera a biblioteca de movimento E copia os frames pro `kf/` como `<slug>-i#`/`<slug>-w#`/`<slug>-r#`),
  `stand:true`
  (base creme → `kf/<slug>-stand.png`, opt-in porque cream é frágil).
- **`reacoes[]`** — `slug`, `emocao` (do vocabulário), `desc` → `rigs/poses/<slug>/<emocao>.png` e
  `kf/<slug>-<emocao>.png`.
- **`poses[]`** — `base`, `nome`, `desc` → `sheets/<nome>.png` e `kf/<nome>.png`.
- **`acoes[]`** — `slug`, `nome`, `desc`, `fases[4]`, `travado` → folha de GESTO (4 quadros num
  render) em `rigs/acoes/<slug>/<nome>/` e `kf/<slug>-<nome>1..4.png`.
- **`cenarios[]`** — `nome`, `desc` → `cenario/<nome>.png` (o composer referencia como
  `cenario-<nome>.png`). `panoramico:true` gera o cenário LARGO do modo MUNDO (3:2) e já reamostra
  pro tamanho do mundo; `camada:"frente"` gera o primeiro plano em magenta e converte pra
  transparente (parallax de verdade). Ver VIDEOS.md §5.4.

O `build-video` **pula o que já existe** (idempotente); `--force` regera; `--dry` só mostra o plano.
No fim roda `check-sprite` (todos os kf) + `check-video` como gate.

## O que os validadores NÃO pegam
Orientação do olhar. Confira à mão e use `../sprites/flop-sprite.mjs` se algum sprite sair espelhado.

Dois avisos do `check-video`/`validar-cena` que vale entender:
- **"fica Ns PARADA na tela"** (limite 2,5s): pose congelada segurando a cena é o "cutout
  fantasma". Conserto: folha de idle, beat `{"parado":true}`, `bob` ou ação animada.
- **sobreposição** só conta como erro entre personagens no MESMO plano. Pisos bem diferentes =
  planos diferentes = a sobreposição é oclusão legítima (é assim que a cena ganha profundidade).
  Composer com coreografia de contato intencional marca `contato:true` no shot.

## Produzir VÁRIOS vídeos ao mesmo tempo
O gargalo é a geração de asset, então vale rodar N agentes em paralelo. O que segura é lock em
ARQUIVO (`saga-fut/.locks/`), porque cada `node scripts/...` é um processo novo e trava em
memória não enxerga o vizinho. Já é automático:

- **render**: fila global (`MAX_RENDERS_PARALELOS`), e cada execução tem a sua pasta
  (`remotion/_runs/<id>-<pid>-<ts>/{public,frames,scene.json}`). Antes tudo era caminho fixo e
  dois renders se destruíam em silêncio: o segundo apagava o `public` do primeiro no meio da
  renderização e o MP4 saía com sprite errado, sem erro nenhum.
- **geração de imagem**: teto global (`MAX_GERACOES_PARALELAS`) valendo pra CLI e rota.
- **asset compartilhado**: `build-video` pega lock do passo e re-checa a existência dentro dele
  (`SKIP ... outro build acabou de gerar`), então dois builds não pagam a mesma geração duas vezes.

**Salvar o JSON**: use as rotas granulares (`PUT`/`PATCH /api/videos/:id`), nunca o
`PUT /api/dados` — esse manda o projeto inteiro e apaga item que não veio na lista, então o
último a salvar apaga o vídeo do outro. Detalhes em [`VIDEOS.md`](../../../saga-fut/docs/VIDEOS.md) §7.
