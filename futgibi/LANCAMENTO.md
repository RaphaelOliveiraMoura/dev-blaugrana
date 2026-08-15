# futgibi — o que falta pra abrir, e em que ordem

`IDENTIDADE.md` diz como o canal se parece. `EDITORIAL.md` diz o que ele publica. Este diz **o que
ainda não existe**, incluindo o que mora fora deste repositório (contas, domínio, e-mail), que
nenhum outro arquivo cobre e por isso é o primeiro a ser esquecido.

Escrito em 15/08/2026, com a marca pronta, os quatro perfis criados, os dois domínios comprados e
**um** quadrinho publicável (`o-dia-jules-rimet`).

A ambição declarada é ser **a maior referência de quadrinhos de futebol do Brasil**. A lista abaixo
está ordenada por isso, não por esforço: referência se prova com acervo consultável e coerente, e o
que mais ameaça isso hoje não é falta de post, é a **ausência de qualquer mecanismo que separe os
dois canais**.

## 1. O acervo não sabe a que canal cada peça pertence

**É a pendência mais cara, e a única que piora sozinha com o tempo.** Os 145 quadrinhos vivem num
`project.json` só e nenhum declara canal. O `o-dia-jules-rimet` só se identifica numa frase de prosa
dentro do `contexto`, que nenhum código lê.

O que isso permite hoje, sem nada reprovar:

- `marca/assinar.mjs` carimbar `@futgibi` numa arte do `@devblaugrana` (ele aceita qualquer caminho);
- um personagem com escudo de clube entrar num painel do futgibi, que é a violação da regra que
  **gera todas as outras** deste canal;
- ninguém conseguir responder "quantas peças o futgibi tem" sem ler à mão;
- o `futgibi.com` não ter como saber o que republicar quando existir.

Pelo `CLAUDE.md` §5, isso pede **camada 1 ou 2**, não disciplina: um campo `canal` no quadrinho,
exigido no `PUT`, mais um `semClube: true` nos personagens que podem aparecer aqui. Com os dois, o
gate de publicação do futgibi reprova elenco com clube, e o `assinar.mjs` passa a recusar arte que
não seja deste canal em vez de aceitar tudo.

Enquanto não existir, **cada peça nova aumenta a dívida**: hoje é uma para separar, e a separação é
feita olhando cada uma.

## 2. O elenco sem clube é UM personagem, e ele não está apto

```
torcedor-12: NÃO APTO
  tem: base
  FALTA  model sheet (4 vistas)     -> asset model-sheet torcedor-12
  FALTA  folha de idle (respiração) -> asset idle torcedor-12
```

Os outros 105 do acervo vestem clube (`EDITORIAL.md` §7). Na prática o canal tem elenco pra
figurar, não pra encenar, e isso limita todo formato que não seja legenda sobre painel.

Duas frentes, e elas concorrem pelo mesmo orçamento de geração:

- **o mascote**, cujo tamanho depende da voz (§3): se ele narra, precisa de poses de reação; se ele
  só existe no avatar, o `apto` já basta;
- **os tipos recorrentes sem clube** (o zagueiro veterano, o narrador de rádio antigo, o juiz, o
  cartola), que são a condição pra humor de CARÁTER funcionar aqui, segundo o próprio método da
  casa (`EDITORIAL.md` §1.1). Sem eles, toda piada é de situação e nada se acumula.

## 3. A voz do narrador trava o resto

Está aberta desde 15/08/2026 (`EDITORIAL.md` §4) e é o gargalo real: ela decide quantas poses o
mascote precisa, e portanto o item 2.

**O método da casa é aprovar olhando, e aqui ele é barato**: pegar o `o-dia-jules-rimet`, reescrever
as legendas nas três vozes e ler as três seguidas. Custa zero geração e destrava um orçamento.

## 4. O perfil promete quatro prateleiras e tem uma peça

As quatro capas de destaque estão geradas (`marca/destaques/`). **Destaque de Instagram só existe se
houver story arquivado dentro dele**, então subir as quatro no dia 1 entrega ao visitante três
prateleiras vazias, que lê como canal abandonado antes de ter começado.

A ordem que não tem esse defeito: publicar até a prateleira ter conteúdo, e só então criar o
destaque dela. Comece por **O Dia Em Que**, que é a única com molde escrito e skill pronta.

Vale também não abrir com um post só. Quem chega pelo primeiro carrossel decide seguir olhando o
que mais tem, e "mais nada" é resposta.

## 5. O que está fora deste repositório

Nada aqui é código, e por isso nada aqui aparece em teste nenhum.

| item | por quê | estado |
|---|---|---|
| **e-mail `@futgibi.com`** como contato e recuperação das 4 contas | enquanto for um gmail pessoal, a marca inteira depende de uma conta que não leva o nome dela | não feito |
| **2FA nas 4 contas** | handle é o ativo, e handle roubado não volta | conferir |
| **`.com.br` redirecionando pro `.com`** | pra existir um endereço só a ser divulgado | não feito |
| **subir `perfil.png` nas 4 redes** | os arquivos estão prontos no repo e não valem nada lá | conferir |
| **subir `banner-x.png` e `banner-youtube.png`** | idem; Instagram não tem banner | conferir |
| **descrição do canal no YouTube** | é campo de busca, como o nome de exibição no Instagram | não feito |
| **handles adjacentes** (Threads vem do Instagram; Facebook distribui Reels) | custa minutos agora e é irreversível se alguém pegar | avaliar |
| **os números do dia 0** | sem baseline não dá pra saber se alguma coisa funcionou | não registrado |

## 6. O acervo público muda o que é publicável

O `futgibi.com` é destino declarado, e ele republica fora da rede, onde o post não expira e é
achável no Google. Três coisas que hoje passam num carrossel e ficam expostas num portal:

- **símbolo real de clube, seleção ou federação** em arte que vira acervo público (já proibido em
  `EDITORIAL.md` §2, e é o item 1 que faltava mecanizar);
- **crédito de trilha CC BY 4.0**, que é condição da licença: post sem crédito hoje vira página sem
  crédito depois, multiplicada;
- **zoeira com pessoa viva**, cujo cálculo muda quando o conteúdo deixa de ser um story que some.

O escopo do portal não existe. Quando existir, vira doc próprio.

## 7. A ordem sugerida

1. decidir a **voz** (§3), que é grátis e destrava o orçamento de arte;
2. **separar os canais no acervo** (§1), enquanto é uma peça e não trinta;
3. **e-mail no domínio e 2FA** (§5), que é o que protege tudo o que já foi feito;
4. deixar o `torcedor-12` **apto** (§2);
5. produzir um lote de **O Dia Em Que** antes de abrir o destaque (§4);
6. só então decidir a segunda prateleira e os tipos recorrentes.
