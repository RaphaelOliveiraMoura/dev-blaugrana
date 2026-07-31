// contratos.mjs — AS REGRAS DA CASA, EXECUTÁVEIS. Não é documentação: é o que os validadores
// consultam pra REPROVAR. Toda regra que existir só em prosa (VIDEOS.md) é uma regra que vai ser
// esquecida — foi o que aconteceu com o campo `muda`, que o config chama de "o campo mais
// importante do prompt" e mesmo assim era opcional.
//
// Fonte da verdade de: qual grid cada classe de animação usa, o que um personagem precisa ter pra
// entrar num vídeo, e o que um manifesto precisa declarar pra sequer chamar o gerador.
import { access } from 'node:fs/promises';
import path from 'node:path';
import { CONTEUDO } from './config.mjs';
import { baseImagem, refImagem, modelSheet, rigQuadro } from '../../shared/personagem.mjs';
import { GESTOS, GESTOS_VALIDOS, gestoPara } from './gestos.mjs';

// ---------------------------------------------------------------------------
// CLASSES DE ANIMAÇÃO — o grid NÃO é escolha de quem escreve o manifesto. O personagem declara
// o PAPEL dele na cena e o grid sai daqui. Medições do bake-off de 30/07/2026 (raphinha-riso,
// folha 1254x1254): corpo por célula e desvio de escala entre células.
// ---------------------------------------------------------------------------
export const CLASSES = {
  secundaria: { grid: [2, 2], celulas: 4, corpoPx: 515, desvioMedido: 1.9,
    quando: 'personagem em idle, figurante, quem está em segundo plano' },
  primaria: { grid: [3, 3], celulas: 9, corpoPx: 344, desvioMedido: null,
    quando: 'quem carrega o beat: a ação principal da cena, com antecipação e aterrissagem' },
  complexa: { grid: [4, 4], celulas: 16, corpoPx: 263, desvioMedido: 4.2,
    quando: 'kit inteiro do personagem (vários ciclos numa folha) ou gesto elaborado' },
};
export const CLASSES_VALIDAS = Object.keys(CLASSES);
export const gridDaClasse = (classe) => {
  const c = CLASSES[classe];
  if (!c) throw new Error(`classe de animação inválida: "${classe}" (use ${CLASSES_VALIDAS.join(' | ')})`);
  return c;
};

// ---------------------------------------------------------------------------
// FICHA DO PERSONAGEM — o status é DERIVADO DO DISCO, nunca guardado num json à parte. Estado
// duplicado diverge: o arquivo diria "apto" e a sprite não estaria lá. Aqui, se o arquivo existe
// o personagem tem; se não existe, não tem.
// ---------------------------------------------------------------------------
export const caminhoBase = (slug) => path.join(CONTEUDO, baseImagem(slug));
export const caminhoModelSheet = (slug) => path.join(CONTEUDO, modelSheet(slug));
export const caminhoIdle = (slug) => path.join(CONTEUDO, rigQuadro(slug, 'idle', 1));
export const caminhoAndar = (slug) => path.join(CONTEUDO, rigQuadro(slug, 'andar', 1));

const existe = (p) => access(p).then(() => true).catch(() => false);

// O QUE UM PERSONAGEM PRECISA TER pra poder entrar num vídeo. `essencial:false` = recomendado,
// aparece no relatório mas não reprova (o vídeo pode legitimamente não ter ninguém andando).
export const REQUISITOS_PERSONAGEM = [
  { id: 'base', rotulo: 'caricatura-base', caminho: caminhoBase, essencial: true,
    comoFazer: (s) => `asset personagem ${s} --ref=${refImagem(s)}` },
  { id: 'model', rotulo: 'model sheet (4 vistas)', caminho: caminhoModelSheet, essencial: true,
    comoFazer: (s) => `asset model-sheet ${s}` },
  { id: 'idle', rotulo: 'folha de idle (respiração)', caminho: caminhoIdle, essencial: true,
    comoFazer: (s) => `asset idle ${s}` },
  { id: 'andar', rotulo: 'ciclo de caminhada', caminho: caminhoAndar, essencial: false,
    comoFazer: (s) => `asset andar ${s}` },
];

