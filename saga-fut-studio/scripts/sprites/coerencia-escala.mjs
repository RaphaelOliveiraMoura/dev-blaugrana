#!/usr/bin/env node
// O PERSONAGEM TEM O MESMO TAMANHO EM TODAS AS PEÇAS DELE?
//
//   node scripts/sprites/coerencia-escala.mjs <slug>      # as peças de um personagem, medidas
//   node scripts/sprites/coerencia-escala.mjs --acervo    # todo mundo, só quem está fora
//   node scripts/sprites/coerencia-escala.mjs --acervo --corrigir   # grava o aperto que falta
//
// ## Por que isto existe, e por que não bastava medir a pose (14/08/2026)
//
// O `aperto` conserta uma peça de cada vez, e o projeto tinha DUAS RÉGUAS medindo a mesma coisa:
// as folhas de ação usam a LARGURA DA CABEÇA (slice-acao) e as poses passaram a usar OLHOS-AOS-PÉS
// (medir-escala-pose). Duas réguas discordam por construção, e discordaram feio:
//
//   rodri-riso/andar-barca   corpo 427px (já 4% MAIOR que o idle)  ->  aperto gravado 1.0676
//   rodri-riso/bola-de-ouro  corpo 388px (6% menor)                ->  aperto gravado 1
//
// Na tela: ele CHEGA andando a ~456px efetivos e vira pose a 388px. 18% de encolhimento no meio da
// mesma cena, e o `aperto` da caminhada não só não consertou como AMPLIFICOU o erro, porque a régua
// da largura-da-cabeça leu errado uma folha que estava quase certa.
//
// Consertar a régua não bastaria: enquanto existir mais de uma, e enquanto cada peça for medida
// sozinha, nada garante que o CONJUNTO feche. Este verificador olha o conjunto — o tamanho EFETIVO
// (o que o motor vai desenhar, aperto já aplicado) de cada peça do personagem — e reprova quando a
// amplitude passa do limite. É a diferença entre "cada peça está certa" e "o personagem é um só".
//
// A referência é o IDLE, porque é a folha em que ele está em pé, parado e inteiro, e é o que o
// resto do projeto já usa como padrão-ouro.
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { olhosAosPes } from './escala-pose.mjs';
import { larguraCabeca } from './config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTEUDO = path.resolve(__dirname, '../../../saga-fut');
const PERS = path.join(CONTEUDO, 'personagens');

// amplitude máxima aceita entre as peças de um personagem, já com o aperto aplicado. 8% é o mesmo
// limiar do medidor de pose: abaixo disso o olho não separa, acima ele vê o personagem "mudar".
// 5%, não 8%: o Raphael viu na tela uma diferença de 5,4% (o Rodri chegando a 261px e virando pose
// a 247px) que o limiar antigo aprovava. O olho compara os dois momentos DA MESMA CENA, e nessa
// comparação direta ele é mais sensível do que era ao comparar peças soltas no acervo.
export const MAX_AMPLITUDE = 0.05;

// AS DUAS RÉGUAS JUNTAS DIZEM QUANDO UMA DELAS NÃO VALE.
//
// Olhos-aos-pés só mede escala enquanto o personagem está EM PÉ: no carrinho, no espalmar do
// goleiro, no tombo, o corpo sai da vertical e a distância encurta de verdade — não é o desenho que
// está menor. A largura da cabeça não sofre disso (a cabeça não muda com a pose), mas ela erra
// quando há coisa acima da cabeça, que é o caso da taça.
//
// Nenhuma das duas serve sozinha. Juntas servem: quando CONCORDAM, o personagem está em pé e a
// medida vale; quando DISCORDAM muito, o corpo saiu da vertical e a peça sai da conta em vez de
// virar um falso positivo. Sem isto o verificador acusava `defender` em -33% — e aquele goleiro
// está esticado no chão, não encolhido.
const DISCORDANCIA = 0.12;

async function medidasDe(arq) {
  const { data, info } = await sharp(arq).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let mnX = 1e9, mnY = 1e9, mxX = -1, mxY = -1;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    if (data[(y * info.width + x) * 4 + 3] > 10) {
      if (x < mnX) mnX = x; if (x > mxX) mxX = x; if (y < mnY) mnY = y; if (y > mxY) mxY = y;
    }
  }
  if (mxY < 0) return null;
  return { cabeca: larguraCabeca(data, info.width, { minX: mnX, minY: mnY, maxX: mxX, maxY: mxY }) };
}

async function lerJson(f) { try { return JSON.parse(await fs.readFile(f, 'utf8')); } catch { return null; } }

