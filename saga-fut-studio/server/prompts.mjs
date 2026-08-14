import path from 'node:path'
import { CONTEUDO_DIR, QUAD_RULES_PADRAO } from './config.mjs'
import { exists } from './lib/arquivos.mjs'
import { montarCastSheet } from './lib/cast-sheet.mjs'
import { estiloImagem, refPersonagem, castSheetImagem } from '../shared/caminhos.mjs'
import { numeroAncoraCenario } from '../shared/cenario.mjs'
import { LIMITE_FICHAS_SOLTAS } from '../shared/constantes.mjs'
import { arteSangra, molduraDe, legendaPorCodigo, balaoPorCodigo } from '../shared/quadrinho-config.mjs'
import { dimArteSangrada } from './lib/moldura.mjs'
import { DIM_POST } from './lib/imagem.mjs'

// Monta o prompt final de cada tipo de imagem, do mesmo jeito que o front mostra
// no botão "copiar": estilo + corpo + regras da casa. As fichas dos personagens
// vão junto como referência, que é a âncora de consistência entre as cenas.
//
// Toda imagem anexada carrega o PAPEL dela. O mesmo anexo serve para duas ordens
// opostas — "copie este traço" e "copie este rosto" — e o modelo não adivinha qual
// é qual: sem o papel explícito, uma referência de estilo vira ordem de copiar o
// personagem que aparece nela.

// pedido malformado é culpa de quem chamou (400), não falha do servidor (500)
class ErroDePedido extends Error {
  constructor(msg) { super(msg); this.status = 400 }
}

// Dimensão de cada formato de QUADRINHO, em PIXELS, fonte única. Daqui saem as DUAS metades
// da garantia de tamanho, que por isso nunca divergem: o texto que PEDE o tamanho no prompt
// (orientText) e a trava que GARANTE o tamanho depois de gerar (normalizarImagem, no
// generate, via ffmpeg). O tamanho é dito em pixels e não só em proporção porque proporção
// o modelo interpreta e cada painel saía num tamanho diferente (medido no lote: de 971x1619
// a 1254x1254, todos pedindo o mesmo formato); mas mesmo pedindo pixel, formatos que o
// gpt-image não gera de fábrica (3:4, 4:5) podiam derivar, então a normalização é a rede que
// fecha isso de vez, seja o formato nativo ou não.
//
// ISTO VALE SÓ PARA QUADRINHOS. Ficha e cena de saga seguem no ORIENTACAO_PADRAO de sempre
// (1024x1536, 2:3) e NÃO passam pela trava: a cena vira vídeo 9:16 e sai de propósito ora em
// 2:3 ora mais alta, e forçá-la a um tamanho cortaria a altura que preenche a tela do vídeo.
// A padronização de tamanho é um problema de quadrinho (post de imagem estática), não de saga.
//
// O PADRÃO DO QUADRINHO É 3:4 (16/07/2026): retrato. A charge é imagem estática de painel
// único com personagem em pé e cenário, e nesse enquadramento o retrato respira; o quadrado
// (1:1) espremia a cena e ficou ruim no feed. 3:4 é o mesmo do final-manopla, que ficou bom.
const DIM = {
  '3:4':  { w: 1152, h: 1536, texto: 'Portrait vertical orientation (3:4)' },
  '4:5':  { w: 1024, h: 1280, texto: 'Portrait vertical orientation (4:5)' },
  '1:1':  { w: 1024, h: 1024, texto: 'Square orientation (1:1)' },
  '9:16': { w: 1024, h: 1820, texto: 'Tall vertical orientation (9:16)' },
}
const FORMATO_QUADRINHO_PADRAO = '3:4'

// A dimensão-alvo de um formato de quadrinho (com fallback), e o texto de orientação dela.
export const dimDoFormato = (fmt, padrao = FORMATO_QUADRINHO_PADRAO) => DIM[fmt] || DIM[padrao]
const orientText = (fmt, padrao) => {
  const d = dimDoFormato(fmt, padrao)
  return `${d.texto}: the PNG must be exactly ${d.w} x ${d.h} pixels. Never any other size.`
}

// O tamanho é dito em pixels, e não só como proporção, porque proporção o modelo
// interpreta: pedir enquadramento ("85% da altura") junto de "tall 2:3" fez ele
// devolver um 862x1824, quebrando justamente o que a ficha precisa ter em comum.
const ORIENTACAO_PADRAO = 'Portrait vertical orientation: the PNG must be exactly 1024 x 1536 pixels (tall 2:3). Never any other size.'

