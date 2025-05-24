import { Assets, Sprite } from 'pixi.js';
import Framework from './framework.js';

export const renderer = async (files, container, app, PainterClass) => {
  for (const file of files) {
    try {
      await Framework.paintSprite.call({ painter: PainterClass }, file, container, app);
    } catch (err) {
      console.warn(`Failed to load sample: ${file.filename}`, err);
    }
  }
  return container;
};