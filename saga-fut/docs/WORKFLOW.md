# Workflow de produção, SagaFut

Pipeline repetível por episódio. Siga as etapas na ordem; não avance com pendência na etapa anterior.

> **Erros já cometidos e a cura de cada um: [APRENDIZADOS.md](APRENDIZADOS.md)** (ler antes).

## Geração no studio (Fase 2, ATIVA para imagem)

O SagaFut Studio (`cd saga-fut-studio && npm run dev`, porta 4610) já gera **imagens**
sozinho, sem copy-paste:
- Botão **⚡ Gerar** em cada ficha e cada cena → roda `codex exec` (gpt-image-2 pela
  **assinatura ChatGPT Plus**, custo zero de API) e anexa as fichas dos personagens da
  cena como referência automaticamente. Requer `codex login` feito uma vez.
- **Fila em segundo plano, até 4 em paralelo** (bandeja no canto). Pode fechar o modal
  e seguir usando o studio; a imagem aparece sozinha ao terminar.
- **Regra de paralelismo:** cenas com 2 fichas de referência são lentas (~200s), rode
  no máx. **2 dessas** juntas; cenas de 1 ficha aguentam 4. (Detalhes em APRENDIZADOS.)
- Modal de confirmação avisa quando vai **substituir** uma imagem (a anterior vai pro
  backup automático, ver "Segurança de dados").
- **Vídeo (Grok) e narração (ElevenLabs) seguem manuais**, não há API boa de vídeo hoje.

## Estrutura de dados (fonte de verdade)

- **Fonte de verdade = `saga-fut/data/`**: `data/project.json` (global: projeto,
  ferramentas, audio, personagens, melhorias, `sagaOrder`) + `data/sagas/<id>.json`
  (uma por saga). O servidor monta/distribui sozinho (`readDados`/`writeDados`).
- Para mexer nos dados: use o studio, ou edite direto `data/project.json` /
  `data/sagas/<id>.json` (o servidor remonta na próxima leitura).
- Editar uma saga só reescreve o arquivo dela (isolamento; diffs de git limpos por saga).

## Segurança de dados (implementado no servidor)

- Antes de sobrescrever **imagem**, **rough-cut**, `data/project.json`, `data/sagas/*.json`
  ou o mirror, o servidor salva a versão anterior em
  `saga-fut/_backups/<arquivo>.<timestamp>` (mantém as últimas N). O save é
  **atômico** (tmp → rename) e **validado** (recusa payload sem projeto/personagens/sagas,
  ou saga sem id/episodios).
- **mp4/mp3 estão no `.gitignore`** (mídia pesada): os clipes do Grok e as narrações
  **não têm versão no git**. Faça backup próprio dessas pastas (cópia externa/nuvem)
  antes de mexidas grandes, é o único ponto ainda sem rede de proteção automática.

## Etapa 1, Roteiro
- Insumo: resultado real do último jogo + tabela evento→trama da [BIBLIA.md](BIBLIA.md).
- Escrever o roteiro em `data/sagas/<sagaId>.json` (cada cena: duração, narração,
  prompt de imagem, prompt de vídeo, restrições). O studio edita isso na aba Cenas;
  para uma saga do zero, use o `/nova-saga`.
- Regras de cena (aprendizados do ep-1 v1):
  - Máx. 3 personagens por cena, mais que isso a IA perde consistência.
  - 1 ação por cena. Cena com duas ações vira dois clipes.
  - **Narração cabe no clipe de 10s do Grok: ~20 palavras por cena** (o studio mostra o
    orçamento ≈Xs em verde/amarelo/vermelho abaixo de cada narração). Acima de ~13s a voz
    acelera e perde a gravidade; nesse caso, cortar o texto ou dividir a cena em 2 clipes.
    Ver [DIRETRIZES-NARRACAO.md](DIRETRIZES-NARRACAO.md) § Tamanho da narração por cena.
  - Toda cena tem lista de QUEM aparece e QUEM NÃO aparece.
  - Dona Copa só existe em sonhos. O rosto do Comendador nunca aparece (até o capítulo da revelação).
  - Nada de menores com álcool, nada de marcas reais (Adidas, FIFA, escudos oficiais).
  - **Gancho de abertura e de fechamento**: a 1ª frase do episódio abre uma pergunta
    na cabeça do espectador (3s decidem a retenção); a última deixa uma porta aberta
    (curiosidade pro próximo). Sem clickbait forçado, ver [DIRETRIZES-NARRACAO.md](DIRETRIZES-NARRACAO.md).
  - **A CENA 1 é a mais importante do episódio (regra fixa):** tem que prender de
    imediato. Escolher/criar uma cena 1 **dinâmica** (movimento, ação, tensão física)
    ou de **altíssima curiosidade** (uma imagem que faz perguntar "o que é isso?").
    NUNCA abrir com plano contemplativo/parado (personagem sentado, paisagem lenta).
    Se a melhor cena de contexto for calma, reordene: comece pela cena mais forte, ou
    crie um cold open de 1-2s com o momento de pico antes de voltar ao início.
