// Provider de imagem via Grok Build CLI (assinatura SuperGrok, sem API key).
// Análogo do codex-image.mjs, mas o Grok tem DUAS ferramentas de imagem:
//   - image_gen:  texto -> imagem (prompt + aspect_ratio). NÃO aceita referência.
//   - image_edit: image-to-image (prompt + image[] + aspect_ratio). É o equivalente
//                 do -i do gpt-image: as fichas entram por aqui e seguram a identidade.
// Então: com referências, usa image_edit; sem, image_gen. Mesma tática de polling do
// codex-image (retorna quando o PNG fica estável e mata a árvore do processo).
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function statSafe(p) {
  try { return await fs.stat(p) } catch { return null }
}

// Reduz w:h ao menor par inteiro (1152x1536 -> "3:4"). O Grok pede aspect_ratio como
// proporção, não pixels; a trava de tamanho exata fica pro normalizarImagem depois.
function aspectRatio(dim) {
  if (!dim?.w || !dim?.h) return null
  const gcd = (a, b) => (b ? gcd(b, a % b) : a)
  const g = gcd(dim.w, dim.h)
  return `${dim.w / g}:${dim.h / g}`
}

// Como cada papel de referência deve ser tratado no image_edit. Mesma ideia dos papéis
// do instrucaoCodex, condensada: o que copiar e o que não copiar de cada anexo.
const PAPEL = {
  personagem: 'mantenha este personagem IDÊNTICO a esta ficha (mesmo rosto, cabelo, cor de pele, roupa e número); só expressão e pose vêm do prompt',
  cenario: 'reutilize o cenário, o enquadramento e as POSIÇÕES exatamente como neste painel; não espelhe os lados; só gestos e expressões mudam',
  estilo: 'copie APENAS o traço/estilo desta imagem (medium, linha, paleta, sombreado); não copie o personagem nem a composição',
  aparencia: 'use esta foto só para a SEMELHANÇA facial de quem é a pessoa; não copie o realismo da foto, desenhe no estilo pedido',
}

// Monta a instrução do Grok a partir do pedido (o mesmo que o codex recebe) e do caminho
// ABSOLUTO de saída. Referências e saída vão como caminhos absolutos, então independe do cwd.
export function instrucaoGrokImagem(pedido, outAbs, contentDir) {
  const { composed, orient, refs = [], dim } = pedido
  const ar = aspectRatio(dim)
  const refsAbs = refs.map((r) => path.join(contentDir, r.rel))

  const cabeca = refs.length
    ? [
        `Use a ferramenta image_edit para criar UMA imagem.`,
        `Passe estas imagens no parâmetro image[] (nesta ordem): ${refsAbs.join(', ')}.`,
        `Papel de cada referência: ${refs.map((r, i) => `imagem ${i + 1} (${r.papel}) — ${PAPEL[r.papel] || PAPEL.personagem}`).join('; ')}.`,
      ].join(' ')
    : `Use a ferramenta image_gen para criar UMA imagem.`

  return [
    cabeca,
    ar ? `aspect_ratio: ${ar}.` : '',
    orient ? `Orientação/tamanho alvo: ${orient}` : '',
    ``,
    `PROMPT DA IMAGEM:`,
    composed,
    ``,
    `Salve o PNG resultante EXATAMENTE em: ${outAbs}. Sobrescreva se já existir. Não peça confirmação e não faça mais nada.`,
  ].filter((l) => l !== undefined).join('\n')
}

export async function generateImage({ cwd, prompt, outAbs, timeoutMs = 600000 }) {
  const args = ['--no-auto-update', '--permission-mode', 'bypassPermissions', '-p', prompt]
  const started = Date.now()

  const result = await new Promise((resolve) => {
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

    const poll = setInterval(async () => {
      const st = await statSafe(outAbs)
      if (st && st.mtimeMs >= started - 2000 && st.size > 10000) {
        await sleep(1200)
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
    if (st && st.mtimeMs >= started - 2000 && st.size > 10000) return { ok: true, log: result.log }
  }

  const log = result.log || ''
  const moderado = /moderation|safety|rejected|não posso|nao posso|cannot/i.test(log)
  let motivo
  if (result.reason === 'timeout') motivo = `Tempo esgotado (${Math.round(timeoutMs / 60000)}min).`
  else if (moderado) motivo = 'A geração pode ter sido barrada pelo filtro de moderação da xAI. Ajuste o prompt e tente de novo.'
  else motivo = result.reason || 'A geração terminou sem gravar o arquivo. Veja o log do servidor.'
  throw new Error(motivo + (log ? '\n\n' + log.split('\n').filter(Boolean).slice(-8).join('\n') : ''))
}
