import { Router } from 'express'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { stat } from 'node:fs/promises'
import { CONTEUDO_DIR } from '../config.mjs'
import { corpoInvalido } from '../lib/corpo.mjs'

const execFileP = promisify(execFile)

export const abrirRouter = Router()

function resolverNoConteudo(relativo) {
  if (typeof relativo !== 'string' || !relativo.trim()) return { erro: 'Caminho vazio.' }
  const alvo = path.resolve(CONTEUDO_DIR, relativo)
  const raiz = path.resolve(CONTEUDO_DIR)
  if (alvo !== raiz && !alvo.startsWith(raiz + path.sep)) {
    return { erro: 'Caminho fora da pasta de conteúdo.' }
  }
  return { alvo }
}

// ABRIR A PASTA DA PEÇA NO FINDER.
//
// O studio roda na máquina do autor, então "abrir no gerenciador de arquivos" é uma ação local
// legítima: é a mesma coisa que ele faria à mão, com dois cliques a menos.
//
// DUAS TRAVAS, e nenhuma é paranoia de manual:
//
//   1. O caminho é RESOLVIDO e conferido contra CONTEUDO_DIR. `path.resolve` sozinho
//      remove os `../` do começo, mas não impede um `a/../../b` no meio; a checagem é no
//      caminho final, depois do resolve, que é a única que vale. Sem isso, um corpo com
//      `"quadrinhos/x/../../../.ssh"` abriria o que quisesse.
//   2. `execFile` com ARRAY de argumentos, nunca `exec` com string montada. Com `exec`, um id
//      contendo `; rm -rf` viraria comando; com execFile o argumento é argumento, ponto.
//
// Só abre PASTA, e só se ela existir: apontar pro Finder um caminho que não existe abre a janela
// no lugar errado e a pessoa acha que a peça sumiu.
const CAMPOS = ['caminho']

function comando() {
  if (process.platform === 'darwin') return 'open'
  if (process.platform === 'win32') return 'explorer'
  return 'xdg-open'
}

abrirRouter.post('/abrir-pasta', async (req, res) => {
  if (corpoInvalido(req, res, CAMPOS, 'abrir-pasta')) return
  const { caminho } = req.body || {}
  if (typeof caminho !== 'string' || !caminho.trim()) {
    return res.status(400).json({ error: 'Falta `caminho` (relativo ao conteúdo).' })
  }

  const { alvo, erro } = resolverNoConteudo(caminho)
  if (erro) return res.status(400).json({ error: erro })

  try {
    const st = await stat(alvo)
    if (!st.isDirectory()) return res.status(400).json({ error: 'O caminho não é uma pasta.' })
  } catch {
    return res.status(404).json({ error: `A pasta ainda não existe: ${caminho}` })
  }

  execFile(comando(), [alvo], (err) => {
    if (err) console.warn('[abrir-pasta]', err.message)
  })
  res.json({ ok: true, abriu: alvo })
})

// COPIAR ARQUIVOS PRA ÁREA DE TRANSFERÊNCIA COMO O FINDER COPIA.
//
// O compositor do X cola várias imagens de uma vez só quando a clipboard traz ARQUIVOS
// (NSPasteboard de NSURL), não quando traz image/png. O browser não consegue escrever
// isso: clipboard.write no Chrome copia uma imagem só. Aqui o studio está na mesma
// máquina, então o servidor põe os POSIX files na pasteboard e o Cmd+V no X anexa o lote.
//
// A trava de caminho é a mesma do abrir-pasta. No máximo 4: é o teto do X por post.
const CAMPOS_CLIP = ['caminhos']

abrirRouter.post('/clipboard-arquivos', async (req, res) => {
  if (corpoInvalido(req, res, CAMPOS_CLIP, 'clipboard-arquivos')) return
  if (process.platform !== 'darwin') {
    return res.status(400).json({ error: 'Copiar arquivos pra área de transferência só funciona no Mac.' })
  }
  const { caminhos } = req.body || {}
  if (!Array.isArray(caminhos) || caminhos.length < 1 || caminhos.length > 4) {
    return res.status(400).json({ error: 'Mande `caminhos` com 1 a 4 arquivos (teto do X por post).' })
  }

  const abs = []
  for (const rel of caminhos) {
    const { alvo, erro } = resolverNoConteudo(rel)
    if (erro) return res.status(400).json({ error: erro })
    try {
      const st = await stat(alvo)
      if (!st.isFile()) return res.status(400).json({ error: `Não é arquivo: ${rel}` })
    } catch {
      return res.status(404).json({ error: `Arquivo ainda não existe: ${rel}` })
    }
    abs.push(alvo)
  }

  const script = `
    ObjC.import('AppKit');
    const paths = ${JSON.stringify(abs)};
    const arr = $.NSMutableArray.array;
    for (const p of paths) arr.addObject($.NSURL.fileURLWithPath(p));
    const pb = $.NSPasteboard.generalPasteboard;
    pb.clearContents;
    const ok = pb.writeObjects(arr);
    if (!ok) throw new Error('o macOS recusou gravar os arquivos na área de transferência');
  `
  try {
    await execFileP('osascript', ['-l', 'JavaScript', '-e', script], { timeout: 8000 })
  } catch (e) {
    return res.status(500).json({ error: e.stderr?.toString?.() || e.message })
  }
  res.json({ ok: true, n: abs.length })
})
