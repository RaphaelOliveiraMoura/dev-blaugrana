import { Composition } from 'remotion';
import { Cena, sceneDuration } from './Cena';
import scene from './scene-atual';
import { MontagemIA, montagemDuration } from './MontagemIA';
import montagem from './montagem.json';

export const Root = () => (
  <>
    <Composition
      id="Cena"
      component={Cena}
      durationInFrames={sceneDuration()}
      fps={scene.fps}
      width={scene.width}
      height={scene.height}
    />
    {/* montagem sobre clipes gerados por IA (teste da estratégia A): edição da casa por cima
        de vídeo pronto. Duração/clipes vêm de src/montagem.json. */}
    <Composition
      id="MontagemIA"
      component={MontagemIA}
      durationInFrames={montagemDuration()}
      fps={montagem.fps || 30}
      width={montagem.width || 1080}
      height={montagem.height || 1440}
    />
  </>
);
