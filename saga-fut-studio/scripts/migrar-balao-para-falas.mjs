// UM CAMPO SÓ PRA FALA. Migração pontual de 10/08/2026, roda uma vez e pode ser apagada.
//
// O balão vetorial nasceu com campos próprios (`painel.balaoTexto` e `painel.balaoPos`), ao
// lado de `painel.falas`, que já existia e é o que a aba Conteúdo edita e o que vira instrução
// de balão no prompt. Dois campos pro mesmo dado, e cada quadrinho usando um: o deck de
// coringas só tinha balaoTexto, os outros 68 só tinham falas. Duas telas editando a mesma
// coisa em lugares diferentes é o que tornava o studio impossível de entender.
//
// Aqui o balaoTexto vira uma fala de verdade, com personagem, e a posição arrastada viaja
// junto dentro dela. Depois disto existe UM caminho: `painel.falas`.
//
//   node scripts/migrar-balao-para-falas.mjs --dry
//   node scripts/migrar-balao-para-falas.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../saga-fut/data/quadrinhos');
const dry = process.argv.includes('--dry');
const API = 'http://localhost:4600/api';

// Com o studio aberto, o project.json vive em MEMÓRIA e o disco é sobrescrito no próximo save:
// escrever o arquivo aqui faria a migração sumir sem aviso. Então a gravação vai pela API
// quando ela responde, e só cai no disco com o studio desligado.
const studioNoAr = await fetch(`${API}/dados`).then((r) => r.ok).catch(() => false);

async function gravar(abs, q) {
  if (studioNoAr) {
    const r = await fetch(`${API}/quadrinhos/${q.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paineis: q.paineis }),
    });
    if (!r.ok) throw new Error(`API recusou ${q.id}: ${r.status} ${await r.text()}`);
    return 'api';
  }
  fs.writeFileSync(abs, JSON.stringify(q, null, 2) + '\n');
  return 'disco';
}

let tocados = 0, falasCriadas = 0;
for (const arq of fs.readdirSync(DIR).filter((f) => f.endsWith('.json'))) {
  const abs = path.join(DIR, arq);
  const q = JSON.parse(fs.readFileSync(abs, 'utf8'));
  // o dono da fala: sem personagem o desenho não sabe de quem é o balão, e o elenco do
  // quadrinho é a melhor resposta disponível (nos coringas o elenco tem UM personagem)
  const dono = (q.elenco || [])[0] || '';
  let mudou = false;

  for (const p of q.paineis || []) {
    const texto = String(p.balaoTexto || '').trim();
    if (texto) {
      const jaTem = (p.falas || []).some((f) => String(f.texto || '').trim() === texto);
      if (!jaTem) {
        p.falas = [...(p.falas || []), { personagem: dono, texto, ...(p.balaoPos ? { pos: p.balaoPos } : {}) }];
        falasCriadas++;
      }
    }
    if ('balaoTexto' in p || 'balaoPos' in p) {
      delete p.balaoTexto; delete p.balaoPos;
      mudou = true;
    }
  }
  if (!mudou) continue;
  tocados++;
  console.log(`${dry ? '[dry] ' : ''}${q.id}: dono "${dono || '(sem elenco)'}"`);
  for (const p of q.paineis || []) {
    const fs_ = (p.falas || []).filter((f) => String(f.texto || '').trim());
    if (fs_.length) console.log(`   painel ${p.numero}: ${fs_.map((f) => JSON.stringify(f.texto)).join(' · ')}`);
  }
  if (!dry) console.log(`   gravado via ${await gravar(abs, q)}`);
}

console.log(`\n${dry ? 'seriam ' : ''}${tocados} quadrinho(s) migrado(s), ${falasCriadas} fala(s) criada(s)`);
if (studioNoAr) console.log('(o studio está no ar: gravado pela API, como manda o CLAUDE.md)');
if (dry) console.log('rode sem --dry pra aplicar');
