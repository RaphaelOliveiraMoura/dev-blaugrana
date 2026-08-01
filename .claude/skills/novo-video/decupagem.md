# Decupagem — o passo que faltava entre a ideia e o JSON

O roteiro JSON é formato de **execução**. Escrever direto nele faz as decisões de direção
acontecerem por omissão: tudo acaba no mesmo plano, no mesmo pedaço do cenário, no mesmo ritmo.

A decupagem é uma tabela que **obriga a decidir**. Preencha antes de tocar no JSON. Coluna vazia é
decisão não tomada, não é "tanto faz".

## As colunas

| coluna | pergunta que ela força |
|---|---|
| **função** | por que esta cena existe? (estabelece / escala / vira / remata) |
| **onde** | em que ponto do MUNDO acontece? (x em px) |
| **plano** | geral, medio, close ou detalhe |
| **câmera** | parada, segue alguém, viaja de A pra B, ou fecha durante a cena |
| **quem faz o quê** | uma linha por personagem, com o verbo físico |
| **por quê (câmera)** | que motivo narrativo justifica esse movimento? sem resposta, câmera parada |
| **pontuação** | onde entra punch-in / grade / tremor |
| **dur** | frames — e elas NÃO podem ser todas parecidas |

## A regra que mais muda o resultado

**Um cenário panorâmico é um SET, não um fundo.** Ele tem 2 telas de largura justamente pra a
câmera navegar. Encenar tudo no mesmo x é jogar metade do cenário fora e é o que faz o vídeo
parecer "sempre a mesma coisa". Mova a encenação pelo mundo: mesma composição, lugares diferentes.

Isso custa zero geração e é o de maior retorno.

## Exemplo trabalhado: "O segurança do Messi"

Virada em uma frase: *o segurança chuta todo mundo que chega perto, inclusive o filho dele.*
Quem não reage: o Messi.

| # | função | onde | plano | câmera | quem faz o quê | pontuação | dur |
|---|---|---|---|---|---|---|---|
| 1 | estabelece a regra | x 700 (lado da arquibancada) | geral | fecha no adversário na chegada, volta pro geral | adversário ENTRA andando · segurança CHUTA · Messi imóvel · adversário VOA | punch-in 1.14 no contato | 150 |
| 2 | escala (acelera) | x 1150 (meio-campo) | geral | viaja do 700 pro 1150 durante a entrada | fã ENTRA · segurança CHUTA sem esperar · fã VOA | punch-in 1.16 | 108 |
| 3 | vira (quebra o ritmo) | x 1620 (área, perto do gol) | geral → fecha | viaja pro 1620, depois FECHA no menino enquanto ele fala | filho ENTRA · FALA cortada · segurança CHUTA · filho VOA | punch-in 1.20 + grade fria | 150 |
| 4 | remata | onde o Messi estiver | medio | fecha devagar | Messi imóvel, respirando | íris | 56 |

Repare no que a tabela força e o JSON não: as três cenas têm a **mesma composição** (o trio, mesmas
posições relativas) em **lugares diferentes do gramado**. O padrão da piada sobrevive; a monotonia
não.

## Erros que a decupagem pega antes de custar render

- **Todas as cenas com o mesmo `onde`** → o cenário panorâmico virou papel de parede.
- **Todas com o mesmo `plano`** → INV-7 avisa, mas aqui você vê antes.
- **Coluna "quem faz o quê" com verbo não-físico** ("reage", "percebe", "fica bravo") → INV-6 vai
  reprovar. Verbo físico é o que a folha de sprite sabe desenhar.
- **`dur` todas parecidas** → montagem sem aceleração.
- **Nenhuma linha na coluna pontuação** → nenhum momento do vídeo é pontuado; tudo tem o mesmo peso.
- **A cena 1 abre com todo mundo parado** → o gancho foi desperdiçado. Os 3 primeiros segundos
  decidem se o vídeo é visto; comece com a ação já acontecendo (ver `direcao-2d.md` §7).
- **Personagens entrando por lados diferentes entre cenas** → cruzou a linha dos 180°; o espectador
  lê como erro, não como variação.
