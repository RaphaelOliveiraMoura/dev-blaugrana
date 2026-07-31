// gen-char.mjs <refFotoRel> <outName> [desc]
// Gera caricatura-base rabisco-riso de CORPO INTEIRO (fundo creme) a partir de uma FOTO,
// no mesmo padrão da biblioteca personagens/*-riso.png. Prompt vem do contrato em config.mjs.
import { generateImage } from '../../server/providers/codex-image.mjs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { CONTEUDO, ESTILO_PATH, promptChar } from './config.mjs';
import { exigirPorta } from './porta.mjs';

exigirPorta('gen-char.mjs', 'node scripts/asset.mjs personagem <slug> --ref=<foto>');

const [, , REF, OUTNAME, DESC = ''] = process.argv;
if (!REF || !OUTNAME) { console.error('uso: node gen-char.mjs <refFotoRel> <outName> [desc]'); process.exit(1); }
const OUTREL = `personagens/${OUTNAME}.png`, outAbs = path.join(CONTEUDO, OUTREL);
const REFABS = path.join(CONTEUDO, REF);
await mkdir(path.dirname(outAbs), { recursive: true });
const prompt = await promptChar(OUTREL, DESC);
console.log('>>>', OUTNAME); const t0 = Date.now();
await generateImage({ cwd: CONTEUDO, prompt, referencias: [REFABS, ESTILO_PATH], outAbs, timeoutMs: 600000 });
console.log('OK', OUTNAME, Math.round((Date.now() - t0) / 1000) + 's ->', outAbs);
