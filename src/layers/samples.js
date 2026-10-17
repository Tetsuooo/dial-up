// The samples: the images (and GIFs) that keep appearing, in all sizes, under the veils of mist and background.
//
// This is the behaviour of the original site (the modem_ repo), see settings.js for the numbers:
// a new image shows up after a random wait, at a random size, in a random place, with a random
// opacity, blended into what's underneath; once there are enough on screen a random old one
// disappears every time a new one comes. Images can be dragged around.

import { SAMPLES, LAYER_Z } from './settings.js';
import { randn_bm } from './random.js';
import { loadImage } from './assets.js';

export const mountSamples = (files) => {
  // `display: contents` keeps this wrapper out of the stacking: every image sits directly in the
  // page, so its blend mode can mix with the gradient and the mist underneath it.
  const layer = document.createElement('div');
  layer.classList.add('dom-visual-layer');
  layer.dataset.layerType = 'samples';
  layer.style.display = 'contents';
  document.body.appendChild(layer);

  const aborter = new AbortController();
  const shown = [];          // { img, file, release, dragging }
  const loading = new Set(); // files being loaded right now
  let timer = null;
  let alive = true;

  // A file that isn't on screen (or being loaded) yet. If every file is already in use (a mix with
  // only a few samples) any of them will do.
  const pickFile = () => {
    const free = files.filter(file => !loading.has(file) && !shown.some(s => s.file === file));
    const pool = free.length ? free : files;
    return pool[Math.floor(Math.random() * pool.length)];
  };

  const removeOne = () => {
    const candidates = shown.filter(s => !s.dragging);
    if (!candidates.length) return;
    const gone = candidates[Math.floor(Math.random() * candidates.length)];
    shown.splice(shown.indexOf(gone), 1);
    gone.img.remove();
    gone.release();
  };

  const makeDraggable = (entry) => {
    const { img } = entry;
    let start = null;
    img.addEventListener('pointerdown', (e) => {
      start = { x: e.clientX, y: e.clientY, left: parseFloat(img.style.left), top: parseFloat(img.style.top) };
      entry.dragging = true;
      img.setPointerCapture(e.pointerId);
      img.style.cursor = 'grabbing';
      e.preventDefault();
    });
    img.addEventListener('pointermove', (e) => {
      if (!start) return;
      img.style.left = `${start.left + e.clientX - start.x}px`;
      img.style.top = `${start.top + e.clientY - start.y}px`;
    });
    const drop = () => {
      start = null;
      entry.dragging = false;
      img.style.cursor = 'grab';
    };
    img.addEventListener('pointerup', drop);
    img.addEventListener('pointercancel', drop);
  };

  const addOne = async () => {
    const file = pickFile();
    loading.add(file);
    try {
      const { img, release } = await loadImage(file.filename, aborter.signal);
      if (!alive) {
        release();
        return;
      }

      const width = randn_bm(SAMPLES.width.min, SAMPLES.width.max, SAMPLES.width.skew);
      const height = width * (img.naturalHeight / img.naturalWidth);
      const { opacity } = SAMPLES;

      // Placed like the original: a random point on the screen, then shifted half an image up and
      // to the left, so the bigger images often run off the edges of the screen
      img.style.cssText = [
        'position: fixed',
        `left: ${Math.random() * window.innerWidth - width / 2}px`,
        `top: ${Math.random() * window.innerHeight - height / 2}px`,
        `width: ${width}px`,
        'height: auto',
        'transform: translate(-50%, -50%)',
        `opacity: ${(opacity.min + Math.random() * (opacity.max - opacity.min)).toFixed(3)}`,
        `mix-blend-mode: ${SAMPLES.blendMode}`,
        `z-index: ${LAYER_Z.samples}`,
        'cursor: grab',
        'touch-action: none',
        'user-select: none',
        '-webkit-user-drag: none',
      ].join(';');
      img.draggable = false;
      img.dataset.fileId = file.filename;

      while (shown.length >= SAMPLES.maxOnScreen) removeOne();
      const entry = { img, file, release, dragging: false };
      makeDraggable(entry);
      shown.push(entry);
      layer.appendChild(img);
    } catch (err) {
      if (alive && err.name !== 'AbortError') console.warn(`Couldn't load ${file.filename}`, err);
    } finally {
      loading.delete(file);
    }
  };

  const schedule = (wait) => {
    timer = setTimeout(() => {
      if (!alive) return;
      if (!document.hidden) addOne();
      schedule(Math.random() * SAMPLES.maxWaitMs);
    }, wait);
  };

  if (files.length) schedule(0);

  return {
    destroy() {
      alive = false;
      clearTimeout(timer);
      aborter.abort();
      shown.forEach(s => s.release());
      shown.length = 0;
      layer.remove();
    },
  };
};
