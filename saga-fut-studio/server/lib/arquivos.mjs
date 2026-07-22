import fs from 'node:fs/promises'
import path from 'node:path'
import { BACKUPS_DIR, CONTEUDO_DIR } from '../config.mjs'

export async function exists(p) {
  try { await fs.access(p); return true } catch { return false }
}

export async function firstExisting(paths) {
  for (const p of paths) {
    if (await exists(p)) return p
  }
  return null
}

// Backup antes de sobrescrever: copia o arquivo atual para _backups/<caminho>.<ts>.<ext>
// e mantém só as últimas `keep` versões daquele arquivo. Nunca lança (best-effort):
// perder o backup não pode impedir a operação.
export async function backupFile(absPath, keep = 5) {
  if (!(await exists(absPath))) return null // não existe ainda → nada a preservar
  try {
    const rel = path.relative(CONTEUDO_DIR, absPath)
    const ext = path.extname(rel)
    const base = path.basename(rel, ext)
    const dir = path.join(BACKUPS_DIR, path.dirname(rel))
    await fs.mkdir(dir, { recursive: true })
    const ts = new Date().toISOString().replace(/[:.]/g, '-')
    await fs.copyFile(absPath, path.join(dir, `${base}.${ts}${ext}`))
    // poda: mantém só as `keep` mais recentes desse arquivo
    const irmaos = (await fs.readdir(dir))
      .filter((f) => f.startsWith(base + '.') && f.endsWith(ext))
      .sort()
    for (const velho of irmaos.slice(0, Math.max(0, irmaos.length - keep))) {
      await fs.rm(path.join(dir, velho), { force: true })
    }
    return dir
  } catch { return null }
}

// Restaura o backup mais recente de um arquivo: o inverso do backupFile. Traz de volta a
// versão anterior e CONSOME esse backup, então um novo "reverter" vai pra versão anterior
// a essa (desfazer em cadeia, até as `keep` guardadas). Retorna o caminho restaurado ou
// null se não há backup. O `rel` vem do cliente, então passa pelo dentroDoConteudo.
export async function restaurarUltimoBackup(rel) {
  const absPath = dentroDoConteudo(rel)
  const relSafe = path.relative(CONTEUDO_DIR, absPath)
  const ext = path.extname(relSafe)
  const base = path.basename(relSafe, ext)
  const dir = path.join(BACKUPS_DIR, path.dirname(relSafe))
  let irmaos
  try {
    irmaos = (await fs.readdir(dir)).filter((f) => f.startsWith(base + '.') && f.endsWith(ext)).sort()
  } catch { return null }
  const ultimo = irmaos[irmaos.length - 1]
  if (!ultimo) return null
  await fs.copyFile(path.join(dir, ultimo), absPath)
  await fs.rm(path.join(dir, ultimo), { force: true })
  return absPath
}

export async function atomicWrite(absPath, str) {
  await fs.mkdir(path.dirname(absPath), { recursive: true })
  const tmp = absPath + '.tmp'
  await fs.writeFile(tmp, str, 'utf-8')
  await fs.rename(tmp, absPath) // rename é atômico no mesmo FS
}

// Grava só se o conteúdo mudou (com backup do anterior). Retorna true se escreveu.
export async function writeIfChanged(absPath, str, keep) {
  let atual = null
  try { atual = await fs.readFile(absPath, 'utf-8') } catch {}
  if (atual === str) return false
  await backupFile(absPath, keep)
  await atomicWrite(absPath, str)
  return true
}

// Impede que um caminho vindo do cliente escape da pasta de conteúdo.
export function dentroDoConteudo(rel) {
  const safe = path.normalize(rel).replace(/^(\.\.[/\\])+/, '')
  return path.join(CONTEUDO_DIR, safe)
}
