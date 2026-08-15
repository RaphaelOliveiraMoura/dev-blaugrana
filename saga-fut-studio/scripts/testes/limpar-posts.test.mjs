// limpar-posts.test.mjs — A TRAVA DO `limpar-posts` AINDA RECUSA. Roda em segundos, não gera nada.
//
// POR QUE EXISTE: o `limpar-posts.mjs` apaga arquivo do acervo, e a pasta VIZINHA da que ele
// varre é `paineis/`, que sai de geração de IA e não se reconstrói. O modo de falhar aqui não é
// apagar de menos, é apagar a fonte: basta um `path.join` errado, um `..` no id ou alguém
// afrouxar o regex do nome pra "também pegar o slide assinado". Nada disso dá erro, e o prejuízo
// só aparece quando o painel for necessário de novo.
//
// Então a trava é alimentada com os caminhos que ela TEM que recusar. Um `apagavel()` que passe a
// devolver true pra `paineis/` reprova aqui antes de encostar no disco.
//
// O segundo teste é sobre o outro lado: `comparar()` precisa distinguir arte igual de arte
// diferente. Se ele passar a devolver ok pra tudo (uma exceção engolida, um md5 sempre igual), a
// ferramenta vira `rm -rf` com relatório bonito.
//
//   node scripts/testes/limpar-posts.test.mjs
import path from 'node:path'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import sharp from 'sharp'
import { apagavel, comparar } from '../limpar-posts.mjs'
import { CONTEUDO_DIR } from '../../server/config.mjs'

let ok = 0, falhou = 0
const teste = async (nome, fn) => {
  try { await fn(); console.log(`  ok   ${nome}`); ok++ }
  catch (e) { console.log(`  FALHOU ${nome}\n         ${e.message}`); falhou++ }
}
const ok_ = (cond, msg) => { if (!cond) throw new Error(msg) }
const noConteudo = (...p) => path.join(CONTEUDO_DIR, ...p)

console.log('\n== A TRAVA DEIXA PASSAR O QUE É DERIVADO ==')

await teste('slide do carrossel', () => {
  ok_(apagavel(noConteudo('quadrinhos', 'o-dia-pickles', 'posts', 'slide-3.png')), 'recusou um slide normal')
})
await teste('mosaico', () => {
  ok_(apagavel(noConteudo('quadrinhos', 'o-dia-pickles', 'posts', 'mosaico-3x4.png')), 'recusou um mosaico normal')
})

console.log('\n== A TRAVA RECUSA A FONTE (é por isto que o teste existe) ==')

// O caso que custa o acervo: a arte de IA mora na pasta ao lado, com nome igualmente numerado.
await teste('RECUSA paineis/1.png', () => {
  ok_(!apagavel(noConteudo('quadrinhos', 'o-dia-pickles', 'paineis', '1.png')), 'ACEITOU APAGAR UM PAINEL')
})
await teste('RECUSA paineis/ com nome de slide', () => {
  ok_(!apagavel(noConteudo('quadrinhos', 'x', 'paineis', 'slide-1.png')), 'ACEITOU APAGAR DENTRO DE paineis/')
})
await teste('RECUSA capas/ (escolhidas olhando, não se regeram)', () => {
  ok_(!apagavel(noConteudo('quadrinhos', 'o-dia-jules-rimet', 'capas', 'a.png')), 'ACEITOU APAGAR UMA CAPA')
})
await teste('RECUSA personagens/ (geração paga)', () => {
  ok_(!apagavel(noConteudo('personagens', 'ferran-riso', 'base.png')), 'ACEITOU APAGAR ARTE DE PERSONAGEM')
})
await teste('RECUSA o slide assinado à mão', () => {
  ok_(!apagavel(noConteudo('quadrinhos', 'o-dia-jules-rimet', 'posts', 'slide-8-assinado.png')), 'ACEITOU o assinado')
})
await teste('RECUSA fuga por .. no id', () => {
  ok_(!apagavel(noConteudo('quadrinhos', '..', '..', 'posts', 'slide-1.png')), 'ACEITOU caminho com ..')
})
await teste('RECUSA fora do conteúdo', () => {
  ok_(!apagavel('/etc/passwd'), 'ACEITOU caminho de fora')
  ok_(!apagavel(path.join(tmpdir(), 'quadrinhos', 'x', 'posts', 'slide-1.png')), 'ACEITOU posts/ de outra raiz')
})
await teste('RECUSA video.mp4 e _elenco.png na raiz do quadrinho', () => {
  ok_(!apagavel(noConteudo('quadrinhos', 'x', 'video.mp4')), 'ACEITOU o mp4')
  ok_(!apagavel(noConteudo('quadrinhos', 'x', '_elenco.png')), 'ACEITOU a folha de elenco')
})

console.log('\n== A COMPARAÇÃO AINDA SABE DIZER NÃO ==')

const dir = await mkdtemp(path.join(tmpdir(), 'limpar-posts-test-'))
const png = async (nome, cor, w = 60, h = 80) => {
  const abs = path.join(dir, nome)
  await sharp({ create: { width: w, height: h, channels: 3, background: cor } }).png().toFile(abs)
  return abs
}

await teste('arquivos iguais -> ok', async () => {
  const a = await png('a.png', '#cccccc'), b = await png('b.png', '#cccccc')
  const v = await comparar(a, b)
  ok_(v.ok && v.motivo === 'identico', `devia ser identico, veio ${JSON.stringify(v)}`)
})
await teste('arte diferente -> NAO ok', async () => {
  const a = await png('c.png', '#cccccc'), b = await png('d.png', '#cc0000')
  const v = await comparar(a, b)
  ok_(!v.ok, 'aprovou arte visivelmente diferente')
  ok_(/conteudo/.test(v.motivo), `motivo devia falar de conteudo, veio "${v.motivo}"`)
})
await teste('tamanho diferente -> NAO ok, e diz que é formato', async () => {
  const a = await png('e.png', '#cccccc', 60, 80), b = await png('f.png', '#cccccc', 60, 75)
  const v = await comparar(a, b)
  ok_(!v.ok, 'aprovou dimensao diferente')
  ok_(/formato 60x80 -> 60x75/.test(v.motivo), `motivo devia dar as duas dimensoes, veio "${v.motivo}"`)
})
await teste('diferença grande NÃO passa nem com --tolerar-invisivel', async () => {
  const a = await png('g.png', '#cccccc'), b = await png('h.png', '#cc0000')
  const v = await comparar(a, b, true)
  ok_(!v.ok, 'a tolerancia de antialiasing aprovou uma arte OUTRA')
})

await rm(dir, { recursive: true, force: true })

console.log(`\n${falhou ? 'FALHOU' : 'ok'}  ${ok} passaram, ${falhou} falharam\n`)
process.exit(falhou ? 1 : 0)
