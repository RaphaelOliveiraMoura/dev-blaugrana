// migrar-tierlists.mjs [--dry] — TIER LIST VIRA QUADRINHO.
//
// POR QUE: tier list era um formato PARALELO com infraestrutura própria (rota, view, CSS, pasta no
// disco) para uma arte que, do ponto de vista do fluxo, é uma charge como qualquer outra: tem arte,
// título, legenda, vai pras mesmas redes. Só que ficava FORA do project.json, então não aparecia na
// listagem, não tinha campo por rede e não passava pelo fluxo de publicar/baixar. O card de
// ESCALAÇÃO já resolvia isso do jeito certo: gera a arte e registra um quadrinho.
//
// Aqui a arte e a publicação existentes viram quadrinho (selo "Tier list"), e o MP4 estático
// continua servindo pelo mesmo caminho de antes até o botão novo entrar no quadrinho.
import fs from 'node:fs/promises';
import path from 'node:path';
import { CONTEUDO_DIR } from '../server/config.mjs';

const DRY = process.argv.includes('--dry');
const API = process.env.STUDIO_API || 'http://localhost:4610';
const TIER_DIR = path.join(CONTEUDO_DIR, 'tierlists');
const IMG = new Set(['.png', '.jpg', '.jpeg', '.webp']);

const r = await fetch(`${API}/api/dados`).catch(() => null);
if (!r?.ok) { console.error(`FAIL não consegui ler ${API}/api/dados — o studio está rodando?`); process.exit(1); }
const dados = await r.json();

const pastas = await fs.readdir(TIER_DIR, { withFileTypes: true }).catch(() => []);
const novos = [];
for (const e of pastas) {
  if (!e.isDirectory()) continue;
  const slug = e.name, dir = path.join(TIER_DIR, slug);
  const arquivos = await fs.readdir(dir);
  const img = arquivos.find((f) => IMG.has(path.extname(f).toLowerCase()));
  if (!img) { console.log(`  pulando "${slug}": pasta sem arte`); continue; }
  if ((dados.quadrinhos || []).some((q) => q.id === slug)) { console.log(`  pulando "${slug}": já existe como quadrinho`); continue; }

  let pub = {};
  try { pub = JSON.parse(await fs.readFile(path.join(dir, 'publicacao.json'), 'utf8')); } catch { /* sem publicacao.json */ }

  // a arte vai pro lugar de painel de quadrinho; o MP4 (se existir) fica onde está
  const destinoRel = `quadrinhos/${slug}/paineis/1.png`;
  const destinoAbs = path.join(CONTEUDO_DIR, destinoRel);

  novos.push({
    slug,
    origemAbs: path.join(dir, img),
    destinoAbs,
    quad: {
      id: slug,
      titulo: pub.titulo || slug,
      tipo: 'charge',
      selo: 'Tier list',
      status: 'pronto',
      estiloId: 'rabisco-riso',
      estiloExtra: '',
      formato: '3:4',
      elenco: [],
      contexto: 'Tier list. A arte vem pronta (montada fora do studio); este quadrinho é o registro '
        + 'dela no fluxo normal de publicação. NÃO regerar pelo studio.',
      legenda: pub.legenda || '',
      paineis: [{
        numero: 1,
        roteiro: 'Tier list (arte pronta).',
        falas: [],
        promptImagem: '(arte pronta, não regerar)',
        imagem: destinoRel,
        status: 'pronto',
      }],
      publicacao: { titulo: pub.titulo || '', tiktok: pub.legenda || '', instagram: '', twitter: '', youtube: { titulo: '', descricao: '' } },
    },
  });
}

console.log(`\n${novos.length} tier list(s) a migrar${DRY ? '  (dry-run)' : ''}\n`);
for (const n of novos) console.log(`  ${n.slug}\n    arte -> ${path.relative(CONTEUDO_DIR, n.destinoAbs)}\n    título: ${n.quad.titulo}`);
if (DRY || !novos.length) process.exit(0);

for (const n of novos) {
  await fs.mkdir(path.dirname(n.destinoAbs), { recursive: true });
  await fs.copyFile(n.origemAbs, n.destinoAbs);
  dados.quadrinhos = (dados.quadrinhos || []).filter((q) => q.id !== n.quad.id);
  dados.quadrinhos.push(n.quad);
}
const put = await fetch(`${API}/api/dados`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados) });
console.log(put.ok ? `\n  ${novos.length} registrada(s) como quadrinho (HTTP ${put.status})\n` : `\n  FAIL ao salvar: HTTP ${put.status}\n`);
process.exit(put.ok ? 0 : 1);
