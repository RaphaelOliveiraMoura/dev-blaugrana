// varrer-gates.mjs — passa o gate de ciclo em TODO o acervo e registra o que ele reprova.
//
// POR QUE EXISTE: o registro normal só captura o que reprovar DAQUI PRA FRENTE, e o acervo já tem
// dezenas de folhas geradas antes de os gates existirem. Sem esta varredura, a bancada de calibragem
// começaria vazia e levaria semanas pra juntar amostra — justamente quando ela é mais necessária,
// que é agora, com os limiares recém-escolhidos.
//
// É SEGURA DE REPETIR: não gera nada, não apaga nada, só mede o que está no disco. O que ela grava
// é sempre uma cópia da folha atual, então rodar de novo depois de refazer folhas mostra a evolução.
//
//   node scripts/sprites/varrer-gates.mjs [--so=slug,slug]
import { readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { CONTEUDO } from './config.mjs';
import { validarCiclo, resumoDeCiclo } from './ciclo.mjs';
import { registrarGate, quadrosDe } from './registro-gate.mjs';
import { dirRig } from '../../shared/personagem.mjs';

const so = (process.argv.find((a) => a.startsWith('--so=')) || '').slice(5).split(',').filter(Boolean);
const PERS = path.join(CONTEUDO, 'personagens');
const slugs = (await readdir(PERS)).filter((s) => !s.startsWith('.') && (!so.length || so.includes(s)));

let medidos = 0, reprovados = 0, avisos = 0;
for (const slug of slugs.sort()) {
  for (const tipo of ['andar', 'correr']) {
    const dir = path.join(CONTEUDO, dirRig(slug, tipo));
    // sem o primeiro quadro não há ciclo pra medir; sem a folha não há prova pra guardar
    if (!existsSync(path.join(dir, `${tipo === 'andar' ? 'w' : 'r'}1.png`))) continue;
    medidos++;
    let cic;
    try { cic = await validarCiclo(slug, tipo); }
    catch (e) { console.log(`  erro   ${slug}/${tipo}: ${e.message}`); continue; }
    if (cic.nivel === 'ok') continue;
    if (cic.nivel === 'fail') reprovados++; else avisos++;
    console.log(`  ${cic.nivel === 'fail' ? 'FAIL ' : 'aviso'}  ${slug}/${tipo}  [${cic.gate}]`);
    await registrarGate({
      slug, tipo, gate: cic.gate, nivel: cic.nivel, msg: cic.msg,
      metricas: resumoDeCiclo(cic),
      folha: existsSync(path.join(dir, '_sheet.png')) ? path.join(dir, '_sheet.png') : null,
      card: existsSync(path.join(dir, '_card.png')) ? path.join(dir, '_card.png') : null,
      quadros: quadrosDe(dir, tipo),
    });
  }
}
console.log(`\n${medidos} ciclos medidos · ${reprovados} reprovados · ${avisos} com aviso`);
console.log('confira e julgue em: studio -> Ferramentas -> Gates');
