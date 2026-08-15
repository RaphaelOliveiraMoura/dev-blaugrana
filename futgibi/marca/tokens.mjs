// A ponte entre o `tokens.json` e o resto: os scripts de arte importam DAQUI, nunca escrevem hex.
//
// POR QUE ELA EXISTE: antes deste par (json + ponte) as cores da marca estavam escritas à mão em 9
// arquivos, 27 vezes. Cada peça nova recomeçava a decisão, e o resultado era o esperado: nada
// convergia. Fonte única não é organização, é a única forma de o sistema não divergir sozinho.
//
// Ela também GERA o `site/marca/tokens.css`, pra que o site e a arte saiam do mesmo lugar. Rodar:
//   node futgibi/marca/tokens.mjs        # regrava o CSS a partir do JSON
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
export const T = JSON.parse(await readFile(path.join(AQUI, 'tokens.json'), 'utf8'));

// resolve a camada `papel` (semântica) até o valor cru
const cru = (nome) => T.cor.global[nome].$value;
const papel = (nome) => cru(T.cor.papel[nome].$ref);

// ------------------------------------------------------------------ o que os scripts de arte usam
export const VERDE = cru('verde-campo');
export const VERDE_FUNDO = cru('verde-fundo');
export const VERDE_SOMBRA = cru('verde-sombra');
export const CREME = cru('creme-papel');
export const CREME_SOMBRA = cru('creme-sombra');
export const PAPEL = cru('papel-fundo');
export const LARANJA = cru('laranja-selo');
export const PRETO = cru('preto-traco');

export const HANDLE = T.marca.handle;
export const DOMINIO = T.marca.dominio;
export const CHAMADA = T.voz.chamada.$value;
export const TESE = T.voz.tese.$value;

export const POST = T.formato.post;             // { w, h, razao }
export const FONTE_ARTE = T.tipografia.arte;    // { chamada, convite, apoio, handle, selo }

// A FONTE ENCOLHE EM VEZ DE ESTOURAR. Vive aqui e não em cada script porque o defeito que ela
// evita não dá erro nenhum: o PNG é gerado, o script diz OK, e a linha longa sai CORTADA nas
// laterais. Só o olho pega, e só se estiver olhando.
export const caber = (linhas, tam, { largura = POST.w, margem = 80 } = {}) => {
  const maiorCh = Math.max(...linhas.map((l) => (l.t ?? l).length));
  const usada = maiorCh * tam * 0.62;        // Helvetica bold, caixa alta: ~0,62em por caractere
  const disponivel = largura - margem * 2;
  return usada > disponivel ? Math.floor((tam * disponivel) / usada) : tam;
};

// ------------------------------------------------------------------------- o CSS, gerado do JSON
// Chamado quando este arquivo roda direto. O site NUNCA declara um hex: ele lê estas variáveis.
if (import.meta.url === `file://${process.argv[1]}`) {
  const linhas = [
    '/* GERADO por futgibi/marca/tokens.mjs a partir de tokens.json. NÃO EDITE À MÃO. */',
    '/* Mude o tokens.json e rode: node futgibi/marca/tokens.mjs */',
    ':root{',
    '  /* --- cor: valor cru --- */',
    ...Object.entries(T.cor.global).map(([k, v]) => `  --${k}:${v.$value};`),
    '',
    '  /* --- cor: o que o valor significa --- */',
    ...Object.entries(T.cor.papel).map(([k, v]) => `  --${k}:var(--${v.$ref});`),
    '',
    '  /* --- tipografia --- */',
    `  --fonte-texto:${T.tipografia.familia.texto.$value};`,
    `  --fonte-display:${T.tipografia.familia.display.$value};`,
    ...Object.entries(T.tipografia.escala)
      .filter(([k]) => !k.startsWith('_'))
      .map(([k, v]) => `  --t-${k}:${v.$value};`),
    '',
    '  /* --- traço e sombra: sempre 0 de blur --- */',
    ...Object.entries(T.traco)
      .filter(([k]) => !k.startsWith('_'))
      .map(([k, v]) => `  --${k}:${v.$value}${k.startsWith('sombra') ? ' var(--preto-traco)' : ''};`),
    '}',
  ];
  const saida = path.join(AQUI, '../site/marca/tokens.css');
  await mkdir(path.dirname(saida), { recursive: true });
  await writeFile(saida, linhas.join('\n') + '\n');
  console.log('OK ->', saida);

  // O JSON também é PUBLICADO no site: o manual da marca lê a fonte em tempo de renderização, e
  // pra isso ela precisa estar dentro do que o servidor enxerga. É cópia gerada, não segunda
  // fonte: quem edita continua sendo o marca/tokens.json.
  const copia = path.join(AQUI, '../site/marca/tokens.json');
  await writeFile(copia, JSON.stringify(T, null, 2) + '\n');
  console.log('OK ->', copia);
}
