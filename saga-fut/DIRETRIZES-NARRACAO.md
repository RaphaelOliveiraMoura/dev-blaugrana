# Diretrizes de narração (ler ANTES de escrever qualquer roteiro)

A narração é ouvida UMA vez, rápido, em vídeo curto. O ouvinte não volta atrás.
**Cada frase tem que cair na hora, se exigir um segundo de reprocessamento, está errada.**

## O teste único

Leia a frase EM VOZ ALTA, no ritmo do vídeo, UMA vez. Se você (ou qualquer pessoa)
precisar reler mentalmente para entender, reescreva. Não existe "mas é bonito", 
bonito que confunde é ruído.

## Os 4 erros que já cometemos (não repetir)

1. **Sintaxe invertida / comparação torta.**
   ❌ "a nevasca parou primeiro que ele" · "ninguém sai maior de uma derrota que um viking"
   ✅ "treinou até a noite cair" · "ninguém perde de cabeça tão erguida quanto um viking"
   Regra: sujeito → verbo → complemento, na ordem natural.

2. **Enumeração/contagem críptica.**
   ❌ "Um chute... dez... mil."
   ✅ "E foi treinar. Sozinho, na neve."
   Regra: se a conta não é óbvia em 1 segundo, vira ação concreta.

3. **Verbo sem objeto claro / metáfora que pede montagem mental.**
   ❌ "e jurou preencher" (preencher o quê?)
   ✅ "vestiu a camisa do pai, grande demais pra ele"
   Regra: toda metáfora precisa de uma âncora concreta na mesma frase.

4. **Palavra solta com ironia/tom que não se ouve.**
   ❌ "Bonitinho." (diminutivo sarcástico isolado)
   ✅ "O mundo achou o gigante simpático. Sem imaginar..."
   Regra: ironia precisa de contexto na frase; sozinha, não se lê na narração.

## O que PODE (e deve) manter, metáfora que é imagem direta

Metáfora boa é a que vira uma imagem instantânea, sem exigir tradução:
- "o gelo acreditou" · "o navio não zarpava" · "silêncio amarelo" ·
  "chuteiras de ouro" · "o país que inventou a arte" · "só o tamanho era outro"
Essas elevam o texto. O alvo NÃO é empobrecer, é cortar o que confunde, manter o que evoca.

## Checklist ao escrever cada cena

- [ ] Frase na ordem natural (sujeito-verbo-complemento)?
- [ ] Toda metáfora tem âncora concreta na mesma frase?
- [ ] Nenhuma contagem/comparação que exija o ouvinte "montar"?
- [ ] Ironia/tom vem do contexto, não de uma palavra solta?
- [ ] Lida em voz alta, cai de primeira?
- [ ] Cabe no clipe de 10s? (~20 palavras por cena, ver abaixo)

## Tamanho da narração por cena (o limite do clipe de 10s)

O Grok anima no máximo **10 segundos por cena**. A narração de cada cena tem que caber
nesses 10s, senão o render **acelera a voz** (até 1.35x) e ela "corre", perdendo a
gravidade dramática (foi o que aconteceu na 1ª leva: narrações de 12 a 15s num clipe de 10s).

**Regra prática (calibrada com o ElevenLabs, ~2,1 palavras/s + ~0,5s por pausa "..."):**
- **Alvo: ~20 palavras por cena** (≈10s). Cai natural, sem acelerar.
- Até ~13s (uns 26 palavras) ainda passa, mas a voz acelera um pouco (evitar).
- Acima de ~13s: acelera ao máximo E congela quadro. **Corte o texto ou divida a cena em 2 clipes** (dois planos de ~6s com corte seco, ver WORKFLOW Etapa 4).

O studio mostra isso ao vivo: abaixo de cada narração aparece **≈Xs · N palavras (meta ~M)**
em verde/amarelo/vermelho, com quantas palavras cortar. Escreva olhando esse aviso.

> O campo **"Tempo"** da cena (ex.: "37-50s") é só uma anotação manual de onde a cena cai
> no episódio; o render ignora ele e usa a duração real do áudio. Quem manda é o orçamento
> de 10s acima.

