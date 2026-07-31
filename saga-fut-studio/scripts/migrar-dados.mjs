// migrar-dados.mjs [--dry] — atualiza o caminho da ficha no project.json depois da migração de
// pastas. Cada personagem guarda `imagem: "personagens/<slug>.png"` NO DADO (não só no código), e
// o front lê esse campo pra montar a tela: sem isso, as 72 fichas somem da listagem.
//
// Salva pela API do studio (PUT /api/dados) e não editando o arquivo: com o studio aberto, o
// próximo save da tela sobrescreveria a edição feita no disco.
import { baseImagem } from '../shared/personagem.mjs';

const DRY = process.argv.includes('--dry');
const API = process.env.STUDIO_API || 'http://localhost:4610';

const r = await fetch(`${API}/api/dados`).catch(() => null);
if (!r?.ok) { console.error(`FAIL não consegui ler ${API}/api/dados — o studio está rodando?`); process.exit(1); }
const dados = await r.json();

let n = 0;
for (const p of dados.personagens || []) {
  const novo = baseImagem(p.id);
  if (p.imagem === novo) continue;
  if (n < 4) console.log(`  ${p.id}: ${p.imagem}  ->  ${novo}`);
  p.imagem = novo;
  n++;
}
console.log(`\n  ${n} ficha(s) a atualizar de ${(dados.personagens || []).length}`);
if (DRY) { console.log('  (dry-run, nada foi salvo)\n'); process.exit(0); }
if (!n) { console.log('  nada a fazer\n'); process.exit(0); }

const put = await fetch(`${API}/api/dados`, {
  method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados),
});
console.log(put.ok ? `  salvo (HTTP ${put.status})\n` : `  FAIL ao salvar: HTTP ${put.status}\n`);
process.exit(put.ok ? 0 : 1);
