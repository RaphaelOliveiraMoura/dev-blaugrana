// check-video.mjs <id> — PREFLIGHT do vídeo inteiro, antes de renderizar. Roda o composer de
// verdade (montarCena) e confere que TODO sprite/cenário que ele referencia existe no disco,
// mais os campos que travam publicação/formato. É o gate único "esse vídeo tá pronto pra render".
// Sai com código !=0 se houver FAIL. NÃO renderiza nada.
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { VIDEO_DIR, videoDir, CONTEUDO_DIR } from '../../server/config.mjs';
import { problemasDeAcento, textosFaladosDoVideo } from '../../shared/acentuacao.mjs';
import { montarCena, FORMATO_PADRAO } from '../../server/video/montar-cena.mjs';
import { statusPersonagem } from '../sprites/contratos.mjs';
import { invariantes } from '../../server/video/invariantes.mjs';
import { validarCena } from '../../server/video/validar-cena.mjs';
import { spritesDoRoteiro } from '../../server/video/sprites-do-roteiro.mjs';
import { canvasNormalizado, CANVAS_ESPERADO } from '../sprites/config.mjs';
import { candidatosDoSet, doNomeMotor, VISTAS } from '../../shared/set.mjs';

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
// o cenário pode estar na FICHA do lugar (acervo) ou na pasta do vídeo (legado): a resolução é a
// mesma que o staging usa, senão o preflight aprovaria um caminho e o render procuraria outro.
const cenFromBg = (src) => src === 'cenario.mp4'
  ? path.join(base, 'cenario', 'anim.mp4')
  : candidatosDoSet(CONTEUDO_DIR, ID, src)[0];
const cenExiste = async (src) => {
  if (src === 'cenario.mp4') return existe(path.join(base, 'cenario', 'anim.mp4'));
  for (const c of candidatosDoSet(CONTEUDO_DIR, ID, src)) if (await existe(c)) return true;
  return false;
};
const cenAchado = async (src) => {
  for (const c of candidatosDoSet(CONTEUDO_DIR, ID, src)) if (await existe(c)) return c;
  return null;
};

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
// aspecto esperado POR cenário: um cenário normal tem o aspecto do vídeo; um panorâmico (modo
// MUNDO) tem o aspecto do mundo, que é bem mais largo. Sem isso o check reprovaria o panorâmico.
const aspectoDe = new Map();
if (scene) for (const shot of scene.shots || []) {
  const alvo = shot.mundo ? shot.mundo.w / shot.mundo.h : null;
  if (shot.bg?.src) { cenarios.add(shot.bg.src); if (alvo) aspectoDe.set(shot.bg.src, alvo); }
  // camadas do mundo (fundo distante / cenário do chão / primeiro plano)
  for (const cam of shot.bg?.camadas || []) { cenarios.add(cam.src); if (alvo) aspectoDe.set(cam.src, alvo); }
  for (const c of shot.chars || []) {
    if (c.src) sprites.add(c.src);
    for (const p of c.poses || []) {
      if (p.src) sprites.add(p.src);
      for (const fr of p.cycle || []) sprites.add(fr);
    }
  }
}

// --- confere existência ---
// SPRITE VEM DO ACERVO DO PERSONAGEM (personagens/<slug>/...), não de uma cópia por vídeo. O
// `kf/` do vídeo virou derivado: o render monta a pasta plana na hora, a partir do acervo. Aqui a
// checagem segue o mesmo caminho, senão o preflight reprovaria vídeo íntegro só por não existir
// mais a cópia. `kf/` continua valendo como fonte alternativa (sprite que não é de personagem:
// keyframe composto, clipe .webm).
{
  const origemDe = new Map(spritesDoRoteiro(video).map((s) => [s.nome, s.origem]));
  for (const s of [...sprites].sort()) {
    const acervo = origemDe.get(s);
    const abs = acervo ? path.join(CONTEUDO_DIR, acervo) : null;
    if (abs && await existe(abs)) { await conferirCanvas(abs, acervo); continue; }
    if (await existe(kf(s))) { await conferirCanvas(kf(s), `kf/${s}`); continue; }
    add('FAIL', acervo
      ? `sprite faltando: ${acervo} (o acervo do personagem é a fonte; gere com "asset")`
      : `sprite faltando: kf/${s} (não é de personagem — keyframe composto ou clipe)`);
  }
}

