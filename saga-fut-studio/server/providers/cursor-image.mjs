// Provider de imagem via Cursor Agent ACP (cota da assinatura Cursor · Nano Banana).
//
// NÃO É API DE IMAGEM: sobe `agent acp`, pede a tool nativa GenerateImage e copia o PNG
// que o Cursor grava (em geral em ~/.cursor/projects/.../assets/) para o `outAbs` pedido.
// Precisa de `agent` no PATH e `agent login` (ou CURSOR_API_KEY).
//
// Mesma tática dos outros: lock por arquivo de saída + teto paralelo global, e retorna
// assim que o PNG chega (mata o agent em seguida — ele enrola na mensagem final).
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import { comVaga, comLock } from '../lib/lock.mjs'
import { MAX_GERACOES_PARALELAS } from '../../shared/constantes.mjs'
import { PAPEL_DO_ANEXO, regraDeConflito } from '../prompts.mjs'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function statSafe(p) {
  try { return await fs.stat(p) } catch { return null }
}

// Mesmas linhas de dialeto Codex que o modelo.mjs/together-prompt tiram: o agent do Cursor
// não usa gpt-image nem caminho relativo do workspace do Codex.
const LINHAS_DO_CODEX = [
  /^Use your built-in image generation tool/i,
  /^Write the final PNG to that exact path/i,
  /^IMAGE OUT:/i,
  /^Save it as a PNG/i,
  /Do not ask for confirmation/i,
]

export const semDialetoCodex = (texto) => String(texto || '')
  .split('\n')
  .filter((l) => !LINHAS_DO_CODEX.some((re) => re.test(l.trim())))
  .join('\n')
  .trim()

// Caminho do studio (pedido já composto). Referências entram ABSOLUTAS no prompt — o ACP
// não tem -i; o agent lê os paths e passa em referenceImagePaths da tool.
export function instrucaoCursorImagem(pedido, outAbs, contentDir) {
  const { composed, orient, refs = [], dim } = pedido
  const refsAbs = refs.map((r) => path.join(contentDir, r.rel))
  const ar = dim?.w && dim?.h ? `${dim.w}:${dim.h}` : null
  const papeis = refs.map((r, i) =>
    (PAPEL_DO_ANEXO[r.papel] || PAPEL_DO_ANEXO.personagem)(i + 1)).join('\n')
  // Mesma regra de desempate do Codex: sem ela o Cursor recebe os papéis mas não
  // sabe quem ganha quando ficha e estilo brigam (foi o caso do Bernabéu).
  return montarInstrucao({
    prompt: [composed, orient, papeis, regraDeConflito(refs)].filter(Boolean).join('\n'),
    referencias: refsAbs,
    outAbs,
    formato: ar,
  })
}

// Caminho do `asset` / gen-*: prompt da casa + lista absoluta de refs.
export function instrucaoCursor({ prompt, referencias = [], outAbs, formato = null }) {
  return montarInstrucao({ prompt, referencias, outAbs, formato })
}

function montarInstrucao({ prompt, referencias, outAbs, formato }) {
  const cabeca = referencias.length
    ? [
        'Use ONLY the native Cursor GenerateImage / image generation tool to create ONE image.',
        `Pass these files in referenceImagePaths, IN THIS ORDER: ${referencias.join(', ')}.`,
        'Order matters: the prompt refers to them as Image 1, Image 2, etc.',
      ].join(' ')
    : 'Use ONLY the native Cursor GenerateImage / image generation tool to create ONE image.'

  return [
    'TASK: generate ONE image. Do not write code. Do not run shell. Do not read the repository.',
    cabeca,
    formato ? `Target aspect ratio / canvas: ${formato}.` : '',
    '',
    'IMAGE PROMPT:',
    semDialetoCodex(prompt),
    '',
    `Save the resulting PNG exactly at: ${outAbs}`,
    'Overwrite if it already exists. When done, stop.',
  ].filter((l) => l !== undefined && l !== null).join('\n')
}

