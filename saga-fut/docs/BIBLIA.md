# Bíblia, SagaFut (universo de sagas de futebol em IA)

Curtas dramáticas de futebol para TikTok/Reels/Shorts. **Quem escreve o roteiro é
a vida real.** Caricaturas 3D (estilo Pixar) **reconhecíveis** de jogadores reais,
com nomes/marcas evitados (estrela dourada no lugar de escudos), narradas por uma
voz fixa e épica.

> Esta é a bíblia do **universo** (vale para TODAS as sagas). O específico de cada
> saga (premissa, elenco, estilo visual, episódios) vive em `data/sagas/<id>.json` e é
> editado pelo **SagaFut Studio**. Leia também:
> [WORKFLOW.md](WORKFLOW.md) (produção) · [DIRETRIZES-NARRACAO.md](DIRETRIZES-NARRACAO.md)
> (texto) · [APRENDIZADOS.md](APRENDIZADOS.md) (erros → curas, não repetir) ·
> [ESTRATEGIA-REDES.md](ESTRATEGIA-REDES.md) (distribuição e alcance).

## Princípio nº 1: o teste do scroll

Em meio segundo de feed o espectador precisa entender: **"é futebol, e eu reconheço
esse personagem/essa história"**. Todo personagem e cenário grita FUTEBOL (uniforme,
estádio, vestiário, gramado). Se uma cena não passa no teste do scroll, ela volta.

## Os dois tipos de saga

1. **Retrospectiva (selo "Lendas da Copa").** História REAL já encerrada, contada
   como lenda. Produção em lote (não depende de resultado futuro), formato maratona
   (1 capítulo/dia). Ex.: **O Gigante do Norte** (Halland/Noruega na Copa 2026).
2. **Mercado / ao vivo (selo "Mercado da Bola").** A trama acompanha um enredo
   real EM ANDAMENTO (transferência, temporada). Cada capítulo fecha antes de um
   fato real e o próximo resolve. Mais viciante, mais arriscado (produz reagindo à
   notícia). Ex.: **A Aranha e a Catedral** (Julián Álvarez → Barcelona).

