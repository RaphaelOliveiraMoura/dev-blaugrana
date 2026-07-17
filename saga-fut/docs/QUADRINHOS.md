# Como criar um quadrinho (charge / tirinha / carrossel)

Guia completo pra montar um quadrinho do SagaFut do zero, pensado pra que um agente de
IA (ou o Raphael) se contextualize sem ter que ler o código do studio. Cada regra aqui
vem de um comportamento real do gerador; onde dá, aponto o arquivo que manda naquilo.

> Leia junto: [WORKFLOW.md](WORKFLOW.md) (pipeline geral) e [APRENDIZADOS.md](APRENDIZADOS.md)
> (erros já cometidos e a cura). As regras de personagem/traço valem igual pra quadrinho.

---

## 1. O que é um quadrinho, e onde ele mora

Um quadrinho é uma arte estática de painel(is) pra postar no feed. Três tipos
(`saga-fut-studio/src/lib/formatos.js`):

| tipo        | painéis | uso                                             |
|-------------|---------|-------------------------------------------------|
| `charge`    | 1       | piada de quadro único, personagem em pé + cenário |
| `tirinha`   | 2 a 4   | piada com setup + punchline, precisa de beats    |
| `carrossel` | 6 a 10  | história mais longa, um slide por painel         |

**Fonte de verdade = `saga-fut/data/`.** Cada quadrinho é UM arquivo:
`data/quadrinhos/<id>.json`. O global (`data/project.json`) guarda os personagens, os
estilos e a ORDEM dos quadrinhos (`quadrinhoOrder`). O servidor do studio lê e remonta
sozinho (`readDados`/`writeDados` em `saga-fut-studio/server/store.mjs`).

Pra criar: use o studio (porta 4610), ou escreva o `.json` na mão e adicione o `id` ao
`quadrinhoOrder` do `project.json`. As duas formas são equivalentes; o servidor remonta
na próxima leitura.

Arte de cada painel: `saga-fut/quadrinhos/<id>/paineis/<numero>.png`
(regra em `saga-fut-studio/shared/caminhos.mjs`). Crie a pasta `paineis/` antes de gerar.

---

## 2. Anatomia do JSON (o schema real)

### Campos do quadrinho

```jsonc
{
  "id": "canto-certo",          // kebab-case, único, = nome do arquivo
  "titulo": "O canto certo",
  "tipo": "tirinha",            // charge | tirinha | carrossel
  "selo": "Zoeira da Copa",     // rótulo editorial (livre)
  "status": "roteiro",          // roteiro | (seu fluxo) — controle interno
  "estiloId": "rabisco-riso",   // id de um estilo do catálogo (project.json > estilos)
  "estiloExtra": "",            // detalhe de arte somado ao estilo base (opcional)
  "formato": "3:4",             // 3:4 | 4:5 | 1:1 | 9:16  (padrão 3:4, ver §3)
  "cenarioFixo": false,         // true = painéis 2+ herdam o cenário do painel 1 (ver §6)
  "elenco": ["goleiro-...", "bappe-riso"],  // ids de personagem; TODOS entram em TODO painel (ver §5)
  "contexto": "...",            // nota interna: o gancho da piada, a mecânica, as manhas
  "legenda": "...",             // legenda-mãe do post
  "paineis": [ /* ver abaixo */ ],
  "publicacao": {               // textos por rede (opcional, preenche depois)
    "titulo": "...",
    "tiktok": "...", "instagram": "...", "twitter": "...",
    "youtube": { "titulo": "", "descricao": "" }
  }
}
```

Não guarde `stylePrefix` no quadrinho quando usar `estiloId`: o servidor resolve
`estiloId + estiloExtra` pro prefixo de estilo em memória, no load, e remove o cache ao
salvar (`resolverEstilo`/`semEstiloResolvido` em `store.mjs`). Só use `stylePrefix` (e
deixe `estiloId` vazio) pra um estilo próprio, fora do catálogo.

### Campos de cada painel (`paineis[]`)