export async function generateImage(args) {
  const { outAbs } = args
  return comLock(`asset-${path.basename(path.dirname(outAbs))}-${path.basename(outAbs)}`,
    () => comVaga('cursor', MAX_GERACOES_PARALELAS, () => gerar(args),
      { aviso: `[cursor] ${MAX_GERACOES_PARALELAS} gerações já rodando, esperando vaga...` }),
    { aviso: `[cursor] outro processo está gerando ${path.basename(outAbs)}, esperando...` })
}

async function gerar({ cwd, prompt, referencias = [], outAbs, timeoutMs = 600000 }) {
  await fs.mkdir(path.dirname(outAbs), { recursive: true })
  const base = cwd || process.cwd()
  const refsAbs = referencias.map((r) => (path.isAbsolute(r) ? r : path.resolve(base, r)))
  for (const r of refsAbs) {
    if (!existsSync(r)) throw new Error(`[cursor] referência não existe: ${r}`)
  }

  // Se o chamador já mandou a instrução montada (modelo.mjs / imagem.mjs), usa ela.
  // Senão monta a partir do prompt cru + refs.
  const texto = /GenerateImage|generate ONE image|referenceImagePaths/i.test(prompt)
    ? prompt
    : instrucaoCursor({ prompt, referencias: refsAbs, outAbs })

  const agentArgs = ['acp']
  if (process.env.CURSOR_API_KEY) {
    agentArgs.unshift('--api-key', process.env.CURSOR_API_KEY)
  }

  const started = Date.now()
  const log = []
  const push = (s) => { log.push(String(s)); if (process.env.SAGAFUT_CURSOR_VERBOSE) console.error(`[cursor] ${s}`) }

  const result = await new Promise((resolve) => {
    const child = spawn('agent', agentArgs, {
      cwd: base,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env,
      detached: true,
    })

    let nextId = 1
    const pending = new Map()
    let settled = false
    let sessionId = null

    const killTree = () => {
      try { process.kill(-child.pid, 'SIGKILL') } catch {
        try { child.kill('SIGKILL') } catch {}
      }
    }

    const done = (val) => {
      if (settled) return
      settled = true
      clearInterval(poll)
      clearTimeout(timer)
      killTree()
      resolve(val)
    }

    const send = (method, params) => {
      const id = nextId++
      child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n')
      return new Promise((res, rej) => pending.set(id, { res, rej, method }))
    }

    const respond = (id, resultObj) => {
      child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, result: resultObj }) + '\n')
    }

    const copiar = async (src) => {
      if (!src) return false
      const st = await statSafe(src)
      if (!st || st.size < 1000) return false
      await fs.copyFile(src, outAbs)
      return true
    }

    const gravarDataUri = async (data) => {
      if (!data) return false
      const raw = String(data).replace(/^data:image\/\w+;base64,/, '')
      const buf = Buffer.from(raw, 'base64')
      if (buf.length < 1000) return false
      await fs.writeFile(outAbs, buf)
      return true
    }

    child.on('error', (e) => done({
      ok: false,
      reason: `Falha ao rodar o agent: ${e.message}. Confirme 'agent --version' e 'agent login' (ou CURSOR_API_KEY).`,
    }))
    child.stderr.on('data', (d) => {
      for (const line of d.toString().split(/\r?\n/).filter(Boolean)) push(`err: ${line}`)
    })
    child.on('close', () => {
      if (!settled) done({ ok: 'closed' })
    })

    const rl = readline.createInterface({ input: child.stdout })
    rl.on('line', (line) => {
      let msg
      try { msg = JSON.parse(line) } catch {
        push(`linha não-JSON: ${line.slice(0, 160)}`)
        return
      }

      if (msg.id != null && (msg.result !== undefined || msg.error)) {
        const waiter = pending.get(msg.id)
        if (!waiter) return
        pending.delete(msg.id)
        msg.error ? waiter.rej(msg.error) : waiter.res(msg.result)
        return
      }

      if (!msg.method) return

      if (msg.method === 'session/request_permission') {
        const opts = msg.params?.options || []
        const allow = opts.find((o) => /allow/i.test(o.optionId || o.id || '')) || opts[0]
        respond(msg.id, {
          outcome: { outcome: 'selected', optionId: allow?.optionId || allow?.id || 'allow-once' },
        })
        return
      }

      if (msg.method === 'cursor/generate_image') {
        const p = msg.params || {}
        push(`generate_image → ${p.filePath || '(sem path)'}`)
        ;(async () => {
          let ok = false
          if (p.imageData) ok = await gravarDataUri(p.imageData).catch(() => false)
          if (!ok && p.filePath) ok = await copiar(p.filePath).catch(() => false)
          if (msg.id != null) {
            respond(msg.id, ok
              ? { outcome: { outcome: 'generated', filePath: outAbs } }
              : { outcome: { outcome: 'rejected', reason: 'não deu pra gravar o PNG' } })
          }
          if (ok) done({ ok: true })
        })()
        return
      }

      if (msg.method === 'session/update') {
        const blob = JSON.stringify(msg.params || {})
        const paths = blob.match(/\/[^\s"'\\]+\.(png|jpe?g|webp)/gi) || []
        for (const p of paths) {
          if (p === outAbs) continue
          copiar(p).then((ok) => { if (ok) done({ ok: true }) }).catch(() => {})
        }
      }
    })

    // Poll do destino: se o Cursor grava direto no outAbs (ou já copiamos), sai cedo.
    const poll = setInterval(async () => {
      const st = await statSafe(outAbs)
      if (st && st.mtimeMs >= started - 2000 && st.size > 10000) {
        await sleep(800)
        const st2 = await statSafe(outAbs)
        if (st2 && st2.size === st.size) done({ ok: true })
      }
    }, 1500)

    const timer = setTimeout(() => done({ ok: false, reason: 'timeout' }), timeoutMs)

    ;(async () => {
      try {
        await send('initialize', {
          protocolVersion: 1,
          clientCapabilities: {
            fs: { readTextFile: true, writeTextFile: true },
            terminal: false,
          },
          clientInfo: { name: 'sagafut-cursor-image', version: '0.1.0' },
        })
        try {
          await send('authenticate', { methodId: 'cursor_login' })
        } catch (e) {
          done({
            ok: false,
            reason: `authenticate falhou (${JSON.stringify(e)}). Rode 'agent login' ou exporte CURSOR_API_KEY.`,
          })
          return
        }
        const created = await send('session/new', { cwd: base, mcpServers: [] })
        sessionId = created?.sessionId
        if (!sessionId) {
          done({ ok: false, reason: `session/new sem sessionId: ${JSON.stringify(created)}` })
          return
        }
        push(`session=${sessionId}`)
        await send('session/prompt', {
          sessionId,
          prompt: [{ type: 'text', text: texto }],
        })
        // prompt fechou sem o poll/generate_image terem batido: decide pelo arquivo
        const st = await statSafe(outAbs)
        if (st && st.mtimeMs >= started - 2000 && st.size > 1000) done({ ok: true })
        else if (!settled) done({ ok: 'closed' })
      } catch (e) {
        done({ ok: false, reason: e?.message || String(e) })
      }
    })()
  })

  if (result.ok === true) {
    console.log(`OK cursor ${path.basename(outAbs)} ${Math.round((Date.now() - started) / 1000)}s`)
    return { ok: true, log: log.join('\n') }
  }

  if (result.ok === 'closed') {
    const st = await statSafe(outAbs)
    if (st && st.mtimeMs >= started - 2000 && st.size > 1000) {
      console.log(`OK cursor ${path.basename(outAbs)} ${Math.round((Date.now() - started) / 1000)}s`)
      return { ok: true, log: log.join('\n') }
    }
  }

  const cauda = log.filter(Boolean).slice(-8).join('\n')
  let motivo
  if (result.reason === 'timeout') {
    motivo = `Tempo esgotado (${Math.round(timeoutMs / 60000)}min) no Cursor ACP.`
  } else {
    motivo = result.reason || 'A geração Cursor terminou sem gravar o arquivo.'
  }
  throw new Error(motivo + (cauda ? '\n\n' + cauda : ''))
}
