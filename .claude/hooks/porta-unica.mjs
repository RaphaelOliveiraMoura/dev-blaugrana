// Hook PreToolUse: bloqueia chamada direta aos geradores de sprite do SagaFut.
//
// A criação de asset passa por scripts/asset.mjs, que valida classe, ficha do personagem e
// manifesto ANTES de gastar geração (100 a 370s por imagem). Chamar gen-*.mjs direto pula essa
// validação — foi assim que entraram folha sem "muda" (sprite pulsando na tela), personagem com
// número errado no peito e cenário com as cores do time rival.
//
// Em Node de propósito: `jq` não existe nesta máquina, e um hook que depende de binário ausente
// falha em silêncio e LIBERA tudo, que é o pior resultado possível pra uma trava.
let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (d) => { raw += d; });
process.stdin.on('end', () => {
  let cmd = '';
  try { cmd = JSON.parse(raw)?.tool_input?.command ?? ''; } catch { /* payload estranho: não bloqueia */ }

  // EXECUÇÃO, não menção: a primeira versão bloqueava qualquer comando que CONTIVESSE o caminho do
  // gerador, então `grep gen-acao`, `cat`, e até editar o arquivo por script caíam na trava. O que
  // deve ser bloqueado é `node <caminho>/gen-*.mjs ...` de verdade.
  const chamaGerador = /(^|[;&|]|\s)(node|bun|npx\s+node)\s+[^;&|]*scripts\/sprites\/gen-[a-z-]+\.mjs/.test(cmd);
  const veioPelaPorta = cmd.includes('asset.mjs') || cmd.includes('SAGAFUT_VIA_ASSET') || cmd.includes('SAGAFUT_SEM_PORTA');

  if (chamaGerador && !veioPelaPorta) {
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason:
          'Gerador de sprite chamado fora da porta única. A criação de asset passa por `node scripts/asset.mjs`, ' +
          'que valida classe, ficha do personagem e manifesto ANTES de gastar geração. ' +
          'Comandos: asset personagem | model-sheet | idle | andar | correr | folha | video. ' +
          '`node scripts/asset.mjs regras` mostra o contrato vigente. ' +
          'Para depuração pontual: SAGAFUT_SEM_PORTA=1 (o asset gerado assim NÃO pode ir pra vídeo).',
      },
    }));
  }
  process.exit(0);
});
