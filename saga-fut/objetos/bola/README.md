# bola

**Tipo: código.** Esta pasta não guarda PNG: a bola é desenhada pelo motor (componente `Ball` no
`Cena.jsx`), e é por isso que ela funciona bem.

O que o código entrega e um sprite não entregaria:

- forma perfeita em qualquer tamanho, sem borrar quando a câmera fecha
- sombra que descola e clareia conforme a bola sobe (é o que vende o "está no ar")
- giro proporcional à distância percorrida, então ela rola sem escorregar
- trajetórias declarativas: `passe`, `arco`, `quique`, `chute` (a gol, terminando elevada e menor
  pela perspectiva) e `parada`

## Como usar num vídeo

```json
"bola": {
  "inicio": 715, "groundY": 1277,
  "lances": [ { "parada": 8 }, { "arco": 1180, "pico": 140, "dur": 26 } ]
}
```

Cada lance começa onde o anterior parou. `escala` em qualquer lance define o tamanho no fim, para
a bola que vai ao fundo encolher.

## Por que ela está no catálogo mesmo sem arquivo

Para o sistema saber que ela EXISTE como objeto da casa (`shared/objeto.mjs`), com um lugar
definido, em vez de ser um caso especial escondido dentro do motor. Objeto novo que tiver traço e
personalidade (cadeira, cofrinho, troféu) nasce aqui também, mas como `tipo: 'arte'`, com
`base.png` e as mesmas regras de folha dos personagens.
