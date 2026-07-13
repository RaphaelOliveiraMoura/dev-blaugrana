// Provider de imagem via Codex CLI (usa a assinatura ChatGPT Plus, sem API key).
// Roda `codex exec -s workspace-write -i <fichas>` com o prompt pelo stdin e as
// fichas como referência (-i). O Codex aciona a ferramenta image_gen (gpt-image-2)
// e grava o PNG no caminho pedido. Custo: tokens da franquia do Plus (US$0 de API).
//
// Otimização: retorna assim que o PNG aparece estável em disco (e mata o resto do
// processo do Codex, que costuma "enrolar" no fim escrevendo a mensagem final).
// Isso encurta o tempo real e reduz timeouts em geração paralela.
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function statSafe(p) {
  try { return await fs.stat(p) } catch { return null }
}

export async function generateImage({ cwd, prompt, referencias = [], outAbs, timeoutMs = 600000 }) {
  const args = ['exec', '-s', 'workspace-write']
  for (const r of referencias) args.push('-i', r) // -i é variádico: fica por último; prompt vai por stdin
  const started = Date.now()

  const result = await new Promise((resolve) => {
    // detached: cria um grupo de processos próprio para matar a árvore toda
    // (o codex spawna subprocessos que, de outro modo, ficariam órfãos)
    const child = spawn('codex', args, { cwd, detached: true })
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

    child.on('error', (e) => done({ ok: false, reason: `Falha ao rodar o codex: ${e.message}. Confirme 'codex --version' e 'codex login'.`, log: out }))
    child.stdout.on('data', (d) => (out += d))
    child.stderr.on('data', (d) => (out += d))
    child.stdin.write(prompt)
    child.stdin.end()

    // retorna assim que o arquivo aparece e fica estável (cp concluído)
    const poll = setInterval(async () => {
      const st = await statSafe(outAbs)
      if (st && st.mtimeMs >= started - 2000 && st.size > 10000) {
        await sleep(1200)
        const st2 = await statSafe(outAbs)
        if (st2 && st2.size === st.size) done({ ok: true, log: out })
      }
    }, 2000)

    // o processo terminou por conta própria: decide pelo arquivo
    child.on('close', () => done({ ok: 'closed', log: out }))

    const timer = setTimeout(() => done({ ok: false, reason: 'timeout', log: out }), timeoutMs)
  })

  if (result.ok === true) return { ok: true, log: result.log }

  // processo encerrou sozinho: confirma pelo arquivo final
  if (result.ok === 'closed') {
    const st = await statSafe(outAbs)
    if (st && st.mtimeMs >= started - 2000) return { ok: true, log: result.log }
  }

  const log = result.log || ''
  const moderado = /moderation_blocked|safety system|rejected by the safety/i.test(log)
  let motivo
  if (result.reason === 'timeout') {
    motivo = `Tempo esgotado (${Math.round(timeoutMs / 60000)}min). Cenas com 2+ fichas de referência são mais lentas — se rodou várias em paralelo, tente 2 por vez.`
  } else if (moderado) {
    motivo = 'A geração foi barrada pelo filtro de moderação da OpenAI. Ajuste o prompt (evite o que soe como pessoa/marca real) e tente de novo.'
  } else {
    motivo = result.reason || 'A geração terminou sem gravar o arquivo. Veja o log do servidor.'
  }
  throw new Error(motivo + (log ? '\n\n' + log.split('\n').filter(Boolean).slice(-6).join('\n') : ''))
}
