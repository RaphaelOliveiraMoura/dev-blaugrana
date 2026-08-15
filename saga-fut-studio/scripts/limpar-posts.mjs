// limpar-posts.mjs [--apagar] [--todos] [--so=<id>] [--tolerar-invisivel] — apaga o que há em
// `quadrinhos/<id>/posts/` (slide do carrossel e mosaico) DEPOIS de provar, arquivo por arquivo,
// que aquele arquivo se reconstrói. Sem `--apagar` roda em seco. Levantamento e método em
// `saga-fut/docs/DISCO.md`.
//
// POR QUE ISTO EXISTE E NÃO UM `rm -rf */posts`:
//
// 1. A PROVA E A EXCLUSÃO PRECISAM SER O MESMO ATO. `posts/` é derivado de `paineis/` mais o
//    JSON, então em tese tudo ali se regera de graça. Na prática, medido nos 159 slides dos 30
//    quadrinhos publicados em 15/08/2026, 132 voltam byte a byte e 21 NÃO voltam. Uma lista de
//    exceções escrita à mão envelhece no primeiro quadrinho novo; por isso aqui cada arquivo é
//    regerado num tmp e só é apagado se bater com o que está no disco. O que não bater fica, e
//    aparece nomeado no relatório com o motivo.
//
// 2. O QUE QUEBRA A RECONSTRUÇÃO NÃO É O CÓDIGO QUE GERA, É A ENTRADA. Os 21 divergiram por
//    quatro causas e nenhuma é bug do acabamento:
//      - FORMATO: o post saiu em 4:5 ou 9:16 e o `dimDoQuadrinho` devolve o 3:4 padrão. O
//        formato do export não fica salvo no quadrinho.
//      - CARIMBO: o "1/6" é parâmetro da rota de render, não campo do JSON. Um carrossel
//        publicado sem carimbo regera COM.
//      - TEXTO EDITADO DEPOIS: a legenda mudou no JSON e o slide no disco é o texto antigo.
//      - CAMPO SOBRESCRITO A CADA USO: o `coringas-torcedor` é deck de reação e o balão troca a
//        cada post; o JSON guarda só o último estado (hoje, `"sadasdasdads"`).
//    Em todos, o gerador está certo e a reconstrução mente. Nenhum gate pega isso, porque não há
//    nada errado no dado: ele só não descreve mais o que foi publicado.
//
// 3. `paineis/` NÃO SE REGERA E ESTÁ NA PASTA VIZINHA. A arte sai de geração de IA: regerar dá
//    outro desenho. Um glob errado que pegue `paineis/` custa o acervo. Por isso todo caminho
//    passa por `apagavel()` antes do unlink, e um teste alimenta a trava com caminhos proibidos
//    (`scripts/testes/limpar-posts.test.mjs`).
//
// 4. O MOSAICO É PROVADO, NÃO INFERIDO. Seria cômodo apagar o mosaico quando todos os slides do
//    quadrinho passassem, mas ele é montado por outro caminho (ffmpeg/xstack, noutro formato) e
//    "os slides bateram" não é prova sobre ele. Cada mosaico é remontado e comparado igual.
//
// 5. LÊ PELO MESMO CAMINHO QUE O RENDER. Os dados saem de `readDados()` e a lista de painéis é
//    montada como em `POST /render-quadrinho`, porque qualquer diferença na entrada vira
//    diferença no PNG e derruba a prova de arquivo que estava perfeito.
import fs from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { CONTEUDO_DIR } from '../server/config.mjs'
import { readDados } from '../server/store.mjs'
import { acabarPainel, artesParaMontar, dimDoQuadrinho } from '../server/lib/acabamento.mjs'
import { DIM_POST, montarMosaico } from '../server/lib/imagem.mjs'
import { carimbarProgresso, CANTO_PADRAO } from '../server/lib/carimbo.mjs'
import { temCarimbo } from '../shared/quadrinho-config.mjs'

// Diferença que conta como invisível, e ela SÓ vale com --tolerar-invisivel. Calibragem: os 6
// slides do `o-dia-pedri-legenda-codigo` diferiam do publicado a 90 dB de PSNR (um pixel de
// antialiasing na borda do texto) enquanto as divergências reais mediam de 19 a 31 dB. Não há
// meio-termo observado entre as duas faixas, mas o padrão continua sendo o md5 exato: limiar não
// é prova, e quem afrouxa precisa dizer que afrouxou.
const DELTA_MAX = 2      // por canal, 0..255
const PCT_MAX = 0.005    // 0,5% dos canais

