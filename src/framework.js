import { Assets, Sprite, Texture } from 'pixi.js';

/**
 * Load a texture and create a new Sprite.
 * @param {string} path - The resource path
 * @returns {Promise<Sprite>}
 */
export const loadTexture = async (path) => {
  try {
    const texture = await Assets.load(path);
    if (!texture) {
      console.warn(`No texture loaded for: ${path}`);
      return new Sprite(Texture.WHITE);
    }
    return new Sprite(texture);
  } catch (err) {
    console.error(`Failed to load texture: ${path}`, err);
    return new Sprite(Texture.WHITE);
  }
};

/**
 * LEGACY: Placeholder for the old spritesheet loader to satisfy any imports
 * This is intentionally stubbed out to ensure we use native GIF animation
 * instead of the old spritesheet-based approach.
 */
export const loadSpritesheet = async (path) => {
  console.warn('Legacy spritesheet loader called but disabled - loading as regular texture instead');
  return loadTexture(path);
};

/**
 * Load and paint a sprite onto a container.
 * `this.painter` is assumed to be a constructor that takes a sprite and a stage.
 */
const paintSprite = async function (assetDefinition, container, rootStage) {
  try {
    const texture = assetDefinition.texture;
    if (!texture) {
      console.error('No texture:', assetDefinition.filename);
      return;
    }

    // Log texture state
    console.log(`Painting sprite with texture: ${assetDefinition.filename}`);

    // Create the sprite
    const sprite = new Sprite(texture);
    sprite._filename = assetDefinition.filename;

    // Create painter instance - make sure 'this.painter' is set correctly
    if (!this.painter) {
      console.error('No painter specified for sprite');
      return;
    }
    
    // Debug: provide a simple default for misbehaving painters
    try {
      const painter = new this.painter(sprite, rootStage);
      sprite._painter = painter;
      
      // Add sprite to container - THIS IS THE CRITICAL STEP
      container.addChild(sprite);
      console.log(`Sprite added to container: ${assetDefinition.filename}`);
      
      // Store reference to the callback function so we can remove it later
      const updateCallback = (delta) => {
        if (sprite && sprite.parent && painter) {
          painter.updateSprite(delta);
        } else {
          rootStage.ticker.remove(updateCallback); // Now refers to itself
        }
      };
      
      // Only set up ticker after adding to container
      rootStage.ticker.add(updateCallback);
    } catch (err) {
      console.error('Error creating painter:', err);
      // Fallback: just add the sprite without a painter
      container.addChild(sprite);
    }

  } catch (err) {
    console.error(`Failed to paint sprite: ${assetDefinition.filename}`, err);
  }
};

export default {
  paintSprite,
  loadSpritesheet  // Keep this for backwards compatibility but make it a no-op
};
