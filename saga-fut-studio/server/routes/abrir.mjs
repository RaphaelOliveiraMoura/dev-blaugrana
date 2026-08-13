import { Router } from 'express'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { stat } from 'node:fs/promises'
import { CONTEUDO_DIR } from '../config.mjs'
import { corpoInvalido } from '../lib/corpo.mjs'

export const abrirRouter = Router()

// ABRIR A PASTA DA PEÇA NO FINDER.
//
// O studio roda na máquina do autor, então "abrir no gerenciador de arquivos" é uma ação local
// legítima: é a mesma coisa que ele faria à mão, com dois cliques a menos.
//
// DUAS TRAVAS, e nenhuma é paranoia de manual:
//
//   1. O caminho é RESOLVIDO e conferido contra CONTEUDO_DIR. `dentroDoConteudo` normaliza e
//      remove os `../` do começo, mas não impede um `a/../../b` no meio; aqui a checagem é no
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

  const alvo = path.resolve(CONTEUDO_DIR, caminho)
  const raiz = path.resolve(CONTEUDO_DIR)
  if (alvo !== raiz && !alvo.startsWith(raiz + path.sep)) {
    return res.status(400).json({ error: 'Caminho fora da pasta de conteúdo.' })
  }

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