// EXISTIR NÃO BASTA: o sprite tem que estar NORMALIZADO. Este check só perguntava se o arquivo
// estava lá, e por isso 17 imagens CRUAS (1024x1536, fundo magenta, nunca fatiadas) passaram batido
// no acervo — dez delas referenciadas por dois vídeos, que renderizariam retângulos de magenta. O
// arquivo cru chega ali por engano de cópia ou por slice que não rodou; nos dois casos é FAIL, e
// custa uma leitura de cabeçalho PNG por sprite.
async function conferirCanvas(abs, rotulo) {
  const m = await sharp(abs).metadata().catch(() => null);
  if (!m) return add('FAIL', `sprite ilegível: ${rotulo}`);
  if (!canvasNormalizado(m.width, m.height)) {
    add('FAIL', `sprite CRU (nunca fatiado): ${rotulo} está ${m.width}x${m.height}, esperado ${CANVAS_ESPERADO} — `
      + `na tela isso é um retângulo gigante de magenta. Normalize: node scripts/sprites/slice-pose.mjs <arquivo> <arquivo>`);
  }
}
for (const c of [...cenarios].sort()) if (!(await cenExiste(c))) add('FAIL', `cenário faltando: ${c} — procurei em ${candidatosDoSet(CONTEUDO_DIR, ID, c).map((p2) => path.relative(CONTEUDO_DIR, p2)).join(' , ')}`);

// PROPORÇÃO DO CENÁRIO: o cenário é o fundo full-frame; gerado num aspecto diferente do vídeo ele
// estica/corta e a linha do chão sai do lugar (personagem flutuando ou com os pés cortados). Erro
// silencioso — só aparecia no render. Aqui vira FAIL antes de gastar 600 frames.
const aspectoVideo = { '9:16': 9 / 16, '3:4': 3 / 4, '4:5': 4 / 5, '1:1': 1 }[video.formato || FORMATO_PADRAO];
for (const c of [...cenarios].sort()) {
  const abs = await cenAchado(c);
  if (!abs) continue;
  const m = await sharp(abs).metadata().catch(() => null);
  if (!m?.width || !m?.height) continue;
  // a vista DERIVADA (perto/ângulo) não é panorâmica: ela é do tamanho do quadro, porque é outro
  // enquadramento do lugar e não um pedaço do panorama. Sem isto o check reprovaria a ficha certa.
  const { vista } = doNomeMotor(c);
  const derivada = vista && VISTAS[vista] && !VISTAS[vista].panoramica;
  const alvo = derivada ? aspectoVideo : (aspectoDe.get(c) ?? aspectoVideo);
  if (!alvo) continue;
  const a = m.width / m.height;
  if (Math.abs(a - alvo) > 0.02) {
    const comoQuem = aspectoDe.has(c) ? `o mundo panorâmico (${alvo.toFixed(2)})` : `o vídeo ${video.formato} (${alvo.toFixed(2)})`;
    add('FAIL', `cenário ${path.relative(base, abs)} está ${m.width}x${m.height} (${a.toFixed(2)}) mas devia bater com ${comoQuem} — regere/reamostre (resize-cenario.mjs)`);
  }
}

// --- capa da lista + base do cenário ---
if (video.cenario?.base) {
  if (!(await existe(path.join(CONTEUDO_DIR, video.cenario.base)))) add('FAIL', `cenario.base não existe: ${video.cenario.base}`);
} else add('WARN', 'sem cenario.base (a lista de vídeos usa como capa)');

