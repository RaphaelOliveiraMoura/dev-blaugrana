// Base de movimento do modo "Grok (animado)": o texto FIXO que sempre acompanha o
// clipe animado, pra segurar o traço (2D flat, on-model, câmera travada) enquanto os
// personagens se mexem. Fica aqui no shared pra o studio poder MOSTRAR essa base
// (read-only) na aba Animar, sem duplicar o texto nem deixar backend e front divergirem.
export const MOV_QUADRINHO_GROK = 'Subtle living-comic motion: gentle idle life, slight breathing and micro-movements, small ambient motion in the background, but keep the characters on-model and mostly still. Keep it a FLAT 2D hand-drawn cartoon with clean bold black outlines and flat solid colors, EXACTLY like the source image; do NOT add 3D, gradients or shading, do NOT morph faces or hands. Single continuous shot, locked camera, keep the framing identical.'

// Base do modo "Grok (microinteração)": guarda-corpo LEVE, focado no que o micro deve ser.
// Deixa o cenário respirar e a pessoa fazer movimentos PEQUENOS, mas trava as coisas que o
// Grok inventa sozinho e não cabem no micro: áudio/fala e zoom/câmera. (O áudio ainda é
// removido no pipeline como garantia; o zoom depende só deste texto.) O studio mostra
// esta base read-only na aba Animar. A instrução do painel entra como foco por cima dela.
export const MOV_QUADRINHO_MICRO = 'Micro-interaction only: keep it SUBTLE and CONTAINED. Animate small ambient details in the scenery (flags, cloth, hair, light flicker, dust, smoke, water, distant crowd) plus small, natural movements of the characters (soft breathing, a blink, a slight head or hand movement). Characters stay in place: feet planted, no walking, no repositioning, and NO big, wide or sweeping movements. STRICTLY NO camera movement: NO zoom in or out, NO push-in, NO pan, NO tilt; keep a locked static camera and the exact same framing and scale from start to finish. COMPLETELY SILENT: NO audio, NO sound effects, NO music, NO speech, NO talking, NO dialogue, do NOT open the mouth to speak or lip-sync. Keep it a FLAT 2D hand-drawn cartoon with clean bold black outlines and flat solid colors, EXACTLY like the source image; do NOT add 3D, gradients or shading, do NOT morph faces or hands. Single continuous shot.'
