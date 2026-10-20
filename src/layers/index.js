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
  if (!file) return { loaded: null, destroy() {} };
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
  // decoded = ready to paint (a failed load counts too, so nobody waits for it forever)
  const loaded = img.decode().catch(() => {});
  return { loaded, destroy: () => img.remove() };
};

// Shows the layers of a mix; call destroy() on the result to take them all away again.
// `ready` resolves once the mix covers the screen: its gradient has loaded (or, for a mix
// without one, the first mist / background image).
export const mountMix = (mixName, assetData) => {
  const files = layer => layerFiles(assetData, mixName, layer);
  const gradient = mountGradient(files('gradient')[0]);
  const samples = mountSamples(files('samples'));
  const mist = mountBackdrop('mist', files('mist'));
  const background = mountBackdrop('background', files('background'));
  const layers = [gradient, samples, mist, background];
  return {
    ready: gradient.loaded || Promise.race([mist.loaded, background.loaded]),
    destroy() {
      if (!layers.length) return; // already gone
      layers.splice(0).forEach(layer => layer.destroy());
      forgetGifs(mixName);
    },
  };
};
