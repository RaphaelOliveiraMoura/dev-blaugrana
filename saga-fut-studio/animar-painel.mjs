// Anima UM painel de quadrinho via Grok Imagine (image_to_video), reusando o
// provider de vídeo. É o análogo do gerar-painel.mjs (que gera a imagem via Codex).
//
//   node animar-painel.mjs <quadrinhoId> <painelNumero> ["descricao do movimento"]
//
// A arte parada (3:4) precisa já existir em quadrinhos/<id>/paineis/<n>.png.
// A animação sai em quadrinhos/<id>/animacoes/<n>.mp4 (separada do vídeo 9:16 de
// post, que é montado por outro caminho e não é sobrescrito aqui).
import path from 'node:path'
import fs from 'node:fs/promises'
import { generateVideo } from './server/providers/grok-video.mjs'
import { CONTEUDO_DIR } from './server/config.mjs'

const quadrinhoId = process.argv[2]
const painelNumero = Number(process.argv[3] || 1)
const movimento = process.argv[4] || 'movimento sutil e natural: leve respiração dos personagens, micro-movimentos, e um discreto push-in de câmera. Mantenha o traço e as cores idênticos à arte original.'

if (!quadrinhoId) {
  console.error('uso: node animar-painel.mjs <quadrinhoId> <painelNumero> ["movimento"]')
  process.exit(1)
}

const imagemRel = `quadrinhos/${quadrinhoId}/paineis/${painelNumero}.png`
const outRel = `quadrinhos/${quadrinhoId}/animacoes/${painelNumero}.mp4`
const imagemAbs = path.join(CONTEUDO_DIR, imagemRel)
const outAbs = path.join(CONTEUDO_DIR, outRel)

try {
  await fs.access(imagemAbs)
} catch {
  console.error(`arte não encontrada: ${imagemRel}. Gere o painel antes.`)
  process.exit(1)
}
await fs.mkdir(path.dirname(outAbs), { recursive: true })

console.log('FONTE:', imagemRel)
console.log('SAIDA:', outRel)
console.log('MOVIMENTO:', movimento)
console.log('gerando (Grok Imagine)...')

await generateVideo({ cwd: CONTEUDO_DIR, imagemRel, outRel, outAbs, movimento })
const st = await fs.stat(outAbs)
console.log('OK ->', outAbs, '|', (st.size / 1024 / 1024).toFixed(1), 'MB')
