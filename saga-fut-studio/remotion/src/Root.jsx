import { Composition } from 'remotion';
import { Cena, sceneDuration } from './Cena';
import scene from './scene.json';

export const Root = () => (
  <Composition
    id="Cena"
    component={Cena}
    durationInFrames={sceneDuration()}
    fps={scene.fps}
    width={scene.width}
    height={scene.height}
  />
);