const md5 = (p) => crypto.createHash('md5').update(readFileSync(p)).digest('hex')

// A TRAVA. Só sai daqui arquivo que casa o nome de um derivado E mora em `posts/` dentro do
// conteúdo. Tudo o mais (paineis/, capas/, um slide assinado à mão) é recusado.
export function apagavel(abs) {
  const rel = path.relative(CONTEUDO_DIR, abs)
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) return false
  const p = rel.split(path.sep)
  if (p.length !== 4 || p[0] !== 'quadrinhos' || p[2] !== 'posts') return false
  return /^slide-\d+\.png$/.test(p[3]) || /^mosaico-[\dx]+\.png$/.test(p[3])
}

// Compara publicado x regerado e devolve o veredito com o número que o sustenta.
export async function comparar(orig, novo, tolerar = false) {
  if (md5(orig) === md5(novo)) return { ok: true, motivo: 'identico' }
  const [a, b] = await Promise.all([
    sharp(orig).raw().toBuffer({ resolveWithObject: true }),
    sharp(novo).raw().toBuffer({ resolveWithObject: true }),
  ])
  if (a.info.width !== b.info.width || a.info.height !== b.info.height) {
    return { ok: false, motivo: `formato ${a.info.width}x${a.info.height} -> ${b.info.width}x${b.info.height}` }
  }
  if (a.data.length !== b.data.length) return { ok: false, motivo: 'numero de canais diferente' }
  let dif = 0, delta = 0
  for (let i = 0; i < a.data.length; i++) {
    const d = Math.abs(a.data[i] - b.data[i])
    if (d) { dif++; if (d > delta) delta = d }
  }
  const pct = dif / a.data.length
  const num = `delta ${delta}, ${(pct * 100).toFixed(3)}% dos canais`
  if (tolerar && delta <= DELTA_MAX && pct <= PCT_MAX) return { ok: true, motivo: `invisivel (${num})` }
  return { ok: false, motivo: `conteudo (${num})` }
}