// Enquadramento da ficha, igual para todo mundo.
//
// Sem isto cada geração escolhia o seu, e o pool acabou com personagem ocupando de
// 74% a 99% da altura: lado a lado, um parece de perto e o outro de longe, ainda que
// o arquivo tenha sempre o mesmo tamanho. Enquadramento é do formato, não do
// personagem, então mora aqui e não no promptFicha de cada um.
//
// Só na ficha: cena e painel são enquadramento de cena (close, plano aberto), e é o
// roteiro que manda neles.
const ENQUADRAMENTO_FICHA = 'Frame every character sheet the same way: the character standing, full body from the top of the head to the feet, centred in the frame, filling about 85% of the image height, with a small even margin above the head and below the feet. Never crop any part of the character.'

const noConteudo = (rel) => exists(path.join(CONTEUDO_DIR, rel))

// só anexa fichas que JÁ existem em disco (referência que não existe não ajuda)
async function fichasExistentes(ids, byId) {
  const refs = []
  for (const pid of ids || []) {
    const p = byId[pid]
    if (p?.imagem && await noConteudo(p.imagem)) refs.push({ rel: p.imagem, papel: 'personagem' })
  }
  return refs
}

// A referência de CENÁRIO de um painel: o painel-âncora de onde ele herda o fundo, o
// enquadramento, o layout e as POSIÇÕES dos personagens. Fixa o set entre os painéis de
// uma tirinha do mesmo jeito que a ficha fixa a identidade do personagem.
//
// De propósito NÃO é o painel vizinho anterior (cadeia): cada geração introduz uma
// variaçãozinha, e herdar do vizinho acumula drift painel a painel (o mesmo motivo pelo
// qual não se "estende" vídeo). Todos herdam de UM painel-âncora, então não há acúmulo, e
// depois dele pronto os outros painéis rodam em paralelo.
//
// A resolução de QUAL painel é o âncora vive em shared/cenario.mjs (o front usa a mesma
// pra mostrar de onde herda). Aqui só resta o check de disco: anexa o âncora apenas se ele
// JÁ foi gerado (igual às fichas); sem isso, cai no comportamento antigo em vez de anexar
// uma referência que não existe.
async function refDeCenario(q, painel) {
  const ancoraNum = numeroAncoraCenario(q, painel)
  if (ancoraNum == null) return []
  const ancora = (q.paineis || []).find((p) => p.numero === ancoraNum)
  return ancora?.imagem && await noConteudo(ancora.imagem)
    ? [{ rel: ancora.imagem, papel: 'cenario' }]
    : []
}

// A referência de traço do estilo, quando o catálogo tem uma em disco. O arquivo é a
// fonte honesta: existe → o estilo tem imagem; não existe → segue só no prefixo.
async function refDoEstilo(est) {
  if (!est) return []
  const rel = estiloImagem(est.id)
  return (await noConteudo(rel)) ? [{ rel, papel: 'estilo' }] : []
}

// A referência de aparência do personagem (a foto de quem ele é), quando você largou
// uma em disco. Mesma regra do estilo: o arquivo é a fonte, e sem ele a ficha segue
// só pelo que o prompt descreve.
async function refDeAparencia(p) {
  const rel = refPersonagem(p.id)
  return (await noConteudo(rel)) ? [{ rel, papel: 'aparencia' }] : []
}

// O nome do personagem entra aqui só pra dizer QUEM fala, e o modelo insiste em DESENHÁ-LO:
// no o-dia-pedri saiu "Pedrin, o Maestro (rabisco riso)" como rótulo dentro do painel, duas
// vezes, mesmo com o prompt do painel pedindo nenhum texto na arte. Por isso duas defesas
// aqui, onde vale pra TODO painel de TODO quadrinho: o sufixo de estilo entre parênteses é
// cortado (é vocabulário interno, não tem por que viajar), e a instrução diz explicitamente
// que o nome não vai pro desenho.
const nomeDeFala = (nome) => String(nome || '').replace(/\s*\([^)]*\)\s*$/, '').trim()

