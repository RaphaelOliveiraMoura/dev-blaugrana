// set.mjs — O CENÁRIO COMO FICHA: um LUGAR com várias vistas, no acervo.
//
// (chama-se "set" e não "cenario" porque `shared/cenario.mjs` já existe e é dos quadrinhos; e
// porque set é o termo certo: a regra da casa diz que cenário panorâmico é um SET, não um fundo.)
//
// POR QUE EXISTE: cenário era um PNG na pasta do vídeo, com UMA vista. Duas consequências, as duas
// pagas caro:
//
//   · O mesmo lugar era gerado de novo a cada vídeo (3 vídeos, 3 cenários, zero reuso), e melhorar
//     a arte de um não alcançava nenhum outro.
//   · Uma vista só é UMA perspectiva. O panorama do CT tem o muro na mesma altura de ponta a ponta
//     e o gramado numa faixa plana, então todo plano fechado usava um fundo que não foi feito pra
//     ele e o personagem lia como recorte colado — a queixa que voltou três vezes.
//
// A ficha resolve os dois: o lugar mora no acervo (`cenarios/<slug>/`) e tem vista para cada tipo
// de plano. A vista certa é escolhida pelo PLANO DA CÂMERA, não por alguém lembrar de trocar.
import path from 'node:path';

export const dirCenario = (slug) => `cenarios/${slug}`;

// AS VISTAS. `derivada: true` = tem que ser gerada A PARTIR do panorama (ele entra como imagem de
// referência), senão o prédio muda de cor entre um plano e outro e fica PIOR que ter uma vista só:
// o espectador percebe que mudou de lugar sem que ninguém tenha cortado.
export const VISTAS = {
  panorama: {
    rotulo: 'panorama (plano geral, largo)',
    planos: ['geral'],
    derivada: false,
    panoramica: true,
    guia: 'o SET largo que a câmera navega. É a vista obrigatória: toda ficha começa por ela.',
  },
  // `angulo` foi REMOVIDA em 01/08/2026. A ideia era dar profundidade com o chão em perspectiva, e
  // no vídeo ficou fora do tom: a casa é animação 2D de vista LATERAL, e a diagonal denuncia que é
  // outro desenho. O que resolve a monotonia sem quebrar o estilo são as VARIAÇÕES (abaixo): outros
  // pedaços do mesmo lugar, todos laterais e todos com a MESMA linha de chão.
  perto: {
    rotulo: 'perto (fundo de plano fechado)',
    planos: ['close', 'detalhe'],
    derivada: true,
    panoramica: false,
    guia: 'o MESMO lugar visto de perto: elementos grandes, poucos detalhes, feito pra ficar '
      + 'desfocado atrás de um close sem virar sopa.',
  },
};
export const VISTAS_VALIDAS = Object.keys(VISTAS);
export const VISTA_PADRAO = 'panorama';
export const vistaDerivada = (v) => !!VISTAS[v]?.derivada;

// A VISTA SAI DO PLANO. `vista:` no shot vence, pra quando o corte é escolha (mostrar o mesmo lugar
// de outro ângulo sem mudar o tamanho do plano).
export function vistaDoPlano(plano) {
  if (!plano) return VISTA_PADRAO;
  for (const [nome, v] of Object.entries(VISTAS)) if (v.planos.includes(plano)) return nome;
  return VISTA_PADRAO;
}

// VARIAÇÕES — outros pedaços do MESMO lugar, todos em vista lateral e todos com a MESMA linha de
// chão e a mesma altura de horizonte.
//
// POR QUE ASSIM: a monotonia do fundo não se resolve com perspectiva (a diagonal sai do tom da
// animação 2D lateral da casa e lê como outro desenho). Resolve-se com OUTROS ELEMENTOS: o gol e a
// rede, os bancos de reserva, o alambrado, a arquibancada pequena, os cones do aquecimento. E a
// regra de ouro é a linha do chão: mantida igual entre as variações, dá pra cortar de uma pra outra
// sem que ninguém mude de tamanho — que era exatamente o defeito que fez este mecanismo existir.
export const dirVariacoes = (slug) => `${dirCenario(slug)}/var`;
export const arquivoVariacao = (slug, nome) => `${dirVariacoes(slug)}/${nome}.png`;
export const nomeMotorVariacao = (slug, nome) => `cenario-${slug}__var-${nome}.png`;

export const arquivoVista = (slug, vista) => `${dirCenario(slug)}/${vista}.png`;
export const ancorasSet = (slug) => `${dirCenario(slug)}/_anchors.json`;
export const metaSet = (slug) => `${dirCenario(slug)}/_meta.json`;

// nome achatado que o motor referencia (o Remotion lê de uma pasta plana)
export const nomeMotor = (slug, vista) => `cenario-${slug}__${vista}.png`;
// e a volta. Nome sem "__" é LEGADO (cenário na pasta do vídeo, vista única).
export function doNomeMotor(nome) {
  const base = String(nome).replace(/^cenario-/, '').replace(/\.png$/, '');
  const i = base.indexOf('__');
  if (i < 0) return { slug: base, vista: null, legado: true };
  return { slug: base.slice(0, i), vista: base.slice(i + 2), legado: false };
}

// ONDE PROCURAR, em ordem: o acervo é a fonte, e a pasta do vídeo continua valendo pros vídeos que
// nasceram antes da migração. Legado que ainda renderiza não vira dívida urgente.
export function candidatosDoSet(conteudoDir, videoId, nome) {
  const { slug, vista, legado } = doNomeMotor(nome);
  const fora = [];
  if (!legado && vista?.startsWith('var-')) {
    // variação: o arquivo mora em var/<nome>.png; sem ela, o panorama ainda segura a cena
    fora.push(path.join(conteudoDir, arquivoVariacao(slug, vista.slice(4))));
    fora.push(path.join(conteudoDir, arquivoVista(slug, VISTA_PADRAO)));
    return fora;
  }
  if (!legado) {
    fora.push(path.join(conteudoDir, arquivoVista(slug, vista)));
    // fallback DENTRO da própria ficha: sem a vista derivada, o panorama ainda segura a cena
    if (vista !== VISTA_PADRAO) fora.push(path.join(conteudoDir, arquivoVista(slug, VISTA_PADRAO)));
  }
  const naPastaDoVideo = legado ? slug : `${slug}-${vista}`;
  fora.push(path.join(conteudoDir, `videos/${videoId}/cenario/${naPastaDoVideo}.png`));
  if (!legado) fora.push(path.join(conteudoDir, `videos/${videoId}/cenario/${slug}.png`));
  return fora;
}
