import { Sprite } from 'pixi.js';
import { MovingSpritePainter } from './strategies/painters/moving';
import { BackgroundPainter } from './strategies/painters/background';
import { GradientPainter } from './strategies/painters/gradient';
import { MistPainter } from './strategies/painters/mist';
import { SplashPainter } from './strategies/painters/splash';
import { samplesLayerRenderer } from './strategies/renderers/samples';
import { backgroundLayerRenderer, mistLayerRenderer } from './strategies/renderers/dom-background';
import Framework from './framework';

const randomElement = (arr, exclude = []) => {
  if (arr.length === 1) return arr[0];
  
  let candidate;
  while (candidate === undefined || exclude.includes(candidate.filename)) {
    const selectedIndex = Math.floor(Math.random() * arr.length);
    candidate = arr[selectedIndex];
  }
  return candidate;
};

const getRandomSpawnTime = () => 4000 + Math.random() * 2000; // Random time between 4-6 seconds
const getRandomGapTime = () => 2000 + Math.random() * 2000; // Random time between 2-4 seconds

export const getMixCode = (mixName) => {
  return {
    getLayers: () => [
      {
        name: 'gradient',
        zIndex: 1,
        renderer: async (files, container, app) => {
          if (!files?.[0]?.texture) return container;
          const sprite = new Sprite(files[0].texture);
          sprite.width = window.innerWidth;
          sprite.height = window.innerHeight;
          sprite.x = window.innerWidth / 2;
          sprite.y = window.innerHeight / 2;
          sprite.anchor.set(0.5);
          sprite.zIndex = 1; // Ensure zIndex is set directly on sprite
          container.addChild(sprite);
          
          // Force immediate render to see if gradient appears
          if (app.renderer) {
            app.renderer.render(app.stage);
          }
          
          return container;
        }
      },
      {
        name: 'background',
        zIndex: 10, // Updated: Lower z-index
        renderer: async (files, container, app) => {
          // Use DOM-based renderer for backgrounds
          return backgroundLayerRenderer(files, container, app);
        }
      },
      {
        name: 'samples',
        zIndex: 20, // Updated: Middle z-index, BELOW mist
        renderer: async (files, container, app) => {
          // No fancy validation, just ensure there's a texture
          const validFiles = files.filter(file => file && file.texture);
          
          // Attach painter for future use
          app.MovingSpritePainter = MovingSpritePainter;
          await samplesLayerRenderer(validFiles, container, app);
          return container;
        }
      },
      {
        name: 'mist',
        zIndex: 30, // Updated: Higher z-index, ABOVE samples
        renderer: async (files, container, app) => {
          // Use DOM-based renderer for mist
          return mistLayerRenderer(files, container, app);
        }
      },
      {
        name: 'splash',
        zIndex: 2000, // Updated: Highest z-index
        renderer: async (files, container, app) => {
          if (!files?.[0]?.texture) return container;
          const sprite = new Sprite(files[0].texture);
          const painter = new SplashPainter(sprite, app);
          container.addChild(painter.getContainer());
          app.ticker.add((delta) => {
            if (sprite?.parent) {
              painter.update(delta); // Changed from updateSprite to update
            }
          });
          return container;
        }
      }
    ]
  };
};
