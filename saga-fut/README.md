# SagaFut, conteúdo

Todo o conteúdo do projeto: os dados, a mídia gerada e a documentação. Quem edita
isso é o painel em [`../saga-fut-studio`](../saga-fut-studio) (ele lê e grava
direto nesta pasta), mas os arquivos são texto e imagem comuns: dá pra mexer à mão.

## Onde fica o quê

```
data/          fonte de verdade (o resto é derivado ou gerado)
  project.json   pool de personagens, catálogo de estilos, ordem das sagas
  sagas/<sagaId>.json        a saga inteira, com episódios e cenas (o roteiro)
  quadrinhos/<quadId>.json   o quadrinho, com painéis e falas
  musica-inicios.json        onde cada faixa começa a tocar (pula a intro)

episodios/<sagaId>/<NN>/     um episódio
  cenas/N.png|mp4              imagem e clipe aprovados de cada cena
  audio/N.mp3                  narração de cada cena (ElevenLabs)
  rough-cut.mp4                rascunho montado pelo studio

personagens/<id>.png         fichas canônicas (a âncora de consistência)
quadrinhos/<quadId>/paineis/N.png
assets/musica/               trilhas livres de uso
estilos-lab/                 testes de traço visual (ver o README de lá)
docs/                        a documentação
_backups/                    versões anteriores, o studio grava sozinho
```

## A convenção de nomes

O **id da saga é uma alça curta**, não o título: `aranha`, `gigante`, `carecas-jorel`.
O título completo vive no campo `titulo` do JSON, e muda quando você quiser.

A partir dele tudo é derivado, sem exceção:

| | |
|---|---|
| id do episódio | `<sagaId>-<NN>` → `aranha-01` |
| pasta do episódio | `episodios/<sagaId>/<NN>` → `episodios/aranha/01` |
| arquivo da saga | `data/sagas/<sagaId>.json` |
| endereço no studio | `#/saga/aranha` |

Quem implementa isso é [`saga-fut-studio/shared/caminhos.mjs`](../saga-fut-studio/shared/caminhos.mjs),
usado pelo front e pelo servidor. Nenhum caminho é montado na mão em outro lugar.

**O id não muda depois** sem mover arquivo e reescrever JSON, então o studio
pergunta por ele na criação em vez de inventar um. Escolha curto e sem artigo.

## Documentação

| | |
|---|---|
| [BIBLIA.md](docs/BIBLIA.md) | o universo, tipos de saga, regras editoriais |
| [WORKFLOW.md](docs/WORKFLOW.md) | o pipeline de produção, etapa por etapa |
| [DIRETRIZES-NARRACAO.md](docs/DIRETRIZES-NARRACAO.md) | como a narração tem que soar |
| [APRENDIZADOS.md](docs/APRENDIZADOS.md) | erros → curas, ler antes de produzir |
| [ESTRATEGIA-REDES.md](docs/ESTRATEGIA-REDES.md) | publicação e crescimento |
| [PESQUISA-VIRALIZACAO.md](docs/PESQUISA-VIRALIZACAO.md) | o que a pesquisa diz sobre alcance |
| [TRILHAS.md](docs/TRILHAS.md) | onde achar música livre de uso |

Para criar uma saga do zero com as regras da casa aplicadas, use o `/nova-saga`.

## Backup

Mídia (`.mp4`, `.mp3`) e `_backups/` estão no `.gitignore`: são pesados e o git não
é o lugar deles. O que está versionado é `data/`, os PNGs e os docs, ou seja, tudo
que é caro de refazer e barato de guardar. Os vídeos e áudios são **seu** backup,
veja a estratégia em [WORKFLOW.md](docs/WORKFLOW.md).
