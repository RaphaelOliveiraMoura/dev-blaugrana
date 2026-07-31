// porta.mjs — TRAVA DE ENTRADA dos geradores.
//
// Todo gen-* chama `exigirPorta()` na primeira linha. Sem a variável que só o asset.mjs põe, o
// script recusa e diz o comando certo. É o que transforma "a regra é usar o asset" em algo que
// não depende de ninguém lembrar: o caminho alternativo deixa de existir.
//
// Escotilha de emergência consciente: SAGAFUT_SEM_PORTA=1 pula a trava. Existe pra depuração
// pontual (testar um prompt isolado sem montar manifesto) e é gritada no stderr, pra nunca virar
// o jeito normal de trabalhar.
export function exigirPorta(nomeScript, dica = '') {
  if (process.env.SAGAFUT_VIA_ASSET === '1') return;
  if (process.env.SAGAFUT_SEM_PORTA === '1') {
    console.warn(`[porta] ⚠️  ${nomeScript} rodando FORA do contrato (SAGAFUT_SEM_PORTA=1). O asset gerado`);
    console.warn(`[porta]     não passou por validação de classe/ficha: NÃO use num vídeo de verdade.`);
    return;
  }
  console.error(`\nFAIL ${nomeScript} não roda direto: os geradores são internos.`);
  console.error(`     A criação de asset passa pela porta única, que valida classe, ficha e manifesto`);
  console.error(`     ANTES de gastar geração.\n`);
  if (dica) console.error(`     use: ${dica}\n`);
  console.error(`     \`node scripts/asset.mjs regras\` mostra o contrato vigente.\n`);
  process.exit(2);
}