// SLUG DO ACERVO NUNCA VAI PRO MODELO. O `promptImagem` é escrito à mão e viaja INTEIRO pro
// gerador, sem passar por defesa nenhuma. Quando ele cita o personagem pelo id ("the number 10
// MESSI character from the cast sheet named rei-riso", painel 8 do o-dia-remontada), o modelo
// recebe uma palavra que não quer dizer nada pra ele e tem chance de DESENHAR — é a mesma família
// do "Pedrin, o Maestro (rabisco riso)" que saiu como rótulo dentro do painel.
//
// Aqui a regra é CUMPRIDA, não avisada: a tradução id -> nome de exibição é determinística, então
// não há decisão pra devolver pro humano. Dois detalhes que fazem a diferença:
//   · do maior pro menor, porque `yamal` é prefixo de `yamal-riso` e trocaria dentro dele;
//   · case-SENSITIVE, porque slug se escreve minúsculo: `alvarez` é o id e vira "Julián Álvarez",
//     enquanto "Alvarez" no meio de uma frase em inglês é o sobrenome e fica como está.
function semSlugsInternos(texto, byId) {
  if (!texto) return texto
  return Object.keys(byId)
    .sort((a, b) => b.length - a.length)
    .reduce((s, id) => {
      const nome = nomeDeFala(byId[id]?.nome)
      if (!nome) return s
      return s.replace(new RegExp(`(?<![A-Za-z0-9-])${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![A-Za-z0-9-])`, 'g'), nome)
    }, texto)
}

// Com legenda por código as captions NÃO entram no prompt: o export desenha a caixa
// depois. Mandar caption pra IA + desenhar no export = legenda em cima de legenda.
// `semBalao` faz o mesmo com a FALA, quando o balão também é por código.
function falasComoBaloes(painel, byId, { semCaption = false, semBalao = false } = {}) {
  return (painel.falas || [])
    .filter((f) => (f.texto || '').trim())
    .filter((f) => {
      const eCaption = f.tipo === 'caption' || !f.personagem
      if (eCaption) return !semCaption
      return !semBalao
    })
    .map((f) => {
      const nome = nomeDeFala(byId[f.personagem]?.nome)
      return nome
        ? `${nome} says in a comic speech balloon: "${f.texto.trim()}"`
          + ' (this name is ONLY to tell you who is speaking: never draw the name itself,'
          + ' and never add a label, tag or caption box containing it anywhere in the image)'
        : `a caption box reads: "${f.texto.trim()}"`
    })
}

// O prompt de um REFINO pontual: a arte atual é a base (o canvas), e o texto diz só o que
// muda. A cláusula de preservar é o que segura o resto: sem ela o gpt-image-2 re-renderiza
// a imagem inteira e deriva em texto e rosto. De propósito NÃO reenvia o roteiro do painel,
// que convidaria o modelo a redesenhar tudo; a imagem anexada É o contexto.
function instrucaoRefino(texto) {
  return `You are EDITING the existing comic panel given as the input image. Apply ONLY this change, described in Portuguese: "${texto}". Keep absolutely everything else PIXEL-IDENTICAL to the input image: the same composition and framing, every character's face, hair, expression and pose, every color, ALL text and lettering exactly as written, the panel border and star seal, and the exact same drawing style. Do not redraw from scratch, restyle, re-compose, add or remove anything the change does not explicitly require.`
}

