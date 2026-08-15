# Agendar Shorts pelo studio: configurar o YouTube

> Passo a passo da configuração no Google Cloud, uma vez só. Depois disso o botão "Agendar no
> YouTube" aparece na aba **Postar** de cada quadrinho, e o YouTube publica sozinho na hora
> marcada. Escrito em 12/08/2026.

**Tempo:** uns 15 minutos, e você nunca mais mexe nisso.

**Por que só o YouTube tem isso:** é a única das quatro redes em que a API publica de verdade E
agenda sozinha. Instagram e TikTok não expõem a biblioteca de áudio (a licença vale só dentro do
app), e som em alta é o que dá alcance nos dois. O X não tem endpoint de agendamento, então
sobraria um processo seu ligado às 12h30.

---

## Antes de começar

Você precisa estar logado, no navegador, **na conta do Google que é dona do canal**. Se você tem
mais de uma conta logada, faça em janela anônima para não configurar no lugar errado: é o erro
mais chato de descobrir depois, porque tudo funciona e o vídeo aparece no canal errado.

---

## 1. Criar o projeto

1. Abra **console.cloud.google.com**
2. No topo, no seletor de projeto (ao lado do logo), clique e depois em **NOVO PROJETO**
3. Nome: `sagafut` (ou o que quiser). Sem organização.
4. **CRIAR**, e espere uns 20 segundos até ele aparecer selecionado no topo

> Confira o seletor do topo antes de cada passo seguinte: se ele mostrar outro projeto, você vai
> configurar a coisa certa no lugar errado.

## 2. Ativar a YouTube Data API v3

1. Menu ☰ → **APIs e serviços** → **Biblioteca**
2. Busque por `YouTube Data API v3`
3. Clique no resultado e depois em **ATIVAR**

## 3. A tela de consentimento, e o passo que quase todo tutorial esquece

Menu ☰ → **APIs e serviços** → **Tela de permissão OAuth**. Em contas mais novas isso aparece
como **Google Auth Platform**; é a mesma coisa.

1. Se pedir para começar, clique em **COMEÇAR**
2. **Nome do app:** `SagaFut Studio` · **E-mail de suporte:** o seu
3. **Público (Audience):** escolha **Externo**
   > "Interno" só existe em conta Google Workspace de empresa. Numa conta comum ele nem aparece.
4. **Dados de contato:** seu e-mail
5. Aceite e **CRIAR**

### 3.1 PUBLIQUE O APP (não pule este)

Ainda em **Google Auth Platform** → **Público-alvo** (ou "Audience"), procure o status de
publicação. Se estiver em **Teste**, clique em **PUBLICAR APLICATIVO** e confirme.

**Por que isso importa mais que tudo:** com o app em **Teste**, o Google **expira todo refresh
token em 7 dias**. Você configuraria hoje, agendaria um mês de Shorts, e na semana seguinte tudo
pararia com `invalid_grant`, sem aviso nenhum.

Publicar **não exige verificação do Google** para uso próprio. A única consequência é uma tela de
"o Google não verificou este app" no momento do login, onde você clica em **Avançado** →
**Acessar SagaFut Studio (não seguro)**. É o seu app, acessando o seu canal: o aviso existe para
proteger terceiros, e não há terceiros aqui.

> A verificação só passa a ser exigida se outras pessoas forem usar o app. Não é o caso.

## 4. Criar a credencial

1. Menu ☰ → **APIs e serviços** → **Credenciais**
2. **+ CRIAR CREDENCIAIS** → **ID do cliente OAuth**
3. **Tipo de aplicativo:** **App para computador** (em inglês, "Desktop app")
   > Escolha esse mesmo, e não "Aplicativo da Web". No tipo App para computador o Google aceita
   > `localhost` em qualquer porta automaticamente, e a tela nem mostra o campo de URIs de
   > redirecionamento. Se o campo não apareceu, está certo.
4. Nome: `studio` · **CRIAR**
5. Aparece uma caixa com **ID do cliente** e **Chave secreta do cliente**. Copie os dois.
   > Dá para voltar neles depois em Credenciais → clique no cliente.

## 5. Autorizar, no terminal — um login por canal da casa

São **dois** canais YouTube (`@devblaugrana` e `@futgibi`), então são **dois** arquivos de
credencial. Um token só publicaria o Short no canal errado sem reclamar.

Duas formas. A primeira é a mais simples e é a que já está valendo aqui:

**a) Pelo JSON baixado (recomendado).** Em **Credenciais**, no seu ID do cliente OAuth, clique no
ícone de **download**. O arquivo vem com nome `client_secret_<id>.apps.googleusercontent.com.json`.
Deixe ele na pasta do projeto e rode, **uma vez por canal**, escolhendo a conta Google / canal
de marca certo na tela do Google:

```bash
node scripts/youtube-login.mjs --canal=devblaugrana
node scripts/youtube-login.mjs --canal=futgibi
```

O comando acha o arquivo sozinho, confere se é do tipo certo (**installed**, de App para
computador) e usa as chaves de lá. Se for do tipo "web", ele avisa e para, em vez de morrer depois
num `redirect_uri_mismatch` sem explicação.

> O `.gitignore` já cobre `client_secret_*.json`, então ele não sobe pro repositório. Ainda assim,
> **depois do login esse arquivo pode ser apagado**: tudo que importa foi copiado pra
> `~/.sagafut/youtube-<canal>.json`. Segredo dentro da árvore de código vaza no dia em que alguém
> compacta a pasta do projeto pra mandar pra alguém.

O `youtube.json` antigo (sem o nome do canal) ainda vale **só** para o `@devblaugrana`, pra quem
já tinha autorizado antes desta data. O `@futgibi` **não** herda esse token.

**b) Pelas variáveis de ambiente**, se preferir não deixar o arquivo em lugar nenhum:

```bash
YT_CLIENT_ID=cole-o-id-aqui YT_CLIENT_SECRET=cole-a-chave-aqui \
  node scripts/youtube-login.mjs --canal=futgibi
```

O que vai acontecer:

1. O navegador abre sozinho (se não abrir, o terminal imprime a URL para colar)
2. Escolha a conta **dona do canal**
3. Na tela de "app não verificado": **Avançado** → **Acessar (não seguro)**
4. Marque as permissões pedidas e **Continuar**
5. A aba mostra "Pronto ✅" e o terminal confirma onde gravou

As credenciais ficam em `~/.sagafut/youtube-devblaugrana.json` e
`youtube-futgibi.json`, **fora do repositório**, com permissão 600.
Você só passa `YT_CLIENT_ID` e `YT_CLIENT_SECRET` nesta primeira vez.

O TikTok Photo Mode é outra porta (Buffer). Ver `saga-fut/docs/BUFFER.md`.

## 6. Usar

No studio, abra o quadrinho → aba **Publicar**. Se o vídeo já estiver montado (aba **Vídeo** →
"Montar o quadrinho inteiro"), aparece o bloco **YouTube** com o handle da peça:

1. Confira a data (vem do cronograma) e escolha a hora (12:30 e 19:00 são atalhos)
2. **Agendar**
3. Pronto. Fica privado no canal **daquela peça** (`canal: "futgibi"` → YouTube do @futgibi;
   ausência → @devblaugrana) e o YouTube publica sozinho na hora.

O bloco passa a mostrar "Agendado para …" com link, e não deixa subir de novo: a API não
substitui vídeo, então um segundo upload criaria um segundo vídeo e os dois sairiam.

---

## Limites que valem saber

| o quê | quanto | consequência |
|---|---|---|
| Cota diária | 10.000 unidades, upload custa 1.600 | **6 uploads por dia** |
| Fila de agendados | sem limite prático | dá para encher meses, 6 por vez |
| Título | 100 caracteres | o studio corta antes de subir |
| Descrição | 5.000 caracteres | idem |

O limite de 6 é de quantos você **sobe** por dia, não de quantos deixa agendados. Se apertar, dá
para pedir aumento de cota no Google Cloud (é um formulário, leva semanas).

---

## Quando der errado

| mensagem | o que é | conserto |
|---|---|---|
| `invalid_grant` depois de uns dias | app ficou em modo **Teste** | §3.1: publique o app e rode o login de novo |
| `redirect_uri_mismatch` | a credencial foi criada como "Aplicativo da Web" | recrie como **App para computador** (§4) |
| `access_denied` no login | conta não autorizada, app em Teste sem você como testador | publique o app (§3.1) |
| "não devolveu refresh_token" | o Google só manda na primeira autorização | revogue em **myaccount.google.com/permissions** e rode o login de novo |
| cota estourada | passou de 6 uploads no dia | os que subiram continuam agendados; siga amanhã |
| "Não existe vídeo deste quadrinho" | falta montar o 9:16 | aba **Vídeo** → "Montar o quadrinho inteiro" |

## O que NÃO fazer

- **Não commite `~/.sagafut/youtube-*.json`.** Eles estão fora do repositório de propósito; não
  copie para dentro dele "para não perder".
- **Não passe as chaves como argumento** (`node script.mjs --id=...`): argumento fica no histórico
  do shell. Por isso o comando usa variável de ambiente.
- **Não apague o campo `youtube` do quadrinho** para "reagendar": isso libera um segundo upload e
  você fica com dois vídeos publicando no mesmo horário. Apague o vídeo no canal primeiro.
