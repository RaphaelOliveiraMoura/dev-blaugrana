// Provider de imagem via Grok Build CLI (assinatura SuperGrok, sem API key).
// Análogo do codex-image.mjs, mas o Grok tem DUAS ferramentas de imagem:
//   - image_gen:  texto -> imagem (prompt + aspect_ratio). NÃO aceita referência.
//   - image_edit: image-to-image (prompt + image[] + aspect_ratio). É o equivalente
//                 do -i do gpt-image: as fichas entram por aqui e seguram a identidade.
// Então: com referências, usa image_edit; sem, image_gen. Mesma tática de polling do
// codex-image (retorna quando o PNG fica estável e mata a árvore do processo).
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import { existsSync } from 'node:fs'
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
  estilo: 'copie APENAS o traço/estilo desta imagem (medium, linha, paleta, sombreado, textura); a figura desenhada nela é o MODELO DA CASA de como se constrói gente: todo mundo no painel, elenco e figurante, sai com a mesma forma de cabeça, o mesmo tamanho relativo de cabeça, os mesmos olhos e boca, os mesmos membros simplificados e o mesmo contorno; não copie o personagem, a composição, o FUNDO nem o formato de retrato dela — o papel creme atrás da figura é fundo de ficha, não é layout do painel',
  // A FOLHA DE ACABAMENTO. Mesma lição da folha de figurantes: proporção não se descreve, se
  // MOSTRA — e acabamento também não. A ficha de estilo é UM personagem sobre papel creme, então
  // ela ensina como se constrói gente e não ensina textura, luz nem profundidade de um painel
  // inteiro; o grok, que lê referência ao pé da letra, devolvia cena chapada e sem grão. A folha
  // não tem cena nem personagem de propósito: sem encenação, não há o que contaminar (medido em
  // 19/08/2026, quando anexar um PAINEL pronto como referência levou a rua de 1910 junto e o
  // painel do apito final virou uma rua com lampião).
  acabamento: 'esta é a FOLHA DE ACABAMENTO da casa: amostras de material sobre papel, sem cena e sem personagem nenhum. Copie dela SÓ o acabamento: o grão de papel impresso cobrindo a imagem inteira, a paleta de tintas lavadas, o jeito de sombrear (bloco chapado de tom mais escuro do lado oposto à luz, mais a sombra no chão) e a perda de contraste de quem está longe. NÃO desenhe esta folha dentro do painel: nenhuma amostra, quadrado de cor, esfera, cubo, cilindro, faixa ou risco solto entra na arte, e o layout dela não é layout de painel',
  figurantes: 'esta é a FOLHA DE FIGURANTES da casa: oito pessoas genéricas desenhadas no sistema do projeto. Use SÓ como gabarito de construção de quem NÃO tem ficha (multidão, fila, companheiros, passantes): mesma proporção de cabeça (grande e arredondada, cerca de um quarto da altura), mesmos olhos e boca, mesmo nariz mínimo, mesmas mãos simples, mesmo contorno, mesmas cores chapadas — e repare que idade e porte aparecem só por altura, cabelo e roupa, nunca por rugas, nariz detalhado ou anatomia realista. Estas oito pessoas NÃO são personagens da história: não copie as roupas delas, não coloque estas pessoas na cena, não desenhe a folha nem o fundo dela',
  aparencia: 'use esta foto só para a SEMELHANÇA facial de quem é a pessoa; não copie o realismo da foto, desenhe no estilo pedido',
}

