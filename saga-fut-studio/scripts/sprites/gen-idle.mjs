// gen-idle.mjs <baseSlug> [kit] [numero] [dir=right|left] [nota] [refRel]
// Folha 2x2 de IDLE (respiração: ombros sobem/descem + uma piscada), fundo magenta.
// Irmã do gen-walk/gen-run. Prompt em config.mjs (promptIdle).
//
// POR QUE EXISTE: personagem parado era PNG ESTÁTICO na tela (o "cutout fantasma"). Esta é a
// biblioteca de melhor retorno do projeto: UM render por personagem passa a valer em TODO vídeo
// em que ele aparece, e o composer liga o ciclo sozinho quando encontra a sprite.
//
// dir='left' gera JÁ virado pra esquerda (personagem COM número, que não pode ser espelhado).
// Saída: saga-fut/personagens/<slug>/rigs/idle/_sheet.png  (fatia com slice-idle.mjs)
import { gerarImagem as generateImage } from './modelo.mjs';   // roteia pro modelo efetivo (studio ou --modelo=)
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { CONTEUDO, promptIdle } from './config.mjs';
import { duasReferencias } from './referencia.mjs';
import { exigirPorta } from './porta.mjs';
import { rigMeta } from '../../shared/personagem.mjs';
import { writeFile } from 'node:fs/promises';

exigirPorta('gen-idle.mjs', 'node scripts/asset.mjs idle <slug>');

const [, , SLUG, KIT_RAW = '', NUM_RAW = '', NOTA_RAW = '', REFREL_RAW] = process.argv;
if (!SLUG) { console.error('uso: node gen-idle.mjs <baseSlug> [kit] [num] [nota] [refRel]'); process.exit(1); }
const limpa = (v) => (!v || v === '-' ? '' : v);
const KIT = limpa(KIT_RAW), NUM = limpa(NUM_RAW), NOTA = limpa(NOTA_RAW), REFREL = limpa(REFREL_RAW);
// SEMPRE PRA DIREITA, como o gen-walk e o gen-run: olhar pra esquerda é o motor espelhando, e assim
// cabeça e corpo viram JUNTOS. Ver personagem.mjs.
const DIR = 'right';
const OUTREL = `personagens/${SLUG}/rigs/idle/_sheet.png`, outAbs = path.join(CONTEUDO, OUTREL);
await mkdir(path.dirname(outAbs), { recursive: true });

// DUAS REFERÊNCIAS, como toda geração da casa: a respiração do personagem-padrão + este personagem.
// A montagem mora em referencia.mjs (ver o porquê lá).
//
// Havia aqui um bug silencioso que este centralizador elimina: o cálculo da folha de pose fazia
// `{ slug: referenciaDePose('idle', SLUG) }`, guardando o OBJETO inteiro no lugar do slug, então o
// caminho virava `personagens/[object Object]/rigs/idle/_sheet.png`, nunca existia, e o idle era o
// único rig que NUNCA recebeu referência de pose. Nada reclamava: a geração seguia com uma imagem
// a menos e saía plausível.
const _existe = (rel) => existsSync(path.join(CONTEUDO, rel));
const { refs: _rel, poseDe, identidadeEh } = duasReferencias('idle', SLUG, _existe, { identidade: REFREL || null });
const _refs = _rel.map((r) => path.join(CONTEUDO, r));
const _temPose = !!poseDe;
console.log(`   refs: ${_temPose ? `POSE de ${poseDe.slug}/${poseDe.tipo} + ` : ''}${identidadeEh} de ${SLUG}`);
const prompt = await promptIdle(OUTREL, { kit: KIT, num: NUM, dir: DIR, nota: NOTA, temPose: _temPose });
console.log('>>> idle', SLUG, DIR); const t0 = Date.now();
await generateImage({ cwd: CONTEUDO, prompt, referencias: _refs, outAbs, timeoutMs: 600000 });
console.log('OK idle', SLUG, Math.round((Date.now() - t0) / 1000) + 's');

// direção declarada junto da folha; hoje é sempre 'right' (ver personagem.mjs)
await writeFile(path.join(CONTEUDO, rigMeta(SLUG, 'idle')), JSON.stringify({ slug: SLUG, tipo: 'idle', dir: DIR }, null, 2) + '\n');