- ✅ Sai da etapa quando: narração lida em voz alta fecha no tempo alvo (~45s).

## Etapa 2, Personagens (só se o episódio introduz personagem novo)
- Gerar ficha no ChatGPT Images / Nano Banana: 1 imagem canônica + 1 variação de expressão.
- Salvar em `personagens/<id>.png` (o botão ⚡ Gerar já faz isso). Essas imagens são o CÂNONE:
  toda cena nova anexa a ficha como referência, nunca descreve o personagem por texto.
- ✅ Sai da etapa quando: ficha aprovada e sem marcas registradas.

## Etapa 3, Imagens das cenas
- Para cada cena do roteiro: anexar as fichas dos personagens da cena + colar o prompt de imagem.
- Formato sempre 9:16. Salvar em `episodios/<sagaId>/<NN>/cenas/N.png` (o botão
  ⚡ Gerar já salva no caminho certo; o painel mostra qual é).
- Conferir contra o roteiro ANTES de animar: personagens certos? ninguém sobrando?
  expressão certa? sem marcas?
- ✅ Sai da etapa quando: as 4 imagens batem 100% com o roteiro.

## Etapa 4, Animação (image-to-video)
- Ferramentas: Grok Imagine (gera áudio junto), Kling / Hailuo (mudo, barato), 
  modo image-to-video, subir a imagem da cena (`cenas/N.png`).
- Prompt de vídeo SEMPRE nas 4 partes: CONTEXTO + AÇÃO + CÂMERA + RESTRIÇÕES
  (o que não pode acontecer: "never turns his face", "no new characters", etc.).
- Regras específicas do Grok (aprendizados do ep-01):
  - Ele CORTA para enquadramentos novos por conta própria → incluir sempre:
    `single continuous shot, no camera cuts, keep the exact same framing`.
  - Ele faz personagem FALAR (gera lábios + voz) → em episódio só-narrador incluir:
    `characters do not speak, mouths stay closed`. Vale também no **registro cômico**:
    ali as expressões e reações podem ser bem exageradas (cara de choque, comemoração
    boba), mas o lábio continua fechado; a piada falada vem da narração + balões de
    texto (ver DIRETRIZES-NARRACAO § Registro cômico).
  - Acessórios somem no meio do clipe (coroa, brinco) → citar no prompt o que
    deve permanecer: `he keeps his crown on at all times`.
  - O áudio do Grok NÃO é a narração: tratar como camada de ambiente. Na
    montagem, mutar por padrão e reaproveitar só trechos de ambiência
    (multidão, trovão) em volume baixo sob a narração do ElevenLabs.
  - Todo prompt do Grok termina com o bloco de áudio (adaptar os sons à cena):
    `AUDIO: only natural ambient sounds and sound effects, no voices, no
    narration, no dialogue, no music. Characters do not speak, mouths stay
    closed.`
    Motivo: sem isso o Grok inventa vozes/narração diferentes por cena; a
    unidade sonora vem da narração única do ElevenLabs gravada por cima.
- 1 cena = 1 clipe aprovado. Salvar como `episodios/<sagaId>/<NN>/cenas/N.mp4`, apagar variantes.
- Duração (Grok: 6 ou 10s): padrão 10s para cena com narração; 6s para hook/ação rápida.
  Sobra de 2-3s se resolve no CapCut: velocidade 0.85x, congelar quadro + zoom
  dramático (⚡) ou tela de texto no cliffhanger. NÃO usar "estender" por padrão, 
  cada extensão é nova chance de drift; se a cena pedir +10s, dividir em 2 clipes
  com enquadramentos diferentes e corte seco. Se estender mesmo assim, repetir
  TODAS as constraints no prompt da extensão (não são herdadas).
- ✅ Sai da etapa quando: cada clipe confere com narração + restrições.

## Etapa 5, Vozes e som
- ElevenLabs: voz FIXA do narrador (grave, dramática). Colar o bloco de narração do
  roteiro (já formatado com pausas "..."), baixar MP3 único ou por cena.
