// LOCKS ENTRE PROCESSOS — para vários agentes/abas produzirem vídeos EM PARALELO sem
// se atropelar. Tem que ser em ARQUIVO, não em memória: cada `node scripts/...` é um
// processo novo, então uma trava em módulo (como a `emAndamento` da rota de render) não
// enxerga o processo vizinho e não protege nada.
//
// Base: `open(path, 'wx')` (O_EXCL) é atômico no sistema de arquivos — quem cria o arquivo
// ganha o lock. Gravamos PID + hora dentro pra detectar lock ÓRFÃO (processo morto sem
// liberar): se o dono não existe mais, ou o arquivo passou de `staleMs`, o lock é roubado.
import fs from 'node:fs/promises'
import path from 'node:path'
import { CONTEUDO_DIR } from '../config.mjs'

export const LOCKS_DIR = path.join(CONTEUDO_DIR, '.locks')

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const chaveSegura = (chave) => String(chave).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120)

const vivo = (pid) => { try { process.kill(pid, 0); return true } catch { return false } }

// tira do caminho um lock cujo dono morreu ou que passou do tempo (evita travar pra sempre)
async function limparOrfao(arq, staleMs) {
  try {
    const txt = await fs.readFile(arq, 'utf-8')
    const { pid, em } = JSON.parse(txt)
    const velho = Date.now() - (em || 0) > staleMs
    if (velho || (typeof pid === 'number' && pid !== process.pid && !vivo(pid))) {
      await fs.rm(arq, { force: true })
      return true
    }
  } catch {
    // ilegível/corrompido: trata como órfão
    await fs.rm(arq, { force: true }).catch(() => {})
    return true
  }
  return false
}

// Adquire um lock EXCLUSIVO pela chave e roda `fn`. Libera sempre (inclusive se `fn` lançar).
// `timeoutMs` = quanto esperar na fila antes de desistir; `staleMs` = idade que caracteriza órfão.
export async function comLock(chave, fn, { timeoutMs = 30 * 60_000, staleMs = 20 * 60_000, aviso } = {}) {
  await fs.mkdir(LOCKS_DIR, { recursive: true })
  const arq = path.join(LOCKS_DIR, chaveSegura(chave) + '.lock')
  const ate = Date.now() + timeoutMs
  let avisou = false
  for (;;) {
    try {
      const fh = await fs.open(arq, 'wx')
      await fh.writeFile(JSON.stringify({ pid: process.pid, em: Date.now(), chave: String(chave) }))
      await fh.close()
      try { return await fn() } finally { await fs.rm(arq, { force: true }).catch(() => {}) }
    } catch (e) {
      if (e.code !== 'EEXIST') throw e
      if (await limparOrfao(arq, staleMs)) continue
      if (Date.now() > ate) throw new Error(`lock "${chave}" ocupado por mais de ${Math.round(timeoutMs / 1000)}s`)
      if (!avisou && aviso) { console.log(aviso); avisou = true }
      await sleep(700)
    }
  }
}

// SEMÁFORO de N vagas pela mesma chave (ex.: no máximo 4 codex ao mesmo tempo na máquina).
// Cada vaga é um lock exclusivo `<chave>.<i>`; roda na primeira que conseguir pegar.
export async function comVaga(chave, vagas, fn, { timeoutMs = 60 * 60_000, staleMs = 20 * 60_000, aviso } = {}) {
  await fs.mkdir(LOCKS_DIR, { recursive: true })
  const ate = Date.now() + timeoutMs
  let avisou = false
  for (;;) {
    for (let i = 0; i < vagas; i++) {
      const arq = path.join(LOCKS_DIR, `${chaveSegura(chave)}.${i}.lock`)
      try {
        const fh = await fs.open(arq, 'wx')
        await fh.writeFile(JSON.stringify({ pid: process.pid, em: Date.now(), chave: `${chave}#${i}` }))
        await fh.close()
        try { return await fn() } finally { await fs.rm(arq, { force: true }).catch(() => {}) }
      } catch (e) {
        if (e.code !== 'EEXIST') throw e
        await limparOrfao(arq, staleMs)
      }
    }
    if (Date.now() > ate) throw new Error(`sem vaga em "${chave}" (${vagas}) depois de ${Math.round(timeoutMs / 60000)}min`)
    if (!avisou && aviso) { console.log(aviso); avisou = true }
    await sleep(900)
  }
}
