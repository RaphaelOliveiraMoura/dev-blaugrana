// rigs.mjs — O QUE EXISTE NO DISCO PARA UM PERSONAGEM.
//
// POR QUE EXISTE: a ficha do personagem mostrava só a arte-base. Todo o resto do que define se ele
// pode entrar num vídeo (model sheet, respiração, andar, correr, folhas de gesto) vivia em pastas
// soltas em `rigs/`, sem nenhuma tela. Na prática só dava pra saber se um personagem estava pronto
// abrindo o Finder — e foi assim que passei um dia inteiro sem perceber que 81 dos 82 personagens
// não tinham model sheet, o que é justamente a referência que mantém o cabelo igual entre uma
// animação e outra.
import { Router } from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { CONTEUDO_DIR, VIDEO_DIR } from '../config.mjs';
import { statusPersonagem } from '../../scripts/sprites/contratos.mjs';
import { PERSONAGEM_PADRAO } from '../../scripts/sprites/referencia.mjs';
import { baseImagem, modelSheet, avatarImagem, dirRig, dirAcao, dirPoses } from '../../shared/personagem.mjs';

export const rigsRouter = Router();

const rel = (abs) => path.relative(CONTEUDO_DIR, abs);
const existe = (p) => fs.access(p).then(() => true).catch(() => false);
const ls = (p) => fs.readdir(p).catch(() => []);

// ordena w1,w2,w10 por NÚMERO (não alfabético: senão w10 vem antes de w2)
const porNumero = (a, b) => (parseInt(a.match(/(\d+)\.png$/)?.[1] ?? 0, 10) - parseInt(b.match(/(\d+)\.png$/)?.[1] ?? 0, 10));

// A FOLHA é a imagem que a IA gerou: um grid único com todos os quadros, que o slicer depois corta.
// Ela viaja junto de cada ciclo porque é onde se vê o que o modelo REALMENTE desenhou — os quadros
// fatiados já passaram por recorte, chroma-key e normalização de escala, então um defeito de
// enquadramento ou de fundo some deles e continua visível aqui.
const folhaDe = async (dirAbs) => ((await ls(dirAbs)).includes('_sheet.png') ? rel(path.join(dirAbs, '_sheet.png')) : null);

async function ciclosDe(slug) {
  const out = [];
  for (const [tipo, rotulo] of [['idle', 'idle (respiração)'], ['andar', 'andar'], ['correr', 'correr']]) {
    const base = path.join(CONTEUDO_DIR, dirRig(slug, tipo));
    const frames = (await ls(base)).filter((f) => /^[wri]\d+\.png$/.test(f)).sort(porNumero);
    if (frames.length) out.push({ id: tipo, rotulo, tipo: 'movimento', folha: await folhaDe(base), frames: frames.map((f) => rel(path.join(base, f))) });
  }
  // folhas de gesto: personagens/<slug>/acoes/<nome>/<nome>1..N.png
  const acoesDir = path.join(CONTEUDO_DIR, dirAcao(slug, '').replace(/\/$/, ''));
  for (const nome of await ls(acoesDir)) {
    const base = path.join(acoesDir, nome);
    const frames = (await ls(base)).filter((f) => f.startsWith(nome) && f.endsWith('.png')).sort(porNumero);
    if (frames.length) {
      // o grid vem da contagem: 4 = secundária, 9 = primária, 16 = complexa (contratos.mjs)
      const classe = { 4: 'secundária', 9: 'primária', 16: 'complexa' }[frames.length] || `${frames.length} quadros`;
      out.push({ id: `acao:${nome}`, rotulo: nome, tipo: 'gesto', classe, folha: await folhaDe(base), frames: frames.map((f) => rel(path.join(base, f))) });
    }
  }
  return out;
}

// POSES ÚNICAS (`personagens/<slug>/poses/<emoção>.png`, do `asset pose`). Ficavam INVISÍVEIS nesta
// tela: são 53 no acervo, todas geradas e nenhuma listada. Asset que existe no disco e não aparece
// na ficha é asset que ninguém sabe que tem — e o efeito prático é pagar geração de novo por uma
// pose que já estava lá. A ficha só cumpre o que promete se mostrar TUDO que o personagem tem.
async function posesDe(slug) {
  const base = path.join(CONTEUDO_DIR, dirPoses(slug));
  return (await ls(base))
    .filter((f) => f.endsWith('.png') && !f.startsWith('_'))   // _card.png é a folha de contato, não uma pose
    .sort()
    .map((f) => ({ nome: f.replace(/\.png$/, ''), arquivo: rel(path.join(base, f)) }));
}

// em quais vídeos este personagem entra em cena (lê o roteiro, não a pasta de sprites)
async function videosCom(slug) {
  const out = [];
  for (const f of (await ls(VIDEO_DIR)).filter((x) => x.endsWith('.json'))) {
    try {
      const v = JSON.parse(await fs.readFile(path.join(VIDEO_DIR, f), 'utf8'));
      const usa = (v.roteiro || []).some((sh) => (sh.personagens || []).some((p) => p.slug === slug));
      if (usa) out.push({ id: v.id, titulo: v.publicacao?.titulo || v.id });
    } catch { /* json torto não derruba a listagem */ }
  }
  return out;
}

// GET /api/rigs/:slug — tudo que existe deste personagem + o que falta pra ele estar apto
rigsRouter.get('/rigs/:slug', async (req, res) => {
  const { slug } = req.params;
  try {
    const [status, ciclos, poses, videos] = await Promise.all([statusPersonagem(slug), ciclosDe(slug), posesDe(slug), videosCom(slug)]);
    const modelAbs = path.join(CONTEUDO_DIR, modelSheet(slug));
    const avatarAbs = path.join(CONTEUDO_DIR, avatarImagem(slug));
    res.json({
      slug,
      // o personagem-padrão é a REFERÊNCIA de animação da casa: toda folha dele vira exemplo na
      // geração dos outros. A ficha precisa dizer isso, senão alguém regera por cima sem saber.
      padrao: slug === PERSONAGEM_PADRAO,
      apto: status.apto,
      tem: status.tem,
      faltando: status.faltando,
      base: (await existe(path.join(CONTEUDO_DIR, baseImagem(slug)))) ? baseImagem(slug) : null,
      modelSheet: (await existe(modelAbs)) ? rel(modelAbs) : null,
      avatar: (await existe(avatarAbs)) ? rel(avatarAbs) : null,
      ciclos,
      poses,
      videos,
    });
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

// GET /api/rigs — cobertura do elenco inteiro (a mesma foto do `asset elenco`, pra UI)
rigsRouter.get('/rigs', async (_req, res) => {
  try {
    // cada personagem é uma PASTA agora (era um .png solto)
    const ents = await fs.readdir(path.join(CONTEUDO_DIR, 'personagens'), { withFileTypes: true }).catch(() => []);
    const slugs = ents.filter((e) => e.isDirectory()).map((e) => e.name).sort();
    const linhas = [];
    for (const slug of slugs) {
      const st = await statusPersonagem(slug);
      linhas.push({ slug, padrao: slug === PERSONAGEM_PADRAO, apto: st.apto, tem: st.tem, falta: st.faltando.filter((f) => f.essencial).map((f) => f.id) });
    }
    res.json({ total: linhas.length, aptos: linhas.filter((l) => l.apto).length, personagens: linhas });
  } catch (e) { res.status(500).json({ erro: e.message }); }
});