- Trilha da vinheta (Suno, gerada 1x, reusar sempre) + efeitos do Pixabay (trovão, sting).
- ✅ Sai da etapa quando: áudio da narração fecha no tempo do episódio.

## Publicação (padrão de todo episódio)
Todo episódio (em `data/sagas/<id>.json`) tem um bloco `publicacao` (visível na aba 📢 Publicar):
- `titulo`, gancho de capa/thumbnail (e título no YouTube Shorts).
- `tiktok` / `instagram` / `twitter`, texto pronto do post (legenda + hashtags),
  ajustado ao tom de cada rede (TikTok e IG com bloco de hashtags; X curto, ~280).
- `youtube`, `{ titulo, descricao }`. No Shorts o título é separado da descrição
  e pesa na busca (≤100 chars, com #Shorts no fim); as 3 primeiras hashtags da
  descrição aparecem acima do título. Agrupar a saga numa playlist.
- **Sempre "Parte X"** (aberto, SEM total tipo "/6" e SEM "FINAL") no início do
  `titulo`, de cada legenda E da descrição do YouTube. Sagas são abertas por padrão
, nunca fechar com "fim"; o card final é sempre "CONTINUA...". Isso deixa espaço
  para evoluções futuras da história.
- **Hashtag-marca #sagafut em TODOS os posts** (é o guarda-chuva do canal, sempre
  primeiro no bloco). Mais a **hashtag da saga** (ex.: #ogigantedonorte, agrupa as
  partes), o selo **#lendasdacopa**, a base **#futebol #copadomundo** e as tópicas
  do episódio (#haaland #noruega #brasil...). A marca nos posts é sempre SagaFut.
- Hashtags enxutas (~7 no TikTok, ~9 no IG, 2 no X). Evitar #fyp (não ajuda).
- CTA só nos tentpoles (parte 1, episódio-viral e final), pergunta que gera
  comentário, nunca "segue pra ver a parte 2". As partes do meio ficam limpas.
- **Nunca mencionar "IA" na comunicação da novela**, vende a história, não a ferramenta
  (o making-of "construindo com IA" é conta dev, outro público). Ver [ESTRATEGIA-REDES.md](ESTRATEGIA-REDES.md).
- **Crédito da trilha (obrigatório enquanto for CC-BY):** todo post com música do Kevin
  MacLeod leva uma linha na descrição: "Música: Kevin MacLeod (incompetech.com),
  Creative Commons BY 4.0". Ver [TRILHAS.md](TRILHAS.md).
- **Quando der, poste o capítulo que termina em suspense perto de um jogo real** (o jogo
  "responde" a história e cola a saga no assunto do momento). Ver [ESTRATEGIA-REDES.md](ESTRATEGIA-REDES.md).
- **Velocidade sobre perfeição (playbook 442oons):** manter um **banco de cenas e
  personagens já renderizados** pra montar um episódio-reação a um resultado real em horas,
  não dias (janela de ouro do newsjacking: 0 a 2h após o assunto estourar). Prender o
  calendário editorial aos jogos do Barça (Clásico, Champions, janela de transferência) e
  à Copa 2026. Ver [ESTRATEGIA-REDES.md](ESTRATEGIA-REDES.md) § Velocidade.
- Ao criar um episódio novo, preencher `publicacao` junto com o roteiro.

## Etapa 6, Montagem (CapCut) e publicação
1. Projeto 9:16, importar clipes na ordem do roteiro.
2. Narração por cima; cortar clipes no ritmo da voz.
3. Zoom dramático + trovão onde o roteiro marcar ⚡.
4. Legendas: o **"Montar" do studio já queima legendas** da narração (toggle ligado
   por padrão, com faixa opcional), sync aproximado. O CapCut fica só para sync
   palavra-a-palavra em episódios tentpole.
   - **Gancho de abertura (🪝, obrigatório):** no mesmo "Montar", preencher o `hookText`
     do episódio, texto grande sobre a 1ª cena nos ~3s iniciais (a retenção se decide
     aí; dado real: retenção média de 3-4s na 1ª saga). Ver DIRETRIZES-NARRACAO
     § Gancho VISUAL e [ESTRATEGIA-REDES.md](ESTRATEGIA-REDES.md).
   - **Legenda começa depois do hook:** o Montar segura a legenda da cena 1 até o hook
     sair (~2,8s), pra não competir com ele nos 3s iniciais (evita excesso de texto).
   - **Trilha musical (selecionável no Montar):** escolher a faixa pelo humor da saga/cena
     (ver [TRILHAS.md](TRILHAS.md)); entra em volume baixo sob a narração. Som é uma das
     maiores alavancas de retenção.
5. Vinheta após o hook; trilha de fundo a ~20% de volume.
6. Tela final: card **curto** (~1,3s) "CONTINUA..." + cliffhanger. Não deixar segundos de
   tela preta morta no fim (mata o último segundo e o loop).
7. Exportar 1080x1920 30fps → publicar TikTok (série/playlist) → repostar Reels/Shorts.
   Estratégia por rede, cadência e checklist de publicação: [ESTRATEGIA-REDES.md](ESTRATEGIA-REDES.md).

## Regras de narração (v3)
- **Clareza acima de tudo: ver [DIRETRIZES-NARRACAO.md](DIRETRIZES-NARRACAO.md)**
  (ler ANTES de escrever roteiro, evita frase rebuscada/invertida/críptica que
  não cai de primeira na narração rápida).
- Cada cena: **alvo ~20 palavras (≈10s), pra caber no clipe do Grok sem acelerar a voz**.
  Até ~13s ainda passa (voz acelera um pouco, evitar); acima disso, enxugar ou dividir a
  cena em 2 clipes. Ver DIRETRIZES-NARRACAO § Tamanho da narração por cena.
- SEM CTA falado de continuação ("capítulo 2 amanhã", "segue pra ver a parte 2").
  A continuação é indicada só por um **selo discreto de texto no fim do vídeo**
  ("CONTINUA" / "A SAGA CONTINUA"), nunca na voz do narrador.

## Como montar um prompt (template + o que cada erro exige)

**Regra-chave:** os desvios NÃO se resolvem com prompt mais longo (prompt longo até
piora a imagem). Resolvem-se com PADRÃO + ÂNCORA. Categorias de erro e a cura certa:

| Tipo de desvio | Cura (não é "mais texto") |
|---|---|
| Modelo improvisa (corta câmera, faz falar, some acessório) | Bloco de RESTRIÇÕES fixo (negativos) |
| Marca real / escudo / nome escrito | Bloco de negativos (regras da casa) |
| Personagem/estilo muda entre cenas (cabelo, rosto) | ÂNCORA: anexar a ficha + "same style as other scenes" |
| Movimento morto (ação acontece 1x e para) | Descrever ação CONTÍNUA: "repeatedly, throughout the clip" |
| Contradição de história (TV/roupa/tempo) | Revisão de continuidade, nenhum prompt resolve |

**Template de imagem:** `[prefixo de estilo da saga]` + SUJEITO (quem + âncoras:
cabelo, marcas) + AÇÃO/POSE + CENÁRIO + ENQUADRAMENTO (9:16) + `[regras da casa]`.
As "regras da casa" (negativos globais) ficam em `data/project.json > projeto.promptRules`
e o painel anexa sozinho ao copiar. SEMPRE anexar a ficha do personagem como imagem
de referência, é a âncora que os negativos não substituem.

**Template de vídeo:** CONTEXTO + AÇÃO (contínua, com duração: "the whole clip",
"repeatedly") + CÂMERA + RESTRIÇÕES (negativas: "never turns, no new characters,
does not speak") + AUDIO. Já embutido nos prompts de cena (em `data/sagas/<id>.json`).

## Convenções
Regra única: **o id da saga é uma alça curta** (`aranha`, `gigante`, não
`a-aranha-e-a-catedral`), o id do episódio é `<sagaId>-<NN>`, e a pasta dele é
`episodios/<sagaId>/<NN>`. O título completo vive no campo `titulo`, não no id.
Quem manda é `saga-fut-studio/shared/caminhos.mjs`, nada monta caminho na mão.

- `data/`, a fonte de verdade: `project.json` (pool de personagens, estilos, ordem)
  + `sagas/<sagaId>.json` + `quadrinhos/<quadId>.json`. O roteiro mora aqui, não
  num `.md` por episódio.
- `episodios/<sagaId>/<NN>/cenas/N.png|mp4`, 1 imagem + 1 clipe aprovado por cena.
- `episodios/<sagaId>/<NN>/audio/N.mp3`, narração por cena (ElevenLabs).
- `episodios/<sagaId>/<NN>/rough-cut.mp4`, o rascunho montado pelo studio.
- `personagens/<id>.png`, fichas canônicas (nunca sobrescrever; nova versão = novo arquivo).
- `quadrinhos/<quadId>/paineis/N.png`, arte de cada painel.
- `assets/`, vinheta, trilha, efeitos sonoros (reusáveis entre episódios).
- `docs/`, esta documentação.

O id não muda depois sem migrar arquivo na mão, então o studio pergunta por ele
na criação (botão ＋ Nova saga) em vez de inventar um.