// Retorna { composed, outRel, orient, refs: [{ rel, papel }] } ou lança com o motivo.
export async function comporPrompt(d, body) {
  const { tipo, sagaId, epId, cenaNumero, personagemId, estiloId, quadrinhoId, painelNumero } = body || {}
  const promptRules = d.projeto?.promptRules || ''
  const byId = Object.fromEntries((d.personagens || []).map((p) => [p.id, p]))
  const estilosById = Object.fromEntries((d.estilos || []).map((e) => [e.id, e]))

  if (tipo === 'ficha') {
    const p = byId[personagemId]
    if (!p) throw new ErroDePedido('Personagem não encontrado.')
    // estilo, em ordem de precedência:
    //   1. override explícito na request (o detalhe de arte do personagem continua valendo)
    //   2. o estilo DO PRÓPRIO personagem (já resolvido no readDados)
    //   3. herdado da saga (legado, para fichas antigas sem estiloId)
    let stylePrefix = ''
    if (estiloId && estilosById[estiloId]) stylePrefix = [estilosById[estiloId].stylePrefix, p.estiloExtra].filter(Boolean).join(', ')
    else if (p.stylePrefix) stylePrefix = p.stylePrefix
    else stylePrefix = (d.sagas || []).find((s) => s.id === sagaId)?.stylePrefix || ''
    // A ficha é a geração que ESTABELECE o personagem, então é aqui, e só aqui, que
    // entram as duas referências cruas: o estilo diz COMO desenhar, a aparência diz QUEM
    // é. São perguntas diferentes, então não brigam, e é por isso que cada anexo declara
    // seu papel lá embaixo. Na cena e no painel quem responde pelas duas é a ficha
    // pronta; anexar as cruas de novo poria as referências para brigar com ela, e prompt
    // contraditório entrega o pior dos dois.
    return {
      composed: `${stylePrefix}, ${p.promptFicha}\n\n${promptRules}`,
      outRel: p.imagem,
      orient: `${ORIENTACAO_PADRAO} ${ENQUADRAMENTO_FICHA}`,
      // sem `dim`: ficha/cena não passam pela trava de normalização (ver DIM lá em cima)
      // Aparência primeiro, estilo POR ÚLTIMO: com a foto na última posição ela
      // dominava o traço e a ficha saía uma ilustração realista. O anexo final é o
      // que o modelo tem mais fresco, e aqui o que precisa ficar fresco é o traço.
      refs: [
        ...await refDeAparencia(p),
        ...await refDoEstilo(estilosById[estiloId] || estilosById[p.estiloId]),
      ],
    }
  }

  if (tipo === 'cena') {
    const saga = (d.sagas || []).find((s) => s.id === sagaId)
    const ep = saga?.episodios.find((e) => e.id === epId)
    const cena = ep?.cenas.find((c) => c.numero === Number(cenaNumero))
    if (!cena) throw new ErroDePedido('Cena não encontrada.')
    return {
      composed: `${saga.stylePrefix}, ${semSlugsInternos(cena.promptImagem, byId)}\n\n${promptRules}`,
      outRel: cena.imagem,
      orient: ORIENTACAO_PADRAO,
      // sem `dim`: a cena vira vídeo 9:16 e não deve ser forçada a um tamanho fixo
      refs: await fichasExistentes(cena.personagens, byId),
    }
  }

  if (tipo === 'painel') {
    const q = (d.quadrinhos || []).find((x) => x.id === quadrinhoId)
    const painel = q?.paineis.find((p) => p.numero === Number(painelNumero))
    if (!painel) throw new ErroDePedido('Painel não encontrado.')

    // REFINO PONTUAL (fluxo à parte): edita a arte que JÁ existe em vez de regerar do
    // roteiro. A própria arte do painel entra como base (o canvas) e o texto do usuário
    // diz só o delta. Refs mínimas (só a base) pra não tentar o modelo a redesenhar rosto
    // ou re-estilizar. Sem `refino`, o painel segue exatamente o fluxo de sempre abaixo.
    const refino = (body?.refino || '').trim()
    if (refino) {
      if (!painel.imagem || !(await noConteudo(painel.imagem))) {
        throw new ErroDePedido('Gere a arte do painel antes de refinar.')
      }
      return {
        composed: instrucaoRefino(refino),
        outRel: painel.imagem,
        orient: orientText(q.formato),
        dim: dimDoFormato(q.formato),
        refs: [{ rel: painel.imagem, papel: 'base' }],
      }
    }

    // a IA desenha os balões: as falas viram instruções de speech balloon no prompt.
    // Captions com legendaPorCodigo ficam de fora (o export desenha a caixa).
    const corpo = [semSlugsInternos(painel.promptImagem, byId), falasComoBaloes(painel, byId, {
      semCaption: legendaPorCodigo(q),
      semBalao: balaoPorCodigo(q),
    }).join('. ')].filter(Boolean).join('. ')
    let quadRules = d.projeto?.quadrinhoRules || QUAD_RULES_PADRAO
    // MOLDURA POR CÓDIGO: a borda, a margem creme e o selo da estrela deixam de ser arte e
    // passam a ser mobília desenhada no export (lib/moldura.mjs). O override vem DEPOIS das
    // regras porque é o que o modelo tem mais fresco; sem ele o painel sai com duas molduras
    // e dois selos, um por cima do outro.
    if (arteSangra(q)) {
      quadRules += ' OVERRIDE, this panel only: ignore the BRAND FRAMING and FRAME PROPORTIONS instructions'
        + ' above. Draw NO panel frame, NO black border, NO cream paper margin and NO circular star badge.'
        + ' The artwork BLEEDS to all four edges and fills the entire image.'
        + (molduraDe(q) === 'codigo'
          // ÁREA DE SEGURANÇA: com arte sangrada não há margem sobrando, então o que o modelo
          // põe encostado na borda vai pra debaixo da moldura. Aconteceu na capa do o-dia-pedri:
          // o carimbo "NÃO TEM NÍVEL" nasceu colado no topo e saiu cortado ao meio.
          ? ' The frame and the badge are added afterwards by the studio, drawn OVER the outer 7% of the'
            + ' image: keep every important element (faces, the ball, any stamp or lettering, the main'
            + ' action) INSIDE the central 86% of the picture. Only background — sky, grass, crowd,'
            + ' walls, floor — may reach the edges.'
          : ' This piece is published with no frame at all.')
    }
    // TEXTO POR CÓDIGO: a arte nasce MUDA daquilo que o studio vai desenhar depois. Sem isto o
    // modelo inventa a caixa (e a ortografia) e o export desenha outra por cima.
    //
    // Os dois eixos são independentes de propósito: dá pra ter caption por código e fala pela
    // IA (o carrossel narrativo da série O Dia Em Que) ou o contrário (o deck de coringas, em
    // que a arte é a mesma e só o balão muda). Por isso a cláusula é montada, e não escrita em
    // quatro versões: quatro versões divergem na primeira edição.
    const semCaption = legendaPorCodigo(q)
    const semBalao = balaoPorCodigo(q)
    if (semCaption || semBalao) {
      const proibido = [
        semCaption && 'NO caption boxes and NO narrative text boxes',
        semBalao && 'NO speech balloons and NO thought bubbles',
      ].filter(Boolean).join(', ')
      const permitido = semCaption && semBalao
        ? ' Draw NO lettering of any kind: the panel is completely SILENT.'
        : semCaption
          ? ' The only lettering allowed is the speech balloons for the spoken lines given below.'
          : ' The only lettering allowed is the caption boxes given below.'
      quadRules += ` OVERRIDE, this panel only: ${proibido}.${permitido}`
        + ' Whatever is omitted here is added afterwards by the studio as vector text.'
    }
    // ONDE O TEXTO VAI POUSAR: proibir a caixa não basta, porque o studio ainda vai desenhar
    // uma por cima da arte. As legendas empilham na BASE (margemBaixo 8,5% + as caixas, o que
    // passa de 25% da altura com duas legendas) e o carimbo de progresso pousa no canto
    // superior esquerdo. Sem esta cláusula o modelo compõe o rosto ou a ação principal
    // exatamente ali, e a legenda cobre o assunto do painel.
    //
    // É diferente da área de segurança dos 86%: aquela diz o que NÃO pode encostar na borda,
    // esta diz onde a composição precisa ficar CALMA porque vai receber mobília por cima. Era
    // uma frase que eu colava à mão em todo prompt da série O Dia Em Que (10/08/2026); colada
    // à mão, ela some no primeiro painel em que alguém esquecer.
    const nLegendas = semCaption ? (painel.legendas || []).filter((t) => String(t || '').trim()).length : 0
    if (nLegendas > 0) {
      const faixa = nLegendas >= 2 ? 32 : 22
      quadRules += ` LAYOUT RESERVATION, this panel only: the studio will later draw ${nLegendas}`
        + ` cream caption box${nLegendas > 1 ? 'es' : ''} over the BOTTOM ${faixa}% of the picture, and a small`
        + ' progress stamp over the TOP LEFT corner. Compose so those two regions are calm background'
        + ' (sky, grass, floor, wall, out-of-focus crowd): keep faces, hands, the ball and the main action'
        + ' OUT of them. Do not centre the subject so low that a caption box would cover it.'
    }
    // Com moldura POR CÓDIGO a arte é gerada na razão da ÁREA INTERNA, não na do post: o
    // enquadrar preenche essa área, e arte na razão do post seria cortada em 3,1% da largura.
    const dimPost = DIM_POST[q.formato]
    const dimPainel = molduraDe(q) === 'codigo' && dimPost
      ? dimArteSangrada(dimDoFormato(q.formato), dimPost)
      : dimDoFormato(q.formato)
    const base = {
      composed: `${q.stylePrefix || ''}, comic panel. ${corpo}\n\n${quadRules}`,
      // O ROTEIRO sozinho, sem o cânone de estilo e sem as regras da casa. Não muda prompt
      // nenhum: existe porque quem precisa saber O QUE ESTA CENA TEM não pode perguntar ao
      // `composed`, que carrega o quadrinhoRules e portanto as palavras "crowd", "extras" e
      // "background people" em TODO painel — inclusive num close de objeto.
      roteiro: corpo,
      outRel: painel.imagem,
      orient: `Portrait vertical orientation: the PNG must be exactly ${dimPainel.w} x ${dimPainel.h} pixels. Never any other size.`,
      dim: dimPainel,
    }
    const fichas = await fichasExistentes(q.elenco, byId)
    const cenario = await refDeCenario(q, painel)

    // ELENCO GRANDE: anexar uma ficha por personagem estoura o Codex (fidelidade despenca,
    // timeout) acima de ~3 refs. Acima do limite, funde as fichas numa CAST SHEET (1 ref) +
    // a imagem do estilo, e o modelo casa cada um pelo número. É o que a CLI
    // gerar-painel-elenco.mjs fazia à mão; agora vale também pelo botão da interface.
    if (fichas.length > LIMITE_FICHAS_SOLTAS) {
      const castRel = castSheetImagem(q.id)
      await montarCastSheet({ ids: q.elenco, byId, outAbs: path.join(CONTEUDO_DIR, castRel) })
      return {
        ...base,
        refs: [
          { rel: castRel, papel: 'elenco' },
          ...await refDoEstilo(estilosById[q.estiloId]),
          ...cenario,
        ],
      }
    }

    // ELENCO PEQUENO (padrão): fichas (QUEM) + estilo (COMO) + cenário-âncora (ONDE).
    // O estilo entra também no painel (não só na ficha): medido no Cursor/Nano Banana em
    // 05/08/2026, sem a ref de traço o painel herda o default limpo do modelo e sai fora
    // do Rabisco Riso; com estilo por cima da ficha (variante B) o traço voltou. Ordem
    // igual ao elenco grande: cenário por ÚLTIMO, mais fresco no set.
    return {
      ...base,
      refs: [
        ...fichas,
        ...await refDoEstilo(estilosById[q.estiloId]),
        ...cenario,
      ],
    }
  }

  throw new ErroDePedido('tipo inválido (use ficha|cena|painel).')
}

