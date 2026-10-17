// The layers of a mix, from the back to the front:
//
//   gradient     one image stretched over the whole screen
//   samples      the images and GIFs that keep appearing, in all sizes
//   mist         soft images stretched over the screen, drifting and fading, over the samples
//   background   the same, with the background images, on top of everything else
//
// (The order is LAYER_Z in settings.js.)
//
// The splash panel, the buttons and the player are in dom-ui.js / index.js, above all of these.

import { layerFiles, forgetGifs } from './assets.js';
import { mountBackdrop } from './backdrop.js';
import { mountSamples } from './samples.js';
import { LAYER_Z } from './settings.js';

const mountGradient = (file) => {
  if (!file) return { destroy() {} };
  const img = new Image();
  img.decoding = 'async';
  img.draggable = false;
  img.alt = '';
  img.className = 'dom-visual-layer';
  img.dataset.layerType = 'gradient';
  img.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; user-select: none';
  img.style.zIndex = LAYER_Z.gradient;
  img.src = file.filename;
  document.body.appendChild(img);
  return { destroy: () => img.remove() };
};

// Shows the layers of a mix; call destroy() on the result to take them all away again.
export const mountMix = (mixName, assetData) => {
  const files = layer => layerFiles(assetData, mixName, layer);
  const layers = [
    mountGradient(files('gradient')[0]),
    mountSamples(files('samples')),
    mountBackdrop('mist', files('mist')),
    mountBackdrop('background', files('background')),
  ];
  return {
    destroy() {
      layers.forEach(layer => layer.destroy());
      forgetGifs();
    },
  };
};