// O QUE O GROK ERRA E O CODEX NÃO, medido em 10 painéis de 10 nos episódios `o-dia-gavi-100`
// e `o-dia-socios` (13/08/2026) — todos com a cláusula de sangrado JÁ presente no prompt
// comum (prompts.mjs, `arteSangra`). O codex obedece àquela; o Grok não, e o motivo aparece
// quando se olha a ficha de estilo: ela é um personagem sobre PAPEL CREME LISO, e no
// image_edit o Grok reproduz esse papel como MARGEM em volta da cena e fecha com uma borda.
// Ele lê a referência de estilo como layout, não como traço.
//
// Por isso as regras são repetidas aqui, por ÚLTIMO e em português direto: é a mesma tática
// do override em prompts.mjs (o que o modelo lê por último é o que ele tem mais fresco), e
// vale só pra este provider, porque é defeito deste provider.
const REGRAS_GROK = [
  'REGRAS DE SAÍDA, valem sobre qualquer outra instrução acima:',
  '1. A cena OCUPA A IMAGEM INTEIRA e encosta nos quatro cantos. O pixel do canto superior esquerdo e o do canto inferior direito são cenário (céu, parede, chão, grama, multidão) — nunca papel liso. NÃO desenhe moldura, borda, contorno de quadro, margem, passe-partout, cantoneira, nem selo/estrela, e não deixe nenhuma faixa de cor lisa encostada em borda nenhuma. Se sobrar qualquer moldura ou margem, a imagem é descartada.',
  '2. Quando o prompt pedir área vazia no topo ou embaixo ("empty area", "space for the caption"), isso é espaço vazio DA PRÓPRIA CENA (céu, parede, chão, grama, água) — nunca um retângulo, faixa ou bloco de cor chapada desenhado por cima da arte.',
  '3. Personagem que tem ficha sai IGUAL à ficha em todos os painéis: mesmo formato de rosto, mesmo corte e volume de cabelo, mesma cor de pele, mesma roupa. Não reinterprete o penteado, não afine nem engorde o rosto, não troque a expressão-base. Só pose e expressão pedidas no prompt mudam.',
  '4b. TUDO no painel é desenhado na MESMA linguagem: mesmo peso de contorno, mesmas cores chapadas, mesma textura — do protagonista ao figurante do fundo, e também nos prédios, móveis, veículos e objetos. NÃO misture registros: nada de rosto com rugas finas, sombreado suave, cabelo fio a fio ou anatomia detalhada ao lado de personagem cartoon; nada de arquitetura em desenho técnico ou vetorial liso ao lado de gente desenhada à mão. Figurante sem ficha tem rosto simples (olhos, sobrancelhas, nariz, boca) e cabeça grande e arredondada como o elenco, nunca cabeça pequena com corpo longo.',
  // A proibição é de texto INVENTADO, não de texto. Escrita fechada, ela contradizia o
  // quadrinhoRules da casa ("lettering ARE allowed whenever the image prompt explicitly asks
  // for them") e, por vir depois, ganhava: o painel 3 do `o-dia-tres-amarelos` pede o mesmo
  // número 3 nas costas dos dois jogadores, que é a história inteira (o croata nascido na
  // Austrália e a ficha errada), e voltou com as camisas limpas. Mesma forma do `oval rugby
  // ball` na troca da bola: quem quer o caso raro precisa de uma porta declarada.
  '4. ZERO texto INVENTADO na arte: nenhuma letra, número, palavra, placar ou logotipo que o prompt não tenha pedido, inclusive em papéis, cadernetas, placas, cartazes, telas e camisas dentro da cena. Papel na mão de alguém sai com linhas rabiscadas ilegíveis, nunca com palavras. EXCEÇÃO, e só ela: quando o prompt DESTE painel pede explicitamente um número ou uma palavra em algum lugar (o número nas costas da camisa, por exemplo), desenhe exatamente aquilo, com aquela grafia, e nada além disso. As palavras deste prompt (EXACTLY, IDÊNTICO, empty area, e qualquer outra) são instruções pra você, jamais conteúdo pra desenhar.',
].join('\n')

// ---------------------------------------------------------------------------------------
// O SANEAMENTO QUE SÓ O GROK PRECISA. Tudo daqui pra baixo mora NESTE arquivo de propósito:
// o codex acerta os mesmos casos com o prompt comum, e mexer nele para consertar o grok
// mudaria o modelo que já funciona (inclusive somando referências, que é o que degrada o
// codex acima de ~3). Defeito de um provider se conserta no provider.
// ---------------------------------------------------------------------------------------

// 1. AS SEÇÕES DE MOLDURA. Quando a arte sangra, o prompt comum manda desenhar a moldura
// (BRAND FRAMING / FRAME PROPORTIONS, do quadrinhoRules) e DEPOIS manda ignorá-la. O codex
// aplica o override; o grok fica com a regra original e devolveu margem uniforme de 4,4% a
// 4,8% nos quatro lados em 5 painéis de 5 (13/08/2026) — exatamente os "about 5% of the
// image width on ALL FOUR sides" que a regra pede. Aqui elas são cortadas do texto: o que
// não chega não é obedecido. O corte é por RÓTULO, então renomear a seção no projeto o
// deixa cego — é o que o vigia cobre.
const SECOES_DE_MOLDURA = ['BRAND FRAMING', 'FRAME PROPORTIONS']
const SANGRA = /Draw NO panel frame/i // marca que o prompt comum põe quando a arte sangra

