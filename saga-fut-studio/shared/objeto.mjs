// objeto.mjs — PROPS DA CENA: bola, cadeira, caixa, troféu, cofrinho.
//
// POR QUE EXISTE: até aqui só havia dois cidadãos no projeto, PERSONAGEM e CENÁRIO, e tudo que não
// era um dos dois virava gambiarra: ou entrava embutido no sprite do personagem (a cadeira que ele
// senta), ou virava cenário (e aí não podia se mover), ou era desenhado por código sem lugar no
// acervo (a bola). Objeto é o terceiro cidadão, e mora no mesmo nível do personagem PORQUE SE
// REUSA: uma cadeira serve vários vídeos, do mesmo jeito que um personagem serve.
//
//   objetos/<slug>/
//     base.png                       a arte do objeto (fundo magenta, recortável)
//     poses/<nome>.png               variações estáticas (cadeira virada, caixa aberta)
//     acoes/<gesto>/<gesto>1..N.png  ciclos, quando o objeto anima (bandeira balançando)
//
// DOIS TIPOS, e a distinção importa mais que a pasta:
//
//   'codigo' — forma geométrica com movimento físico: o motor DESENHA. É o caso da bola: SVG com
//              sombra que descola do chão, giro proporcional à distância rolada e trajetórias
//              declarativas (passe, arco, quique, chute a gol). Nenhuma geração de imagem chega
//              perto disso em consistência, e por isso a bola nunca deve virar sprite.
//   'arte'   — tem traço e personalidade (cadeira cartoon, cofrinho, troféu): vira asset gerado,
//              com as mesmas referências e o mesmo contrato de folha dos personagens.

export const dirObjeto = (slug) => `objetos/${slug}`;
export const objetoBase = (slug) => `${dirObjeto(slug)}/base.png`;
export const objetoPose = (slug, nome) => `${dirObjeto(slug)}/poses/${nome}.png`;
export const dirObjetoAcao = (slug, gesto) => `${dirObjeto(slug)}/acoes/${gesto}`;
export const objetoAcaoQuadro = (slug, gesto, n) => `${dirObjetoAcao(slug, gesto)}/${gesto}${n}.png`;

// nome achatado no motor, igual ao do personagem ("<slug>-<nome>.png")
export const nomeObjetoNoMotor = {
  base: (slug) => `${slug}.png`,
  pose: (slug, nome) => `${slug}-${nome}.png`,
  acao: (slug, gesto, n) => `${slug}-${gesto}${n}.png`,
};

// CATÁLOGO — objeto declarado aqui existe pro sistema todo (validação, studio, roteiro).
export const OBJETOS = {
  bola: {
    tipo: 'codigo',
    nome: 'Bola',
    desenhadaPor: 'Cena.jsx (componente Ball)',
    comoUsar: 'sh.bola = { inicio, groundY, lances: [{passe|arco|quique|chute|parada}] }',
    porQueCodigo: 'forma perfeita em qualquer tamanho, sombra que descola do chão ao subir, giro '
      + 'proporcional à distância (rola sem escorregar) e trajetória declarativa. Um sprite gerado '
      + 'perderia as três coisas e ainda custaria geração por vídeo.',
  },
};

export const OBJETOS_VALIDOS = Object.keys(OBJETOS);
export const ehObjetoDeCodigo = (slug) => OBJETOS[slug]?.tipo === 'codigo';
