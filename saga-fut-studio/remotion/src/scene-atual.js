// A CENA EM USO — fonte única pro Cena.jsx e pro Root.jsx.
//
// Antes os dois faziam `import scene from './scene.json'`, um arquivo FIXO que o
// render-video sobrescrevia a cada execução. Isso impedia dois renders ao mesmo tempo:
// o segundo trocava a cena embaixo do primeiro, no meio da renderização, e o MP4 saía
// com a cena errada — sem erro nenhum, só o vídeo torto.
//
// Agora o render passa a cena por `--props=<arquivo>` (inputProps), que é POR EXECUÇÃO.
// O scene.json continua como fallback pro Studio do Remotion, que abre sem props.
import { getInputProps } from 'remotion';
import sceneFile from './scene.json';

let props = {};
try { props = getInputProps() || {}; } catch { props = {}; }

// só aceita props que sejam mesmo uma cena (o Studio manda {} ou metadados soltos)
export const scene = Array.isArray(props.shots) ? props : sceneFile;
export default scene;