// status derivado: { apto, faltando:[{id,rotulo,comoFazer}], tem:[ids] }
export async function statusPersonagem(slug) {
  const faltando = [], tem = [];
  for (const r of REQUISITOS_PERSONAGEM) {
    if (await existe(r.caminho(slug))) tem.push(r.id);
    else faltando.push({ id: r.id, rotulo: r.rotulo, essencial: r.essencial, comoFazer: r.comoFazer(slug) });
  }
  return { slug, apto: !faltando.some((f) => f.essencial), tem, faltando };
}

// ---------------------------------------------------------------------------
// SCHEMA DO MANIFESTO — recusa ANTES de chamar o gerador. O erro caro não é gerar errado, é
// gerar errado e só descobrir depois de pagar os 100 a 370s da imagem.
// ---------------------------------------------------------------------------
export function validarManifesto(man) {
  const erros = [];
  const E = (msg) => erros.push(msg);
  if (!man || typeof man !== 'object') return ['manifesto vazio ou inválido'];
  if (!man.video) E('faltou "video": <id> no manifesto');

  for (const [i, p] of (man.personagens || []).entries()) {
    const onde = `personagens[${i}]${p?.slug ? ` (${p.slug})` : ''}`;
    if (!p?.slug) E(`${onde}: faltou "slug"`);
  }

  for (const [i, a] of (man.acoes || []).entries()) {
    const onde = `acoes[${i}]${a?.nome ? ` (${a.slug}:${a.nome})` : ''}`;
    if (!a?.slug || !a?.nome) { E(`${onde}: precisa de "slug" e "nome"`); continue; }
    // CLASSE obrigatória: é ela que define o grid (regra da casa, não escolha do manifesto)
    if (!a.classe) E(`${onde}: faltou "classe" (${CLASSES_VALIDAS.join(' | ')}) — é ela que define o grid da folha`);
    else if (!CLASSES[a.classe]) E(`${onde}: classe "${a.classe}" não existe (use ${CLASSES_VALIDAS.join(' | ')})`);

    // GESTO DO VOCABULÁRIO: `gesto:"comemorar"` traz desc/fases/muda já testados (gestos.mjs) e
    // dispensa redigir fase na mão, que é de onde vieram as folhas ruins. Quem não usa o
    // vocabulário precisa entregar desc + fases + muda completos.
    if (a.gesto) {
      if (!GESTOS[a.gesto]) E(`${onde}: gesto "${a.gesto}" não está no vocabulário (${GESTOS_VALIDOS.join(', ')})`);
      else if (a.classe && CLASSES[a.classe]) {
        try { gestoPara(a.gesto, a.classe); } catch (err) { E(`${onde}: ${err.message}`); }
      }
      continue;                                     // o resto vem do catálogo
    }

    // MUDA obrigatório: sem a frase cirúrgica, o modelo redesenha o personagem em cada célula e
    // a folha PULSA na tela. Foi exatamente o defeito da folha do Diomandé no mbappe-ditador.
    if (!a.muda || !String(a.muda).trim()) E(`${onde}: faltou "muda" (a ÚNICA parte que se move, ex.: "the height of the ARMS") — sem isso a folha sai pulsando. Ou use "gesto":"<${GESTOS_VALIDOS.slice(0, 3).join('|')}|...>" do vocabulário`);
    const esperado = a.classe && CLASSES[a.classe] ? CLASSES[a.classe].celulas : null;
    if (esperado && (a.fases || []).length !== esperado) {
      E(`${onde}: classe "${a.classe}" exige ${esperado} fases (grid ${CLASSES[a.classe].grid.join('x')}), veio ${(a.fases || []).length}`);
    }
  }

  for (const [i, c] of (man.cenarios || []).entries()) {
    const onde = `cenarios[${i}]${c?.nome ? ` (${c.nome})` : ''}`;
    if (!c?.nome) E(`${onde}: faltou "nome"`);
    if (!c?.desc) E(`${onde}: faltou "desc"`);
    // cenário do padrão da casa é panorâmico: é o que permite a câmera navegar em vez de cortar
    if (!c?.panoramico && !c?.camada) E(`${onde}: cenário precisa ser "panoramico": true (o mundo é navegado pela câmera) ou declarar "camada"`);
  }

  return erros;
}