// Monta o pedido de VÍDEO de uma cena: a arte parada (cena.imagem) é a fonte, o
// cena.promptVideo é o movimento (ACTION/CAMERA/CONSTRAINTS já escritos no studio) e
// cena.video é a saída. Mesma lógica do comporPrompt de imagem, mas para o Grok
// (image_to_video). A imagem-fonte precisa já existir em disco: sem ela não há o que
// animar. Retorna { imagemRel, outRel, movimento } ou lança com o motivo.
export async function comporPedidoVideo(d, body) {
  const { tipo, sagaId, epId, cenaNumero } = body || {}
  if (tipo && tipo !== 'cena') throw new ErroDePedido('Vídeo por enquanto só de cena.')

  const saga = (d.sagas || []).find((s) => s.id === sagaId)
  const ep = saga?.episodios.find((e) => e.id === epId)
  const cena = ep?.cenas.find((c) => c.numero === Number(cenaNumero))
  if (!cena) throw new ErroDePedido('Cena não encontrada.')
  if (!cena.imagem || !(await noConteudo(cena.imagem))) {
    throw new ErroDePedido('A arte da cena ainda não foi gerada: gere a imagem antes de animar.')
  }
  const movimento = (cena.promptVideo || '').trim()
  if (!movimento) throw new ErroDePedido('A cena não tem promptVideo: escreva o movimento antes de animar.')

  return { imagemRel: cena.imagem, outRel: cena.video, movimento }
}