// PERSONAGEM CONGELADO: o motor mostra a pose de maior `in` <= frame, então uma pose parada segura
// a tela até a próxima. Muito tempo assim é o "cutout fantasma" — gente imóvel colada num fundo. O
// composer já avisa o caso extremo (personagem sem animação nenhuma); aqui pega o caso comum, que é
// o beat esticado demais. Conserto: folha de idle (gen-idle), um beat "parado:true", bob ou ação.
// Três limites, porque "parado" não é uma coisa só. `bob` (balanço por código) mantém o SPRITE
// igual, mas um bob de PULO (comemoração, amplitude alta) já é a animação principal da cena e lê
// muito bem; um bob de respiro leve segura bem menos. E figurante pequeno ao FUNDO ninguém repara:
// avisar dele é o ruído que faz o validador inteiro ser ignorado, então só conta quem é grande o
// bastante na tela pra o congelamento incomodar.
const LIMITE_PARADO_S = 2.5, LIMITE_BOB_LEVE_S = 5, LIMITE_BOB_PULO_S = 10;
const FRACAO_RELEVANTE = 0.22;   // largura mínima do personagem (fração do quadro) pra valer aviso
if (scene) {
  const fps = scene.fps || 30;
  const minW = FRACAO_RELEVANTE * (scene.width || 1080);
  (scene.shots || []).forEach((shot, si) => {
    for (const c of shot.chars || []) {
      if ((c.w || 0) < minW) continue;        // figurante ao fundo
      // SPRITE COM DEFORMAÇÃO NÃO ESTÁ PARADA. Esta guarda existe porque um PNG imóvel por muitos
      // segundos lê como poster colado na tela; com `efeito`, a arte inteira está comprimindo,
      // tremendo ou murchando naquele exato trecho, que é o oposto do defeito. Sem esta linha o
      // preflight reclamaria justamente do beat de animação limitada que o vídeo quer.
      if (c.efeito) continue;
      const ampBob = c.bob ? (c.bob.amp ?? 20) : 0;
      let limite = !c.bob ? LIMITE_PARADO_S : (ampBob >= 15 ? LIMITE_BOB_PULO_S : LIMITE_BOB_LEVE_S);
      // pose parada COM VOZ em cima é o formato esquete, não defeito: a referência da casa troca de
      // imagem em vez de animar, e quem segura a cena é a fala. O limite dobra, mas não some, senão
      // um plano de 15s sem nada acontecendo passaria batido.
      if ((shot.balloons || []).some((b) => b.voz)) limite *= 2.4;
      // a última pose vale só até o personagem SUMIR (`vanish`), não até o fim do shot: sem isso,
      // quem sai de cena cedo era acusado de ficar parado o resto do shot inteiro.
      const ateQuando = Math.min(shot.dur, c.vanish ?? shot.dur);
      const ps = [...(c.poses || [])].sort((a, b) => (a.in ?? 0) - (b.in ?? 0));
      for (let i = 0; i < ps.length; i++) {
        if (ps[i].cycle) continue;             // ciclo = animado
        const ini = ps[i].in ?? 0;
        if (ini >= ateQuando) continue;
        const fim = Math.min(ateQuando, i + 1 < ps.length ? (ps[i + 1].in ?? ateQuando) : ateQuando);
        const seg = (fim - ini) / fps;
        if (seg > limite) add('WARN', `shot ${si + 1}: "${ps[i].src}" fica ${seg.toFixed(1)}s PARADA na tela (limite ${limite}s${c.bob ? `, com bob amp ${ampBob}` : ''}) — use folha de idle, beat "parado:true" ou ação animada (gen-acao)`);
      }
    }
  });
}

// CÂMERA FORA DO MUNDO: no modo panorâmico a câmera pode apontar pra além da borda do cenário e
// renderizar TARJA PRETA. O composer clampa, mas o clamp é calculado no enquadramento ALVO enquanto
// a câmera ainda está viajando (num z mais aberto o viewport é maior e a margem que bastava deixa
// de bastar). Só aparecia no render, no primeiro frame. Aqui é conferido frame a frame, de graça.
if (scene) {
  const interp = (t, f) => {
    if (!t || !t.length) return 0;
    if (f <= t[0][0]) return t[0][1];
    const ult = t[t.length - 1];
    if (f >= ult[0]) return ult[1];
    for (let i = 1; i < t.length; i++) { const [a, x] = t[i - 1], [b, y] = t[i]; if (f <= b) return x + (y - x) * ((f - a) / Math.max(1, b - a)); }
    return ult[1];
  };
  const Wv = scene.width, Hv = scene.height;
  let t0 = 0;
  (scene.shots || []).forEach((s, i) => {
    if (s.cam && s.mundo) {
      let pior = null, n = 0;
      for (let f = 0; f < s.dur; f++) {
        const F = t0 + f, z = interp(s.cam.z, F) || 1;
        const x = interp(s.cam.x, F), y = interp(s.cam.y, F);
        const mx = Wv / (2 * z), my = Hv / (2 * z);
        const fora = Math.max(-(x - mx), (x + mx) - s.mundo.w, -(y - my), (y + my) - s.mundo.h);
        if (fora > 1) { n++; if (!pior || fora > pior.fora) pior = { f, fora: Math.round(fora), z: z.toFixed(2) }; }
      }
      if (n) add('FAIL', `shot ${i + 1}: câmera sai do mundo em ${n} frames (pior no f${pior.f}, ${pior.fora}px além da borda com zoom ${pior.z}) — vai renderizar tarja preta`);
    }
    t0 += s.dur - (i > 0 && s.transition && s.transition !== 'none' ? (s.tdur || 10) : 0);
  });
}