## Ganchos: início e fim são sagrados

A retenção se decide nos **3 primeiros segundos** e a vontade de ver o próximo se
decide no **último segundo**. Trate as duas pontas com atenção redobrada.

### Abertura (primeira frase da cena 1)
- Comece com **tensão, mistério ou uma afirmação forte**, não com cenário lento.
- ❌ Lento: "Num fiorde gelado no fim do mundo, um menino vivia..." (demora a dar motivo pra ficar)
- ✅ Gancho: "Esse menino esperou 28 anos pra ver seu país numa Copa." (pergunta implícita: por quê? como?)
- Boa abertura embute uma **pergunta na cabeça do espectador** que só o vídeo responde.

### Gancho VISUAL de abertura (obrigatório, texto queimado na tela)
Dado real da 1ª saga: retenção média de **3-4s** em vídeos de 40-70s, quase ninguém
passa do 3º segundo. Narração boa não basta; o gancho tem que estar **escrito na tela**.
Toda montagem liga o toggle **🪝 gancho de abertura** (aba Montar): o `hookText` do
episódio, frase grande sobre a 1ª cena nos ~3s iniciais (terço superior, não colide com
legenda). A caricatura reconhecível aparece já no 1º segundo (teste do scroll). Vale para
episódios **antigos e novos** (remontar os antigos, ver [ESTRATEGIA-REDES.md](ESTRATEGIA-REDES.md) § Retrofit).

#### O motor do hook: abra uma LACUNA, não descreva a cena
O hook tem UM trabalho: criar uma pergunta que só o vídeo responde e que a pessoa **não
consegue adivinhar**. Descrição não prende (é a primeira linha da narração disfarçada);
lacuna prende. Por isso o **título** do episódio costuma ser melhor gancho que uma frase
expositiva, o título é um paradoxo comprimido, não um resumo.

**Teste único do hook:** leia SÓ o hook. Se você já entendeu a história, ou não ficou com
vontade de saber o que vem depois → é legenda, não hook. Reescreva.

**As 5 fórmulas que prendem** (escolha uma):
1. **Paradoxo**, duas verdades que não deveriam conviver.
   "O maior artilheiro do mundo nunca tinha jogado uma Copa." · "Campeão do mundo, e ninguém falava dele."
2. **Reviravolta (antes→agora)**, "Fecharam a porta pra ele. Hoje o mundo implora pra ele voltar."
3. **Detalhe absurdo e real**, o fato verdadeiro que não computa.
   "Ele nasceu na Inglaterra. Na Copa, teve que eliminá-la."
4. **Aposta / stakes com âncora concreta**, "28 anos esperando. Uma noite pra mudar tudo."
5. **Chamada de identidade**, fala direto com o torcedor exato da saga. Foi a fórmula de
   MAIOR retenção medida pra conta pequena: especificidade bate alcance. "Se você é do
   Barça, isso vai doer." · "Torcedor do Real, não assiste isso." As 4 primeiras abrem uma
   lacuna de curiosidade; esta fisga por pertencimento. Testar as duas linhas (lacuna vs.
   identidade) e ficar com a que segurar mais retenção nos 3s.

**Regras da frase do hook:**
- Curtíssima: 1 frase (ou 2 bem curtas), ≤ ~8 palavras. Lê em <2s.
- A palavra mais curiosa vem cedo.
- Concreto vence épico: "solo inglês" > "terra natal"; "corrente" > "prisão".
- **NUNCA é a primeira linha da narração**, o hook é a provocação POR CIMA da cena.
- Não entrega a resolução; promete que ela vem. Nasce de uma verdade real surpreendente.
- **Curto de verdade: no máx 2 linhas na tela.** Se não couber, é porque tem palavra
  sobrando, corte até virar soco. Hook comprido + legenda embaixo = leitura demais nos 3s.
- **Emoji: no máximo 1, simbólico, no fim** (bandeira, símbolo da saga: 🇳🇴, 🕷️, ⚔️).
  O tom da casa é cinematográfico; emoji demais barateia. Emoji pesado vai na LEGENDA do
  post (descoberta/tom), não no vídeo. Na dúvida, hook queimado limpo, sem emoji.
