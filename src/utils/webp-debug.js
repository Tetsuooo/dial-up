/**
 * WebP Debug Helper
 * Provides tools to diagnose WebP texture loading and rendering issues
 */

// Analyze a texture and report issues
const analyzeTexture = (texture, name) => {
  if (!texture) {
    console.error(`[WebPDebug] Texture "${name}" is null or undefined`);
    return false;
  }

  console.log(`[WebPDebug] Analyzing texture: ${name}`);
  
  let issues = [];
  
  // Check texture validity
  if (!texture.valid) issues.push("Texture is marked as invalid");
  
  // Check dimensions
  if (!texture.width || !texture.height) issues.push("Texture has zero width or height");
  
  // Check base texture
  if (!texture.baseTexture) {
    issues.push("Missing baseTexture");
  } else {
    // Check base texture properties
    if (!texture.baseTexture.valid) issues.push("BaseTexture is invalid");
    if (!texture.baseTexture.width || !texture.baseTexture.height) issues.push("BaseTexture has zero dimensions");
    if (!texture.baseTexture.resource) issues.push("BaseTexture has no resource");
  }
  
  // Log results
  if (issues.length > 0) {
    console.warn(`[WebPDebug] Issues found with texture "${name}":`, issues);
    console.log(`[WebPDebug] Texture details:`, {
      width: texture.width,
      height: texture.height,
      valid: texture.valid,
      baseTextureValid: texture.baseTexture?.valid,
      baseTextureSource: texture.baseTexture?.resource ? "exists" : "missing"
    });
    return false;
  }
  
  console.log(`[WebPDebug] Texture "${name}" appears valid`);
  return true;
};

// Create a DOM-based proof image from a texture
const createProofImage = (texture, name) => {
  if (!texture || !texture.baseTexture) return null;
  
  try {
    // Create a visible DOM element to verify the image loads correctly
    const proofDiv = document.createElement('div');
    proofDiv.style.position = 'fixed';
    proofDiv.style.bottom = '10px';
    proofDiv.style.right = '10px';
    proofDiv.style.zIndex = '9999';
    proofDiv.style.background = 'rgba(255,255,255,0.8)';
    proofDiv.style.padding = '5px';
    proofDiv.style.border = '1px solid black';
    proofDiv.style.borderRadius = '5px';
    
    const label = document.createElement('div');
    label.textContent = `Proof: ${name}`;
    label.style.fontSize = '12px';
    label.style.marginBottom = '3px';
    
    let img;
    if (texture.baseTexture.resource && texture.baseTexture.resource.source) {
      img = texture.baseTexture.resource.source;
      if (!(img instanceof HTMLImageElement || img instanceof HTMLCanvasElement)) {
        // Create a new canvas to draw from the source
        const canvas = document.createElement('canvas');
        canvas.width = texture.width;
        canvas.height = texture.height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(texture.baseTexture.resource.source, 0, 0);
        
        img = canvas;
      }
    } else {
      // Create a placeholder image
      img = document.createElement('div');
      img.textContent = "No source image";
      img.style.width = '100px';
      img.style.height = '100px';
      img.style.background = 'red';
      img.style.color = 'white';
      img.style.display = 'flex';
      img.style.alignItems = 'center';
      img.style.justifyContent = 'center';
      img.style.textAlign = 'center';
    }
    
    // Limit the size for display
    img.style.maxWidth = '150px';
    img.style.maxHeight = '150px';
    
    proofDiv.appendChild(label);
    proofDiv.appendChild(img);
    document.body.appendChild(proofDiv);
    
    // Log success
    console.log(`[WebPDebug] Created proof image for "${name}"`);
    
    // Return the div so it can be removed later
    return proofDiv;
  } catch (err) {
    console.error(`[WebPDebug] Failed to create proof image:`, err);
    return null;
  }
};

// Initialize debug mode
const initDebugMode = (app) => {
  console.log("[WebPDebug] Initializing WebP debug mode");
  
  window._webpDebug = {
    proofs: [],
    analyzeTexture,
    createProofImage,
    
    // Test all sprites in the scene
    diagnoseAllSprites: () => {
      const results = {
        tested: 0,
        valid: 0,
        invalid: 0
      };
      
      // Clear old proofs
      window._webpDebug.proofs.forEach(p => {
        try { document.body.removeChild(p); } catch (e) {}
      });
      window._webpDebug.proofs = [];
      
      // Function to process a container
      const processContainer = (container) => {
        if (!container || !container.children) return;
        
        container.children.forEach(child => {
          // Check if it's a sprite with a texture
          if (child.texture) {
            results.tested++;
            const isValid = analyzeTexture(child.texture, `Sprite-${results.tested}`);
            if (isValid) {
              results.valid++;
              // Create proof for WebP
              if (child._filename && child._filename.toLowerCase().endsWith('.webp')) {
                const proof = createProofImage(child.texture, child._filename);
                if (proof) window._webpDebug.proofs.push(proof);
              }
            } else {
              results.invalid++;
            }
          }
          
          // Recursively check children
          if (child.children) {
            processContainer(child);
          }
        });
      };
      
      // Process the app stage
      processContainer(app.stage);
      
      console.log(`[WebPDebug] Diagnosis results: ${results.tested} sprites tested, ${results.valid} valid, ${results.invalid} invalid`);
      return results;
    }
  };
  
  // Add keyboard shortcut for diagnosis (Ctrl+W)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'w' && e.ctrlKey) {
      e.preventDefault();
      console.log("[WebPDebug] Running texture diagnosis...");
      window._webpDebug.diagnoseAllSprites(app);
    }
  });
  
  console.log("[WebPDebug] Debug mode initialized. Press Ctrl+W to diagnose textures.");
  return window._webpDebug;
};

export default {
  initDebugMode,
  analyzeTexture,
  createProofImage
};
