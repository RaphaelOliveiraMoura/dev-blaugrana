// registro-gate.mjs — O ARQUIVO DE PROVAS DOS GATES.
//
// POR QUE EXISTE: um gate só é confiável se alguém já olhou o que ele reprovou. Os limiares deste
// projeto foram calibrados cinco vezes contra veredito humano, e cinco vezes uma régua que parecia
// certa na teoria reprovou arte boa (a passada "aberta demais", a corrida legítima, o goleiro alto,
// a troca de perna do lamine). Sem um lugar que guarde as reprovações, essa calibragem depende de
// alguém estar olhando a saída do terminal no exato momento em que ela acontece.
//
// O QUE TORNA ISSO DIFÍCIL: a folha reprovada é DESTRUÍDA logo em seguida. Quem reprova quase sempre
// regera por cima (o `asset lote` refaz automaticamente, com uma segunda tentativa), então um
// registro que só anotasse "personagem X reprovou às 22h" apontaria, minutos depois, para a folha
// APROVADA que tomou o lugar dela. Por isso o registro COPIA a folha e o cartão para uma pasta
// própria antes de qualquer coisa: sem a imagem, não há como julgar se o gate errou.
//
// Onde mora: `saga-fut/gates/<id>/` guarda as imagens e `saga-fut/data/gates.jsonl` o índice. É
// JSONL e append-only de propósito — várias gerações rodam em paralelo, e reescrever um JSON
// inteiro a cada reprovação perderia registros por corrida entre processos.
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { CONTEUDO } from './config.mjs';

export const GATES_DIR = path.join(CONTEUDO, 'gates');
export const GATES_INDICE = path.join(CONTEUDO, 'data/gates.jsonl');

const carimbo = () => new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

// Os quadros normalizados na ORDEM do ciclo (w1..w4 / r1..r4 / i1..i4). Mora AQUI, num módulo sem
// efeito colateral, e não no varrer-gates: aquele é um script que varre o acervo ao ser carregado,
// então importar dele pra pegar uma função faria a varredura inteira rodar sozinha no meio de um
// slice.
export const quadrosDe = (dirAbs, tipo) => {
  const pref = tipo === 'andar' ? 'w' : tipo === 'correr' ? 'r' : 'i';
  const out = [];
  for (let i = 1; i <= 16; i++) {
    const p = path.join(dirAbs, `${pref}${i}.png`);
    if (!existsSync(p)) break;
    out.push(p);
  }
  return out;
};

// Guarda uma prova RECOMPRIMIDA. PNG é lossless, então nenhum pixel muda: o acervo grava no nível
// de compressão padrão do sharp, e um quadro normalizado de 480x620 sai com ~270 KB quando o mesmo
// desenho cabe em ~65 KB no nível 9. Aqui a diferença importa porque a pasta de provas CRESCE PARA
// SEMPRE — uma cópia por reprovação, cinco imagens cada. Na primeira varredura do acervo foram
// 126 MB para 47 registros.
//
// Falhou a recompressão (arquivo estranho, sharp indisponível), copia como está: prova pesada é
// melhor que prova nenhuma.
async function guardar(origem, destino) {
  try {
    const { default: sharp } = await import('/Users/raphaeloliveira/projects/dev-blaugrana/saga-fut-studio/node_modules/sharp/dist/index.mjs');
    await sharp(origem).png({ compressionLevel: 9, effort: 8 }).toFile(destino);
    return path.relative(CONTEUDO, destino);
  } catch {
    return fs.copyFile(origem, destino)
      .then(() => path.relative(CONTEUDO, destino))
      .catch(() => null);
  }
}

// Registra UMA reprovação (ou aviso) de gate. Nunca lança: um registro que derruba a geração seria
// pior que a falta dele — a régua é para calibrar depois, não para virar mais um ponto de falha.
export async function registrarGate({ slug, tipo, gate, nivel, msg, metricas = null, folha = null, card = null, quadros = [] }) {
  try {
    const id = `${carimbo()}_${slug}_${tipo}`;
    const dir = path.join(GATES_DIR, id);
    await fs.mkdir(dir, { recursive: true });

    // AS IMAGENS PRIMEIRO. Se o processo morrer no meio, é melhor ter a prova sem o índice do que
    // um índice apontando pra uma folha que já foi sobrescrita.
    const copiadas = {};
    for (const [nome, origem] of [['folha', folha], ['card', card]]) {
      if (!origem) continue;
      const destino = path.join(dir, `${nome}.png`);
      const r = await guardar(origem, destino);
      if (r) copiadas[nome] = r;
    }

    // OS QUADROS SOLTOS, e não só a folha: metade dos defeitos que estes gates medem só existem
    // ENTRE quadros (o corpo que escorrega, a perna que não troca, o quadro morto), e quadro parado
    // não mostra isso. Quem julga precisa ver a animação rodando, então os quadros normalizados vão
    // junto — são os mesmos que o motor consome, na mesma ordem.
    const q = [];
    for (let i = 0; i < quadros.length; i++) {
      const r = await guardar(quadros[i], path.join(dir, `q${i + 1}.png`));
      if (r) q.push(r);
    }
    if (q.length) copiadas.quadros = q;

    const registro = {
      id, quando: new Date().toISOString(), slug, tipo, gate, nivel, msg,
      metricas, ...copiadas,
      // veredito humano: fica NULO até alguém abrir a tela e julgar. É o campo que dá sentido ao
      // resto — sem ele isto é um log, com ele é uma amostra rotulada pra calibrar o limiar.
      veredito: null, observacao: null,
    };
    await fs.mkdir(path.dirname(GATES_INDICE), { recursive: true });
    await fs.appendFile(GATES_INDICE, JSON.stringify(registro) + '\n');
    return registro;
  } catch (e) {
    console.warn(`aviso: não consegui registrar o gate (${e.message})`);
    return null;
  }
}

// Lê o índice inteiro. Linha corrompida é PULADA com aviso, não derruba a tela: o arquivo é escrito
// por vários processos ao mesmo tempo e uma linha truncada não pode esconder as outras trezentas.
export async function lerGates() {
  const txt = await fs.readFile(GATES_INDICE, 'utf8').catch(() => '');
  const linhas = txt.split('\n').filter((l) => l.trim());
  const out = [];
  let ruins = 0;
  for (const l of linhas) {
    try { out.push(JSON.parse(l)); } catch { ruins++; }
  }
  if (ruins) console.warn(`aviso: ${ruins} linha(s) ilegível(is) em data/gates.jsonl`);
  // o MESMO id pode aparecer várias vezes: o veredito é gravado como uma linha nova (append-only),
  // e a última vence. É o que permite mudar de ideia sobre um julgamento sem reescrever o arquivo.
  const porId = new Map();
  for (const r of out) porId.set(r.id, { ...(porId.get(r.id) || {}), ...r });
  return [...porId.values()].sort((a, b) => String(b.quando).localeCompare(String(a.quando)));
}

// Grava o julgamento humano. `veredito` é 'real' (o gate acertou) ou 'falso-positivo' (reprovou
// arte boa). Append, pelo mesmo motivo do resto.
export async function julgarGate(id, veredito, observacao = null) {
  if (!['real', 'falso-positivo'].includes(veredito)) throw new Error(`veredito inválido: ${veredito}`);
  await fs.appendFile(GATES_INDICE, JSON.stringify({ id, veredito, observacao, julgadoEm: new Date().toISOString() }) + '\n');
  return true;
}
