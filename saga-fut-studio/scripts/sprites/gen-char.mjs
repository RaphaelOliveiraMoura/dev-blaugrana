// gen-char.mjs <refFotoRel> <outName> [desc]
// Gera caricatura-base rabisco-riso de CORPO INTEIRO (fundo creme) a partir de uma FOTO,
// no mesmo padrão da biblioteca personagens/*-riso.png. Prompt vem do contrato em config.mjs.
import { gerarImagem as generateImage } from './modelo.mjs';   // roteia pro modelo efetivo (studio ou --modelo=)
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { CONTEUDO, ESTILO_PATH, promptChar } from './config.mjs';
import { exigirPorta } from './porta.mjs';
import { baseImagem } from '../../shared/personagem.mjs';

exigirPorta('gen-char.mjs', 'node scripts/asset.mjs personagem <slug> --ref=<foto>');

const [, , REF, OUTNAME, DESC = ''] = process.argv;
if (!REF || !OUTNAME) { console.error('uso: node gen-char.mjs <refFotoRel> <outName> [desc]'); process.exit(1); }
// GRAVA NA PASTA DO PERSONAGEM, que é onde o acervo mora. Este arquivo ainda escrevia no caminho
// anterior à migração (`personagens/<slug>.png`, arquivo solto): a geração terminava dizendo OK, o
// PNG ia parar fora do acervo e a base do personagem continuava a antiga, sem erro nenhum. Todo
// resto do pipeline (model sheet, rigs, poses, status) lê `personagens/<slug>/base.png`.
const OUTREL = baseImagem(OUTNAME), outAbs = path.join(CONTEUDO, OUTREL);
const REFABS = path.join(CONTEUDO, REF);
await mkdir(path.dirname(outAbs), { recursive: true });
const prompt = await promptChar(OUTREL, DESC);
console.log('>>>', OUTNAME); const t0 = Date.now();
await generateImage({ cwd: CONTEUDO, prompt, referencias: [REFABS, ESTILO_PATH], outAbs, timeoutMs: 600000 });
console.log('OK', OUTNAME, Math.round((Date.now() - t0) / 1000) + 's ->', outAbs);
