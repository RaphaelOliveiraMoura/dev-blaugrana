#!/usr/bin/env node
// GRAVA O `aperto` DE CADA POSE NO ACERVO — pra o personagem não mudar de tamanho entre um beat e
// outro do mesmo vídeo.
//
//   node scripts/sprites/medir-escala-pose.mjs <slug>       # um personagem
//   node scripts/sprites/medir-escala-pose.mjs --acervo     # todo mundo
//   node scripts/sprites/medir-escala-pose.mjs --acervo --so-listar   # mede e não grava
//
// O número mora no `poses/_meta.json`, ao lado da arte, e o motor o aplica no `w` na hora de
// desenhar. É a mesma solução que as folhas de ação já tinham, e mora no MESMO lugar de propósito:
// o dado viaja com o asset, então qualquer vídeo que use aquele personagem já nasce corrigido, sem
// ninguém lembrar de nada no roteiro. Ver `escala-pose.mjs` pra por que a régua é olhos-aos-pés.
//
// Roda de graça, não gera imagem nenhuma, e é barato o bastante pra chamar depois de todo `asset
// pose`. Enquanto o campo não existir, o motor não corrige nada — então rodar isto só melhora.
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { apertoContraIdle, MIN_APERTO } from './escala-pose.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTEUDO = path.resolve(__dirname, '../../../saga-fut');
const PERS = path.join(CONTEUDO, 'personagens');

const argv = process.argv.slice(2);
const soListar = argv.includes('--so-listar') || argv.includes('--comparar');
const comparar = argv.includes('--comparar');
const alvo = argv.find((a) => !a.startsWith('--'));

// A FOLHA DE PROVA: o idle e cada pose lado a lado, DESENHADOS na altura que o motor vai usar.
//
// Existe porque o número sozinho não convence e não deveria: o que se quer saber é se o personagem
// tem o mesmo tamanho, e isso é uma pergunta pro olho. Aqui a coluna da esquerda é o idle, e cada
// pose aparece duas vezes — como está hoje e com o `aperto` aplicado. Se a versão corrigida ficar
// do tamanho do idle, o número está certo.
//
// É também o caminho pras 12 poses que a régua não mede: dá pra escolher o fator olhando e
// escrever à mão no `_meta.json`.
async function folhaDeProva(slug, linhas) {
  const dir = path.join(PERS, slug);
  const idle = path.join(dir, 'rigs', 'idle', 'i1.png');
  const ALT = 300, PAD = 10, ROT = 26;
  const desenhar = async (arq, fator) => {
    const meta = await sharp(arq).metadata();
    const h = Math.round(ALT * (fator || 1));
    return sharp(arq).resize({ height: h, fit: 'inside' }).png().toBuffer();
  };
  const comps = [];
  let x = PAD;
  const largCol = 200;
  const rotulo = (txt, x, y, w) => ({
    input: Buffer.from(`<svg width="${w}" height="${ROT}"><rect width="100%" height="100%" fill="#1b1b1b"/>` +
      `<text x="6" y="18" font-family="monospace" font-size="13" fill="#fff">${txt}</text></svg>`),
    left: x, top: y,
  });
  // coluna 1: o idle, a referência
  comps.push({ input: await desenhar(idle, 1), left: x, top: ROT + PAD });
  comps.push(rotulo('IDLE (referência)', x, PAD, largCol));
  x += largCol + PAD;
  for (const l of linhas) {
    const arq = path.join(dir, 'poses', l.nome + '.png');
    comps.push({ input: await desenhar(arq, 1), left: x, top: ROT + PAD });
    comps.push(rotulo(l.nome + ' HOJE', x, PAD, largCol));
    x += largCol + PAD;
    if (l.aperto > 1) {
      comps.push({ input: await desenhar(arq, l.aperto), left: x, top: ROT + PAD });
      comps.push(rotulo(l.nome + ' x' + l.aperto.toFixed(2), x, PAD, largCol));
      x += largCol + PAD;
    }
  }
  const W = x, H = ROT + PAD * 2 + Math.round(ALT * 1.6);
  const out = path.join(dir, 'poses', '_escala.png');
  await sharp({ create: { width: W, height: H, channels: 4, background: { r: 22, g: 22, b: 26, alpha: 1 } } })
    .composite(comps).png().toFile(out);
  return path.relative(CONTEUDO, out);
}

