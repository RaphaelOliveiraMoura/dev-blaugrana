# Som dos vídeos

Até 13/08/2026 todo vídeo animado da casa nascia `semAudio: true` e saía mudo. O motor mixava
`music` e `sfx`, mas o `montar-cena` montava o áudio **sempre zerado**: não existia campo no roteiro
pra declarar som nenhum. Um vídeo mudo compete com o Comentarista Edu, que tem som contínuo do
primeiro ao último frame, sem um silêncio sequer acima de 0,2s.

Este doc é o que existe agora e como usar.

## 1. As quatro camadas

Um vídeo narrado tem quatro faixas, e elas entram por portas diferentes:

| camada | o que é | onde se declara |
|---|---|---|
| **ambiente** | o leito contínuo que roda por baixo da cena inteira | `video.ambiente` (id do catálogo) |
| **som pontual** | apito, porta, celular, caixa registradora | `shot.sons[]` |
| **voz** | a fala, gerada pelo `say` | `balao.voz` |
| **trilha** | música, quando houver | ainda não ligada em vídeo (existe em quadrinho) |

A regra de mixagem já está no código e não precisa de ajuste manual: efeito entra em -20 LUFS,
voz em -16, e a voz vai por cima com volume cheio. Num vídeo narrado, ambiente que compete com a
fala é defeito.

```jsonc
{
  "ambiente": "estadio-ambiente",     // leito, opcional
  "ambienteVol": 0.22,                // default é o `vol` da ficha
  "roteiro": [{
    "sons": [                          // `at` em FRAMES relativos ao shot
      { "id": "porta-abre", "at": 4 },
      { "id": "caixa-registradora", "at": 58, "vol": 0.9 }
    ],
    "baloes": [
      { "texto": "50 MILHOES", "de": "laporta-riso", "voz": "laporta", "in": 56, "out": 124 }
    ]
  }]
}
```

## 1.1 Todo som tem hora de ACABAR (14/08/2026)

O defeito: no `ferran-amor` o jogador chegava andando com som de passo, **parava**, e o passo
continuava por 3,6 segundos. O motivo não era o roteiro. O arquivo `passos.mp3` tem 10,5s, o mux
não cortava nada, e o som simplesmente tocava até o fim.

Sobreviveu ao render, à validação e à folha de revisão porque **erro de som não tem sintoma
visual**, e ninguém lê "10,5s de arquivo" num roteiro e imagina o que isso vai fazer numa
caminhada de 2s.

### Evento e leito são coisas diferentes

A ficha de cada som agora diz qual dos dois ele é (`continuo` em `shared/sfx-video.mjs`):

| natureza | exemplos | o que o motor faz |
|---|---|---|
| **evento** | apito, buzina, flash, porta, boing | toca inteiro, inclusive atravessando o corte. O arquivo É a coisa, do ataque ao decaimento. |
| **leito** (`continuo: true`) | passos, relógio, torcida, fotógrafos, ambiente, trilha | é cortado no fim da **cena**, com fade-out de 0,35s. O arquivo é um pedaço arbitrário de uma tomada longa: ele não acaba, ele para quando o gravador parou. |

**Uma CENA é a corrida de shots no mesmo `set`**, não um shot. É isso que o ouvido entende como
continuidade: o corte de beat dentro do estádio não interrompe a torcida, mas a porta do escritório
interrompe. Cortar no fim do shot faria a torcida sumir no meio do próprio estádio.

O corte só **encurta**: `min(arquivo, o que falta da cena)`. Leito não estica, porque esticar seria
inventar áudio que não foi gravado.

### O passo sai do MOVIMENTO, não do roteiro

`passos` não se declara mais. O composer já sabe, frame a frame, quem está se deslocando a pé
(entrada andando, beat com `andar`/`correr`, folha de ação que desloca, saída andando), e emite o
som exatamente nessa janela. Declarar à mão é ignorado, com aviso.

```jsonc
// ERRADO: dois números pra manter sincronizados, e um deles é o tamanho de um MP3
"sons": [{ "id": "passos", "at": 6 }]

// CERTO: não escreva nada. O beat abaixo já produz o som, do frame 0 ao 60.
"poses": [{ "andar": true, "move": 300, "hold": 60 }]
```

Janelas sobrepostas viram uma: dois personagens andando juntos não são dois sons empilhados (o
volume dobrava), são uma caminhada mais cheia. `shot.semPassos: true` desliga no shot;
`shot.passosVol` ajusta o volume.

Ganho colateral que mostra o tamanho do buraco: o mesmo vídeo tinha o personagem **saindo de cena
com a mala em silêncio**, porque ninguém lembrou de declarar o passo naquele beat. Derivado, ele
apareceu sozinho.

### Os dois opt-outs têm guarda

`dur` no som e `manual: true` em som de locomoção são as portas de saída, e porta de saída sem
guarda é a que se atravessa sem ver. O INV-11 reprova o render quando um leito com `dur` ultrapassa
o fim da própria cena (`som-vaza-a-cena`), e quando um passo plantado à mão soa sem ninguém andando
(`passo-sem-ninguem-andando`).