/** Toda peça do personagem com o tamanho EFETIVO (medida x aperto gravado). */
export async function pecasDe(slug) {
  const base = path.join(PERS, slug);
  const out = [];
  const push = async (arq, nome, aperto, onde) => {
    if (!existsSync(arq)) return;
    const medido = await olhosAosPes(arq).catch(() => null);
    if (medido == null) return;                       // sem olhos: não dá pra comparar, fica fora
    const m = await medidasDe(arq).catch(() => null);
    out.push({ nome, onde, medido, cabeca: m?.cabeca ?? null, aperto: aperto || 1, efetivo: medido * (aperto || 1) });
  };

  // rigs: o primeiro quadro basta (a folha inteira tem escala única, garantida pelo slicer)
  for (const tipo of ['idle', 'andar', 'correr']) {
    const pre = tipo === 'idle' ? 'i' : tipo === 'andar' ? 'w' : 'r';
    await push(path.join(base, 'rigs', tipo, `${pre}1.png`), `rig/${tipo}`, 1, 'rigs');
  }
  // ações: o `aperto` vem do _meta da própria folha (régua da largura da cabeça)
  const acoesDir = path.join(base, 'acoes');
  for (const nome of (await fs.readdir(acoesDir).catch(() => []))) {
    const meta = await lerJson(path.join(acoesDir, nome, '_meta.json'));
    await push(path.join(acoesDir, nome, `${nome}1.png`), `acao/${nome}`, meta?.aperto, 'acoes');
  }
  // poses: o `aperto` vem do _meta único da pasta (régua olhos-aos-pés)
  const posesDir = path.join(base, 'poses');
  const metaPoses = (await lerJson(path.join(posesDir, '_meta.json'))) || {};
  for (const arq of (await fs.readdir(posesDir).catch(() => []))) {
    if (!arq.endsWith('.png') || arq.startsWith('_')) continue;
    const nome = arq.replace(/\.png$/, '');
    await push(path.join(posesDir, arq), `pose/${nome}`, metaPoses[nome]?.aperto, 'poses');
  }
  return out;
}

/** { ok, amplitude, ref, pecas[], fora[] } — `ref` é o idle, que é o padrão-ouro da casa. */
export async function conferir(slug) {
  const pecas = await pecasDe(slug);
  if (pecas.length < 2) return { ok: null, motivo: 'menos de 2 peças medíveis', pecas };
  const idle = pecas.find((p) => p.nome === 'rig/idle');
  if (!idle) return { ok: null, motivo: 'sem idle: falta a referência', pecas };

  for (const p of pecas) {
    p.desvio = p.efetivo / idle.efetivo - 1;
    // AS DUAS RÉGUAS DISCORDAM POR DOIS MOTIVOS OPOSTOS, e o SINAL da discordância diz qual é.
    //
    //   a cabeça "encolheu" MUITO MAIS que o corpo  -> não é a cabeça, é um PROP acima dela (taça,
    //        bola de ouro). A régua da cabeça está lendo o objeto; olhos-aos-pés vale, JULGA.
    //   o corpo encurtou MUITO MAIS que a cabeça    -> o corpo saiu da vertical (carrinho, tombo,
    //        goleiro esticado). Aí olhos-aos-pés não mede escala; IGNORA.
    //
    // A primeira versão disto olhava só o MÓDULO da diferença e tratava os dois como "não
    // vertical" — com isso a `bola-de-ouro` saiu da conta e o verificador aprovou um personagem
    // que ainda encolhia 5% ao trocar de pose, que foi exatamente o que sobrou aparecendo na tela.
    const fO = idle.medido / p.medido;
    const fC = (idle.cabeca && p.cabeca) ? idle.cabeca / p.cabeca : null;
    p.vertical = fC == null ? true : !(fO > fC + DISCORDANCIA);
  }
  const julgadas = pecas.filter((p) => p.vertical);
  const fora = julgadas.filter((p) => Math.abs(p.desvio) > MAX_AMPLITUDE);
  const min = Math.min(...julgadas.map((p) => p.efetivo)), max = Math.max(...julgadas.map((p) => p.efetivo));
  return { ok: !fora.length, amplitude: max / min - 1, ref: idle.efetivo, pecas, fora,
    ignoradas: pecas.filter((p) => !p.vertical) };
}