Sagas do universo se interligam: o **pool global de personagens** (`personagens[]`)
permite reusar um personagem em outra saga (ex.: o `halland` aparece como "a sombra
do gigante" na saga da Aranha). Isso marca "🔗 também em: ..." no studio e é um
gancho de fãs.

## Os dois registros (o tom da saga)

Além do TIPO (retrospectiva/ao vivo), toda saga escolhe um REGISTRO. O pipeline é o
mesmo; muda só o tom da narração, o estilo visual e os prompts:

1. **Épico, lenda (o registro-fundador).** Narração grave e reverente, drama mítico,
   luz cinematográfica, motivos simbólicos. Ex.: O Gigante do Norte, A Aranha e a
   Catedral, O Batismo do 10. Público: emocional e nostálgico.
2. **Cômico, rivalidade (registro adulto, motor de crescimento).** Humor, deboche,
   provocação de torcida, reação ao jogo real e ao mercado. Timing de piada: o setup
   nos 3s, a punchline (reviravolta) no fim. Mesma caricatura reconhecível, mas
   expressões EXAGERADAS (meme), luz viva de "sitcom", cenas de situação, não épicas.
   Público: torcedor ADULTO, que compartilha por rivalidade e comenta. Usa **selo
   próprio** (ex.: "Zoeira" ou "Resenha da Rodada") pra não confundir com as
   sagas-lenda. Como escrever: DIRETRIZES-NARRACAO § Registro cômico.

**Regra da provocação (registro cômico):** provocação SEMPRE leve e celebratória
(orgulho de torcida, zoeira boba com o rival), NUNCA ódio, xenofobia ou ataque
pessoal. Não é só ética: conteúdo positivo alcança cerca de 2x mais que o negativo, e
o X (Grok) sufoca tom combativo. O rival é o alívio cômico, não o inimigo. O registro
cômico pode ser mais STANDALONE (cada vídeo uma piada fechada), mas ainda leva gancho
no início, punchline no fim e o selo da casa.

## Personagens: como criar (regras da casa)

- **Semelhança máxima, marcas zero.** Caricatura reconhecível do jogador real, mas
  **nome de paródia** e **sem escudo/logo oficial**, estrela dourada genérica no peito.
- **Ficha canônica é lei.** Cada personagem tem 1 imagem de referência em
  `personagens/<id>.png`. Toda cena nova ANEXA a ficha como referência
  (no studio, o botão ⚡ faz isso sozinho), nunca se descreve o personagem só por texto.
- **Pool global.** Um personagem pode servir a mais de uma saga; por isso o elenco
  da saga referencia ids do pool, não cópias.
- As regras negativas ficam em `data/project.json > projeto.promptRules` e o studio anexa
  sozinho a todo prompt de imagem.

## Regras do mundo (evento real → trama)

| Aconteceu de verdade | Vira na saga |
|---|---|
| Vitória / título | Glória, festa, taça erguida |
| Derrota / eliminação | Luto, queda com honra, porta que fecha |
| Gol decisivo do protagonista | Cena de glória (cada vez mais épica) |
| Rival brilha | O rival "manda um recado" |
| Transferência / assédio de clubes | Chegada, deserção, jaula dourada, portão trancado |
| Lesão / VAR / cartão | Drama, entidade sombria, destino cruel |
| Adversário coletivo (seleção/time) | SEMPRE silhuetas sem rosto, o foco é o herói |

## Regras editoriais (não negociáveis)

1. **Sagas são abertas.** Sempre "Parte X" (sem "/6", sem "FINAL"); o card final é
   sempre "CONTINUA...". Deixa espaço pra evoluir a história.
2. **Semelhança sim, marcas não:** sem escudos oficiais, sem logos de patrocinador,
   sem fotos reais, sem texto legível em roupa. Nomes de paródia sempre.
3. **Máx. 3 personagens por cena; 1 ação por cena.** Prompts de vídeo com restrições
   explícitas (ver WORKFLOW).
4. **Ganchos de abertura e fechamento são sagrados** (ver DIRETRIZES-NARRACAO).
5. **Vinheta, trilha e voz do narrador nunca mudam**, são o branding.
6. **Hashtag-marca `#sagafut` em todo post** + hashtag da saga + selo. A marca na
   comunicação é sempre **SagaFut**.
7. **Motivos recorrentes por saga** (o "fiorde/navio", a "teia/corrente") são a
   assinatura visual, mantê-los idênticos entre episódios.
8. **A comunicação da saga nunca menciona "IA".** Vende a história (drama de futebol),
   não a ferramenta, o making-of "construindo com IA" é outro público/conta (dev).
9. **Gancho visual de abertura em todo vídeo** (texto na tela nos 3 primeiros segundos):
   a retenção se decide aí. Ver DIRETRIZES-NARRACAO e ESTRATEGIA-REDES.
10. **Nunca usar travessão (o traço longo, em/en dash) em NENHUM texto** (narração,
    legenda, título, post, descrição, doc). Parece "coisa de IA". Usar vírgula, ponto ou
    dois-pontos; em faixas numéricas, hífen ("0-12s"). Vale para tudo que sai do projeto.

## Sagas em produção (resumo, detalhe em `data/sagas/`)

- **O Gigante do Norte** (Lendas da Copa), Halland, a Noruega dos 28 anos, a queda
  do Brasil, a derrota com honra pra Inglaterra. 6 capítulos, espelho (cap.1 ↔ cap.6).
- **A Aranha e a Catedral** (Mercado da Bola), Julián Álvarez: o menino que
  sonhava com o Barça, a glória na sombra (crossover com o Gigante), a jaula do
  Atlético. 3 atos no passado + capítulo ao vivo (o portão) reagindo ao mercado real.

## Arquivo
Universos anteriores (v1 "família da Masia", v2 "O Império", piloto Lamini/Bappé)
estão em `arquivo/`, só referência de estilo. **Não** fazem parte do cânone atual.
