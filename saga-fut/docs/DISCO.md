# Espaço em disco: o que dá pra apagar e o que não volta

Levantamento de 15/08/2026, com o projeto em **12 GB**. O disco da máquina tinha 2,4 GB livres de
228 GB, e a primeira descoberta é que **o projeto não era o gargalo**: 11 dos 228 GB. O resto estava
em `~/Library` (56 GB) e nos outros 19 GB de `~/projects`.

Este doc existe porque a pergunta "o que dá pra apagar aqui?" tem uma resposta não óbvia: o acervo
de arte é quase todo **derivado**, e derivado se regera. O erro caro não é apagar demais, é apagar a
peça de onde as outras nascem.

## 1. A regra que resume tudo

**`paineis/` é a fonte. `posts/` é derivado.**

A arte do painel nasce sangrada e muda, sai de geração de IA e **não se reconstrói**: regerar dá
outro desenho, não o mesmo. Já o slide do carrossel (moldura, selo, balão, legenda, carimbo) é
montado por código vetorial em `server/lib/acabamento.mjs`, a partir do painel mais o JSON. Custa
segundos e zero geração.

| pasta | o que é | apagar? |
|---|---|---|
| `quadrinhos/<id>/paineis/` | a arte, saída de IA | **NUNCA** |
| `quadrinhos/<id>/posts/` | slide acabado e mosaico | sim, se o painel estiver no lugar |
| `quadrinhos/<id>/capas/` | opções de capa escolhidas olhando | só as que duplicam um painel |
| `quadrinhos/<id>/animacoes/` | mp4 de painel animado | sim, re-renderizável |
| `personagens/<slug>/` | base, model sheet, folhas, poses | **NUNCA** (geração paga) |

## 2. O que foi apagado em 15/08/2026

Total liberado: **~1,0 GB**.

| item | tamanho | como volta |
|---|---|---|
| `posts/` de quadrinhos publicados | 351 MB | regeração por código (ver §3) |
| `saga-fut/_backups` | 242 MB | não volta; era o desfazer rotativo do studio |
| `.remotion/chrome-headless-shell` | 193 MB | o Remotion rebaixa sozinho no próximo render |
| `quadrinhos/*/animacoes` (15 pastas) | 120 MB | re-render |
| `saga-fut-studio/.venv-cartoonimator` | 67 MB | recriar o venv |
| `saga-fut/baixados` | 50 MB | `yt-dlp` de novo (refs Momani, Sahari, Edu) |
| `dist` + 49 `.DS_Store` | ~1 MB | build |

Ficaram de fora por decisão: `saga-fut-studio/node_modules` (272 MB) e
`saga-fut-studio/remotion/node_modules` (543 MB). São 815 MB que voltam com um `npm install`, mas
apagá-los derruba o studio até reinstalar.

## 3. Os slides do carrossel se reconstroem, e isso foi MEDIDO

Não confie na teoria aqui, porque ela erra em 13% dos casos. A prova: regerar os 159 slides dos 30
quadrinhos publicados num diretório temporário e comparar md5 com o publicado.

| resultado | slides |
|---|---|
| idêntico byte a byte | **132** |
| visualmente idêntico (PSNR 90 dB) | 6 |
| **diverge de verdade** | **21** |

**87% reconstroem fiel. Os 21 que não, divergem por quatro motivos, e nenhum deles é bug:**

- **Formato (8 slides).** `o-dia-guardanapo` foi publicado em 1080x1350 e `tubarao-nosso-ruim` em
  1080x1920. O `dimDoQuadrinho` devolve o 3:4 padrão, então a regeneração muda a proporção. Conserto:
  passar `formato` na chamada.
- **Carimbo (6 slides).** `o-dia-dani` saiu sem o "1/6". O carimbo de progresso é **parâmetro de
  export, não campo do JSON**, então regerar traz o carimbo de volta e não há no acervo o registro
  de que aquele post foi sem.
- **Texto editado depois (1 slide).** `o-dia-cores/slide-2` publicado diz "onde jogou Joan Gamper, o
  fundador do Barcelona"; o JSON hoje diz "onde Joan Gamper jogou". A arte é a mesma, a legenda não.
- **Deck de reação (4 slides).** `coringas-torcedor` troca o balão a cada post, e o JSON guarda só o
  último estado. Hoje o painel 1 tem `"sadasdasdads"` gravado, lixo de teste. Regerar publica isso.

Os 21 seguem no disco de propósito. **A lição que generaliza: o que decide se um derivado se
reconstrói não é o código que o gera, é se a ENTRADA dele ainda descreve o que foi publicado.**
Opção de export que não é persistida (formato, carimbo) e campo que é sobrescrito a cada uso
(o balão dos coringas) quebram a reconstrução sem quebrar nada no código.

### A ferramenta: `limpar-posts.mjs`