- **A legenda das cenas entra só depois do hook sair** (~2,8s): nos 3s iniciais, só o hook
  na tela. (O Montar já faz isso automaticamente quando há hook.)

**Título ↔ hook:** usam o mesmo motor (paradoxo/promessa). O título pode ser mais poético;
o hook, mais provocador. Se o título já é um ótimo gancho, o hook é a versão ainda mais
afiada dele, ou use o próprio título como ponto de partida.

### Fechamento (última frase do episódio)
- Termine com uma **porta aberta**: uma promessa, uma ameaça, uma virada não resolvida.
- ❌ Fecha demais: "...e assim termina a história." (não dá motivo pra voltar)
- ✅ Gancho: "Mas o próximo inimigo era a terra onde ele nasceu." (curiosidade pro próximo)
- O card "CONTINUA..." reforça, mas quem carrega é a FRASE, não o card.

### Regra de ouro (não forçar)
Gancho bom nasce de uma **verdade interessante da própria história**, não de
sensacionalismo. Nada de "VOCÊ NÃO VAI ACREDITAR" ou clickbait esdrúxulo. O objetivo
é achar o ângulo mais curioso do fato real e colocá-lo na frente, se soar forçado,
está errado; volte ao fato e ache o que nele já é surpreendente.

## Registro cômico (vibe adulta: comédia, rivalidade, provocação)

Tudo acima é o registro ÉPICO (lenda). Quando a saga for do registro **cômico**
(público adulto, motor de crescimento, ver BIBLIA § Os dois registros), a régua muda:

- **Voz:** troca a solenidade por uma voz esperta e debochada, ritmo rápido, gíria de
  torcida. Pode ser a mesma voz do narrador em outra direção (mais leve) ou uma voz
  nova mais jovem. O tom é de resenha de bar, não de documentário.
- **Estrutura da piada:** o gancho dos 3s É a provocação ou a pergunta engraçada
  (setup); o meio escala; o fim entrega a **punchline** (a reviravolta cômica). A
  punchline no fim também é o gatilho de re-watch, a pessoa volta pra rir de novo.
- **Ainda ~20 palavras por cena** (limite do clipe de 10s do Grok), mas quem carrega a
  piada pra quem vê no mudo é o **texto na tela** (balão de fala ou legenda), não a voz.
- **Provocação leve e celebratória, nunca ódio** (BIBLIA § Regra da provocação). Zoa o
  rival com carinho, o rival é o alívio cômico. Ataque pessoal, xenofobia e deboche de
  tragédia estão fora, além de antiético, derruba alcance e trava no X.
- **Newsjacking é o combustível:** a piada reage ao jogo do fim de semana, ao mercado,
  à polêmica do VAR. Quanto mais quente o assunto, mais a piada pega.
- **Exemplo (setup no hook, punchline no fim):**
  - Hook: "O que o zagueiro disse pro atacante antes do gol?" (setup, 3s)
  - Punchline: "Nada. Ele nunca chegou perto o suficiente pra falar." (reviravolta)
- **Formatos que combinam:** "Resenha da Rodada" (os bonecos zoam o fim de semana),
  "Grupo do Zap do Vestiário" (conversa fictícia reagindo ao resultado), "Tribunal do
  Futebol" (julgamento cômico de uma polêmica real). Podem ser standalone, um vídeo,
  uma piada.

Nota de produção: no registro cômico o Grok pode fazer **expressões e reações
exageradas** (cara de choque, comemoração boba), mas mantenha a regra de **não gerar
fala com lábios sincronizados** (a voz inventada do Grok quebra a unidade sonora); a
piada falada vem da narração única + balões de texto. Ver WORKFLOW e APRENDIZADOS.

## Referência boa

A saga "O Gigante do Norte" (após revisão) é o padrão de narração do registro ÉPICO,
consulte as narrações em `data/sagas/gigante-do-norte.json` como exemplo do tom certo.
