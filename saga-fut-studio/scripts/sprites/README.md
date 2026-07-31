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

# 2. bibliotecas de movimento reutilizáveis (1x por personagem, valem em TODO vídeo dele)
node $S/gen-idle.mjs  <slug>  "kit"  "numero"   &&  node $S/slice-idle.mjs <slug>   # respiração
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
| `gen-idle.mjs` | **Folha 2x2 de IDLE** (respiração: ombros + piscada) | `<slug> "<kit>" "<num>" [dir] [nota]` → `rigs/idle/<slug>/_sheet.png` |
| `gen-walk.mjs` | Folha 2x2 de caminhada (direção travada) | `<slug> "<kit>" "<num>"` → `rigs/andar/<slug>/_sheet.png` |
| `gen-acao.mjs` | **Folha 2x2 de um GESTO** (4 quadros, 1 render) | `<slug> <nome> "<desc>" "<f1\|f2\|f3\|f4>" [travado]` → `rigs/acoes/<slug>/<nome>/_sheet.png` |
| `gen-run.mjs` | Folha 2x2 de corrida (inclinado) | `<slug> "<kit>" "<num>"` → `rigs/correr/<slug>/_sheet.png` |
| `gen-cenario.mjs` | Cenário (sem gente, chão aberto). `--panoramico` = MUNDO largo pra a câmera navegar; `--camada=frente` = primeiro plano em magenta | `<videoId> <nome> "<desc>" [formato] [--panoramico] [--camada=frente]` → `videos/<videoId>/cenario/<nome>.png` |
| `key-camada.mjs` | Camada de cenário em magenta → PNG transparente do MESMO tamanho | `<videoId> <nome>` |
| `resize-cenario.mjs` | Reamostra cenário pro tamanho de exibição (lanczos + sharpen) | `<videoId> <nome> <largura> <altura>` |
| `gen-keyframe.mjs` | **Keyframe COMPOSTO** (personagens + cenário num render, staging correto) | `<videoId> <nome> "<desc>" <slug1[,slug2]> [formato]` → `videos/<videoId>/cenario/<nome>.png` |
| `slice-pose.mjs` | Fatia/normaliza uma pose | `<in.png> <out.png>` |
| `slice-idle.mjs` | Fatia a folha de idle (escala ÚNICA: preserva a respiração) | `<slug> [destino]` → `rigs/idle/<slug>/i1..i4.png` |
| `slice-walk.mjs` | Fatia a folha de andar | `<slug>` → `rigs/andar/<slug>/w1..w4.png` |
| `slice-acao.mjs` | Fatia a folha de gesto | `<slug> <nome> [destino]` → `<nome>1..4.png` |
| `slice-run.mjs` | Fatia a folha de corrida | `<slug>` → `rigs/correr/<slug>/r1..r4.png` |
| `cream-key.mjs` | Recorta base creme (só roupa escura) | `<in.png> <out.png>` |
| `norm-sprite.mjs` | Normaliza recorte transparente pro canvas | `<in.png> <out.png>` |
| `flop-sprite.mjs` | Espelha (corrige orientação) | `<in.png> [out.png]` |
| `check-sprite.mjs` | **Valida** sprites normalizados contra o config | `<sprite.png> [...]` (exit≠0 se FAIL) |

Orquestração de nível de vídeo (scaffold, preflight, runner de manifesto) fica em
[`../video/`](../video/README.md): `new-video`, `check-video`, `build-video`.

### IDLE (respiração) — a biblioteca de MAIOR retorno
Personagem em repouso era PNG parado na tela (o "cutout fantasma"). O motor já sabia ciclar quadros;
faltava o que ciclar. Um render por personagem vale em TODO vídeo dele, pra sempre.

```bash
node $S/gen-idle.mjs  vini-riso "camisa branca do Real" "7"   # folha 2x2
node $S/slice-idle.mjs vini-riso videos/<id>/kf                # -> kf/vini-riso-i1..4.png
```

O composer **liga sozinho**: existindo `kf/<slug>-i1.png`, quem está em repouso respira (não
existindo, nada muda — daí não quebrar vídeo antigo). No roteiro, `{"parado":true,"hold":N}` é o
beat de repouso vivo. Confira em `rigs/idle/<slug>/_card.png`: **os ombros mudam entre os quadros?**

Dois cuidados que essa folha tem e as outras não:
- O `slice-idle` usa **escala única** pros 4 quadros. A normalização por-quadro do `slice-walk`
  apagaria a variação de altura, que É a animação — o ciclo sairia morto sem erro nenhum.
- O risco aqui é o oposto do gesto: o movimento é mínimo, então o modelo tende a desenhar as 4
  células idênticas. O slicer reporta a **amplitude** e avisa se der ~zero.

### GESTO animado (acenar não, chacoalhar, apontar) — folha de AÇÃO
Pose única fica PARADA na tela (reprovada pela regra 3.3), e duas poses geradas SEPARADAS não
casam entre si: o corpo inteiro muda junto e o "ciclo" treme em vez de animar. A folha de ação
resolve gerando os 4 quadros NUM RENDER SÓ, travando o que não pode mudar:

```bash
node $S/gen-acao.mjs vini-riso nao "acena NAO com o dedo, sem nem olhar" \
  "dedo bem pra ESQUERDA|dedo vertical|dedo bem pra DIREITA|dedo vertical" \
  "cabeca, rosto, tronco, quadril, pernas e a altura do cotovelo"
node $S/slice-acao.mjs vini-riso nao videos/<id>/kf     # -> kf/vini-riso-nao1..4.png
```

No roteiro, `{"ciclo":"nao","hold":62}` no lugar de `{"pose":"nao"}`. O que NÃO for listado em
`travado` o modelo re-desenha, e aí treme: liste tudo que precisa ficar parado.

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
- **Movimento reutilizável** — `rigs/idle/<slug>/`, `rigs/andar/<slug>/` e `rigs/correr/<slug>/`: gera 1x, reusa em qualquer vídeo.
- **Validar antes de renderizar** — `check-sprite` é gate, FAIL não passa.

## Bibliotecas prontas
- Idle (respiração): `saga-fut/rigs/idle/<slug>/i1..i4.png`
- Andar: `saga-fut/rigs/andar/<slug>/w1..w4.png`
- Correr: `saga-fut/rigs/correr/<slug>/r1..r4.png`
- Gestos: `saga-fut/rigs/acoes/<slug>/<nome>/<nome>1..4.png`
