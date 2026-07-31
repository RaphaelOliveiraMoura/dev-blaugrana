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
import { baseImagem, modelSheet, avatarImagem, dirRig, dirAcao } from '../../shared/personagem.mjs';

export const rigsRouter = Router();

const rel = (abs) => path.relative(CONTEUDO_DIR, abs);
const existe = (p) => fs.access(p).then(() => true).catch(() => false);
const ls = (p) => fs.readdir(p).catch(() => []);

// ordena w1,w2,w10 por NÚMERO (não alfabético: senão w10 vem antes de w2)
const porNumero = (a, b) => (parseInt(a.match(/(\d+)\.png$/)?.[1] ?? 0, 10) - parseInt(b.match(/(\d+)\.png$/)?.[1] ?? 0, 10));

async function ciclosDe(slug) {
  const out = [];
  for (const [tipo, rotulo] of [['idle', 'idle (respiração)'], ['andar', 'andar'], ['correr', 'correr']]) {
    const base = path.join(CONTEUDO_DIR, dirRig(slug, tipo));
    const frames = (await ls(base)).filter((f) => /^[wri]\d+\.png$/.test(f)).sort(porNumero);
    if (frames.length) out.push({ id: tipo, rotulo, tipo: 'movimento', frames: frames.map((f) => rel(path.join(base, f))) });
  }
  // folhas de gesto: personagens/<slug>/acoes/<nome>/<nome>1..N.png
  const acoesDir = path.join(CONTEUDO_DIR, dirAcao(slug, '').replace(/\/$/, ''));
  for (const nome of await ls(acoesDir)) {
    const base = path.join(acoesDir, nome);
    const frames = (await ls(base)).filter((f) => f.startsWith(nome) && f.endsWith('.png')).sort(porNumero);
    if (frames.length) {
      // o grid vem da contagem: 4 = secundária, 9 = primária, 16 = complexa (contratos.mjs)
      const classe = { 4: 'secundária', 9: 'primária', 16: 'complexa' }[frames.length] || `${frames.length} quadros`;
      out.push({ id: `acao:${nome}`, rotulo: nome, tipo: 'gesto', classe, frames: frames.map((f) => rel(path.join(base, f))) });
    }
  }
  return out;
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
    const [status, ciclos, videos] = await Promise.all([statusPersonagem(slug), ciclosDe(slug), videosCom(slug)]);
    const modelAbs = path.join(CONTEUDO_DIR, modelSheet(slug));
    const avatarAbs = path.join(CONTEUDO_DIR, avatarImagem(slug));
    res.json({
      slug,
      apto: status.apto,
      tem: status.tem,
      faltando: status.faltando,
      base: (await existe(path.join(CONTEUDO_DIR, baseImagem(slug)))) ? baseImagem(slug) : null,
      modelSheet: (await existe(modelAbs)) ? rel(modelAbs) : null,
      avatar: (await existe(avatarAbs)) ? rel(avatarAbs) : null,
      ciclos,
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
      linhas.push({ slug, apto: st.apto, tem: st.tem, falta: st.faltando.filter((f) => f.essencial).map((f) => f.id) });
    }
    res.json({ total: linhas.length, aptos: linhas.filter((l) => l.apto).length, personagens: linhas });
  } catch (e) { res.status(500).json({ erro: e.message }); }
});