// A instrução que o Codex recebe: onde gravar, com que orientação e com que referências.
// Cada anexo é apresentado pelo número e pelo papel, na ordem em que vai no `-i`: é isso
// que impede o modelo de copiar o personagem de uma referência de traço.
export const PAPEL_DO_ANEXO = {
  estilo: (n) => `- Image ${n} is a STYLE reference: it is the TARGET LOOK of the image you must produce. Copy its medium, linework, line weight, palette, shading, level of detail and character construction. Do NOT copy the character, the subject, the pose, the framing or the panel layout shown in it. Take ONLY the drawing style.`,
  // O oposto exato da referência de estilo, e por isso ela precisa ser dita com a
  // mesma força: daqui vem QUEM é a pessoa, não como desenhar. Sem proibir o resto,
  // o modelo devolve a própria foto (fotorrealista, de uniforme real, com marcas).
  aparencia: (n) => `- Image ${n} is a LIKENESS reference: a photo of the real person this character is based on. Use it ONLY to know WHO this is: face shape, hair, skin tone, build, so the drawing stays RECOGNIZABLE as them. Do NOT copy the photo itself. Ignore its realism, lighting, framing, background, pose and clothing; dress the character as the prompt describes.`,
  // A ficha é a IDENTIDADE do personagem, não uma pose. Ela foi desenhada de propósito
  // em estado neutro (boca fechada, braços baixos, encarando a câmera), então dizer
  // "IDENTICAL / same face" arrastava essa NEUTRALIDADE pra dentro de toda cena: onde o
  // roteiro não pedia emoção, o modelo copiava a cara séria da ficha e a charge saía morta.
  // A cura é a mesma gramática do papel de estilo: copie a identidade, NÃO copie a
  // expressão nem a pose. Emoção e enquadramento são do roteiro, não da ficha.
  personagem: (n) => `- Image ${n} is a CHARACTER identity sheet: keep this character's IDENTITY identical to it (same face shape and features, same hair, same skin tone, same outfit and number) so they stay recognizable. But it is a NEUTRAL identity sheet, NOT a pose reference: the character's facial EXPRESSION, emotion, POSE and camera angle come from the scene described in the prompt. Do NOT copy the sheet's neutral closed-mouth face or its standing pose unless the prompt explicitly asks for them; give the character whatever expression the scene calls for.`,
  // O painel-âncora de uma tirinha: fixa o SET (fundo, enquadramento, onde cada um está)
  // sem arrastar a pose. Mesma gramática dos outros papéis: copie X, NÃO copie Y. Aqui o X
  // é o cenário e as posições, o Y são os gestos e expressões, que são deste painel.
  // A arte ATUAL do painel num refino pontual: o canvas a editar. Mesma gramática (copie
  // X, NÃO redesenhe Y): reproduz fiel e muda só o delta pedido; o resto fica idêntico a
  // ela. Sem isto o modelo trata a arte como mera referência e re-renderiza tudo.
  base: (n) => `- Image ${n} is the CURRENT panel: the exact artwork to EDIT, the canvas. Reproduce it faithfully and change ONLY what the edit instruction asks; everything not mentioned (composition, faces, poses, colors, ALL text and lettering, the border and star seal, the drawing style) stays identical to Image ${n}. Do NOT redraw it from scratch.`,
  // A cast sheet do elenco grande: um grid rotulado por número. Mesma gramática dos
  // outros papéis (copie X, NÃO copie Y): daqui vem QUEM é cada um, casado pela camisa,
  // nunca pose, layout ou o próprio grid. Sem o "não desenhe o grid", o modelo devolve
  // as fichas lado a lado em vez de uma cena única.
  elenco: (n) => `- Image ${n} is a CAST SHEET: a labelled grid of characters, each in its own cell with a header giving its shirt NUMBER and short name. Use it ONLY to keep every character in the scene RECOGNIZABLE (same face shape, hair, skin tone and shirt number as the matching cell). Match each character in the prompt to its cell BY SHIRT NUMBER. It is a NEUTRAL identity grid, NOT a pose or layout reference: each character's facial expression, pose and camera come from the scene described in the prompt, and they must be re-dressed as the prompt says. CRITICAL: do NOT draw the grid, the cells, the labels or separate portraits in the output; draw ONE single unified scene with all of them together.`,
  cenario: (n) => `- Image ${n} is a SCENE/SET reference: another panel from the SAME comic strip, and it is the STRONGEST constraint on the setting of this panel. The BACKGROUND, the framing and camera, the overall LAYOUT, the LEFT-RIGHT POSITIONS of the characters, and every fixed set piece (screens, tables, props, and their exact shapes, colors and contents) must MATCH Image ${n} as if this were the very same shot from a locked-off camera, only a moment later. Do NOT redesign or reinterpret the set: reuse it exactly as drawn in Image ${n}. CRITICAL: do NOT mirror, flip or swap sides. Whatever is on the VIEWER'S LEFT in Image ${n} stays on the viewer's left, and whatever is on the viewer's RIGHT stays on the viewer's right, even when a character's gesture is symmetric and gives no directional cue. The ONLY things that change from Image ${n} are the characters' gestures, body poses and facial expressions, which come from THIS panel's prompt. Everything about where things are and what the scene looks like comes from Image ${n}.`,
}

