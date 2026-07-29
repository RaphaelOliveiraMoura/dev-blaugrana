# Ferramentas de sprite (vídeos animados)

Pipeline padrão pra criar sprites dos vídeos. Guia completo em
[`saga-fut/docs/VIDEOS.md`](../../../saga-fut/docs/VIDEOS.md). Rodar com `node`, cwd = `saga-fut/`.

**Fonte única de regras: [`config.mjs`](config.mjs).** Todos os parâmetros (canvas `480x620`, pés em
`610`, `CHAR_H=580`, tolerâncias) e o **contrato de prompt** (fundo magenta, "sem texto", fidelidade
das refs, estilo) vivem lá. Mudou uma regra de como as sprites saem? Muda **só no config** e vale pra
todos os tools. Não duplique número/prompt dentro dos geradores.

Convenção: sprite em fundo **MAGENTA** (`#FF00FF`), normalizado no canvas **480x620** (pés em 610,
altura `CHAR_H=580`). Recorte da arte-base (creme) só via `cream-key` e só p/ roupa escura.

## Workflow padrão (SEMPRE nesta ordem)

```bash
# cwd = saga-fut/    (S = scripts do studio)
S=../saga-fut-studio/scripts/sprites

# 1. caricatura-base do personagem (1x por personagem, a partir de uma foto)
node $S/gen-char.mjs  personagens/refs/<foto>.png  <slug>  "notas de identidade"

# 2. bibliotecas de movimento reutilizáveis (1x por personagem)
node $S/gen-walk.mjs  <slug>  "kit"  "numero"   &&  node $S/slice-walk.mjs <slug>
node $S/gen-run.mjs   <slug>  "kit"  "numero"   &&  node $S/slice-run.mjs  <slug>

# 3. poses/ações específicas do vídeo (fundo magenta)
node $S/gen-pose.mjs  <slug>  <videoId>  <nome>  "descrição da pose"
node $S/slice-pose.mjs  videos/<videoId>/sheets/<nome>.png  videos/<videoId>/kf/<nome>.png

# 4. VALIDAR — obrigatório antes de montar/renderizar
node $S/check-sprite.mjs  rigs/andar/<slug>/w*.png  rigs/correr/<slug>/r*.png  videos/<videoId>/kf/*.png
```

`check-sprite` sai com código `!=0` se houver **FAIL** — trate como gate: não renderize com FAIL
aberto. WARN é heads-up (ex.: pose larga rente à borda é normal na corrida).

## Ferramentas

| Ferramenta | O que faz | Uso |
|---|---|---|
| `gen-char.mjs` | Caricatura-base (identidade) a partir de uma FOTO | `<foto-ref-rel> <slug> "<desc>"` → `personagens/<slug>.png` |
| `gen-pose.mjs` | Uma pose/ação em magenta (ref = a base) | `<slug> <videoId> <nome> "<desc>"` → `videos/<videoId>/sheets/<nome>.png` |
| `gen-react.mjs` | Pose de REAÇÃO reutilizável (biblioteca) | `<slug> <emocao> "<desc>"` → `rigs/poses/<slug>/<emocao>.png` |
| `gen-walk.mjs` | Folha 2x2 de caminhada (direção travada) | `<slug> "<kit>" "<num>"` → `rigs/andar/<slug>/_sheet.png` |
| `gen-run.mjs` | Folha 2x2 de corrida (inclinado) | `<slug> "<kit>" "<num>"` → `rigs/correr/<slug>/_sheet.png` |
| `gen-cenario.mjs` | Cenário (sem gente, chão aberto, 3:4) | `<videoId> <nome> "<desc>" [formato]` → `videos/<videoId>/cenario/<nome>.png` |
| `gen-keyframe.mjs` | **Keyframe COMPOSTO** (personagens + cenário num render, staging correto) | `<videoId> <nome> "<desc>" <slug1[,slug2]> [formato]` → `videos/<videoId>/cenario/<nome>.png` |
| `slice-pose.mjs` | Fatia/normaliza uma pose | `<in.png> <out.png>` |
| `slice-walk.mjs` | Fatia a folha de andar | `<slug>` → `rigs/andar/<slug>/w1..w4.png` |
| `slice-run.mjs` | Fatia a folha de corrida | `<slug>` → `rigs/correr/<slug>/r1..r4.png` |
| `cream-key.mjs` | Recorta base creme (só roupa escura) | `<in.png> <out.png>` |
| `norm-sprite.mjs` | Normaliza recorte transparente pro canvas | `<in.png> <out.png>` |
| `flop-sprite.mjs` | Espelha (corrige orientação) | `<in.png> [out.png]` |
| `check-sprite.mjs` | **Valida** sprites normalizados contra o config | `<sprite.png> [...]` (exit≠0 se FAIL) |

Orquestração de nível de vídeo (scaffold, preflight, runner de manifesto) fica em
[`../video/`](../video/README.md): `new-video`, `check-video`, `build-video`.

### Biblioteca de reações (reuso entre vídeos)
Igual andar/correr, poses de reação viram biblioteca reutilizável em `rigs/poses/<slug>/<emocao>.png`.
Use o **vocabulário canônico** (em `config.REACTION_VOCAB`) pra padronizar os nomes:
`comemorar, bravo, triste, maos-cabeca, apontar, pensativo, apaixonado, assustado, rindo, chocado`.
Fluxo: `gen-react <slug> <emocao> "..."` → `slice-pose rigs/poses/<slug>/<emocao>.png videos/<id>/kf/<slug>-<emocao>.png`.

## Regras de ouro (o que já nos pegou)
- **Config é lei** — parâmetro/prompt novo entra no `config.mjs`, não copiado no tool.
- **Magenta, não creme** — pra branco/olhos limpos.
- **Tamanho unificado** — walk/run/parado do mesmo personagem têm a MESMA altura (`CHAR_H`); os
  slicers encaixam por largura e clampam (pose larga não corta na borda).
- **Orientação** — o único critério que `check-sprite` NÃO pega. Confira à mão; se errado, `flop-sprite`.
- **Menos estático = mais sprites** — cada personagem com uma ação animada.
- **Movimento reutilizável** — `rigs/andar/<slug>/` e `rigs/correr/<slug>/`: gera 1x, reusa em qualquer vídeo.
- **Validar antes de renderizar** — `check-sprite` é gate, FAIL não passa.

## Bibliotecas prontas
- Andar: `saga-fut/rigs/andar/<slug>/w1..w4.png`
- Correr: `saga-fut/rigs/correr/<slug>/r1..r4.png`
