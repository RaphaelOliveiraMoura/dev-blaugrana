// invariantes.mjs — REGRAS DE ENCENAÇÃO verificadas sobre a cena montada.
//
// POR QUE EXISTE: os validadores da casa checam se o asset EXISTE e se a geometria é sã (sprite
// faltando, sobreposição, spot fora do canvas). Nenhum deles olha se a cena FUNCIONA. O vídeo
// mbappe-ditador passou em todos com zero FAIL e mesmo assim tinha: o personagem da gag fora do
// enquadramento na hora exata da gag (três vezes), e um gesto dirigido executado virado pro lado
// oposto do alvo. São erros de ENCENAÇÃO, invisíveis pra quem só confere arquivo no disco.
//
// Custo zero: roda sobre o dado, sem gerar nem renderizar nada, e vale pros vídeos que já existem.
import { montarCena } from './montar-cena.mjs';

// interp linear de trilha [[frame,valor],...] com clamp nas pontas (mesma convenção do motor)
const trilha = (t, f) => {
  if (!t || !t.length) return 0;
  if (f <= t[0][0]) return t[0][1];
  if (f >= t[t.length - 1][0]) return t[t.length - 1][1];
  for (let i = 0; i < t.length - 1; i++) {
    const [x0, y0] = t[i], [x1, y1] = t[i + 1];
    if (f >= x0 && f <= x1) return x1 === x0 ? y1 : y0 + (y1 - y0) * ((f - x0) / (x1 - x0));
  }
  return t[t.length - 1][1];
};

// janela horizontal visível no frame: no modo mundo a câmera é uma janela que anda; sem mundo,
// a tela inteira. Devolve [esq, dir] em coordenada de mundo (ou de tela).
function viewport(shot, scene, fAbs, fLocal) {
  const W = scene.width || 1080;
  if (!shot.mundo || !shot.cam) return [0, W];
  const z = shot.cam.z ? trilha(shot.cam.z, fAbs) : 1;
  const cx = shot.cam.x ? trilha(shot.cam.x, fAbs) : shot.mundo.w / 2;
  const meia = W / (2 * (z || 1));
  return [cx - meia, cx + meia];
}

// o personagem está DENTRO da janela neste frame? (usa o corpo, não o canvas do sprite)
function visivel(c, shot, scene, fAbs, fLocal) {
  if (c.appear != null && fLocal < c.appear) return false;
  if (c.vanish != null && fLocal >= c.vanish) return false;
  const [e, d] = viewport(shot, scene, fAbs, fLocal);
  const x = c.cx + (c.moveX ? trilha(c.moveX, fLocal) : 0);
  const corpo = (c.w || 300) * 0.4;
  return x + corpo > e && x - corpo < d;
}

// frame ABSOLUTO em que cada shot começa (mesma acumulação do motor: transição sobrepõe)
function inicios(scene) {
  const out = []; let acc = 0;
  (scene.shots || []).forEach((s, i) => {
    out.push(acc);
    acc += s.dur - (i > 0 && s.transition && s.transition !== 'none' ? (s.tdur || 10) : 0);
  });
  return out;
}