// --- publicação / formato / moldura ---
if (!video.publicacao?.titulo?.trim()) add('FAIL', 'publicacao.titulo vazio (obrigatório)');
if (!video.publicacao?.legenda?.trim()) add('FAIL', 'publicacao.legenda vazia (obrigatória)');
if (video.formato !== FORMATO_PADRAO) add('WARN', `formato "${video.formato || '—'}" (o padrão da casa é ${FORMATO_PADRAO}, o MESMO dos quadrinhos)`);
if (!video.moldura) add('WARN', 'moldura desligada (padrão dos quadrinhos usa moldura+estrela)');

// --- áudio (só se o vídeo não for mudo) ---
const semAudio = video.semAudio === true;
if (!semAudio && scene) {
  const { audio } = montarCena(video);
  // acervo novo (`assets/sons/...`) vive em CONTEUDO_DIR; os cinco efeitos antigos, em SFX_DIR
  const ondeEsta = (src) => src.startsWith('assets/') ? path.join(CONTEUDO_DIR, src) : path.join(SFX_DIR, src);
  if (audio.music && !(await existe(ondeEsta(audio.music)))) add('FAIL', `ambiente/trilha faltando: ${audio.music} (rode: node scripts/audio/baixar-sons.mjs)`);
  for (const s of audio.sfx || []) if (!(await existe(ondeEsta(s.src)))) add('FAIL', `som faltando: ${s.src} (rode: node scripts/audio/baixar-sons.mjs)`);
  // um vídeo declarado com áudio e sem UMA fala é quase sempre `voz` esquecida no balão
  if (!(audio.falas || []).length) add('WARN', 'vídeo com áudio e nenhuma fala: faltou `voz` nos balões?');
  // acento faltando não é estética: o mesmo campo é legenda e voz
  for (const t of textosFaladosDoVideo(video)) {
    for (const p of problemasDeAcento(t.valor)) {
      add('FAIL', `${t.onde}: "${p.palavra}" -> "${p.sugestao}" (${p.motivo})${t.temVoz ? ' — muda o ÁUDIO também' : ''}`);
    }
  }
}

// --- FICHA DOS PERSONAGENS (gate do contrato) -------------------------------
// Não basta o sprite existir: o personagem tem que estar COMPLETO pela ficha (base + model sheet
// + idle). Sem isso, uma pose nova dele sai fora de proporção porque o modelo não tem o perfil de
// referência. Este é o gate que amarra as duas pontas: asset criado vs asset apto a entrar em cena.
//
// LEGADO: o contrato só REPROVA vídeo que nasceu sob ele (`"contrato": "v1"`, posto pelo
// new-video). Sem isso, o acervo inteiro — inclusive vídeo já publicado e aprovado — passaria a
// dar FAIL de um dia pro outro por falta de um asset que não existia quando ele foi feito. Regra
// nova vale pra trabalho novo; o antigo fica com WARN, e migra quando (e se) valer a pena.
{
  const sobContrato = !!video.contrato;
  const slugs = new Set();
  for (const sh of (video.roteiro || [])) for (const pc of (sh.personagens || [])) if (pc.slug) slugs.add(pc.slug);
  for (const slug of slugs) {
    const st = await statusPersonagem(slug);
    if (!st.apto) {
      const falta = st.faltando.filter((f) => f.essencial);
      const como = falta.map((f) => f.comoFazer).join(' ; ');
      if (sobContrato) add('FAIL', `personagem "${slug}" não está apto: falta ${falta.map((f) => f.rotulo).join(', ')} (${como})`);
      else add('WARN', `[legado] "${slug}" não cumpre o contrato atual: falta ${falta.map((f) => f.rotulo).join(', ')} — só bloqueia vídeo novo (${como})`);
    }
  }
}

// --- O MESMO GATE DO RENDER ---
// Este preflight rodava só os invariantes, e o gate de `POST /api/video/render` roda o
// `validar-cena` INTEIRO (invariantes + sobreposição + spot fora do canvas + publicação). Os dois
// divergiam: o check dizia "sem FAIL" e o render devolvia 422 por sobreposição. Preflight que
// aprova o que o gate reprova não é preflight, é uma segunda opinião — e a que não vale.
{
  try {
    const r = await validarCena(ID);
    for (const e of r.erros || []) add('FAIL', e.msg);
    for (const a of r.avisos || []) add('WARN', a.msg);
  } catch (e) {
    add('WARN', 'validar-cena não rodou (' + e.message + '); caindo só nos invariantes');
    try {
      const inv = invariantes(video);
      for (const er of inv.erros) add('FAIL', er.msg);
      for (const a of inv.avisos) add('WARN', a.msg);
    } catch (e2) { add('WARN', 'invariantes não rodaram: ' + e2.message); }
  }
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
