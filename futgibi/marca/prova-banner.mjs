// Folha de prova dos banners: o que cada plataforma REALMENTE mostra.
//
// Banner e o caso classico de aprovar a imagem errada. No YouTube o desktop mostra os 2560x1440
// inteiros, mas TV e celular mostram so 1546x423 do centro; no X a foto de perfil cobre o canto
// inferior esquerdo. Aprovar olhando o PNG cru e aprovar um enquadramento que quase ninguem ve.
//
//   node marca/prova-banner.mjs
import sharp from '../../saga-fut-studio/node_modules/sharp/dist/index.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const SAIDA = path.join(AQUI, '_prova-banner.png');
const LARGURA = 1200, PAD = 30, GAP = 26;

// --- X: o banner com a foto de perfil sobreposta onde ela cai de verdade
const X_W = 1500, X_H = 500;
const AV = Math.round(X_H * 0.28);          // ~140px no banner de 500 de altura
const ANEL = Math.round(AV * 0.05);
// O ANEL NAO E ENFEITE: a foto de perfil tem fundo verde e o banner tambem, entao sem ele o avatar
// se dissolve no banner e so o cabelo aparece. Quem separa os dois no X e esse anel, que a
// plataforma desenha na cor de fundo da PAGINA (preto no modo escuro, branco no claro).
const avatarCirc = await sharp(path.join(AQUI, 'perfil.png')).resize(AV - ANEL * 2, AV - ANEL * 2)
  .composite([{
    input: Buffer.from(`<svg width="${AV - ANEL * 2}" height="${AV - ANEL * 2}"><circle cx="${(AV - ANEL * 2) / 2}" cy="${(AV - ANEL * 2) / 2}" r="${(AV - ANEL * 2) / 2}" fill="#fff"/></svg>`),
    blend: 'dest-in',
  }]).png().toBuffer()
  .then((miolo) => sharp({ create: { width: AV, height: AV, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([
      { input: Buffer.from(`<svg width="${AV}" height="${AV}"><circle cx="${AV / 2}" cy="${AV / 2}" r="${AV / 2}" fill="#000000"/></svg>`) },
      { input: miolo, left: ANEL, top: ANEL },
    ]).png().toBuffer());

// O RESIZE VEM ANTES, e nao por estilo: o sharp aplica resize antes de composite mesmo quando o
// composite e chamado primeiro, entao colar o avatar e so depois pedir resize poe a peca em
// coordenadas da imagem GRANDE dentro da imagem pequena, e ela sai quase toda fora do quadro.
const escala = (LARGURA - PAD * 2) / X_W;
const xReduzido = await sharp(path.join(AQUI, 'banner-x.png')).resize(LARGURA - PAD * 2).png().toBuffer();
const avMenor = Math.round(AV * escala);
// no X metade do avatar fica pra fora do banner; aqui ele vai ENCOSTADO na base, o que cobre um
// pouco mais do que a realidade e por isso e o teste conservador.
const comX = await sharp(xReduzido)
  .composite([{
    input: await sharp(avatarCirc).resize(avMenor, avMenor).toBuffer(),
    left: Math.round(X_W * 0.02 * escala),
    top: Math.round(X_H * escala) - avMenor,
  }])
  .png().toBuffer();

// --- YouTube: o recorte que a TV e o celular mostram
const YT_W = 2560, YT_H = 1440, SEG_W = 1546, SEG_H = 423;
const ytSeguro = await sharp(path.join(AQUI, 'banner-youtube.png'))
  .extract({
    left: Math.round((YT_W - SEG_W) / 2),
    top: Math.round((YT_H - SEG_H) / 2),
    width: SEG_W,
    height: SEG_H,
  })
  .resize(LARGURA - PAD * 2).png().toBuffer();

const hX = (await sharp(comX).metadata()).height;
const hYt = (await sharp(ytSeguro).metadata()).height;
const ROT = 34;
const H = PAD * 2 + hX + hYt + GAP + ROT * 2;

const rotulos = `<svg width="${LARGURA}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <text x="${PAD}" y="${PAD + hX + 24}" font-family="Helvetica" font-size="17" fill="#9aa0a6">X · 1500x500, com a foto de perfil onde ela cobre o banner</text>
  <text x="${PAD}" y="${PAD + hX + ROT + GAP + hYt + 24}" font-family="Helvetica" font-size="17" fill="#9aa0a6">YouTube · os 1546x423 do centro, que é o que TV e celular mostram</text>
</svg>`;

await sharp({ create: { width: LARGURA, height: H, channels: 4, background: { r: 18, g: 18, b: 20, alpha: 1 } } })
  .composite([
    { input: comX, left: PAD, top: PAD },
    { input: ytSeguro, left: PAD, top: PAD + hX + ROT + GAP },
    { input: Buffer.from(rotulos), left: 0, top: 0 },
  ])
  .png().toFile(SAIDA);

console.log('OK ->', SAIDA);
