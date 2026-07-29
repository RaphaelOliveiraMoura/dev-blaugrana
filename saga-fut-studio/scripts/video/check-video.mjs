// check-video.mjs <id> — PREFLIGHT do vídeo inteiro, antes de renderizar. Roda o composer de
// verdade (montarCena) e confere que TODO sprite/cenário que ele referencia existe no disco,
// mais os campos que travam publicação/formato. É o gate único "esse vídeo tá pronto pra render".
// Sai com código !=0 se houver FAIL. NÃO renderiza nada.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { VIDEO_DIR, videoDir, CONTEUDO_DIR } from '../../server/config.mjs';
import { montarCena } from '../../server/video/montar-cena.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SFX_DIR = path.resolve(__dirname, '../../remotion/assets/sfx');

const ID = process.argv[2];
if (!ID) { console.error('uso: node check-video.mjs <id>'); process.exit(2); }

const problemas = [];
const add = (nivel, msg) => problemas.push({ nivel, msg });
const existe = (abs) => fs.access(abs).then(() => true).catch(() => false);

// --- carrega o dado ---
let video;
try { video = JSON.parse(await fs.readFile(path.join(VIDEO_DIR, ID + '.json'), 'utf-8')); }
catch (e) { console.error(`FAIL não consegui ler data/videos/${ID}.json: ${e.message}`); process.exit(1); }

const base = videoDir(ID);
const kf = (f) => path.join(base, 'kf', f);
// bg do composer: 'cenario-<f>.png' <- cenario/<f>.png ; 'cenario.mp4' <- cenario/anim.mp4
const cenFromBg = (src) => src === 'cenario.mp4'
  ? path.join(base, 'cenario', 'anim.mp4')
  : path.join(base, 'cenario', src.replace(/^cenario-/, ''));

// --- roda o composer (isso já valida que o JSON não quebra a montagem) ---
let scene;
try { ({ scene } = montarCena(video)); }
catch (e) { add('FAIL', `composer (montarCena) quebrou: ${e.message}`); }

// --- coleta todos os assets referenciados pela cena ---
const sprites = new Set(), cenarios = new Set();
if (scene) (scene.shots || []).forEach((shot, i) => {
  // REGRA (vídeo NUNCA é imagem parada): todo shot precisa de personagem ANIMADO. Cena sem sprite
  // = fundo estático/keyframe completo renderizado como imagem — reprovado pro SagaFut. Interação
  // apertada (abraço, briga) entra como keyframe COMPOSTO em MAGENTA = sprite (poses ciclando), não bg.
  if (!(shot.chars || []).length && !shot.clock && !shot.board) add('FAIL', `shot ${i} sem personagens nem elemento animado (cena estática/imagem completa é proibida em vídeo — use sprites animados ou um elemento animado como relógio)`);
});
if (scene) for (const shot of scene.shots || []) {
  if (shot.bg?.src) cenarios.add(shot.bg.src);
  for (const c of shot.chars || []) {
    if (c.src) sprites.add(c.src);
    for (const p of c.poses || []) {
      if (p.src) sprites.add(p.src);
      for (const fr of p.cycle || []) sprites.add(fr);
    }
  }
}

// --- confere existência ---
for (const s of [...sprites].sort()) if (!(await existe(kf(s)))) add('FAIL', `sprite faltando: kf/${s}`);
for (const c of [...cenarios].sort()) if (!(await existe(cenFromBg(c)))) add('FAIL', `cenário faltando: ${path.relative(base, cenFromBg(c))} (bg "${c}")`);

// --- capa da lista + base do cenário ---
if (video.cenario?.base) {
  if (!(await existe(path.join(CONTEUDO_DIR, video.cenario.base)))) add('FAIL', `cenario.base não existe: ${video.cenario.base}`);
} else add('WARN', 'sem cenario.base (a lista de vídeos usa como capa)');

// --- publicação / formato / moldura ---
if (!video.publicacao?.titulo?.trim()) add('FAIL', 'publicacao.titulo vazio (obrigatório)');
if (!video.publicacao?.legenda?.trim()) add('FAIL', 'publicacao.legenda vazia (obrigatória)');
if (video.formato !== '9:16') add('WARN', `formato "${video.formato || '—'}" (padrão de vídeo é 9:16)`);
if (!video.moldura) add('WARN', 'moldura desligada (padrão dos quadrinhos usa moldura+estrela)');

// --- áudio (só se o vídeo não for mudo) ---
const semAudio = video.semAudio === true;
if (!semAudio && scene) {
  const { audio } = montarCena(video);
  if (audio.music && !(await existe(path.join(CONTEUDO_DIR, audio.music)))) add('FAIL', `trilha faltando: ${audio.music}`);
  for (const s of audio.sfx || []) if (!(await existe(path.join(SFX_DIR, s.src)))) add('FAIL', `sfx faltando: ${s.src}`);
}

// --- relatório ---
const fails = problemas.filter((p) => p.nivel === 'FAIL');
console.log(`\n== check-video ${ID} ==`);
console.log(`sprites referenciados: ${sprites.size} · cenários: ${cenarios.size}`);
if (!problemas.length) console.log('OK  tudo pronto pra render.');
else for (const p of problemas) console.log(`${p.nivel === 'FAIL' ? 'FAIL' : 'WARN'} ${p.msg}`);
console.log(`\n${fails.length ? fails.length + ' FAIL' : 'sem FAIL'} · ${problemas.length - fails.length} WARN`);
console.log('lembrete: check-video NÃO confere orientação do olhar nem a qualidade do sprite (rode check-sprite).');
process.exit(fails.length ? 1 : 0);
