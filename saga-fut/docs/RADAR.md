# Radar de Pautas (ideação de quadrinhos)

Mecanismo pra sair da folha em branco. Faz uma varredura recorrente do noticiário de
futebol (foco Barça), cruza com o elenco e os quadrinhos que já existem, e cospe uma
lista rankeada de ganchos de piada candidatos, prontos pra virar quadrinho.

> Leia junto: [QUADRINHOS.md](QUADRINHOS.md) (como um quadrinho vira arte) e
> [PESQUISA-VIRALIZACAO.md](PESQUISA-VIRALIZACAO.md) (de onde vem o padrão de confiança).

A pesquisa é automatizável. A decisão do que vira quadrinho continua sua. O Radar te dá
repertório e timing, não substitui a curadoria.

---

## 1. Como roda

Duas peças, na mesma pasta de dados de sempre:

1. **Coleta** grava um snapshot datado em `data/radar/<AAAA-MM-DD>.json` (achados brutos,
   por beat, com fonte e tag de confiança).
2. **Pautas** cruza o snapshot com `project.json` (elenco + `quadrinhoOrder`) e grava os
   candidatos rankeados em `data/pautas.json`.

No MVP as duas peças são rodadas por um agente (Claude com WebSearch), seguindo este doc
como roteiro. Depois isso pode virar um scheduled task (ver §6) e ganhar uma aba no studio.

---

## 2. Os beats (o que a varredura procura)

A busca NÃO é livre. Ela cobre quatro beats fixos. Timing é rei: em pauta de futebol,
uma notícia de 3 dias atrás já é véspera de morta, então todo achado leva `data_fato`.

| beat          | o que caçar                                                                 |
|---------------|------------------------------------------------------------------------------|
| `barca_agora` | último jogo, lesão, mercado (quem chega/sai), declaração, La Masia, atuação individual |
| `competicao`  | posição na tabela, próximo jogo, clássico chegando, fase de Champions, calendário |
| `trending`    | polêmica de arbitragem, viral do fim de semana, rival tropeçando, meme do momento |
| `humor_ref`   | o que Falha de Cobertura e afins fizeram na semana, e sobretudo QUAL mecânica usaram |

**Sobre o `humor_ref`:** cataloga a *mecânica cômica* (legenda irônica sobre foto,
contraste expectativa vs realidade, deadpan, personagem-tipo levado ao extremo), nunca o
conteúdo. É repertório de formato, não cópia de piada.

---

## 3. Schema do snapshot (`data/radar/<data>.json`)

```jsonc
{
  "data": "2026-07-20",            // dia da varredura (= nome do arquivo)
  "gerado_por": "varredura assistida (MVP)",
  "beats": {
    "barca_agora": [ /* achados */ ],
    "competicao":  [ /* achados */ ],
    "trending":    [ /* achados */ ],
    "humor_ref":   [ /* achados */ ]
  }
}
```

Cada achado:

```jsonc
{
  "id": "espanha-campea-copa",      // kebab-case, único no snapshot
  "resumo": "Espanha campeã da Copa, Ferran herói",   // uma linha
  "detalhe": "Ferran marcou aos 106' na prorrogação, 1x0 na Argentina do Messi...",
  "data_fato": "2026-07-15",        // quando o fato aconteceu (pode ser != data da varredura)
  "confianca": "✓",                 // ✓ verificado | ~ indício forte (mesma legenda da PESQUISA)
  "fontes": ["https://..."],        // 1+ URL
  "ganchos": ["o sonho do Ferran realizou de vez", "..."]  // sementes de piada, opcional
}
```

Legenda de confiança (igual [PESQUISA-VIRALIZACAO.md](PESQUISA-VIRALIZACAO.md)):
`✓` verificado (fonte firme, fato consolidado), `~` indício forte (pista, ainda esquentando).

---

## 4. Schema da pauta (`data/pautas.json`)

Um array de candidatos, ordenado por `score` (maior primeiro).

```jsonc
{
  "id": "sonho-do-ferran-2",        // kebab-case; vira o id/pasta do quadrinho se aprovado
  "origem": ["espanha-campea-copa"],// ids de achado que geraram a pauta (rastreio)
  "gancho": "O sonho do Ferran nao era so jogar a Copa, era decidir a Copa",
  "mecanica": "callback: o quadrinho antigo mostrava o sonho; este mostra o sonho superado",
  "tipo": "tirinha",                // charge | tirinha | carrossel
  "selo": "Copa 2026",
  "elenco": ["ferran-...", "lamini-riso"],  // SÓ ids que existem no project.json
  "timing": "quente",               // quente | morno | evergreen
  "score": 9.2,                     // ver §5
  "dedup": "expande sonho-do-ferran (nao repete: la era o sonho, aqui e a consequencia)",
  "risco": ""                       // aviso se encosta em quadrinho existente
}
```

Regra dura: **`elenco` só usa personagem que existe** no `project.json`. Se a melhor piada
pede um personagem que você não tem (ex.: um reforço novo), a pauta anota isso em `risco`
("precisa criar ficha do X") em vez de inventar um id.

As regras da casa entram na pauta já resolvidas: apelido nas falas (nunca o nome),
[número real na camisa](../docs), formato 3:4 por padrão.

---

## 5. Ranking (como sai o `score`, 0 a 10)

Soma simples de quatro eixos (peso igual, 2.5 cada), pra ser explicável:

1. **Timing**: `quente` (fato de dias) > `morno` > `evergreen`.
2. **Fit de elenco**: a piada fecha só com personagem que já existe? (nada a criar = nota cheia)
3. **Potencial de humor**: tem contraste/virada clara, ou é só notícia narrada?
4. **Retenção**: bate os padrões da casa (gancho de identidade culé, lacuna de curiosidade,
   caricatura reconhecível no 1º frame). Ver [ESTRATEGIA-REDES.md](ESTRATEGIA-REDES.md).

Não é ciência exata, é um ordenador honesto. O topo da lista é sugestão, não ordem.

---

## 6. Dedup (não sugerir o que já foi feito)

Antes de fechar a lista, cruzar cada pauta com o `quadrinhoOrder` do `project.json` e com o
`contexto` dos quadrinhos existentes. Três saídas possíveis:

- **nova**: tema/gancho inédito. Segue.
- **expande**: mesmo universo de um quadrinho existente, mas ângulo novo (callback, sequência).
  Vale, e a pauta aponta o pai em `dedup`.
- **repete**: mesma piada de algo já feito. Corta, ou anota em `risco` por que não é repetição.

---

## 7. Cadência (quando rodar, depois de virar automático)

- **Toda segunda** (pós-rodada): varredura cheia dos quatro beats.
- **Véspera de clássico / jogo grande**: varredura só de `barca_agora` + `competicao`.
- **Janela de transferências**: vale um pulso extra, o mercado rende piada.

Fora de temporada (junho/julho) o beat que mais rende é `barca_agora` (mercado) e eventos
grandes (Copa, Euro). Meio de temporada, `competicao` e `trending` sobem.