export function semRegrasDeMoldura(texto) {
  if (!texto || !SANGRA.test(texto)) return texto
  return SECOES_DE_MOLDURA.reduce((s, rotulo) => {
    const re = new RegExp(`${rotulo}\\s*\\([^)]*\\):.*?(?=[A-Z][A-Z ]{3,}\\s*\\([^)]*follow it exactly|[A-Z][A-Z ]{3,}\\s*\\(every panel|OVERRIDE, this panel only|$)`, 's')
    return s.replace(re, '')
  }, texto).replace(/[ \t]{2,}/g, ' ')
}

// 2. A FOLHA DE FIGURANTES: oito genéricos (adulto, idoso, adolescente, criança, corpulento,
// magro) desenhados no sistema do personagem-padrão da casa.
//
// O `quadrinhoRules` já manda que figurante e multidão sejam desenhados na mesma construção
// do elenco ("a large rounded head roughly one quarter of the body height... applies to
// background people and extras EXACTLY as much"). O codex executa; o grok não: o painel 2 do
// `o-dia-socios` saiu com o protagonista cabeçudo ao lado de figurantes de proporção
// realista, com nariz desenhado e rugas — dois sistemas de desenho no mesmo quadro.
// Proporção não se descreve, se MOSTRA, e é a mesma lição que a animação já pagou (descrever
// o ciclo de passada em inglês não funcionou; mostrar uma folha que presta funcionou).
//
// A ficha de estilo não substitui: ela tem UMA figura, um homem adulto baixinho, e o modelo
// não tem de onde tirar como é uma senhora ou uma criança nesse sistema.
const FIGURANTES_REL = 'estilos/figurantes.png'

// Termos que denunciam gente SEM FICHA na cena. Lidos no ROTEIRO do painel, nunca no prompt
// montado: o `quadrinhoRules` da casa fala de "crowd", "extras" e "background people" nas
// próprias regras, então medir o texto inteiro dá positivo em TODO painel — foi o que
// aconteceu na primeira versão disto, que anexou a folha até num close de caderneta.
const TERMOS_FIGURANTE = /\b(crowd|extras?|background people|ordinary people|spectators?|supporters?|fans?|audience|onlookers?|bystanders?|passers-?by|queue|line of people|workers?|officials?|stewards?|police(?:men)?|photographers?|journalists?|team-?mates?|defenders?|goalkeepers?|opponents?|players?|referees?|elderly (?:man|woman)|teenagers?|child|children)\b/i

export function comFigurantes(refs, roteiro, contentDir = '') {
  if (!TERMOS_FIGURANTE.test(roteiro || '')) return refs
  if (refs.some((r) => r.papel === 'figurantes')) return refs
  // sem o arquivo em disco não há folha: anexar um caminho que não existe faz o grok
  // reclamar e perder a geração inteira, então a ausência degrada pro comportamento antigo
  if (!existsSync(path.join(contentDir, FIGURANTES_REL))) return refs
  // depois do estilo (que dá o traço) e antes do cenário (que fica por último, mais fresco)
  const i = refs.findIndex((r) => r.papel === 'cenario')
  const nova = { rel: FIGURANTES_REL, papel: 'figurantes' }
  return i < 0 ? [...refs, nova] : [...refs.slice(0, i), nova, ...refs.slice(i)]
}

// Monta a instrução do Grok a partir do pedido (o mesmo que o codex recebe) e do caminho
// ABSOLUTO de saída. Referências e saída vão como caminhos absolutos, então independe do cwd.
export function instrucaoGrokImagem(pedido, outAbs, contentDir, { temFigurantes = true } = {}) {
  const { orient, dim } = pedido
  const composed = semRegrasDeMoldura(pedido.composed)
  // `roteiro` é o texto do painel sozinho; sem ele (pedidos que não são de painel) ninguém
  // recebe a folha, que é o lado seguro de errar.
  const refs = temFigurantes ? comFigurantes(pedido.refs || [], pedido.roteiro, contentDir) : (pedido.refs || [])
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
    REGRAS_GROK,
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
