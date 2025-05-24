import { Texture } from 'pixi.js';

/**
 * Creates and manages animated GIF textures
 */
class GifLoader {
  /**
   * Loads a GIF and returns a texture that will animate
   * @param {string} url - URL of the GIF to load
   * @returns {Promise<Texture>} A texture that will be updated with animated frames
   */
  static async load(url) {
    return new Promise((resolve, reject) => {
      if (!url || typeof url !== 'string') {
        console.error('Invalid URL provided to GifLoader:', url);
        reject(new Error('Invalid GIF URL'));
        return;
      }

      try {
        // Create a container div to hold the GIF
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.top = '0';
        container.style.left = '0';
        container.style.opacity = '1';
        container.style.pointerEvents = 'none';
        container.style.zIndex = '-9999';
        container.style.width = '300px';
        container.style.height = '300px';
        container.style.overflow = 'hidden';
        container.style.visibility = 'hidden';
        container.setAttribute('data-gif-url', url);
        
        // Add container to document
        document.body.appendChild(container);
        
        // Create image element for the GIF
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.style.position = 'absolute';
        
        img.onload = () => {
          console.log(`GIF loaded: ${url} (${img.width}x${img.height})`);
          
          try {
            // Image loaded, add to container
            container.appendChild(img);
            
            // Create canvas to use as texture source
            const canvas = document.createElement('canvas');
            canvas.width = img.width || 1;  // Ensure non-zero dimensions
            canvas.height = img.height || 1;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            
            if (!ctx) {
              throw new Error('Could not get canvas context');
            }
            
            // Draw initial frame
            ctx.drawImage(img, 0, 0);
            
            // Create texture directly from canvas (not URL string)
            const texture = Texture.from(canvas);
            
            if (!texture || !texture.valid) {
              throw new Error('Failed to create valid texture from canvas');
            }
            
            // Store references for animation
            texture._gifImg = img;
            texture._gifContainer = container;
            texture._gifCanvas = canvas;
            texture._gifCtx = ctx;
            texture._isAnimatedGif = true;
            texture._source = url;
            
            // Add update function that safely updates the texture
            texture.updateFromGif = () => {
              if (!ctx || !img || !texture.valid) return;
              
              try {
                // Must redraw the entire image each frame to capture animation
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
                
                // Critical: Tell texture to update from the canvas
                texture.update();
              } catch (e) {
                console.error('Error updating GIF texture:', e);
              }
            };
            
            console.log(`Created animated texture for ${url} (valid: ${texture.valid})`);
            resolve(texture);
          } catch (err) {
            console.error(`Error processing loaded GIF: ${url}`, err);
            try { document.body.removeChild(container); } catch (e) {}
            reject(err);
          }
        };
        
        img.onerror = (err) => {
          console.error(`Failed to load GIF: ${url}`, err);
          try { document.body.removeChild(container); } catch (e) {}
          reject(err);
        };
        
        // Set src after handlers
        img.src = url;
      } catch (err) {
        console.error(`Unexpected error loading GIF: ${url}`, err);
        reject(err);
      }
    });
  }
  
  /**
   * Clean up a GIF texture and its DOM elements
   * @param {Texture} texture - The texture to clean up
   */
  static cleanUp(texture) {
    if (texture && texture._gifContainer) {
      try {
        document.body.removeChild(texture._gifContainer);
      } catch (e) {
        console.warn('Error cleaning up GIF texture:', e);
      }
    }
  }
  
  /**
   * Update a GIF texture with the next frame
   * @param {Texture} texture - The texture to update
   */
  static updateTexture(texture) {
    if (texture && texture._isAnimatedGif && typeof texture.updateFromGif === 'function') {
      texture.updateFromGif();
    }
  }
}

export default GifLoader;
