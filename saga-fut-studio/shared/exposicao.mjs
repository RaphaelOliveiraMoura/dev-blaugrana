// FOLHA DE EXPOSIÇÃO (x-sheet) — quantos frames de TELA cada desenho da folha fica no ar.
//
// POR QUE EXISTE: até aqui um ciclo tinha UM `hz` pro gesto inteiro, ou seja todo desenho ficava o
// mesmo tempo na tela. Numa respiração isso está certo; num SALTO está errado por definição — o
// agachamento de antecipação e o ápice precisam SEGURAR, e a subida e a queda precisam ser rápidas.
// Com exposição uniforme o gesto lê como um flipbook mecânico, não como peso. Aqui cada desenho tem
// o seu tempo, que é como animação 2D é cronometrada desde sempre.
//
// O SEGUNDO MOTIVO é sincronia: o deslocamento vertical por código (o pulo) é construído a partir
// DESTA MESMA tabela, então o desenho que está na tela e a altura do personagem avançam nos mesmos
// frames por construção. Antes eram duas contas independentes (uma no composer, outra no motor) que
// só coincidiam por sorte.
//
// `tempos` = [frames de tela por desenho], ex.: [4,5,2,2,6,2,4,3,5] pros 9 quadros de uma comemoração.
// `chao`   = [bool por desenho] — o pé está no chão nesse desenho? Delimita a janela de VOO.

// duração de um ciclo completo, em frames de tela
export function totalExposicao(tempos) {
  return (tempos || []).reduce((a, b) => a + Math.max(1, Math.round(b)), 0);
}

// qual DESENHO está na tela no frame `f` (relativo ao início do beat; repete em loop)
export function quadroEm(f, tempos) {
  const total = totalExposicao(tempos);
  if (!total) return 0;
  let r = ((Math.floor(f) % total) + total) % total;
  for (let i = 0; i < tempos.length; i++) {
    r -= Math.max(1, Math.round(tempos[i]));
    if (r < 0) return i;
  }
  return tempos.length - 1;
}

// em que frame do ciclo o desenho `i` ENTRA (é onde caem os contatos declarados no catálogo)
export function inicioDoQuadro(i, tempos) {
  let f = 0;
  for (let k = 0; k < i && k < tempos.length; k++) f += Math.max(1, Math.round(tempos[k]));
  return f;
}

// os frames, dentro de um beat de `hold` frames que começa em `t`, em que o desenho `i` entra —
// uma vez por repetição do ciclo. É assim que um contato desenhado vira evento cronometrado.
export function framesDoQuadro(i, tempos, t, hold) {
  const ciclo = totalExposicao(tempos);
  if (!ciclo) return [];
  const off = inicioDoQuadro(i, tempos);
  const fs = [];
  for (let k = 0; off + k * ciclo <= hold; k++) fs.push(t + off + k * ciclo);
  return fs;
}

// exposição uniforme derivada de `hz` — é o que todo ciclo sem folha declarada usa (andar, correr,
// respiração). A distribuição acumula o resto pra o ciclo fechar na duração exata de fps/hz*n.
export function temposUniformes(n, fps, hz) {
  const passo = fps / (hz || 8);
  const tempos = [];
  let anterior = 0;
  for (let i = 1; i <= n; i++) {
    const ate = Math.round(passo * i);
    tempos.push(Math.max(1, ate - anterior));
    anterior = ate;
  }
  return tempos;
}

// JANELA DE VOO dentro de um ciclo, em frames: do primeiro frame do primeiro desenho no ar até o
// último frame do último desenho no ar. Sem `chao` (folha antiga) devolve null e quem chama cai no
// comportamento anterior.
export function janelaNoAr(tempos, chao) {
  if (!Array.isArray(chao) || chao.length !== (tempos || []).length) return null;
  const i0 = chao.findIndex((c) => c === false);
  if (i0 < 0) return null;
  let i1 = i0;
  for (let i = i0; i < chao.length; i++) if (chao[i] === false) i1 = i;
  let ini = 0;
  for (let i = 0; i < i0; i++) ini += Math.max(1, Math.round(tempos[i]));
  let fim = ini;
  for (let i = i0; i <= i1; i++) fim += Math.max(1, Math.round(tempos[i]));
  return { ini, fim, i0, i1 };
}

// altura do arco no frame `fc` do ciclo. Parábola no tempo = subida rápida, flutuação no ápice e
// queda acelerada de graça (é a mesma curva de um corpo em queda livre). Fora da janela: 0, ou seja
// pé no chão exatamente nos desenhos em que o desenho tem o pé no chão.
export function alturaNoAr(fc, janela, altura) {
  if (!janela) return 0;
  const { ini, fim } = janela;
  if (fc <= ini || fc >= fim) return 0;
  const u = (fc - ini) / (fim - ini);
  return altura * 4 * u * (1 - u);
}