// Quem manda em quê, quando as duas referências vão juntas.
//
// A foto é a única imagem fotográfica na mesa e, sem uma regra de desempate, ela
// arrasta o resultado inteiro pro realismo: a 1ª ficha do presidente com foto saiu
// uma ilustração fina e realista, em vez do rabisco do estilo. As duas respondem a
// perguntas diferentes (COMO desenhar / QUEM é), então o desempate é por pergunta,
// e o estilo ganha tudo que é sobre desenho.
export function regraDeConflito(refs) {
  const estilo = refs.findIndex((r) => r.papel === 'estilo') + 1
  const aparencia = refs.findIndex((r) => r.papel === 'aparencia') + 1
  const elenco = refs.findIndex((r) => r.papel === 'elenco') + 1
  const personagens = refs
    .map((r, i) => (r.papel === 'personagem' ? i + 1 : null))
    .filter(Boolean)
  // Cast sheet + estilo (o caso do elenco grande): o estilo manda no COMO desenhar, a
  // cast sheet só diz QUEM é cada um (pelo número). Sem o desempate, o grid arrasta o
  // traço das fichas e briga com a referência de estilo.
  if (elenco && estilo) {
    return `
If the CAST SHEET (Image ${elenco}) and the STYLE reference (Image ${estilo}) ever disagree on HOW to draw, Image ${estilo} wins: the cast sheet only says WHO each character is (matched by shirt number), never how to draw them.
`
  }
  // Ficha(s) + estilo no painel (variante B do Cursor, 05/08/2026): sem isto a ficha
  // arrasta o traço E a pose neutra pra dentro da cena.
  if (estilo && personagens.length && !aparencia) {
    const quem = personagens.length === 1
      ? `Image ${personagens[0]}`
      : `Images ${personagens.join(', ')}`
    return `
The references answer DIFFERENT questions. Do not mix them up:
- HOW this image is drawn comes ONLY from Image ${estilo}: medium, line work, color, shading, amount of detail, character proportions and eye construction. The result must look hand-drawn in exactly that style.
- WHO each character is comes ONLY from ${quem}: face shape, hair, skin tone, outfit and shirt number, so they stay recognizable.
If they ever disagree on HOW to draw, Image ${estilo} wins. Identity sheets are NEUTRAL: never copy their standing pose, closed mouth or frontal camera unless THIS panel's prompt asks for them.
`
  }
  if (!estilo || !aparencia) return ''
  return `
The two references answer DIFFERENT questions. Do not mix them up:
- HOW this image is drawn comes ONLY from Image ${estilo}: medium, line work, color, shading, amount of detail, character proportions. The result must look hand-drawn in exactly that style, as if the same artist drew it.
- WHO this person is comes ONLY from Image ${aparencia}: their facial features.
Image ${aparencia} is a PHOTOGRAPH, and its realism must NOT leak into the drawing: no photographic lighting, no rendered skin, no fine detail, no extra realism because the reference happens to be a photo. If the two ever disagree, Image ${estilo} wins. The output is a drawing in the style of Image ${estilo}, never a photo and never a realistic portrait.
The FACE is where the photo leaks in the most, so draw it the same way the rest of the drawing is made: skin is FLAT areas of color with no texture, no airbrushed or gradient shading, no rendered pores or highlights. Facial hair, stubble and eyebrows are drawn as simple flat shapes and strokes, never as photographic texture. Eyes are drawn the way Image ${estilo} draws eyes. Keep the person recognizable through SHAPE (face, nose, hair, brows), not through detail.
`
}

export function instrucaoCodex({ composed, outRel, orient, refs = [] }) {
  const papeis = refs.map((r, i) => (PAPEL_DO_ANEXO[r.papel] || PAPEL_DO_ANEXO.personagem)(i + 1))
  const refHint = papeis.length
    ? `\nYou are given ${refs.length} input image(s). Pass them to the image tool as INPUT IMAGES with HIGH input fidelity, in this order:\n${papeis.join('\n')}\n${regraDeConflito(refs)}`
    : ''
  return `Use your built-in image generation tool (gpt-image-2) to create ONE image and save it as a PNG at exactly this relative path inside the current workspace: ${outRel}
${refHint}${orient}

IMAGE PROMPT:
${composed}

Write the final PNG to that exact path (${outRel}). Overwrite it if it already exists. Do not ask for confirmation.`
}
