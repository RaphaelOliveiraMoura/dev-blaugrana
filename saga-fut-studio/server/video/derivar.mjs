// derivar.mjs — A LISTA DE COMPRAS SAI DO ROTEIRO, não de um segundo arquivo escrito à mão.
//
// POR QUE EXISTE: o roteiro diz `ciclo:"festeja"` e o manifesto repetia que existe uma ação
// chamada "festeja". Dois arquivos afirmando a mesma coisa, e quando divergem ninguém percebe até
// o build: ação declarada que o roteiro não usa vira geração PAGA e jogada fora; ação usada sem
// declarar vira sprite faltando no meio do render. O composer já sabe exatamente de que sprites a
// cena precisa — é daí que a lista deve sair. Ao manifesto sobra o que não dá pra derivar: a
// DESCRIÇÃO do gesto (ou o nome dele no vocabulário).
import { montarCena } from './montar-cena.mjs';

// Tudo que a cena REALMENTE referencia, agrupado por tipo, a partir dos nomes de arquivo que o
// composer gera: "<slug>-<nome><N>.png" (ciclo de ação), "<slug>-w#/r#/i#" (bibliotecas de
// movimento) e "<slug>-<pose>.png" (pose única).
export function listaDeCompras(video) {
  const acoes = new Map();     // "slug:nome" -> { slug, nome, quadros }
  const poses = new Set();     // "slug:pose"
  const libs = new Map();      // slug -> Set('andar'|'correr'|'idle')
  const cenarios = new Set();
  let scene;
  try { ({ scene } = montarCena(video)); } catch (e) { return { erro: e.message, acoes: [], poses: [], libs: [], cenarios: [] }; }

  const LIB = { w: 'andar', r: 'correr', i: 'idle' };
  // SLUGS CONHECIDOS vêm do roteiro. Sem isso não dá pra separar slug de nome no arquivo: os dois
  // têm hífen ("julian-atletico-muro" pode ser slug "julian" + pose "atletico-muro" ou slug
  // "julian-atletico" + pose "muro"). O roteiro sabe quem está em cena, então casa-se o prefixo
  // mais longo. Erro real: a primeira versão listou "julian:atletico-w" como se fosse um gesto.
  const slugs = [...new Set((video.roteiro || []).flatMap((sh) => (sh.personagens || []).map((p) => p.slug)))]
    .sort((a, b) => b.length - a.length);
  const conta = (arq) => {
    const base = arq.replace(/\.png$/i, '');
    const slug = slugs.find((s) => base.startsWith(s + '-'));
    if (!slug) return;                                  // sprite de composer antigo: ignora
    const resto = base.slice(slug.length + 1);
    const m = /^(.*?)(\d+)$/.exec(resto);
    const nome = m ? m[1] : resto, n = m ? Number(m[2]) : null;
    if (n != null && LIB[nome]) { if (!libs.has(slug)) libs.set(slug, new Set()); libs.get(slug).add(LIB[nome]); return; }
    if (n != null) {
      const k = `${slug}:${nome}`;
      const at = acoes.get(k) || { slug, nome, quadros: 0 };
      at.quadros = Math.max(at.quadros, n);
      acoes.set(k, at);
      return;
    }
    poses.add(`${slug}:${nome}`);
  };

  for (const shot of scene.shots || []) {
    if (shot.bg?.src) cenarios.add(shot.bg.src.replace(/^cenario-/, '').replace(/\.png$/, ''));
    for (const cam of shot.bg?.camadas || []) cenarios.add(cam.src.replace(/^cenario-/, '').replace(/\.png$/, ''));
    for (const c of shot.chars || []) {
      if (c.src) conta(c.src);
      for (const p of c.poses || []) { if (p.src) conta(p.src); for (const fr of p.cycle || []) conta(fr); }
    }
  }
  return {
    acoes: [...acoes.values()],
    poses: [...poses].map((s) => ({ slug: s.split(':')[0], pose: s.split(':')[1] })),
    libs: [...libs].map(([slug, set]) => ({ slug, tipos: [...set] })),
    cenarios: [...cenarios],
  };
}

// Confronta o que o roteiro PEDE com o que o manifesto DESCREVE. Devolve o que falta descrever
// (bloqueia) e o que está descrito à toa (desperdício de geração).
export function conferirManifesto(video, man) {
  const compras = listaDeCompras(video);
  if (compras.erro) return { erros: [`composer quebrou: ${compras.erro}`], avisos: [], compras };
  const erros = [], avisos = [];
  const declaradas = new Set((man.acoes || []).map((a) => `${a.slug}:${a.nome}`));
  const descritas = new Set([...(man.poses || []).map((p) => p.nome), ...(man.reacoes || []).map((r) => `${r.slug}-${r.emocao}`)]);

  for (const a of compras.acoes) {
    if (!declaradas.has(`${a.slug}:${a.nome}`)) {
      erros.push(`o roteiro usa a folha "${a.slug}:${a.nome}" (${a.quadros} quadros) mas o manifesto não descreve esse gesto — acrescente em "acoes" com "gesto" do vocabulário ou desc/fases/muda`);
    }
  }
  for (const chave of declaradas) {
    if (!compras.acoes.some((a) => `${a.slug}:${a.nome}` === chave)) {
      avisos.push(`o manifesto descreve a folha "${chave}" que o ROTEIRO NÃO USA — cada folha custa uma geração; tire do manifesto ou use na cena`);
    }
  }
  for (const p of compras.poses) {
    const nome = `${p.slug}-${p.pose}`;
    if (!descritas.has(nome) && !['stand'].includes(p.pose)) {
      avisos.push(`o roteiro usa a pose única "${nome}" — com a regra "sempre folha", pose estática é exceção: prefira uma folha de gesto (classe secundária) se ela segura a tela`);
    }
  }
  // quadros pedidos pelo roteiro vs grid da classe declarada
  for (const a of compras.acoes) {
    const decl = (man.acoes || []).find((x) => x.slug === a.slug && x.nome === a.nome);
    if (!decl?.classe) continue;
    const esperado = { secundaria: 4, primaria: 9, complexa: 16 }[decl.classe];
    if (esperado && a.quadros > esperado) {
      erros.push(`"${a.slug}:${a.nome}": o roteiro cicla ${a.quadros} quadros mas a classe "${decl.classe}" gera ${esperado} — ajuste "quadros" no beat ou suba a classe`);
    }
  }
  return { erros, avisos, compras };
}
