import { Texture } from 'pixi.js';

/**
 * Updates all animated GIF textures in a container and its children
 * @param {Container} container - The container to update
 */
export const updateAnimatedGifTextures = (container) => {
  if (!container || !container.children) return;
  
  container.children.forEach(displayObject => {
    // Update texture if this is a sprite with an animated GIF
    if (displayObject.texture && displayObject.texture._isAnimatedGif) {
      displayObject.texture.update();
    }
    
    // Recursively process child containers
    if (displayObject.children && displayObject.children.length > 0) {
      updateAnimatedGifTextures(displayObject);
    }
  });
};

/**
 * Safely create a texture from an animated GIF
 * @param {string} url - URL to the animated GIF
 * @returns {Promise<Texture>} The animated texture
 */
export const createAnimatedGifTexture = (url) => {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        // Create the div that will hold a copy of the gif for animation
        const hiddenGifHolder = document.createElement('div');
        hiddenGifHolder.style.position = 'fixed';
        hiddenGifHolder.style.top = '-9999px';
        hiddenGifHolder.style.left = '-9999px';
        hiddenGifHolder.style.opacity = '1';
        hiddenGifHolder.style.pointerEvents = 'none';
        hiddenGifHolder.style.zIndex = '-100';
        
        // Clone the image to keep it animating
        const animatedImg = img.cloneNode(true);
        hiddenGifHolder.appendChild(animatedImg);
        document.body.appendChild(hiddenGifHolder);
        
        // Create texture directly from the image
        const texture = Texture.from(img);
        
        // Store references for cleanup and animation
        texture._animatedGifImg = animatedImg;
        texture._hiddenGifHolder = hiddenGifHolder;
        texture._isAnimatedGif = true;
        texture._sourceImg = img;
        
        console.log(`Created animated GIF texture: ${url}`);
        resolve(texture);
      };
      
      img.onerror = (err) => {
        console.error(`Failed to load GIF: ${url}`);
        reject(err);
      };
      
      img.src = url;
    } catch (err) {
      reject(err);
    }
  });
};

export default {
  updateAnimatedGifTextures,
  createAnimatedGifTexture
};