export function invariantes(video) {
  const erros = [], avisos = [];
  const add = (lista, tipo, msg) => lista.push({ tipo, msg });
  let scene;
  try { ({ scene } = montarCena(video)); } catch (e) { return { erros: [{ tipo: 'composer', msg: e.message }], avisos: [] }; }
  const roteiro = video.roteiro || [];
  const starts = inicios(scene);
  const fps = scene.fps || 30;

  (scene.shots || []).forEach((shot, si) => {
    const sh = roteiro[si];
    if (!sh) return;                                  // composer que não é `roteiro`: sem invariante
    const chars = shot.chars || [];
    const pcs = sh.personagens || [];
    // o composer empurra um char por personagem, na ordem declarada
    const doSlug = (slug) => { const i = pcs.findIndex((p) => p.slug === slug); return i >= 0 ? chars[i] : null; };
    const A = starts[si];

    // ---------------------------------------------------------------- INV-1: quem FALA aparece
    // Fala de personagem fora do quadro é diálogo órfão: o espectador lê o texto e não sabe quem
    // disse. No mbappe-ditador o Vini revirava o olho fora do enquadramento em todas as tentativas.
    for (const b of (sh.baloes || [])) {
      if (!b.de) continue;
      const c = doSlug(b.de);
      if (!c) continue;                                // já avisado pelo composer (balão órfão)
      const ini = b.in ?? 6, fim = b.out ?? shot.dur;
      let dentro = 0, total = 0;
      for (let f = ini; f <= Math.min(fim, shot.dur - 1); f += 3) { total++; if (visivel(c, shot, scene, A + f, f)) dentro++; }
      if (total && dentro === 0) {
        add(erros, 'fala-fora', `cena ${si + 1}: "${b.de}" fala ("${b.texto}") mas NÃO aparece no enquadramento em nenhum frame da fala — a gag se perde; mova o personagem, mude a câmera ou o timing`);
      } else if (total && dentro / total < 0.5) {
        add(avisos, 'fala-fora', `cena ${si + 1}: "${b.de}" fala mas só aparece em ${Math.round(dentro / total * 100)}% da duração da fala`);
      }
    }

    // ---------------------------------------------------------------- INV-2: gesto dirigido acerta o alvo
    // `mira`/`encara` prometem que o gesto é PARA alguém. Se o alvo não está do lado pro qual o
    // personagem olha, o gesto aponta pro vazio (ou pro personagem errado, que foi o caso do
    // Ditador medindo a altura de quem não era).
    pcs.forEach((pc, i) => {
      const c = chars[i]; if (!c) return;
      const alvos = [];
      if (pc.encara) alvos.push({ slug: pc.encara, quando: 0, campo: 'encara' });
      let t = Math.max(pc.atraso || 0, 0);
      for (const b of (pc.poses || [])) { if (b.mira) alvos.push({ slug: b.mira, quando: t, campo: 'mira' }); t += (b.hold || 20); }
      for (const alvo of alvos) {
        const outro = doSlug(alvo.slug);
        if (!outro) { add(avisos, 'alvo', `cena ${si + 1}: "${pc.slug}" ${alvo.campo}:"${alvo.slug}" — alvo não está nesta cena`); continue; }
        const f = Math.min(alvo.quando + 2, shot.dur - 1);
        const meuX = c.cx + (c.moveX ? trilha(c.moveX, f) : 0);
        const alvoX = outro.cx + (outro.moveX ? trilha(outro.moveX, f) : 0);
        // flip vigente no frame (segmentos ou valor único): true = olhando pra ESQUERDA
        let olhaEsq = !!c.flip;
        if (c.flips) for (const [f0, v] of c.flips) if (f >= f0) olhaEsq = v;
        const alvoNaEsquerda = alvoX < meuX;
        if (alvoNaEsquerda !== olhaEsq) {
          add(erros, 'gesto-invertido', `cena ${si + 1}: "${pc.slug}" ${alvo.campo}:"${alvo.slug}" no frame ${f}, mas está virado pra ${olhaEsq ? 'ESQUERDA' : 'DIREITA'} e o alvo está à ${alvoNaEsquerda ? 'ESQUERDA' : 'DIREITA'} — o gesto sai pro lado errado`);
        }
        const dist = Math.abs(alvoX - meuX), alcance = ((c.w || 300) + (outro.w || 300)) * 0.75;
        if (dist > alcance) add(avisos, 'alvo-longe', `cena ${si + 1}: "${pc.slug}" ${alvo.campo}:"${alvo.slug}" a ${Math.round(dist)}px (alcance de leitura ~${Math.round(alcance)}px) — o gesto pode não ler como dirigido a ele`);
      }
    });

    // ---------------------------------------------------------------- INV-3: ninguém invisível o shot todo
    // Personagem posicionado e nunca enquadrado = sprite gerado à toa e, pior, uma intenção de cena
    // que o espectador nunca vê.
    pcs.forEach((pc, i) => {
      const c = chars[i]; if (!c) return;
      let apareceu = false;
      for (let f = 0; f < shot.dur && !apareceu; f += 4) if (visivel(c, shot, scene, A + f, f)) apareceu = true;
      if (!apareceu) add(avisos, 'nunca-enquadrado', `cena ${si + 1}: "${pc.slug}" está na cena mas NUNCA entra no enquadramento (${(shot.dur / fps).toFixed(1)}s) — tire da cena ou ajuste a câmera/spot`);
    });
  });

  return { erros, avisos };
}
