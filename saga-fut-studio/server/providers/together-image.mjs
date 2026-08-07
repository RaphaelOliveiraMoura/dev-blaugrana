// Provider de imagem via Together AI (API REST, com API KEY — diferente dos outros dois).
//
// A DIFERENÇA QUE IMPORTA ANTES DE QUALQUER CÓDIGO: Codex e Grok rodam por CLI, na assinatura que o
// Raphael já paga (Plus/SuperGrok), então uma geração a mais custa tempo, não dinheiro. A Together
// cobra POR IMAGEM. Isso muda o que é prudente: um `asset lote` de 100 folhas aqui é uma fatura, e
// por isso o registro declara `assinatura: 'API paga (por imagem)'` — o studio mostra isso no
// seletor, e é a única forma de quem troca o modelo global saber o que está trocando.
//
// CHAVE: lida de TOGETHER_API_KEY no ambiente, nunca de arquivo do projeto (não versionar segredo).
// Sem a variável, o provider falha com a instrução de como configurar, em vez de estourar um 401
// críptico no meio de um lote.
import fs from 'node:fs/promises'
import path from 'node:path'
import { comVaga, comLock } from '../lib/lock.mjs'
import { MAX_GERACOES_PARALELAS } from '../../shared/constantes.mjs'

const ENDPOINT = 'https://api.together.ai/v1/images/generations'

// O modelo é configurável porque o catálogo da Together muda rápido e trocar não pode exigir deploy.
//
// O PADRÃO É gpt-image-2, ESCOLHIDO NUM BAKE-OFF (02/08/2026): o mesmo model sheet, o mesmo prompt e
// as mesmas referências em oito modelos (FLUX.2 dev/pro, Wan 2.6, Qwen 2.0, gpt-image 1.5/2, Nano
// Banana e Nano Banana 2). Sete foram reprovados no olho, e quase todos pelo mesmo defeito: MISTURAR
// a aparência do personagem-padrão na do alvo. Isso é fatal aqui, porque a referência de pose é o
// mecanismo central da casa — toda folha nova nasce copiando uma folha aprovada de outro personagem.
// O Nano Banana 2 chegou perto (28s, $0,047, mais rápido e mais barato) mas apagou a máscara do
// personagem, que era a identidade inteira dele.
//
// O padrão daqui ficou meses declarando FLUX.2-pro sem NUNCA ter gerado nada: todas as imagens que a
// Together produziu saíram de um `TOGETHER_MODELO=openai/gpt-image-2` digitado na linha de comando,
// que morre com o processo. Padrão que não é o praticado é uma armadilha esperando o primeiro lote
// que rodar sem o override.
export const TOGETHER_MODELO = process.env.TOGETHER_MODELO || 'openai/gpt-image-2'

// Como cada família recebe as imagens de entrada. Não é preferência de estilo: é o que cada uma
// aceita, medido chamando a API.
//   kontext  -> `image_url`, UMA imagem
//   flux.2   -> `reference_images`, array
const campoDeReferencia = (modelo) => (/kontext/i.test(modelo) ? 'image_url' : 'reference_images')
// quantas referências o modelo aceita de fato; o resto é descartado com aviso, nunca em silêncio
export const TOGETHER_MAX_REFS = Number(process.env.TOGETHER_MAX_REFS || 4)
// quantas vezes insistir quando a API devolve 429 (a primeira tentativa conta)
export const TOGETHER_TENTATIVAS = Number(process.env.TOGETHER_TENTATIVAS || 5)

function exigirChave() {
  const k = process.env.TOGETHER_API_KEY
  if (!k) {
    throw new Error(
      'TOGETHER_API_KEY não está no ambiente.\n' +
      '     A chave sai de https://api.together.ai/settings/api-keys e vai numa variável de\n' +
      '     ambiente (ex.: no ~/.zshrc: export TOGETHER_API_KEY="..."), nunca num arquivo do repo.\n' +
      '     Depois de exportar, reinicie o studio pra ele enxergar a variável.')
  }
  return k
}

