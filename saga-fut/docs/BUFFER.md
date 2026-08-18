# Agendar TikTok e Instagram pelo Buffer

> Uma vez só. Depois a aba **Publicar** do quadrinho agenda Photo Mode no TikTok e, no
> Instagram, carrossel de fotos **ou** Reel, no perfil certo (`@devblaugrana` ou `@futgibi`).

Escrito em 15/08/2026; Instagram em 18/08/2026.

## Por que Buffer

A API nativa do TikTok e do Instagram não entrega a biblioteca de áudio. O Buffer publica; o
som automático/recomendado entra pelo lado da rede. Reel e carrossel no Instagram **têm** tipo
na API (`metadata.instagram.type`: `post` ou `reel`). No TikTok Photo Mode não há campo de
música: não invente `autoAddMusic`.

## O que você precisa

1. Conta Buffer com os **dois TikToks e os dois Instagrams** conectados (mesmo handle da casa)
2. Chave em Buffer → **API settings**
3. URL pública HTTPS até a hora do post (Buffer **não aceita upload de arquivo**): Cloudinary
   unsigned, ou `BUFFER_PUBLIC_BASE`

PNG vira JPEG em `quadrinhos/<id>/buffer/` (fora de `posts/`, senão a cópia pro celular mistura).
O Reel sobe o `video.mp4` 9:16. O preset unsigned precisa aceitar **imagem e vídeo** (tipo de
recurso: ambos), senão o carrossel passa e o Reel cai.

## Conectar, no terminal

Se o token já está em `~/.sagafut/buffer.json`, basta:

```bash
cd saga-fut-studio
node scripts/buffer-conectar.mjs
```

Primeira vez, ou para gravar Cloudinary:

```bash
BUFFER_ACCESS_TOKEN=cole-a-chave \
CLOUDINARY_CLOUD_NAME=seu-cloud \
CLOUDINARY_UPLOAD_PRESET=seu-preset \
node scripts/buffer-conectar.mjs
```

O comando lista TikTok e Instagram, casa pelo handle e grava o mapa. Se um perfil não aparecer,
conecte em Buffer → Channels e rode de novo.

## Usar

Quadrinho → **Publicar**, slides montados, data e hora no topo:

- **TikTok:** Agendar Photo Mode
- **Instagram:** Agendar carrossel (fotos) e/ou Agendar Reel (vídeo 9:16). Os dois podem ir
  na mesma peça, em posts separados no Buffer
- O destino é o canal da peça: `canal: "futgibi"` → `@futgibi`; ausência → `@devblaugrana`

Horário customizado aparece no **Calendário** do Buffer, não na Fila. Filtre o canal certo.

Pra refazer: apague o post no Buffer e limpe `tiktokBuffer` ou `instagramBuffer.carrossel` /
`instagramBuffer.reel` na peça.

## O que NÃO fazer

- **Não commite `~/.sagafut/buffer.json`.**
- **Não use URL assinada / que expira.**
- **Não apague o campo só pra reagendar** sem apagar o post no Buffer.