async function main() {
  const argv = process.argv.slice(2);
  const corrigir = argv.includes('--corrigir');
  const alvo = argv.find((a) => !a.startsWith('--'));

  // `--corrigir` EXIGE UM PERSONAGEM. Rodar no acervo inteiro parece o atalho óbvio e foi um erro
  // caro: a régua tem falso positivo conhecido (o `khelaifi-riso` é uma túnica longa sem pernas
  // visíveis, e olhos-aos-pés acusa 15% de diferença onde a folha de prova mostra os dois do mesmo
  // tamanho), e a correção em massa gravou esse 15% como verdade em 19 peças de uma vez. Reverter
  // custou refatiar tudo, e três não voltaram porque a folha reprova em outros gates.
  //
  // Um personagem por vez obriga a olhar a folha (`medir-escala-pose <slug> --comparar`) antes de
  // aceitar, que é o padrão da casa pra tudo que o olho julga melhor que o número.
  if (corrigir && !alvo) {
    console.error('FAIL --corrigir precisa de um personagem: `coerencia-escala.mjs <slug> --corrigir`.');
    console.error('     Em massa não: a régua erra em quem não tem perna visível (túnica, sobretudo),');
    console.error('     e gravar o erro em todo o acervo de uma vez é mais caro que o defeito.');
    console.error('     Veja a folha antes: node scripts/sprites/medir-escala-pose.mjs <slug> --comparar');
    process.exit(2);
  }
  const slugs = alvo ? [alvo]
    : (await fs.readdir(PERS, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name).sort();

  const pct = (v) => (v >= 0 ? '+' : '') + (v * 100).toFixed(1) + '%';
  let ruins = 0, medidos = 0;
  for (const slug of slugs) {
    const r = await conferir(slug).catch(() => ({ ok: null }));
    if (r.ok === null) continue;
    medidos++;
    if (r.ok && alvo == null) continue;                 // no acervo, só mostra quem está fora
    if (!r.ok) ruins++;
    console.log(`\n${slug}  ${r.ok ? 'coerente' : 'AMPLITUDE ' + pct(r.amplitude)}  (idle = ${Math.round(r.ref)}px)`);
    for (const p of r.pecas.filter((x) => x.vertical).sort((a, b) => b.efetivo - a.efetivo)) {
      const marca = Math.abs(p.desvio) > MAX_AMPLITUDE ? '  <-- fora' : '';
      const ap = p.aperto !== 1 ? ` x${p.aperto.toFixed(3)}` : '';
      console.log(`   ${p.nome.padEnd(24)} corpo ${String(p.medido).padStart(4)}${ap.padEnd(9)} efetivo ${String(Math.round(p.efetivo)).padStart(4)}  ${pct(p.desvio)}${marca}`);
    }
    if (r.ignoradas.length) console.log(`   (fora da conta, o corpo não está na vertical: ${r.ignoradas.map((p) => p.nome).join(', ')})`);
    // CORRIGIR = gravar o aperto que faz a peça bater com o idle, pela MESMA régua de todas as
    // outras. Só mexe em `acoes/` (o `poses/_meta.json` já sai do medidor certo) e só onde a peça
    // é medível: onde a régua não vê, ela não opina.
    if (corrigir && !r.ok) {
      for (const p of r.fora) {
        const novo = +(r.ref / p.medido).toFixed(4);
        if (p.nome.startsWith('acao/')) {
          const arq = path.join(PERS, slug, 'acoes', p.nome.slice(5), '_meta.json');
          const meta = await lerJson(arq); if (!meta) continue;
          meta.aperto = novo;
          meta.apertoRegua = 'olhos-aos-pes';   // deixa registrado QUAL régua decidiu este número
          await fs.writeFile(arq, JSON.stringify(meta, null, 2));
        } else if (p.nome.startsWith('pose/')) {
          // POSE TAMBÉM: o medidor de pose tem o seu próprio limiar, e o que sobra abaixo dele
          // ainda pode desequilibrar o conjunto. Quem manda no fim é o conjunto.
          const arq = path.join(PERS, slug, 'poses', '_meta.json');
          const meta = (await lerJson(arq)) || {};
          const nome = p.nome.slice(5);
          meta[nome] = { ...(meta[nome] || {}), aperto: novo, apertoRegua: 'olhos-aos-pes' };
          await fs.writeFile(arq, JSON.stringify(meta, null, 2));
        } else { continue; }                    // rig não tem `aperto`: o conserto é regerar a folha
        console.log(`   corrigido: ${p.nome} aperto ${p.aperto.toFixed(3)} -> ${novo.toFixed(3)}`);
      }
    }
  }
  console.log(`\n${medidos} personagem(ns) medido(s) · ${ruins} com peças fora de ${Math.round(MAX_AMPLITUDE * 100)}%\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e.message); process.exit(1); });
