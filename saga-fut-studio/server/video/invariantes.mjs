// invariantes.mjs — REGRAS DE ENCENAÇÃO verificadas sobre a cena montada.
//
// POR QUE EXISTE: os validadores da casa checam se o asset EXISTE e se a geometria é sã (sprite
// faltando, sobreposição, spot fora do canvas). Nenhum deles olha se a cena FUNCIONA. O vídeo
// mbappe-ditador passou em todos com zero FAIL e mesmo assim tinha: o personagem da gag fora do
// enquadramento na hora exata da gag (três vezes), e um gesto dirigido executado virado pro lado
// oposto do alvo. São erros de ENCENAÇÃO, invisíveis pra quem só confere arquivo no disco.
//
// Custo zero: roda sobre o dado, sem gerar nem renderizar nada, e vale pros vídeos que já existem.
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { montarCena } from './montar-cena.mjs';
import { CONTEUDO_DIR } from '../config.mjs';
import { rigMeta, dirRig, PREFIXO_RIG } from '../../shared/personagem.mjs';
import { EFEITOS_FORTES } from '../../shared/efeitos.mjs';

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
  const LARGURA = scene.width || 1080;   // o `w` do personagem é medido nela (INV-8)

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

    // ---------------------------------------------------------------- INV-4: quem anda olha pra onde vai
    // O Cucurella entrou pela direita andando pra esquerda com uma folha de caminhada desenhada
    // olhando pra DIREITA — ou seja, andou de costas o caminho inteiro, e nenhum validador piou.
    // O sistema tinha a informação toda menos UMA: pra que lado a folha olha. Agora a folha declara
    // (`rigs/<tipo>/_meta.json`) e aqui a declaração é confrontada com o movimento.
    pcs.forEach((pc, i) => {
      const c = chars[i]; if (!c) return;
      for (const seg of segmentosDeMarcha(pc, c)) {
        const dir = dirDaFolha(pc.slug, seg.tipo, seg.esq);
        if (dir == null) {
          // ERRO, não aviso: sem a declaração o INV-4 não tem o que comparar, ou seja o buraco que
          // fez o Cucurella andar de costas se reabre inteiro a cada personagem novo. O conserto é
          // um comando de uma linha, então bloquear custa pouco e garante muito.
          add(erros, 'orientacao-nao-declarada', `cena ${si + 1}: "${pc.slug}" ${seg.rotulo} com a folha de ${seg.tipo}${seg.esq ? '-esq' : ''}, que NÃO declara pra que lado olha — sem isso ninguém consegue conferir se ele anda de costas. Confira o ciclo (rigs/${seg.tipo}/_card.png) e rode: node scripts/asset.mjs dir ${pc.slug} ${seg.tipo}${seg.esq ? '-esq' : ''} <left|right>`);
          continue;
        }
        // o motor espelha, então a direção efetiva na tela inverte com o flip. Desde 01/08/2026 ele
        // espelha TAMBÉM quem tem número (sai invertido e tudo bem), então este invariante deixou de
        // ser um bloqueio por falta de arte: ele agora pega o caso em que a folha e o movimento
        // discordam mesmo com o espelho, que é defeito de verdade.
        const efetiva = seg.flip ? (dir === 'right' ? 'left' : 'right') : dir;
        if (efetiva !== seg.para) {
          add(erros, 'orientacao', `cena ${si + 1}: "${pc.slug}" ${seg.rotulo} (pra ${seg.para === 'left' ? 'ESQUERDA' : 'DIREITA'}) mas a folha de ${seg.tipo}${seg.esq ? '-esq' : ''} olha pra ${efetiva === 'left' ? 'ESQUERDA' : 'DIREITA'} — ele anda de costas. `
            + (pc.preOrientado
              ? `Ele é "preOrientado" (a sprite já foi desenhada virada, e espelhar desfaria isso): gere a folha na outra direção com "node scripts/asset.mjs ${seg.tipo} ${pc.slug} --dir=${seg.para}".`
              : `Confira a direção declarada da folha (o motor espelha automático assumindo que a base olha pra DIREITA). Se preferir arte virada de verdade em vez do espelho: node scripts/asset.mjs ${seg.tipo} ${pc.slug} --dir=${seg.para}.`));
        }
      }
    });
  });

  // ---------------------------------------------------------------- INV-6: a cena tem AÇÃO FÍSICA
  // O mbappe-ditador foi reprovado inteiro por isto: personagem em pose + gag verbal não é animação,
  // é quadrinho com áudio. A regra da casa passou a ser "cada beat precisa de ação física". Aqui a
  // pergunta é a mais frouxa possível — a cena inteira tem ALGUÉM fazendo alguma coisa? — porque uma
  // cena longa em que ninguém age quase sempre é uma cena que precisa ser reescrita, não ajustada.
  // Respirar não conta: é vida, não é ação.
  roteiro.forEach((sh, si) => {
    const dur = (scene.shots[si] || {}).dur || 0;
    if (dur < fps * 2) return;                       // cena curta: um respiro entre beats é legítimo
    // EFEITO FORTE CONTA COMO AÇÃO, efeito de fundo não. Um personagem que se encolhe de medo, infla
    // de raiva ou murcha na derrota está ATUANDO, mesmo sem sair do lugar e sem folha de gesto — é o
    // beat que a animação limitada persegue, e é o que as referências do projeto fazem. Já respirar
    // continua não contando, pelo motivo de sempre: é vida, não é ação. A lista de quais são fortes
    // mora em `shared/efeitos.mjs`, junto das funções, pra não virar duas listas que discordam.
    const efeitoForte = (pc) => {
      const e = pc.efeito;
      return e && EFEITOS_FORTES.includes(typeof e === 'string' ? e : e.tipo);
    };
    const agiu = (sh.personagens || []).some((pc) => pc.entra || pc.sai || efeitoForte(pc)
      || (pc.poses || []).some((b) => b.ciclo || b.move || b.moveY || b.pulo || b.andar || b.correr));
    const temBola = !!(sh.bola && (sh.bola.lances || []).length);
    if (!agiu && !temBola) {
      add(avisos, 'cena-sem-acao', `cena ${si + 1}: ${(dur / fps).toFixed(1)}s e NINGUÉM age — só poses e respiração. Foi assim que o mbappe-ditador foi reprovado inteiro: pose + fala não lê como animação. Dê ação física a alguém (ciclo de gesto, deslocamento, pulo) ou encurte a cena.`);
    }
  });

  // ------------------------------------------------------------------ INV-5: gesto de uma vez não reinicia
  // Cada shot recomeça a lista de beats do zero. Repetir um gesto de UMA VEZ no shot seguinte faz o
  // personagem executá-lo outra vez, do desenho neutro — na tela lê como a animação "resetando" no
  // corte, que foi o que aconteceu com o Vini quando a câmera fechou nele. Quase sempre a intenção
  // era ele CONTINUAR no estado final, e pra isso existe `mantem`.
  const gestoUmaVez = (slug, nome) => {
    const m = metaDoGestoLocal(slug, nome);
    return m && m.loop === false ? m : null;
  };
  for (let si = 1; si < roteiro.length; si++) {
    const antes = new Map();
    for (const pc of (roteiro[si - 1].personagens || [])) {
      for (const b of (pc.poses || [])) if (b.ciclo && gestoUmaVez(pc.slug, b.ciclo)) antes.set(pc.slug + '/' + b.ciclo, true);
    }
    for (const pc of (roteiro[si].personagens || [])) {
      for (const b of (pc.poses || [])) {
        if (b.ciclo && antes.has(pc.slug + '/' + b.ciclo) && !b.denovo) {
          // ERRO com saída declarada (`denovo: true`): reexecutar um gesto de uma vez é legítimo de
          // vez em quando (ele se assusta DUAS vezes), mas é raro e some no meio do roteiro. Como
          // aviso, o defeito passa direto; como erro com opt-out, quem quer mesmo diz que quer.
          add(erros, 'gesto-reinicia', `cena ${si + 1}: "${pc.slug}" executa "${b.ciclo}" de novo, e ele é um gesto de UMA VEZ que já terminou na cena ${si} — no corte isso lê como a animação RESETANDO. Se a intenção é ele CONTINUAR no estado final, troque por { "mantem": "${b.ciclo}" }; se ele deve mesmo repetir o gesto, marque { "ciclo": "${b.ciclo}", "denovo": true }.`);
        }
      }
    }
  }

  // ------------------------------------------------------------------ INV-7: o vídeo é DIRIGIDO?
  // Os invariantes 1 a 6 conferem execução: o sprite existe, o gesto acerta o alvo, ninguém anda de
  // costas. Nenhum deles olha pra DIREÇÃO, e por isso um vídeo pode passar em tudo e sair chapado —
  // foi o que aconteceu com o "segurança do Messi": correto e sem tratamento nenhum. Aqui a
  // pergunta é sobre COBERTURA, não sobre gosto: o que dá pra contar, conta.
  if (roteiro.length >= 2) {
    const planos = roteiro.map((sh) => sh.camera?.plano).filter(Boolean);
    if (planos.length && new Set(planos).size === 1) {
      add(avisos, 'direcao-plano-unico', `o vídeo inteiro está no plano "${planos[0]}" — sem variação de enquadramento a montagem lê como uma câmera esquecida ligada. Alterne (geral estabelece, médio conversa, close reage) ou use \`zooms\` dentro do plano.`);
    }
    const comZoom = roteiro.filter((sh) => (sh.zooms || []).length || sh.zoom).length;
    if (!comZoom) {
      add(avisos, 'direcao-sem-zoom', 'nenhuma cena usa `zooms` — os momentos de impacto passam sem pontuação. Um punch-in de 3-4 frames no frame do contato é o que transforma um acontecimento em GOLPE.');
    }
    // ritmo: N cenas de duração quase igual = montagem sem aceleração
    const durs = (scene.shots || []).slice(0, roteiro.length).map((s) => s.dur);
    if (durs.length >= 3) {
      const med = durs.reduce((a, b) => a + b, 0) / durs.length;
      const desvio = Math.max(...durs.map((d) => Math.abs(d - med))) / med;
      if (desvio < 0.12) add(avisos, 'direcao-ritmo-plano', `as ${durs.length} cenas duram quase o mesmo (${durs.map((d) => (d / fps).toFixed(1) + 's').join(', ')}) — montagem sem aceleração. Num gag de três tempos, encurte o segundo e quebre o ritmo no terceiro.`);
    }
  }

  // ------------------------------------------------------------------ INV-8: AMPLITUDE de escala
  // Medição de 01/08/2026 nas referências do gênero (Omar Momani, Hamid Sahari) contra os nossos 4
  // vídeos: eles vão do rosto ocupando meia tela até o personagem minúsculo num campo vazio; os
  // nossos ficavam entre 1,0x e 2,2x de razão, ou seja, o vídeo inteiro na mesma distância. Plano
  // é o nome que a gente dá pra isso, mas quem manda no tamanho na tela é o `w` de cada personagem.
  {
    const ws = roteiro.flatMap((sh) => (sh.personagens || []).map((p) => p.w).filter((w) => typeof w === 'number'));
    if (ws.length >= 3) {
      const min = Math.min(...ws), max = Math.max(...ws);
      const razao = max / min;
      if (razao < 3) {
        add(avisos, 'direcao-escala-chata', `todo o vídeo vive na mesma faixa de escala (w de ${min} a ${max}, razão ${razao.toFixed(1)}x) — a referência do gênero vai do close ao plano geral extremo no mesmo vídeo. Feche com \`camera.plano: "close"\` num beat de reação, ou abra deixando o personagem pequeno (w abaixo de ${Math.round(LARGURA * 0.13)}) num beat de isolamento.`);
      }
      if (max < LARGURA * 0.55 && !roteiro.some((sh) => ['close', 'detalhe'].includes(sh.camera?.plano))) {
        add(avisos, 'direcao-sem-plano-fechado', `nenhum beat chega perto do personagem (maior w = ${max}, ${Math.round((max / LARGURA) * 100)}% da largura) e nenhuma cena usa \`camera.plano: "close"\` — emoção em plano aberto some.`);
      }
    }
  }

  // ------------------------------------------------------------------ INV-10: escala vs CÂMERA
  // O personagem cresce e o cenário não. Foi o defeito mais visível do ditador-copia: pra dar um
  // close eu inflei o `w` de 265 pra 700 mantendo o plano `medio` — o personagem cresceu 2,6x e o
  // cenário atrás cresceu 1,34x, e o olho lê na hora que a proporção quebrou (ele parece colado
  // num fundo errado). Close se faz com a CÂMERA, que amplia os dois juntos; o `w` é a distância
  // dele na cena, não o tamanho do plano.
  {
    const PLANO_Z = { geral: 1, medio: 1.34, close: 1.85, detalhe: 2.4 };
    const porSlug = new Map();
    roteiro.forEach((sh, si) => {
      const cen = sh.fundo ? null : `${sh.cenario || 'base'}#${sh.vista || (sh.camera?.plano || 'geral')}`;
      if (cen == null) return;                        // fundo gráfico: outra "sala", pode tudo
      const z = PLANO_Z[sh.camera?.plano] ?? 1;
      for (const pc of (sh.personagens || [])) {
        if (typeof pc.w !== 'number') continue;
        const k = `${pc.slug}|${cen}`;
        if (!porSlug.has(k)) porSlug.set(k, []);
        // w NORMALIZADO pelo zoom do plano: é o tamanho dele "no mundo", que não deveria pular
        // o PISO é a prova de profundidade: quem está mais ao fundo pisa mais alto na tela. Sem
        // ele o aviso não distinguiria "cresceu sem motivo" (defeito) de "chegou mais perto"
        // (encenação legítima), e aviso que reclama do certo é aviso que se aprende a ignorar.
        porSlug.get(k).push({ si, w: pc.w, z, wRel: pc.w / z, piso: typeof pc.piso === 'number' ? pc.piso : null });
      }
    });
    for (const [k, itens] of porSlug) {
      if (itens.length < 2) continue;
      const menor = itens.reduce((a, b) => (a.wRel < b.wRel ? a : b));
      const maior = itens.reduce((a, b) => (a.wRel > b.wRel ? a : b));
      const salto = maior.wRel / menor.wRel;
      // mudou de profundidade? então o tamanho DEVE mudar; só é defeito quando ele pisa no mesmo
      // lugar e mesmo assim muda de tamanho
      const mesmaProfundidade = menor.piso != null && maior.piso != null
        && Math.abs(maior.piso - menor.piso) / Math.max(1, menor.piso) < 0.12;
      if (salto >= 2.2 && mesmaProfundidade) {
        const [slug, cen] = k.split('|');
        add(avisos, 'escala-incoerente', `"${slug}" muda de tamanho ${salto.toFixed(1)}x no MESMO cenário "${cen}" (cena ${menor.si + 1}: w ${menor.w} em plano ${Object.keys(PLANO_Z).find((p) => PLANO_Z[p] === menor.z)} · cena ${maior.si + 1}: w ${maior.w} em ${Object.keys(PLANO_Z).find((p) => PLANO_Z[p] === maior.z)}) — o cenário atrás não acompanha, e ele lê como recorte colado. Para fechar de verdade use \`camera.plano\` (amplia cenário e personagem juntos, e o fundo desfoca sozinho), ou troque o fundo daquele beat com \`fundo: {...}\`.`);
      }
    }
  }

  // ------------------------------------------------------------------ INV-9: o fundo se REPETE?
  // A causa nº 1 do "parece tudo igual" não era o roteiro, era o fundo: um cenário gerado por vídeo,
  // usado do primeiro ao último frame. Fundo gráfico (`sh.fundo`) custa zero geração e existe pra
  // isso; enquanto ele não é usado, o aviso lembra que a opção existe.
  if (roteiro.length >= 3) {
    const fundos = roteiro.map((sh) => (sh.fundo ? `grafico:${sh.fundo.tipo || 'chapado'}` : `cenario:${sh.cenario || 'base'}`));
    if (new Set(fundos).size === 1) {
      add(avisos, 'direcao-fundo-unico', `as ${roteiro.length} cenas usam o MESMO fundo (${fundos[0]}) — é o que mais faz um vídeo parecer com o anterior. Um beat de virada com \`fundo: { tipo: "radial" }\` ou uma cor chapada separa as ideias sem gerar nada.`);
    }
  }

  return { erros, avisos };
}