// Arquivo local -> data URI. As referências do projeto são PNGs no disco, e a API só recebe imagem
// por campo de texto. A documentação fala em "URL"; data URI é o único jeito de mandar um arquivo
// local sem hospedar nada em lugar público, e é o formato que a maioria destas APIs aceita no mesmo
// campo. Se um dia responder 400 aqui, é este ponto que está em questão — a alternativa seria subir
// as referências pra algum storage antes, o que muda o custo e a privacidade do pipeline.
async function comoDataUri(abs) {
  const b = await fs.readFile(abs)
  const ext = path.extname(abs).toLowerCase()
  const mime = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.webp' ? 'image/webp' : 'image/png'
  return `data:${mime};base64,${b.toString('base64')}`
}

// Mesmo teto e mesmo lock dos outros providers: o teto é por PROCESSO de geração, não por
// ferramenta, senão trocar de modelo global contornaria o limite sem querer. E o lock por arquivo
// de saída impede que dois vídeos que precisam do mesmo asset compartilhado escrevam por cima um do
// outro (ver codex-image.mjs, que resolveu isso primeiro).
export async function generateImage(args) {
  const { outAbs } = args
  return comLock(`asset-${path.basename(path.dirname(outAbs))}-${path.basename(outAbs)}`,
    () => comVaga('together', MAX_GERACOES_PARALELAS, () => gerar(args),
      { aviso: `[together] ${MAX_GERACOES_PARALELAS} gerações já rodando, esperando vaga...` }),
    { aviso: `[together] outro processo está gerando ${path.basename(outAbs)}, esperando...` })
}