Nunca apague por lista escrita à mão, porque ela envelhece no primeiro quadrinho novo. O script
regera cada arquivo num tmp e **só apaga o que bate com o disco**: a prova e a exclusão são o mesmo
ato, então não há como divergirem. Sem `--apagar` ele roda em seco.

```bash
node scripts/limpar-posts.mjs                      # seco, só os publicados
node scripts/limpar-posts.mjs --todos              # seco, o acervo inteiro
node scripts/limpar-posts.mjs --so=o-dia-pickles   # um quadrinho
node scripts/limpar-posts.mjs --todos --apagar     # executa
```

O que não bater fica no disco e sai nomeado no relatório, com o número que sustenta o veredito
(`formato 1080x1350 -> 1080x1440`, `conteudo (delta 224, 0.575% dos canais)`). Duas coisas
deliberadas no desenho:

- **O mosaico é remontado e comparado, não inferido dos slides.** Ele sai por outro caminho
  (ffmpeg/xstack, noutro formato), e "os slides bateram" não é prova sobre ele. Medido: em
  `o-dia-guardanapo` os 6 slides divergiam por formato e o `mosaico-1x1` divergia em 90% dos canais,
  coisa que a inferência trataria igual.
- **`--tolerar-invisivel` existe mas não é o padrão.** Ele aceita diferença de até 2 níveis por
  canal em no máximo 0,5% dos canais, que é a assinatura do antialiasing de texto. Limiar não é
  prova, então quem afrouxa precisa dizer que afrouxou.

A trava contra apagar a fonte tem teste próprio, alimentado com os caminhos que ela precisa recusar:

```bash
node scripts/testes/limpar-posts.test.mjs   # "A TRAVA DO limpar-posts AINDA RECUSA"
```

Para regerar depois, com o studio de pé:

```bash
curl -s -X POST http://localhost:4600/api/render-quadrinho \
  -H 'Content-Type: application/json' -d '{"quadrinhoId":"o-dia-pickles"}'
```

## 4. O que ainda dá pra apagar

Rodado em seco no acervo inteiro (`--todos`) depois da limpeza de 15/08/2026: **333 arquivos, 689 MB
provados**, contra 48 arquivos e 98 MB que ficam por não reconstruírem. Nenhum caso de arte original
ausente.

| candidato | tamanho | ressalva |
|---|---|---|
| `posts/` de quadrinhos **não publicados** | **689 MB** | rode a ferramenta do §3, ela prova antes |
| `node_modules` (studio + remotion) | 815 MB | derruba o studio até `npm install` |
| 4 capas idênticas a um painel | 11 MB | de 12 capas, 4 são cópia byte a byte de `paineis/1.png` |

`saga-fut/_marca-futgibi/` (17 MB) **parece** duplicata de `futgibi/marca/_ilustracoes/` e não é: o
`gerar-ilustracao.mjs` grava nos dois de propósito, porque o studio só serve o que está sob
`CONTEUDO`. Apagar quebra a arte da marca na tela.

## 5. O `.git` é 5,5 GB e não encolhe fácil

Duas coisas que custaram tempo pra entender:

**Apagar arte versionada não reduz o `.git`.** Os 190 arquivos de `posts/` estavam commitados, então
a limpeza liberou 351 MB do working tree e zero do histórico. O lado bom é que isso é uma rede de
segurança real: qualquer slide volta exato com `git checkout -- <caminho>`, inclusive os 21 que a
regeneração não reproduz.

**O `git gc` não roda com o disco cheio, e falha sujo.** Ele escreve o pack novo (5 GB) ANTES de
apagar o velho, então precisa do dobro livre. Com 2,4 GB disponíveis ele estourou no meio e deixou
um `tmp_pack` de **2,35 GB** de lixo, que o `count-objects` reporta como `size-garbage` e ninguém
apaga sozinho:

```bash
git count-objects -vH                    # confira size-garbage antes e depois
rm -f .git/objects/pack/tmp_pack_*       # o que sobra de um gc interrompido
```

Há 570 MB em objetos soltos esperando empacotamento. Libere uns 10 GB na máquina primeiro, aí
`git gc --prune=now` passa. Encolher o histórico de verdade exige reescrita (`filter-repo`), que é
destrutivo e não foi feito.

## 6. Comandos do levantamento

```bash
du -sh */ | sort -rh                                     # por onde começar
git count-objects -vH                                    # o peso real do .git
git ls-files -z | xargs -0 du -sk | awk '{s+=$1} END {print s/1024" MB"}'   # quanto é versionado
find . -path ./.git -prune -o -name "*.mp4" -print       # mídia pesada (gitignored)
```

Para achar duplicata exata acima de 2 MB, que foi como as capas e o `_marca-futgibi` apareceram:

```bash
find saga-fut -type f -size +2M -not -path "*/node_modules/*" -print0 | xargs -0 md5 -r | sort | uniq -d -w32
```