// o mesmo _meta.json que o composer lê, pra saber se o gesto é de uma vez
const _metaGesto = new Map();
function metaDoGestoLocal(slug, gesto) {
  const k = slug + ':' + gesto;
  if (!_metaGesto.has(k)) {
    let m = null;
    try { m = JSON.parse(readFileSync(path.join(CONTEUDO_DIR, 'personagens', slug, 'acoes', gesto, '_meta.json'), 'utf8')); } catch { m = null; }
    _metaGesto.set(k, m);
  }
  return _metaGesto.get(k);
}

// pra que lado a folha de movimento olha ('right' | 'left'), ou null se ela não declarou
const _dirCache = new Map();
function dirDaFolha(slug, tipo, esq) {
  const k = `${slug}/${tipo}/${esq}`;
  if (!_dirCache.has(k)) {
    let d = null;
    try { d = JSON.parse(readFileSync(path.join(CONTEUDO_DIR, rigMeta(slug, tipo, esq)), 'utf8')).dir || null; } catch { d = null; }
    _dirCache.set(k, d);
  }
  return _dirCache.get(k);
}

// Os TRECHOS em que o personagem se desloca, com o lado pra onde vai e se o motor vai espelhar.
// Espelha a lógica do composer de propósito: é a única forma de conferir o que ele decidiu sem
// depender de o char carregar essa informação até aqui.
function segmentosDeMarcha(pc, c) {
  const segs = [];
  const numerado = pc.numerado === true || pc.preOrientado === true;
  const temEsq = (tipo) => existsSync(path.join(CONTEUDO_DIR, dirRig(pc.slug, tipo, true), `${PREFIXO_RIG[tipo]}L1.png`));
  const push = (tipo, para, rotulo) => {
    // FOLHA -esq PRIMEIRO, ESPELHO DEPOIS: é a ordem que o composer segue desde que espelhar
    // numerado passou a ser permitido (01/08/2026). Quem tem a folha virada usa ela e NÃO espelha
    // (espelhar por cima desfaria); quem não tem, espelha, inclusive numerado — o número sai
    // invertido e tudo bem. `preOrientado` é o único que não pode espelhar de jeito nenhum.
    const esq = numerado && para === 'left' && temEsq(tipo);
    const flip = typeof pc.flip === 'boolean' ? pc.flip
      : (esq || pc.preOrientado === true) ? false
      : para === 'left';
    segs.push({ tipo, para, esq, flip, rotulo });
  };
  if (pc.entra) push(pc.entra === 'correr' ? 'correr' : 'andar', pc.de === 'direita' ? 'left' : 'right', 'ENTRA');
  for (const b of (pc.poses || [])) {
    if ((b.andar || b.correr) && b.move) push(b.correr ? 'correr' : 'andar', b.move < 0 ? 'left' : 'right', 'se desloca');
  }
  if (pc.sai) push(pc.sai === 'correr' ? 'correr' : 'andar', pc.saiPara === 'direita' ? 'right' : 'left', 'SAI');
  return segs;
}