```jsonc
{
  "numero": 1,                  // inteiro; define a ordem e é a chave do painel
  "roteiro": "...",             // descrição da cena em PT-BR: nota humana, NÃO vai no prompt
  "falas": [                    // viram balões automaticamente (ver §7)
    { "personagem": "bappe-riso", "texto": "PODE PULAR NESSE CANTO." }
  ],
  "promptImagem": "...",        // o prompt EM INGLÊS que gera a arte (ver §8)
  "imagem": "quadrinhos/canto-certo/paineis/1.png",  // caminho relativo a saga-fut/
  "herdaCenarioDe": 1,          // OPCIONAL: nº do painel-âncora de cenário (ver §6). Só no JSON.
  "status": "pendente"          // pendente | (seu fluxo)
}
```

Ponto importante: `roteiro` é pra humano, `promptImagem` é o que o gerador recebe. Não
confie no `roteiro` pra puxar detalhe de arte, ele é ignorado na geração.

---

## 3. Tamanho e proporção (a parte que mais deu dor de cabeça)

**O padrão é `3:4` (retrato).** Definido em 16/07/2026: a charge é imagem estática com
personagem em pé + cenário, e no retrato a cena respira; o quadrado (`1:1`) espremia e
ficou ruim no feed. Set sem perguntar (é regra da casa, ver memória "Formato 3:4").

Cada formato tem um tamanho EXATO em pixels, fonte única em `DIM`
(`saga-fut-studio/server/prompts.mjs`):

| formato | pixels      | texto de orientação          |
|---------|-------------|------------------------------|
| `3:4`   | 1152 x 1536 | Portrait vertical (3:4)      |
| `4:5`   | 1024 x 1280 | Portrait vertical (4:5)      |
| `1:1`   | 1024 x 1024 | Square (1:1)                 |
| `9:16`  | 1024 x 1820 | Tall vertical (9:16)         |

**Por que pixel e não só proporção:** proporção o modelo interpreta, e o mesmo formato
saía de 971x1619 a 1254x1254 num único lote. Então o tamanho entra de duas formas que
nunca divergem porque saem do mesmo `DIM`:

1. **O prompt PEDE o tamanho** (`orientText`): "the PNG must be exactly 1152 x 1536
   pixels. Never any other size."
2. **Uma trava GARANTE o tamanho depois de gerar** (`normalizarImagem`, via ffmpeg no
   generate): formatos que o gpt-image não gera de fábrica (3:4, 4:5) derivavam mesmo
   pedindo pixel, então a normalização fecha isso de vez.

**Isso vale SÓ pra quadrinho.** Ficha de personagem e cena de saga seguem em 1024x1536
(2:3) e NÃO passam pela trava: a cena vira vídeo 9:16 e sai de propósito ora 2:3 ora mais
alta; forçar tamanho cortaria a altura do vídeo. Padronizar tamanho é problema de
quadrinho (post de imagem estática), não de saga.

Consequência prática: **não escreva o tamanho no `promptImagem`.** O servidor injeta a
orientação certa a partir do `formato`. Escrever "1080x1350" no prompt só conflita.

---

## 4. Estilo (traço)

- `estiloId` aponta pra um estilo do catálogo (`project.json > estilos`). O do meme é
  `rabisco-riso`. No load o servidor monta `stylePrefix = estilo.stylePrefix + estiloExtra`.
