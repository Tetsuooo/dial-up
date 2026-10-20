// The background and the mist: images stretched over the whole screen, drifting very slowly and
// fading in and out on a slow wave (the behaviour of the original site, see settings.js).
//
// Every image has its own place in the wave, its own speed along it and its own drift, so at any
// moment a few are showing, at different strengths, and they keep changing.

import { BACKDROP, LAYER_Z } from './settings.js';
import { randomDirection, shuffle } from './random.js';
import { loadImage } from './assets.js';

// A wave that goes 1 at 0, 0 at 1/4, -1 at 1/2, 0 at 3/4, 1 at 1, and so on.
// Only the part above 0 is ever seen: below that an image is not shown at all.
const triangle = (t) => {
  let x = t % 1;
  if (x < 0) x += 1;
  if (x > 0.5) x = 1 - x;
  return 1 - 4 * x;
};

export const mountBackdrop = (layerType, files) => {
  const settings = BACKDROP[layerType];
  const width = window.innerWidth;
  const height = window.innerHeight;

  const layer = document.createElement('div');
  layer.classList.add('dom-visual-layer');
  layer.dataset.layerType = layerType;
  layer.style.cssText = [
    'position: fixed', 'top: 0', 'left: 0', 'width: 100%', 'height: 100%',
    'overflow: hidden',
    'pointer-events: none', // let clicks through to what's underneath
    `z-index: ${LAYER_Z[layerType]}`,
  ].join(';');
  document.body.appendChild(layer);

  const aborter = new AbortController();
  const items = []; // the images that have loaded
  const releases = [];
  let frame = 0;
  let alive = true;
  let firstLoaded; // resolves when the first image is in (never, if none loads)
  const loaded = new Promise(resolve => { firstLoaded = resolve; });

  const add = async (file) => {
    try {
      const { img, release } = await loadImage(file.filename, aborter.signal);
      if (!alive) {
        release();
        return;
      }
      releases.push(release);
      img.dataset.layerType = layerType;
      img.style.cssText = [
        'position: absolute', 'top: 0', 'left: 0',
        `width: ${width}px`, `height: ${height}px`, // stretched over the whole screen
        'visibility: hidden', 'will-change: transform, opacity',
      ].join(';');
      layer.appendChild(img);
      firstLoaded();
      items.push({
        img,
        x: Math.random() * width, // the centre of the image, which stays on the screen
        y: Math.random() * height,
        dx: Math.random() * randomDirection() * settings.drift,
        dy: Math.random() * randomDirection() * settings.drift,
        phase: Math.random() * settings.startRange, // where in the wave it is
        rate: Math.random(),                        // how fast it moves along the wave
        shown: false,
      });
    } catch (err) {
      if (alive && err.name !== 'AbortError') console.warn(`Couldn't load ${file.filename}`, err);
    }
  };

  let last = performance.now();
  const tick = (now) => {
    const delta = Math.min((now - last) / (1000 / 60), 6); // in 60ths of a second (capped after a pause)
    last = now;

    for (const item of items) {
      // drift, turning around so that the centre stays on the screen
      if (item.x + delta * item.dx > width || item.x + delta * item.dx < 0) item.dx = -item.dx;
      if (item.y + delta * item.dy > height || item.y + delta * item.dy < 0) item.dy = -item.dy;
      item.x += delta * item.dx;
      item.y += delta * item.dy;

      item.phase += delta * BACKDROP.waveSpeed * item.rate;
      const opacity = triangle(item.phase * settings.wave);

      if (opacity > 0) {
        item.img.style.transform = `translate(${(item.x - width / 2).toFixed(2)}px, ${(item.y - height / 2).toFixed(2)}px)`;
        item.img.style.opacity = opacity.toFixed(3);
        if (!item.shown) {
          item.img.style.visibility = 'visible';
          item.shown = true;
        }
      } else if (item.shown) {
        item.img.style.visibility = 'hidden';
        item.shown = false;
      }
    }
    frame = requestAnimationFrame(tick);
  };

  shuffle(files.filter(file => file && file.filename)).slice(0, BACKDROP.maxImages).forEach(add);
  frame = requestAnimationFrame(tick);

  return {
    loaded,
    destroy() {
      alive = false;
      cancelAnimationFrame(frame);
      aborter.abort();
      releases.forEach(release => release());
      layer.remove();
    },
  };
};