### E dá pra VER e OUVIR junto, na aba Linha do tempo

O studio ganhou uma linha do tempo do som (aba **Linha do tempo** do vídeo): o player em cima, e embaixo as
faixas de ambiente, passos, sons e voz sobre a mesma régua, com as fronteiras de cena marcadas e a
parte cortada de cada arquivo desenhada em listras. O dado vem da mesma `montarCena` que alimenta o
mux, então a tela não aproxima o áudio: ela **é** o áudio.

Era a única camada do vídeo sem representação nenhuma na tela, e por isso a única em que um defeito
podia atravessar o pipeline inteiro sem ninguém ver.

**O player e a linha do tempo mandam um no outro**, e é isso que faz a tela ser usada em vez de
admirada. O cursor atravessa todas as faixas, o bloco acende no instante em que o som entra, um
painel diz em texto o que está tocando agora, e clicar em qualquer ponto leva o vídeo pra lá.
Separados, ligar "ouvi um passo estranho" a "qual bloco é esse" custa contar segundos de cabeça —
que é exatamente o esforço que faz ninguém conferir.

O cursor anda por `requestAnimationFrame`, não pelo evento `timeupdate` do `<video>`: o evento
dispara ~4x por segundo, e nessa taxa o cursor pula de 250ms em 250ms, parecendo dessincronizado
justo quando se está tentando julgar sincronia.

**Aviso de render velho.** Juntar as duas metades cria um risco que nenhuma tinha sozinha: a linha
do tempo é recalculada a cada abertura, o MP4 é de quando alguém apertou renderizar. Editar o
roteiro e voltar aqui daria som velho embaixo de linha do tempo nova, com todo o ar de estarem de
acordo. A rota compara os `mtime` e a tela avisa antes do player.

## 2. A voz sai do BALÃO, de propósito

`voz` no balão é o nome de um timbre (`narrador`, `ferran`, `laporta`, `torcedor`, `velho`), e o
áudio entra no frame em que o balão aparece.

**Legenda e voz saem do mesmo campo porque, se fossem duas listas, o primeiro ajuste de roteiro
faria as duas divergirem e ninguém perceberia até assistir ao vídeo pronto.** Não há como um vídeo
sair com a legenda nova e a voz velha.

O escape é `dizer`, pra quando o escrito e o falado divergem de propósito: sigla que a voz soletra
errado, número que a tela quer em dígito. Não é pra reescrever a fala.

```jsonc
{ "texto": "ELE JA TINHA DITO SIM PRO PSG", "dizer": "ele ja tinha dito sim pro pe esse ge", "voz": "narrador" }
```

### Acento errado vira voz errada

O mesmo campo é legenda e fala, então acento faltando não é estética: o `say` lê "e" como conjunção
átona e "é" como o verbo tônico. Medido na mesma frase: 2,208s sem acento contra 2,304s com, e
áudios diferentes. Antes da voz, isso era um errinho de digitação; hoje é uma frase falada errada no
vídeo publicado, e o defeito é invisível lendo o roteiro.

O gate está em `shared/acentuacao.mjs` e barra o render. Ele pega dois casos, os dois de alta
confiança:

- **formas que não existem sem acento**: "voce", "nao", "tambem", "ninguem", "milhoes", "unico"...
- **o "e" que é o verbo ser**, depois de sujeito ou pronome: "que e", "isso e", "você e".