async function gerar({ prompt, referencias = [], outAbs, timeoutMs = 600000, dim = null, aspectRatio = null, cwd = null }) {
  const chave = exigirChave()
  await fs.mkdir(path.dirname(outAbs), { recursive: true })

  // um modelo kontext só recebe UMA imagem: o teto cai pra 1 e as outras são descartadas COM AVISO,
  // porque perder a model sheet e a folha anterior muda o resultado e não pode acontecer calado
  const teto = campoDeReferencia(TOGETHER_MODELO) === 'image_url' ? 1 : TOGETHER_MAX_REFS
  const usadas = referencias.slice(0, teto)
  if (referencias.length > usadas.length) {
    console.warn(`[together] ${referencias.length} referências pedidas, ${usadas.length} enviada(s): "${TOGETHER_MODELO}" aceita ${teto}.`)
    console.warn('           A PRIMEIRA é a que mais pesa na identidade, então a ordem do gen-* importa aqui.')
  }
  const imagens = []
  // REFERÊNCIA RELATIVA SE RESOLVE CONTRA O `cwd` DO CHAMADOR, não contra o do processo. O
  // codex-image faz isso porque roda a CLI dentro do cwd; aqui era preciso repetir a regra, e não
  // repetir custou um "arquivo não encontrado" apontando pra dentro do saga-fut-studio quando o
  // chamador falava de caminhos dentro de saga-fut.
  const base = cwd || process.cwd()
  for (const r of usadas) imagens.push(await comoDataUri(path.isAbsolute(r) ? r : path.resolve(base, r)))

  const corpo = {
    model: TOGETHER_MODELO,
    prompt,
    n: 1,
    response_format: 'base64',
    ...(imagens.length && campoDeReferencia(TOGETHER_MODELO) === 'image_url'
      ? { image_url: imagens[0] }
      : imagens.length ? { reference_images: imagens } : {}),
    // kontext/schnell usam aspect_ratio; os demais, width/height. Manda o que o chamador souber.
    ...(aspectRatio ? { aspect_ratio: aspectRatio } : {}),
    ...(dim?.w && dim?.h && !aspectRatio ? { width: dim.w, height: dim.h } : {}),
  }

  const t0 = Date.now()
  let resp

  // BACK-OFF NO 429, e isto NÃO é refinamento: a Together limita por janela curta, e o teto de
  // paralelismo da casa (4) é justamente o que dispara o limite. Na primeira leva de 12 gestos,
  // SEIS morreram em 429 — metade da rodada perdida por uma condição que a própria resposta diz
  // como tratar ("retry starting from ~1s, exponential back-off helps").
  //
  // A diferença pros outros dois providers é estrutural: Codex e Grok são CLI e a fila é local, aqui
  // a fila é do outro lado da rede. Sem back-off, todo lote grande perde uma fração das folhas — e
  // perde de um jeito que parece defeito de arte no relatório, não limite de API.
  for (let tentativa = 1; ; tentativa++) {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    try {
      resp = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
        signal: ctrl.signal,
      })
    } catch (e) {
      clearTimeout(timer)
      // TIMEOUT NÃO SE REPETE: quem estourou o relógio pode ter gerado do outro lado, e insistir
      // arrisca pagar duas vezes pela mesma folha.
      if (e.name === 'AbortError') throw new Error(`together: estourou ${Math.round(timeoutMs / 1000)}s`)
      // ERRO DE REDE SE REPETE, e é seguro porque a request nem chegou: nada foi gerado, nada foi
      // cobrado. Custou duas folhas em 03/08/2026 — um EHOSTUNREACH no meio de uma cadeia derrubou
      // a geração e a seguinte junto, e o log parecia defeito do gerador.
      if (tentativa >= TOGETHER_TENTATIVAS) throw new Error(`together: ${e.message} (${tentativa} tentativas)`)
      const espera = Math.min(2000 * 2 ** (tentativa - 1), 30000)
      console.warn(`[together] rede caiu (${e.cause?.code || e.message}), esperando ${Math.round(espera / 1000)}s e tentando de novo (${tentativa}/${TOGETHER_TENTATIVAS - 1})`)
      await new Promise((r) => setTimeout(r, espera))
      continue
    }
    clearTimeout(timer)
    if (resp.status !== 429 || tentativa >= TOGETHER_TENTATIVAS) break
    // o header manda; sem ele, dobra a cada tentativa a partir de 2s
    const reset = Number(resp.headers.get('x-ratelimit-reset')) || 0
    const espera = Math.min(reset > 0 ? reset * 1000 : 2000 * 2 ** (tentativa - 1), 60000)
    console.warn(`[together] rate limit (429), esperando ${Math.round(espera / 1000)}s e tentando de novo (${tentativa}/${TOGETHER_TENTATIVAS - 1})`)
    await new Promise((r) => setTimeout(r, espera))
  }

  if (!resp.ok) {
    const txt = await resp.text().catch(() => '')
    // A mensagem da API vem no corpo e é o que diz se o problema é chave, modelo ou parâmetro.
    // Engolir isso e devolver só "400" já custou horas de diagnóstico em outros pontos do projeto.
    throw new Error(`together: HTTP ${resp.status} — ${txt.slice(0, 400)}`)
  }

  const json = await resp.json()
  const item = json?.data?.[0]
  const b64 = item?.b64_json
  if (!b64) {
    if (item?.url) {
      const img = await fetch(item.url)
      if (!img.ok) throw new Error(`together: a resposta veio como URL e o download falhou (HTTP ${img.status})`)
      await fs.writeFile(outAbs, Buffer.from(await img.arrayBuffer()))
      console.log(`OK together ${path.basename(outAbs)} ${Math.round((Date.now() - t0) / 1000)}s (via url)`)
      return { ok: true, ms: Date.now() - t0 }
    }
    throw new Error(`together: resposta sem imagem (${JSON.stringify(json).slice(0, 300)})`)
  }
  await fs.writeFile(outAbs, Buffer.from(b64, 'base64'))
  console.log(`OK together ${path.basename(outAbs)} ${Math.round((Date.now() - t0) / 1000)}s`)
  return { ok: true, ms: Date.now() - t0 }
}