- `estiloExtra` é um detalhe de arte SÓ deste quadrinho, somado ao estilo base. (No nível
  do PERSONAGEM, a ficha tem o próprio `estiloExtra`: é lá que mora, p.ex., "este é o
  magro" do Bappé, que vence o cânone que engorda todo mundo.)
- Se o estilo tem uma imagem de traço em disco (`estilos/<id>.png`), ela é anexada como
  **referência de estilo** na geração da FICHA (não do painel). No painel, quem carrega
  o traço é a ficha pronta do personagem.
- O prompt final do painel já começa com o `stylePrefix`. **Não repita o cânone do estilo
  no `promptImagem`** (não descreva "crude lazy meme webcomic, big head..."); isso já entra.

---

## 5. Elenco e fichas de personagem (a limitação que mais pega)

O `elenco` é uma lista de ids de personagem. Na geração de CADA painel, o servidor anexa
como referência as fichas de **todos** os personagens do elenco que já têm imagem em
disco (`fichasExistentes(q.elenco, ...)` em `prompts.mjs`). Cada ficha entra com o papel
`personagem`: "mantenha a IDENTIDADE (rosto, cabelo, roupa, número), mas NÃO copie a pose
neutra nem a expressão da ficha; emoção e ângulo vêm da cena".

**Não existe elenco por painel.** O elenco é global do quadrinho e vai inteiro em todos
os painéis. Isso importa quando:

- **um coadjuvante só aparece num painel:** ele ainda é anexado nos outros. Mitigação: o
  `promptImagem` de cada painel cita SÓ quem está naquela cena; o modelo tende a desenhar
  só quem o texto descreve. Cite os ausentes só pra excluir ("the striker is NOT in this
  panel") quando houver risco.
- **o mesmo personagem troca de figurino** (ex.: Bappé jogador → Bappé ditador, que são
  DUAS fichas do mesmo rosto): as duas fichas entram no mesmo painel e podem se misturar.
  Mitigação: crave o figurino no prompt do painel de forma enfática ("wearing the FULL
  dictator uniform, NOT a football jersey").

Regras da casa que vêm das memórias/aprendizados e valem em todo elenco:

- **Número na camisa:** personagem baseado em jogador real leva SEMPRE o número real dele
  (dá o reconhecimento sem citar o nome). Está na ficha; o prompt do painel deve manter.
- **Sem semelhança com pessoa real** onde a ficha pede (ex.: "O Goleiro" é genérico, o
  número 16 é o aceno). Não force rosto de pessoa real.
- Fichas são anexadas só se **já existem em disco**. Gere as fichas do elenco ANTES dos
  painéis, senão o painel vai sem âncora e o personagem varia.

---

## 6. Dependência de cenário entre painéis (as duas formas)

O problema: cada painel é uma geração isolada, e o servidor só ancora os PERSONAGENS (as
fichas), nunca o cenário. Então tudo que não estiver cravado varia (fundo, enquadramento,
lado em que cada um está). A cura é anexar um **painel-âncora** como referência de
cenário, com o papel `cenario`: "copie o SET, o enquadramento, as POSIÇÕES esquerda/
direita e cada prop exatamente como no painel-âncora; NÃO espelhe; a ÚNICA coisa que muda
é o gesto/expressão deste painel". É a mesma ideia da ficha, mas pro set.

A resolução de qual painel é o âncora vive em `saga-fut-studio/shared/cenario.mjs`
(`numeroAncoraCenario`), usada igual pelo servidor e pelo front. **Precedência:**

1. **`painel.herdaCenarioDe`** (inteiro, por painel) — âncora explícita. Permite GRUPOS de
   cenário numa tira que troca de set. **Só existe no JSON**, não há editor no studio.
2. **`quadrinho.cenarioFixo`** (booleano, global) — a tira inteira herda do 1º painel.
   Tem checkbox no studio ("Cenário fixo entre painéis").

Um painel nunca herda de si mesmo, e o âncora tem que existir na tira.

### Quando usar cada uma

- **`cenarioFixo: true`** → todos os painéis 2+ herdam do painel 1. Use quando a tira toda
  é a MESMA câmera travada com o mesmo set (ex.: `mesa-tempo`, estúdio de TV parado nos 3
  quadros, só muda o gesto). Simples, é um clique.
- **`herdaCenarioDe: N` por painel** (com `cenarioFixo: false`) → controle fino. Use quando
  a tira TROCA de set no meio. Exemplo real, `canto-certo`:
  - painel 1: câmera de pênalti (goleiro ao fundo, batedor na marca, craque na frente) — é o âncora.
  - painel 2: `"herdaCenarioDe": 1` → mesma câmera, muda só a ação (o chute, o gol).
  - painel 3: set próprio (beira do campo, craque fardado) → sem herança.

  Se eu usasse `cenarioFixo: true` aqui, o painel 3 herdaria o pênalti errado. Por isso a
  herança fica explícita só no painel 2.

### Por que âncora ÚNICA e não cadeia (2 herda de 1, 3 herda de 2)

Cada geração introduz uma variaçãozinha; herdar do vizinho ACUMULA drift painel a painel
(o mesmo motivo pelo qual não se "estende" vídeo). Todos herdam de UM âncora, então não há
acúmulo, e depois do âncora pronto os outros painéis rodam em paralelo.

### Regra de disco: gere o âncora ANTES

O servidor só anexa o âncora se a imagem dele **já existe em disco** (`refDeCenario`). Se o
âncora ainda não foi gerado, o painel dependente cai no comportamento antigo (sem
herança). Então: **gere o painel-âncora (o 1) primeiro; depois os que dependem dele.** O
studio mostra "herda o cenário do painel X" pra lembrar.

---

## 7. Falas → balões (a IA desenha os balões)

Cada item de `falas` com `texto` não-vazio vira instrução de balão no prompt
(`falasComoBaloes` em `prompts.mjs`):

- `personagem` é um id do elenco → `Nome says in a comic speech balloon: "texto"`.
- `personagem` vazio ou id que não é personagem → `a caption box reads: "texto"` (use pra
  narração/legenda dentro do quadro).
- `falas: []` (ou textos vazios) → **painel mudo**, sem balão. Válido e útil (ex.: o quadro
  do gol em `canto-certo` é mudo, a imagem conta tudo).

Regras da casa pras falas:

- **Diálogo sem nomes:** personagens NÃO se chamam pelo nome nas falas (soa expositivo).
  Use interjeição ("peraí") pro gancho. (memória "Diálogo sem nomes".)
- **CAIXA ALTA e curto:** o traço chapado borra texto pequeno; balão pede pouca palavra.
- Texto some/embaralha se longo. Uma ideia por balão.

---

## 8. Escrevendo o `promptImagem` (checklist)

O servidor monta o prompt final assim (`comporPrompt`, tipo `painel`):

```
<stylePrefix>, comic panel. <promptImagem>. <falas como balões>

<quadrinhoRules>
```

e anexa as referências nesta ordem: **fichas do elenco, depois o cenário-âncora por
ÚLTIMO** (o mais fresco manda mais no set). `quadrinhoRules` (regra da casa, definida em
`project.json > projeto.quadrinhoRules`; o `QUAD_RULES_PADRAO` de `config.mjs` é só
fallback quando o projeto não define a sua) já injeta: balões limpos só pra falas dadas
(senão painel MUDO), faces expressivas, **sem logo de marca, sem escudo oficial, estrela
dourada lisa no lugar, manter cada personagem igual à ficha**, e o **BRAND FRAMING**:
moldura preta fechada com cantos arredondados nos 4 lados + margem de papel creme + selo
circular com estrela dourada inteiro no canto superior direito.

Isso significa que a **moldura e o selo são automáticos**: NÃO peça no `promptImagem`.
Aprendizado (16/07/2026): a regra do BRAND FRAMING existia mas era fraca, e o modelo a
ignorava em parte das gerações (o quadrinho `irmao-golfe` saiu com 3 painéis sem moldura
fechada, sangrando no topo/base e cortando o selo, e 1 painel certo). A cura foi ENDURECER
o texto da regra (dizer "closed frame on ALL FOUR sides", "must NOT bleed", "star NEVER
cropped") e regerar os painéis. Se um painel sair sem a moldura, o conserto é regerar (a
moldura é decidida a cada geração, não é herdada pelo cenário-âncora), e se voltar a
falhar, reforçar o `quadrinhoRules`.

Então, ao escrever o `promptImagem`:

- **Em inglês.** É o que o gerador espera; todos os painéis do pool são em inglês.
- **Não repita** o cânone do estilo (§4) nem o tamanho em pixels (§3). Já entram.
- **Descreva só quem está na cena** e crave figurino + número da camisa de cada um.
- **Fixe as posições em "VIEWER'S LEFT / RIGHT".** O lado é a informação mais frágil na
  herança de cenário; escreva sempre do ponto de vista de quem olha.
- **Proíba explicitamente** o que o modelo faz sozinho e você não quer: batedor
  comemorando ("NOT celebrating"), acessório sumindo ("GLOVES ON BOTH HANDS"), espelhar o
  set herdado ("do NOT mirror or flip").
- **Painel que herda cenário:** comece reafirmando o set do âncora e diga que a ÚNICA
  mudança é a ação. Padrão que funciona (de `mesa-tempo`/`canto-certo`):
  > "Reuse the EXACT SAME set as the scene reference image and do NOT mirror or flip it:
  > [quem está onde]. ACTION (the ONLY change from the reference): [o gesto novo]."
- **Emoção vem da cena, não da ficha.** A ficha é neutra de propósito; o arco do
  personagem (certeza → indignação → autoridade) mora nos prompts dos painéis.

---

## 9. Fluxo de criação, do zero ao gerado

1. **Defina a piada** e quebre em beats → decide o `tipo` (charge/tirinha/carrossel) e o
   nº de painéis. Cada beat que precisa de respiro é um painel.
2. **Escolha o elenco** entre os personagens existentes (`project.json > personagens`).
   Personagem novo é outra história: cria ficha primeiro (é referência dos painéis).
3. **Escreva o JSON** em `data/quadrinhos/<id>.json` seguindo o schema (§2). Decida
   `cenarioFixo` vs `herdaCenarioDe` (§6) e `formato` (§3, default 3:4).
4. **Registre no índice:** adicione o `id` ao `quadrinhoOrder` em `project.json`.
5. **Crie a pasta** `saga-fut/quadrinhos/<id>/paineis/`.
6. **Gere as fichas do elenco** que ainda não têm imagem (senão o painel vai sem âncora).
7. **Gere os painéis na ordem certa:** o painel-âncora de cenário PRIMEIRO, depois os
   dependentes (§6, regra de disco). Painéis com 2+ fichas de referência são lentos
   (~200s): rode no máx. 2 juntos (ver APRENDIZADOS/WORKFLOW).
8. **Revise a arte** contra os registros (número certo, figurino, lado, luvas, deadpan...)
   e regenere o que saiu torto, ajustando o prompt.
9. **Preencha `publicacao`** e monte os posts (mosaico/carrossel/vídeo) na seção do studio.

---

## 10. Checklist rápido de sanidade

- [ ] `id` kebab-case, igual ao nome do arquivo, e presente no `quadrinhoOrder`.
- [ ] `formato` setado (3:4 salvo bom motivo). Nenhum tamanho em pixels no prompt.
- [ ] `estiloId` do catálogo; sem `stylePrefix` guardado à toa.
- [ ] `elenco` só com quem aparece; ciente de que todos entram em todo painel.
- [ ] Números de camisa reais e figurino cravados no prompt de cada painel.
- [ ] Dependência de cenário resolvida: `cenarioFixo` (câmera travada) OU `herdaCenarioDe`
      (troca de set). Âncora gerado antes dos dependentes.
- [ ] `promptImagem` em inglês, posições em VIEWER'S LEFT/RIGHT, proibições explícitas.
- [ ] Falas em CAIXA ALTA, curtas, sem os personagens se chamarem pelo nome.
- [ ] Pasta `quadrinhos/<id>/paineis/` criada; `imagem` de cada painel apontando pra ela.
- [ ] JSON válido (`python3 -c "import json; json.load(open(...))"`), sem travessão no texto.

---

## Referências de código (quando precisar do detalhe exato)

- Montagem do prompt, tamanhos (`DIM`), papéis das referências:
  `saga-fut-studio/server/prompts.mjs`
- Resolução do painel-âncora de cenário: `saga-fut-studio/shared/cenario.mjs`
- Caminhos de arquivo (painel, ficha, posts): `saga-fut-studio/shared/caminhos.mjs`
- Regras da casa e diretórios: `saga-fut-studio/server/config.mjs`
- Resolução de estilo no load/save: `saga-fut-studio/server/store.mjs`
- Tipos e formatos (UI): `saga-fut-studio/src/lib/formatos.js`
- Exemplo completo e comentado no `contexto`: `data/quadrinhos/canto-certo.json`