async function principal() {
  const args = process.argv.slice(2)
  const APAGAR = args.includes('--apagar')
  const TODOS = args.includes('--todos')
  const TOLERAR = args.includes('--tolerar-invisivel')
  const SO = (args.find((a) => a.startsWith('--so=')) || '').slice(5)

  const r = { apagados: 0, bytes: 0, poupados: [], bytesPoupados: 0, semPasta: 0, pulados: [] }

  const remover = async (abs) => {
    if (!apagavel(abs)) throw new Error(`limpar-posts: recusado, fora de posts/ ou nome inesperado: ${abs}`)
    if (APAGAR) await fs.unlink(abs)
  }
  const poupar = async (rot, motivo, abs) => {
    r.poupados.push(`${rot}  ${motivo}`)
    r.bytesPoupados += (await fs.stat(abs)).size
  }

  const dados = await readDados()
  let alvos = dados.quadrinhos || []
  if (SO) {
    alvos = alvos.filter((q) => q.id === SO)
    if (!alvos.length) { console.error(`quadrinho nao encontrado: ${SO}`); process.exitCode = 1; return }
  }

  const tmpRaiz = await fs.mkdtemp(path.join(os.tmpdir(), 'limpar-posts-'))
  try {
    for (const q of alvos) {
      if (!TODOS && q.postado !== true) continue
      const pdir = path.join(CONTEUDO_DIR, 'quadrinhos', q.id, 'posts')
      if (!existsSync(pdir)) { r.semPasta++; continue }

      const tmp = await fs.mkdtemp(path.join(tmpRaiz, 'q-'))
      const arqs = (await fs.readdir(pdir)).sort()
      const dim = dimDoQuadrinho(q)
      const todosPaineis = q.paineis || []
      const carimbar = temCarimbo(q) && todosPaineis.length > 1

      // --- slides ---
      const gerados = []
      for (const a of arqs.filter((x) => /^slide-\d+\.png$/.test(x))) {
        const abs = path.join(pdir, a)
        const n = Number(a.match(/(\d+)/)[1])
        const painel = todosPaineis.find((p) => Number(p.numero) === n)
        const baseAbs = painel?.imagem ? path.join(CONTEUDO_DIR, painel.imagem) : null
        // sem a arte de origem não há como provar nada: fica, e diz por quê
        if (!baseAbs || !existsSync(baseAbs)) {
          await poupar(`${q.id}/${a}`, `SEM ORIGINAL (${painel?.imagem || 'painel ausente no JSON'})`, abs)
          continue
        }
        const outAbs = path.join(tmp, a)
        try {
          await acabarPainel({ quad: q, painel, baseAbs, dim, outAbs })
          gerados.push({ n, a, outAbs, orig: abs })
        } catch (e) { await poupar(`${q.id}/${a}`, `nao regerou: ${e.message}`, abs) }
      }
      if (carimbar) {
        for (const g of gerados) {
          await carimbarProgresso({ abs: g.outAbs, indice: g.n, total: todosPaineis.length, canto: CANTO_PADRAO })
        }
      }
      for (const g of gerados) {
        const sz = (await fs.stat(g.orig)).size
        const v = await comparar(g.orig, g.outAbs, TOLERAR)
        if (v.ok) { await remover(g.orig); r.apagados++; r.bytes += sz }
        else await poupar(`${q.id}/${g.a}`, v.motivo, g.orig)
      }

      // --- mosaicos: remontados e comparados, nunca inferidos dos slides ---
      for (const a of arqs.filter((x) => /^mosaico-/.test(x))) {
        const abs = path.join(pdir, a)
        const fmt = a.replace(/^mosaico-/, '').replace(/\.png$/, '').replace('x', ':')
        const dimM = DIM_POST[fmt]
        // a mesma lista que a rota monta: painel sem arte fica de fora lá, então aqui um
        // painel faltando muda o mosaico e a prova não vale
        const pngs = todosPaineis
          .filter((p) => p.imagem && existsSync(path.join(CONTEUDO_DIR, p.imagem)))
          .map((p) => ({ numero: p.numero, png: path.join(CONTEUDO_DIR, p.imagem), legendas: p.legendas, falas: p.falas }))
        if (!dimM || !pngs.length || pngs.length !== todosPaineis.length) {
          await poupar(`${q.id}/${a}`, dimM ? 'falta arte de painel' : `formato ${fmt} desconhecido`, abs)
          continue
        }
        const sz = (await fs.stat(abs)).size
        try {
          const dirM = await fs.mkdtemp(path.join(tmp, 'mos-'))
          const acabadas = await artesParaMontar({ quad: q, paineis: pngs, dim: dimM, dir: dirM })
          const outAbs = path.join(tmp, a)
          await montarMosaico({ pngs: acabadas.map((p) => p.png), dim: dimM, saida: outAbs })
          const v = await comparar(abs, outAbs, TOLERAR)
          if (v.ok) { await remover(abs); r.apagados++; r.bytes += sz }
          else await poupar(`${q.id}/${a}`, v.motivo, abs)
        } catch (e) { await poupar(`${q.id}/${a}`, `nao remontou: ${e.message}`, abs) }
      }
    }
  } finally {
    await fs.rm(tmpRaiz, { recursive: true, force: true })
  }

  const mb = (b) => (b / 1048576).toFixed(0)
  console.log(APAGAR ? '=== APAGADO ===' : '=== SIMULACAO (nada foi apagado; use --apagar) ===')
  console.log(`escopo           : ${SO ? `so ${SO}` : TODOS ? 'TODOS os quadrinhos' : 'so os publicados (postado: true)'}`)
  console.log(`provados e fora  : ${r.apagados} = ${mb(r.bytes)} MB`)
  console.log(`poupados         : ${r.poupados.length} = ${mb(r.bytesPoupados)} MB`)
  if (r.poupados.length) {
    console.log('')
    console.log('--- ficaram no disco, com o motivo ---')
    r.poupados.forEach((s) => console.log('   ', s))
  }
  r.pulados.forEach((s) => console.log('   PULADO', s))
  console.log('')
  console.log('para regerar: POST /api/render-quadrinho {"quadrinhoId":"<id>"} (studio de pe)')
}

// Só roda quando chamado direto: o teste importa `apagavel` e `comparar` sem disparar a limpeza.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await principal()
}