Calibrado contra os 700 textos do acervo (quadrinhos + vídeos): 8 apontamentos, os 8 verdadeiros.
Dois casos ficaram DE FORA de propósito, porque davam falso positivo: `la` (é "La Masia", "La
Rambla", nome próprio) e `ele e` (ali a conjunção cabe: "ele e outros onze homens"). Gate que erra
é gate que se ignora.

**Orçamento:** a Eddy fala a ~4,3 palavras/s no timbre `ferran` (rate 200) e ~3,5 no `laporta`
(rate 168). Meça antes de escrever o shot, não depois:

```bash
node scripts/audio/falar.mjs "a frase inteira" --quem=ferran   # devolve segundos E frames
```

Timbre por personagem mora em `scripts/audio/falar.mjs` (`TIMBRES`), não no roteiro: se cada cena
escolhesse o pitch na mão, o mesmo personagem mudaria de voz entre shots.

**A armadilha do `say`:** `say -v Eddy` pega a Eddy **inglesa**, que lê português com fonética de
inglês. Sempre o nome completo, `"Eddy (Portuguese (Brazil))"`, e é por isso que ele mora numa
constante em vez de ser digitado em cada chamada.

## 3. Como buscar som novo

A fonte é a **API pública do Openverse**, o buscador oficial da Creative Commons, que agrega
Freesound, Wikimedia e Jamendo. Não precisa de conta nem de chave, e foi por isso que ela venceu o
Freesound direto, cuja API exige cadastro e token.

```bash
node scripts/audio/buscar-sons.mjs "crowd boo"            # candidatos CC0
node scripts/audio/buscar-sons.mjs "crowd boo" --n=10
node scripts/audio/buscar-sons.mjs --kit                  # roda a lista de termos base
```

**O termo vai em INGLÊS.** O acervo é internacional: "vaia" devolve zero e `crowd boo` devolve 31.
Termos que funcionam, medidos em 13/08/2026 (resultados só em CC0):

| o que você quer | termo | tinha |
|---|---|---|
| torcida de fundo | `stadium crowd ambience` | 55 |
| comemoração | `crowd cheer` | 8 |
| vaia | `crowd boo` | 31 |
| aplauso | `applause` | muitos |
| apito | `referee whistle` | 9 |
| buzina | `air horn` | 57 |
| vuvuzela | `vuvuzela` | 11 |
| porta | `door knock`, `door creak open` | dezenas |
| celular | `phone ringtone` | dezenas |
| fotógrafos | `camera shutter` | dezenas |
| dinheiro | `cash register` | dezenas |
| espera | `clock ticking` | dezenas |
| pontuação cômica | `boing cartoon`, `swoosh whoosh` | dezenas |

Termos que **não** funcionam e o que usar no lugar: `football net` (zero) → `ball kick` ou
`swoosh`; `torcida` e qualquer termo em português → o equivalente em inglês.

Achou o som? Adicione a ficha em `saga-fut-studio/shared/sfx-video.mjs` e rode:

```bash
node scripts/audio/baixar-sons.mjs            # baixa o que falta e normaliza
node scripts/audio/baixar-sons.mjs --refazer
```

Os arquivos ficam em `saga-fut/assets/sons/` e estão no .gitignore: **o que se versiona é a ficha**,
e o acervo inteiro se reconstrói com um comando. Mesmo padrão do catálogo de músicas.

**Por que normaliza em vez de só baixar:** som de banco vem em qualquer nível, e sem nivelar,
escrever roteiro vira caça ao `vol` certo por tentativa. Tudo entra medido em -20 LUFS.

## 4. Licença e risco: dois campos, não um

Cada som carrega `licenca` (cc0, cc-by, nossa) e `risco` (livre, tolerado, evitar). São perguntas
diferentes e as duas só têm resposta na hora em que o som entra no acervo: os cinco efeitos que já
existiam em `remotion/assets/sfx` não têm procedência nenhuma registrada, e por isso não dá pra
afirmar que são seguros.

O buscador **só enxerga CC0** por default, então o caminho fácil e o caminho seguro são o mesmo.
Quem quiser CC-BY passa `--licenca=cc0,by` de propósito e assume o crédito obrigatório.

O vídeo herda o **pior** risco dos sons que usa (`riscoDe()` no catálogo). Som desconhecido não é
"provavelmente ok", é tratado como `evitar`.

### O que a lei diz, e o que decide na prática

Não existe duração isenta. O "até 7 segundos pode" é mito: nem a lei brasileira nem o fair use
americano isentam por tempo. A 9.610/98 é mais restritiva que a americana e não tem cláusula geral
de fair use; tem lista fechada (art. 46). O art. 47 protege paráfrase e paródia que não sejam
reprodução da obra, o que significa que **recriar um bordão está muito melhor amparado do que
cortar o áudio original**.

Só que quem julga no dia a dia é o robô da plataforma:

| o que | detecção | pior caso realista |
|---|---|---|
| música comercial | quase certa | receita vai pro detentor, ou bloqueio |
| narração de transmissão de TV | média | bloqueio, e strike se insistir |
| entrevista, programa esportivo | baixa | vídeo mutado |
| meme viral sem dono claro | quase nula | nada |
| CC0, ou recriado na voz da casa | nenhuma | nada |

Segundo eixo, independente do autoral: **direito de voz e imagem da pessoa**. Usar trecho real como
citação de piada é uma coisa; fazer parecer que alguém disse o que não disse é outra. Nunca
sintetizar a voz de pessoa real dizendo coisa que ela não disse.

**Regra da casa, hoje:** o acervo é 100% `cc0` + `livre`, e continua assim até alguém decidir o
contrário por escrito. Meme entra pela plataforma (som nativo do TikTok, escolhido na hora de
postar), não embutido no MP4.

## 5. O que ainda não existe

- **Trilha musical em vídeo.** O catálogo de 65 faixas do Kevin MacLeod só é usado em quadrinho.
- **Ambiente em loop.** A faixa de leito é cortada no tamanho do vídeo (`atrim`); um vídeo mais
  longo que o arquivo fica sem leito no fim. O `estadio-ambiente` tem 138s, então hoje não incomoda.
- **Aviso de risco no studio.** `riscoDe()` existe e ninguém chama: quando entrar o primeiro som
  `tolerado`, a tela precisa dizer isso antes de publicar.
