// sprites-do-roteiro.mjs — DE QUE ARQUIVO DO ACERVO VEM CADA SPRITE DA CENA.
//
// O motor referencia sprite por nome achatado ("vini-riso-w1.png"), porque o Remotion lê de uma
// pasta plana. Antes, essa pasta era montada por CÓPIA no build: cada vídeo levava a sua versão
// de cada sprite pra dentro de `videos/<id>/kf/`. Consequências: o mesmo ciclo de caminhada
// existia em N cópias, melhorar a arte de um personagem não alcançava vídeo nenhum já montado, e
// não dava pra saber de onde cada arquivo tinha vindo.
//
// Aqui a tradução é feita na hora do render: nome do motor -> arquivo na pasta do personagem.
// O acervo do personagem passa a ser a fonte única, e a mesma arte serve qualquer vídeo.
import { montarCena } from './montar-cena.mjs';
import { PREFIXO_RIG, TIPOS_RIG, dirRig, dirAcao, dirPoses } from '../../shared/personagem.mjs';

// prefixo do rig -> tipo ('w' -> 'andar')
const TIPO_DO_PREFIXO = Object.fromEntries(TIPOS_RIG.map((t) => [PREFIXO_RIG[t], t]));

// Todos os sprites que a cena referencia, com a origem no acervo. `slugs` vem do roteiro porque
// slug e nome de gesto têm hífen: "julian-atletico-muro" só se separa sabendo quem está em cena.
export function spritesDoRoteiro(video) {
  let scene;
  try { ({ scene } = montarCena(video)); } catch { return []; }
  const slugs = [...new Set((video.roteiro || []).flatMap((sh) => (sh.personagens || []).map((p) => p.slug)))]
    .sort((a, b) => b.length - a.length);          // prefixo mais longo primeiro

  const nomes = new Set();
  for (const shot of scene.shots || []) {
    for (const c of shot.chars || []) {
      if (c.src) nomes.add(c.src);
      for (const p of c.poses || []) { if (p.src) nomes.add(p.src); for (const fr of p.cycle || []) nomes.add(fr); }
      for (const pz of c.pecas || []) if (pz.src) nomes.add(pz.src);   // peça articulada (pose separada)
    }
  }

  const out = [];
  for (const nome of nomes) {
    if (!nome.endsWith('.png')) continue;           // .webm e afins continuam vindo de kf/
    const base = nome.replace(/\.png$/, '');
    const slug = slugs.find((s) => base.startsWith(s + '-'));
    if (!slug) continue;                            // sprite que não é de personagem (cena composta)
    const resto = base.slice(slug.length + 1);
    const m = /^(.*?)(\d+)$/.exec(resto);
    // uma folha por rig, sempre pra direita: não existe mais variante "wL2" (ver personagem.mjs)
    const pref = m ? m[1] : null;
    if (m && TIPO_DO_PREFIXO[pref]) {               // biblioteca de movimento: w1, r3, i2
      out.push({ nome, origem: `${dirRig(slug, TIPO_DO_PREFIXO[pref])}/${m[1]}${m[2]}.png`, slug });
    } else if (m) {                                 // folha de gesto: comemorar1..9
      out.push({ nome, origem: `${dirAcao(slug, m[1])}/${m[1]}${m[2]}.png`, slug });
    } else {                                        // pose única: bravo, parado
      out.push({ nome, origem: `${dirPoses(slug)}/${resto}.png`, slug });
    }
  }
  return out;
}
