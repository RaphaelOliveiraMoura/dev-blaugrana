// Provider de vídeo via Grok Build CLI (usa a assinatura SuperGrok, sem API key).
// Roda `grok -p` em modo headless com a sessão OAuth já logada (grok login). O Grok
// aciona a ferramenta image_to_video (Grok Imagine) a partir de uma imagem de origem
// e grava o MP4 no caminho pedido. Custo: cota do SuperGrok (US$0 de API).
//
// É o análogo do codex-image.mjs: lá o Codex chama image_gen na cota do ChatGPT
// Plus; aqui o Grok chama image_to_video na cota do SuperGrok. Mesma tática de
// polling: retorna assim que o MP4 aparece estável em disco e mata a árvore do
// processo (o agente costuma "enrolar" no fim escrevendo a mensagem final).
//
// Atenção: roda com --permission-mode bypassPermissions, então o Grok lê/escreve
// livremente em `cwd`. Aponte cwd só para a pasta de conteúdo (sem segredos).
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function statSafe(p) {
  try { return await fs.stat(p) } catch { return null }
}

// Monta a instrução do Grok a partir da imagem de origem, do caminho de saída, da
// descrição de movimento e da duração. Pede proporção preservada porque a fonte é
// vertical (cena 9:16, painel 3:4) e o Grok, sem isso, tende a cortar para quadrado.
export function instrucaoGrok({ imagemRel, outRel, movimento, duracao, resolucao }) {
  return [
    `Use a ferramenta image_to_video para animar a imagem "${imagemRel}".`,
    resolucao ? `Use resolution_name ${resolucao}.` : '',
    duracao ? `Duração do vídeo: ${duracao} segundos.` : '',
    `Movimento desejado: ${movimento}`,
    'IMPORTANTE: preserve a proporção vertical da imagem original, não corte para quadrado.',
    `Salve o vídeo resultante exatamente em "${outRel}" (relativo ao diretório atual).`,
    'Não faça mais nada além disso.',
  ].filter(Boolean).join(' ')
}

export async function generateVideo({ cwd, imagemRel, outRel, outAbs, movimento, duracao, resolucao = '720p', timeoutMs = 600000 }) {
  const prompt = instrucaoGrok({ imagemRel, outRel, movimento, duracao, resolucao })
  const args = ['--no-auto-update', '--permission-mode', 'bypassPermissions', '-p', prompt]
  const started = Date.now()

  const result = await new Promise((resolve) => {
    // detached: grupo de processos próprio para matar a árvore toda (o grok spawna
    // subprocessos que, de outro modo, ficariam órfãos)
    const child = spawn('grok', args, { cwd, detached: true })
    let out = ''
    let settled = false
    const killTree = () => {
      try { process.kill(-child.pid, 'SIGKILL') } catch { try { child.kill('SIGKILL') } catch {} }
    }
    const done = (val) => {
      if (settled) return
      settled = true
      clearInterval(poll)
      clearTimeout(timer)
      killTree()
      resolve(val)
    }

    child.on('error', (e) => done({ ok: false, reason: `Falha ao rodar o grok: ${e.message}. Confirme 'grok --version' e 'grok login'.`, log: out }))
    child.stdout.on('data', (d) => (out += d))
    child.stderr.on('data', (d) => (out += d))

    // vídeo é bem maior que imagem: exige tamanho mínimo e estabilidade entre duas
    // leituras antes de dar por concluído (o cp pode estar no meio)
    const poll = setInterval(async () => {
      const st = await statSafe(outAbs)
      if (st && st.mtimeMs >= started - 2000 && st.size > 100000) {
        await sleep(1500)
        const st2 = await statSafe(outAbs)
        if (st2 && st2.size === st.size) done({ ok: true, log: out })
      }
    }, 2000)

    child.on('close', () => done({ ok: 'closed', log: out }))

    const timer = setTimeout(() => done({ ok: false, reason: 'timeout', log: out }), timeoutMs)
  })

  if (result.ok === true) return { ok: true, log: result.log }

  if (result.ok === 'closed') {
    const st = await statSafe(outAbs)
    if (st && st.mtimeMs >= started - 2000 && st.size > 100000) return { ok: true, log: result.log }
  }

  const log = result.log || ''
  const moderado = /moderation|safety|rejected|não posso|nao posso|cannot/i.test(log)
  let motivo
  if (result.reason === 'timeout') {
    motivo = `Tempo esgotado (${Math.round(timeoutMs / 60000)}min). A geração de vídeo é mais lenta que a de imagem; se rodou várias em paralelo, tente uma por vez.`
  } else if (moderado) {
    motivo = 'A geração pode ter sido barrada pelo filtro de moderação da xAI. Ajuste o prompt e tente de novo.'
  } else {
    motivo = result.reason || 'A geração terminou sem gravar o arquivo. Veja o log do servidor.'
  }
  throw new Error(motivo + (log ? '\n\n' + log.split('\n').filter(Boolean).slice(-8).join('\n') : ''))
}
