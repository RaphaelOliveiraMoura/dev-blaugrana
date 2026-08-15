# Agendar TikTok Photo Mode pelo Buffer

> Uma vez só. Depois o botão **Agendar Photo Mode** na aba Publicar do quadrinho manda o
> carrossel pro TikTok certo (`@devblaugrana` ou `@futgibi`) na hora marcada. O som é o
> automático do TikTok: a API do Buffer **não tem campo** pra escolher faixa da biblioteca.

Escrito em 15/08/2026.

## Por que Buffer, e só Photo Mode

A API do TikTok não entrega a biblioteca de áudio. Sem som o Photo Mode perde o alcance; o
Buffer publica o carrossel de fotos e o TikTok acrescenta o som recomendado, que é o que a
UI já faz. Reel/vídeo fica de fora de propósito nesta primeira integração.

O GraphQL do Buffer (`TikTokPostMetadataInput`) só tem `title` (post de foto) e
`isAiGenerated` (vídeo). Não invente `autoAddMusic`: a mutation quebra.

## O que você precisa

1. Conta Buffer com os **dois** TikToks conectados (`@devblaugrana` e `@futgibi`)
2. Chave em Buffer → **API settings**
3. URL pública HTTPS das imagens até a hora do post (Buffer **não aceita upload de arquivo**)

### Hospedar as imagens (escolha uma)

**a) Cloudinary (recomendado).** Conta grátis, upload unsigned:

1. cloudinary.com → Settings → Upload → **Upload presets** → crie um **Unsigned**
2. Anote o **cloud name** e o **nome do preset**

**b) O studio alcançável de fora** (túnel HTTPS) até o Buffer buscar de novo na hora do
agendamento. URL estável, sem expirar.

PNG o TikTok recusa. O studio converte cada slide pra JPEG (lado longo ≤ 1080) antes de
hospedar.

## Conectar, no terminal

```bash
cd saga-fut-studio
BUFFER_ACCESS_TOKEN=cole-a-chave \
CLOUDINARY_CLOUD_NAME=seu-cloud \
CLOUDINARY_UPLOAD_PRESET=seu-preset \
node scripts/buffer-conectar.mjs
```

Ou, com túnel:

```bash
BUFFER_ACCESS_TOKEN=cole-a-chave \
BUFFER_PUBLIC_BASE=https://seu-tunel.exemplo \
node scripts/buffer-conectar.mjs
```

O comando lista os TikToks da conta, casa pelo handle com os dois canais da casa e grava
`~/.sagafut/buffer.json` (fora do repositório, permissão 600). Se um dos dois não aparecer,
conecte o perfil em Buffer → Channels e rode de novo.

Não passe o token como `--token=`: argumento fica no histórico do shell.

## Usar

No studio, quadrinho → aba **Publicar**. Com os slides montados:

1. Data e hora no topo (as mesmas do resto da fila)
2. **Agendar Photo Mode**
3. O post vai pro TikTok do **canal da peça**: `canal: "futgibi"` → `@futgibi`; ausência
   vale `@devblaugrana`

O som o TikTok põe sozinho. A API não deixa escolher a faixa da biblioteca.

O bloco passa a mostrar o handle e a hora, e não deixa agendar de novo: um segundo envio
criaria um segundo post. Pra refazer, apague no Buffer e limpe o campo `tiktokBuffer` da peça.

## O que NÃO fazer

- **Não commite `~/.sagafut/buffer.json`.**
- **Não use URL assinada / que expira** (S3 pre-signed, Cloudinary signed). O Buffer busca
  a imagem de novo na hora do post, horas ou dias depois.
- **Não apague `tiktokBuffer` só pra "reagendar"** sem apagar o post no Buffer.
- **Não espere o YouTube e o TikTok irem pro mesmo perfil por mágica.** Cada um tem o
  próprio mapa de canal (`youtube-<canal>.json` e `buffer.json` → `tiktok.<canal>`).