async function lerJson(f) { try { return JSON.parse(await fs.readFile(f, 'utf8')); } catch { return null; } }

async function medirPersonagem(slug) {
  const base = path.join(PERS, slug);
  const idle = path.join(base, 'rigs', 'idle', 'i1.png');
  const posesDir = path.join(base, 'poses');
  if (!existsSync(idle) || !existsSync(posesDir)) return [];

  const poses = (await fs.readdir(posesDir)).filter((f) => f.endsWith('.png') && !f.startsWith('_')).sort();
  if (!poses.length) return [];

  const metaArq = path.join(posesDir, '_meta.json');
  const meta = (await lerJson(metaArq)) || {};
  const linhas = [];
  for (const arq of poses) {
    const nome = arq.replace(/\.png$/, '');
    const r = await apertoContraIdle(path.join(posesDir, arq), idle).catch(() => null);
    if (!r) { linhas.push({ slug, nome, aperto: null, nota: 'sem olhos visíveis: não medido' }); continue; }
    // preserva o que já estava no meta (orientação) e acrescenta a escala
    meta[nome] = { ...(meta[nome] || {}), aperto: r.aperto, apertoRef: r.ref, apertoMedido: r.medido };
    if (r.motivo) meta[nome].apertoNota = r.motivo; else delete meta[nome].apertoNota;
    linhas.push({ slug, nome, ...r });
  }
  if (!soListar) await fs.writeFile(metaArq, JSON.stringify(meta, null, 2));
  return linhas;
}

async function main() {
  const slugs = alvo ? [alvo]
    : (await fs.readdir(PERS, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name).sort();

  const todas = [];
  for (const slug of slugs) todas.push(...await medirPersonagem(slug).catch(() => []));

  const corrigidas = todas.filter((l) => l.aperto > 1);
  const semMedida = todas.filter((l) => l.aperto == null);
  const comNota = todas.filter((l) => l.motivo);

  console.log(`\nESCALA DAS POSES — ${todas.length} pose(s) medida(s) contra o idle do próprio personagem\n`);
  for (const l of corrigidas.sort((a, b) => b.aperto - a.aperto)) {
    console.log(`  CORRIGE ${l.aperto.toFixed(2)}x  ${(l.slug + '/' + l.nome).padEnd(34)} olhos-aos-pés ${l.medido} contra ${l.ref} no idle`);
  }
  for (const l of comNota) {
    console.log(`  deixa    1.00x  ${(l.slug + '/' + l.nome).padEnd(34)} ${l.motivo}`);
  }
  if (comparar) {
    const porSlug = new Map();
    for (const l of todas) { if (!porSlug.has(l.slug)) porSlug.set(l.slug, []); porSlug.get(l.slug).push(l); }
    for (const [slug, linhas] of porSlug) {
      const arq = await folhaDeProva(slug, linhas.filter((l) => l.aperto != null)).catch((e) => 'falhou: ' + e.message);
      console.log(`  folha de prova: ${arq}`);
    }
  }
  if (semMedida.length) console.log(`\n  ${semMedida.length} pose(s) sem olhos visíveis, não medidas (ficam sem correção): ${semMedida.slice(0, 6).map((l) => l.slug + '/' + l.nome).join(', ')}${semMedida.length > 6 ? '…' : ''}`);
  console.log(`\n  ${corrigidas.length} pose(s) passam a ser corrigidas (acima de ${Math.round((MIN_APERTO - 1) * 100)}%).${soListar ? ' NADA foi gravado (--so-listar).' : ''}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e.message); process.exit(1); });
